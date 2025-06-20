/**
 * Asynchronous streaming analyzer for JSX/TSX files
 * Provides memory-efficient analysis with progress tracking and error handling
 */

import { Readable, Transform, pipeline } from "node:stream";
import { promisify } from "node:util";
import { performance } from "node:perf_hooks";
import { createReadStream } from "node:fs";
import { visit } from "ast-types";
import { parse } from "recast";

import { globalPerformanceMonitor } from "@/utils/fs/performance-monitor";
import { createProgressBar } from "@/utils/fs/progress-indicator";
import { getWorkerPool, TASK_TYPES } from "@/utils/fs/worker-pool";
import { FileOperationError, AsyncBatchProcessor } from "@/utils/fs-utils";
import { ImportDetails, ComponentUsage } from "@/types";
import { getSpecifierLocalName, getSpecifierImportedName } from "@/types/ast";

const pipelineAsync = promisify(pipeline);

export interface AnalysisResult {
  filePath: string;
  imports: ImportDetails[];
  components: ComponentUsage[];
  metrics: {
    processingTime: number;
    linesOfCode: number;
    importsCount: number;
    componentsCount: number;
  };
  errors?: Error[];
}

export interface StreamingAnalyzerOptions {
  concurrency?: number;
  batchSize?: number;
  useWorkerThreads?: boolean;
  showProgress?: boolean;
  chunkSize?: number;
  memoryLimitMB?: number;
  onProgress?: (completed: number, total: number, currentFile?: string) => void;
  onError?: (error: FileOperationError) => void;
  onResult?: (result: AnalysisResult) => void;
}

/**
 * File analysis stream that processes files in chunks
 */
export class FileAnalysisStream extends Transform {
  private options: Required<StreamingAnalyzerOptions>;
  private processed = 0;
  private total = 0;
  private errors: FileOperationError[] = [];

  constructor(options: StreamingAnalyzerOptions = {}) {
    super({
      objectMode: true,
      highWaterMark: options.batchSize ?? 16,
    });

    this.options = {
      concurrency: options.concurrency ?? 4,
      batchSize: options.batchSize ?? 16,
      useWorkerThreads: options.useWorkerThreads ?? false,
      showProgress: options.showProgress ?? true,
      chunkSize: options.chunkSize ?? 64 * 1024, // 64KB
      memoryLimitMB: options.memoryLimitMB ?? 256,
      onProgress: options.onProgress ?? (() => {}),
      onError: options.onError ?? (() => {}),
      onResult: options.onResult ?? (() => {}),
    };
  }

  setTotal(total: number): void {
    this.total = total;
  }

  _transform(filePath: string, encoding: any, callback: any): void {
    this.analyzeFile(filePath)
      .then((result) => {
        this.processed++;
        this.options.onProgress(this.processed, this.total, filePath);
        this.options.onResult(result);
        this.push(result);
        callback();
      })
      .catch((error) => {
        const fileError = new FileOperationError("analyzeFile", filePath, error);
        this.errors.push(fileError);
        this.options.onError(fileError);
        
        // Still increment processed count
        this.processed++;
        this.options.onProgress(this.processed, this.total, filePath);
        
        // Push error result
        this.push({
          filePath,
          imports: [],
          components: [],
          metrics: {
            processingTime: 0,
            linesOfCode: 0,
            importsCount: 0,
            componentsCount: 0,
          },
          errors: [error],
        });
        callback();
      });
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string): Promise<AnalysisResult> {
    const perfTracker = globalPerformanceMonitor.startOperation("analyzeFile", filePath);
    
    try {
      if (this.options.useWorkerThreads) {
        return await this.analyzeFileWithWorker(filePath);
      } else {
        return await this.analyzeFileMainThread(filePath);
      }
    } finally {
      perfTracker.complete();
    }
  }

  /**
   * Analyze file using worker thread
   */
  private async analyzeFileWithWorker(filePath: string): Promise<AnalysisResult> {
    const workerPool = getWorkerPool();
    
    // Parse AST
    const astResult = await workerPool.execute(TASK_TYPES.PARSE_AST, { filePath });
    
    if (!astResult.success) {
      throw new Error(astResult.error || "Failed to parse AST");
    }

    // Analyze imports
    const importsResult = await workerPool.execute(TASK_TYPES.ANALYZE_IMPORTS, {
      ast: astResult.ast,
      filePath,
    });

    // Process JSX
    const jsxResult = await workerPool.execute(TASK_TYPES.PROCESS_JSX, {
      ast: astResult.ast,
      filePath,
      imports: importsResult.imports,
    });

    const linesOfCode = astResult.content.split('\n').length;

    return {
      filePath,
      imports: this.convertWorkerImports(importsResult.imports),
      components: this.convertWorkerComponents(jsxResult.jsxElements),
      metrics: {
        processingTime: performance.now(),
        linesOfCode,
        importsCount: importsResult.imports.length,
        componentsCount: jsxResult.jsxElements.length,
      },
    };
  }

  /**
   * Analyze file in main thread
   */
  private async analyzeFileMainThread(filePath: string): Promise<AnalysisResult> {
    const startTime = performance.now();
    
    // Read file content in chunks if large
    const content = await this.readFileContent(filePath);
    const linesOfCode = content.split('\n').length;

    // Parse AST
    const ast = parse(content, {
      parser: {
        parse: (source) => {
          const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
          
          if (isTypeScript) {
            return require("@babel/parser").parse(source, {
              sourceType: "module",
              allowImportExportEverywhere: true,
              allowReturnOutsideFunction: true,
              plugins: [
                "jsx",
                "typescript",
                "decorators-legacy",
                "classProperties",
                "objectRestSpread",
                "functionBind",
                "exportDefaultFrom",
                "exportNamespaceFrom",
                "dynamicImport",
                "nullishCoalescingOperator",
                "optionalChaining",
              ],
            });
          } else {
            return require("@babel/parser").parse(source, {
              sourceType: "module",
              allowImportExportEverywhere: true,
              allowReturnOutsideFunction: true,
              plugins: [
                "jsx",
                "decorators-legacy",
                "classProperties",
                "objectRestSpread",
                "functionBind",
                "exportDefaultFrom",
                "exportNamespaceFrom",
                "dynamicImport",
                "nullishCoalescingOperator",
                "optionalChaining",
              ],
            });
          }
        },
      },
    });

    // Analyze imports and components
    const imports: ImportDetails[] = [];
    const components: ComponentUsage[] = [];

    visit(ast, {
      visitImportDeclaration(path) {
        const node = path.node;
        const packageName = node.source.value as string;

        if (node.specifiers) {
          node.specifiers.forEach(spec => {
            try {
              const localName = getSpecifierLocalName(spec);
              const importedName = spec.type === "ImportSpecifier" 
                ? getSpecifierImportedName(spec)
                : spec.type === "ImportDefaultSpecifier" 
                ? "default" 
                : "*";

              const importDetails: ImportDetails = {
                node: node,
                packageName,
                specifiers: [{
                  filePath,
                  type: spec.type,
                  importType: spec.type === "ImportSpecifier" ? "named" : 
                             spec.type === "ImportDefaultSpecifier" ? "default" : "namespace",
                  importStm: `import ${localName} from "${packageName}"`,
                  localName,
                  importedName,
                  astImportPath: path,
                }],
              };

              imports.push(importDetails);
            } catch (error) {
              console.warn(`Failed to analyze import specifier in ${filePath}:`, error);
            }
          });
        }

        return false;
      },

      visitJSXElement(path) {
        const node = path.node;
        const openingElement = node.openingElement;

        if (openingElement.name.type === "JSXIdentifier") {
          const localName = openingElement.name.name;

          // Find corresponding import
          const importRef = imports.find(imp => 
            imp.specifiers.some(spec => spec.localName === localName)
          );

          if (importRef) {
            const props: Record<string, any> = {};

            // Extract props
            if (openingElement.attributes) {
              openingElement.attributes.forEach(attr => {
                if (attr.type === "JSXAttribute" && attr.name) {
                  const propName = attr.name.name as string;
                  let propValue = null;

                  if (attr.value) {
                    if (attr.value.type === "Literal") {
                      propValue = attr.value.value;
                    } else if (attr.value.type === "JSXExpressionContainer") {
                      propValue = { type: attr.value.expression.type };
                    }
                  } else {
                    propValue = true;
                  }

                  props[propName] = propValue;
                }
              });
            }

            const component: ComponentUsage = {
              componentName: localName,
              props,
              propsCount: Object.keys(props).length,
              filePath,
              line: openingElement.loc?.start?.line ?? 0,
              column: openingElement.loc?.start?.column ?? 0,
              importDetails: importRef.specifiers[0],
            };

            components.push(component);
          }
        }

        return false;
      },
    });

    const processingTime = performance.now() - startTime;

    return {
      filePath,
      imports,
      components,
      metrics: {
        processingTime,
        linesOfCode,
        importsCount: imports.length,
        componentsCount: components.length,
      },
    };
  }

  /**
   * Read file content with streaming for large files
   */
  private async readFileContent(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = createReadStream(filePath, {
        highWaterMark: this.options.chunkSize,
      });

      stream.on('data', (chunk) => {
        chunks.push(chunk);
        
        // Check memory usage
        const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
        if (totalSize > this.options.memoryLimitMB * 1024 * 1024) {
          stream.destroy();
          reject(new Error(`File ${filePath} exceeds memory limit`));
        }
      });

      stream.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf8'));
      });

      stream.on('error', reject);
    });
  }

  /**
   * Convert worker thread import format to our format
   */
  private convertWorkerImports(workerImports: any[]): ImportDetails[] {
    const groupedImports = new Map<string, ImportDetails>();

    for (const imp of workerImports) {
      const key = `${imp.filePath}:${imp.packageName}`;
      
      if (!groupedImports.has(key)) {
        groupedImports.set(key, {
          node: null as any, // Worker can't transfer AST nodes
          packageName: imp.packageName,
          specifiers: [],
        });
      }

      const importDetails = groupedImports.get(key)!;
      importDetails.specifiers.push({
        filePath: imp.filePath,
        type: imp.importType === "default" ? "ImportDefaultSpecifier" : 
              imp.importType === "named" ? "ImportSpecifier" : "ImportNamespaceSpecifier",
        importType: imp.importType,
        importStm: `import ${imp.localName} from "${imp.packageName}"`,
        localName: imp.localName,
        importedName: imp.importedName,
        astImportPath: null as any,
      });
    }

    return Array.from(groupedImports.values());
  }

  /**
   * Convert worker thread JSX format to our format
   */
  private convertWorkerComponents(workerJsx: any[]): ComponentUsage[] {
    return workerJsx.map(jsx => ({
      componentName: jsx.localName,
      props: jsx.props,
      propsCount: Object.keys(jsx.props).length,
      filePath: jsx.filePath,
      line: jsx.line ?? 0,
      column: jsx.column ?? 0,
      importDetails: {
        filePath: jsx.filePath,
        type: "ImportSpecifier",
        importType: "named",
        importStm: "",
        localName: jsx.localName,
        importedName: jsx.importRef.importedName,
        astImportPath: null as any,
      },
    }));
  }

  getErrors(): FileOperationError[] {
    return this.errors;
  }
}

/**
 * Streaming analyzer for processing multiple files
 */
export class StreamingAnalyzer {
  private options: StreamingAnalyzerOptions;
  private results: AnalysisResult[] = [];
  private errors: FileOperationError[] = [];

  constructor(options: StreamingAnalyzerOptions = {}) {
    this.options = {
      concurrency: 4,
      batchSize: 16,
      useWorkerThreads: false,
      showProgress: true,
      chunkSize: 64 * 1024,
      memoryLimitMB: 256,
      ...options,
    };
  }

  /**
   * Analyze multiple files with streaming
   */
  async analyzeFiles(filePaths: string[]): Promise<{
    results: AnalysisResult[];
    errors: FileOperationError[];
    stats: {
      totalFiles: number;
      successfulFiles: number;
      totalProcessingTime: number;
      averageProcessingTime: number;
      totalLinesOfCode: number;
      totalImports: number;
      totalComponents: number;
    };
  }> {
    const perfTracker = globalPerformanceMonitor.startOperation("analyzeFiles");
    const startTime = performance.now();

    let progressIndicator: any = null;
    if (this.options.showProgress) {
      progressIndicator = createProgressBar(filePaths.length, {
        showSpeed: true,
        showETA: true,
        showMemory: true,
      });
    }

    try {
      // Create file stream
      const fileStream = new Readable({
        objectMode: true,
        read() {
          // Stream is populated externally
        },
      });

      // Create analysis stream
      const analysisStream = new FileAnalysisStream({
        ...this.options,
        onProgress: (completed, total, currentFile) => {
          progressIndicator?.setProgress(completed, currentFile);
          this.options.onProgress?.(completed, total, currentFile);
        },
        onError: (error) => {
          this.errors.push(error);
          this.options.onError?.(error);
        },
        onResult: (result) => {
          this.results.push(result);
          this.options.onResult?.(result);
        },
      });

      analysisStream.setTotal(filePaths.length);

      // Collect results
      const finalResults: AnalysisResult[] = [];
      analysisStream.on('data', (result) => {
        finalResults.push(result);
      });

      // Pipeline the streams
      const pipelinePromise = pipelineAsync(
        fileStream,
        analysisStream,
      );

      // Feed files to the stream
      for (const filePath of filePaths) {
        fileStream.push(filePath);
      }
      fileStream.push(null); // End the stream

      await pipelinePromise;

      if (progressIndicator) {
        progressIndicator.complete("Analysis completed");
      }

      // Calculate stats
      const totalProcessingTime = performance.now() - startTime;
      const successfulResults = finalResults.filter(r => !r.errors?.length);
      
      const stats = {
        totalFiles: filePaths.length,
        successfulFiles: successfulResults.length,
        totalProcessingTime,
        averageProcessingTime: successfulResults.length > 0 
          ? successfulResults.reduce((sum, r) => sum + r.metrics.processingTime, 0) / successfulResults.length
          : 0,
        totalLinesOfCode: successfulResults.reduce((sum, r) => sum + r.metrics.linesOfCode, 0),
        totalImports: successfulResults.reduce((sum, r) => sum + r.metrics.importsCount, 0),
        totalComponents: successfulResults.reduce((sum, r) => sum + r.metrics.componentsCount, 0),
      };

      perfTracker.complete(filePaths.length);

      return {
        results: finalResults,
        errors: this.errors,
        stats,
      };
    } catch (error) {
      if (progressIndicator) {
        progressIndicator.stop();
      }
      
      perfTracker.error(error as Error);
      throw error;
    }
  }

  /**
   * Analyze files in batches for memory efficiency
   */
  async analyzeFilesBatched(filePaths: string[], batchSize?: number): Promise<{
    results: AnalysisResult[];
    errors: FileOperationError[];
    stats: any;
  }> {
    const actualBatchSize = batchSize ?? this.options.batchSize ?? 50;
    const allResults: AnalysisResult[] = [];
    const allErrors: FileOperationError[] = [];
    
    let progressIndicator: any = null;
    if (this.options.showProgress) {
      progressIndicator = createProgressBar(filePaths.length, {
        showSpeed: true,
        showETA: true,
        showMemory: true,
      });
    }

    const startTime = performance.now();
    let completed = 0;

    try {
      // Process in batches
      for (let i = 0; i < filePaths.length; i += actualBatchSize) {
        const batch = filePaths.slice(i, i + actualBatchSize);
        
        const batchResult = await this.analyzeFiles(batch);
        
        allResults.push(...batchResult.results);
        allErrors.push(...batchResult.errors);
        
        completed += batch.length;
        progressIndicator?.setProgress(completed);

        // Memory management
        if (global.gc && completed % (actualBatchSize * 4) === 0) {
          global.gc();
        }
      }

      if (progressIndicator) {
        progressIndicator.complete("Batch analysis completed");
      }

      const totalProcessingTime = performance.now() - startTime;
      const successfulResults = allResults.filter(r => !r.errors?.length);

      const stats = {
        totalFiles: filePaths.length,
        successfulFiles: successfulResults.length,
        totalProcessingTime,
        averageProcessingTime: successfulResults.length > 0 
          ? successfulResults.reduce((sum, r) => sum + r.metrics.processingTime, 0) / successfulResults.length
          : 0,
        totalLinesOfCode: successfulResults.reduce((sum, r) => sum + r.metrics.linesOfCode, 0),
        totalImports: successfulResults.reduce((sum, r) => sum + r.metrics.importsCount, 0),
        totalComponents: successfulResults.reduce((sum, r) => sum + r.metrics.componentsCount, 0),
        batchSize: actualBatchSize,
        totalBatches: Math.ceil(filePaths.length / actualBatchSize),
      };

      return {
        results: allResults,
        errors: allErrors,
        stats,
      };
    } catch (error) {
      if (progressIndicator) {
        progressIndicator.stop();
      }
      throw error;
    }
  }
}

/**
 * Create a streaming analyzer with optimal defaults
 */
export function createStreamingAnalyzer(options: StreamingAnalyzerOptions = {}): StreamingAnalyzer {
  return new StreamingAnalyzer({
    concurrency: 4,
    batchSize: 32,
    useWorkerThreads: true,
    showProgress: true,
    memoryLimitMB: 512,
    ...options,
  });
}
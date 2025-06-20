/**
 * Graph service implementation
 */

import { IGraphService, IFileService, IASTService, ILoggerService, IConfigurationService } from '../di/types';
import { ProjectGraph } from '../graph/types';
import { FileOperationError, getConcurrencyLimit, AsyncFileUtils } from '../utils/fs-utils';
import { getCompName } from '../utils/pathUtils';
import { getSpecifierLocalName, getNameFromSpecifier } from '../types/ast';
import { builders as b } from 'ast-types';

export class GraphService implements IGraphService {
  constructor(
    private fileService: IFileService,
    private astService: IASTService,
    private loggerService: ILoggerService,
    private configService: IConfigurationService
  ) {}

  async initialize(): Promise<void> {
    this.loggerService.debug('Graph service initialized');
  }

  async dispose(): Promise<void> {
    this.loggerService.debug('Graph service disposed');
  }

  async buildGraph(rootPath: string, blacklist: string[]): Promise<ProjectGraph> {
    this.loggerService.analysisStart(rootPath);
    
    try {
      const files = await this.fileService.glob(
        this.configService.getIncludePatterns(),
        {
          cwd: rootPath,
          absolute: true,
          ignore: blacklist.map(b => `**/${b}/**`),
        }
      );

      const graph: ProjectGraph = { imports: [], jsx: [] };
      const errors: string[] = [];

      for (const filePath of files) {
        try {
          await this.processFile(filePath, graph);
        } catch (error) {
          const errorMsg = `Failed to process file ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          this.loggerService.warn(errorMsg);
        }
      }

      if (errors.length > 0) {
        this.loggerService.warn(`Graph building completed with ${errors.length} errors`);
      }

      this.loggerService.analysisComplete(graph.imports.length, graph.jsx.length, files.length);
      return graph;

    } catch (error) {
      this.loggerService.error('Failed to build graph:', error);
      throw error;
    }
  }

  async buildGraphAsync(
    rootPath: string,
    blacklist: string[],
    options: {
      concurrency?: number;
      onProgress?: (completed: number, total: number, currentFile?: string) => void;
      onError?: (error: FileOperationError) => void;
    } = {}
  ): Promise<{ graph: ProjectGraph; errors: FileOperationError[] }> {
    this.loggerService.analysisStart(rootPath);
    
    try {
      const files = await this.fileService.glob(
        this.configService.getIncludePatterns(),
        {
          cwd: rootPath,
          absolute: true,
          ignore: blacklist.map(b => `**/${b}/**`),
        }
      );

      const graph: ProjectGraph = { imports: [], jsx: [] };
      const errors: FileOperationError[] = [];
      const concurrency = options.concurrency ?? getConcurrencyLimit();

      options.onProgress?.(0, files.length);

      // Use AsyncFileUtils for concurrent file processing
      const fileUtils = new AsyncFileUtils(concurrency);

      const completedState = { value: 0 };
      const progressCallback = (currentCompleted: number, total: number) => {
        completedState.value = currentCompleted;
        options.onProgress?.(completedState.value, total);
      };

      // Read all files concurrently with AST parsing
      const results = await fileUtils.readFilesWithAst(files, progressCallback);

      // Process results and collect errors
      for (const result of results) {
        if (result.error) {
          errors.push(result.error);
          options.onError?.(result.error);
          continue;
        }

        try {
          // Process the AST for imports and JSX
          this.processFileAst(result.ast, result.path, graph);
        } catch (error) {
          const processError = new FileOperationError(
            'processAST',
            result.path,
            error as Error
          );
          errors.push(processError);
          options.onError?.(processError);
        }
      }

      options.onProgress?.(files.length, files.length);

      this.loggerService.analysisComplete(graph.imports.length, graph.jsx.length, files.length);
      
      if (errors.length > 0) {
        this.loggerService.warn(`Async graph building completed with ${errors.length} errors`);
      }

      return { graph, errors };

    } catch (error) {
      this.loggerService.error('Failed to build graph async:', error);
      throw error;
    }
  }

  async buildGraphBatched(
    rootPath: string,
    blacklist: string[],
    options: {
      batchSize?: number;
      concurrency?: number;
      onProgress?: (completed: number, total: number, currentBatch?: number) => void;
      onError?: (error: FileOperationError) => void;
      memoryLimitMB?: number;
    } = {}
  ): Promise<{ graph: ProjectGraph; errors: FileOperationError[] }> {
    this.loggerService.analysisStart(rootPath);
    
    try {
      const files = await this.fileService.glob(
        this.configService.getIncludePatterns(),
        {
          cwd: rootPath,
          absolute: true,
          ignore: blacklist.map(b => `**/${b}/**`),
        }
      );

      const graph: ProjectGraph = { imports: [], jsx: [] };
      const errors: FileOperationError[] = [];

      const batchSize = options.batchSize ?? Math.max(50, Math.min(files.length / 10, 200));
      const concurrency = options.concurrency ?? getConcurrencyLimit();
      const memoryLimitMB = options.memoryLimitMB ?? this.configService.getMemoryLimitMB();

      const completedState = { value: 0 };
      const currentBatchState = { value: 0 };
      const totalBatches = Math.ceil(files.length / batchSize);

      // Process files in batches
      for (let i = 0; i < files.length; i += batchSize) {
        currentBatchState.value++;
        const batch = files.slice(i, i + batchSize);

        options.onProgress?.(
          completedState.value,
          files.length,
          currentBatchState.value
        );

        // Check memory usage before processing batch
        await this.checkMemoryUsage(memoryLimitMB);

        try {
          const fileUtils = new AsyncFileUtils(Math.min(concurrency, batch.length));

          const results = await fileUtils.readFilesWithAst(
            batch,
            (batchCompleted) => {
              options.onProgress?.(
                completedState.value + batchCompleted,
                files.length,
                currentBatchState.value
              );
            }
          );

          // Process batch results
          for (const result of results) {
            if (result.error) {
              errors.push(result.error);
              options.onError?.(result.error);
              continue;
            }

            try {
              this.processFileAst(result.ast, result.path, graph);
            } catch (error) {
              const processError = new FileOperationError(
                'processAST',
                result.path,
                error as Error
              );
              errors.push(processError);
              options.onError?.(processError);
            }
          }

          completedState.value += batch.length;
        } catch (error) {
          const batchError = new FileOperationError(
            'processBatch',
            `batch-${currentBatchState.value}`,
            error as Error
          );
          errors.push(batchError);
          options.onError?.(batchError);

          // Skip this batch but continue with the next
          completedState.value += batch.length;
        }
      }

      options.onProgress?.(files.length, files.length, totalBatches);

      this.loggerService.analysisComplete(graph.imports.length, graph.jsx.length, files.length);
      
      if (errors.length > 0) {
        this.loggerService.warn(`Batched graph building completed with ${errors.length} errors`);
      }

      return { graph, errors };

    } catch (error) {
      this.loggerService.error('Failed to build graph batched:', error);
      throw error;
    }
  }

  // Graph manipulation methods
  async mergeGraphs(graphs: ProjectGraph[]): Promise<ProjectGraph> {
    const mergedGraph: ProjectGraph = { imports: [], jsx: [] };

    for (const graph of graphs) {
      mergedGraph.imports.push(...graph.imports);
      mergedGraph.jsx.push(...graph.jsx);
    }

    // Remove duplicates based on file path and position
    mergedGraph.imports = this.deduplicateImports(mergedGraph.imports);
    mergedGraph.jsx = this.deduplicateJSX(mergedGraph.jsx);

    return mergedGraph;
  }

  async filterGraph(
    graph: ProjectGraph,
    filter: {
      packages?: string[];
      components?: string[];
      files?: string[];
    }
  ): Promise<ProjectGraph> {
    const filteredGraph: ProjectGraph = { imports: [], jsx: [] };

    // Filter imports
    filteredGraph.imports = graph.imports.filter(imp => {
      if (filter.packages && !filter.packages.includes(imp.pkg)) return false;
      if (filter.files && !filter.files.includes(imp.file)) return false;
      return true;
    });

    // Filter JSX elements
    filteredGraph.jsx = graph.jsx.filter(jsx => {
      if (filter.components && !filter.components.includes(jsx.componentName)) return false;
      if (filter.files && !filter.files.includes(jsx.file)) return false;
      if (filter.packages && !filter.packages.includes(jsx.importRef.pkg)) return false;
      return true;
    });

    return filteredGraph;
  }

  async getGraphStatistics(graph: ProjectGraph): Promise<{
    totalImports: number;
    totalJSX: number;
    uniquePackages: number;
    uniqueComponents: number;
    uniqueFiles: number;
    packageBreakdown: Record<string, { imports: number; jsx: number }>;
    componentBreakdown: Record<string, { jsx: number; files: string[] }>;
  }> {
    const packageBreakdown: Record<string, { imports: number; jsx: number }> = {};
    const componentBreakdown: Record<string, { jsx: number; files: string[] }> = {};
    const uniquePackages = new Set<string>();
    const uniqueComponents = new Set<string>();
    const uniqueFiles = new Set<string>();

    // Process imports
    graph.imports.forEach(imp => {
      uniquePackages.add(imp.pkg);
      uniqueFiles.add(imp.file);
      
      if (!packageBreakdown[imp.pkg]) {
        packageBreakdown[imp.pkg] = { imports: 0, jsx: 0 };
      }
      packageBreakdown[imp.pkg].imports++;
    });

    // Process JSX
    graph.jsx.forEach(jsx => {
      uniqueComponents.add(jsx.componentName);
      uniqueFiles.add(jsx.file);
      
      if (!packageBreakdown[jsx.importRef.pkg]) {
        packageBreakdown[jsx.importRef.pkg] = { imports: 0, jsx: 0 };
      }
      packageBreakdown[jsx.importRef.pkg].jsx++;

      if (!componentBreakdown[jsx.componentName]) {
        componentBreakdown[jsx.componentName] = { jsx: 0, files: [] };
      }
      componentBreakdown[jsx.componentName].jsx++;
      
      if (!componentBreakdown[jsx.componentName].files.includes(jsx.file)) {
        componentBreakdown[jsx.componentName].files.push(jsx.file);
      }
    });

    return {
      totalImports: graph.imports.length,
      totalJSX: graph.jsx.length,
      uniquePackages: uniquePackages.size,
      uniqueComponents: uniqueComponents.size,
      uniqueFiles: uniqueFiles.size,
      packageBreakdown,
      componentBreakdown,
    };
  }

  // Private implementation methods
  private async processFile(filePath: string, graph: ProjectGraph): Promise<void> {
    const { ast } = await this.astService.parseFile(filePath);
    this.processFileAst(ast, filePath, graph);
  }

  private processFileAst(ast: any, filePath: string, graph: ProjectGraph): void {
    // Pass 1 – collect imports
    this.astService.visitAST(ast, {
      visitImportDeclaration: (p: any) => {
        const node = p.node;
        const pkg = node.source.value as string;

        node.specifiers?.forEach((spec: any) => {
          let imported: string;
          let local: string;

          try {
            imported = getNameFromSpecifier(spec);
            local = getSpecifierLocalName(spec);
          } catch (error) {
            imported = 'UNKNOWN';
            this.loggerService.warn(`Unhandled import type: ${spec.type} in ${filePath}`, spec);
            return; // Skip this specifier
          }

          graph.imports.push({
            pkg,
            file: filePath,
            imported,
            importedType: spec.type,
            local,
            node: p, // keep reference
          });
        });

        return false;
      },
    });

    // Pass 2 – collect JSX tied to those imports
    this.astService.visitAST(ast, {
      visitJSXElement: (p: any) => {
        const openingElement = p.node.openingElement;
        if (openingElement.name.type !== 'JSXIdentifier') return false;

        const localName = openingElement.name.name;

        const importRef = graph.imports.find(
          (i) => i.file === filePath && i.local === localName
        );
        if (!importRef) return this.traverse(p); // unrelated component

        const props: Record<string, any> = {};

        openingElement.attributes?.forEach((attr: any) => {
          if (attr.type !== 'JSXAttribute' || !attr.name) return;
          props[attr.name.name as string] = attr.value
            ? attr.value.type === 'JSXExpressionContainer'
              ? attr.value.expression // real AST node
              : attr.value
            : b.booleanLiteral(true); // <Comp flag />
        });

        graph.jsx.push({
          file: filePath,
          importRef,
          componentName: getCompName(
            importRef.local,
            importRef.imported,
            importRef.importedType
          ),
          opener: p,
          props,
        });

        return false;
      },
    });
  }

  private traverse(path: any): void {
    // Helper method for AST traversal
    if (path.traverse) {
      path.traverse();
    }
  }

  private async checkMemoryUsage(memoryLimitMB: number): Promise<void> {
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / (1024 * 1024);

    if (memUsageMB > memoryLimitMB) {
      this.loggerService.performance(`Memory usage: ${memUsageMB.toFixed(2)}MB, triggering GC`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait a bit for memory to be freed
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private deduplicateImports(imports: any[]): any[] {
    const seen = new Set<string>();
    return imports.filter(imp => {
      const key = `${imp.file}:${imp.pkg}:${imp.imported}:${imp.local}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private deduplicateJSX(jsx: any[]): any[] {
    const seen = new Set<string>();
    return jsx.filter(elem => {
      // Create a unique key based on file, component, and position
      const key = `${elem.file}:${elem.componentName}:${elem.opener?.node?.loc?.start?.line || 0}:${elem.opener?.node?.loc?.start?.column || 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Graph querying methods
  async findImportsByPackage(graph: ProjectGraph, packageName: string): Promise<any[]> {
    return graph.imports.filter(imp => imp.pkg === packageName);
  }

  async findJSXByComponent(graph: ProjectGraph, componentName: string): Promise<any[]> {
    return graph.jsx.filter(jsx => jsx.componentName === componentName);
  }

  async findJSXByPackage(graph: ProjectGraph, packageName: string): Promise<any[]> {
    return graph.jsx.filter(jsx => jsx.importRef.pkg === packageName);
  }

  async getComponentsByPackage(graph: ProjectGraph): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};
    
    graph.jsx.forEach(jsx => {
      const pkg = jsx.importRef.pkg;
      if (!result[pkg]) {
        result[pkg] = [];
      }
      if (!result[pkg].includes(jsx.componentName)) {
        result[pkg].push(jsx.componentName);
      }
    });

    return result;
  }

  async getFilesByPackage(graph: ProjectGraph): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};
    
    graph.imports.forEach(imp => {
      if (!result[imp.pkg]) {
        result[imp.pkg] = [];
      }
      if (!result[imp.pkg].includes(imp.file)) {
        result[imp.pkg].push(imp.file);
      }
    });

    return result;
  }
}
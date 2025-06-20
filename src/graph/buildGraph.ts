import {
  getFileAstAndCode,
  getFileAstAndCodeAsync,
  AsyncFileUtils,
  FileOperationError,
  getConcurrencyLimit,
  MemoryMonitor,
  globalMemoryMonitor,
  createMemoryEfficientBatcher,
  memoryAwareDelay,
} from "@/utils/fs-utils";
import {
  validateRootPath,
  validateBlacklist,
  validateFileSystemPermissions,
  PathValidationError,
  formatPathError,
} from "@/utils/path-validation";
import chalk from "chalk";
import { globalPerformanceMonitor } from "@/utils/fs/performance-monitor";
import { createSpinner, MultiPhaseProgress } from "@/utils/fs/progress-indicator";
import { getWorkerPool, TASK_TYPES } from "@/utils/fs/worker-pool";
import { getCompName } from "@/utils/pathUtils";
import { getSpecifierLocalName, getNameFromSpecifier, isIdentifier } from "@/types/ast";
import { 
  validateRootPath, 
  validateBlacklist, 
  validateFileSystemPermissions,
  formatPathError,
  PathValidationError
} from "@/utils/path-validation";
import { builders as b, visit } from "ast-types";
import fg from "fast-glob";
import { ProjectGraph } from "./types";
import { types as T } from "recast";
import fs from "node:fs";
import path from "node:path";

/**
 * Shared validation function for all graph building variants
 */
async function validatePathsForGraphBuilding(root: string, blacklist: string[]): Promise<{
  validatedRoot: string;
  validatedBlacklist: string[];
}> {
  // Validate root path first
  console.info(chalk.blue('🔍 Validating root path...'));
  
  const rootValidation = validateRootPath(root);
  if (!rootValidation.valid) {
    console.error(formatPathError(rootValidation.error!));
    throw new Error(`Root path validation failed: ${rootValidation.error!.message}`);
  }
  
  const validatedRoot = rootValidation.resolvedPath!;
  
  // Check file system permissions
  const permissions = validateFileSystemPermissions(validatedRoot);
  if (!permissions.canRead) {
    console.error(chalk.red('❌ No read permission for root directory'));
    permissions.suggestions.forEach(suggestion => {
      console.error(chalk.gray(`   • ${suggestion}`));
    });
    throw new Error('Insufficient permissions to scan root directory');
  }
  
  console.info(chalk.green(`✅ Root path validated: ${validatedRoot}`));
  
  // Validate blacklist
  console.info(chalk.blue('🚫 Validating blacklist directories...'));
  
  const blacklistValidation = validateBlacklist(blacklist, validatedRoot);
  let validatedBlacklist = blacklist;
  
  if (!blacklistValidation.valid) {
    console.warn(chalk.yellow('⚠️ Some blacklist entries are invalid:'));
    blacklistValidation.invalidEntries.forEach(invalid => {
      console.warn(chalk.gray(`   • "${invalid.entry}": ${invalid.reason}`));
    });
    
    // Use only valid entries
    validatedBlacklist = blacklistValidation.validEntries;
    console.info(chalk.yellow(`Using ${validatedBlacklist.length} valid blacklist entries`));
  }
  
  if (blacklistValidation.suggestedAdditions.length > 0) {
    console.info(chalk.cyan(`💡 Consider adding: ${blacklistValidation.suggestedAdditions.join(', ')}`));
  }
  
  console.info(chalk.green(`✅ Blacklist validated (${validatedBlacklist.length} entries)`));
  
  return {
    validatedRoot,
    validatedBlacklist
  };
}

/**
 * Safely converts blacklist input to array format
 * Handles string, array, null, undefined, and other types
 */
function ensureBlacklistArray(blacklist: any): string[] {
  // If already an array, return as-is (after validation)
  if (Array.isArray(blacklist)) {
    return blacklist.filter(item => typeof item === 'string' && item.trim().length > 0);
  }
  
  // If string, split by comma and filter
  if (typeof blacklist === 'string') {
    return blacklist.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
  
  // For any other type (undefined, null, object, etc.), use safe defaults
  console.warn('Invalid blacklist type detected, using default blacklist entries');
  return ['node_modules', '.git', 'dist', 'build', 'out', '.cache', 'coverage', '.nyc_output'];
}

export const buildGraph = (root: string, blacklist: any, timeoutMs: number = 5 * 60 * 1000): ProjectGraph => {
  const startTime = Date.now();
  
  // Ensure blacklist is properly formatted as array
  const safeBlacklist = ensureBlacklistArray(blacklist);
  
  console.info(`📋 Using blacklist: [${safeBlacklist.join(', ')}]`);
  
  // Validate root path
  console.info(chalk.blue('🔍 Validating root path...'));
  try {
    const rootValidation = validateRootPath(root);
    if (!rootValidation.valid) {
      console.error(formatPathError(rootValidation.error!));
      throw new Error(`Root path validation failed: ${rootValidation.error!.message}`);
    }
    
    // Use the validated resolved path
    root = rootValidation.resolvedPath!;
    
    // Check file system permissions
    const permissions = validateFileSystemPermissions(root);
    if (!permissions.canRead) {
      console.error(chalk.red('❌ No read permission for root directory'));
      permissions.suggestions.forEach(suggestion => {
        console.error(chalk.gray(`   • ${suggestion}`));
      });
      throw new Error('Insufficient permissions to scan root directory');
    }
    
    console.info(chalk.green(`✅ Root path validated: ${root}`));
  } catch (error) {
    if (error instanceof PathValidationError) {
      throw error;
    }
    throw new Error(`Path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Validate blacklist
  try {
    console.info(chalk.blue('🚫 Validating blacklist directories...'));
    
    const blacklistValidation = validateBlacklist(safeBlacklist, root);
    if (!blacklistValidation.valid) {
      console.warn(chalk.yellow('⚠️ Some blacklist entries are invalid:'));
      blacklistValidation.invalidEntries.forEach(invalid => {
        console.warn(chalk.gray(`   • "${invalid.entry}": ${invalid.reason}`));
      });
      
      // Use only valid entries - update safeBlacklist
      const validBlacklist = blacklistValidation.validEntries;
      console.info(chalk.yellow(`Using ${validBlacklist.length} valid blacklist entries`));
    }
    
    if (blacklistValidation.suggestedAdditions.length > 0) {
      console.info(chalk.cyan(`💡 Consider adding: ${blacklistValidation.suggestedAdditions.join(', ')}`));
    }
    
    console.info(chalk.green(`✅ Blacklist validated (${safeBlacklist.length} entries)`));
  } catch (error) {
    console.warn(chalk.yellow(`⚠️ Blacklist validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    console.warn(chalk.yellow('Proceeding with provided blacklist...'));
  }
  
  // Check if we should use memory-optimized version for large codebases
  console.info('📁 Scanning for JSX/TSX files...');
  
  const files = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
    cwd: root,
    absolute: true,
    ignore: blacklist.map((b) => `**/${b}/**`),
  });

  // Use memory-optimized version for large codebases
  if (files.length > 5000) {
    console.warn(`Large codebase detected (${files.length} files). Consider using --max-memory flag for better performance.`);
    
    // Force garbage collection before starting
    if (global.gc) {
      global.gc();
    }
  }

  // Add timeout protection
  const checkTimeout = () => {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Graph building timed out after ${timeoutMs}ms`);
    }
  };

  const graph: ProjectGraph = { imports: [], jsx: [] };
  const errors: string[] = [];

  // Filter files intelligently to reduce memory usage
  const filteredFiles = intelligentFileFilter(files);

  for (let i = 0; i < filteredFiles.length; i++) {
    const abs = filteredFiles[i];
    
    // Check timeout every 100 files
    if (i % 100 === 0) {
      checkTimeout();
      
      // Log progress for large codebases
      if (filteredFiles.length > 500) {
        const progress = Math.round((i / filteredFiles.length) * 100);
        console.log(`Graph building progress: ${progress}% (${i}/${filteredFiles.length})`);
      }
    }
    
    try {
      const [ast, code] = getFileAstAndCode(abs);

      /* Pass 1 – collect imports */
      visit(ast, {
        visitImportDeclaration(p) {
          try {
            const node = p.node;
            const pkg = node.source.value as string;

            node.specifiers?.forEach((spec) => {
              let imported: string;
              let local: string;
              
              try {
                imported = getNameFromSpecifier(spec);
                local = getSpecifierLocalName(spec);
              } catch (error) {
                console.warn(
                  `Failed to extract names from import specifier in ${abs}: ${error.message}`,
                );
                return; // Skip this specifier
              }

              // Validate that we have non-empty names
              if (!imported || imported.trim() === '' || !local || local.trim() === '') {
                console.warn(
                  `Skipping import with empty names in ${abs}: imported="${imported}", local="${local}", pkg="${pkg}"`
                );
                return; // Skip this specifier
              }

              graph.imports.push({
                pkg,
                file: abs,
                imported,
                importedType: spec.type,
                local,
                node: p, // keep reference
              });
            });
          } catch (error) {
            console.warn(`Error processing import in ${abs}:`, error);
          }

          return false;
        },
      });

      /* Pass 2 – collect JSX tied to those imports */
      visit(ast, {
        visitJSXElement(p) {
          try {
            const openingElement = p.node.openingElement;
            if (openingElement.name.type !== "JSXIdentifier") return false;

            const localName = openingElement.name.name;

            const importRef = graph.imports.find(
              (i) => i.file === abs && i.local === localName,
            );
            if (!importRef) return this.traverse(p); // unrelated component

            const props: Record<string, any> = {};

            openingElement.attributes?.forEach((attr) => {
              if (attr.type !== "JSXAttribute" || !attr.name) return;
              props[attr.name.name as string] = attr.value
                ? attr.value.type === "JSXExpressionContainer"
                  ? attr.value.expression // real AST node
                  : attr.value
                : b.booleanLiteral(true); // <Comp flag />
            });

            const componentName = getCompName(
              importRef.local,
              importRef.imported,
              importRef.importedType,
            );

            // Validate component name before adding
            if (!componentName || componentName.trim() === '') {
              console.warn(
                `Skipping JSX element with empty component name in ${abs}: localName="${localName}", importRef.local="${importRef.local}", importRef.imported="${importRef.imported}"`
              );
              return false;
            }

            graph.jsx.push({
              file: abs,
              importRef,
              componentName,
              opener: p,
              props,
            });
          } catch (error) {
            console.warn(`Error processing JSX element in ${abs}:`, error);
          }

          return false;
        },
      });
      
      // Trigger garbage collection periodically for large codebases
      if (filteredFiles.length > 1000 && (filteredFiles.indexOf(abs) + 1) % 500 === 0) {
        if (global.gc) {
          global.gc();
        }
      }
    } catch (error) {
      const errorMsg = `Failed to process file ${abs}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      console.warn(errorMsg);
    }
  }

  if (errors.length > 0) {
    const errorSummary = `Graph building completed with ${errors.length} errors. Check console for details.`;
    console.warn(errorSummary);
  }

  return graph;
};

/**
 * Process AST for imports and JSX usage
 */
const processFileAst = (
  ast: T.ASTNode,
  filePath: string,
  graph: ProjectGraph,
): void => {
  /* Pass 1 – collect imports */
  visit(ast, {
    visitImportDeclaration(p) {
      const node = p.node;
      const pkg = node.source.value as string;

      node.specifiers?.forEach((spec) => {
        let imported: string;
        let local: string;
        
        try {
          imported = getNameFromSpecifier(spec);
          local = getSpecifierLocalName(spec);
        } catch (error) {
          console.warn(
            `Failed to extract names from import specifier in ${filePath}: ${error.message}`,
          );
          return; // Skip this specifier
        }

        // Validate that we have non-empty names
        if (!imported || imported.trim() === '' || !local || local.trim() === '') {
          console.warn(
            `Skipping import with empty names in ${filePath}: imported="${imported}", local="${local}", pkg="${pkg}"`
          );
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

  /* Pass 2 – collect JSX tied to those imports */
  visit(ast, {
    visitJSXElement(p) {
      const openingElement = p.node.openingElement;
      if (openingElement.name.type !== "JSXIdentifier") return false;

      const localName = openingElement.name.name;

      const importRef = graph.imports.find(
        (i) => i.file === filePath && i.local === localName,
      );
      if (!importRef) return this.traverse(p); // unrelated component

      const props: Record<string, any> = {};

      openingElement.attributes?.forEach((attr) => {
        if (attr.type !== "JSXAttribute" || !attr.name) return;
        props[attr.name.name as string] = attr.value
          ? attr.value.type === "JSXExpressionContainer"
            ? attr.value.expression // real AST node
            : attr.value
          : b.booleanLiteral(true); // <Comp flag />
      });

      const componentName = getCompName(
        importRef.local,
        importRef.imported,
        importRef.importedType,
      );

      // Validate component name before adding
      if (!componentName || componentName.trim() === '') {
        console.warn(
          `Skipping JSX element with empty component name in ${filePath}: localName="${localName}", importRef.local="${importRef.local}", importRef.imported="${importRef.imported}"`
        );
        return false;
      }

      graph.jsx.push({
        file: filePath,
        importRef,
        componentName,
        opener: p,
        props,
      });

      return false;
    },
  });
};


/**
 * Async version of buildGraph with concurrent file processing and comprehensive error handling
 */
export const buildGraphAsync = async (
  root: string,
  blacklist: string[],
  options: {
    concurrency?: number;
    onProgress?: (
      completed: number,
      total: number,
      currentFile?: string,
    ) => void;
    onError?: (error: FileOperationError) => void;
  } = {},
): Promise<{ graph: ProjectGraph; errors: FileOperationError[] }> => {
  // Validate paths first
  try {
    console.info(chalk.blue('🔍 Validating paths for async graph building...'));
    const { validatedRoot, validatedBlacklist } = await validatePathsForGraphBuilding(root, blacklist);
    root = validatedRoot;
    blacklist = validatedBlacklist;
    console.info(chalk.green('✅ Path validation completed'));
  } catch (error) {
    throw new Error(`Path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  const files = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
    cwd: root,
    absolute: true,
    ignore: blacklist.map((b) => `**/${b}/**`),
  });

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

  try {
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
        processFileAst(result.ast, result.path, graph);
      } catch (error) {
        const processError = new FileOperationError(
          "processAST",
          result.path,
          error as Error,
        );
        errors.push(processError);
        options.onError?.(processError);
      }
    }
  } catch (error) {
    // Handle any unexpected errors during concurrent processing
    const generalError = new FileOperationError(
      "buildGraphAsync",
      root,
      error as Error,
    );
    errors.push(generalError);
    options.onError?.(generalError);
  }

  options.onProgress?.(files.length, files.length);

  return { graph, errors };
};

/**
 * Memory-efficient buildGraph for very large codebases
 * Processes files in smaller batches to avoid memory pressure
 */
export const buildGraphAsyncBatched = async (
  root: string,
  blacklist: string[],
  options: {
    batchSize?: number;
    concurrency?: number;
    onProgress?: (
      completed: number,
      total: number,
      currentBatch?: number,
    ) => void;
    onError?: (error: FileOperationError) => void;
    memoryLimitMB?: number;
    useWorkerThreads?: boolean;
    showProgress?: boolean;
  } = {},
): Promise<{ graph: ProjectGraph; errors: FileOperationError[] }> => {
  const perfTracker = globalPerformanceMonitor.startOperation("buildGraphAsyncBatched", root);
  
  // Validate paths first
  try {
    console.info(chalk.blue('🔍 Validating paths for batched async graph building...'));
    const { validatedRoot, validatedBlacklist } = await validatePathsForGraphBuilding(root, blacklist);
    root = validatedRoot;
    blacklist = validatedBlacklist;
    console.info(chalk.green('✅ Path validation completed'));
  } catch (error) {
    perfTracker.end();
    throw new Error(`Path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  const files = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
    cwd: root,
    absolute: true,
    ignore: blacklist.map((b) => `**/${b}/**`),
  });

  const graph: ProjectGraph = { imports: [], jsx: [] };
  const errors: FileOperationError[] = [];

  const batchSize =
    options.batchSize ?? Math.max(50, Math.min(files.length / 10, 200));
  const concurrency = options.concurrency ?? getConcurrencyLimit();
  const memoryLimitMB = options.memoryLimitMB ?? 512;
  const useWorkerThreads = options.useWorkerThreads ?? (files.length > 500);
  const showProgress = options.showProgress ?? true;

  // Initialize progress tracking
  let progressIndicator: any = null;
  if (showProgress) {
    progressIndicator = createSpinner(files.length, {
      showSpeed: true,
      showETA: true,
      showMemory: true,
    });
  }

  const completedState = { value: 0 };
  const currentBatchState = { value: 0 };
  const totalBatches = Math.ceil(files.length / batchSize);
  
  const workerPool = useWorkerThreads ? getWorkerPool() : null;

  try {
    // Process files in batches
    for (let i = 0; i < files.length; i += batchSize) {
      currentBatchState.value++;
      const batch = files.slice(i, i + batchSize);

      if (progressIndicator) {
        progressIndicator.setProgress(
          completedState.value,
          undefined,
          `Batch ${currentBatchState.value}/${totalBatches}`,
        );
      }

      options.onProgress?.(
        completedState.value,
        files.length,
        currentBatchState.value,
      );

      // Check memory usage before processing batch
      const memUsage = process.memoryUsage();
      const memUsageMB = memUsage.heapUsed / (1024 * 1024);

      if (memUsageMB > memoryLimitMB) {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Wait a bit for memory to be freed
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      try {
        if (useWorkerThreads && workerPool) {
          // Process batch with worker threads
          await processBatchWithWorkers(batch, graph, errors, workerPool, options);
        } else {
          // Process batch in main thread
          await processBatchMainThread(batch, graph, errors, concurrency, options);
        }

        completedState.value += batch.length;
        
        if (progressIndicator) {
          progressIndicator.setProgress(completedState.value);
        }
      } catch (error) {
        const batchError = new FileOperationError(
          "processBatch",
          `batch-${currentBatchState.value}`,
          error as Error,
        );
        errors.push(batchError);
        options.onError?.(batchError);

        // Skip this batch but continue with the next
        completedState.value += batch.length;
      }
    }

    if (progressIndicator) {
      progressIndicator.complete("Graph building completed");
    }

    options.onProgress?.(files.length, files.length, totalBatches);
    
    perfTracker.complete(files.length);
    
    return { graph, errors };
  } catch (error) {
    if (progressIndicator) {
      progressIndicator.stop();
    }
    
    perfTracker.error(error as Error);
    throw error;
  }
};

/**
 * Process batch using worker threads
 */
async function processBatchWithWorkers(
  batch: string[],
  graph: ProjectGraph,
  errors: FileOperationError[],
  workerPool: any,
  options: any,
): Promise<void> {
  const batchResults = await Promise.allSettled(
    batch.map(async (filePath) => {
      try {
        // Parse AST using worker thread
        const astResult = await workerPool.execute(TASK_TYPES.PARSE_AST, {
          filePath,
        });

        if (!astResult.success) {
          throw new Error(astResult.error || "Failed to parse AST");
        }

        // Analyze imports using worker thread
        const importsResult = await workerPool.execute(TASK_TYPES.ANALYZE_IMPORTS, {
          ast: astResult.ast,
          filePath,
        });

        if (!importsResult.success) {
          throw new Error(importsResult.error || "Failed to analyze imports");
        }

        // Process JSX using worker thread
        const jsxResult = await workerPool.execute(TASK_TYPES.PROCESS_JSX, {
          ast: astResult.ast,
          filePath,
          imports: importsResult.imports,
        });

        if (!jsxResult.success) {
          throw new Error(jsxResult.error || "Failed to process JSX");
        }

        return {
          filePath,
          imports: importsResult.imports,
          jsxElements: jsxResult.jsxElements,
        };
      } catch (error) {
        throw new FileOperationError("workerProcessing", filePath, error as Error);
      }
    }),
  );

  // Process results
  for (const result of batchResults) {
    if (result.status === "rejected") {
      errors.push(result.reason);
      options.onError?.(result.reason);
    } else {
      const { imports, jsxElements } = result.value;
      
      // Add imports to graph (convert worker format to graph format)
      for (const imp of imports) {
        graph.imports.push({
          pkg: imp.packageName,
          file: imp.filePath,
          imported: imp.importedName,
          importedType: imp.importType,
          local: imp.localName,
          node: null as any, // Worker threads can't transfer AST nodes
        });
      }
      
      // Add JSX elements to graph
      for (const jsx of jsxElements) {
        const importRef = graph.imports.find(
          i => i.file === jsx.filePath && i.local === jsx.localName
        );
        
        if (importRef) {
          graph.jsx.push({
            file: jsx.filePath,
            importRef,
            componentName: getCompName(
              importRef.local,
              importRef.imported,
              importRef.importedType,
            ),
            opener: null as any, // Worker threads can't transfer AST nodes
            props: jsx.props,
          });
        }
      }
    }
  }
}

/**
 * Process batch in main thread
 */
async function processBatchMainThread(
  batch: string[],
  graph: ProjectGraph,
  errors: FileOperationError[],
  concurrency: number,
  options: any,
): Promise<void> {
  const fileUtils = new AsyncFileUtils(Math.min(concurrency, batch.length));

  const results = await fileUtils.readFilesWithAst(batch);

  // Process batch results
  for (const result of results) {
    if (result.error) {
      errors.push(result.error);
      options.onError?.(result.error);
      continue;
    }

    try {
      processFileAst(result.ast, result.path, graph);
    } catch (error) {
      const processError = new FileOperationError(
        "processAST",
        result.path,
        error as Error,
      );
      errors.push(processError);
      options.onError?.(processError);
    }
  }
}

/**
 * Enhanced buildGraph with multi-phase progress tracking and adaptive processing
 */
export const buildGraphAsyncEnhanced = async (
  root: string,
  blacklist: string[],
  options: {
    concurrency?: number;
    onProgress?: (phase: string, completed: number, total: number) => void;
    onError?: (error: FileOperationError) => void;
    adaptiveProcessing?: boolean;
    showProgress?: boolean;
    memoryLimitMB?: number;
  } = {},
): Promise<{ graph: ProjectGraph; errors: FileOperationError[]; stats: any }> => {
  const perfTracker = globalPerformanceMonitor.startOperation("buildGraphAsyncEnhanced", root);
  
  // Validate paths first
  try {
    console.info(chalk.blue('🔍 Validating paths for enhanced async graph building...'));
    const { validatedRoot, validatedBlacklist } = await validatePathsForGraphBuilding(root, blacklist);
    root = validatedRoot;
    blacklist = validatedBlacklist;
    console.info(chalk.green('✅ Path validation completed'));
  } catch (error) {
    perfTracker.end();
    throw new Error(`Path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Phase 1: File Discovery
  const discoveryTracker = globalPerformanceMonitor.startOperation("fileDiscovery", root);
  
  const files = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
    cwd: root,
    absolute: true,
    ignore: blacklist.map((b) => `**/${b}/**`),
  });
  
  discoveryTracker.complete();

  if (files.length === 0) {
    perfTracker.complete(0);
    return { 
      graph: { imports: [], jsx: [] }, 
      errors: [], 
      stats: { totalFiles: 0, processingTime: 0 } 
    };
  }

  // Initialize multi-phase progress
  const multiPhaseProgress = new MultiPhaseProgress([
    { name: "File Analysis", weight: 60, total: files.length },
    { name: "Graph Building", weight: 30, total: files.length },
    { name: "Optimization", weight: 10, total: 1 },
  ]);

  let currentPhaseProgress: any = null;

  if (options.showProgress !== false) {
    currentPhaseProgress = multiPhaseProgress.startPhase(0, files.length);
  }

  const graph: ProjectGraph = { imports: [], jsx: [] };
  const errors: FileOperationError[] = [];
  const stats = { totalFiles: files.length, processingTime: 0, phases: {} };
  
  const concurrency = options.concurrency ?? getConcurrencyLimit();
  const adaptiveProcessing = options.adaptiveProcessing ?? true;
  const memoryLimitMB = options.memoryLimitMB ?? 512;

  try {
    // Phase 1: File Analysis
    const analysisStartTime = performance.now();
    
    // Determine optimal processing strategy
    const shouldUseBatching = files.length > 1000 || adaptiveProcessing;
    const shouldUseWorkers = files.length > 500 && adaptiveProcessing;
    
    if (shouldUseBatching) {
      const result = await buildGraphAsyncBatched(root, blacklist, {
        concurrency,
        memoryLimitMB,
        useWorkerThreads: shouldUseWorkers,
        showProgress: false, // We handle progress here
        onProgress: (completed) => {
          currentPhaseProgress?.setProgress(completed);
          options.onProgress?.("File Analysis", completed, files.length);
        },
        onError: (error) => {
          errors.push(error);
          options.onError?.(error);
        },
      });
      
      graph.imports = result.graph.imports;
      graph.jsx = result.graph.jsx;
      errors.push(...result.errors);
    } else {
      const result = await buildGraphAsync(root, blacklist, {
        concurrency,
        onProgress: (completed) => {
          currentPhaseProgress?.setProgress(completed);
          options.onProgress?.("File Analysis", completed, files.length);
        },
        onError: (error) => {
          errors.push(error);
          options.onError?.(error);
        },
      });
      
      graph.imports = result.graph.imports;
      graph.jsx = result.graph.jsx;
      errors.push(...result.errors);
    }
    
    const analysisTime = performance.now() - analysisStartTime;
    stats.phases = { ...stats.phases, analysis: analysisTime };

    // Phase 2: Graph Building & Optimization
    if (currentPhaseProgress) {
      currentPhaseProgress.complete();
      currentPhaseProgress = multiPhaseProgress.startPhase(1, graph.imports.length + graph.jsx.length);
    }

    const optimizationStartTime = performance.now();
    
    // Deduplicate imports
    const uniqueImports = new Map();
    for (const imp of graph.imports) {
      const key = `${imp.file}:${imp.pkg}:${imp.imported}:${imp.local}`;
      if (!uniqueImports.has(key)) {
        uniqueImports.set(key, imp);
      }
    }
    graph.imports = Array.from(uniqueImports.values());
    
    currentPhaseProgress?.update(graph.imports.length);

    // Optimize JSX references
    for (let i = 0; i < graph.jsx.length; i++) {
      const jsx = graph.jsx[i];
      // Ensure importRef is correctly linked
      jsx.importRef = graph.imports.find(
        imp => imp.file === jsx.file && imp.local === jsx.importRef.local
      ) || jsx.importRef;
      
      if (i % 100 === 0) {
        currentPhaseProgress?.update(1);
      }
    }

    const optimizationTime = performance.now() - optimizationStartTime;
    stats.phases = { ...stats.phases, optimization: optimizationTime };

    // Phase 3: Final Optimization
    if (currentPhaseProgress) {
      currentPhaseProgress.complete();
      currentPhaseProgress = multiPhaseProgress.startPhase(2, 1);
    }

    // Force garbage collection to free memory
    if (global.gc && adaptiveProcessing) {
      global.gc();
    }

    currentPhaseProgress?.complete();
    multiPhaseProgress.complete();

    stats.processingTime = performance.now() - perfTracker["startTime"];
    perfTracker.complete(files.length);

    return { graph, errors, stats };
  } catch (error) {
    if (currentPhaseProgress) {
      currentPhaseProgress.stop();
    }
    
    perfTracker.error(error as Error);
    throw error;
  }
};

/**
 * Intelligent file filtering to exclude files that are unlikely to contain relevant imports/JSX
 * This reduces memory usage by avoiding unnecessary file processing
 */
function intelligentFileFilter(files: string[]): string[] {
  const filtered: string[] = [];
  const skipPatterns = [
    /\.test\.[jt]sx?$/,
    /\.spec\.[jt]sx?$/,
    /\.stories\.[jt]sx?$/,
    /\.config\.[jt]s$/,
    /\.min\.[jt]s$/,
    /\/generated\//,
    /\/coverage\//,
    /\/\.next\//,
    /\/\.cache\//,
    /\/temp\//,
    /\/tmp\//,
    /\/build\//,
    /\/dist\//,
    /\/out\//,
    /\/public\//,
    /\/assets\//,
    /\/static\//,
    /\/vendor\//,
    /\/lib\//,
    /\/libs\//,
    /\/external\//,
    /\/third-party\//,
    /\/third_party\//,
    /webpack\.config/,
    /rollup\.config/,
    /vite\.config/,
    /babel\.config/,
    /jest\.config/,
    /eslint\.config/,
    /prettier\.config/,
  ];

  for (const file of files) {
    // Skip if file matches any skip pattern
    if (skipPatterns.some(pattern => pattern.test(file))) {
      continue;
    }

    // Quick file size check - skip very large files that are likely generated
    try {
      const stats = fs.statSync(file);
      if (stats.size > 2 * 1024 * 1024) { // 2MB threshold
        continue;
      }
    } catch (error) {
      // File doesn't exist or can't be read, skip it
      continue;
    }

    // Quick content check for files that might not contain JSX
    try {
      const filename = path.basename(file);
      
      // Always include .jsx and .tsx files
      if (filename.endsWith('.jsx') || filename.endsWith('.tsx')) {
        filtered.push(file);
        continue;
      }
      
      // For .js and .ts files, do a quick check for likely JSX content
      if (filename.endsWith('.js') || filename.endsWith('.ts')) {
        // Read first 1KB to check for JSX indicators
        const fd = fs.openSync(file, 'r');
        const buffer = Buffer.alloc(1024);
        const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
        fs.closeSync(fd);
        
        const content = buffer.subarray(0, bytesRead).toString('utf8');
        
        // Check for JSX/React indicators
        const hasJSXIndicators = (
          content.includes('import') ||
          content.includes('React') ||
          content.includes('jsx') ||
          content.includes('<') ||
          content.includes('Component') ||
          content.includes('createElement') ||
          content.includes('.jsx') ||
          content.includes('.tsx')
        );
        
        if (hasJSXIndicators) {
          filtered.push(file);
        }
      }
    } catch (error) {
      // If we can't read the file, include it to be safe
      filtered.push(file);
    }
  }

  console.log(`Filtered ${files.length} files down to ${filtered.length} files for processing`);
  return filtered;
}

/**
 * Memory-optimized buildGraph that uses streaming and intelligent batching
 */
export const buildGraphMemoryOptimized = async (
  root: string,
  blacklist: string[],
  options: {
    maxMemoryMB?: number;
    batchSize?: number;
    concurrency?: number;
    onProgress?: (completed: number, total: number, phase: string) => void;
    onError?: (error: FileOperationError) => void;
    onMemoryWarning?: (stats: any) => void;
  } = {}
): Promise<{ graph: ProjectGraph; errors: FileOperationError[]; stats: any }> => {
  // Validate paths first
  try {
    console.info(chalk.blue('🔍 Validating paths for memory-optimized graph building...'));
    const { validatedRoot, validatedBlacklist } = await validatePathsForGraphBuilding(root, blacklist);
    root = validatedRoot;
    blacklist = validatedBlacklist;
    console.info(chalk.green('✅ Path validation completed'));
  } catch (error) {
    throw new Error(`Path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  const maxMemoryMB = options.maxMemoryMB || 1024;
  const memoryMonitor = new MemoryMonitor({ 
    maxMemoryMB,
    enableAutoGC: true,
    circuitBreakerEnabled: true 
  });

  // Set up memory monitoring callbacks
  memoryMonitor.setCallbacks({
    onWarning: (stats) => {
      console.warn(`Memory warning: ${stats.heapUsedMB.toFixed(2)}MB used (${stats.usage.toFixed(1)}%)`);
      options.onMemoryWarning?.(stats);
    },
    onCritical: (stats) => {
      console.warn(`Memory critical: ${stats.heapUsedMB.toFixed(2)}MB used (${stats.usage.toFixed(1)}%)`);
      memoryMonitor.forceGarbageCollection();
    },
    onEmergency: (stats) => {
      console.error(`Memory emergency: ${stats.heapUsedMB.toFixed(2)}MB used (${stats.usage.toFixed(1)}%)`);
    },
    onCircuitOpen: (stats) => {
      console.error(`Memory circuit breaker opened - pausing operations`);
    }
  });

  memoryMonitor.startMonitoring();

  try {
    // Phase 1: File Discovery with intelligent filtering
    options.onProgress?.(0, 0, 'Discovering files');
    
    const allFiles = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
      cwd: root,
      absolute: true,
      ignore: blacklist.map((b) => `**/${b}/**`),
    });

    const files = intelligentFileFilter(allFiles);
    
    if (files.length === 0) {
      return { 
        graph: { imports: [], jsx: [] }, 
        errors: [], 
        stats: { totalFiles: 0, filteredFiles: 0, processingTime: 0 } 
      };
    }

    console.log(`Processing ${files.length} files (filtered from ${allFiles.length})`);

    // Phase 2: Memory-efficient processing
    const graph: ProjectGraph = { imports: [], jsx: [] };
    const errors: FileOperationError[] = [];
    const startTime = performance.now();

    // Determine optimal batch size based on memory and file count
    const baseBatchSize = options.batchSize || Math.max(10, Math.min(files.length / 20, 100));
    let adaptiveBatchSize = baseBatchSize;

    // Create memory-efficient batcher
    const batcher = createMemoryEfficientBatcher(
      async (batch: string[]) => {
        const results: Array<{ file: string; imports: any[]; jsx: any[]; error?: FileOperationError }> = [];
        
        for (const filePath of batch) {
          // Check circuit breaker before processing each file
          if (memoryMonitor.shouldBlockOperation()) {
            console.warn(`Waiting for memory to be available...`);
            await memoryMonitor.waitForMemory(30000);
          }

          try {
            const [ast, code] = getFileAstAndCode(filePath);
            const fileImports: any[] = [];
            const fileJsx: any[] = [];

            // Process imports
            visit(ast, {
              visitImportDeclaration(p) {
                try {
                  const node = p.node;
                  const pkg = node.source.value as string;

                  node.specifiers?.forEach((spec) => {
                    let imported: string;
                    let local: string;
                    
                    try {
                      imported = getNameFromSpecifier(spec);
                      local = getSpecifierLocalName(spec);
                    } catch (error) {
                      console.warn(`Failed to extract names from import specifier in ${filePath}: ${error.message}`);
                      return;
                    }

                    // Validate that we have non-empty names
                    if (!imported || imported.trim() === '' || !local || local.trim() === '') {
                      console.warn(
                        `Skipping import with empty names in ${filePath}: imported="${imported}", local="${local}", pkg="${pkg}"`
                      );
                      return;
                    }

                    fileImports.push({
                      pkg,
                      file: filePath,
                      imported,
                      importedType: spec.type,
                      local,
                      node: p,
                    });
                  });
                } catch (error) {
                  console.warn(`Error processing import in ${filePath}:`, error);
                }
                return false;
              },
            });

            // Process JSX
            visit(ast, {
              visitJSXElement(p) {
                try {
                  const openingElement = p.node.openingElement;
                  if (openingElement.name.type !== "JSXIdentifier") return false;

                  const localName = openingElement.name.name;
                  const importRef = fileImports.find(
                    (i) => i.local === localName,
                  );
                  
                  if (!importRef) return this.traverse(p);

                  const props: Record<string, any> = {};
                  openingElement.attributes?.forEach((attr) => {
                    if (attr.type !== "JSXAttribute" || !attr.name) return;
                    props[attr.name.name as string] = attr.value
                      ? attr.value.type === "JSXExpressionContainer"
                        ? attr.value.expression
                        : attr.value
                      : b.booleanLiteral(true);
                  });

                  const componentName = getCompName(
                    importRef.local,
                    importRef.imported,
                    importRef.importedType,
                  );

                  // Validate component name before adding
                  if (!componentName || componentName.trim() === '') {
                    console.warn(
                      `Skipping JSX element with empty component name in ${filePath}: localName="${localName}", importRef.local="${importRef.local}", importRef.imported="${importRef.imported}"`
                    );
                    return false;
                  }

                  fileJsx.push({
                    file: filePath,
                    importRef,
                    componentName,
                    opener: p,
                    props,
                  });
                } catch (error) {
                  console.warn(`Error processing JSX element in ${filePath}:`, error);
                }
                return false;
              },
            });

            results.push({ file: filePath, imports: fileImports, jsx: fileJsx });
          } catch (error) {
            const fileError = new FileOperationError(
              "processFile",
              filePath,
              error as Error,
            );
            results.push({ file: filePath, imports: [], jsx: [], error: fileError });
          }
        }

        return results;
      },
      {
        maxBatchSize: adaptiveBatchSize,
        memoryLimitMB: maxMemoryMB,
        gcBetweenBatches: true,
        delayBetweenBatches: 50,
      }
    );

    // Process all files in memory-efficient batches
    let processedCount = 0;
    
    for await (const batchResults of batcher(files)) {
      for (const result of batchResults) {
        if (result.error) {
          errors.push(result.error);
          options.onError?.(result.error);
        } else {
          graph.imports.push(...result.imports);
          graph.jsx.push(...result.jsx);
        }
        
        processedCount++;
        options.onProgress?.(processedCount, files.length, 'Processing files');
      }
      
      // Adaptive batch size based on memory usage
      const memStats = memoryMonitor.getMemoryStats();
      if (memStats.usage > 80) {
        adaptiveBatchSize = Math.max(5, Math.floor(adaptiveBatchSize * 0.8));
      } else if (memStats.usage < 50) {
        adaptiveBatchSize = Math.min(baseBatchSize, Math.floor(adaptiveBatchSize * 1.2));
      }
      
      // Add delay between batches if memory is high
      if (memStats.usage > 70) {
        await memoryAwareDelay(100);
      }
    }

    const processingTime = performance.now() - startTime;

    console.log(`Graph built successfully! Processed ${processedCount} files in ${processingTime.toFixed(2)}ms`);
    console.log(`Found ${graph.imports.length} imports and ${graph.jsx.length} JSX elements`);

    return {
      graph,
      errors,
      stats: {
        totalFiles: allFiles.length,
        filteredFiles: files.length,
        processedFiles: processedCount,
        processingTime,
        memoryStats: memoryMonitor.getMemoryStats(),
      },
    };
  } finally {
    memoryMonitor.stopMonitoring();
    memoryMonitor.dispose();
  }
};

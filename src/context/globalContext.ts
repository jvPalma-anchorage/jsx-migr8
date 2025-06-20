import path from "node:path";
import { argv } from "../cli/config";

import {
  buildGraph,
  buildGraphAsync,
  buildGraphAsyncBatched,
  buildGraphMemoryOptimized,
} from "../graph/buildGraph";
import { buildGraphOptimized } from "../graph/buildGraphOptimized";
import { FileOperationError, globalMemoryMonitor, MemoryMonitor } from "../utils/fs-utils";
import type { GlobalState } from "../types";
import { getLoggers } from "../utils/logger";
import { initializeBackupManager } from "../backup/backup-manager";
import { getSecureContext, logSecurityEvent } from "../validation";
import { 
  validateRootPath, 
  validateBlacklist, 
  validateFileSystemPermissions,
  formatPathError,
  PathValidationError,
  expandHomePath,
  isPathSafeForScanning
} from "../utils/path-validation";
import chalk from "chalk";
const QUEUE_COMPONENT_SPEC_DIR = "./queue";

const state: GlobalState = {
  ROOT_PATH: "",
  TARGET_COMPONENT: undefined,
  BLACKLIST: [],
  PACKAGES: [],
  report: {},
  QUEUE_COMPONENT_SPEC_DIR,
  QUEUE_COMPONENT_SPEC: `${QUEUE_COMPONENT_SPEC_DIR}/component-spec.json`,
  compSpec: undefined,
  REPORT_GLOBAL_USAGE: `${QUEUE_COMPONENT_SPEC_DIR}/usage.json`,
  reportGlobalUsage: undefined,
  REPORT_COMPONENT_USAGES: `${QUEUE_COMPONENT_SPEC_DIR}/props-usage.json`,
  runArgs: argv,
};

export const { logger, lSuccess, lError, lInfo, lDbug, lWarning } =
  getLoggers(argv);

export const getRootPath = () => {
  try {
    // Use secure context to get validated root path
    const secureContext = getSecureContext();
    return secureContext.rootPath;
  } catch (error) {
    // Fallback to basic validation
    logSecurityEvent(
      'root-path-fallback',
      'warn',
      'Failed to get secure root path, using fallback',
      { error: error instanceof Error ? error.message : String(error) }
    );
    return path.resolve(argv.root || process.cwd());
  }
};

const getInitialFromArgs = () => {
  try {
    // Use secure context for validated configuration
    const secureContext = getSecureContext();
    return { 
      ROOT_PATH: secureContext.rootPath, 
      BLACKLIST: secureContext.blacklist 
    };
  } catch (error) {
    // Fallback to comprehensive validation
    logSecurityEvent(
      'context-init-fallback',
      'warn',
      'Failed to get secure context, using fallback initialization',
      { error: error instanceof Error ? error.message : String(error) }
    );
    
    // Get raw root path from arguments
    const rawRootPath = argv.root || process.cwd();
    
    // Comprehensive path validation
    const expandedRootPath = expandHomePath(rawRootPath);
    
    // Validate the root path
    const rootValidation = validateRootPath(expandedRootPath);
    if (!rootValidation.valid) {
      const errorMessage = formatPathError(rootValidation.error!);
      console.error(chalk.red('❌ Root path validation failed during initialization:'));
      console.error(errorMessage);
      throw new Error(`Invalid root path: ${rootValidation.error!.message}`);
    }
    
    // Check if path is safe for scanning
    if (!isPathSafeForScanning(rootValidation.resolvedPath!)) {
      const errorMessage = 'Root path is not safe for jsx-migr8 operations (system directory detected)';
      console.error(chalk.red(`❌ ${errorMessage}`));
      console.error(chalk.yellow('💡 Please choose a project directory instead of a system directory'));
      throw new Error(errorMessage);
    }
    
    // Parse and validate blacklist
    const rawBlacklist = ((argv.blacklist as string) ?? "").split(",").filter(s => s.trim().length > 0);
    const blacklistValidation = validateBlacklist(rawBlacklist, rootValidation.resolvedPath!);
    
    if (!blacklistValidation.valid) {
      console.warn(chalk.yellow('⚠️ Some blacklist entries are invalid during initialization:'));
      blacklistValidation.invalidEntries.forEach(invalid => {
        console.warn(chalk.gray(`   • "${invalid.entry}": ${invalid.reason}`));
      });
    }
    
    if (blacklistValidation.suggestedAdditions.length > 0) {
      console.info(chalk.cyan(`💡 Consider adding these directories to your blacklist: ${blacklistValidation.suggestedAdditions.join(', ')}`));
    }
    
    logSecurityEvent(
      'context-init-validated',
      'info',
      'Fallback initialization completed with validation',
      { 
        rootPath: rootValidation.resolvedPath!.substring(0, 100),
        blacklistCount: blacklistValidation.validEntries.length,
        hasInvalidEntries: blacklistValidation.invalidEntries.length > 0
      }
    );
    
    return { 
      ROOT_PATH: rootValidation.resolvedPath!, 
      BLACKLIST: blacklistValidation.validEntries 
    };
  }
};

/** Initialize once at CLI bootstrap */
export const initContext = async (): Promise<void> => {
  logSecurityEvent(
    'context-initialization',
    'info',
    'Starting secure context initialization'
  );
  
  lInfo("Init app Context");

  // Enhanced validation during context initialization
  let ROOT_PATH: string;
  let BLACKLIST: string[];
  
  try {
    const initialConfig = getInitialFromArgs();
    ROOT_PATH = initialConfig.ROOT_PATH;
    BLACKLIST = initialConfig.BLACKLIST;
    
    // Additional validation after getting initial config
    console.info(chalk.blue('🔍 Performing final validation checks...'));
    
    // Verify file system permissions
    const permissions = validateFileSystemPermissions(ROOT_PATH);
    if (!permissions.canRead) {
      console.error(chalk.red('❌ Insufficient permissions for root directory:'));
      permissions.errors.forEach(error => {
        console.error(chalk.gray(`   • ${error}`));
      });
      console.error(chalk.yellow('💡 Suggestions:'));
      permissions.suggestions.forEach(suggestion => {
        console.error(chalk.gray(`   • ${suggestion}`));
      });
      throw new Error('Cannot proceed without read permissions to root directory');
    }
    
    console.info(chalk.green(`✅ All validation checks passed`));
    console.info(chalk.gray(`   Root: ${ROOT_PATH}`));
    console.info(chalk.gray(`   Blacklist: ${BLACKLIST.length} entries`));
    
  } catch (error) {
    console.error(chalk.red('❌ Context initialization failed:'));
    if (error instanceof PathValidationError) {
      console.error(formatPathError(error));
    } else {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
    
    // Log the error and re-throw
    logSecurityEvent(
      'context-init-error',
      'error',
      'Context initialization failed',
      { error: error instanceof Error ? error.message : String(error) }
    );
    
    throw error;
  }

  state.ROOT_PATH = ROOT_PATH;
  state.BLACKLIST = BLACKLIST;

  logSecurityEvent(
    'context-paths-set',
    'info',
    'Context paths configured and validated',
    { 
      rootPath: ROOT_PATH.substring(0, 100), 
      blacklistCount: BLACKLIST.length 
    }
  );

  // Initialize backup manager with project-specific settings
  try {
    const backupRoot = path.join(ROOT_PATH, ".migr8-backups");
    initializeBackupManager(backupRoot, {
      gitIntegration: true,
      autoCleanup: true,
      verifyAfterBackup: true,
      showProgress: !argv.quiet,
    });
    lInfo("Backup system initialized");
  } catch (error) {
    lWarning("Failed to initialize backup system:", error instanceof Error ? error.message : String(error));
  }

  // Check memory and decide which build strategy to use
  const memoryStats = globalMemoryMonitor.getMemoryStats();
  const maxMemoryMB = argv.maxMemory as number;
  const enableMemoryMonitoring = argv.enableMemoryMonitoring as boolean;
  
  if (enableMemoryMonitoring && maxMemoryMB) {
    // Configure memory monitor with CLI settings
    globalMemoryMonitor.dispose(); // Clean up existing monitor
    const customMonitor = new MemoryMonitor({
      maxMemoryMB,
      enableAutoGC: true,
      circuitBreakerEnabled: true,
    });
    
    // Start monitoring
    customMonitor.startMonitoring();
    customMonitor.setCallbacks({
      onWarning: (stats) => {
        lWarning(`Memory warning: ${stats.heapUsedMB.toFixed(2)}MB used (${stats.usage.toFixed(1)}%)`);
      },
      onCritical: (stats) => {
        lWarning(`Memory critical: ${stats.heapUsedMB.toFixed(2)}MB used (${stats.usage.toFixed(1)}%)`);
      },
      onEmergency: (stats) => {
        lError(`Memory emergency: ${stats.heapUsedMB.toFixed(2)}MB used (${stats.usage.toFixed(1)}%)`);
      },
    });

    lInfo(`Memory monitoring enabled with ${maxMemoryMB}MB limit`);
  }

  // Use memory-optimized version for large codebases or when memory monitoring is enabled
  if (enableMemoryMonitoring && maxMemoryMB) {
    lInfo("Using memory-optimized graph building");
    try {
      const result = await buildGraphMemoryOptimized(state.ROOT_PATH, state.BLACKLIST, {
        maxMemoryMB,
        batchSize: argv.batchSize as number,
        concurrency: argv.concurrency as number,
        onProgress: (completed, total, phase) => {
          if (!argv.quiet) {
            lInfo(`${phase}: ${completed}/${total} (${Math.round((completed/total)*100)}%)`);
          }
        },
        onError: (error) => {
          lWarning(`File processing error: ${error.message}`);
        },
        onMemoryWarning: (stats) => {
          lWarning(`Memory pressure: ${stats.heapUsedMB.toFixed(2)}MB`);
        },
      });
      state.graph = result.graph;
      
      if (result.errors.length > 0) {
        lWarning(`Graph built with ${result.errors.length} errors`);
      } else {
        lSuccess(`Graph built successfully! Processed ${result.stats.processedFiles} files`);
      }
    } catch (error) {
      lError("Memory-optimized graph building failed, falling back to sync version");
      state.graph = buildGraph(state.ROOT_PATH, state.BLACKLIST);
    }
  } else {
    // For large codebases, use optimized graph builder
    const shouldUseOptimized = argv.optimized;
    
    if (shouldUseOptimized) {
      lInfo("🚀 Using optimized graph builder for large codebase");
      state.graph = buildGraphOptimized(state.ROOT_PATH, state.BLACKLIST);
    } else {
      // Use sync buildGraph to maintain backward compatibility
      // Add timeout protection for large codebases
      const timeoutMs = argv.graphTimeout as number || 5 * 60 * 1000; // 5 minutes default
      try {
        state.graph = buildGraph(state.ROOT_PATH, state.BLACKLIST, timeoutMs);
      } catch (error) {
        if (error instanceof Error && error.message.includes('timed out')) {
          lError(`Graph building timed out. Consider using --maxMemory with memory monitoring for large codebases.`);
          // Throw the error to let user know about the timeout
          throw error;
        }
        throw error;
      }
    }
  }
};

/**
 * Enhanced async context initialization with concurrent file processing
 */
export const initContextAsync = async (
  options: {
    useAsync?: boolean;
    useBatched?: boolean;
    concurrency?: number;
    batchSize?: number;
    memoryLimitMB?: number;
    onProgress?: (completed: number, total: number, info?: string) => void;
    onError?: (error: FileOperationError) => void;
  } = {},
): Promise<{ errors: FileOperationError[] }> => {
  lInfo("Init app Context (Async)");

  const { ROOT_PATH, BLACKLIST } = getInitialFromArgs();
  const errors: FileOperationError[] = [];

  state.ROOT_PATH = ROOT_PATH;
  state.BLACKLIST = BLACKLIST;

  // Initialize backup manager with project-specific settings
  try {
    const backupRoot = path.join(ROOT_PATH, ".migr8-backups");
    initializeBackupManager(backupRoot, {
      gitIntegration: true,
      autoCleanup: true,
      verifyAfterBackup: true,
      showProgress: !argv.quiet,
    });
    lInfo("Backup system initialized");
  } catch (error) {
    lWarning("Failed to initialize backup system:", error instanceof Error ? error.message : String(error));
  }

  // Default to async processing unless explicitly disabled
  const useAsync = options.useAsync ?? true;
  const useBatched = options.useBatched ?? false;
  
  // Check CLI arguments for memory optimization
  const maxMemoryMB = options.memoryLimitMB || (argv.maxMemory as number) || 1024;
  const enableMemoryMonitoring = argv.enableMemoryMonitoring as boolean;
  
  // Use memory-optimized version if memory monitoring is enabled or for very large codebases
  const shouldUseMemoryOptimized = enableMemoryMonitoring || useBatched;

  if (!useAsync) {
    // Fallback to sync version
    try {
      state.graph = buildGraph(state.ROOT_PATH, state.BLACKLIST);
    } catch (error) {
      const contextError = new FileOperationError(
        "initContext",
        ROOT_PATH,
        error as Error,
      );
      errors.push(contextError);
      options.onError?.(contextError);
    }
    return { errors };
  }

  // Enhanced progress callback
  const progressCallback = (
    completed: number,
    total: number,
    extra?: string | number,
  ) => {
    const percentage = Math.round((completed / total) * 100);
    const info =
      useBatched && typeof extra === "number"
        ? `Batch ${extra} - ${percentage}%`
        : `${percentage}%`;

    lInfo(`Building project graph: ${info} (${completed}/${total})`);
    options.onProgress?.(completed, total, info);
  };

  // Enhanced error callback
  const errorCallback = (error: FileOperationError) => {
    lWarning(`File processing error: ${error.message}`);
    errors.push(error);
    options.onError?.(error);
  };

  try {
    if (shouldUseMemoryOptimized) {
      lInfo("Using memory-optimized graph building");
      const result = await buildGraphMemoryOptimized(
        state.ROOT_PATH,
        state.BLACKLIST,
        {
          maxMemoryMB,
          batchSize: options.batchSize,
          concurrency: options.concurrency,
          onProgress: (completed, total, phase) => {
            progressCallback(completed, total, phase);
          },
          onError: errorCallback,
          onMemoryWarning: (stats) => {
            lWarning(`Memory pressure: ${stats.heapUsedMB.toFixed(2)}MB`);
          },
        },
      );
      state.graph = result.graph;
      errors.push(...result.errors);
    } else if (useBatched) {
      lInfo("Using batched async graph building for memory efficiency");
      const result = await buildGraphAsyncBatched(
        state.ROOT_PATH,
        state.BLACKLIST,
        {
          batchSize: options.batchSize,
          concurrency: options.concurrency,
          memoryLimitMB: maxMemoryMB,
          onProgress: progressCallback,
          onError: errorCallback,
        },
      );
      state.graph = result.graph;
      errors.push(...result.errors);
    } else {
      lInfo("Using async graph building with concurrent file processing");
      const result = await buildGraphAsync(state.ROOT_PATH, state.BLACKLIST, {
        concurrency: options.concurrency,
        onProgress: progressCallback,
        onError: errorCallback,
      });
      state.graph = result.graph;
      errors.push(...result.errors);
    }

    const totalImports = state.graph?.imports.length ?? 0;
    const totalJsx = state.graph?.jsx.length ?? 0;

    if (errors.length > 0) {
      lWarning(
        `Graph built with ${errors.length} errors. Found ${totalImports} imports and ${totalJsx} JSX elements.`,
      );
    } else {
      lSuccess(
        `Graph built successfully! Found ${totalImports} imports and ${totalJsx} JSX elements.`,
      );
    }
  } catch (error) {
    const contextError = new FileOperationError(
      "initContextAsync",
      ROOT_PATH,
      error as Error,
    );
    errors.push(contextError);
    options.onError?.(contextError);

    // Fallback to sync version as last resort
    lWarning("Async graph building failed, falling back to sync version");
    try {
      state.graph = buildGraph(state.ROOT_PATH, state.BLACKLIST);
      lInfo("Fallback to sync graph building succeeded");
    } catch (syncError) {
      const syncContextError = new FileOperationError(
        "initContextSyncFallback",
        ROOT_PATH,
        syncError as Error,
      );
      errors.push(syncContextError);
      options.onError?.(syncContextError);
      lError("Both async and sync graph building failed");
    }
  }

  return { errors };
};

/** Access anywhere */
export const getContext = (): GlobalState => {
  return state;
};

import path from "node:path";
import { argv } from "../cli/config";

import {
  buildGraph,
  buildGraphAsync,
  buildGraphAsyncBatched,
} from "../graph/buildGraph";
import { FileOperationError } from "../utils/fs-utils";
import type { GlobalState } from "../types";
import { getLoggers } from "../utils/logger";
import { initializeBackupManager } from "../backup/backup-manager";
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

export const getRootPath = () => path.resolve(argv.root || process.cwd());

const getInitialFromArgs = () => {
  const ROOT_PATH = getRootPath();
  const BLACKLIST = ((argv.blacklist as string) ?? "").split(",");

  return { ROOT_PATH, BLACKLIST };
};

/** Initialize once at CLI bootstrap */
export const initContext = async (): Promise<void> => {
  lInfo("Init app Context");

  const { ROOT_PATH, BLACKLIST } = getInitialFromArgs();

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
    lWarning("Failed to initialize backup system:", error as any);
  }

  // Use sync buildGraph to maintain backward compatibility
  // Async version can be used via initContextAsync
  state.graph = buildGraph(state.ROOT_PATH, state.BLACKLIST);
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
    lWarning("Failed to initialize backup system:", error as any);
  }

  // Default to async processing unless explicitly disabled
  const useAsync = options.useAsync ?? true;
  const useBatched = options.useBatched ?? false;

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
    if (useBatched) {
      lInfo("Using batched async graph building for memory efficiency");
      const result = await buildGraphAsyncBatched(
        state.ROOT_PATH,
        state.BLACKLIST,
        {
          batchSize: options.batchSize,
          concurrency: options.concurrency,
          memoryLimitMB: options.memoryLimitMB,
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

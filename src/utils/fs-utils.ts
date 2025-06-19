/**
 * File system utilities barrel export
 * Re-exports all file system related utilities from categorized modules
 */

// AST and code parsing
export {
  getAstFromCode,
  getFileAstAndCodeAsync,
  getFileAstAndCode,
} from "./fs/ast-operations";

// JSON operations
export {
  getJsonFile,
  getJsonFileAsync,
  writeJsonFileAsync,
} from "./fs/json-operations";

// Migration-specific utilities
export {
  getMigr8RulesFileNames,
  getMigr8RulesFileNamesAsync,
} from "./fs/migration-utils";

// Error handling
export {
  FileOperationError,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  sleep,
  isRetryableError,
} from "./fs/error-handling";

// Concurrency utilities
export {
  Semaphore,
  AsyncBatchProcessor,
  getConcurrencyLimit,
} from "./fs/concurrency-utils";

// Async file operations
export {
  readFileAsync,
  writeFileAsync,
  fileExistsAsync,
  getFileStatsAsync,
} from "./fs/async-file-operations";

// AsyncFileUtils class
export { AsyncFileUtils } from "./fs/async-file-utils";

// Re-export types for backward compatibility
export type { RetryConfig as RetryConfiguration } from "./fs/error-handling";

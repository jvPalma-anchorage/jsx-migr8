/**
 * Asynchronous file operation utilities
 * Core async file operations with retry support
 */
import { promises, constants, Stats } from "node:fs";
import { dirname } from "node:path";
import {
  FileOperationError,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  sleep,
  isRetryableError,
} from "./error-handling";

/**
 * Read file with automatic retry on failure
 */
export async function readFileAsync(
  filePath: string,
  encoding: BufferEncoding = "utf8",
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<string> {
  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await promises.readFile(filePath, encoding);
    } catch (error: any) {
      if (
        attempt === retryConfig.maxAttempts ||
        !isRetryableError(error, retryConfig.retryableErrorCodes)
      ) {
        throw new FileOperationError("read", filePath, error, attempt);
      }
      await sleep(
        retryConfig.delayMs *
          Math.pow(retryConfig.backoffMultiplier, attempt - 1),
      );
    }
  }
  throw new Error("Unexpected: should have thrown or returned");
}

/**
 * Write file with automatic directory creation and retry
 */
export async function writeFileAsync(
  filePath: string,
  data: string | Buffer,
  options?: { encoding?: BufferEncoding; mode?: number },
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<void> {
  // Ensure directory exists
  const dir = dirname(filePath);
  try {
    await promises.mkdir(dir, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") {
      throw new FileOperationError("mkdir", dir, error);
    }
  }

  // Write file with retry
  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      await promises.writeFile(filePath, data, options);
      return;
    } catch (error: any) {
      if (
        attempt === retryConfig.maxAttempts ||
        !isRetryableError(error, retryConfig.retryableErrorCodes)
      ) {
        throw new FileOperationError("write", filePath, error, attempt);
      }
      await sleep(
        retryConfig.delayMs *
          Math.pow(retryConfig.backoffMultiplier, attempt - 1),
      );
    }
  }
}

/**
 * Check if file exists
 */
export async function fileExistsAsync(filePath: string): Promise<boolean> {
  try {
    await promises.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats with retry support
 */
export async function getFileStatsAsync(
  filePath: string,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<Stats | null> {
  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await promises.stat(filePath);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null;
      }
      if (
        attempt === retryConfig.maxAttempts ||
        !isRetryableError(error, retryConfig.retryableErrorCodes)
      ) {
        throw new FileOperationError("stat", filePath, error, attempt);
      }
      await sleep(
        retryConfig.delayMs *
          Math.pow(retryConfig.backoffMultiplier, attempt - 1),
      );
    }
  }
  return null;
}

/**
 * Error handling utilities for file operations
 * Custom error classes and retry configuration
 */

/**
 * Custom error class for file operations with detailed context
 */
export class FileOperationError extends Error {
  constructor(
    public operation: string,
    public filePath: string,
    public originalError: Error,
    public retryAttempt?: number,
  ) {
    super(`${operation} failed for ${filePath}: ${originalError.message}`);
    this.name = "FileOperationError";
  }
}

/**
 * Retry configuration for file operations
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableErrorCodes: string[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 100,
  backoffMultiplier: 2,
  retryableErrorCodes: [
    "ENOENT",
    "EBUSY",
    "EMFILE",
    "ENFILE",
    "EAGAIN",
    "EACCES",
  ],
};

/**
 * Helper function to sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable based on error codes
 */
export function isRetryableError(
  error: any,
  retryableErrorCodes: string[],
): boolean {
  return error && error.code && retryableErrorCodes.includes(error.code);
}

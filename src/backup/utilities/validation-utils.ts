/**
 * Validation utilities for backup system
 * Functions for validating backup IDs, configurations, and JSON
 */

/**
 * Validate backup ID format
 */
export function isValidBackupId(backupId: string): boolean {
  // Backup IDs should follow the pattern: timestamp-component-hash
  const pattern = /^\d+-[a-zA-Z0-9\-_]+-[a-f0-9]{8}$/;
  return pattern.test(backupId);
}

/**
 * Validate backup configuration
 */
export function validateBackupConfig(config: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof config.maxBackups !== "number" || config.maxBackups < 1) {
    errors.push("maxBackups must be a positive number");
  }

  if (typeof config.maxAgeDays !== "number" || config.maxAgeDays < 1) {
    errors.push("maxAgeDays must be a positive number");
  }

  if (typeof config.concurrency !== "number" || config.concurrency < 1) {
    errors.push("concurrency must be a positive number");
  }

  if (config.concurrency > 50) {
    errors.push("concurrency should not exceed 50 for safety");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse<T>(
  jsonString: string,
  fallback?: T,
): T | undefined {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn("JSON parse error:", error);
    return fallback;
  }
}

/**
 * Input validation utilities
 * Handles validation of backup system inputs and configuration
 */
import crypto from "node:crypto";

/**
 * Validate backup ID format
 */
export const isValidBackupId = (backupId: string): boolean => {
  // Backup IDs should follow the pattern: timestamp-component-hash
  const pattern = /^\d+-[a-zA-Z0-9\-_]+-[a-f0-9]{8}$/;
  return pattern.test(backupId);
};

/**
 * Validate backup configuration
 */
export const validateBackupConfig = (
  config: any,
): { valid: boolean; errors: string[] } => {
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
};

/**
 * Sanitize backup name for filesystem safety
 */
export const sanitizeBackupName = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9\-_\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .substring(0, 50);
};

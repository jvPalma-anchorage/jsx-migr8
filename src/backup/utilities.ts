/**
 * Backup utilities barrel export
 * Re-exports all utility functions from categorized modules
 */

// Snapshot operations
export {
  createBackupSnapshot,
  restoreFromSnapshot,
  verifyBackupIntegrity,
} from "./utilities/snapshot-operations";

// Backup management
export {
  listAvailableBackups,
  getBackupDetails,
  findBackups,
  getBackupStatistics,
  cleanupOldBackups,
} from "./utilities/backup-management";

// Import/Export
export {
  exportBackup,
  importBackup,
  compareBackups,
} from "./utilities/import-export";

// Formatting utilities
export {
  formatDuration,
  generateBackupReport,
  estimateBackupDuration,
} from "./utilities/formatting";

// Path utilities
export {
  encodeFilePath,
  decodeFilePath,
  sanitizeBackupName,
  isSafePath,
  ensureBackupDirectory,
} from "./utilities/path-utils";

// Cryptographic utilities
export {
  calculateChecksum,
  calculateFileChecksum,
  generateBackupId,
  generateTempFileName,
} from "./utilities/crypto-utils";

// File utilities
export {
  isSameFile,
  getFileExtension,
  isTextFile,
  formatFileSize,
} from "./utilities/file-utils";

// Validation utilities
export {
  isValidBackupId,
  validateBackupConfig,
  safeJsonParse,
} from "./utilities/validation-utils";

// Re-export types for convenience
export type { BackupMode } from "./types";

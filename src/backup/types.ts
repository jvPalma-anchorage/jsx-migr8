/**
 * Comprehensive type definitions for jsx-migr8 backup/rollback system
 */
import { ComponentSpec } from "@/types";

// ============================================================================
// CORE BACKUP TYPES
// ============================================================================

/**
 * Unique identifier for backup snapshots
 * Format: {timestamp}-{migration-id}
 */
export type BackupId = string;

/**
 * Migration context information
 */
export interface MigrationContext {
  /** Migration rule file used */
  migrationRuleFile: string;
  /** Component spec being migrated */
  componentSpec: ComponentSpec;
  /** Source package being migrated from */
  sourcePackage: string;
  /** Target package being migrated to */
  targetPackage: string;
  /** Component name being migrated */
  componentName: string;
  /** CLI arguments used for migration */
  cliArgs: Record<string, any>;
  /** Migration timestamp */
  timestamp: Date;
  /** User who initiated migration */
  user: string;
  /** Migration mode (dry-run, yolo, interactive) */
  mode: "dry-run" | "yolo" | "interactive";
}

/**
 * File backup information
 */
export interface BackedUpFile {
  /** Original absolute file path */
  originalPath: string;
  /** Relative path from project root */
  relativePath: string;
  /** Encoded path for safe filesystem storage */
  encodedPath: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp of original file */
  lastModified: Date;
  /** SHA-256 checksum of original content */
  checksum: string;
  /** Backup status */
  status: "backed-up" | "failed" | "skipped";
  /** Error message if backup failed */
  error?: string;
}

/**
 * Git repository state at backup time
 */
export interface GitState {
  /** Current branch name */
  branch: string;
  /** Latest commit hash */
  commitHash: string;
  /** Short commit hash (7 chars) */
  shortHash: string;
  /** Commit message */
  commitMessage: string;
  /** Author information */
  author: {
    name: string;
    email: string;
  };
  /** Working directory status */
  workingDir: {
    /** Whether there are uncommitted changes */
    hasChanges: boolean;
    /** Number of staged files */
    stagedFiles: number;
    /** Number of unstaged files */
    unstagedFiles: number;
    /** Number of untracked files */
    untrackedFiles: number;
  };
  /** Remote repository information */
  remote?: {
    name: string;
    url: string;
    /** Whether local is ahead/behind remote */
    status: "up-to-date" | "ahead" | "behind" | "diverged" | "no-remote";
    aheadBy?: number;
    behindBy?: number;
  };
}

/**
 * Comprehensive backup metadata
 */
export interface BackupMetadata {
  /** Unique backup identifier */
  id: BackupId;
  /** Human-readable backup name */
  name: string;
  /** Backup description */
  description: string;
  /** Backup creation timestamp */
  createdAt: Date;
  /** Project root path at backup time */
  projectRoot: string;
  /** Migration context */
  migration: MigrationContext;
  /** Git state at backup time */
  gitState: GitState | null;
  /** List of backed up files */
  files: BackedUpFile[];
  /** Backup statistics */
  stats: {
    /** Total number of files backed up */
    totalFiles: number;
    /** Total size of backed up files in bytes */
    totalSize: number;
    /** Number of successfully backed up files */
    successCount: number;
    /** Number of failed backup attempts */
    failedCount: number;
    /** Backup duration in milliseconds */
    durationMs: number;
  };
  /** Backup system version */
  version: string;
  /** Additional tags for categorization */
  tags: string[];
  /** Whether this backup can be automatically cleaned up */
  canAutoClean: boolean;
  /** Expiration date for automatic cleanup */
  expiresAt?: Date;
}

/**
 * File integrity verification result
 */
export interface IntegrityCheckResult {
  /** File path */
  filePath: string;
  /** Whether checksum matches */
  valid: boolean;
  /** Expected checksum */
  expectedChecksum: string;
  /** Actual checksum */
  actualChecksum?: string;
  /** Error message if verification failed */
  error?: string;
}

/**
 * Backup integrity verification results
 */
export interface BackupIntegrityResult {
  /** Backup ID */
  backupId: BackupId;
  /** Overall integrity status */
  valid: boolean;
  /** Results for each file */
  files: IntegrityCheckResult[];
  /** Summary statistics */
  summary: {
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
    errorFiles: number;
  };
  /** Verification timestamp */
  verifiedAt: Date;
}

// ============================================================================
// ROLLBACK TYPES
// ============================================================================

/**
 * Rollback operation context
 */
export interface RollbackContext {
  /** Backup being restored */
  backupId: BackupId;
  /** Files to be restored (empty = all files) */
  filesToRestore: string[];
  /** Whether to create a backup before rollback */
  createPreRollbackBackup: boolean;
  /** Rollback mode */
  mode: "full" | "selective" | "interactive";
  /** Whether to verify integrity before rollback */
  verifyIntegrity: boolean;
  /** User performing rollback */
  user: string;
  /** Rollback timestamp */
  timestamp: Date;
}

/**
 * File restoration result
 */
export interface FileRestoreResult {
  /** File path being restored */
  filePath: string;
  /** Restoration status */
  status: "restored" | "failed" | "skipped" | "conflict";
  /** Error message if restoration failed */
  error?: string;
  /** Conflict information if file conflicts detected */
  conflict?: FileConflict;
}

/**
 * File conflict information
 */
export interface FileConflict {
  /** Current file checksum */
  currentChecksum: string;
  /** Backup file checksum */
  backupChecksum: string;
  /** Expected checksum (from when backup was created) */
  expectedChecksum: string;
  /** Conflict type */
  type:
    | "modified-since-backup"
    | "missing-current"
    | "missing-backup"
    | "checksum-mismatch";
  /** Suggested resolution */
  resolution: "overwrite" | "skip" | "merge" | "rename";
}

/**
 * Complete rollback operation result
 */
export interface RollbackResult {
  /** Rollback context */
  context: RollbackContext;
  /** Overall rollback status */
  status: "success" | "partial" | "failed";
  /** Results for each file */
  files: FileRestoreResult[];
  /** Pre-rollback backup ID (if created) */
  preRollbackBackupId?: BackupId;
  /** Summary statistics */
  summary: {
    totalFiles: number;
    restoredFiles: number;
    failedFiles: number;
    skippedFiles: number;
    conflictedFiles: number;
  };
  /** Rollback duration in milliseconds */
  durationMs: number;
  /** Rollback timestamp */
  completedAt: Date;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Backup system configuration
 */
export interface BackupConfig {
  /** Maximum number of backups to retain */
  maxBackups: number;
  /** Maximum age of backups in days */
  maxAgeDays: number;
  /** Maximum total size of all backups in bytes */
  maxTotalSize: number;
  /** Whether to enable automatic cleanup */
  autoCleanup: boolean;
  /** Cleanup schedule (cron-like) */
  cleanupSchedule: string;
  /** Whether to compress backup files */
  compression: boolean;
  /** Compression level (1-9) */
  compressionLevel: number;
  /** Whether to create Git commits for rollbacks */
  gitIntegration: boolean;
  /** Default backup naming pattern */
  namingPattern: string;
  /** File patterns to exclude from backups */
  excludePatterns: string[];
  /** Whether to verify integrity after backup creation */
  verifyAfterBackup: boolean;
  /** Concurrency limit for file operations */
  concurrency: number;
  /** Whether to show progress during operations */
  showProgress: boolean;
}

/**
 * Active backup registry entry
 */
export interface ActiveBackup {
  /** Backup ID */
  id: BackupId;
  /** Backup name */
  name: string;
  /** Creation timestamp */
  createdAt: Date;
  /** File count */
  fileCount: number;
  /** Total size in bytes */
  totalSize: number;
  /** Migration context summary */
  migration: {
    componentName: string;
    sourcePackage: string;
    targetPackage: string;
    mode: string;
  };
  /** Whether backup passed integrity check */
  integrityValid: boolean;
  /** Last verification timestamp */
  lastVerified?: Date;
  /** Tags */
  tags: string[];
}

// ============================================================================
// CLI TYPES
// ============================================================================

/**
 * CLI command options for backup operations
 */
export interface BackupCliOptions {
  /** Backup name override */
  name?: string;
  /** Backup description */
  description?: string;
  /** Additional tags */
  tags?: string[];
  /** Skip integrity verification */
  skipVerification?: boolean;
  /** Force backup even with warnings */
  force?: boolean;
  /** Quiet mode (minimal output) */
  quiet?: boolean;
  /** Dry run mode */
  dryRun?: boolean;
}

/**
 * CLI command options for rollback operations
 */
export interface RollbackCliOptions {
  /** Backup ID to restore */
  backupId?: BackupId;
  /** Interactive mode */
  interactive?: boolean;
  /** Files to restore (selective rollback) */
  files?: string[];
  /** Skip pre-rollback backup creation */
  skipBackup?: boolean;
  /** Skip integrity verification */
  skipVerification?: boolean;
  /** Force rollback even with conflicts */
  force?: boolean;
  /** Quiet mode */
  quiet?: boolean;
  /** Dry run mode */
  dryRun?: boolean;
}

/**
 * CLI command options for backup management
 */
export interface BackupManagementOptions {
  /** List all backups */
  list?: boolean;
  /** Show backup details */
  show?: BackupId;
  /** Verify backup integrity */
  verify?: BackupId;
  /** Clean up old backups */
  cleanup?: boolean;
  /** Delete specific backup */
  delete?: BackupId;
  /** Export backup */
  export?: {
    backupId: BackupId;
    destination: string;
  };
  /** Import backup */
  import?: {
    source: string;
    name?: string;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Base backup system error
 */
export class BackupError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>,
  ) {
    super(message);
    this.name = "BackupError";
  }
}

/**
 * File operation errors
 */
export class BackupFileError extends BackupError {
  constructor(
    message: string,
    public filePath: string,
    public operation: "read" | "write" | "copy" | "delete" | "checksum",
    public originalError?: Error,
  ) {
    super(message, "FILE_ERROR", { filePath, operation, originalError });
    this.name = "BackupFileError";
  }
}

/**
 * Integrity verification errors
 */
export class IntegrityError extends BackupError {
  constructor(
    message: string,
    public backupId: BackupId,
    public failedFiles: string[],
  ) {
    super(message, "INTEGRITY_ERROR", { backupId, failedFiles });
    this.name = "IntegrityError";
  }
}

/**
 * Rollback conflict errors
 */
export class RollbackConflictError extends BackupError {
  constructor(
    message: string,
    public conflicts: FileConflict[],
  ) {
    super(message, "ROLLBACK_CONFLICT", { conflicts });
    this.name = "RollbackConflictError";
  }
}

/**
 * Git integration errors
 */
export class GitIntegrationError extends BackupError {
  constructor(
    message: string,
    public gitCommand: string,
    public gitError?: string,
  ) {
    super(message, "GIT_ERROR", { gitCommand, gitError });
    this.name = "GitIntegrationError";
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Progress callback for long-running operations
 */
export type ProgressCallback = (
  completed: number,
  total: number,
  currentItem?: string,
) => void;

/**
 * Utility type for path encoding methods
 */
export interface PathEncodingResult {
  encoded: string;
  original: string;
  method: FilePathEncoding;
}

/**
 * File operation context for debugging and logging
 */
export interface FileOperationContext {
  operation: "backup" | "restore" | "verify" | "delete";
  timestamp: Date;
  user: string;
  backupId?: BackupId;
  sessionId?: string;
}

/**
 * Backup operation mode
 */
export type BackupMode =
  | "automatic"
  | "manual"
  | "pre-migration"
  | "post-migration";

/**
 * File encoding method for safe filesystem storage
 */
export type FilePathEncoding = "base64" | "hex" | "safe-path";

/**
 * Backup retention policy
 */
export interface RetentionPolicy {
  /** Keep daily backups for N days */
  keepDaily: number;
  /** Keep weekly backups for N weeks */
  keepWeekly: number;
  /** Keep monthly backups for N months */
  keepMonthly: number;
  /** Keep yearly backups for N years */
  keepYearly: number;
  /** Always keep tagged backups */
  keepTagged: boolean;
}

// ============================================================================
// ADDITIONAL TYPES FOR TEST COMPATIBILITY
// ============================================================================

/**
 * Context for restore operations
 */
export interface RestoreContext {
  /** Files being restored */
  files: string[];
  /** Backup being restored from */
  backupId: BackupId;
  /** User performing restore */
  user: string;
  /** Timestamp of restore operation */
  timestamp: Date;
  /** Mode of restore operation */
  mode: "full" | "selective" | "interactive";
  /** Whether to create pre-restore backup */
  createPreRollbackBackup: boolean;
  /** Whether to verify integrity */
  verifyIntegrity: boolean;
}

/**
 * Result of verification operation
 */
export interface VerificationResult {
  /** Overall verification status */
  valid: boolean;
  /** Summary of verification results */
  summary: {
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
    errorFiles: number;
  };
  /** Detailed results per file */
  files: Array<{
    filePath: string;
    valid: boolean;
    error?: string;
    checksum?: string;
    expectedChecksum?: string;
  }>;
  /** Duration of verification in milliseconds */
  durationMs: number;
}

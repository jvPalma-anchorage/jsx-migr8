/**
 * Main export file for jsx-migr8 backup system
 * Provides a unified interface for all backup functionality
 */

// Core backup system
export {
  BackupManager,
  getBackupManager,
  initializeBackupManager,
} from "./backup-manager";
import {
  BackupManager,
  getBackupManager,
  initializeBackupManager,
} from "./backup-manager";
export { SnapshotManager } from "./snapshot-manager";
export { MetadataManager } from "./metadata-manager";
export { IntegrityManager } from "./integrity-manager";
export { GitIntegration } from "./git-integration";
export { RollbackManager } from "./rollback-manager";
export { CleanupManager } from "./cleanup-manager";

// CLI interfaces
export { BackupCLI, handleBackupCLI } from "./cli/backup-commands";

// Integration with existing migration flow
export { migrateComponentsWithBackup } from "./migrator-integration";

// Type definitions
export * from "./types";

// Utility functions
export {
  createBackupSnapshot,
  restoreFromSnapshot,
  verifyBackupIntegrity,
  listAvailableBackups,
  getBackupDetails,
} from "./utilities";

/**
 * Main backup system initialization
 */
export function initializeBackupSystem(config?: {
  backupRoot?: string;
  maxBackups?: number;
  maxAgeDays?: number;
  autoCleanup?: boolean;
  gitIntegration?: boolean;
}) {
  return initializeBackupManager(config?.backupRoot, {
    maxBackups: config?.maxBackups || 50,
    maxAgeDays: config?.maxAgeDays || 30,
    maxTotalSize: 1024 * 1024 * 1024, // 1GB
    autoCleanup: config?.autoCleanup ?? true,
    cleanupSchedule: "0 2 * * *", // Daily at 2 AM
    compression: false,
    compressionLevel: 6,
    gitIntegration: config?.gitIntegration ?? true,
    namingPattern: "{timestamp}-{component}-{mode}",
    excludePatterns: [
      "node_modules/**",
      ".git/**",
      "dist/**",
      "build/**",
      "*.log",
      ".migr8-backups/**",
    ],
    verifyAfterBackup: true,
    concurrency: 10,
    showProgress: true,
  });
}

/**
 * Quick backup creation utility
 */
export async function createQuickBackup(
  files: string[],
  name?: string,
  options?: {
    description?: string;
    tags?: string[];
    skipVerification?: boolean;
  },
): Promise<string> {
  const backupManager = getBackupManager();

  return backupManager.createManualBackup(files, name, {
    name: name || `quick-backup-${Date.now()}`,
    description:
      options?.description || "Quick backup created via utility function",
    tags: options?.tags || ["quick", "manual"],
    skipVerification: options?.skipVerification || false,
  });
}

/**
 * Quick rollback utility
 */
export async function performQuickRollback(
  backupId: string,
  options?: {
    interactive?: boolean;
    force?: boolean;
    files?: string[];
  },
): Promise<void> {
  const { RollbackManager } = await import("./rollback-manager");
  const { SnapshotManager } = await import("./snapshot-manager");
  const { MetadataManager } = await import("./metadata-manager");

  const backupManager = getBackupManager();
  const snapshotManager = new SnapshotManager(
    ".migr8-backups",
    backupManager.getConfig(),
  );
  const metadataManager = new MetadataManager(".migr8-backups");
  const rollbackManager = new RollbackManager(
    snapshotManager,
    metadataManager,
    backupManager,
  );

  if (options?.interactive) {
    await rollbackManager.performInteractiveRollback(backupId);
  } else {
    const result = await rollbackManager.performRollback({
      backupId,
      filesToRestore: options?.files || [],
      createPreRollbackBackup: !options?.force,
      mode: options?.files ? "selective" : "full",
      verifyIntegrity: true,
      user: process.env.USER || "utility",
      timestamp: new Date(),
    });

    if (result.status !== "success") {
      throw new Error(
        `Rollback failed: ${result.summary.failedFiles} files failed to restore`,
      );
    }
  }
}

/**
 * Backup system health check
 */
export async function performHealthCheck(): Promise<{
  status: "healthy" | "warning" | "error";
  issues: string[];
  stats: {
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
  };
}> {
  try {
    const backupManager = getBackupManager();
    const backups = await backupManager.listBackups();
    const issues: string[] = [];

    // Check backup count
    const config = backupManager.getConfig();
    if (backups.length > config.maxBackups * 0.9) {
      issues.push("Approaching maximum backup limit");
    }

    // Check total size
    const totalSize = backups.reduce(
      (sum: number, backup: any) => sum + backup.totalSize,
      0,
    );
    if (totalSize > config.maxTotalSize * 0.9) {
      issues.push("Approaching maximum storage limit");
    }

    // Check for old backups
    const oldBackups = backups.filter((backup: any) => {
      const ageInDays =
        (Date.now() - backup.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return ageInDays > config.maxAgeDays;
    });

    if (oldBackups.length > 0) {
      issues.push(
        `${oldBackups.length} backups are older than retention policy`,
      );
    }

    // Check for corrupted backups
    const corruptedBackups = backups.filter(
      (backup: any) => !backup.integrityValid,
    );
    if (corruptedBackups.length > 0) {
      issues.push(
        `${corruptedBackups.length} backups failed integrity verification`,
      );
    }

    const dates = backups.map((b: any) => b.createdAt);
    const stats = {
      totalBackups: backups.length,
      totalSize,
      oldestBackup:
        dates.length > 0
          ? new Date(Math.min(...dates.map((d: any) => d.getTime())))
          : undefined,
      newestBackup:
        dates.length > 0
          ? new Date(Math.max(...dates.map((d: any) => d.getTime())))
          : undefined,
    };

    const status =
      issues.length === 0
        ? "healthy"
        : issues.length <= 2
          ? "warning"
          : "error";

    return { status, issues, stats };
  } catch (error) {
    return {
      status: "error",
      issues: [
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
      stats: {
        totalBackups: 0,
        totalSize: 0,
      },
    };
  }
}

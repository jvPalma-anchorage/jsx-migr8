/**
 * Core backup operation utilities
 * Provides high-level backup creation and restoration functions
 */
import { getBackupManager } from "../backup-manager";
import type { BackupId, BackupIntegrityResult } from "../types";

/**
 * Create a backup snapshot of specified files
 */
export const createBackupSnapshot = async (
  files: string[],
  options?: {
    name?: string;
    description?: string;
    tags?: string[];
    skipVerification?: boolean;
  },
): Promise<BackupId> => {
  const backupManager = getBackupManager();

  return backupManager.createManualBackup(files, options?.name, {
    name: options?.name || `snapshot-${Date.now()}`,
    description: options?.description || "Manual backup snapshot",
    tags: options?.tags || ["snapshot", "manual"],
    skipVerification: options?.skipVerification || false,
  });
};

/**
 * Restore files from a backup snapshot
 */
export const restoreFromSnapshot = async (
  backupId: BackupId,
  options?: {
    files?: string[];
    force?: boolean;
    createBackup?: boolean;
    interactive?: boolean;
  },
): Promise<{
  success: boolean;
  restoredFiles: number;
  failedFiles: number;
  message: string;
}> => {
  try {
    const { RollbackManager } = await import("../rollback-manager");
    const { SnapshotManager } = await import("../snapshot-manager");
    const { MetadataManager } = await import("../metadata-manager");

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
      const result = await rollbackManager.performInteractiveRollback(backupId);
      return {
        success: result.status === "success",
        restoredFiles: result.summary.restoredFiles,
        failedFiles: result.summary.failedFiles,
        message:
          result.status === "success"
            ? "Restore completed successfully"
            : "Restore completed with issues",
      };
    } else {
      const result = await rollbackManager.restoreSpecificFiles(
        backupId,
        options?.files || [],
        {
          force: options?.force,
          createBackup: options?.createBackup,
          verifyIntegrity: true,
        },
      );

      const restoredCount = result.filter(
        (r) => r.status === "restored",
      ).length;
      const failedCount = result.filter((r) => r.status === "failed").length;

      return {
        success: failedCount === 0,
        restoredFiles: restoredCount,
        failedFiles: failedCount,
        message:
          failedCount === 0
            ? "All files restored successfully"
            : `${failedCount} files failed to restore`,
      };
    }
  } catch (error) {
    return {
      success: false,
      restoredFiles: 0,
      failedFiles: 0,
      message: `Restore failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Verify backup integrity
 */
export const verifyBackupIntegrity = async (
  backupId: BackupId,
): Promise<BackupIntegrityResult> => {
  const backupManager = getBackupManager();
  return backupManager.verifyBackup(backupId);
};

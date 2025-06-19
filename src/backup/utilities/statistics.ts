/**
 * Statistics and reporting utilities
 * Handles backup system statistics and performance metrics
 */
import type { ActiveBackup, BackupMetadata } from "../types";

/**
 * Get backup statistics
 */
export const getBackupStatistics = async (): Promise<{
  totalBackups: number;
  totalSize: number;
  averageSize: number;
  oldestBackup?: Date;
  newestBackup?: Date;
  byMode: Record<string, number>;
  byComponent: Record<string, number>;
  byTag: Record<string, number>;
}> => {
  const { MetadataManager } = await import("../metadata-manager");
  const metadataManager = new MetadataManager(".migr8-backups");
  const baseStats = await metadataManager.getBackupStats();

  // Add tag statistics
  const backups = await metadataManager.listActiveBackups();
  const byTag: Record<string, number> = {};

  backups.forEach((backup) => {
    backup.tags.forEach((tag) => {
      byTag[tag] = (byTag[tag] || 0) + 1;
    });
  });

  return {
    ...baseStats,
    byTag,
  };
};

/**
 * List all available backups with filtering and sorting
 */
export const listAvailableBackups = async (options?: {
  sortBy?: "name" | "date" | "size";
  filterBy?: {
    component?: string;
    tags?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
  };
}): Promise<ActiveBackup[]> => {
  const { getBackupManager } = await import("../backup-manager");
  const backupManager = getBackupManager();
  let backups = await backupManager.listBackups();

  // Apply filters
  if (options?.filterBy) {
    const filter = options.filterBy;

    backups = backups.filter((backup) => {
      if (
        filter.component &&
        backup.migration.componentName !== filter.component
      ) {
        return false;
      }

      if (
        filter.tags &&
        !filter.tags.every((tag) => backup.tags.includes(tag))
      ) {
        return false;
      }

      if (filter.createdAfter && backup.createdAt < filter.createdAfter) {
        return false;
      }

      if (filter.createdBefore && backup.createdAt > filter.createdBefore) {
        return false;
      }

      return true;
    });
  }

  // Apply sorting
  if (options?.sortBy) {
    switch (options.sortBy) {
      case "name":
        backups.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "date":
        backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case "size":
        backups.sort((a, b) => b.totalSize - a.totalSize);
        break;
    }
  } else {
    // Default sort by date (newest first)
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return backups;
};

/**
 * Estimate backup duration based on file count and size
 */
export const estimateBackupDuration = (
  fileCount: number,
  totalSize: number,
): number => {
  // Rough estimation: 1MB per second for backup operations
  const sizeBasedMs = (totalSize / (1024 * 1024)) * 1000;

  // File count overhead: 50ms per file for metadata operations
  const countBasedMs = fileCount * 50;

  return Math.max(sizeBasedMs + countBasedMs, 1000); // Minimum 1 second
};

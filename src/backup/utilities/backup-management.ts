/**
 * Backup management functions
 * Functions for listing, finding, and managing backups
 */
import { getBackupManager } from "../backup-manager";
import { BackupId, BackupMetadata, BackupMode } from "../types";
import { CleanupManager } from "../cleanup-manager";

/**
 * List available backups with optional filtering
 */
export async function listAvailableBackups(options?: {
  componentName?: string;
  mode?: BackupMode;
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  sortBy?: "date" | "size" | "name";
  sortOrder?: "asc" | "desc";
}): Promise<BackupMetadata[]> {
  const backupManager = getBackupManager();

  // Get all backups
  let backups = await backupManager.listBackups();

  // Apply filters
  if (options?.componentName) {
    backups = backups.filter((b) =>
      b.migration.componentName
        .toLowerCase()
        .includes(options.componentName!.toLowerCase()),
    );
  }

  if (options?.mode) {
    backups = backups.filter((b) => b.mode === options.mode);
  }

  if (options?.tags && options.tags.length > 0) {
    backups = backups.filter((b) =>
      options.tags!.some((tag) => b.tags.includes(tag)),
    );
  }

  if (options?.startDate) {
    backups = backups.filter((b) => b.createdAt >= options.startDate!);
  }

  if (options?.endDate) {
    backups = backups.filter((b) => b.createdAt <= options.endDate!);
  }

  // Sort
  const sortMultiplier = options?.sortOrder === "desc" ? -1 : 1;

  switch (options?.sortBy) {
    case "size":
      backups.sort((a, b) => (a.totalSize - b.totalSize) * sortMultiplier);
      break;
    case "name":
      backups.sort((a, b) => a.name.localeCompare(b.name) * sortMultiplier);
      break;
    case "date":
    default:
      backups.sort(
        (a, b) =>
          (a.createdAt.getTime() - b.createdAt.getTime()) * sortMultiplier,
      );
  }

  // Apply limit
  if (options?.limit && options.limit > 0) {
    backups = backups.slice(0, options.limit);
  }

  return backups;
}

/**
 * Get detailed backup information
 */
export async function getBackupDetails(
  backupId: BackupId,
): Promise<BackupMetadata | null> {
  const backupManager = getBackupManager();
  return backupManager.getBackupInfo(backupId);
}

/**
 * Find backups matching criteria
 */
export async function findBackups(criteria: {
  componentName?: string;
  sourcePackage?: string;
  targetPackage?: string;
  dateRange?: { start: Date; end: Date };
  minSize?: number;
  maxSize?: number;
  tags?: string[];
}): Promise<BackupMetadata[]> {
  const backups = await listAvailableBackups();

  return backups.filter((backup) => {
    if (
      criteria.componentName &&
      backup.migration.componentName !== criteria.componentName
    ) {
      return false;
    }
    if (
      criteria.sourcePackage &&
      backup.migration.sourcePackage !== criteria.sourcePackage
    ) {
      return false;
    }
    if (
      criteria.targetPackage &&
      backup.migration.targetPackage !== criteria.targetPackage
    ) {
      return false;
    }
    if (
      criteria.dateRange &&
      (backup.createdAt < criteria.dateRange.start ||
        backup.createdAt > criteria.dateRange.end)
    ) {
      return false;
    }
    if (criteria.minSize && backup.totalSize < criteria.minSize) {
      return false;
    }
    if (criteria.maxSize && backup.totalSize > criteria.maxSize) {
      return false;
    }
    if (
      criteria.tags &&
      !criteria.tags.some((tag) => backup.tags.includes(tag))
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Get backup system statistics
 */
export async function getBackupStatistics(): Promise<{
  totalBackups: number;
  totalSize: number;
  averageSize: number;
  oldestBackup: Date | null;
  newestBackup: Date | null;
  byMode: Record<BackupMode, number>;
  byComponent: Record<string, number>;
}> {
  const backups = await listAvailableBackups();

  const totalSize = backups.reduce((sum, b) => sum + b.totalSize, 0);
  const averageSize = backups.length > 0 ? totalSize / backups.length : 0;

  const byMode: Record<BackupMode, number> = {
    pre_migration: 0,
    post_migration: 0,
    manual: 0,
    rollback: 0,
  };

  const byComponent: Record<string, number> = {};

  backups.forEach((backup) => {
    byMode[backup.mode]++;
    byComponent[backup.migration.componentName] =
      (byComponent[backup.migration.componentName] || 0) + 1;
  });

  const sortedByDate = backups.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return {
    totalBackups: backups.length,
    totalSize,
    averageSize,
    oldestBackup: sortedByDate.length > 0 ? sortedByDate[0].createdAt : null,
    newestBackup:
      sortedByDate.length > 0
        ? sortedByDate[sortedByDate.length - 1].createdAt
        : null,
    byMode,
    byComponent,
  };
}

/**
 * Clean up old backups based on retention policy
 */
export async function cleanupOldBackups(options?: {
  dryRun?: boolean;
  force?: boolean;
  maxAge?: number;
  maxCount?: number;
  excludeTags?: string[];
}): Promise<{
  removed: string[];
  kept: string[];
  errors: string[];
}> {
  const backupManager = getBackupManager();
  const cleanupManager = new CleanupManager(backupManager);

  const policy = {
    maxAgeDays: options?.maxAge || backupManager.getConfig().maxAgeDays,
    maxBackups: options?.maxCount || backupManager.getConfig().maxBackups,
    keepTags: options?.excludeTags || ["manual", "important"],
    dryRun: options?.dryRun || false,
  };

  const result = await cleanupManager.performCleanup(policy);

  return {
    removed: result.removedBackups.map((b) => b.id),
    kept: result.keptBackups.map((b) => b.id),
    errors: result.errors.map((e) => e.message),
  };
}

/**
 * Manages automatic cleanup and retention of backups
 * Implements configurable retention policies and cleanup strategies
 */
import fs from "node:fs";

import {
  BackupConfig,
  ActiveBackup,
  RetentionPolicy,
  BackupError,
  BackupId,
} from "./types";
import { MetadataManager } from "./metadata-manager";
import { SnapshotManager } from "./snapshot-manager";

/**
 * Manages backup cleanup and retention policies
 */
export class CleanupManager {
  constructor(
    private backupRoot: string,
    private config: BackupConfig,
    private metadataManager?: MetadataManager,
    private snapshotManager?: SnapshotManager,
  ) {
    // Initialize managers if not provided
    if (!this.metadataManager) {
      this.metadataManager = new MetadataManager(this.backupRoot);
    }
    if (!this.snapshotManager) {
      this.snapshotManager = new SnapshotManager(this.backupRoot, this.config);
    }
  }

  /**
   * Perform cleanup based on configuration
   */
  async performCleanup(): Promise<{
    deletedBackups: BackupId[];
    errors: Array<{ backupId: BackupId; error: string }>;
    summary: {
      totalBackups: number;
      deletedCount: number;
      errorCount: number;
      spaceSaved: number;
    };
  }> {
    const startTime = Date.now();
    const deletedBackups: BackupId[] = [];
    const errors: Array<{ backupId: BackupId; error: string }> = [];
    let spaceSaved = 0;

    try {
      const backups = await this.metadataManager!.listActiveBackups();
      const candidatesForDeletion =
        await this.identifyCleanupCandidates(backups);

      console.log(
        `Found ${candidatesForDeletion.length} backups eligible for cleanup`,
      );

      for (const backup of candidatesForDeletion) {
        try {
          // Get backup size before deletion
          const stats = await this.snapshotManager!.getBackupStats(backup.id);
          spaceSaved += stats.diskUsage;

          // Delete the backup
          await this.snapshotManager!.deleteBackup(backup.id);
          await this.metadataManager!.removeFromActiveBackups(backup.id);

          deletedBackups.push(backup.id);
          console.log(`Deleted backup: ${backup.name} (${backup.id})`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.push({ backupId: backup.id, error: errorMessage });
          console.warn(`Failed to delete backup ${backup.id}: ${errorMessage}`);
        }
      }

      return {
        deletedBackups,
        errors,
        summary: {
          totalBackups: backups.length,
          deletedCount: deletedBackups.length,
          errorCount: errors.length,
          spaceSaved,
        },
      };
    } catch (error) {
      throw new BackupError("Cleanup operation failed", "CLEANUP_FAILED", {
        error,
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * Identify backups that should be deleted based on retention policies
   */
  async identifyCleanupCandidates(
    backups: ActiveBackup[],
  ): Promise<ActiveBackup[]> {
    const candidates: ActiveBackup[] = [];
    const now = new Date();

    // Apply different cleanup strategies
    const strategies = [
      this.applyAgeBasedCleanup.bind(this),
      this.applyCountBasedCleanup.bind(this),
      this.applySizeBasedCleanup.bind(this),
      this.applyTagBasedProtection.bind(this),
    ];

    let candidateSet = new Set(backups.map((b) => b.id));

    for (const strategy of strategies) {
      const strategyResult = await strategy(backups, now);

      // Intersect with current candidates (only keep backups marked by all strategies)
      candidateSet = new Set(
        strategyResult.filter((id) => candidateSet.has(id)),
      );
    }

    return backups.filter((backup) => candidateSet.has(backup.id));
  }

  /**
   * Apply age-based cleanup (delete backups older than maxAgeDays)
   */
  private async applyAgeBasedCleanup(
    backups: ActiveBackup[],
    now: Date,
  ): Promise<BackupId[]> {
    const cutoffDate = new Date(
      now.getTime() - this.config.maxAgeDays * 24 * 60 * 60 * 1000,
    );

    return backups
      .filter((backup) => {
        // Don't delete protected backups based on age alone
        if (
          backup.tags.includes("protected") ||
          backup.tags.includes("manual")
        ) {
          return false;
        }

        return backup.createdAt < cutoffDate;
      })
      .map((backup) => backup.id);
  }

  /**
   * Apply count-based cleanup (keep only maxBackups most recent)
   */
  private async applyCountBasedCleanup(
    backups: ActiveBackup[],
    now: Date,
  ): Promise<BackupId[]> {
    if (backups.length <= this.config.maxBackups) {
      return [];
    }

    // Sort by creation date (newest first)
    const sortedBackups = [...backups].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    // Separate protected and unprotected backups
    const protectedBackups = sortedBackups.filter(
      (b) => b.tags.includes("protected") || b.tags.includes("manual"),
    );
    const unprotectedBackups = sortedBackups.filter(
      (b) => !b.tags.includes("protected") && !b.tags.includes("manual"),
    );

    // Keep the most recent backups, respecting protection
    const toKeep = this.config.maxBackups;
    const protectedCount = protectedBackups.length;
    const unprotectedToKeep = Math.max(0, toKeep - protectedCount);

    if (unprotectedBackups.length <= unprotectedToKeep) {
      return [];
    }

    // Mark excess unprotected backups for deletion
    const toDelete = unprotectedBackups.slice(unprotectedToKeep);
    return toDelete.map((backup) => backup.id);
  }

  /**
   * Apply size-based cleanup (delete oldest backups if total size exceeds limit)
   */
  private async applySizeBasedCleanup(
    backups: ActiveBackup[],
    now: Date,
  ): Promise<BackupId[]> {
    const totalSize = backups.reduce(
      (sum, backup) => sum + backup.totalSize,
      0,
    );

    if (totalSize <= this.config.maxTotalSize) {
      return [];
    }

    // Sort by creation date (oldest first) for deletion priority
    const sortedBackups = [...backups]
      .filter((b) => !b.tags.includes("protected"))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const toDelete: BackupId[] = [];
    let currentSize = totalSize;

    for (const backup of sortedBackups) {
      if (currentSize <= this.config.maxTotalSize) {
        break;
      }

      toDelete.push(backup.id);
      currentSize -= backup.totalSize;
    }

    return toDelete;
  }

  /**
   * Apply tag-based protection (never delete certain tagged backups)
   */
  private async applyTagBasedProtection(
    backups: ActiveBackup[],
    now: Date,
  ): Promise<BackupId[]> {
    const protectedTags = ["protected", "manual", "milestone"];

    return backups
      .filter((backup) => {
        // If backup has any protected tags, don't delete it
        return !backup.tags.some((tag) => protectedTags.includes(tag));
      })
      .map((backup) => backup.id);
  }

  /**
   * Apply advanced retention policy (daily/weekly/monthly)
   */
  async applyRetentionPolicy(
    backups: ActiveBackup[],
    policy: RetentionPolicy,
  ): Promise<BackupId[]> {
    const now = new Date();
    const toKeep = new Set<BackupId>();

    // Always keep protected backups
    backups
      .filter(
        (b) =>
          b.tags.includes("protected") ||
          (policy.keepTagged && b.tags.length > 0),
      )
      .forEach((b) => toKeep.add(b.id));

    // Group backups by time periods
    const dailyBackups = this.groupBackupsByDay(backups);
    const weeklyBackups = this.groupBackupsByWeek(backups);
    const monthlyBackups = this.groupBackupsByMonth(backups);
    const yearlyBackups = this.groupBackupsByYear(backups);

    // Keep daily backups
    this.keepRecentBackups(dailyBackups, policy.keepDaily, now, toKeep);

    // Keep weekly backups
    this.keepRecentBackups(weeklyBackups, policy.keepWeekly * 7, now, toKeep);

    // Keep monthly backups
    this.keepRecentBackups(
      monthlyBackups,
      policy.keepMonthly * 30,
      now,
      toKeep,
    );

    // Keep yearly backups
    this.keepRecentBackups(yearlyBackups, policy.keepYearly * 365, now, toKeep);

    // Return backups not in the keep set
    return backups
      .filter((backup) => !toKeep.has(backup.id))
      .map((backup) => backup.id);
  }

  /**
   * Get cleanup recommendations without performing deletion
   */
  async getCleanupRecommendations(): Promise<{
    candidates: ActiveBackup[];
    reasoning: Array<{ backupId: BackupId; reasons: string[] }>;
    impact: {
      spaceSaved: number;
      backupsDeleted: number;
    };
  }> {
    const backups = await this.metadataManager!.listActiveBackups();
    const candidates = await this.identifyCleanupCandidates(backups);

    const reasoning: Array<{ backupId: BackupId; reasons: string[] }> = [];
    let totalSpaceSaved = 0;

    for (const candidate of candidates) {
      const reasons: string[] = [];
      const ageInDays =
        (Date.now() - candidate.createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (ageInDays > this.config.maxAgeDays) {
        reasons.push(`Older than ${this.config.maxAgeDays} days`);
      }

      if (backups.length > this.config.maxBackups) {
        reasons.push("Exceeds maximum backup count");
      }

      if (!candidate.tags.includes("protected")) {
        reasons.push("Not protected");
      }

      reasoning.push({ backupId: candidate.id, reasons });
      totalSpaceSaved += candidate.totalSize;
    }

    return {
      candidates,
      reasoning,
      impact: {
        spaceSaved: totalSpaceSaved,
        backupsDeleted: candidates.length,
      },
    };
  }

  /**
   * Schedule automatic cleanup
   */
  scheduleCleanup(): void {
    if (!this.config.autoCleanup) {
      return;
    }

    // Parse cron schedule and set up timer
    // This is a simplified implementation - in production, use a proper cron library
    const cleanupInterval = this.parseCronSchedule(this.config.cleanupSchedule);

    setInterval(async () => {
      try {
        console.log("Running scheduled backup cleanup...");
        const result = await this.performCleanup();
        console.log(
          `Cleanup completed: deleted ${result.summary.deletedCount} backups, saved ${this.formatBytes(result.summary.spaceSaved)}`,
        );
      } catch (error) {
        console.error("Scheduled cleanup failed:", error);
      }
    }, cleanupInterval);
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private groupBackupsByDay(
    backups: ActiveBackup[],
  ): Map<string, ActiveBackup[]> {
    const groups = new Map<string, ActiveBackup[]>();

    backups.forEach((backup) => {
      const day = backup.createdAt.toISOString().split("T")[0];
      if (!groups.has(day)) {
        groups.set(day, []);
      }
      groups.get(day)!.push(backup);
    });

    return groups;
  }

  private groupBackupsByWeek(
    backups: ActiveBackup[],
  ): Map<string, ActiveBackup[]> {
    const groups = new Map<string, ActiveBackup[]>();

    backups.forEach((backup) => {
      const date = backup.createdAt;
      const year = date.getFullYear();
      const week = this.getWeekNumber(date);
      const key = `${year}-W${week}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(backup);
    });

    return groups;
  }

  private groupBackupsByMonth(
    backups: ActiveBackup[],
  ): Map<string, ActiveBackup[]> {
    const groups = new Map<string, ActiveBackup[]>();

    backups.forEach((backup) => {
      const month = backup.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!groups.has(month)) {
        groups.set(month, []);
      }
      groups.get(month)!.push(backup);
    });

    return groups;
  }

  private groupBackupsByYear(
    backups: ActiveBackup[],
  ): Map<string, ActiveBackup[]> {
    const groups = new Map<string, ActiveBackup[]>();

    backups.forEach((backup) => {
      const year = backup.createdAt.getFullYear().toString();
      if (!groups.has(year)) {
        groups.set(year, []);
      }
      groups.get(year)!.push(backup);
    });

    return groups;
  }

  private keepRecentBackups(
    groupedBackups: Map<string, ActiveBackup[]>,
    keepDays: number,
    now: Date,
    toKeep: Set<BackupId>,
  ): void {
    const cutoffDate = new Date(now.getTime() - keepDays * 24 * 60 * 60 * 1000);

    for (const [period, backups] of groupedBackups) {
      // Keep the newest backup from each period within the retention window
      const periodBackups = backups
        .filter((b) => b.createdAt >= cutoffDate)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (periodBackups.length > 0) {
        toKeep.add(periodBackups[0].id);
      }
    }
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private parseCronSchedule(schedule: string): number {
    // Simplified cron parser - in production, use a proper cron library
    // Default to daily cleanup at 2 AM (every 24 hours)
    return 24 * 60 * 60 * 1000;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

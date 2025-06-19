/**
 * CLI integration utilities for backup system
 * Provides helper functions for seamless backup integration
 */
import chalk from "chalk";
import { getBackupManager } from "../backup/backup-manager";

/**
 * Get backup system status for display in main menu
 */
export async function getBackupSystemStatus(): Promise<string> {
  try {
    const backupManager = getBackupManager();
    const backups = await backupManager.listBackups();

    if (backups.length === 0) {
      return chalk.gray("No backups available");
    }

    const totalSize = backups.reduce(
      (sum, backup) => sum + backup.totalSize,
      0,
    );
    const recentBackups = backups.filter((backup) => {
      const hoursSinceCreation =
        (Date.now() - backup.createdAt.getTime()) / (1000 * 60 * 60);
      return hoursSinceCreation < 24;
    });

    return (
      chalk.blue(`${backups.length} backups (${formatBytes(totalSize)})`) +
      (recentBackups.length > 0
        ? chalk.green(` • ${recentBackups.length} recent`)
        : "")
    );
  } catch (error) {
    return chalk.red("Backup system unavailable");
  }
}

/**
 * Check if there are any recent backups that might be relevant
 */
export async function checkForRecentBackups(): Promise<boolean> {
  try {
    const backupManager = getBackupManager();
    const backups = await backupManager.listBackups();

    const recentBackups = backups.filter((backup) => {
      const hoursSinceCreation =
        (Date.now() - backup.createdAt.getTime()) / (1000 * 60 * 60);
      return hoursSinceCreation < 2; // Last 2 hours
    });

    return recentBackups.length > 0;
  } catch {
    return false;
  }
}

/**
 * Show backup availability hint in migration options
 */
export async function showBackupHint(): Promise<void> {
  const hasRecentBackups = await checkForRecentBackups();

  if (hasRecentBackups) {
    console.log(
      chalk.blue("💡 Tip: Recent backups are available for rollback if needed"),
    );
  } else {
    console.log(
      chalk.gray(
        "💡 Tip: Backups will be created automatically during migration",
      ),
    );
  }
}

/**
 * Format bytes helper function
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Progress callback for backup operations
 */
export function createProgressCallback(operation: string) {
  return (completed: number, total: number, info?: string) => {
    const percentage = Math.round((completed / total) * 100);
    const progressBar =
      "█".repeat(Math.floor(percentage / 5)) +
      "░".repeat(20 - Math.floor(percentage / 5));

    process.stdout.write(
      `\r${operation}: [${progressBar}] ${percentage}% (${completed}/${total})${info ? ` - ${info}` : ""}`,
    );

    if (completed === total) {
      console.log(""); // New line when complete
    }
  };
}

/**
 * Enhanced error handling for backup operations
 */
export function handleBackupError(error: any, operation: string): void {
  console.error(chalk.red(`❌ ${operation} failed:`));

  if (error.code === "BACKUP_NOT_FOUND") {
    console.error(chalk.yellow("   The specified backup could not be found."));
    console.error(chalk.gray("   Use --listBackups to see available backups."));
  } else if (error.code === "INSUFFICIENT_DISK_SPACE") {
    console.error(
      chalk.yellow("   Not enough disk space for backup operation."),
    );
    console.error(
      chalk.gray("   Consider cleaning up old backups with --cleanupBackups."),
    );
  } else if (error.code === "INTEGRITY_VERIFICATION_FAILED") {
    console.error(chalk.yellow("   Backup integrity verification failed."));
    console.error(chalk.gray("   The backup may be corrupted or incomplete."));
  } else {
    console.error(chalk.gray(`   ${error.message}`));
  }

  console.error(chalk.gray("\n   For more information, use the --debug flag."));
}

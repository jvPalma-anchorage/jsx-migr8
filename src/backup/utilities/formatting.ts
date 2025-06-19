/**
 * Formatting utilities for backup system
 * Functions for formatting sizes, durations, and generating reports
 */
import { getBackupStatistics } from "./backup-management";
import { formatFileSize } from "./file-utils";

/**
 * Format duration for display
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Generate backup summary report
 */
export async function generateBackupReport(): Promise<string> {
  const stats = await getBackupStatistics();
  const health = await (await import("../index")).performHealthCheck();

  const lines: string[] = [];

  lines.push("jsx-migr8 Backup System Report");
  lines.push("================================");
  lines.push("");

  lines.push(`Status: ${health.status.toUpperCase()}`);
  lines.push(`Total Backups: ${stats.totalBackups}`);
  lines.push(`Total Size: ${formatFileSize(stats.totalSize)}`);
  lines.push(`Average Size: ${formatFileSize(stats.averageSize)}`);

  if (stats.oldestBackup && stats.newestBackup) {
    lines.push(
      `Date Range: ${stats.oldestBackup.toLocaleDateString()} - ${stats.newestBackup.toLocaleDateString()}`,
    );
  }

  lines.push("");
  lines.push("Backups by Mode:");
  Object.entries(stats.byMode).forEach(([mode, count]) => {
    lines.push(`  ${mode}: ${count}`);
  });

  lines.push("");
  lines.push("Backups by Component:");
  Object.entries(stats.byComponent).forEach(([component, count]) => {
    lines.push(`  ${component}: ${count}`);
  });

  if (health.issues.length > 0) {
    lines.push("");
    lines.push("Issues:");
    health.issues.forEach((issue) => {
      lines.push(`  - ${issue}`);
    });
  }

  return lines.join("\n");
}

/**
 * Estimate backup duration based on file count and size
 */
export function estimateBackupDuration(
  fileCount: number,
  totalSize: number,
): number {
  // Rough estimation: 1MB per second for backup operations
  const sizeBasedMs = (totalSize / (1024 * 1024)) * 1000;

  // File count overhead: 50ms per file for metadata operations
  const countBasedMs = fileCount * 50;

  return Math.max(sizeBasedMs + countBasedMs, 1000); // Minimum 1 second
}

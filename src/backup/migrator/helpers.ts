/**
 * Helper functions for migration integration
 * Utility functions for extracting migration information
 */
import { MigrationMapper } from "@/migrator/types";

/**
 * Extract component name from migration mapper
 */
export function extractComponentName(migrationMapper: MigrationMapper): string {
  const firstEntry = Object.values(migrationMapper)[0];
  return firstEntry?.component || "unknown";
}

/**
 * Extract source package from migration mapper
 */
export function extractSourcePackage(migrationMapper: MigrationMapper): string {
  const firstEntry = Object.values(migrationMapper)[0];
  return firstEntry?.packageName || "unknown";
}

/**
 * Extract target package from migration mapper
 */
export function extractTargetPackage(migrationMapper: MigrationMapper): string {
  // This would be extracted from the migration spec
  // For now, return a default value
  return "@latitude-ui/core";
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

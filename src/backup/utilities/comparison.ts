/**
 * Backup comparison utilities
 * Handles comparison between different backups and their contents
 */
import { getBackupManager } from "../backup-manager";
import type { BackupId } from "../types";

/**
 * Compare two backups
 */
export const compareBackups = async (
  backupId1: BackupId,
  backupId2: BackupId,
): Promise<{
  identical: string[];
  different: string[];
  onlyInFirst: string[];
  onlyInSecond: string[];
  summary: {
    totalFiles1: number;
    totalFiles2: number;
    identicalFiles: number;
    differentFiles: number;
  };
}> => {
  const backupManager = getBackupManager();

  const [backup1, backup2] = await Promise.all([
    backupManager.getBackupInfo(backupId1),
    backupManager.getBackupInfo(backupId2),
  ]);

  if (!backup1 || !backup2) {
    throw new Error("One or both backups not found");
  }

  const files1 = new Map(
    backup1.files.map((f) => [f.relativePath, f.checksum]),
  );
  const files2 = new Map(
    backup2.files.map((f) => [f.relativePath, f.checksum]),
  );

  const identical: string[] = [];
  const different: string[] = [];
  const onlyInFirst: string[] = [];
  const onlyInSecond: string[] = [];

  // Compare files in first backup
  for (const [path, checksum1] of files1) {
    const checksum2 = files2.get(path);

    if (checksum2 === undefined) {
      onlyInFirst.push(path);
    } else if (checksum1 === checksum2) {
      identical.push(path);
    } else {
      different.push(path);
    }
  }

  // Find files only in second backup
  for (const [path] of files2) {
    if (!files1.has(path)) {
      onlyInSecond.push(path);
    }
  }

  return {
    identical,
    different,
    onlyInFirst,
    onlyInSecond,
    summary: {
      totalFiles1: backup1.files.length,
      totalFiles2: backup2.files.length,
      identicalFiles: identical.length,
      differentFiles: different.length,
    },
  };
};

/**
 * Find backups by criteria
 */
export const findBackups = async (criteria: {
  component?: string;
  sourcePackage?: string;
  targetPackage?: string;
  mode?: "dry-run" | "yolo" | "interactive";
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
}): Promise<import("../types").ActiveBackup[]> => {
  const { MetadataManager } = await import("../metadata-manager");
  const metadataManager = new MetadataManager(".migr8-backups");

  return metadataManager.findBackups({
    componentName: criteria.component,
    sourcePackage: criteria.sourcePackage,
    targetPackage: criteria.targetPackage,
    mode: criteria.mode,
    tags: criteria.tags,
    createdAfter: criteria.createdAfter,
    createdBefore: criteria.createdBefore,
  });
};

/**
 * Safe JSON parsing with error handling
 */
export const safeJsonParse = <T>(
  jsonString: string,
  fallback?: T,
): T | undefined => {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn("JSON parse error:", error);
    return fallback;
  }
};

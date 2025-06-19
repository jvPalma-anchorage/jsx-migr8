/**
 * Import/Export utilities for backups
 * Functions for exporting, importing, and comparing backups
 */
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { getBackupManager } from "../backup-manager";
import { BackupId, BackupMetadata } from "../types";

/**
 * Export backup to a portable archive
 */
export async function exportBackup(
  backupId: BackupId,
  destinationPath: string,
  options?: {
    includeMetadata?: boolean;
    compress?: boolean;
    encrypt?: boolean;
    password?: string;
  },
): Promise<{
  success: boolean;
  exportPath: string;
  size: number;
  checksum: string;
}> {
  const backupManager = getBackupManager();

  try {
    // Use backup manager's export functionality
    const result = await backupManager.exportBackup(backupId, destinationPath, {
      compress: options?.compress || true,
      includeMetadata: options?.includeMetadata !== false,
    });

    // Add checksum calculation
    const stats = await fs.promises.stat(result.path);
    const content = await fs.promises.readFile(result.path);
    const checksum = crypto.createHash("sha256").update(content).digest("hex");

    return {
      success: true,
      exportPath: result.path,
      size: stats.size,
      checksum,
    };
  } catch (error) {
    throw new Error(
      `Export failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Import backup from archive
 */
export async function importBackup(
  archivePath: string,
  options?: {
    verifyIntegrity?: boolean;
    checksum?: string;
    password?: string;
  },
): Promise<{
  success: boolean;
  backupId: BackupId;
  metadata: BackupMetadata;
}> {
  const backupManager = getBackupManager();

  try {
    // Verify checksum if provided
    if (options?.checksum) {
      const content = await fs.promises.readFile(archivePath);
      const actualChecksum = crypto
        .createHash("sha256")
        .update(content)
        .digest("hex");

      if (actualChecksum !== options.checksum) {
        throw new Error("Checksum verification failed");
      }
    }

    // Import using backup manager
    const result = await backupManager.importBackup(archivePath, {
      verifyIntegrity: options?.verifyIntegrity !== false,
    });

    return {
      success: true,
      backupId: result.backupId,
      metadata: result.metadata,
    };
  } catch (error) {
    throw new Error(
      `Import failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Compare two backups
 */
export async function compareBackups(
  backupId1: BackupId,
  backupId2: BackupId,
): Promise<{
  identical: boolean;
  differences: {
    onlyInFirst: string[];
    onlyInSecond: string[];
    different: Array<{
      file: string;
      size1: number;
      size2: number;
      checksum1: string;
      checksum2: string;
    }>;
  };
  summary: {
    totalFiles1: number;
    totalFiles2: number;
    identicalFiles: number;
    differentFiles: number;
  };
}> {
  const backupManager = getBackupManager();
  const { SnapshotManager } = await import("../snapshot-manager");

  const snapshotManager = new SnapshotManager(
    ".migr8-backups",
    backupManager.getConfig(),
  );

  // Get file lists from both backups
  const files1 = await snapshotManager.listSnapshotFiles(backupId1);
  const files2 = await snapshotManager.listSnapshotFiles(backupId2);

  const fileSet1 = new Set(files1.map((f) => f.originalPath));
  const fileSet2 = new Set(files2.map((f) => f.originalPath));

  const onlyInFirst = Array.from(fileSet1).filter((f) => !fileSet2.has(f));
  const onlyInSecond = Array.from(fileSet2).filter((f) => !fileSet1.has(f));

  const commonFiles = Array.from(fileSet1).filter((f) => fileSet2.has(f));
  const different: Array<{
    file: string;
    size1: number;
    size2: number;
    checksum1: string;
    checksum2: string;
  }> = [];

  // Compare common files
  for (const file of commonFiles) {
    const file1 = files1.find((f) => f.originalPath === file)!;
    const file2 = files2.find((f) => f.originalPath === file)!;

    if (file1.checksum !== file2.checksum) {
      different.push({
        file,
        size1: file1.size,
        size2: file2.size,
        checksum1: file1.checksum,
        checksum2: file2.checksum,
      });
    }
  }

  const identical =
    onlyInFirst.length === 0 &&
    onlyInSecond.length === 0 &&
    different.length === 0;

  return {
    identical,
    differences: {
      onlyInFirst,
      onlyInSecond,
      different,
    },
    summary: {
      totalFiles1: files1.length,
      totalFiles2: files2.length,
      identicalFiles: commonFiles.length - different.length,
      differentFiles: different.length,
    },
  };
}

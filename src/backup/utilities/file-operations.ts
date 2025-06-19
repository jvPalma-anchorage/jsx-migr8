/**
 * File system operation utilities
 * Handles file safety, paths, and directory operations
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Check if path is safe for backup operations
 */
export const isSafePath = (filePath: string): boolean => {
  const normalizedPath = path.normalize(filePath);

  // Check for path traversal attempts
  if (normalizedPath.includes("..") || normalizedPath.startsWith("/")) {
    return false;
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /\/etc\//,
    /\/bin\//,
    /\/usr\/bin\//,
    /\/sys\//,
    /\/proc\//,
    /\/dev\//,
    /\/root\//,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(normalizedPath));
};

/**
 * Check if two file paths refer to the same file
 */
export const isSameFile = async (
  path1: string,
  path2: string,
): Promise<boolean> => {
  try {
    const stats1 = await fs.promises.stat(path1);
    const stats2 = await fs.promises.stat(path2);

    // Compare inode and device (Unix) or use other identifiers
    return stats1.ino === stats2.ino && stats1.dev === stats2.dev;
  } catch (error) {
    return false;
  }
};

/**
 * Create backup directory structure safely
 */
export const ensureBackupDirectory = async (
  backupRoot: string,
  backupId: string,
): Promise<string> => {
  const backupDir = path.join(backupRoot, "snapshots", backupId);
  const filesDir = path.join(backupDir, "files");

  await fs.promises.mkdir(filesDir, { recursive: true });

  // Create metadata directory
  const metadataDir = path.join(backupDir, "metadata");
  await fs.promises.mkdir(metadataDir, { recursive: true });

  return backupDir;
};

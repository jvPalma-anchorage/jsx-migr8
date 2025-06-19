/**
 * File utilities for backup system
 * Functions for file checks, extensions, and comparisons
 */
import path from "node:path";
import fs from "node:fs";

/**
 * Check if two file paths refer to the same file
 */
export async function isSameFile(
  path1: string,
  path2: string,
): Promise<boolean> {
  try {
    const stats1 = await fs.promises.stat(path1);
    const stats2 = await fs.promises.stat(path2);

    // Compare inode and device (Unix) or use other identifiers
    return stats1.ino === stats2.ino && stats1.dev === stats2.dev;
  } catch (error) {
    return false;
  }
}

/**
 * Get file extension safely
 */
export function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath);
  return ext.toLowerCase();
}

/**
 * Check if file is a text file based on extension
 */
export function isTextFile(filePath: string): boolean {
  const textExtensions = [
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".css",
    ".scss",
    ".less",
    ".html",
    ".htm",
    ".xml",
    ".svg",
    ".md",
    ".txt",
    ".yml",
    ".yaml",
    ".conf",
    ".config",
    ".env",
    ".gitignore",
    ".gitattributes",
  ];

  const ext = getFileExtension(filePath);
  return textExtensions.includes(ext);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

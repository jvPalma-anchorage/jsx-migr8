/**
 * Checksum calculation utilities
 * Handles file integrity verification through checksums
 */
import fs from "node:fs";
import crypto from "node:crypto";

/**
 * Calculate SHA-256 checksum for content
 */
export const calculateChecksum = (content: string): string => {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
};

/**
 * Calculate checksum for file by path
 */
export const calculateFileChecksum = async (
  filePath: string,
): Promise<string> => {
  const content = await fs.promises.readFile(filePath, "utf8");
  return calculateChecksum(content);
};

/**
 * Check if file is a text file based on extension
 */
export const isTextFile = (filePath: string): boolean => {
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
};

// Helper function for file extension
const getFileExtension = (filePath: string): string => {
  const ext = require("node:path").extname(filePath);
  return ext.toLowerCase();
};

/**
 * Cryptographic utilities for backup system
 * Functions for checksums, ID generation, and security
 */
import crypto from "node:crypto";
import fs from "node:fs";

/**
 * Calculate SHA-256 checksum for content
 */
export function calculateChecksum(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Calculate checksum for file by path
 */
export async function calculateFileChecksum(filePath: string): Promise<string> {
  const content = await fs.promises.readFile(filePath, "utf8");
  return calculateChecksum(content);
}

/**
 * Generate secure backup ID
 */
export function generateBackupId(
  componentName: string,
  timestamp?: number,
): string {
  const ts = timestamp || Date.now();
  const sanitizedComponent = componentName
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();
  const randomHash = crypto.randomBytes(4).toString("hex");

  return `${ts}-${sanitizedComponent}-${randomHash}`;
}

/**
 * Generate unique temporary file name
 */
export function generateTempFileName(baseName: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(2).toString("hex");
  return `${baseName}.tmp.${timestamp}.${random}`;
}

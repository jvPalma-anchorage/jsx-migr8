/**
 * Path utilities for backup system
 * Functions for path encoding, decoding, and safety checks
 */
import path from "node:path";
import fs from "node:fs";
import { FilePathEncoding, PathEncodingResult } from "../types";

/**
 * Encode file path for safe filesystem storage
 */
export function encodeFilePath(
  filePath: string,
  encoding: FilePathEncoding = "base64",
): PathEncodingResult {
  let encoded: string;

  switch (encoding) {
    case "base64":
      encoded = Buffer.from(filePath).toString("base64").replace(/[/+=]/g, "_");
      break;

    case "hex":
      encoded = Buffer.from(filePath).toString("hex");
      break;

    case "safe-path":
      encoded = filePath
        .replace(/[/\\]/g, "_SLASH_")
        .replace(/[<>:"|?*]/g, "_")
        .replace(/\s+/g, "_SPACE_")
        .replace(/\.+/g, "_DOT_")
        .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
        .substring(0, 200); // Limit length
      break;

    default:
      encoded = filePath;
  }

  return {
    encoded,
    original: filePath,
    method: encoding,
  };
}

/**
 * Decode file path from encoded format
 */
export function decodeFilePath(
  encodedPath: string,
  encoding: FilePathEncoding = "base64",
): string {
  switch (encoding) {
    case "base64":
      const base64 = encodedPath.replace(/_/g, "+");
      return Buffer.from(base64, "base64").toString("utf8");

    case "hex":
      return Buffer.from(encodedPath, "hex").toString("utf8");

    case "safe-path":
      return encodedPath
        .replace(/_SLASH_/g, path.sep)
        .replace(/_DOT_/g, ".")
        .replace(/_SPACE_/g, " ");

    default:
      return encodedPath;
  }
}

/**
 * Sanitize backup name for filesystem safety
 */
export function sanitizeBackupName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\-_\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .substring(0, 50);
}

/**
 * Check if path is safe for backup operations
 */
export function isSafePath(filePath: string): boolean {
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
}

/**
 * Create backup directory structure safely
 */
export async function ensureBackupDirectory(
  backupRoot: string,
  backupId: string,
): Promise<string> {
  const backupDir = path.join(backupRoot, "snapshots", backupId);
  const filesDir = path.join(backupDir, "files");

  await fs.promises.mkdir(filesDir, { recursive: true });

  // Create metadata directory
  const metadataDir = path.join(backupDir, "metadata");
  await fs.promises.mkdir(metadataDir, { recursive: true });

  return backupDir;
}

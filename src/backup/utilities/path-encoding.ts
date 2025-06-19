/**
 * Path encoding and validation utilities
 * Handles safe filesystem storage of file paths
 */
import path from "node:path";
import type { FilePathEncoding, PathEncodingResult } from "../types";

/**
 * Encode file path for safe filesystem storage
 */
export const encodeFilePath = (
  filePath: string,
  encoding: FilePathEncoding = "base64",
): PathEncodingResult => {
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
};

/**
 * Decode file path from encoded format
 */
export const decodeFilePath = (
  encodedPath: string,
  encoding: FilePathEncoding = "base64",
): string => {
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
};

/**
 * Get file extension safely
 */
export const getFileExtension = (filePath: string): string => {
  const ext = path.extname(filePath);
  return ext.toLowerCase();
};

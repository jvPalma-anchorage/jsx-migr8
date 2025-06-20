import { readFileSync } from "node:fs";
import { sep } from "node:path";
import { types as T } from "recast";
import type { ComponentUsage, FileUsage, PathNode } from "../types";
import { getAstFromCode } from "./fs-utils";

/** Recursively creates objects mirroring the file path and sets the payload */
export const setInPath = (
  root: PathNode<FileUsage>,
  relPath: string,
  compUsage: ComponentUsage,
) => {
  const segments = relPath.split(sep);
  const cursorState = { value: root as PathNode<FileUsage> };

  segments.forEach((seg, idx) => {
    if (idx === segments.length - 1) {
      // last segment is the filename
      cursorState.value[seg] =
        cursorState.value[seg] || ([] as ComponentUsage[]);
      (cursorState.value[seg] as ComponentUsage[]).push(compUsage);
    } else {
      cursorState.value[seg] = cursorState.value[seg] || {};
      cursorState.value = cursorState.value[seg] as PathNode<FileUsage>;
    }
  });
};

/**
 * Read file and parse into AST synchronously
 * Uses enhanced error handling from fs-utils
 * @param filePath - Path to the file to read and parse
 * @returns Tuple of [AST, source code]
 * @throws {FileOperationError} When file reading or parsing fails
 */
export const getFileCode = (filePath: string): [T.ASTNode, string] => {
  try {
    const origCode = readFileSync(filePath, "utf8");
    const ast = getAstFromCode(origCode, filePath);
    return [ast, origCode];
  } catch (error) {
    // Re-throw enhanced errors from getAstFromCode or create new error for file read issues
    if (error instanceof Error && error.name === "FileOperationError") {
      throw error;
    }
    // This would be a file system error from readFileSync
    const { FileOperationError } = require("./fs-utils");
    throw new FileOperationError("readFileSync", filePath, error as Error);
  }
};

export const getCompName = (
  local: string,
  imported: string | undefined,
  type: string | undefined,
) => {
  // Validate inputs - return local if any are empty/invalid
  if (!local || local.trim() === '') {
    console.warn(`getCompName: Invalid local name provided: "${local}"`);
    return local || 'UnknownComponent';
  }
  
  if (!imported && !type) {
    return local;
  }
  
  if (type && type === "ImportDefaultSpecifier") {
    return local;
  }
  
  // For named imports, prefer imported name but fallback to local
  // Ensure we don't return empty strings
  const result = imported || local;
  if (!result || result.trim() === '') {
    console.warn(`getCompName: Empty result for imported="${imported}", local="${local}", type="${type}"`);
    return local || 'UnknownComponent';
  }
  
  return result;
};

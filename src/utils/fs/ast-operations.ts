/**
 * AST and code parsing utilities
 * Functions for parsing TypeScript/JavaScript code into AST
 */
import { readFileSync, promises } from "node:fs";
import { types as T, parse } from "recast";
import { default as babelParser } from "recast/parsers/babel-ts";
import { FileOperationError } from "./error-handling";

/**
 * Parse code string into AST using Babel parser
 * @param code - The source code string to parse
 * @param filePath - Optional file path for better error context
 * @throws {FileOperationError} When parsing fails
 */
export const getAstFromCode = (code: string, filePath?: string): T.ASTNode => {
  try {
    return parse(code, { parser: babelParser });
  } catch (error) {
    throw new FileOperationError(
      "parseAST",
      filePath ?? "<inline-code>",
      error as Error
    );
  }
};

/**
 * Read file and parse into AST asynchronously
 * @param absPath - Absolute path to the file
 * @returns Promise resolving to [AST, source code]
 * @throws {FileOperationError} When file reading or parsing fails
 */
export const getFileAstAndCodeAsync = async (
  absPath: string,
): Promise<[T.ASTNode, string]> => {
  try {
    const origCode = await promises.readFile(absPath, "utf8");
    const ast = getAstFromCode(origCode, absPath);
    return [ast, origCode];
  } catch (error) {
    if (error instanceof FileOperationError) {
      throw error; // Re-throw AST parsing errors as-is
    }
    throw new FileOperationError(
      "readFileAndParse",
      absPath,
      error as Error
    );
  }
};

/**
 * Read file and parse into AST synchronously
 * @param filePath - Path to the file
 * @returns Tuple of [AST, source code]
 * @throws {FileOperationError} When file reading or parsing fails
 */
export const getFileAstAndCode = (filePath: string): [T.ASTNode, string] => {
  try {
    const origCode = readFileSync(filePath, "utf8");
    const ast = getAstFromCode(origCode, filePath);
    return [ast, origCode];
  } catch (error) {
    if (error instanceof FileOperationError) {
      throw error; // Re-throw AST parsing errors as-is
    }
    throw new FileOperationError(
      "readFileAndParseSync",
      filePath,
      error as Error
    );
  }
};

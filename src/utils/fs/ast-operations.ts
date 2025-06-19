/**
 * AST and code parsing utilities
 * Functions for parsing TypeScript/JavaScript code into AST
 */
import { readFileSync, promises } from "node:fs";
import { types as T, parse } from "recast";
import { default as babelParser } from "recast/parsers/babel-ts";

/**
 * Parse code string into AST using Babel parser
 */
export const getAstFromCode = (code: string) =>
  parse(code, { parser: babelParser });

/**
 * Read file and parse into AST asynchronously
 */
export const getFileAstAndCodeAsync = async (
  absPath: string,
): Promise<[T.ASTNode, string]> => {
  const origCode = await promises.readFile(absPath, "utf8");
  return [getAstFromCode(origCode), origCode];
};

/**
 * Read file and parse into AST synchronously
 */
export const getFileAstAndCode = (filePath: string): [T.ASTNode, string] => {
  const origCode = readFileSync(filePath, "utf8");
  return [getAstFromCode(origCode), origCode];
};

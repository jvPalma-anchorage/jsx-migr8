import fs from "node:fs";

import { types as T, parse } from "recast";
import babelParser from "recast/parsers/babel-ts";

export const getMigr8RulesFileNames = () =>
  fs.readdirSync("migr8Rules").filter((e) => e.endsWith("migr8.json"));

export const getAstFromCode = (code: string) =>
  parse(code, { parser: babelParser });

export const getFileAstAndCodeAsync = async (
  absPath: string
): Promise<[T.ASTNode, string]> => {
  const origCode = await fs.promises.readFile(absPath, "utf8");
  return [getAstFromCode(origCode), origCode];
};

export const getFileAstAndCode = (filePath: string): [T.ASTNode, string] => {
  const origCode = fs.readFileSync(filePath, "utf8");

  return [getAstFromCode(origCode), origCode];
};

export const getJsonFile = <T>(filePath: string) => {
  let json = undefined;
  try {
    json = JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch (_e) {
    json = undefined;
  }
  return json;
};

import fs from "node:fs";
import path from "node:path";
import { types as T, parse } from "recast";
import babelParser from "recast/parsers/babel-ts";
import type { ComponentUsage, FileUsage, PathNode } from "../types";

/** Recursively creates objects mirroring the file path and sets the payload */
export function setInPath(
  root: PathNode<FileUsage>,
  relPath: string,
  compUsage: ComponentUsage
) {
  const segments = relPath.split(path.sep);
  let cursor: PathNode<FileUsage> = root;

  segments.forEach((seg, idx) => {
    if (idx === segments.length - 1) {
      // last segment is the filename
      cursor[seg] = cursor[seg] || ([] as ComponentUsage[]);
      (cursor[seg] as ComponentUsage[]).push(compUsage);
    } else {
      cursor[seg] = cursor[seg] || {};
      cursor = cursor[seg] as PathNode<FileUsage>;
    }
  });
}

export const getFileCode = (filePath: string): [T.ASTNode, string] => {
  const origCode = fs.readFileSync(filePath, "utf8");
  const ast = parse(origCode, { parser: babelParser }) as T.ASTNode;

  return [ast, origCode];
};

export const getCompName = (
  local: string,
  imported: string | undefined,
  type: string | undefined
) => {
  if (!imported && !type) {
    return local;
  }
  if (type && type === "default") {
    return local;
  }
  return imported || local;
};

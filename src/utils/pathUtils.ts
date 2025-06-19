import { readFileSync } from "node:fs";
import { sep } from "node:path";
import { types as T, parse } from "recast";
import { default as babelParser } from "recast/parsers/babel-ts";
import type { ComponentUsage, FileUsage, PathNode } from "../types";

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

export const getFileCode = (filePath: string): [T.ASTNode, string] => {
  const origCode = readFileSync(filePath, "utf8");
  const ast = parse(origCode, { parser: babelParser }) as T.ASTNode;

  return [ast, origCode];
};

export const getCompName = (
  local: string,
  imported: string | undefined,
  type: string | undefined,
) => {
  if (!imported && !type) {
    return local;
  }
  if (type && type === "ImportDefaultSpecifier") {
    return local;
  }
  return imported || local;
};

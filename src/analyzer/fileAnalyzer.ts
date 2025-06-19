import { types as T, visit } from "recast";
import { getContext } from "../context/globalContext";
import { getFileCode } from "../utils/pathUtils";
import { analyzeImportDeclaration } from "./imports";
import { analyzeJSXElement } from "./jsxUsage";

/** Analyse a single file: imports + JSX usage */
export const analyzeFile = (absPath: string) => {
  const [ast] = getFileCode(absPath);

  visit(ast, {
    visitImportDeclaration(path) {
      analyzeImportDeclaration(path, absPath);
      this.traverse(path);
    },
    visitJSXElement(path) {
      analyzeJSXElement(path, absPath);
      this.traverse(path);
    },
  });
};

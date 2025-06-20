import { types as T, visit } from "recast";
import { getContext, lError, lWarning } from "../context/globalContext";
import { getFileCode } from "../utils/pathUtils";
import { analyzeImportDeclaration } from "./imports";
import { analyzeJSXElement } from "./jsxUsage";
import { FileOperationError } from "../utils/fs-utils";

/**
 * Analyse a single file: imports + JSX usage
 * @param absPath - Absolute path to the file to analyze
 * @returns true if analysis succeeded, false if it failed
 */
export const analyzeFile = (absPath: string): boolean => {
  try {
    const [ast] = getFileCode(absPath);

    visit(ast, {
      visitImportDeclaration(path) {
        try {
          analyzeImportDeclaration(path, absPath);
        } catch (error) {
          lWarning(`Failed to analyze import in ${absPath}:`, error as any);
        }
        this.traverse(path);
      },
      visitJSXElement(path) {
        try {
          analyzeJSXElement(path, absPath);
        } catch (error) {
          lWarning(`Failed to analyze JSX element in ${absPath}:`, error as any);
        }
        this.traverse(path);
      },
    });

    return true;
  } catch (error) {
    if (error instanceof FileOperationError) {
      lError(`File analysis failed for ${absPath}: ${error.message}`);
    } else {
      lError(`Unexpected error analyzing ${absPath}:`, error as any);
    }
    return false;
  }
};

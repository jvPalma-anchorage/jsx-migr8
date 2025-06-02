import { types as T, visit } from "recast";
import { getContext } from "../context/globalContext";
import { getFileCode } from "../utils/pathUtils";
import { analyzeImportDeclaration } from "./imports";
import { analyzeJSXElement } from "./jsxUsage";

/** Analyse a single file: imports + JSX usage */
export function analyzeFile(absPath: string) {
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
}

export const loadImportASTNodes = () => {
  const { reportComponentUsages, PACKAGES } = getContext();
  if (!reportComponentUsages) {
    return;
  }

  PACKAGES.forEach((pkgName) => {
    Object.keys(reportComponentUsages[pkgName]).forEach((compName) => {
      reportComponentUsages[pkgName][compName]!.forEach(
        ({ impObj }, implmIndx) => {
          const [ast] = getFileCode(impObj.filePath);
          visit(ast, {
            visitImportDeclaration(path) {
              const decl = path.node;
              if (!T.namedTypes.Literal.check(decl.source)) return false;
              const src = decl.source.value as string;
              if (src !== pkgName) return false;

              reportComponentUsages[pkgName][compName]![
                implmIndx
              ].impObj.astImportPath = path;
              return false; // Stop visiting after finding the import declaration
            },
          });
        }
      );
    });
  });
};

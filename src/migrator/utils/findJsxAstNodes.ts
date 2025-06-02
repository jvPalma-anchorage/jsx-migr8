import { print, visit } from "recast";

import chalk from "chalk";
import { analyzeJSXElement } from "../../analyzer/jsxUsage";
import { ComponentUsage } from "../../types";
import { getFileCode } from "../../utils/pathUtils";
import { MigrationMapper } from "../types";

export const findJsxAstNodes = (
  pkgName: string,
  compName: string,
  compUsage: Pick<ComponentUsage, "props" | "impObj" | "originalProps">,
  migrationMapper: MigrationMapper
) => {
  const filePath = compUsage.impObj.filePath;
  const [ast, oldCode] = getFileCode(filePath);

  if (!migrationMapper[filePath]?.codeCompare) {
    migrationMapper[filePath].codeCompare = {
      ast,
      old: oldCode,
      new: print(ast).code,
    };
  }

  // * we already have all the [imports] AST nodes in the ComponentUsage.impObj
  // * so we can skip the import scanning here

  // * find all [JSX elements] AST nodes with the given component name
  // * and then check if they match the rules
  visit(ast, {
    visitJSXElement(p) {
      const element = analyzeJSXElement(p, filePath, [
        pkgName,
        compUsage.impObj,
      ]);

      if (
        element &&
        !migrationMapper[filePath].elements.some((e) => e.id === element.id)
      ) {
        migrationMapper[filePath].elements.push(element);
      }

      this.traverse(p);
    },
  });

  if (migrationMapper[filePath].elements.length === 0) {
    console.info(
      chalk.yellowBright(
        `\n\tNo JSX elements found for ${compName} in ${pkgName} at ${filePath}`
      )
    );
    return;
  }
};

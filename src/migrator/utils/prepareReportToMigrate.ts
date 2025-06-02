import { filterWhiteListedProps } from "../../report/utils/props";
import { ComponentPropsSummary, ComponentUsage } from "../../types";
import { sortNumberDesc } from "../../utils/sorters";
import { MigrationMapper } from "../types";
import { findJsxAstNodes } from "../utils/findJsxAstNodes";

export const prepareReportToMigrate = (
  pkgs: string[],
  report: ComponentPropsSummary
) => {
  const migrationMapper: MigrationMapper = {};

  let componentsSortedByNumberOfProps: {
    numberOfProps: number;
    pkgName: string;
    compName: string;
    compUsage: ComponentUsage;
  }[] = [];

  /**
   * *(1) - create file data (pkg, compName, importNode, jsxElements with correspondent compName)
   * *(2) - for every jsxElements
   *      *(2.1) - create `originalProps` from `props`
   *      *(2.2) - filter whileListed props from `props`
   *      *(2.3) - create `numberOfProps` to then sort them DESC
   */
  pkgs.forEach((pkgName) => {
    Object.keys(report[pkgName]).forEach((compName) => {
      report[pkgName][compName]!.forEach((compUsage) => {
        const props = filterWhiteListedProps(compUsage.props || {});

        migrationMapper[compUsage.impObj.filePath] = {
          pkg: pkgName,
          compName: compUsage.local!,
          importNode: compUsage.impObj,
          elements: [],
        };

        componentsSortedByNumberOfProps.push({
          numberOfProps: Object.keys(props).length,
          pkgName,
          compName,
          compUsage: {
            ...compUsage,
            props, // only keep whitelisted props
            originalProps: compUsage.props,
          },
        });
      });
    });
  });

  /**
   * * inside each file, sort the JSXElements by `numberOfProps` DESC
   * * onde sorted, set the AST node to use it for the migration
   */
  componentsSortedByNumberOfProps
    .sort(sortNumberDesc<{ numberOfProps: number }>("numberOfProps"))
    .forEach(({ pkgName, compName, compUsage }) => {
      findJsxAstNodes(pkgName, compName, compUsage, migrationMapper);
    });

  return migrationMapper;
};

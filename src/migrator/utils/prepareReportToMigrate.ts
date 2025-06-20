import { getContext } from "@/context";
import { JsxUsage } from "@/graph/types";
import { Migr8Spec } from "@/report";
import { filterWhiteListedProps } from "@/report/utils";
import { ComponentPropsSummary, ComponentUsage } from "@/types";
import { getFileAstAndCode } from "@/utils/fs-utils";
import { getCompName } from "@/utils/pathUtils";
import { sortNumberDesc } from "@/utils/sorters";
import { MigrationMapper } from "../types";

export const prepareReportToMigrate = (
  migr8Spec: Migr8Spec,
  summary: ComponentPropsSummary,
) => {
  const { graph } = getContext();

  if (!graph) {
    throw new Error(
      "Graph is not available. Please ensure it is built before calling this function.",
    );
  }
  const migrationMapper: MigrationMapper = {};

  let componentsSortedByNumberOfProps: {
    numberOfProps: number;
    file: string;
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
  const { packages, components } = migr8Spec.lookup;
  packages.forEach((pkgName) => {
    Object.keys(summary[pkgName]).forEach((compName) => {
      if (!components.includes(compName)) return;
      summary[pkgName][compName]!.forEach((compUsage) => {
        const props = filterWhiteListedProps(compUsage.props || {});
        const fileAbsPath = compUsage.impObj.file;

        const validName = getCompName(
          compUsage.impObj.local,
          compUsage.impObj.imported,
          compUsage.impObj.importedType,
        );

        migrationMapper[fileAbsPath] = {
          packageName: pkgName,
          component: validName,
          importNode: compUsage.impObj,
          elements: [],
          codeCompare: {
            ast: undefined,
            old: "",
          },
        };

        componentsSortedByNumberOfProps.push({
          numberOfProps: Object.keys(props).length,
          file: fileAbsPath,
          pkgName: migrationMapper[fileAbsPath].packageName,
          compName: migrationMapper[fileAbsPath].component,
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
    .forEach(({ file, compName }) => {
      // Always reload AST from file system to ensure clean state for each migration run
      const [fileAST, _oldCode] = getFileAstAndCode(file);
      migrationMapper[file].codeCompare = {
        ast: fileAST,
        // old: "replace src/migrator/utils/prepareReportToMigrate.ts:82",
        old: _oldCode,
      };

      const elements: JsxUsage[] = [];

      graph.jsx.forEach((e) => {
        if (e.file === file && e.componentName === compName) {
          elements.push(e);
        }
      });

      migrationMapper[file].elements = elements;
    });

  return migrationMapper;
};

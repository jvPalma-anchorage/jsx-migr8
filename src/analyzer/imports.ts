import chalk from "chalk";
import { print } from "recast";
import { getContext, lWarning } from "../context/globalContext";
import { ImportDetails, ImportPath, ImportSpecifierDetails } from "../types";
import { getSpecifierLocalName, getSpecifierImportedName, isImportSpecifier } from "../types/ast";

export const getImportDetails = (
  path: ImportPath,
  filePath: string,
): null | ImportDetails => {
  try {
    const { PACKAGES, TARGET_COMPONENT } = getContext();
    const impNode = path.node;
    const packageName = impNode.source.value as string;

    if (!PACKAGES.some((e) => e === packageName)) return null;

    const initialSpecifiersList: ImportSpecifierDetails[] = [];

  return {
    node: impNode,
    packageName,
    specifiers:
      impNode.specifiers?.reduce((acc, spec) => {
        const { type, local } = spec;
        const localName = getSpecifierLocalName(spec);

        // * not the component we are looking for
        if (!localName || localName !== TARGET_COMPONENT) {
          return acc;
        }

        const importedName: ImportSpecifierDetails["importedName"] =
          type === "ImportSpecifier" && isImportSpecifier(spec)
            ? getSpecifierImportedName(spec)
            : type === "ImportDefaultSpecifier"
              ? "default"
              : undefined;
        const importType: ImportSpecifierDetails["importType"] =
          type === "ImportSpecifier"
            ? "named"
            : type === "ImportDefaultSpecifier"
              ? "default"
              : undefined;

        if (!importType) {
          lWarning(`Import type unhandled in ${filePath}:`, type);
        }

        try {
          const importStm = print(impNode)
            .code.replaceAll(",\n}", " }")
            .replaceAll("\n  ", " ");
          
          acc.push({
            filePath,
            type,
            importType,
            importStm,
            localName, // local
            importedName, // name
            astImportPath: path,
          });
        } catch (error) {
          lWarning(`Failed to process import specifier in ${filePath}:`, error as any);
        }
        return acc;
      }, initialSpecifiersList) || initialSpecifiersList,
    };
  } catch (error) {
    lWarning(`Failed to get import details for ${filePath}:`, error as any);
    return null;
  }
};

export const checkIfJsxInImportsReport = (
  jsxFilePath: string,
): [string, ImportSpecifierDetails] | undefined => {
  const { PACKAGES, report } = getContext();

  const pkgNameFound = { value: "" };
  const pkg = PACKAGES.reduce<ImportSpecifierDetails | undefined>(
    (prev, pkgName) => {
      if (prev) return prev; // if we already found the package, skip

      return report[pkgName]._imports?.find(({ filePath }) => {
        // 👈 SAME FILE ONLY
        // if the import is from the same file, we can skip it
        if (filePath !== jsxFilePath) {
          return false;
        }

        pkgNameFound.value = pkgName;
        return true;

        // if (localName === jsxLocalName || importedName === jsxImportedName) {
        //   return true;
        // }

        // return false;
      });
    },
    undefined,
  );

  if (!pkg) return;

  return [pkgNameFound.value, pkg];
};

export const analyzeImportDeclaration = (
  path: ImportPath,
  filePath: string,
) => {
  try {
    const { report } = getContext();

    const importDetails = getImportDetails(path, filePath);

    if (!importDetails) {
      return;
    }

    importDetails.specifiers.forEach((specDetails) => {
      try {
        if (!!report[importDetails.packageName]._imports) {
          report[importDetails.packageName]._imports!.push(specDetails);
        } else {
          report[importDetails.packageName]._imports = [specDetails];
        }
      } catch (error) {
        lWarning(`Failed to add import specifier to report for ${filePath}:`, error as any);
      }
    });
  } catch (error) {
    lWarning(`Failed to analyze import declaration in ${filePath}:`, error as any);
  }
};

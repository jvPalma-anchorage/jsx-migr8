import chalk from "chalk";
import { print } from "recast";
import { getContext } from "../context/globalContext";
import { ImportDetails, ImportPath, ImportSpecifierDetails } from "../types";

export const getImportDetails = (
  path: ImportPath,
  filePath: string,
): null | ImportDetails => {
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
        const localName = (local as any).name as string;

        // * not the component we are looking for
        if (!localName || localName !== TARGET_COMPONENT) {
          return acc;
        }

        const importedName: ImportSpecifierDetails["importedName"] =
          type === "ImportSpecifier"
            ? (spec.imported as any).name
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
          console.warn(chalk.yellow("\t\t Import type unhandled: "), type);
        }

        acc.push({
          filePath,
          type,
          importType,
          importStm: print(impNode)
            .code.replaceAll(",\n}", " }")
            .replaceAll("\n  ", " "),
          localName, // local
          importedName, // name
          astImportPath: path,
        });
        return acc;
      }, initialSpecifiersList) || initialSpecifiersList,
  };
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
  const { report } = getContext();

  const importDetails = getImportDetails(path, filePath);

  if (!importDetails) {
    return;
  }

  importDetails.specifiers.forEach((specDetails) => {
    if (!!report[importDetails.packageName]._imports) {
      report[importDetails.packageName]._imports!.push(specDetails);
    } else {
      report[importDetails.packageName]._imports = [specDetails];
    }
  });
};

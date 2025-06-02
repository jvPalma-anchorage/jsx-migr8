import type { NodePath } from "ast-types/lib/node-path";
import { types } from "recast";
import { argv } from "../cli/config";

// ** ---------- RECAST MAPPED TYPES ------------------------------ */
export type { NodePath };
export type ImportSpecifier = types.namedTypes.ImportSpecifier;
export type ImportDeclaration = types.namedTypes.ImportDeclaration;
export type ImportPath = NodePath<ImportDeclaration>;

export type JSXAttribute = types.namedTypes.JSXAttribute;
export type JSXElement = types.namedTypes.JSXElement;
export type JSXIdentifier = types.namedTypes.JSXIdentifier;
export type JSXPath = NodePath<JSXElement>;
// ** ---------- RECAST MAPPED TYPES ------------------------------ */
// ** ------------------------------------------------------------- */
// ** ------------------------------------------------------------- */
// ** ---------- GENERIC TYPES ------------------------------------ */

export type Pretify<T> = {
  [K in keyof T]: T[K];
} & {};

export type ComponentData<T> = {
  [componentName: string]: Pretify<T>;
};

export type PathNode<T> = {
  [folderOrFile: string]: Pretify<PathNode<T>> | Pretify<T>;
};

export type PkgCompDefinition<T> = {
  [packageName: string]: Pretify<ComponentData<T>>;
};

export type PkgPathCompDefinition<T> = {
  [packageName: string]: Pretify<
    { _imports?: ImportSpecifierDetails[] } & PathNode<T>
  >;
};
// ** ---------- GENERIC TYPES ------------------------------------ */
// ** ------------------------------------------------------------- */
// ** ------------------------------------------------------------- */
// export type ImportStm = {
//   importStm: string;
//   name: string;
//   local: string | undefined;
//   specifiers: ImportDeclaration["specifiers"];
//   filePath: string;
//   source: ImportDeclaration["source"]["value"];
// };

export type ImportDetails = {
  node: ImportDeclaration;
  packageName: string;
  specifiers: ImportSpecifierDetails[];
};

export type ImportSpecifierDetails = {
  filePath: string;
  type: NonNullable<ImportDeclaration["specifiers"]>[number]["type"];
  importType: "named" | "default" | undefined;
  importStm: string;
  localName: string;
  importedName: string | undefined;
  astImportPath: ImportPath;
};

export type ComponentUsage = {
  /** original component name in the package */
  name: string;
  filePath: string;
  /** local alias (if renamed), e.g. `{ CompName as OtherName }`; undefined if none */
  local?: string;
  /** gathered props key -> value */
  props: Record<string, string>;
  originalProps: Record<string, string>;
  impObj: ImportSpecifierDetails;
};

export type FileUsage = ComponentUsage[];

export type GlobalReport = PkgPathCompDefinition<FileUsage>;

export type ComponentSpec = {
  old: {
    oldImportPath: string[];
    compName: string;
  };
  new: {
    newImportPath: string;
    importType: string;
    compName: string;
  };
};

type PropSummary = {
  [propName: string]: {
    values: Record<string, number>; // value  -> times used
    files: Record<string, number>; // file   -> times used
  };
};
export type ComponentPropsSummary = PkgCompDefinition<ComponentUsage[]>;

export type GlobalState = {
  ROOT_PATH: string;
  TARGET_COMPONENT?: string;
  BLACKLIST: string[];
  PACKAGES: string[];
  report: GlobalReport;
  QUEUE_COMPONENT_SPEC_DIR: string;
  QUEUE_COMPONENT_SPEC: string;
  compSpec: ComponentSpec | undefined;
  REPORT_GLOBAL_USAGE: string;
  reportGlobalUsage: GlobalReport | undefined;
  REPORT_COMPONENT_USAGES: string;
  reportComponentUsages: ComponentPropsSummary | undefined;
  runArgs: typeof argv;
};

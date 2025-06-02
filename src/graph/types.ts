import { namedTypes as n } from "ast-types";
import type { NodePath } from "ast-types/lib/node-path";

export type ImportUsage = {
  pkg: string; // '@anchorage/common/dist/components'
  file: string; // absolute path
  imported: string; // 'Text' | 'default'
  importedType: string; // 'ImportSpecifier' | 'ImportDefaultSpecifier' | 'UNKNOWN'
  local: string; // alias used in the file
  node: NodePath<n.ImportDeclaration>;
};

export type JsxUsage = {
  file: string;
  importRef: ImportUsage; // back-pointer, *not* duplicate data
  componentName: string;
  opener: NodePath<n.JSXElement>;
  /** real AST nodes – never strings */
  props: Record<string, NodePath>;
};

export type ProjectGraph = {
  imports: ImportUsage[];
  jsx: JsxUsage[];
};

import { types } from "recast";

/**
 * AST type definitions for type-safe access to node properties
 */

export interface ASTIdentifier {
  type: "Identifier";
  name: string;
}

export interface ASTImportSpecifier {
  type: "ImportSpecifier";
  local: ASTIdentifier;
  imported: ASTIdentifier;
}

export interface ASTImportDefaultSpecifier {
  type: "ImportDefaultSpecifier";
  local: ASTIdentifier;
}

export interface ASTImportNamespaceSpecifier {
  type: "ImportNamespaceSpecifier";
  local: ASTIdentifier;
}

export type ASTImportSpecifierUnion = 
  | ASTImportSpecifier 
  | ASTImportDefaultSpecifier 
  | ASTImportNamespaceSpecifier;

export interface ASTProgram {
  type: "Program";
  body: any[];
}

export interface ASTFile {
  program: ASTProgram;
}

/**
 * Type guards for AST nodes
 */
export function isIdentifier(node: any): node is ASTIdentifier {
  return node && node.type === "Identifier" && typeof node.name === "string";
}

export function isImportSpecifier(node: any): node is ASTImportSpecifier {
  return node && node.type === "ImportSpecifier" && 
         isIdentifier(node.local) && isIdentifier(node.imported);
}

export function isImportDefaultSpecifier(node: any): node is ASTImportDefaultSpecifier {
  return node && node.type === "ImportDefaultSpecifier" && isIdentifier(node.local);
}

export function isImportNamespaceSpecifier(node: any): node is ASTImportNamespaceSpecifier {
  return node && node.type === "ImportNamespaceSpecifier" && isIdentifier(node.local);
}

/**
 * Utility functions for safe property access
 */
export function getSpecifierLocalName(spec: types.namedTypes.ImportSpecifier | types.namedTypes.ImportDefaultSpecifier | types.namedTypes.ImportNamespaceSpecifier): string {
  if (isIdentifier(spec.local)) {
    return spec.local.name;
  }
  throw new Error(`Invalid specifier local: ${JSON.stringify(spec.local)}`);
}

export function getSpecifierImportedName(spec: types.namedTypes.ImportSpecifier): string {
  if (isImportSpecifier(spec) && isIdentifier(spec.imported)) {
    return spec.imported.name;
  }
  throw new Error(`Invalid specifier imported: ${JSON.stringify(spec)}`);
}

export function getNameFromSpecifier(spec: any): string {
  if (spec.type === "ImportSpecifier" && isIdentifier(spec.imported)) {
    return spec.imported.name;
  }
  if ((spec.type === "ImportDefaultSpecifier" || spec.type === "ImportNamespaceSpecifier") && isIdentifier(spec.local)) {
    return spec.local.name;
  }
  throw new Error(`Cannot extract name from specifier: ${JSON.stringify(spec)}`);
}
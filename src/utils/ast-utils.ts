/**
 * AST utility functions for safe cloning and manipulation
 */

import { types as T } from "recast";

/**
 * Deep clone an AST node to prevent mutations during preview mode
 * This uses a more robust approach than JSON.stringify for AST nodes
 */
export function deepCloneAST(node: any): any {
  if (node === null || typeof node !== 'object') {
    return node;
  }
  
  if (Array.isArray(node)) {
    return node.map(deepCloneAST);
  }
  
  // Handle special AST node properties
  const cloned: any = {};
  
  for (const key in node) {
    if (node.hasOwnProperty(key)) {
      // Skip certain recast internal properties that shouldn't be cloned
      if (key === '__clone' || key === '__original' || key === 'parent') {
        continue;
      }
      
      cloned[key] = deepCloneAST(node[key]);
    }
  }
  
  return cloned;
}

/**
 * Safe clone that preserves AST node references when needed
 * but creates a deep copy for transformation purposes
 */
export function safeCloneASTForTransformation(ast: T.ASTNode): T.ASTNode {
  return deepCloneAST(ast);
}

/**
 * Create a working copy of migration data for preview mode
 */
export function createWorkingCopyForPreview<T extends { codeCompare?: { ast?: T.ASTNode } }>(
  migrationData: T
): T {
  if (!migrationData.codeCompare?.ast) {
    return migrationData;
  }
  
  return {
    ...migrationData,
    codeCompare: {
      ...migrationData.codeCompare,
      ast: safeCloneASTForTransformation(migrationData.codeCompare.ast)
    }
  } as T;
}
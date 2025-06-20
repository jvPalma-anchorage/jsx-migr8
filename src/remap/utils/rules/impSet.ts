/* ------------------------------------------------------------------------- */
/*  Single-pass migrate + dry-run diff                                       */
/* ------------------------------------------------------------------------- */
import { types as T, visit } from "recast";
import { ASTFile } from "../../../types/ast";

/* ---------- load remap rules (your generator returns the full map) -------- */

export const impSet = (ast: T.ASTNode, compName: string, newImport: string) => {
  let targetFound = false;
  visit(ast, {
    visitImportDeclaration(pp) {
      if (
        pp.node.source.value === newImport &&
        pp.node.specifiers?.some((s) => s.type === "ImportSpecifier")
      )
        targetFound = true;
      return false;
    },
  });
  if (!targetFound) {
    const b = T.builders;
    // create a new import declaration for the component
    const spec = b.importSpecifier(b.identifier(compName));
    // Adding the import declaration to the beginning of the program body
    const decl = b.importDeclaration([spec], b.stringLiteral(newImport));

    const program = (ast as ASTFile).program;
    if (program && program.body) {
      program.body.unshift(decl);
    }
  }
};

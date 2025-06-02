import { types as T, print, visit } from "recast";
import { MigrationMapper } from "../../../migrator";

export const impRemove = (
  ast: T.ASTNode,
  migrationObj: MigrationMapper[string],
) => {
  const toPrune: string[] = [];
  const lookupPkg = migrationObj.pkg;

  let counter = 0;
  visit(ast, {
    visitImportDeclaration(pp) {
      counter++;

      const decl = pp.node;
      if (!T.namedTypes.Literal.check(decl.source)) return false;
      const src = decl.source.value as string;

      if (src !== lookupPkg) return false;

      // 1. drop current specifier
      decl.specifiers = decl.specifiers?.filter(
        (sp) =>
          !(
            sp.type === "ImportSpecifier" &&
            (sp.imported as any).name === migrationObj.importNode.localName
          ),
      );

      // 2. if spec list empty remove whole import
      if (!decl.specifiers?.length) {
        toPrune.push(print(pp.node).code);
        return false;
      }

      this.traverse(pp);
    },
  });

  return toPrune.join("");
};

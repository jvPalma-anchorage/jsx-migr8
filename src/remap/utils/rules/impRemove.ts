import { types as T, print, visit } from "recast";
import { MigrationMapper } from "../../../migrator/types";

export const impRemove = (
  ast: T.ASTNode,
  migrationObj: MigrationMapper[string],
) => {
  const toPrune: string[] = [];
  const lookupPkg = migrationObj.pkg;

  const { localName, importedName, importType } = migrationObj.importNode;

  const compLookupName = importType === "default" ? importedName : localName;

  let counter = 0;
  visit(ast, {
    visitImportDeclaration(pp) {
      counter++;

      const decl = pp.node;
      if (!T.namedTypes.Literal.check(decl.source)) return false;
      const src = decl.source.value as string;

      if (src !== lookupPkg) return false;

      // 1. drop current specifier
      decl.specifiers = decl.specifiers?.filter((sp) => {
        const specLocName = (sp as any).local.name as string;

        if (sp.type === "ImportSpecifier" && importType === "named") {
          // console.log("==========================", {
          //   //* specImpName: 'Text',
          //   specImpName: (sp.imported as any).name,
          //   //? specLocName: 'Text',
          //   specLocName,
          //   //* localName: 'Text',
          //   localName,
          //   //? importedName: 'Text',
          //   importedName,
          //   //? importType: 'named'
          //   importType,
          // });
          return (sp.imported as any).name !== compLookupName;
        }
        if (sp.type === "ImportDefaultSpecifier" && importType === "default") {
          // console.log("==========================", {
          //*   // specLocName: 'Text',
          //   specLocName,
          //*   // localName: 'Text',
          //   localName,
          //?   // importedName: 'default',
          //   importedName,
          //?   // importType: 'default'
          //   importType,
          // });
          return specLocName !== localName;
        }
        return true;
      });

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

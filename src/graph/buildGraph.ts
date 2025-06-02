import { getFileAstAndCode } from "@/utils/fs-utils";
import { getCompName } from "@/utils/pathUtils";
import { builders as b, visit } from "ast-types";
import fg from "fast-glob";
import { ProjectGraph } from "./types";

export function buildGraph(root: string, blacklist: string[]): ProjectGraph {
  const files = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
    cwd: root,
    absolute: true,
    ignore: blacklist.map((b) => `**/${b}/**`),
  });

  const graph: ProjectGraph = { imports: [], jsx: [] };

  for (const abs of files) {
    const [ast, code] = getFileAstAndCode(abs);

    /* Pass 1 – collect imports */
    visit(ast, {
      visitImportDeclaration(p) {
        const node = p.node;
        const pkg = node.source.value as string;

        node.specifiers?.forEach((spec) => {
          let imported = "";

          if (spec.type === "ImportSpecifier") {
            imported = (spec.imported as any).name;
          } else if (spec.type === "ImportDefaultSpecifier") {
            imported = "default";
          } else if (spec.type === "ImportNamespaceSpecifier") {
            imported = (spec.local?.loc as any)?.identifierName || "namespaced";
          } else {
            imported = "UNKNOWN";
            console.warn(
              `Unhandled import type: ${(spec as any).type} ---`,
              spec
            );
          }

          const local = (spec.local as any).name;

          graph.imports.push({
            pkg,
            file: abs,
            imported,
            importedType: spec.type,
            local,
            node: p, // keep reference
          });
        });

        return false;
      },
    });

    /* Pass 2 – collect JSX tied to those imports */
    visit(ast, {
      visitJSXElement(p) {
        const openingElement = p.node.openingElement;
        if (openingElement.name.type !== "JSXIdentifier") return false;

        const localName = openingElement.name.name;

        const importRef = graph.imports.find(
          (i) => i.file === abs && i.local === localName
        );
        if (!importRef) return this.traverse(p); // unrelated component

        const props: Record<string, any> = {};

        openingElement.attributes?.forEach((attr) => {
          if (attr.type !== "JSXAttribute" || !attr.name) return;
          props[attr.name.name as string] = attr.value
            ? attr.value.type === "JSXExpressionContainer"
              ? attr.value.expression // real AST node
              : attr.value
            : b.booleanLiteral(true); // <Comp flag />
        });

        graph.jsx.push({
          file: abs,
          importRef,
          componentName: getCompName(
            importRef.local,
            importRef.imported,
            importRef.importedType
          ),
          opener: p,
          props,
        });

        return false;
      },
    });
  }

  return graph;
}

import { parse, types, visit } from "recast";
import babelParser from "recast/parsers/babel-ts";
import { JSXAttribute, JSXElement } from "../../types";
const b = types.builders;

interface PlaceholderMaps {
  OUTER_PROPS?: JSXAttribute[];
  INNER_PROPS?: JSXAttribute[];
  CHILDREN?: JSXElement["children"];
}

/**
 * Turns a template string (ONE top-level element) into a JSXElement node,
 * replacing the placeholders:
 *   • {...OUTER_PROPS}  ─►   maps.OUTER_PROPS (array of JSXAttribute)
 *   • {...INNER_PROPS}  ─►   maps.INNER_PROPS
 *   • {CHILDREN}        ─►   maps.CHILDREN   (array of JSXChild)
 */
export function stringToJsx(
  tpl: string,
  maps: PlaceholderMaps = {},
): JSXElement {
  /* 1. parse ---------------------------------------------------------------- */
  const wrapped = `<>${tpl.replaceAll("\n\n", "\n")}</>`; // fragment wrapper
  const ast = parse(wrapped, { parser: babelParser }) as JSXElement;
  // the <>…</> node
  const fragment: JSXElement = ((ast as any).program.body[0] as any).expression;
  const children = fragment.children as any[];

  const topLevel = children.find((c) => c.type === "JSXElement");
  if (!topLevel) throw new Error("Template must contain one JSX element");

  /* 2. placeholder substitution -------------------------------------------- */
  visit(topLevel, {
    /* spread-attr placeholders */
    visitJSXSpreadAttribute(p) {
      const arg = p.node.argument;

      if (arg.type === "Identifier" && arg.name in maps) {
        const attrs = maps[arg.name as keyof PlaceholderMaps] ?? [];
        // * replace spread with concrete attrs
        p.replace(...attrs);
        return false; // stop visiting this node
      }
      return false;
    },

    /* {CHILDREN} placeholder */
    visitJSXExpressionContainer(p) {
      const expr = p.node.expression;

      if (expr.type === "Identifier" && expr.name === "CHILDREN") {
        p.replace(...(maps.CHILDREN ?? []));
        return false; // stop visiting this node
      }
      return false;
    },
  });

  return topLevel;
}

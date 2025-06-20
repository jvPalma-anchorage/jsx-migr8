import { getAstFromCode } from "@/utils/fs-utils";
import { builders as b } from "ast-types";
import { print } from "recast";
import { MigrationMapper } from "../../../migrator/types";
import { JSXAttribute, JSXElement } from "../../../types";
import { makeDiff } from "../../../utils/diff";
import { RemapRule } from "../../base-remapper";
import { newAttr } from "../jsxUtils/newAttr";
import { pickAttrs } from "../jsxUtils/pickAttrs";
import { stringToJsx } from "../stringToJsx";

export function stringToJsxElement(tpl: string): JSXElement {
  // wrap in a fragment so the parser accepts plain JSX
  const wrapped = `<>${tpl}</>`;
  const ast = getAstFromCode(wrapped);

  // program.body[0] -> ExpressionStatement -> Fragment -> children[0]
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return (ast.program.body[0] as any).expression.children[0];
}

type PropAndRule = {
  rule: Omit<RemapRule, "replaceWith"> & {
    replaceWith: NonNullable<RemapRule["replaceWith"]>;
  };
  elem: MigrationMapper[string]["elements"][number];
  compName: string;
  filePath: string;
};
export const handleReplaceWithJsx = (
  changeCode: boolean,
  { rule, elem, compName, filePath }: PropAndRule,
) => {
  const { set, remove, replaceWith } = rule;
  
  // Ensure replaceWith has the expected structure
  if (!replaceWith || typeof replaceWith !== 'object') {
    console.error(`Invalid replaceWith rule structure for ${compName} in ${filePath}`);
    return;
  }
  
  const { INNER_PROPS: INNER_PROP_KEYS_TO_MOVE, code } = replaceWith;
  
  // Validate required properties
  if (!code) {
    console.error(`Missing 'code' property in replaceWith rule for ${compName} in ${filePath}`);
    return;
  }

  const jsxElement = elem.opener.node;
  const opener = jsxElement.openingElement;

  // * REMOVE old props from the element
  const elemProps: Record<string, any> = {};
  Object.entries(elem.props).forEach(([key, _]) => {
    if (remove && (remove as string[]).includes(key)) {
      return false; // skip props that should be removed
    }
    elemProps[key] = elem.props[key];
  });

  // *
  const existingPropsAsJSXAttr = pickAttrs(opener, Object.keys(elemProps));

  const OUTER_ADD: JSXAttribute[] = [];
  const INNER_ADD: JSXAttribute[] = [];

  // * SET new props on the component
  set &&
    Object.entries(set).forEach(([key, value]) => {
      if (typeof value === "string") {
        OUTER_ADD.push(newAttr(key, b.stringLiteral(value)));
      }
      if (typeof value === "boolean") {
        OUTER_ADD.push(newAttr(key, b.booleanLiteral(value)));
      }
      if (typeof value === "number") {
        OUTER_ADD.push(newAttr(key, b.numericLiteral(value)));
      }
      if (value === null) {
        OUTER_ADD.push(newAttr(key, b.nullLiteral()));
      }
    });

  Object.keys(elemProps).forEach((key) => {
    const propAsJsxAttr = existingPropsAsJSXAttr.find(
      (propAsJsxAttr) => Object.entries(propAsJsxAttr)[0][0] === key,
    )!;

    const jsxAttr = Object.entries(propAsJsxAttr)[0][1];

    // If there is no Inner children in the `rule.replaceWith.code`
    // then there is only one element, this is the same one we are replacing
    // and there are the "rest" of the props
    if (!INNER_PROP_KEYS_TO_MOVE) {
      OUTER_ADD.push(jsxAttr);
      return;
    }

    // there IS an inner element, so we need to decide where to put the prop
    // If the prop is in INNER_PROP_KEYS_TO_MOVE, we move it to INNER_ADD
    // otherwise we keep it in OUTER_ADD
    if (INNER_PROP_KEYS_TO_MOVE.includes(key)) {
      INNER_ADD.push(jsxAttr);
    } else {
      OUTER_ADD.push(jsxAttr);
    }
  });

  const oldSnippet = print(jsxElement)
    .code.trim()
    .replace("{' '}", "")
    .replaceAll("\n\n", "\n");

  // 2. transform --------------------------------------------------------------
  const newElement = stringToJsx(code, {
    OUTER_PROPS: OUTER_ADD,
    INNER_PROPS: INNER_ADD,
    CHILDREN: jsxElement.children, // keep original children
  });

  const newSnippet = print(newElement)
    .code.trim()
    .replace("{' '}", "")
    .replaceAll("\n\n", "\n");

  //console.info(makeDiff(filePath, `${oldSnippet}\n`, `(${newSnippet})\n`, 2));

  elem.opener.replace(newElement);
};

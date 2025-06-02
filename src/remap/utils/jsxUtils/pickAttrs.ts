import { namedTypes as n } from "ast-types";
import { cloneAttr } from "./cloneAttr";

/** pull all attributes that match one of `names`  */
export const pickAttrs = (
  source: n.JSXOpeningElement,
  names: readonly string[],
): Record<string, n.JSXAttribute>[] => {
  return (
    source.attributes
      ?.filter(
        (a): a is n.JSXAttribute =>
          a.type === "JSXAttribute" && names.includes(a.name.name as string),
      )
      .map(cloneAttr) || []
  );
};

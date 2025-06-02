import { JSXAttribute, JSXElement, JSXIdentifier } from "../../../types";
import { newAttr } from "./newAttr";

/** shallow clone of a JSXAttribute (re-uses the existing value node) */
export const cloneAttr = (
  attr: NonNullable<JSXElement["children"]> | JSXAttribute,
): Record<string, JSXAttribute> => {
  const key = ((attr as JSXAttribute).name as JSXIdentifier).name;
  // keep the SAME node; that preserves literal vs expression, etc.
  const value = (attr as JSXAttribute).value ?? null;

  return { [key]: newAttr(key, value) };
};

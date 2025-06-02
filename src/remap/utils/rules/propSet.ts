import { namedTypes as n } from "ast-types";
import { types } from "recast";
import { propRemove } from "./propRemove";

export const propSet = (
  o: n.JSXOpeningElement,
  name: string,
  value: string | boolean,
  b = types.builders,
) => {
  propRemove(o, name);
  const val =
    typeof value === "string"
      ? b.stringLiteral(value)
      : b.booleanLiteral(value);

  o.attributes?.push(b.jsxAttribute(b.jsxIdentifier(name), val));
};

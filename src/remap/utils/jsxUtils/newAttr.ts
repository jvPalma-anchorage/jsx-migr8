import { builders as b, namedTypes as n } from "ast-types";

/** create a new JSXAttribute (uses the existing value node) */
export const newAttr = (key: string, value: any): n.JSXAttribute => {
  let val = value;

  if (value && value.type === "BooleanLiteral") {
    val = value.value
      ? null //  <Comp asChild />
      : b.jsxExpressionContainer(value); // ={false}
  }

  return b.jsxAttribute(
    b.jsxIdentifier(key),
    // keep the SAME node; that preserves literal vs expression, etc.
    val ?? null,
  );
};

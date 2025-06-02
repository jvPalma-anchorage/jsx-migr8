import { types as t } from "recast";

export function getPropValue(node: any): string | undefined {
  if (t.namedTypes.StringLiteral.check(node)) {
    return node.value;
  }
  if (t.namedTypes.NumericLiteral.check(node)) {
    return String(node.value);
  }
  if (t.namedTypes.BooleanLiteral.check(node)) return String(node.value); // "true"/"false"
  if (t.namedTypes.NullLiteral.check(node)) return "null";
  if (t.namedTypes.Identifier.check(node)) {
    return node.name;
  }
  if (t.namedTypes.MemberExpression.check(node)) {
    // foo.bar OR foo["bar"]
    if (!node.computed)
      return `${(node.object as any).name}.${(node.property as any).name}`;
    return `${(node.object as any).name}[${(node.property as any).name}]`;
  }
  // fallback: give node type
  return node.type;
}

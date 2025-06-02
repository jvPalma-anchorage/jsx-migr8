import { namedTypes as n } from "ast-types";

export const propRemove = (o: n.JSXOpeningElement, name: string) =>
  (o.attributes = o.attributes?.filter(
    (a) => !(a.type === "JSXAttribute" && a.name.name === name),
  ));

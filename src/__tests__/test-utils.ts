import { parse } from "recast";
import type { ASTNode } from "ast-types";
import * as babelParser from "recast/parsers/babel-ts";

export const createTestAST = (code: string): ASTNode => {
  return parse(code, {
    parser: babelParser,
  });
};

export const createMockFile = (path: string, content: string) => ({
  path,
  content,
  ast: createTestAST(content),
});

export const mockProjectContext = () => ({
  root: "/test/project",
  blacklist: ["node_modules"],
  packages: ["@company/ui-lib"],
  targetComponent: "Button",
});

export const createMockJSXElement = (
  componentName: string,
  props: Record<string, any> = {},
) => {
  const propsString = Object.entries(props)
    .map(([key, value]) => {
      if (typeof value === "boolean" && value) return key;
      if (typeof value === "boolean" && !value) return "";
      if (typeof value === "string") return `${key}="${value}"`;
      return `${key}={${JSON.stringify(value)}}`;
    })
    .filter(Boolean)
    .join(" ");

  return `<${componentName} ${propsString} />`;
};

export const createMockImport = (
  packageName: string,
  imports: Array<{ name: string; alias?: string; isDefault?: boolean }>,
) => {
  const importStatements = imports.map(({ name, alias, isDefault }) => {
    if (isDefault) return name;
    if (alias) return `${name} as ${alias}`;
    return name;
  });

  const defaultImports = imports.filter((i) => i.isDefault).map((i) => i.name);
  const namedImports = imports.filter((i) => !i.isDefault);

  let importString = "import ";
  if (defaultImports.length) {
    importString += defaultImports.join(", ");
    if (namedImports.length) importString += ", ";
  }
  if (namedImports.length) {
    importString += `{ ${namedImports.map((i) => (i.alias ? `${i.name} as ${i.alias}` : i.name)).join(", ")} }`;
  }
  importString += ` from '${packageName}';`;

  return importString;
};

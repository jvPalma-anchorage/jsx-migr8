import { ImportUsage } from "@/graph/types";
import chalk from "chalk";
import path from "node:path";
import { getContext } from "../context/globalContext";
import type { ComponentUsage, JSXPath } from "../types";
import { getPropValue } from "../utils/props";

/** Analyze one JSXElement and push data to context.report */
export const analyzeJSXElement = (
  p: JSXPath,
  fileAbsPath: string,
  isMigrating: [string, string, ImportUsage],
) => {
  const { ROOT_PATH, TARGET_COMPONENT, report } = getContext();

  // * file path -> code node
  const { node } = p;
  // *        code node -> JSX Element
  const { openingElement: jsxElem } = node;
  // *                JSX Element -> Name & attributes
  const { name, attributes } = jsxElem;

  // * if [JSX Element] is not an ReactNode, return null
  if (name.type !== "JSXIdentifier") {
    return null;
  }
  const [pkg, compName, impObj] = isMigrating;

  const localName = name.name;
  const importedName = name.name;

  // * [JSX Element] is ReactNode, but not the one we are migrating
  if (localName !== compName) {
    return null;
  }

  const componentUsage: ComponentUsage = {
    name: importedName,
    fileAbsPath,
    local: localName === importedName ? undefined : localName,
    props: {},
    originalProps: {},
    impObj,
  };

  attributes?.forEach((prop) => {
    const { type: propType } = prop;
    if (propType === "JSXAttribute" && prop.name) {
      const { name: propName, value: propValue } = prop;

      if (propValue === null) {
        componentUsage.props[`${propName.name}`] = "true";
        return; // done, go next attr
      }
      // unwrap possible expression container
      const valueNode =
        propValue?.type === "JSXExpressionContainer"
          ? propValue.expression
          : propValue;

      const value = getPropValue(valueNode);
      if (value) componentUsage.props[`${propName.name}`] = value;
    } else {
      console.warn(chalk.yellow("\t\t JSX Prop type unhandled: "), propType);
    }
  });

  const relPath = path.relative(ROOT_PATH, fileAbsPath);
  const { line, column } = node.loc!.start; // 🟢
  const uid = `${relPath}:${line}:${column}`; // 👉  e.g. "src/App.tsx:42:6"

  componentUsage.originalProps = { ...componentUsage.props };

  return {
    id: uid,
    jsxPath: p,
    jsxOpening: jsxElem,
    props: componentUsage.props,
    compUsage: componentUsage,
  };
};

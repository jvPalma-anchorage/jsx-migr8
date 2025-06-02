import chalk from "chalk";
import path from "node:path";
import { getContext } from "../context/globalContext";
import type { ComponentUsage, ImportSpecifierDetails, JSXPath } from "../types";
import { setInPath } from "../utils/pathUtils";
import { getPropValue } from "../utils/props";
import { checkIfJsxInImportsReport } from "./imports";

/** Analyze one JSXElement and push data to context.report */
export function analyzeJSXElement(
  astPath: JSXPath,
  filePath: string,
  isMigrating: [string, ImportSpecifierDetails] | undefined = undefined
) {
  const { ROOT_PATH, TARGET_COMPONENT, report } = getContext();

  // * file path -> code node
  const { node } = astPath;
  // *        code node -> JSX Element
  const { openingElement: jsxElem } = node;
  // *                JSX Element -> Name & attributes
  const { name, attributes } = jsxElem;

  // * if [JSX Element] is not an ReactNode, return null
  if (name.type !== "JSXIdentifier") {
    return null;
  }

  const localName = name.name;
  const importedName = name.name;
  // * [JSX Element] is ReactNode, but not the one we are migrating
  if (TARGET_COMPONENT && localName !== TARGET_COMPONENT) {
    return null;
  }

  const impPkg = isMigrating || checkIfJsxInImportsReport(filePath);
  if (!impPkg) {
    return null;
  }
  const [pkg, impObj] = impPkg;

  const componentUsage: ComponentUsage = {
    name: importedName,
    filePath,
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

  const relPath = path.relative(ROOT_PATH, filePath);
  const { line, column } = node.loc!.start; // 🟢
  const uid = `${relPath}:${line}:${column}`; // 👉  e.g. "src/App.tsx:42:6"

  componentUsage.originalProps = { ...componentUsage.props };

  if (isMigrating) {
    return {
      id: uid,
      jsxPath: astPath,
      jsxOpening: jsxElem,
      props: componentUsage.props,
      compUsage: componentUsage,
    };
  }

  setInPath(report[pkg], relPath, componentUsage);
}

import { ImportUsage } from "@/graph/types";
import chalk from "chalk";
import path from "node:path";
import { getContext, lWarning } from "../context/globalContext";
import type { ComponentUsage, JSXPath } from "../types";
import { getPropValue } from "../utils/props";

/** Analyze one JSXElement and push data to context.report - full version */
export const analyzeJSXElementWithMigration = (
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

  try {
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

        try {
          const value = getPropValue(valueNode);
          if (value) componentUsage.props[`${propName.name}`] = value;
        } catch (error) {
          lWarning(`Failed to get prop value for ${propName.name} in ${fileAbsPath}:`, error as any);
        }
      } else {
        lWarning(`JSX Prop type unhandled in ${fileAbsPath}:`, propType);
      }
    });
  } catch (error) {
    lWarning(`Failed to process JSX attributes in ${fileAbsPath}:`, error as any);
  }

  try {
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
  } catch (error) {
    lWarning(`Failed to create JSX usage info for ${fileAbsPath}:`, error as any);
    return null;
  }
};

/**
 * Simple JSX analyzer for graph building - matches fileAnalyzer signature
 * This is used by the graph building process and doesn't require migration context
 */
export const analyzeJSXElement = (
  p: JSXPath,
  fileAbsPath: string,
) => {
  try {
    // For graph building, we just need to identify JSX elements
    // The actual analysis is done by the graph builder itself
    // This function exists mainly for API compatibility
    const { node } = p;
    const { openingElement: jsxElem } = node;
    const { name } = jsxElem;

    // Basic validation - ensure it's a JSX identifier
    if (name.type !== "JSXIdentifier") {
      return null;
    }

    // For graph building, we don't need to do much here
    // The graph builder handles the analysis directly
    return {
      localName: name.name,
      fileAbsPath,
      jsxPath: p,
    };
  } catch (error) {
    lWarning(`Failed to analyze JSX element in ${fileAbsPath}:`, error as any);
    return null;
  }
};

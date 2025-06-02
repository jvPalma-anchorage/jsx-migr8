import { types as T } from "recast";

import { ComponentUsage, JSXPath } from "../types";

export type JsxData = {
  id: string;
  jsxPath: JSXPath;
  jsxOpening: T.namedTypes.JSXOpeningElement;
  props: ComponentUsage["props"];
  compUsage: ComponentUsage;
};

export type MigrationMapper = {
  [filePath: string]: {
    pkg: string;
    compName: string;
    codeCompare?: {
      ast: T.ASTNode;
      old: string;
      new: string;
    };
    importNode: ComponentUsage["impObj"];
    elements: JsxData[];
  };
};

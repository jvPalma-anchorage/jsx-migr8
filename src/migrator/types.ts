import { types as T } from "recast";

import { JsxUsage } from "@/graph/types";
import { ComponentUsage, JSXPath } from "../types";

export type JsxData = {
  id: string;
  jsxPath: JSXPath;
  jsxOpening: T.namedTypes.JSXOpeningElement;
  props: ComponentUsage["props"];
  compUsage: ComponentUsage;
};

export type MigrationMapper = {
  [fileAbsPath: string]: {
    packageName: string;
    component: string;
    codeCompare: {
      ast: T.ASTNode | undefined;
      old: string;
    };
    importNode: ComponentUsage["impObj"];
    elements: JsxUsage[];
  };
};

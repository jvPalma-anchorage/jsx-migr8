import path from "node:path";
import type {
  ComponentPropsSummary,
  ComponentUsage,
  FileUsage,
  GlobalReport,
  PathNode,
} from "../types";

/* ----------------------------------------------------------------------------
 *  Helpers
 * ------------------------------------------------------------------------- */

function deepWalk(
  node: PathNode<FileUsage> | FileUsage,
  cb: (fu: ComponentUsage[], filePath: string) => void,
  curr = ""
) {
  Object.entries(node).forEach(([key, value]) => {
    const isFileUsage = Array.isArray(value);

    const next = isFileUsage ? curr : curr ? path.join(curr, key) : key;
    if (key === "_imports") return; // skip metadata branch
    if (Array.isArray(value)) {
      // This is actually FileUsage (leaf)
      cb(value as unknown as ComponentUsage[], next);
    } else if (typeof value === "object") {
      deepWalk(value as PathNode<FileUsage>, cb, next);
    }
  });
}

/* ----------------------------------------------------------------------------
 *  Main
 * ------------------------------------------------------------------------- */

function buildSummary(report: GlobalReport): ComponentPropsSummary {
  const summary: ComponentPropsSummary = {};

  Object.entries(report).forEach(([pkg, tree]) => {
    summary[pkg] = summary[pkg] || {};

    deepWalk(tree as PathNode<FileUsage>, (fileUsage) => {
      Object.entries(fileUsage).forEach(([_, { name, impObj, props }]) => {
        const cs = (summary[pkg][name] = summary[pkg][name] || []);

        (cs as any).push({ props, impObj });
      });
    });
  });

  return summary;
}

/* ----------------------------------------------------------------------------
 *  Run
 * ------------------------------------------------------------------------- */

export const writePropsReport = (report: GlobalReport) => {
  const summary = buildSummary(report);

  return summary;
};

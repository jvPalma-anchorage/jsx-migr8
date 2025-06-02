import fs from "node:fs";
import { print } from "recast";
import { getContext } from "../context/globalContext";
import { writePropsReport } from "./propsReport";

export const safeReplacer = (_: string, value: any) => {
  if (_ === "astImportPath") {
    return "Circular Obj -> NodePath"; // avoid circular references in AST paths
  }

  // drop common cyclic / unneeded fields just in case
  if (value?.loc || value?.tokens || typeof value === "function") {
    return print(value).code.trim() ?? undefined;
  }
  return value;
};

export const writeGlobalReport = () => {
  console.info("Writing global report...");

  const { report, REPORT_GLOBAL_USAGE, REPORT_COMPONENT_USAGES } = getContext();

  fs.writeFileSync(
    REPORT_GLOBAL_USAGE,
    JSON.stringify(report, safeReplacer, 2),
    "utf8"
  );
  console.info(`\tReport written to ${REPORT_GLOBAL_USAGE}`);

  console.info("Writing component props report...");
  const summary = writePropsReport(report);
  fs.writeFileSync(
    REPORT_COMPONENT_USAGES,
    JSON.stringify(summary, safeReplacer, 2),
    "utf8"
  );

  console.info(`\tReport written to ${REPORT_COMPONENT_USAGES}`);
  return 0;
};

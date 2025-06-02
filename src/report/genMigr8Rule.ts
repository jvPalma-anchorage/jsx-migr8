import chalk from "chalk";
import { getContext } from "../context/globalContext";
import { RemapRule } from "../remap/base-remapper";
import { ComponentPropsSummary, ComponentUsage } from "../types";
import { MIGRATE_RULES_DIR } from "../utils/constants";
import { ALL_COMPS, ALL_PKS } from "./utils/constants";
import { buildUsageTable } from "./utils/printSelections/propsTable";

export type PropsToRules = {
  summary: ComponentPropsSummary;
  pkgSel: string;
  compSel: string;
  propsSorted: string[];
};
export const genMigr8Rule = async ({
  pkgSel,
  summary,
  compSel,
  propsSorted,
}: PropsToRules) => {
  const { compSpec } = getContext();

  // same logic as "table" but harvesting the rows ------------------
  let usages: ComponentUsage[] = [];
  if (pkgSel === ALL_PKS) {
    Object.values(summary).forEach((c) =>
      Object.values(c).forEach((u) => usages.push(...u))
    );
  } else if (compSel.endsWith(`|${ALL_COMPS}`)) {
    const comps = summary[pkgSel] || {};
    Object.values(comps).forEach((u) => usages.push(...u));
  } else {
    const [, compName] = compSel.split("|");
    usages = summary[pkgSel]?.[compName] || [];
  }

  const { rows } = buildUsageTable(usages, propsSorted, false);

  const payload: {
    [pkg: string]: { [compName: string]: RemapRule<any, any>[] };
  } = {};

  let lastIndex = 1;

  /* 2 ▸ wrap into { COMP: [ … ] } --------------------------------- */
  const [, compNameForFile] = compSel.endsWith(`|${ALL_COMPS}`)
    ? ["", compSpec!.old.compName]
    : compSel.split("|")[1];

  /* 1 ▸ convert rows -> RemapRule[] ------------------------------- */
  if (pkgSel === ALL_PKS) {
    compSpec!.old.oldImportPath.forEach((pkg) => {
      payload[pkg] = {
        [compNameForFile]: [],
      };
    });
  } else {
    payload[pkgSel] = {
      [compNameForFile]: [],
    };
  }

  rows.forEach((r, i) => {
    const rule = {
      order: 0,
      match: [r.props], // OR-array with a single AND-object
      set: {}, // empty – fill later
      remove: [], // empty – fill later
      files: r.files,
      newCompName: compSpec!.new.compName,
      importFrom: pkgSel,
      importTo: compSpec!.new.newImportPath,
    };
    if (pkgSel === ALL_PKS) {
      compSpec!.old.oldImportPath.forEach((pkg) => {
        payload[pkg][compSpec!.old.compName].push({
          ...rule,
          order: lastIndex++,
          importFrom: pkg,
        });
      });
    } else {
      payload[pkgSel][compSpec!.old.compName].push({
        ...rule,
        order: lastIndex++,
      });
    }
  });

  /* 3 ▸ write file ------------------------------------------------- */
  const fs = await import("node:fs");
  const fileFullPath = `${MIGRATE_RULES_DIR}/${compSpec?.old.compName}-to-${compSpec?.new.compName}-migr8.json`;
  fs.mkdirSync(MIGRATE_RULES_DIR, { recursive: true });

  fs.writeFileSync(fileFullPath, JSON.stringify(payload, null, 2), "utf8");
  console.info(chalk.green(`\n💾  Saved rules to ${fileFullPath}\n`));
};

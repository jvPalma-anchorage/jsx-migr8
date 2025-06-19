import { getContext } from "@/context";
import { Migr8Spec } from "@/report/types";
import { ComponentPropsSummary, ComponentUsage } from "@/types";
import { MIGRATE_RULES_DIR } from "@/utils/constants";
import { default as chalk } from "chalk";
import { Selections } from ".";
import { buildUsageTable } from "./printSelections";

const migr8RuleComponent = (
  pkgName: string,
  oldComponent: string,
): Migr8Spec["migr8rules"][number] => ({
  package: pkgName,
  importType: "TODO: named | default",
  component: oldComponent,
  importTo: {
    importStm: "TODO: New import statement",
    importType: "TODO: named | default",
    component: "TODO: new component name",
  },
  rules: [],
});

export const genMigr8Rule = async (
  summary: ComponentPropsSummary,
  selections: Selections,
) => {
  const { packages, components, tables } = selections;

  const parsedComponents = components.map((c) => c.split("|")[1]);

  // same logic as "table" but harvesting the rows ------------------
  const payload: Migr8Spec = {
    lookup: {
      rootPath: getContext().ROOT_PATH,
      packages: packages,
      components: parsedComponents,
    },
    migr8rules: [],
  };

  let lastIndex = 1;
  tables.forEach(({ value }) => {
    const pkgSel = value.package;
    const compSel = value.component.split("|")[1];
    const migr8Base = migr8RuleComponent(pkgSel, compSel);
    const usages: ComponentUsage[] = summary[pkgSel]![compSel]! || [];

    const { rows } = buildUsageTable(usages, value.propsSortedByUsage, false);

    rows.forEach((r) => {
      const rule = {
        order: lastIndex++,
        match: [r.props],
        set: {},
        remove: [],
      };
      migr8Base.rules.push(rule);
    });
    payload.migr8rules.push(migr8Base);
  });

  const currentTime = Math.round(Date.now() / 1000);

  /* 3 ▸ write file ------------------------------------------------- */
  const fs = await import("node:fs");
  const fileFullPath = `${MIGRATE_RULES_DIR}/${currentTime}-${parsedComponents.join("-")}-migr8.json`;
  fs.mkdirSync(MIGRATE_RULES_DIR, { recursive: true });

  fs.writeFileSync(fileFullPath, JSON.stringify(payload, null, 2), "utf8");
  return chalk.green(`
  💾  Created Migr8Rule file: ${fileFullPath}
  🚨  Be sure to fill in all the \`TODO:\` in the file before using it!
  `);
};

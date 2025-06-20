import { getContext, lError, lWarning, lInfo } from "@/context";
import { Migr8Spec } from "@/report/types";
import { ComponentPropsSummary, ComponentUsage } from "@/types";
import { MIGRATE_RULES_DIR } from "@/utils/constants";
import { FileOperationError } from "@/utils/fs-utils";
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
  try {
    const { packages, components, tables } = selections;

    if (!packages || packages.length === 0) {
      throw new Error("No packages selected for migration rule generation");
    }

    if (!components || components.length === 0) {
      throw new Error("No components selected for migration rule generation");
    }

    const parsedComponents = components.map((c) => {
      const parts = c.split("|");
      if (parts.length < 2) {
        lWarning(`Invalid component format: ${c}`);
        return c; // fallback to original
      }
      return parts[1];
    });

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
      try {
        const pkgSel = value.package;
        const compSel = value.component.split("|")[1];
        
        if (!pkgSel || !compSel) {
          lWarning(`Invalid package or component selection: ${value.package}, ${value.component}`);
          return;
        }
        
        const migr8Base = migr8RuleComponent(pkgSel, compSel);
        const usages: ComponentUsage[] = summary[pkgSel]?.[compSel] || [];

        if (usages.length === 0) {
          lWarning(`No usages found for ${pkgSel}/${compSel}`);
        }

        try {
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
        } catch (error) {
          lError(`Failed to build usage table for ${pkgSel}/${compSel}:`, error as any);
        }
      } catch (error) {
        lError(`Failed to process table entry:`, error as any);
      }
    });

    const currentTime = Math.round(Date.now() / 1000);
    const safeComponentNames = parsedComponents
      .map(name => name.replace(/[^a-zA-Z0-9-_]/g, '_'))
      .join("-");

    /* 3 ▸ write file ------------------------------------------------- */
    try {
      const fs = await import("node:fs");
      const fileFullPath = `${MIGRATE_RULES_DIR}/${currentTime}-${safeComponentNames}-migr8.json`;
      
      lInfo(`Creating migration rule file: ${fileFullPath}`);
      
      // Ensure directory exists
      try {
        fs.mkdirSync(MIGRATE_RULES_DIR, { recursive: true });
      } catch (error: any) {
        if (error.code !== 'EEXIST') {
          throw new FileOperationError(
            "mkdir",
            MIGRATE_RULES_DIR,
            error
          );
        }
      }

      // Write the file
      try {
        const jsonContent = JSON.stringify(payload, null, 2);
        fs.writeFileSync(fileFullPath, jsonContent, "utf8");
        
        lInfo(`Successfully created migration rule file with ${payload.migr8rules.length} rules`);
        
        return chalk.green(`
  💾  Created Migr8Rule file: ${fileFullPath}
  🚨  Be sure to fill in all the \`TODO:\` in the file before using it!
  `);
      } catch (error) {
        throw new FileOperationError(
          "writeFile",
          fileFullPath,
          error as Error
        );
      }
    } catch (error) {
      if (error instanceof FileOperationError) {
        lError(`Failed to create migration rule file: ${error.message}`);
        throw error;
      }
      lError("Unexpected error creating migration rule file:", error as any);
      throw new Error(`Failed to create migration rule file: ${error}`);
    }
  } catch (error) {
    lError("Failed to generate migration rule:", error as any);
    throw error;
  }
};

/**
 * Core migration logic
 * Handles the actual migration process
 */
import { readFileSync, writeFileSync } from "node:fs";
import chalk from "chalk";
import { getContext } from "@/context/globalContext";
import { makeDiff } from "@/utils/diff";
import { getCompName } from "@/utils/pathUtils";
import { applyRemapRule } from "@/remap/utils/rules";
import { print, parse } from "recast";
import { MigrationMapper } from "@/migrator/types";

/**
 * Perform the actual migration
 */
export async function performMigration(
  migrationMapper: MigrationMapper,
  migr8Spec: string,
  changeCode: boolean,
): Promise<{
  successMigrated: string[];
  couldMigrate: string[];
}> {
  const successMigrated: string[] = [];
  const couldMigrate: string[] = [];

  Object.entries(migrationMapper).forEach((migrationObj) => {
    const [fileAbsPath, fileCompleteData] = migrationObj;
    const { codeCompare, elements, importNode } = fileCompleteData;
    
    // Clone AST to preserve original for diffs and re-runs
    const originalAst = codeCompare.ast!;
    const workingAst = !changeCode ? parse(print(originalAst).code) : originalAst; // Clone only in preview mode
    
    // Create a working migration object with cloned AST
    const workingMigrationObj: [string, typeof fileCompleteData] = [
      fileAbsPath,
      {
        ...fileCompleteData,
        codeCompare: {
          ...codeCompare,
          ast: workingAst
        }
      }
    ];
    
    const changed = applyRemapRule(changeCode, workingMigrationObj, migr8Spec);
    if (!changed) {
      return;
    }

    const locName = getCompName(
      importNode.local,
      importNode.imported,
      importNode.importedType,
    );

    const oldCode = codeCompare!.old || "1 N/A";
    const newCode = print(workingAst).code || "2 N/A";

    if (changeCode) {
      writeFileSync(fileAbsPath, newCode);
      successMigrated.push(
        [
          "migrated",
          " (",
          chalk.yellow(elements.length),
          ") ",
          chalk.yellow(locName),
          " in ",
          chalk.yellow(fileAbsPath),
        ].join(""),
      );
    } else {
      couldMigrate.push(
        [
          "would migrate",
          chalk.yellow(locName),
          " in ",
          chalk.yellow(fileAbsPath),
        ].join(""),
      );

      console.info("🎉", makeDiff(fileAbsPath, oldCode, newCode, 2));
    }
  });

  return { successMigrated, couldMigrate };
}

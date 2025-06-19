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
import { print } from "recast";
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
    const changed = applyRemapRule(changeCode, migrationObj, migr8Spec);
    if (!changed) {
      return;
    }

    const [fileAbsPath, fileCompleteData] = migrationObj;
    const { codeCompare, elements, importNode } = fileCompleteData;

    const locName = getCompName(
      importNode.local,
      importNode.imported,
      importNode.importedType,
    );

    const oldCode = codeCompare!.old || "1 N/A";
    const newCode = print(codeCompare.ast!).code || "2 N/A";

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

import { readFileSync, writeFileSync } from "node:fs";
/* ------------------------------------------------------------------------- */
/*  Single-pass migrate + dry-run diff                                       */
/* ------------------------------------------------------------------------- */
import { print } from "recast";

/* ---------- load remap rules (your generator returns the full map) -------- */
import { getMigr8RulesFileNames } from "@/utils/fs-utils";
import { transformFileIntoOptions } from "@/utils/migr8.utils";
import { input, select } from "@inquirer/prompts";
import { default as chalk } from "chalk";
import { graphToComponentSummary } from "../compat/usageSummary";
import { getContext, lSuccess } from "../context/globalContext";
import { applyRemapRule } from "../remap/utils/rules";
import { makeDiff } from "../utils/diff";
import { getCompName } from "../utils/pathUtils";
import { prepareReportToMigrate } from "./utils/prepareReportToMigrate";
import { migrateComponentsWithBackup } from "../backup/migrator-integration";

export const migrateComponents = async (changeCode = false) => {
  const { runArgs, graph } = getContext();

  const summary = graphToComponentSummary(graph!);

  if (!summary) {
    return;
  }

  const migr8RuleFiles = getMigr8RulesFileNames();

  if (!migr8RuleFiles || migr8RuleFiles.length === 0) {
    return `
⚠ No Migr8 files found to use.
Please create one in "🔍  Inspect components"`;
  }

  const fileOptions = transformFileIntoOptions();

  /* ── 2.5  import type (named or default)  */
  const migr8Spec = await select({
    message: "🔗  Pick an Migr8 :",
    choices: fileOptions,
  });

  const migrationMapper = prepareReportToMigrate(migr8Spec, summary);

  // Check if backup integration should be used
  const shouldSkipBackup = runArgs.skipBackup;
  const isYoloMode = runArgs.yolo || changeCode;

  // Use enhanced migration with backup integration unless specifically skipped
  if (!shouldSkipBackup && (isYoloMode || !runArgs.dryRun)) {
    try {
      await migrateComponentsWithBackup(migrationMapper, migr8Spec, changeCode);
      return;
    } catch (error) {
      console.warn(
        chalk.yellow(
          "⚠️  Backup integration failed, falling back to standard migration:",
        ),
        error,
      );
      // Fall through to standard migration
    }
  }

  // Standard migration logic (kept for backward compatibility and fallback)
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

    // const fileAbsPath = fileCompleteData.importNode.fileAbsPath;
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

  if (!changeCode) {
    couldMigrate.forEach((e) => {
      const str = e.split(" migrate");
      lSuccess(str[0] + " migrate", str[1]);
    });
  }

  if (changeCode || runArgs.debug) {
    successMigrated.forEach((e) => {
      const str = e.split(" (");
      lSuccess(str[0], " (" + str[1]);
    });
    process.exit(0);
  }

  const action = await select({
    message: chalk.cyanBright("What would you like to do?"),
    choices: [
      {
        name: "🧪  Dry-run migration (diff only)",
        value: "dryRun",
      },
      {
        name: "🚀  Migrate code for real (YOLO)",
        value: "migrate",
      },
    ],
    default: "dry",
  });

  if (action === "dryRun") {
    await migrateComponents(false);
  }
  if (action === "migrate") {
    const confirm = await input({
      message: chalk.redBright(
        "This will MODIFY your files - type 'yes' to continue:",
      ),
    });
    if (confirm.trim().toLowerCase() === "yes") {
      migrateComponents(true /* change files */);
    } else {
      console.info(chalk.yellow("Migration aborted."));
      process.exit(0);
    }
  }
};

import fs from "node:fs";
/* ------------------------------------------------------------------------- */
/*  Single-pass migrate + dry-run diff                                       */
/* ------------------------------------------------------------------------- */
import { print } from "recast";

/* ---------- load remap rules (your generator returns the full map) -------- */
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { getContext, lSuccess } from "../context/globalContext";
import { applyRemapRule } from "../remap/utils/rules";
import { makeDiff } from "../utils/diff";
import { getCompName } from "../utils/pathUtils";
import { prepareReportToMigrate } from "./utils/prepareReportToMigrate";

export const migrateComponents = async (changeCode = false) => {
  const { runArgs, PACKAGES, reportComponentUsages: report } = getContext();
  if (!report) {
    return;
  }
  const migrationMapper = prepareReportToMigrate(PACKAGES, report);
  const successMigrated: string[] = [];
  const couldMigrate: string[] = [];

  Object.entries(migrationMapper).forEach((migrationObj) => {
    const changed = applyRemapRule(changeCode, migrationObj);
    if (!changed) {
      return;
    }
    const [filePath, fileCompleteData] = migrationObj;
    const { codeCompare, elements, importNode } = fileCompleteData;

    const locName = getCompName(
      importNode.localName,
      importNode.importedName,
      importNode.importType
    );

    // const filePath = fileCompleteData.importNode.filePath;
    const oldCode = codeCompare!.old || "1 N/A";
    const newCode = print(codeCompare!.ast).code || "2 N/A";

    if (changeCode) {
      fs.writeFileSync(filePath, newCode);
      successMigrated.push(
        [
          "migrated",
          " (",
          chalk.yellow(elements.length),
          ") ",
          chalk.yellow(locName),
          " in ",
          chalk.yellow(filePath),
        ].join("")
      );
    } else {
      couldMigrate.push(
        [
          "would migrate",
          chalk.yellow(locName),
          " in ",
          chalk.yellow(filePath),
        ].join("")
      );

      console.info("🎉", makeDiff(filePath, oldCode, newCode, 2));
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
        "This will MODIFY your files - type 'yes' to continue:"
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

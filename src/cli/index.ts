/**********************************************************************
 *  src/cli/index.ts – top-level command runner / menu
 *********************************************************************/
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import fg from "fast-glob";
import { analyzeFile } from "../analyzer/fileAnalyzer";
import { getContext, initContext } from "../context/globalContext";
import { migrateComponents } from "../migrator";
import { writeGlobalReport } from "../report/generate";
import { propsScanner } from "../report/propsScanner";
import { showCompSpecDiff } from "./interativeInit";

let stdin = process.stdin;
stdin.on("data", (key) => {
  // @ts-ignore
  if (key == "\u0003") {
    // @ts-ignore
    console.info(chalk.green("\n\nBye! 💪\n\n"));
    process.exit(0);
  }
});

/* ──────────────────────────────────────────────────────────────────── */
/*  helpers                                                            */
/* ──────────────────────────────────────────────────────────────────── */
async function runCodeScan(): Promise<void> {
  const { ROOT_PATH, BLACKLIST } = getContext();
  const entries = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
    cwd: ROOT_PATH,
    absolute: true,
    ignore: BLACKLIST.map((b) => `**/${b}/**`),
  });
  entries.forEach(analyzeFile);
  console.info(chalk.green("✓ Source files analysed"));
}

async function ensureReports(): Promise<void> {
  await runCodeScan();
  writeGlobalReport();
  initContext();
}

/* ──────────────────────────────────────────────────────────────────── */
/*  interactive menu                                                   */
/* ──────────────────────────────────────────────────────────────────── */
async function mainMenu(): Promise<void> {
  let firstRun = true;
  let lastPicked = undefined;
  while (true) {
    /* clear previous screen */

    console.clear();

    /* state snapshot – always fresh */
    const { compSpec, reportComponentUsages } = getContext();

    if (lastPicked === "wizard" && compSpec && reportComponentUsages) {
      /* if we just came from the wizard, we need to re-generate reports */
      await ensureReports();
      lastPicked = undefined;
    }

    /* build dynamic choices based on what we already have ------------- */
    const choices: { name: string; value: string; description?: string }[] = [];

    /* 0 ▸ set / reset component spec */
    choices.push({
      name: compSpec
        ? `🔧  Re-enter component spec (current: ${chalk.yellow(
            compSpec.old.compName
          )} ➜  ${chalk.green(compSpec.new.compName)} )`
        : "✨  Create component spec (wizard)",
      value: "wizard",
      description: compSpec
        ? `${chalk.magentaBright(
            "\n📜  Preview of the transformation with the current Component Spec\n"
          )}\n${showCompSpecDiff(
            {
              oldPkgs: compSpec.old.oldImportPath,
              compName: compSpec.old.compName,
              importType: compSpec.new.importType,
              migrateTo: compSpec.new.compName,
              newPkg: compSpec.new.newImportPath,
            },
            false
          )}`
        : undefined,
    });

    if (compSpec) {
      /* 1 ▸ generate / regenerate reports */
      choices.push({
        name: reportComponentUsages
          ? "🔁  Re-generate usage reports"
          : "📊  Generate usage reports",
        value: "generateReports",
      });
    }

    /* 2 ▸ inspect props (only when we already have the fine-grained report) */
    if (reportComponentUsages) {
      choices.push({ name: "🔍  Inspect props", value: "showProps" });
    }

    /* 3 ▸ dry-run migration */
    if (reportComponentUsages) {
      choices.push({
        name: "🧪  Dry-run migration (diff only)",
        value: "dryRun",
      });
    }

    /* 4 ▸ YOLO migration */
    if (reportComponentUsages) {
      choices.push({
        name: "🚀  Migrate code for real (YOLO)",
        value: "migrate",
      });
    }

    choices.push({ name: "⏹  Exit", value: "exit" });

    const preSelectedOption = (() => {
      if (!compSpec || (compSpec && lastPicked === "wizard")) {
        return "wizard";
      }
      if (!reportComponentUsages) {
        return "generateReports";
      }
      return "showProps";
    })();

    console.info("\n");

    const action = await select({
      message: chalk.cyanBright(" What would you like to do?"),
      choices,
      default: preSelectedOption,
    });

    /* dispatch -------------------------------------------------------- */
    switch (action) {
      case "wizard": {
        const { wizard } = await import("./interativeInit");
        await wizard(getContext());
        /* re-load environment because the wizard just wrote files */
        initContext();
        break;
      }
      case "generateReports": {
        await ensureReports();
        break;
      }
      case "showProps": {
        await propsScanner(getContext().reportComponentUsages!);
        break;
      }
      case "dryRun": {
        await migrateComponents(false /* dry-run */);
        break;
      }
      case "migrate": {
        const confirm = await input({
          message: chalk.redBright(
            "This will MODIFY your files - type 'yes' to continue:"
          ),
        });
        if (confirm.trim().toLowerCase() === "yes") {
          await migrateComponents(true /* change files */);
        } else {
          console.info(chalk.yellow("Migration aborted."));
        }
        break;
      }
      case "exit":
      default:
        console.info(chalk.green("\n\nBye! 💪\n\n"));
        return;
    }
  }
}

/* ──────────────────────────────────────────────────────────────────── */
/*  bootstrap                                                          */
/* ──────────────────────────────────────────────────────────────────── */
(async function run() {
  /* 1 ▸ initialise context from CLI/env once                           */
  initContext();

  const { runArgs } = getContext();

  /* 2 ▸ honour simple one-shot flags                                   */
  if (runArgs.dryRun) {
    migrateComponents(false);
    return;
  }
  if (runArgs.yolo) {
    migrateComponents(true);
    return;
  }
  if (runArgs.showProps) {
    await propsScanner(getContext().reportComponentUsages!);
    return;
  }

  /* 3 ▸ interactive menu                                               */
  await mainMenu();
})();

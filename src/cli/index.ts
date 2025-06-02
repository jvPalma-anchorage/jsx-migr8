/**********************************************************************
 *  src/cli/index.ts – top-level command runner / menu
 *********************************************************************/
import { getMigr8RulesFileNames } from "@/utils/fs-utils";
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { graphToComponentSummary } from "../compat/usageSummary";
import { getContext, getRootPath, initContext } from "../context/globalContext";
import { migrateComponents } from "../migrator";
import { propsScanner } from "../report/propsScanner";
import { MAIN_MENU_OPTIONS } from "./constants";

let stdin = process.stdin;
stdin.on("data", (key) => {
  // @ts-ignore
  if (key == "\u0003") {
    // @ts-ignore
    console.info(chalk.green("\n\nBye! 💪\n\n"));
    process.exit(0);
  }
});

async function mainMenu(preSelectedOption?: string): Promise<void> {
  let firstRun = true;
  let optionPicked: string | undefined = preSelectedOption;
  let message: string | undefined = undefined;

  while (true) {
    const { graph } = getContext();
    const summary = graphToComponentSummary(graph!);
    /* clear previous screen */

    if (firstRun) {
      firstRun = false;
    } else {
      console.clear();
    }

    /* dispatch -------------------------------------------------------- */
    switch (optionPicked) {
      case "wizard": {
        const { wizard } = await import("./interativeInit");
        await wizard(getContext());
        /* re-load environment because the wizard just wrote files */
        await initContext();
        optionPicked = undefined;
        break;
      }
      case "showProps": {
        message = await propsScanner(summary);
        optionPicked = undefined;
        break;
      }
      case "dryRun": {
        message = await migrateComponents(false /* dry-run */);
        optionPicked = undefined;
        break;
      }
      case "migrate": {
        const confirm = await input({
          message: chalk.redBright(
            "This will MODIFY your files - type 'yes' to continue:"
          ),
        });
        if (confirm.trim().toLowerCase() === "yes") {
          message = await migrateComponents(true /* change files */);
        } else {
          console.info(chalk.yellow("Migration aborted."));
        }
        optionPicked = undefined;
        break;
      }
      case "exit":
        console.info(chalk.green("\n\nBye! 💪\n\n"));
        optionPicked = undefined;
        return;
      default: {
      }
    }

    if (message) {
      console.info(chalk.green(message));
      message = undefined;
    }

    const migr8Rules = getMigr8RulesFileNames();
    const numberofMigr8ableComponents = migr8Rules.length;

    /* build dynamic choices based on what we already have ------------- */
    const choices: { name: string; value: string; description?: string }[] = [];

    /* 2 ▸ inspect props (only when we already have the fine-grained report) */
    if (summary) {
      choices.push(MAIN_MENU_OPTIONS.showProps);
    }

    /* 3 ▸ dry-run migration */
    if (summary && numberofMigr8ableComponents > 0) {
      choices.push(MAIN_MENU_OPTIONS.dryRun);
    }

    /* 4 ▸ YOLO migration */
    if (summary && numberofMigr8ableComponents > 0) {
      choices.push(MAIN_MENU_OPTIONS.migrate);
    }

    choices.push(MAIN_MENU_OPTIONS.exit);

    console.info("\n");

    optionPicked = await select({
      message: chalk.cyanBright(" What would you like to do?"),
      choices,
    });
  }
}

/* ──────────────────────────────────────────────────────────────────── */
/*  bootstrap                                                          */
/* ──────────────────────────────────────────────────────────────────── */
(async function run() {
  let preSelectedOption: string | undefined = undefined;
  const ROOT_PATH = getRootPath();
  console.clear();
  console.info(MAIN_MENU_OPTIONS.welcomeHeader.replace("ROOTPATH", ROOT_PATH));

  /* 1 ▸ initialise context from CLI/env once                           */
  await initContext();

  const { runArgs } = getContext();

  /* 2 ▸ honour simple one-shot flags                                   */
  if (runArgs.showProps) {
    preSelectedOption = "showProps";
  } else if (runArgs.dryRun) {
    preSelectedOption = "dryRun";
  } else if (runArgs.yolo) {
    preSelectedOption = "migrate";
  }

  /* 3 ▸ interactive menu                                               */
  await mainMenu(preSelectedOption);
})();

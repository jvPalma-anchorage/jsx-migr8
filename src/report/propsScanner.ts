import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { ComponentPropsSummary } from "../types";
import { ALL_PKS } from "./utils/constants";
import { buildComponentMaps, buildPkgOptions } from "./utils/options";
import { tableViewMenu } from "./utils/printSelections/tableViewMenu";
import { printTotalProps } from "./utils/printSelections/totalProps";

/* ────────── MAIN SCANNER FLOW ───────────────────────────────────── */
export const propsScanner = async (summary: ComponentPropsSummary) => {
  /* generates all options -------------------------------------------- */
  const pkgOptions = buildPkgOptions(summary);
  const { compPkgOptions, keysPerComp } = buildComponentMaps(summary);

  /* outer loop – allows returning to parent menu */
  while (true) {
    /* 1 ▸ choose package ------------------------------------------------- */
    const pkgSel = await select({
      message: "📦 Pick an package",
      default: ALL_PKS,
      choices: pkgOptions,
    });

    console.info(
      chalk.green(
        pkgSel === ALL_PKS
          ? `\n📦  Selected ${chalk.yellow("all packages")}\n`
          : `\n📦  Selected package: ${chalk.yellow(pkgSel)}\n`
      )
    );

    /* 2 ▸ choose component ------------------------------------------- */
    const compChoices = compPkgOptions[pkgSel] || [];
    const compSel = (await select({
      message: "🧩 Pick a component:",
      default: compChoices[0].value,
      choices: compChoices,
    })) as `${string}|${string}`;

    /* 3 ▸ show keys / counts ------------------------------------ */
    console.clear();
    const keys = keysPerComp[compSel] || {};
    let propsOrderedByUsage: string[] = [];
    propsOrderedByUsage = printTotalProps(keys, pkgSel, compSel);

    /* 4 ▸ post-print menu ------------------------------------------------ */
    const next = await tableViewMenu(
      pkgSel,
      compSel,
      summary,
      propsOrderedByUsage
    );
    if (next === "genRules") break; // returns to main menu
    if (next === "menu") break; // returns to main menu
    if (next === "pkg") continue; // restarts flow (goes back to choose pkg)
    if (next === "comp") {
      // goes back to choose component within the same package
      /* inner loop: only changes comp */
      while (true) {
        console.clear();
        const compSel2 = (await select({
          message: "🧩 Pick a component:",
          default: compChoices[0].value,
          choices: compChoices,
        })) as `${string}|${string}`;

        console.clear();
        const keys2 = keysPerComp[compSel2] || {};
        printTotalProps(keys2, pkgSel, compSel2);
        const again = await tableViewMenu(
          pkgSel,
          compSel2,
          summary,
          propsOrderedByUsage
        );
        if (again === "comp") continue; // chooses another comp in the same pkg
        if (again === "pkg") break; // exits to choose another pkg
        if (again === "menu") return; // exits to main menu
      }
    }
  }
};

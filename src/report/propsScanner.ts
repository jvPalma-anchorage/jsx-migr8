import { printTotalProps, tableViewMenu } from "@/report/printSelections";
import { buildComponentMaps, buildPkgOptions } from "@/report/utils";
import { ComponentPropsSummary } from "@/types";
import { checkbox } from "@inquirer/prompts";
import { genMigr8Rule } from "./genMigr8Rule";
import { OptionValue } from "./types";

export type Selections = {
  packages: string[];
  components: string[];
  tables: {
    name: string;
    value: {
      package: string;
      component: string;
      props: Record<string, string[]>;
      propsSortedByUsage: string[];
    };
  }[];
};

/* ────────── MAIN SCANNER FLOW ───────────────────────────────────── */
export const propsScanner = async (summary: ComponentPropsSummary) => {
  let message = undefined;
  /* generates all options -------------------------------------------- */
  const pkgOptions = buildPkgOptions(summary);
  const { compPkgOptions, keysPerComp } = buildComponentMaps(summary);

  const selections: Selections = {
    packages: [],
    components: [],
    tables: [],
  };

  /* outer loop – allows returning to parent menu */
  while (true) {
    console.clear();
    //
    //
    /* 1 ▸ choose package ------------------------------------------------- */
    if (selections.packages.length === 0) {
      selections.packages = await checkbox({
        message: "📦 Pick an package",
        choices: pkgOptions,
        loop: false,
        pageSize: 15,
        required: true,
      });
    }

    /* 2 ▸ choose component ------------------------------------------- */
    if (selections.packages && selections.components.length === 0) {
      const compChoices: OptionValue[] = [];
      selections.packages.forEach((pkg) => {
        compPkgOptions[pkg].forEach((opt) => compChoices.push({ ...opt, pkg }));
      });

      const compsSelcted = await checkbox({
        message: "🧩 Pick a component:",
        choices: compChoices,
        loop: false,
        pageSize: 15,
      });

      selections.components = compsSelcted;
      selections.tables = selections.components.map((compOpt) => {
        const opt = compChoices.find((e) => e.value === compOpt)!;

        const keys = keysPerComp[compOpt] || {};
        const [propsSortedByUsage, description] = printTotalProps(
          keys!,
          opt.pkg!,
          compOpt
        );
        return {
          name: opt.description!,
          value: {
            package: opt.pkg!,
            component: compOpt,
            props: keys!,
            propsSortedByUsage,
          },
          description,
        };
      });

      continue;
    }

    if (
      selections.packages.length === 0 ||
      selections.components.length === 0
    ) {
      continue;
    }

    /* 4 ▸ post-print menu ------------------------------------------------ */
    const next = await tableViewMenu(summary, selections);

    if (next === "genRules") {
      // returns to main menu
      message = await genMigr8Rule(summary, selections);
      console.log(1111, message);
      break;
    }
    if (next === "menu") break; // returns to main menu
    if (next === "pkg") {
      selections.packages = [];
    }
    if (next === "comp" || next === "pkg") {
      selections.components = [];
      selections.tables = [];
      continue;
    }
  }

  console.log("return", message);
  return message;
};

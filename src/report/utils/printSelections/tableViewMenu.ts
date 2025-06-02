import { select } from "@inquirer/prompts";
import { ComponentPropsSummary, ComponentUsage } from "../../../types";
import { genMigr8Rule } from "../../genMigr8Rule";
import { ALL_COMPS, ALL_PKS } from "../constants";
import { buildUsageTable } from "./propsTable";

export const tableViewMenu = async (
  pkgSel: string,
  compSel: string,
  summary: ComponentPropsSummary,
  propsOrderedByUsage: string[]
): Promise<"pkg" | "comp" | "menu" | "genRules"> => {
  const choice = await select({
    message: "Next action:",
    choices: [
      { name: "🧮 See props table", value: "table" },
      { name: "🧬 Generate RemapRule JSON", value: "genRules" },
      { name: "🧩 Pick another Component", value: "comp" },
      { name: "📦 Pick another Package", value: "pkg" },
      { name: "◀ Main menu", value: "menu" },
    ],
  });

  if (choice === "genRules") {
    await genMigr8Rule({
      pkgSel,
      summary,
      compSel,
      propsSorted: propsOrderedByUsage,
    });
  }

  if (choice === "table") {
    /* find corresponding usages */
    let usages: ComponentUsage[] = [];
    if (pkgSel === ALL_PKS) {
      // all packages
      Object.values(summary).forEach((c) =>
        Object.values(c).forEach((u) => usages.push(...u))
      );
    } else if (compSel.endsWith(`|${ALL_COMPS}`)) {
      // 1 package, all components
      const comps = summary[pkgSel] || {};
      Object.values(comps).forEach((u) => usages.push(...u));
    } else {
      // specific package+component
      const [, compName] = compSel.split("|");
      usages = summary[pkgSel]?.[compName] || [];
    }
    buildUsageTable(usages, propsOrderedByUsage);
    /* shows the same menu again */
    return tableViewMenu(pkgSel, compSel, summary, propsOrderedByUsage);
  }

  return choice as "pkg" | "comp" | "menu" | "genRules";
};

import { ComponentPropsSummary, ComponentUsage } from "@/types";
import { select } from "@inquirer/prompts";
import { Selections } from "../propsScanner";
import { buildUsageTable } from "./propsTable";

export const tableViewMenu = async (
  summary: ComponentPropsSummary,
  selections: Selections,
): Promise<"pkg" | "comp" | "menu" | "genRules"> => {
  const { tables } = selections;

  const tableChoice = await select<any>({
    message: "See props table for what component?",
    choices: [
      { type: "separator", separator: "\n🧮  Table View for components" },
      ...tables,
      { type: "separator", separator: "\n🪜  Menu options" },
      { name: "🧬  Generate RemapRule JSON", value: "genRules" },
      { name: "🧩  Pick another Component", value: "comp" },
      { name: "📦  Pick another Package", value: "pkg" },
      { name: "⬅  Main menu", value: "menu" },
    ],
    loop: false,
    pageSize: 15,
  });

  if (typeof tableChoice === "string") {
    return tableChoice as "genRules" | "comp" | "pkg" | "menu";
  }
  /* find corresponding usages */
  const usages: ComponentUsage[] =
    summary[tableChoice.package]![tableChoice.component.split("|")[1]]! || [];

  console.clear();
  buildUsageTable(usages, tableChoice.propsSortedByUsage);

  /* shows the same menu again */
  return tableViewMenu(summary, selections);
};

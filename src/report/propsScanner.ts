import { select } from "@inquirer/prompts";
import chalk, { BackgroundColorName, ColorName } from "chalk";
import { ComponentPropsSummary, ComponentUsage } from "../types";

type OptionValue = {
  value: string;
  name?: string;
  description?: string;
  short?: string;
  disabled?: boolean | string;
  type?: never;
};

/* ────────── CONSTANTS ────────────────────────────────────────────────── */
const ALL_PKS = "ALL_PKS";
const ALL_COMPS = "ALL_COMPS";

const allPkgsOption: OptionValue = {
  name: `All - All the packages below`,
  value: ALL_PKS,
  description: "Select all packages",
  short: "📦 All packages",
};

/* ────────── PROP HELPERS ─────────────────────────────────────────────── */
export const filterWhiteListedProps = (props: Record<string, string>) => {
  const propsToSafelyIgnore = [
    "className",
    "data-testid",
    "id",
    "style",
    "key",
  ];
  return Object.fromEntries(
    Object.entries(props)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([k]) => !propsToSafelyIgnore.includes(k))
  );
};

/* ────────── SELECT OPTIONS HELPERS ──────────────────────────────────── */
/** Given the usages, returns the package options array (first SELECT) */
const buildPkgOptions = (summary: ComponentPropsSummary): OptionValue[] => {
  const pkgOptions: OptionValue[] = [allPkgsOption];

  Object.keys(summary).forEach((pkgName, idx) => {
    pkgOptions.push({
      name: `[${idx + 1}] - ${pkgName}`,
      value: pkgName,
      short: `🧩 ${pkgName}`,
    });
  });

  return pkgOptions;
};

/** Builds component options map and props → values map */
const buildComponentMaps = (summary: ComponentPropsSummary) => {
  /** compPkgOptions[pkg] = second SELECT options (components) */
  const compPkgOptions: Record<string, OptionValue[]> = {
    [ALL_PKS]: [
      {
        name: `All components found for all packages!`,
        value: `${ALL_PKS}|${ALL_COMPS}`,
        short: `🧩 All Components from 📦 All Packages`,
      },
    ],
  };

  /** keysPerComp[pkg|comp] = { propKey: [values…] } */
  const keysPerComp: Record<string, Record<string, string[]>> = {};

  Object.entries(summary).forEach(([pkgName, compObj], pIdx) => {
    const compKeyAll = `${pkgName}|${ALL_COMPS}` as const;
    /* initializes list for the package, with "All components …" option */
    compPkgOptions[pkgName] = [
      {
        name: `All components found for package [${pkgName}]`,
        value: compKeyAll,
        short: `🧩 All Components from 📦 ${pkgName} package`,
      },
    ];

    Object.entries(compObj).forEach(([compName, usages], cIdx) => {
      const keyAllAll = `${ALL_PKS}|${ALL_COMPS}` as const;
      const compKey = `${pkgName}|${compName}` as const;

      const opt: OptionValue = {
        name: `[${pIdx + 1}.${cIdx + 1}] - ${compName}`,
        description: `Component [ ${compName} ] from ${pkgName} package`,
        value: compKey,
        short: `🧩 ${compName} Component from 📦 ${pkgName} package`,
      };

      compPkgOptions[ALL_PKS].push(opt);
      compPkgOptions[pkgName].push(opt);

      usages.forEach(({ props }) => {
        const parsed = filterWhiteListedProps(props);
        Object.entries(parsed).forEach(([propKey, propVal]) => {
          for (const key of [keyAllAll, compKeyAll, compKey]) {
            (keysPerComp[key] = keysPerComp[key] || {})[propKey] ??= [];
            keysPerComp[key][propKey].push(propVal);
          }
        });
      });
    });
  });

  return { compPkgOptions, keysPerComp };
};

/* ────────── RESULT PRINTING ───────────────────────────────────── */
const printFinalSelection = (
  keys: Record<string, string[]>,
  packageToScan: string,
  selectedComponents: string
) => {
  const propsOrderedByUsage: string[] = [];

  Object.entries(keys)
    .sort(([, a], [, b]) => b.length - a.length)
    .forEach(([propKey, values]) => {
      propsOrderedByUsage.push(propKey);

      const pkgLabel =
        packageToScan === ALL_PKS
          ? chalk.greenBright("All packages")
          : `${chalk.blueBright("📦  Package:")} ${chalk.greenBright(packageToScan)}`;
      const compLabel = selectedComponents.includes(ALL_COMPS)
        ? chalk.yellowBright("| All components")
        : `${chalk.blueBright("| 🧩 Component:")} ${chalk.yellowBright(packageToScan)}`;

      console.info(
        pkgLabel,
        compLabel,
        chalk.blueBright("| Prop:"),
        chalk.whiteBright(propKey.padEnd(16)),
        chalk.greenBright(`${values.length}x`)
      );
    });

  return propsOrderedByUsage;
};

/* ────────── USAGE TABLE / DUPLICATES ─────────────────────── */
const buildUsageTable = (
  usages: ComponentUsage[],
  propsOrderedByUsage: string[]
) => {
  const prepareText = (text: string, isHeader: boolean, i: number) => {
    const noData = i > 2 && text === "-";
    let printText = "";

    if (text.length > 16) {
      printText = `${text.slice(0, 13)}...`;
    } else {
      printText = text.padEnd(16);
    }

    return noData ? chalk.dim(printText) : chalk.bold(printText);
  };

  const pCell = (t: string, ri: number | string, ci: number) => {
    const noData = t === "-";
    let txColor: ColorName = "white";
    let isHeader = ri === "header";

    if (ci === 0) {
      txColor = "yellowBright";
    } else if (ci === 1) {
      txColor = "blueBright";
    } else if (ci > 2 && noData) {
      txColor = "gray";
    } else {
      txColor = "greenBright";
    }

    if (isHeader) {
      txColor = "whiteBright";
    }

    return chalk[txColor](prepareText(t, isHeader, ci));
  };

  const pRow = (t: string[], i: number | string) => {
    // const bg = i % 2 === 0 ? "bgGray" : "bgBlack";
    let bg: BackgroundColorName = "bgBlack";

    if (typeof i === "string") {
      bg = "bgGray";
    }

    const syml = chalk.bgGray(chalk.whiteBright("|"));
    const prefix = `${syml} `;
    const joinner = ` ${syml} `;
    const sufix = ` ${syml}`;

    return console.info(
      chalk[bg](
        `${prefix}${t.map((cell, ci) => pCell(cell, i, ci)).join(joinner)}${sufix}`
      )
    );
  };

  //* 1 ▸ map canonical-key → {count, props}
  const seen = new Map<
    string,
    { count: number; props: Record<string, string> }
  >();

  usages.forEach((u) => {
    const sortedEntries = Object.entries(filterWhiteListedProps(u.props)).sort(
      ([a], [b]) => a.localeCompare(b)
    );
    const key = JSON.stringify(sortedEntries);
    if (!seen.has(key))
      seen.set(key, { count: 0, props: Object.fromEntries(sortedEntries) });
    seen.get(key)!.count++;
  });

  //* 2 ▸ sorts ROWS by number of props (desc) */
  const rows = Array.from(seen.values()).sort(
    (a, b) => Object.keys(b.props).length - Object.keys(a.props).length
  );

  //* 3 ▸ sorts COLUMNS by number times used (desc) */
  const allPropKeys = new Set<string>();
  rows.forEach((r) => Object.keys(r.props).forEach((k) => allPropKeys.add(k)));

  //* primeiro as props ordenadas por uso, depois quaisquer restantes (alfab.) */
  const orderedKeys = [
    ...propsOrderedByUsage.filter((k) => allPropKeys.has(k)),
    ...Array.from(allPropKeys)
      .filter((k) => !propsOrderedByUsage.includes(k))
      .sort(),
  ];

  const header = ["#", "Usages", ...orderedKeys];

  //* first totals row */
  const totals: Record<string, string | number> = {
    "#1": "",
    "#2": "",
  };
  orderedKeys.forEach(
    (k) => (totals[k] = usages.filter((u) => k in u.props).length + "x")
  );

  //* converts rows to flat object for console.table */
  const data = rows.map((r, i) => {
    const obj: Record<string, string | number> = {
      "#": i + 1,
      Usages: r.count,
    };
    orderedKeys.forEach((k) => (obj[k] = k in r.props ? r.props[k] : "-"));
    return obj;
  });

  console.info("\n\n");
  pRow(
    header.map(() => "----------------"),
    "header"
  );
  pRow(header, "header");
  pRow(
    header.map(() => "----------------"),
    "header"
  );
  [totals].forEach((rowObj, idx) => {
    /* mantém a ordem de header — já inclui "#" e "Usages"              */
    const cells = header.map((h) => String(rowObj[h] ?? "-"));
    /* +2 : linha-0 = header, linha-1 = separador; corpo começa em 2    */
    pRow(cells, idx + 2);
  });
  pRow(
    header.map(() => "----------------"),
    "header"
  );

  /* 6 ▸ imprime cada linha (totais + dados) --------------------------- */

  data.forEach((rowObj, idx) => {
    /* mantém a ordem de header — já inclui "#" e "Usages"              */
    const cells = header.map((h) => String(rowObj[h] ?? "-"));
    /* +2 : linha-0 = header, linha-1 = separador; corpo começa em 2    */
    pRow(cells, idx + 2);
  });

  /* 7 ▸ linha final de separação ------------------------------------- */
  pRow(
    header.map(() => "----------------"),
    "header"
  );
  console.info(
    chalk.bgGray(
      chalk.whiteBright("   - #1 ▸ ID of the table row".padEnd(130, " "))
    )
  );
  console.info(
    chalk.bgGray(
      chalk.whiteBright(
        "   - #2 ▸ number of times that combination of props was found in the code".padEnd(
          130,
          " "
        )
      )
    )
  );
  console.info("\n");
};

/* ────────── INTERNAL MENU (after print) ────────────────────────────────── */
const postPrintMenu = async (
  pkgSel: string,
  compSel: string,
  summary: ComponentPropsSummary,
  propsOrderedByUsage: string[]
): Promise<"pkg" | "comp" | "menu"> => {
  const choice = await select({
    message: "Next action:",
    choices: [
      { name: "See props table", value: "table" },
      { name: "Pick another Component", value: "comp" },
      { name: "Pick Another Package", value: "pkg" },
      { name: "return to main menu", value: "menu" },
    ],
  });

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
    return postPrintMenu(pkgSel, compSel, summary, propsOrderedByUsage);
  }

  return choice as "pkg" | "comp" | "menu";
};

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
    propsOrderedByUsage = printFinalSelection(keys, pkgSel, compSel);

    /* 4 ▸ post-print menu ------------------------------------------------ */
    const next = await postPrintMenu(
      pkgSel,
      compSel,
      summary,
      propsOrderedByUsage
    );
    if (next === "menu") break; // returns to main menu
    if (next === "pkg") continue; // restarts flow (goes back to choose pkg)
    if (next === "comp") {
      // goes back to choose component within the same package
      /* inner loop: only changes comp */
      while (true) {
        const compSel2 = (await select({
          message: "📦  To pick:",
          default: compChoices[0].value,
          choices: compChoices,
        })) as `${string}|${string}`;

        console.clear();
        const keys2 = keysPerComp[compSel2] || {};
        printFinalSelection(keys2, pkgSel, compSel2);
        const again = await postPrintMenu(
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

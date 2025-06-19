import { filterWhiteListedProps } from "@/report/utils";
import { ComponentUsage } from "@/types";
import { default as chalk, BackgroundColorName, ColorName } from "chalk";

export type PropRowItem = {
  count: number;
  props: Record<string, string>;
};

const printCustomCliTable = (
  printTable: boolean,
  header: string[],
  totals: Record<string, string | number>,
  data: Record<string, string | number>[],
) => {
  const print = printTable ? console.info : () => {};

  const prepareText = (text: string, isHeader: boolean, i: number) => {
    const dataColumns = i > 1;
    const noData = dataColumns && text === "-";
    const printText =
      text.length > 16 ? `${text.slice(0, 13)}...` : text.padEnd(16);

    if (!dataColumns) {
      return text.padStart(3);
    }

    return noData ? chalk.dim(printText) : chalk.bold(printText);
  };

  const pCell = (t: string, ri: number | string, ci: number) => {
    const noData = t === "-";
    const isHeader = ri === "header";
    const txColor: ColorName = isHeader
      ? "whiteBright"
      : ci === 0
        ? "yellowBright"
        : ci === 1
          ? "blueBright"
          : ci > 2 && t === "-"
            ? "gray"
            : "greenBright";

    return chalk[txColor](prepareText(t, isHeader, ci));
  };

  const pRow = (t: string[], i: number | string) => {
    // const bg = i % 2 === 0 ? "bgGray" : "bgBlack";
    const bg: BackgroundColorName =
      typeof i === "string" ? "bgGray" : "bgBlack";

    const syml = chalk.bgGray(chalk.whiteBright("|"));
    const prefix = `${syml} `;
    const joinner = ` ${syml} `;
    const sufix = ` ${syml}`;

    print(
      chalk[bg](
        `${prefix}${t.map((cell, ci) => pCell(cell, i, ci)).join(joinner)}${sufix}`,
      ),
    );
  };
  const seperatorRow = header.map((_, i) =>
    i > 1 ? "----------------" : "---",
  );

  print("\n\n");
  pRow(seperatorRow, "separator");
  pRow(header, "header");
  pRow(seperatorRow, "separator");
  [totals].forEach((rowObj, idx) => {
    /* mantém a ordem de header — já inclui "#" e "Usages"              */
    const cells = header.map((h) => String(rowObj[h] ?? "-"));
    /* +2 : linha-0 = header, linha-1 = separador; corpo começa em 2    */
    pRow(cells, idx + 2);
  });
  pRow(seperatorRow, "separator");

  /* 6 ▸ imprime cada linha (totais + dados) --------------------------- */
  data.forEach((rowObj, idx) => {
    /* mantém a ordem de header — já inclui "#" e "Usages"              */
    const cells = header.map((h) => String(rowObj[h] ?? "-"));
    /* +2 : linha-0 = header, linha-1 = separador; corpo começa em 2    */
    pRow(cells, idx + 2);
  });

  /* 7 ▸ linha final de separação ------------------------------------- */
  pRow(seperatorRow, "separator");
  print(
    chalk.bgGray(
      chalk.whiteBright("   - #1 ▸ ID of the table row".padEnd(130, " ")),
    ),
  );
  print(
    chalk.bgGray(
      chalk.whiteBright(
        "   - #2 ▸ number of times that combination of props was found in the code".padEnd(
          130,
          " ",
        ),
      ),
    ),
  );
  print("\n");
};

export const buildUsageTable = (
  usages: ComponentUsage[],
  propsSortedByUsage: string[],
  printTable = true,
): {
  rows: PropRowItem[];
  orderedKeys: string[];
} => {
  //* 1 ▸ map canonical-key → {count, props}
  const seen = new Map<string, PropRowItem>();

  usages.forEach((u) => {
    const sortedEntries = Object.entries(filterWhiteListedProps(u.props)).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    const key = JSON.stringify(sortedEntries);
    if (!seen.has(key)) {
      const filteredEntries: [string, any][] = [];
      sortedEntries.forEach(([k, v]) => {
        const filterPropValues: any = {
          key: k,
          value: v,
        };

        if (["onClick"].includes(filterPropValues.key)) {
          filterPropValues.value = true;
        }

        if (["isLoading", "disabled"].includes(filterPropValues.key)) {
          if (!["true", "false"].includes(filterPropValues.value)) {
            filterPropValues.value = "migr8-expression";
          }
        }

        filteredEntries.push([filterPropValues.key, filterPropValues.value]);
      });

      seen.set(key, {
        count: 0,
        props: Object.fromEntries(filteredEntries),
      });
    }
    seen.get(key)!.count++;
  });

  //* 2 ▸ sorts ROWS by number of props (desc) */
  const rows = Array.from(seen.values()).sort(
    (a, b) => Object.keys(b.props).length - Object.keys(a.props).length,
  );

  //* 3 ▸ sorts COLUMNS by number times used (desc) */
  const allPropKeys = new Set<string>();
  rows.forEach((r) => Object.keys(r.props).forEach((k) => allPropKeys.add(k)));

  //* primeiro as props ordenadas por uso, depois quaisquer restantes (alfab.) */
  const orderedKeys = [
    ...propsSortedByUsage.filter((k) => allPropKeys.has(k)),
    ...Array.from(allPropKeys)
      .filter((k) => !propsSortedByUsage.includes(k))
      .sort(),
  ];

  const header = ["#1", "#2", ...orderedKeys];

  //* first totals row */
  const totals: Record<string, string | number> = {};
  orderedKeys.forEach(
    (k) => (totals[k] = usages.filter((u) => k in u.props).length + "x"),
  );

  //* converts rows to flat object for console.table */
  const data = rows.map((r, i) => {
    const obj: Record<string, string | number> = {
      "#1": i + 1,
      "#2": r.count,
    };
    orderedKeys.forEach((k) => (obj[k] = k in r.props ? r.props[k] : "-"));
    return obj;
  });

  printCustomCliTable(printTable, header, totals, data);

  /* ── return data for further processing ─────────────────────────── */
  return { rows, orderedKeys };
};

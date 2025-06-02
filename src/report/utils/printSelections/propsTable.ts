import chalk, { BackgroundColorName, ColorName } from "chalk";
import { ComponentUsage } from "../../../types";
import { filterWhiteListedProps } from "../props";

export type PropRowItem = {
  count: number;
  props: Record<string, string>;
  files: string[];
};

const printCustomCliTable = (
  printTable: boolean,
  header: string[],
  totals: Record<string, string | number>,
  data: Record<string, string | number>[]
) => {
  const print = printTable ? console.info : () => {};
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

    print(
      chalk[bg](
        `${prefix}${t.map((cell, ci) => pCell(cell, i, ci)).join(joinner)}${sufix}`
      )
    );
  };

  print("\n\n");
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
  print(
    chalk.bgGray(
      chalk.whiteBright("   - #1 ▸ ID of the table row".padEnd(130, " "))
    )
  );
  print(
    chalk.bgGray(
      chalk.whiteBright(
        "   - #2 ▸ number of times that combination of props was found in the code".padEnd(
          130,
          " "
        )
      )
    )
  );
  print("\n");
};

export const buildUsageTable = (
  usages: ComponentUsage[],
  propsOrderedByUsage: string[],
  printTable = true
): {
  rows: PropRowItem[];
  orderedKeys: string[];
} => {
  //* 1 ▸ map canonical-key → {count, props}
  const seen = new Map<string, PropRowItem>();

  usages.forEach((u) => {
    const sortedEntries = Object.entries(filterWhiteListedProps(u.props)).sort(
      ([a], [b]) => a.localeCompare(b)
    );
    const key = JSON.stringify(sortedEntries);
    if (!seen.has(key))
      seen.set(key, {
        count: 0,
        props: Object.fromEntries(sortedEntries),
        files: [u.impObj.filePath],
      });
    seen.get(key)!.count++;
    seen.get(key)!.files.push(u.impObj.filePath);
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

  printCustomCliTable(printTable, header, totals, data);

  /* ── return data for further processing ─────────────────────────── */
  return { rows, orderedKeys };
};

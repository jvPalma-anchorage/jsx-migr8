import fs from "node:fs";
/* ------------------------------------------------------------------------- */
/*  Single-pass migrate + dry-run diff                                       */
/* ------------------------------------------------------------------------- */
import { print, types as T, visit } from "recast";

/* ---------- load remap rules (your generator returns the full map) -------- */
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { analyzeJSXElement } from "../analyzer/jsxUsage";
import { getContext, lSuccess } from "../context/globalContext";
import { parseThroughRules } from "../remap/utils/rules";
import { filterWhiteListedProps } from "../report/propsScanner";
import { ComponentUsage, JSXPath } from "../types";
import { makeDiff } from "../utils/diff";
import { getFileCode } from "../utils/pathUtils";

export type JsxData = {
  id: string;
  jsxPath: JSXPath;
  jsxOpening: T.namedTypes.JSXOpeningElement;
  props: ComponentUsage["props"];
  compUsage: ComponentUsage;
};

export type MigrationMapper = {
  [filePath: string]: {
    pkg: string;
    compName: string;
    codeCompare?: {
      ast: T.ASTNode;
      old: string;
      new: string;
    };
    importNode: ComponentUsage["impObj"];
    elements: JsxData[];
  };
};

const populateJsxAstNodes = (
  pkgName: string,
  compName: string,
  compUsage: Pick<ComponentUsage, "props" | "impObj" | "originalProps">,
  migrationMapper: MigrationMapper
) => {
  const filePath = compUsage.impObj.filePath;
  const [ast, oldCode] = getFileCode(filePath);

  if (!migrationMapper[filePath]?.codeCompare) {
    migrationMapper[filePath].codeCompare = {
      ast,
      old: oldCode,
      new: print(ast).code,
    };
  }

  // * we already have all the [imports] AST nodes in the ComponentUsage.impObj
  // * so we can skip the import scanning here

  // * find all [JSX elements] AST nodes with the given component name
  // * and then check if they match the rules
  visit(ast, {
    visitJSXElement(p) {
      const element = analyzeJSXElement(p, filePath, [
        pkgName,
        compUsage.impObj,
      ]);

      if (element) {
        if (
          !migrationMapper[filePath].elements.some((e) => e.id === element.id)
        ) {
          migrationMapper[filePath].elements.push(element);
        }
      }

      this.traverse(p);
    },
  });

  if (migrationMapper[filePath].elements.length === 0) {
    console.info(
      chalk.yellowBright(
        `\n\tNo JSX elements found for ${compName} in ${pkgName} at ${filePath}`
      )
    );
    return;
  }
};

export const migrateComponents = async (changeCode = false) => {
  const { runArgs, PACKAGES, reportComponentUsages: data } = getContext();
  if (!data) {
    return;
  }

  const migrationMapper: MigrationMapper = {};

  let componentsSortedByNumberOfProps: {
    numberOfProps: number;
    pkgName: string;
    compName: string;
    compUsage: ComponentUsage;
  }[] = [];

  PACKAGES.forEach((pkgName) => {
    Object.keys(data[pkgName]).forEach((compName) => {
      data[pkgName][compName]!.forEach((compUsage) => {
        const props = filterWhiteListedProps(compUsage.props || {});

        migrationMapper[compUsage.impObj.filePath] = {
          pkg: pkgName,
          compName: compUsage.local!,
          importNode: compUsage.impObj,
          elements: [],
        };

        componentsSortedByNumberOfProps.push({
          numberOfProps: Object.keys(props).length,
          pkgName,
          compName,
          compUsage: {
            ...compUsage,
            props, // only keep whitelisted props
            originalProps: compUsage.props,
          },
        });
      });
    });
  });

  componentsSortedByNumberOfProps = componentsSortedByNumberOfProps.sort(
    (a, b) => b.numberOfProps - a.numberOfProps
  );

  if (false) {
    const seen = new Set<string>();
    componentsSortedByNumberOfProps.forEach(({ compUsage }) => {
      // stable key: sort prop names so {a:1,b:2} === {b:2,a:1}
      const key = JSON.stringify(
        Object.fromEntries(
          Object.entries(compUsage.props).sort(([k1], [k2]) =>
            k1.localeCompare(k2)
          )
        )
      );

      if (
        !seen.has(key) &&
        compUsage.props.tag &&
        compUsage.props.tag === "a"
      ) {
        seen.add(key);
        console.info(compUsage.props); // ← only printed once per unique prop-set
      }
    });
  }

  componentsSortedByNumberOfProps.forEach(
    ({ pkgName, compName, compUsage }) => {
      populateJsxAstNodes(pkgName, compName, compUsage, migrationMapper);
    }
  );

  Object.entries(migrationMapper).forEach((migrationObj) => {
    const mutated = parseThroughRules(changeCode, migrationObj);
    if (!mutated) {
      return;
    }

    const filePath = migrationObj[1].importNode.filePath;
    const oldCode = migrationObj[1].codeCompare!.old || "1 N/A";
    const newCode = print(migrationObj[1].codeCompare!.ast).code || "2 N/A";

    if (changeCode) {
      fs.writeFileSync(filePath, newCode);
      lSuccess(
        "migrated",
        " (",
        chalk.yellow(migrationObj[1].elements.length),
        ") ",
        chalk.yellow(migrationObj[1].compName),
        " in ",
        chalk.yellow(filePath)
      );
    } else {
      console.info("🎉", makeDiff(filePath, oldCode, newCode, 2));
    }
  });

  if (changeCode || runArgs.debug) {
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

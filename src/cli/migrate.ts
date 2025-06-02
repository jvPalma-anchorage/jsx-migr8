/* ------------------------------------------------------------------------- */
/*  Single-pass migrate + dry-run diff                                       */
/* ------------------------------------------------------------------------- */
import fg from "fast-glob";
import fs from "node:fs";
import path from "node:path";
import { types as T, print, visit } from "recast";
import { getContext, initContext } from "../context/globalContext";

/* ---------- load remap rules (your generator returns the full map) -------- */
import type { NodePath } from "ast-types/lib/node-path";
import chalk from "chalk";
import { getImportDetails } from "../analyzer/imports";
import {
  propsAvailableToRemap,
  remapper,
} from "../remap/common-latitude/Text/index";
import { makeDiff } from "../utils/diff";
import { getFileCode } from "../utils/pathUtils";
import { getPropValue } from "../utils/props";

/* ------------------------------------------------------------------------- */
/*  Initialise scan context                                                  */
/* ------------------------------------------------------------------------- */
initContext();

const { runArgs, PACKAGES, ROOT_PATH, BLACKLIST, TARGET_COMPONENT } =
  getContext();

const REMAP = remapper(PACKAGES[0], TARGET_COMPONENT!);

const shouldLog = {
  noRules: runArgs.yolo ? 0 : 0,
  noAttributes: runArgs.yolo ? 0 : 0,
  noRule: runArgs.yolo ? 0 : 0,
  showIgnoredProps: runArgs.yolo ? 0 : 1,
  migratePossible: runArgs.yolo ? 0 : 0,
  migratePossibleTotal: runArgs.yolo ? 0 : 0,
  successDiff: runArgs.yolo ? 0 : 1,
  successMigration: runArgs.yolo ? 1 : false,
  successFilesChanged: runArgs.yolo ? 0 : false,
};

const ignoredProps: Record<string, string[]> = {};

/* ─────────────────────────────────────────────────────────────── */
const toPrune: Set<string> = new Set();
/* ─────────────────────────────────────────────────────────────── */

const cleanComponentProps = (props: Record<string, string>) => {
  const parsedProps: Record<string, string> = {};
  const ignoredProps: Record<string, string> = {};

  Object.keys(props).forEach((e) => {
    if (propsAvailableToRemap.includes(e)) {
      parsedProps[e] = props[e];
    } else {
      ignoredProps[e] = props[e];
    }
  });

  return [parsedProps, ignoredProps];
};
/* ------------------------------------------------------------------------- */
/*  helpers copied from the previous file                                    */
/* ------------------------------------------------------------------------- */
const sameKeyValues = (
  props: Record<string, string>,
  wanted: Record<string, string | boolean>
) => {
  if (Object.entries(wanted).length === 0) {
    // if no wanted props, then all match
    return true;
  }

  return Object.entries(wanted).every(([k, v]) => props[k] === v);
};

const removeAttr = (o: T.namedTypes.JSXOpeningElement, name: string) =>
  (o.attributes = o.attributes?.filter(
    (a) => !(a.type === "JSXAttribute" && a.name.name === name)
  ));

const upsertAttr = (
  o: T.namedTypes.JSXOpeningElement,
  name: string,
  value: string | boolean,
  b = T.builders
) => {
  removeAttr(o, name);
  o.attributes?.push(
    b.jsxAttribute(
      b.jsxIdentifier(name),
      typeof value === "boolean"
        ? b.booleanLiteral(value)
        : b.stringLiteral(value)
    )
  );
};

const dropSpecifier = (d: T.namedTypes.ImportDeclaration, local: string) => {
  d.specifiers = d.specifiers?.filter(
    (s) => !(s.type === "ImportSpecifier" && s.local?.name === local)
  );
};

const isImportEmpty = (d: T.namedTypes.ImportDeclaration) =>
  !d.specifiers || d.specifiers.length === 0;

const dropSpecifierOrMark = (
  path: NodePath<T.namedTypes.ImportDeclaration>,
  local: string
) => {
  dropSpecifier(path.node, local);
  if (isImportEmpty(path.node)) {
    toPrune.add(print(path.node).code);
  } // defer prune
};

/* every *.ts(x) file under root, obeying blacklist ------------------------ */
const files = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
  cwd: ROOT_PATH,
  absolute: true,
  ignore: BLACKLIST.map((b) => `**/${b}/**`),
});

const migrateIsPossible: any[] = [];
const filesChanged: string[] = [];

/* ------------------------------------------------------------------------- */
/*  MAIN LOOP                                                                */
/* ------------------------------------------------------------------------- */
files.forEach((absPath) => {
  const [ast, origCode] = getFileCode(absPath);

  const importMap = new Map<
    string,
    {
      pkg: string;
      imported: string;
      path: NodePath<T.namedTypes.ImportDeclaration, any>;
    }
  >();

  visit(ast, {
    visitImportDeclaration(p) {
      const importDetails = getImportDetails(p, absPath);
      if (!importDetails) {
        return;
      }

      importDetails.specifiers.forEach((spec) => {
        importMap.set(spec.localName, {
          pkg: importDetails.packageName,
          imported: spec.importedName || spec.localName,
          path: p,
        });
      });
      this.traverse(p);
    },
  });

  /* apply JSX & import changes ------------------------------------------- */
  let mutated = false;
  let canMigrate = undefined;

  visit(ast, {
    visitJSXElement(p) {
      const opener = p.node.openingElement;
      if (opener.name.type !== "JSXIdentifier") return false;

      const localName = opener.name.name;
      const info = importMap.get(localName);
      if (!info) {
        this.traverse(p);
        return false;
      }

      const rules = REMAP;
      if (!rules) {
        shouldLog.noRules &&
          console.info(
            chalk.yellowBright("\tNo rules set for", localName, "in", info.pkg)
          );
        return false;
      }

      /* collect current props (string / boolean / numeric only) ----------- */
      const propsNow: Record<string, string> = {};

      if (opener.attributes) {
        opener.attributes?.forEach((a) => {
          if (a.type === "JSXAttribute" && a.name) {
            if (a.value === null) {
              propsNow[`${a.name.name}`] = "true";
              return;
            }
            // unwrap possible expression container
            const valueNode =
              a.value?.type === "JSXExpressionContainer"
                ? a.value.expression
                : a.value;

            const value = getPropValue(valueNode);
            if (value) propsNow[`${a.name.name}`] = value;
          }
        });
      } else {
        shouldLog.noAttributes &&
          console.info(
            chalk.redBright("\tNo attributes found for", opener, "in", info.pkg)
          );
      }

      // only migrate with the props we support migration
      const [parsedProps, currentIgnoredProps] = cleanComponentProps(propsNow);

      if (Object.keys(currentIgnoredProps).length > 0) {
        Object.entries(currentIgnoredProps).forEach(([k, v]) => {
          if (!ignoredProps[k]) {
            ignoredProps[k] = [v];
          } else {
            ignoredProps[k].push(v);
          }
        });
      }

      const rule = rules.find((r) => sameKeyValues(parsedProps, r.match[0]));
      if (!rule) {
        shouldLog.noRule &&
          console.info(
            chalk.magentaBright(
              "\n\tNo rule combination found for\n\n",
              JSON.stringify(propsNow, null, 2),
              "\n\nin",
              info.pkg
            )
          );

        return false;
      }

      canMigrate = { localName, info, rule };
      shouldLog.migratePossibleTotal &&
        migrateIsPossible.push({ localName, info, rule });

      // ** ---------- Migrate PROPS ------------------------------------ */

      if (rule.remove && rule.remove.length > 0) {
        mutated = true;
        rule.remove.forEach((prop) => {
          removeAttr(opener, prop);
        });
      }
      if (rule.rename && Object.entries(rule.rename).length > 0) {
        mutated = true;
        Object.entries(rule.rename).forEach(([from, to]) => {
          const val = propsNow[from];
          if (val !== undefined) {
            removeAttr(opener, `${from}`);
            upsertAttr(opener, `${to}`, val);
          }
        });
      }
      if (rule.set && Object.entries(rule.set).length > 0) {
        mutated = true;
        Object.entries(rule.set).forEach(([k, v]) => upsertAttr(opener, k, v));
      }

      // ** ---------- Migrate IMPORT STATEMENTS  ---------------------------------- */
      if (rule.importFrom && rule.importTo) {
        mutated = true;
        dropSpecifierOrMark(info.path, localName);

        let targetFound = false;
        visit(ast, {
          visitImportDeclaration(pp) {
            if (
              pp.node.source.value === rule.importTo &&
              pp.node.specifiers?.some(
                (s) =>
                  s.type === "ImportSpecifier" &&
                  s.imported.name === info.imported
              )
            )
              targetFound = true;
            return false;
          },
        });
        if (!targetFound) {
          const b = T.builders;
          const spec = b.importSpecifier(b.identifier(info.imported));
          const decl = b.importDeclaration(
            [spec],
            b.stringLiteral(rule.importTo)
          );
          (ast as any).program.body.unshift(decl);
        }
      }

      return false; // finished this element
    },
  });

  visit(ast, {
    visitImportDeclaration(p) {
      const thisImportStm = print(p.node).code;

      if (toPrune.has(thisImportStm)) {
        p.prune(); // defer prune
        mutated = true;
        return false; // finished this element
      }

      this.traverse(p);
    },
  });

  if (!mutated && canMigrate) {
    console.info(canMigrate);
  }
  /* --------------------------------------------------------------------- */
  /*  WRITE or DIFF                                                        */
  /* --------------------------------------------------------------------- */
  if (!mutated) return; // nothing touched

  const newCode = print(ast).code;
  const relPath = path.relative(ROOT_PATH, absPath);

  filesChanged.push(relPath);

  if (runArgs.yolo) {
    fs.writeFileSync(absPath, newCode);
    shouldLog.successMigration && console.info("✔ migrated", relPath);
  } else {
    shouldLog.successDiff &&
      console.info(chalk.yellow("|\n|\n|\n.... would migrate:\n"), relPath);
    shouldLog.successDiff && console.info(makeDiff(relPath, origCode, newCode));
  }
});

shouldLog.showIgnoredProps &&
  console.info(
    chalk.yellow("🚨 Ignored Props \n", JSON.stringify(ignoredProps, null, 2))
  );

if (filesChanged.length > 0) {
  filesChanged
    .sort((a, b) => a.localeCompare(b))
    .forEach(
      (file) => shouldLog.successFilesChanged && console.info(`♻ ${file}`)
    );

  shouldLog.migratePossible &&
    migrateIsPossible.forEach(({ localName, info, rule }) =>
      console.info(
        chalk.blueBright(
          "\tMigrating",
          localName,
          "in",
          info.pkg
          // "with\n",
          // JSON.stringify(rule.match, null, 2)
        )
      )
    );
  shouldLog.migratePossibleTotal &&
    console.info(
      chalk.blueBright(
        "\tMigration was possible on ",
        migrateIsPossible.length,
        " component implementations"
      )
    );

  console.info(
    chalk.green(`\n\n✔ Successfully migrated ${filesChanged.length} files:\n`)
  );
}

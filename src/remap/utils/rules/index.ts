import fs from "node:fs";
import { print, visit } from "recast";
import { getContext, lWarning } from "../../../context/globalContext";
import { MigrationMapper } from "../../../migrator/types";
import { getCompName } from "../../../utils/pathUtils";
import { RemapRule } from "../../base-remapper";
import { impRemove } from "./impRemove";
import { impSet } from "./impSet";
import { propRemove } from "./propRemove";
import { propSet } from "./propSet";
import { handleReplaceWithJsx } from "./replaceWithJsx";
import { getRuleMatch } from "./ruleMatch";

export const applyRemapRule = (
  changeCode: boolean,
  [filePath, migrationObj]: [string, MigrationMapper[string]]
) => {
  const { compSpec } = getContext();
  let errorOnMigr8FileLoad = false;
  let mutated = false;
  const changed = () => {
    mutated = true;
  };

  let rules: RemapRule<any, any>[] = [];

  const locName = getCompName(
    migrationObj.importNode.localName,
    migrationObj.importNode.importedName,
    migrationObj.importNode.importType
  );
  const migr8FilePath = `./migr8Rules/${locName}-to-${compSpec!.new.compName}-migr8.json`;

  try {
    rules = JSON.parse(fs.readFileSync(migr8FilePath, "utf8"))[
      migrationObj.pkg
    ][locName];
  } catch (_error) {
    lWarning(
      "Loading Migr8 File",
      `could not find file ${migr8FilePath}, or missing definition on 📦 ${migrationObj.pkg} or its component 🧩 ${locName}`
    );
    errorOnMigr8FileLoad = true;
  }

  if (!rules || rules.length === 0) {
    !errorOnMigr8FileLoad &&
      lWarning("No rules", `could not find any rules in ${migr8FilePath}`);
    return mutated;
  }
  const toPrune: Set<string> = new Set();

  migrationObj.elements.forEach((elem) => {
    const rule = getRuleMatch(rules, elem.props);
    if (!rule) return;
    const opener = elem.jsxOpening;

    // *
    // ? REPLACE WITH RULE
    // * This is a special rule that replaces the entire JSX element with a new one.
    // * this one can contain a node.
    // *
    // * We can set props for both the NEW ELEMENT
    // * and for its child node, if it has one.
    // *
    if (rule.replaceWith !== undefined) {
      changed();
      handleReplaceWithJsx(changeCode, {
        rule: rule as any, // this is OK, im tired.
        elem,
        compName: locName,
        filePath,
      });

      return;
    }

    // ** ---------- PROPS [ REMOVE ] ---------------------------------- */
    if (rule.remove && rule.remove.length > 0) {
      rule.remove.forEach((propToRemove) => {
        changed();
        propRemove(opener, propToRemove);
      });
    }
    // ** ---------- PROPS [ RENAME ] ---------------------------------- */
    if (rule.rename && Object.entries(rule.rename).length > 0) {
      Object.entries(rule.rename).forEach(([from, to]) => {
        changed();
        const val = elem.props[from];
        if (val !== undefined) {
          propRemove(opener, `${from}`);
          propSet(opener, `${to}`, val);
        }
      });
    }
    // ** ------------ PROPS [ SET ] ------------------------------------ */
    if (rule.set && Object.entries(rule.set).length > 0) {
      Object.entries(rule.set).forEach(([k, v]) => {
        changed();
        propSet(opener, k, v);
      });
    }
  });

  // ** ---------- IMPORT [  REMOVE COMP IMPORT  FROM OLD PKG  ] ---------------------------- */
  // ** ---------- IMPORT [   ADD   COMP IMPORT   TO  NEW PKG  ] ---------------------------- */
  // ** ---------- IMPORT [ ADD OLD PKG TO PRUNE LIST IF EMPTY ] ---------------------------- */
  migrationObj.elements.forEach((elem) => {
    const rule = getRuleMatch(rules, elem.props);
    if (!rule) return;

    // ** ------ Migrate [ IMPORT STATEMENTS] --------------------------- */
    if (rule.importFrom && rule.importTo) {
      changed();

      const pruneImport = impRemove(
        migrationObj.codeCompare?.ast!,
        migrationObj
      );

      if (!!pruneImport) {
        toPrune.add(pruneImport);
      }

      impSet(migrationObj.codeCompare?.ast!, locName, rule.importTo);
    }
  });

  // ** ---------- IMPORT [  REMOVE OLD PGK IMPORT IF EMPTY ] ---------------------------- */
  if (toPrune.size > 0) {
    visit(migrationObj.codeCompare?.ast!, {
      visitImportDeclaration(p) {
        const thisImportStm = print(p.node).code;

        if (Array.from(toPrune).includes(thisImportStm)) {
          changed();
          p.prune(); // defer prune
          return false; // finished this element
        }

        this.traverse(p);
      },
    });
  }

  return mutated;
};

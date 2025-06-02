import { print, visit } from "recast";
import { MigrationMapper } from "../../../migrator";
import { remapper } from "../../common-latitude/Text";
import { impRemove } from "./impRemove";
import { impSet } from "./impSet";
import { propRemove } from "./propRemove";
import { propSet } from "./propSet";
import { handleReplaceWithJsx } from "./replaceWithJsx";
import { getRuleMatch } from "./ruleMatch";

export const parseThroughRules = (
  changeCode: boolean,
  [filePath, migrationObj]: [string, MigrationMapper[string]]
) => {
  let mutated = false;
  const changed = () => {
    mutated = true;
  };

  const rules = remapper(migrationObj.pkg, migrationObj.compName);
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
        compName: migrationObj.compName,
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

      impSet(
        migrationObj.codeCompare?.ast!,
        migrationObj.importNode.importedName ||
          migrationObj.importNode.localName,
        rule.importTo
      );
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

import { getContext, lWarning } from "@/context/globalContext";
import { MigrationMapper } from "@/migrator/types";
import { Migr8Spec } from "@/report";
import { RemapRule } from "@/remap/base-remapper";
import { print, visit } from "recast";
import { propRemove } from "./propRemove";
import { propSet } from "./propSet";
import { handleReplaceWithJsx } from "./replaceWithJsx";
import { getRuleMatch } from "./ruleMatch";

export const applyRemapRule = (
  changeCode: boolean,
  [fileAbsPath, migrationObj]: [string, MigrationMapper[string]],
  migr8Specs: Migr8Spec,
) => {
  const { graph } = getContext();

  let mutated = false;
  const changed = () => {
    mutated = true;
  };

  const spec = migr8Specs.migr8rules.find(
    (r) =>
      r.package === migrationObj.packageName &&
      r.component === migrationObj.component,
  );

  if (!spec) {
    lWarning(
      "No migr8 rule found",
      `for ${migrationObj.packageName} - ${migrationObj.component}`,
    );
    return false;
  }
  const migr8rules = spec.rules;
  const locName = migrationObj.component;

  const toPrune: Set<string> = new Set();

  migrationObj.elements.forEach((elem) => {
    const rule = getRuleMatch(migr8rules, elem.props);
    if (!rule) return;
    const opener = elem.opener.node.openingElement;

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
        rule: rule as RemapRule & { replaceWith: NonNullable<RemapRule['replaceWith']> },
        elem,
        compName: locName,
        filePath: fileAbsPath,
      });

      return;
    }

    // ** ---------- PROPS [ REMOVE ] ---------------------------------- */
    if (rule.remove && rule.remove.length > 0) {
      rule.remove.forEach((propToRemove) => {
        mutated = true;
        propRemove(opener, propToRemove);
        mutated &&
          console.log(
            `Removed prop "${propToRemove}" from ${locName} in ${fileAbsPath}`,
          );
      });
    }
    // ** ---------- PROPS [ RENAME ] ---------------------------------- */
    if (rule.rename && Object.entries(rule.rename).length > 0) {
      Object.entries(rule.rename).forEach(([from, to]) => {
        mutated = true;
        const val = elem.props[from] as unknown as string | boolean;
        if (val !== undefined) {
          propRemove(opener, `${from}`);
          propSet(opener, `${to}`, val);
        }
        mutated &&
          console.log(
            `Renamed prop "${from}" to "${to}" in ${locName} in ${fileAbsPath}`,
          );
      });
    }
    // ** ------------ PROPS [ SET ] ------------------------------------ */
    if (rule.set && Object.entries(rule.set).length > 0) {
      Object.entries(rule.set).forEach(([k, v]) => {
        mutated = true;
        propSet(opener, k, v);
        mutated &&
          console.log(
            `Set prop "${k}" to "${v}" in ${locName} in ${fileAbsPath}`,
          );
      });
    }
  });

  // ** ---------- IMPORT [  REMOVE COMP IMPORT  FROM OLD PKG  ] ---------------------------- */
  // ** ---------- IMPORT [   ADD   COMP IMPORT   TO  NEW PKG  ] ---------------------------- */
  // ** ---------- IMPORT [ ADD OLD PKG TO PRUNE LIST IF EMPTY ] ---------------------------- */
  migrationObj.elements.forEach((elem) => {
    const rule = getRuleMatch(migr8rules, elem.props);
    if (!rule) return;

    // // ** ------ Migrate [ IMPORT STATEMENTS] --------------------------- */
    // if (rule.importFrom && rule.importTo) {
    //   mutated = true;

    //   const pruneImport = impRemove(
    //     migrationObj.codeCompare?.ast!,
    //     migrationObj
    //   );

    //   if (!!pruneImport) {
    //     toPrune.add(pruneImport);
    //   }

    //   impSet(migrationObj.codeCompare?.ast!, locName, rule.importTo);
    // }
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

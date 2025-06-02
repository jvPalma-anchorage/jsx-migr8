import { parse } from "recast";
import babelParser from "recast/parsers/babel-ts";
import { JSXElement } from "../types";

type RuleMatch = Record<string, string | boolean>;
type RuleSet = Record<string, string | boolean>;

// ---------- Types -----------------------------------------------------------
export type RemapRule<O extends RuleMatch, N extends RuleSet> = {
  /** list of props that must ALL be present with those exact values    */
  match: RuleMatch[];
  /** props to *add* or *replace*                                       */
  set: N;
  /** props to *remove*                                                 */
  remove?: (keyof O)[];
  /** props to *rename*                                                 */
  rename?: Record<keyof O, keyof N>[];
  /** optional import rewriting                                         */
  importFrom?: string;
  importTo?: string;
  replaceWith?: {
    code: string;
    INNER_PROPS?: string[];
  };
};

export type RemapFile<O extends RuleMatch, N extends RuleSet> = {
  [pkg: string]: {
    [component: string]: RemapRule<O, N>[];
  };
};

export const basePropsRemap = <O extends RuleMatch, N extends RuleSet>(
  pks: string[],
  components: Record<string, RemapRule<O, N>[]>[],
): RemapFile<O, N> => {
  const remapRules: RemapFile<O, N> = {};

  pks.forEach((pkg) => {
    remapRules[pkg] = remapRules[pkg] || {};
    components.forEach((comp) => {
      Object.entries(comp).forEach(([compName, rules]) => {
        remapRules[pkg][compName] = rules.map((r) =>
          r.importFrom ? { ...r, importFrom: pkg } : r,
        );
      });
    });
  });

  return remapRules;
};

type RuleMatch = Record<string, any>;
type RuleSet = Record<string, any>;

// ---------- Types -----------------------------------------------------------
export type RemapRule = {
  order: number;
  /** list of props that must ALL be present with those exact values    */
  match: RuleMatch[];
  /** props to *add* or *replace*                                       */
  set?: RuleSet;
  /** props to *remove*                                                 */
  remove?: (keyof RuleMatch)[];
  /** props to *rename*                                                 */
  rename?: Record<keyof RuleMatch, keyof RuleSet>[];
  /** optional import rewriting                                         */
  replaceWith?: {
    code: string;
    INNER_PROPS?: string[];
  };
};

export type RemapFile = {
  [pkg: string]: {
    [component: string]: RemapRule[];
  };
};

export const basePropsRemap = (
  pks: string[],
  components: Record<string, RemapRule[]>[]
): RemapFile => {
  const remapRules: RemapFile = {};

  pks.forEach((pkg) => {
    remapRules[pkg] = remapRules[pkg] || {};
    components.forEach((comp) => {
      Object.entries(comp).forEach(([compName, rules]) => {
        remapRules[pkg][compName] = rules;
      });
    });
  });

  return remapRules;
};

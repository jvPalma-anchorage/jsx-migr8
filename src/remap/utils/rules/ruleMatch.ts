import { JsxUsage } from "@/graph/types";
import { RemapRule } from "@/remap/base-remapper";
import { lWarning } from "../../../context/globalContext";

export const matchesRule = (
  propsNow: JsxUsage["props"],
  matchArr: Record<string, any>[] = []
): boolean => {
  if (matchArr.length === 0) return true; // no conditions → always match

  // split into “positive” and “negative” objects
  const positives = matchArr.filter(
    (obj) => !Object.keys(obj).some((k) => k.startsWith("!"))
  );
  const negatives = matchArr.filter((obj) =>
    Object.keys(obj).some((k) => k.startsWith("!"))
  );

  /* ---------- helpers ---------- */
  const oneObjectIsSatisfied = (obj: Record<string, any>): boolean =>
    Object.entries(obj).every(([k, v]) => {
      const wantPresenceOnly = v === true || v === undefined;
      return wantPresenceOnly
        ? k in propsNow
        : propsNow[k] !== undefined && String(propsNow[k]) === String(v);
    });

  const oneNegatedObjectFails = (obj: Record<string, any>): boolean =>
    Object.entries(obj).every(([rawKey, v]) => {
      const k = rawKey.slice(1); // strip leading '!'
      const wantPresenceOnly = v === true || v === undefined;
      return wantPresenceOnly
        ? !(k in propsNow)
        : !(propsNow[k] !== undefined && String(propsNow[k]) === String(v));
    });

  /* ---------- logic ---------- */
  const positiveOK =
    positives.length === 0 ||
    positives.some((clause) => oneObjectIsSatisfied(clause));

  const negativeOK =
    negatives.length === 0 ||
    negatives.every((clause) => oneNegatedObjectFails(clause));

  return positiveOK && negativeOK;
};

/**
 * 
 * type Migr8Rule = {
    package: string;
    importType: `TODO:${string}` | "named" | "default";
    component: string;
    importTo: {
        importStm: `TODO:${string}` | string;
        component: `TODO:${string}` | string;
        importType: `TODO:${string}` | "named" | "default";
    };
    rules: RemapRule[];
}
 */
export const getRuleMatch = (
  rules: RemapRule[],
  propsNow: JsxUsage["props"]
) => {
  // TODO: REPLACE THIS OLD FILE LOGIC TO MATCH THE NEW MIGR8 RULES
  const rule = rules.find((r) => matchesRule(propsNow, r.match));

  if (rule) {
    return rule;
  }

  if (false) {
    lWarning(`No rule found for \n${JSON.stringify(propsNow, null, 2)} in`);
    return undefined;
  }
  return undefined;
};

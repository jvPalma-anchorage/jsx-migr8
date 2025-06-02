import { RemapFile, RemapRule, basePropsRemap } from "../../base-remapper.ts";

import { customRules } from "./customRules.ts";
import { New } from "./newConstants.ts";
import { Old, OldSizes, OldTypes, oldSizes, oldTypes } from "./oldConstants.ts";
import {
  allPropsCombinationRules,
  commonToLatitude,
} from "./oldToNewPropsMapping.ts";
import { importStmMapper as imp } from "./packages.ts";

/* ------------------------------------------------------------------------- */ /*
    Initialise scan context */
/* ------------------------------------------------------------------------- */
// initContext();

const importStmMapper = Object.keys(imp).length > 0 ? {} : {};

const mapper = (type?: OldTypes, size?: OldSizes): RemapRule | null => {
  const match: any = {};
  const findOldProps: {
    type: OldTypes;
    size: OldSizes;
  } = {
    type: "body",
    size: "medium",
  };

  // *  if prop was passed
  if (Boolean(type)) {
    // *  if prop is valid
    if (oldTypes.includes(type!)) {
      match.type = type!;
      findOldProps.type = type!;
    } else {
      // ! if prop is not an direct replacement
      // return invalidPropValue(
      //   { prop: "type", value: `${type}` },
      //   { prop: "size", value: `${size}` }
      // );
      console.warn(
        `Invalid type prop value: "${type}". Valid values are: ${oldTypes.join(
          ", "
        )}.`
      );
    }
  }

  if (Boolean(size)) {
    if (oldSizes.includes(size!)) {
      match.size = size!;
      findOldProps.size = size!;
    } else {
      // return invalidPropValue(
      //   { prop: "type", value: `${type}` },
      //   { prop: "size", value: `${size}` }
      // );
      console.warn(
        `Invalid type prop value: "${type}". Valid values are: ${oldTypes.join(
          ", "
        )}.`
      );
    }
  }

  const hasVariant = commonToLatitude[findOldProps.type]?.[findOldProps.size];
  if (hasVariant) {
    return {
      order: 999,
      match: [match],
      set: {
        variant: hasVariant,
      },
      remove: Object.keys(match) as (keyof Old)[],
      ...importStmMapper,
    };
  }
  return null;
};

export const propsAvailableToRemap = ["tag", "type", "size"];

export const remapperOld = (PACKAGES: string[]): RemapFile<Old, New> => {
  // * DIRECT PROP REPLACEMENT
  const genericRules: RemapRule[] = [];
  allPropsCombinationRules().forEach(({ type, size }) => {
    const rule = mapper(type, size);
    rule && genericRules.push(rule);
  });

  // const rules = customRules.map((rule) => ({...rule, importFrom: pkg}))

  const components = [
    {
      Text: [...genericRules, ...customRules].sort((a, b) => {
        const aKeys = Object.keys(a.match[0]).length;
        const bKeys = Object.keys(b.match[0]).length;
        return bKeys - aKeys; // Sort by number of matched keys (descending)
      }),
    },
  ];
  return basePropsRemap(PACKAGES, components);
};

export const remapper = (pkg: string, compName: string): RemapRule[] => {
  // * DIRECT PROP REPLACEMENT

  const rules = customRules.map(
    (rule) =>
      ({
        ...rule,
        importFrom: pkg,
      }) as RemapRule
  );

  return rules;
};

(() => {
  const variants = {};

  let counter = 11;

  const rules = [
    //  ? all scenarios where
    //      * Size SET
    //      ! Type = default
    ...oldSizes.map((size) => ({ size })),
    //  ? all scenarios where
    //      ! Size = DETAULT
    //      * Type SET
    ...oldTypes.map((type) => ({ type })),
    //  ? all scenarios where
    //      * Size SET
    //      * Type SET
    ...oldTypes.map((type) => oldSizes.map((size) => ({ size, type }))).flat(),
  ].forEach(({ type, size }) => {
    const rule = mapper(type, size);
    if (!rule) return;

    if (!!variants[rule.set?.variant!]?.length) {
      variants[rule.set?.variant!].push(rule.match[0]);
    } else {
      variants[rule.set?.variant!] = rule.match;
    }
  });

  Object.entries(variants).forEach(([variant, match]) => {
    [
      "@anchorage/common/dist/components/Text",
      "@anchorage/common/dist/components",
    ].forEach((pkg) => {
      console.log({
        order: counter++,
        match: match,
        remove: ["tag", "type", "size"],
        set: {
          variant,
        },
        importFrom: pkg,
        importTo: "@latitude/text",
      });
    });
  });

  // console.dir(variants, { depth: null });
})();

import { NewVariants } from "./newConstants.ts";
import { Old, OldSizes, OldTypes, oldSizes, oldTypes } from "./oldConstants";

export const commonToLatitude: {
  [_type in OldTypes]: Partial<{
    [_size in OldSizes]: NewVariants;
  }>;
} = {
  heading: {
    // huge: "no match",
    huge: "headingLarge", //! NO DIRECT MATCH
    large: "headingLarge",
    medium: "headingMedium",
    small: "headingSmall",
  },
  label: {
    medium: "labelMedium", //! NO DIRECT MATCH
    small: "labelMedium",
    tiny: "labelSmall",
  },
  body: {
    large: "headingSmall", //! NO DIRECT MATCH
    medium: "headingTiny", //! NO DIRECT MATCH
    small: "bodyRegular",
    tiny: "bodyMedium", //! NO DIRECT MATCH
  },
  link: {
    medium: "link", //! NO DIRECT MATCH
    tiny: "link", //! NO DIRECT MATCH
  },
  metric: {
    large: "metricHuge",
    medium: "metricLarge",
    small: "metricMedium",
    tiny: "metricSmall",
  },
  mono: {
    medium: "snippetRegular",
    small: "snippetRegular",
    tiny: "snippetMedium",
  },
};

export const allPropsCombinationRules = (): Old[] => {
  return [
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
  ];
};

export const newVariants = [
  "headingTiny",
  "headingSmall",
  "headingMedium",
  "headingLarge",
  "bodyRegular",
  "bodyMedium",
  "bodyBold",
  "captionRegular",
  "captionMedium",
  "captionBold",
  "displaySmall",
  "displayMedium",
  "displayLarge",
  "displayHuge",
  "link",
  "linkStandalone",
  "metricTiny",
  "metricSmall",
  "metricMedium",
  "metricLarge",
  "metricHuge",
  "labelSmall",
  "labelMedium",
  "snippetRegular",
  "snippetMedium",
  "snippetBold",
] as const;

export type NewVariants = (typeof newVariants)[number];

export type New = {
  color?: string;
  variant?: NewVariants;
  asChild?: boolean;
};

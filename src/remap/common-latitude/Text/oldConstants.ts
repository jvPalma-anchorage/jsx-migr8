export const oldTypes = [
  "body",
  "heading",
  "label",
  "link",
  "metric",
  "mono",
] as const;
export const oldSizes = ["huge", "large", "medium", "small", "tiny"] as const;

export type OldTypes = (typeof oldTypes)[number];
export type OldSizes = (typeof oldSizes)[number];

export type Old = {
  color?: string;
  tag?: string;
  type?: OldTypes;
  size?: OldSizes;
};

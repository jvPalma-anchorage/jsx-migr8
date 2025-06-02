export const sortNumberDesc =
  <T extends Record<string, any>>(propToSort: keyof T) =>
  (a: T, b: T) =>
    (b[propToSort] as number) - (a[propToSort] as number);

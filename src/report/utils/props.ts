export const filterWhiteListedProps = (props: Record<string, string>) => {
  const propsToSafelyIgnore = [
    "className",
    "data-testid",
    "id",
    "style",
    "key",
  ];
  return Object.fromEntries(
    Object.entries(props)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([k]) => !propsToSafelyIgnore.includes(k)),
  );
};

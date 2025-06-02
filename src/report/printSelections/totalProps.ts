import chalk from "chalk";

export const printTotalProps = (
  keys: Record<string, string[]>,
  packageToScan: string,
  selectedComponent: string
): [string[], string] => {
  const propsOrderedByUsage: string[] = [];
  const printLines = [
    `${chalk.white("📦  Package:")} ${chalk.greenBright(packageToScan)}`,
    `${chalk.white("🧩  Component:")} ${chalk.greenBright(selectedComponent)}`,
  ];

  Object.entries(keys)
    .sort(([, a], [, b]) => b.length - a.length)
    .forEach(([propKey, values]) => {
      propsOrderedByUsage.push(propKey);

      printLines.push(
        `${chalk.blueBright("Prop:")} ${chalk.whiteBright(propKey.padEnd(16))} ${chalk.greenBright(`${values.length}x`)}`
      );
    });

  return [propsOrderedByUsage, printLines.join("\n")];
};

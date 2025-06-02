import chalk from "chalk";
import { ALL_COMPS, ALL_PKS } from "../constants";

export const printTotalProps = (
  keys: Record<string, string[]>,
  packageToScan: string,
  selectedComponents: string
) => {
  const propsOrderedByUsage: string[] = [];

  Object.entries(keys)
    .sort(([, a], [, b]) => b.length - a.length)
    .forEach(([propKey, values]) => {
      propsOrderedByUsage.push(propKey);

      const pkgLabel =
        packageToScan === ALL_PKS
          ? chalk.greenBright("All packages")
          : `${chalk.blueBright("📦  Package:")} ${chalk.greenBright(packageToScan)}`;
      const compLabel = selectedComponents.includes(ALL_COMPS)
        ? chalk.yellowBright("| All components")
        : `${chalk.blueBright("| 🧩 Component:")} ${chalk.yellowBright(packageToScan)}`;

      console.info(
        pkgLabel,
        compLabel,
        chalk.blueBright("| Prop:"),
        chalk.whiteBright(propKey.padEnd(16)),
        chalk.greenBright(`${values.length}x`)
      );
    });

  return propsOrderedByUsage;
};

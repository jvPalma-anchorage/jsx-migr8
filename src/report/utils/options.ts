import { ComponentPropsSummary } from "../../types";
import { OptionValue } from "../types";
import { ALL_COMPS, ALL_PKS } from "./constants";
import { filterWhiteListedProps } from "./props";

const allPkgsOption: OptionValue = {
  name: `All - All the packages below`,
  value: ALL_PKS,
  description: "Select all packages",
  short: "📦 All packages",
};

/** Given the usages, returns the package options array (first SELECT) */
export const buildPkgOptions = (
  summary: ComponentPropsSummary
): OptionValue[] => {
  const pkgOptions: OptionValue[] = [allPkgsOption];

  Object.keys(summary).forEach((pkgName, idx) => {
    pkgOptions.push({
      name: `[${idx + 1}] - ${pkgName}`,
      value: pkgName,
      short: `🧩 ${pkgName}`,
    });
  });

  return pkgOptions;
};

/** Builds component options map and props → values map */
export const buildComponentMaps = (summary: ComponentPropsSummary) => {
  /** compPkgOptions[pkg] = second SELECT options (components) */
  const compPkgOptions: Record<string, OptionValue[]> = {
    [ALL_PKS]: [
      {
        name: `All components found for all packages!`,
        value: `${ALL_PKS}|${ALL_COMPS}`,
        short: `🧩 All Components from 📦 All Packages`,
      },
    ],
  };

  /** keysPerComp[pkg|comp] = { propKey: [values…] } */
  const keysPerComp: Record<string, Record<string, string[]>> = {};

  Object.entries(summary).forEach(([pkgName, compObj], pIdx) => {
    const compKeyAll = `${pkgName}|${ALL_COMPS}` as const;
    /* initializes list for the package, with "All components …" option */
    compPkgOptions[pkgName] = [
      {
        name: `All components found for package [${pkgName}]`,
        value: compKeyAll,
        short: `🧩 All Components from 📦 ${pkgName} package`,
      },
    ];

    Object.entries(compObj).forEach(([compName, usages], cIdx) => {
      const keyAllAll = `${ALL_PKS}|${ALL_COMPS}` as const;
      const compKey = `${pkgName}|${compName}` as const;

      const opt: OptionValue = {
        name: `[${pIdx + 1}.${cIdx + 1}] - ${compName}`,
        description: `Component [ ${compName} ] from ${pkgName} package`,
        value: compKey,
        short: `🧩 ${compName} Component from 📦 ${pkgName} package`,
      };

      compPkgOptions[ALL_PKS].push(opt);
      compPkgOptions[pkgName].push(opt);

      usages.forEach(({ props }) => {
        const parsed = filterWhiteListedProps(props);
        Object.entries(parsed).forEach(([propKey, propVal]) => {
          for (const key of [keyAllAll, compKeyAll, compKey]) {
            (keysPerComp[key] = keysPerComp[key] || {})[propKey] ??= [];
            keysPerComp[key][propKey].push(propVal);
          }
        });
      });
    });
  });

  return { compPkgOptions, keysPerComp };
};

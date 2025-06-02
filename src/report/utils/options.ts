import { ComponentPropsSummary } from "../../types";
import { OptionValue } from "../types";
import { filterWhiteListedProps } from "./props";

/** Given the usages, returns the package options array (first SELECT) */
export const buildPkgOptions = (
  summary: ComponentPropsSummary
): OptionValue[] => {
  const pkgOptions: OptionValue[] = [];

  const lastSrtOrder = [
    "../../../../../../",
    "../../../../../",
    "../../../../",
    "../../../",
    "../../",
    "../",
    "./",
    ".",
  ];
  Object.keys(summary)
    .sort((a, b) => {
      const aIsAt = a.startsWith("@");
      const bIsAt = b.startsWith("@");
      const aIsRelative = a.startsWith(".");
      const bIsRelative = b.startsWith(".");

      // @ packages come first
      if (aIsAt && !bIsAt) return -1;
      if (!aIsAt && bIsAt) return 1;

      // Relative paths come last
      if (!aIsRelative && bIsRelative) return -1;
      if (aIsRelative && !bIsRelative) return 1;

      // Both are relative paths - sort by depth (fewer ../ first)
      if (aIsRelative && bIsRelative) {
        const aIndex = lastSrtOrder.findIndex((s) => a.startsWith(s));
        const bIndex = lastSrtOrder.findIndex((s) => b.startsWith(s));
        if (aIndex !== -1 && bIndex !== -1) {
          return bIndex - aIndex; // reverse order for relative paths
        }
      }

      // Default alphabetical sort
      return a.localeCompare(b);
    })
    .forEach((pkgName, idx) => {
      pkgOptions.push({
        name: `[${idx + 1}]`.padStart(5, " ") + ` - ${pkgName}`,
        value: pkgName,
        short: `📦 ${pkgName}`,
      });
    });

  return pkgOptions;
};

/** Builds component options map and props → values map */
export const buildComponentMaps = (summary: ComponentPropsSummary) => {
  /** compPkgOptions[pkg] = second SELECT options (components) */
  const compPkgOptions: Record<string, OptionValue[]> = {};

  /** keysPerComp[pkg|comp] = { propKey: [values…] } */
  const keysPerComp: Record<string, Record<string, string[]>> = {};

  Object.entries(summary).forEach(([pkgName, compObj], pIdx) => {
    compPkgOptions[pkgName] = [];

    Object.entries(compObj).forEach(([compName, usages], cIdx) => {
      const compKey = `${pkgName}|${compName}` as const;

      const opt: OptionValue = {
        name: `[${pIdx + 1}.${cIdx + 1}]`.padStart(5, " ") + ` - ${compName}`,
        value: compKey,
        short: `${compName} from ${pkgName}`,
        description: `🧩 ${compName}  from  📦 ${pkgName}`,
      };

      compPkgOptions[pkgName].push(opt);

      usages.forEach(({ props }) => {
        const parsed = filterWhiteListedProps(props);
        Object.entries(parsed).forEach(([propKey, propVal]) => {
          (keysPerComp[compKey] = keysPerComp[compKey] || {})[propKey] ??= [];
          keysPerComp[compKey][propKey].push(propVal);
        });
      });
    });
  });

  return { compPkgOptions, keysPerComp };
};

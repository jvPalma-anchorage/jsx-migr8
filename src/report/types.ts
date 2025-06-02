import { RemapRule } from "@/remap/base-remapper";
import { ComponentPropsSummary } from "@/types";

export type Migr8Rule = {
  package: string; // importFrom
  importType: `TODO:${string}` | "named" | "default";
  component: string;
  importTo: {
    // importTo
    importStm: `TODO:${string}` | string;
    component: `TODO:${string}` | string;
    importType: `TODO:${string}` | "named" | "default";
  };
  rules: RemapRule[];
};

export type Migr8Spec = {
  lookup: {
    rootPath: string; // where we scan
    packages: string[]; // 0-N pkgs to match; empty ⇒ “any pkg”
    components: string[]; // 0-N names; empty ⇒ “any component”
  };
  migr8rules: Migr8Rule[];
};
export type PropsToRules = {
  summary: ComponentPropsSummary;
  pkgSel: string[];
  compSel: string[];
  propsSorted: string[];
};

export type OptionValue = {
  value: string;
  name?: string;
  description?: string;
  short?: string;
  disabled?: boolean | string;
  type?: never;
  pkg?: string;
};

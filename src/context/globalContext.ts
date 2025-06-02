import fs from "node:fs";
import path from "node:path";
import { argv } from "../cli/config";

import { loadImportASTNodes } from "../analyzer/fileAnalyzer";
import type {
  ComponentPropsSummary,
  ComponentSpec,
  GlobalReport,
  GlobalState,
} from "../types";
import { getLoggers } from "../utils/logger";
const QUEUE_COMPONENT_SPEC_DIR = "./queue";

const state: GlobalState = {
  ROOT_PATH: "",
  TARGET_COMPONENT: undefined,
  BLACKLIST: [],
  PACKAGES: [],
  report: {},
  QUEUE_COMPONENT_SPEC_DIR,
  QUEUE_COMPONENT_SPEC: `${QUEUE_COMPONENT_SPEC_DIR}/component-spec.json`,
  compSpec: undefined,
  REPORT_GLOBAL_USAGE: `${QUEUE_COMPONENT_SPEC_DIR}/usage.json`,
  reportGlobalUsage: undefined,
  REPORT_COMPONENT_USAGES: `${QUEUE_COMPONENT_SPEC_DIR}/props-usage.json`,
  reportComponentUsages: undefined,
  runArgs: argv,
};

const { logger, lSuccess, lError, lInfo, lDbug, lWarning } = getLoggers(argv);

const getInitialFromArgs = () => {
  const ROOT_PATH = path.resolve(argv.root || process.cwd());
  const BLACKLIST = ((argv.blacklist as string) ?? "").split(",");

  return { ROOT_PATH, BLACKLIST };
};

/** Initialize once at CLI bootstrap */
export function initContext(): void {
  lInfo("Init app Context");

  const { ROOT_PATH, BLACKLIST } = getInitialFromArgs();

  state.ROOT_PATH = ROOT_PATH;
  state.BLACKLIST = BLACKLIST;

  try {
    const compSpecRaw = JSON.parse(
      fs.readFileSync(state.QUEUE_COMPONENT_SPEC, "utf8")
    );
    // split by comma, sort by length Bigger first
    const pkgs: string[] = compSpecRaw.old.oldImportPath
      .split(",")
      .sort((a: string, b: string) => b.length - a.length);

    compSpecRaw.old.oldImportPath = pkgs;
    state.compSpec = {
      ...compSpecRaw,
    } as ComponentSpec;

    state.PACKAGES = state.compSpec.old.oldImportPath;
    state.TARGET_COMPONENT = state.compSpec.old.compName;

    for (const pkg of pkgs) {
      state.report[pkg] = {};
    }

    lInfo("Component Spec", "✅ Found Component spec");
  } catch (_error) {
    lWarning("Component Spec", "🚧 No Component spec found");

    state.compSpec = undefined;
  }

  try {
    const reportGlobalUsageRaw = JSON.parse(
      fs.readFileSync(state.REPORT_GLOBAL_USAGE, "utf8")
    );

    state.reportGlobalUsage = {
      ...reportGlobalUsageRaw,
    } as GlobalReport;
    lInfo("Global Usage", "✅ Found global usage report");
  } catch (_error) {
    lWarning("Global Usage", "🚧 No global usage report found");

    state.reportGlobalUsage = undefined;
  }

  try {
    const reportComponentUsagesRaw = JSON.parse(
      fs.readFileSync(state.REPORT_COMPONENT_USAGES, "utf8")
    );

    state.reportComponentUsages = {
      ...reportComponentUsagesRaw,
    } as ComponentPropsSummary;

    loadImportASTNodes();
    lInfo("Comp Usage", "✅ Report found");
  } catch (_error) {
    lWarning("Comp Usage", "🚧 No report found");
    state.reportComponentUsages = undefined;
  }
}

/** Access anywhere */
export function getContext(): GlobalState {
  return state;
}

export { lDbug, lError, lInfo, lSuccess, lWarning, logger };

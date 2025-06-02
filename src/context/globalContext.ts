import path from "node:path";
import { argv } from "../cli/config";

import { buildGraph } from "../graph/buildGraph";
import type { GlobalState } from "../types";
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
  runArgs: argv,
};

const { logger, lSuccess, lError, lInfo, lDbug, lWarning } = getLoggers(argv);

export const getRootPath = () => path.resolve(argv.root || process.cwd());

const getInitialFromArgs = () => {
  const ROOT_PATH = getRootPath();
  const BLACKLIST = ((argv.blacklist as string) ?? "").split(",");

  return { ROOT_PATH, BLACKLIST };
};

/** Initialize once at CLI bootstrap */
export async function initContext(): Promise<void> {
  lInfo("Init app Context");

  const { ROOT_PATH, BLACKLIST } = getInitialFromArgs();

  state.ROOT_PATH = ROOT_PATH;
  state.BLACKLIST = BLACKLIST;
  state.graph = await buildGraph(state.ROOT_PATH, state.BLACKLIST);
}

/** Access anywhere */
export function getContext(): GlobalState {
  return state;
}

export { lDbug, lError, lInfo, lSuccess, lWarning, logger };

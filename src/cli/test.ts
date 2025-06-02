import { getContext, initContext } from "../context/globalContext";

import { remapper } from "../remap/common-latitude/Text/index";

initContext();

const { PACKAGES } = getContext();

const REMAP = remapper(PACKAGES[0], "Text");

console.info(JSON.stringify(REMAP, null, 2));

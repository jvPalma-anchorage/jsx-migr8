import { RemapRule } from "../../base-remapper";
import { importStmMapper as imp } from "./packages.ts";

const importStmMapper = Object.keys(imp).length > 0 ? {} : {};

export const customRules: RemapRule[] = [
  {
    order: 1,
    /* 1️⃣  --- WHEN does the rule fire? ---------------------------------- */
    /*     Any *one* of these objects needs to match (= OR between them).
     *     Inside an object every entry must match (= AND).
     *
     *     true  => “prop must exist (any value)”
     *     !prop => negative match handled by the migrator (see last msg)
     */
    match: [
      { tag: "a" }, // covers most cases
      // { tag: "a", size: "small", type: "link" }, // explicit small
      // { tag: "a", size: true, type: "link" }, // “size” present, any value
    ],

    /* 2️⃣  --- props to REMOVE from the outer <Text …> ------------------- */
    remove: ["tag", "type", "size"], // we replace them

    /* 3️⃣  --- props to SET / OVERRIDE on the outer <Text …> ------------- */
    set: {
      asChild: true, // <Text asChild …>
      variant: "linkStandalone", // variant="link"
      color: "info", // color="primary"
    },

    /* 4️⃣  --- full replacement snippet (placeholders handled by migrator)
     *     {OUTER_PROPS}   → the surviving/added props of <Text>
     *     {INNER_PROPS}   → target / rel / href / onClick if they exist
     *     {CHILDREN}      → original JSX children
     */
    replaceWith: {
      INNER_PROPS: ["target", "rel", "href", "onClick"],
      code: `
  <Text {...OUTER_PROPS}>
    <a {...INNER_PROPS}>
      {CHILDREN}
    </a>
  </Text>
`,
    },

    /* 5️⃣  --- import rewiring ------------------------------------------ */
    importFrom: "@anchorage/common/dist/components",
    importTo: "@latitude/text",
  },
  // {
  //   match: [{}],
  //   remove: [],
  //   set: {},
  //   ...importStmMapper,
  // },
  // {
  //   match: [{ tag: "a", size: true, type: true }],
  //   remove: [],
  //   set: {},
  //   replaceWith: `
  //     <Text>
  //       <a>
  //       {CHILDREN}
  //       </a>
  //     </Text>
  //   `,
  //   importFrom: OLD_PACKAGE,
  //   importTo: NEW_PACKAGE,
  // },
  {
    order: 2,
    match: [{ color: "muted", size: "small" }],
    remove: ["color", "size"],
    set: {
      variant: "bodyRegular",
    },
    importFrom: "OLD_PACKAGE",
    importTo: "NEW_PACKAGE",
  },
];

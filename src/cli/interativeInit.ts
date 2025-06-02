/**********************************************************************
 *  src/cli/findInteractive.ts
 *********************************************************************/
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import { GlobalState } from "../types";
import { makeDiff } from "../utils/diff";

export const showCompSpecDiff = (
  {
    importType,
    compName,
    oldPkgs,
    migrateTo,
    newPkg,
  }: {
    importType: string;
    compName: string;
    oldPkgs: string[];
    migrateTo: string;
    newPkg: string;
  },
  print = true
) => {
  /* ------------------------------------------------------------------ */
  /*  4. Show coloured Git-style diff preview                           */
  /* ------------------------------------------------------------------ */
  const beforeExample = `
import ${importType === "default" ? compName : `{ ${compName} }`} from '${oldPkgs[0] || "old-dep"}';
import { ${compName} as RenamedComp, OtherComponent } from '${oldPkgs[1] || "other-dep"}';

export const Demo = () => (
  <${compName} importedFrom="${oldPkgs[0] || "old-dep"}">
    This is a cool
    <RenamedComp importedFrom="${oldPkgs[1] || "other-dep"}">
      Migration Tool 😎
    </RenamedComp>
  </${compName}>
);
`;

  const afterExample = `
import ${importType === "default" ? migrateTo : `{ ${migrateTo} }`} from '${newPkg}';
import { OtherComponent } from '${oldPkgs[1] || "other-dep"}';

export const Demo = () => (
  <${migrateTo} importedFrom="${newPkg}">
    This is a cool
    <${migrateTo} importedFrom="${newPkg}">
      Migration Tool 😎
    </${migrateTo}>
  </${migrateTo}>
);
`;

  const diff = makeDiff("./Demo.tsx", beforeExample, afterExample);
  if (print) {
    console.info(diff);
  } else {
    return diff;
  }
};

/* ------------------------------------------------------------------ */
/*  2. Interactive wizard                                             */
/* ------------------------------------------------------------------ */
export async function wizard(ctx: GlobalState) {
  const { compSpec, QUEUE_COMPONENT_SPEC_DIR, QUEUE_COMPONENT_SPEC } = ctx;

  console.info(chalk.cyanBright("\n✨  Interactive component scanner  ✨\n"));

  /* ── 2.1  component name                                            */
  const compName = await input({
    message: "🔍 Component name to search (e.g. Text):",
    validate: (v) => (!!v.trim() ? true : "Please type a component name"),
    default: compSpec?.old?.compName || "",
    transformer: (v) => v.trim(),
  });

  /* ── 2.2  target component name                                     */
  const migrateTo = await input({
    message: `🚚  Migrate ${chalk.yellow(compSpec?.new?.compName || compName)} ➜  (leave empty for same)`,
    default: compSpec?.new?.compName || compName,
    transformer: (v) => v.trim(),
  });

  /* ── 2.3  old import sources (multi-line, finish with empty line)   */
  console.info(
    chalk.green(
      "\n↩︎  Type ALL packages that currently export the component.\n" +
        "    Hit Enter on an empty line to finish:"
    )
  );
  const oldPkgs: string[] = compSpec?.old.oldImportPath || [];

  while (true) {
    if (oldPkgs.length > 0) {
      console.info(chalk.green("   • Current packages:"));
      oldPkgs.forEach((pkg) => console.info(`     - ${pkg}`));
    }
    const ans = await input({ message: "   • " });
    if (!ans.trim()) break;
    oldPkgs.push(ans.trim());
  }

  /* ── 2.4  new import source                                         */
  const newPkg = await input({
    message: `📦  Set the NEW import for ${chalk.yellow(migrateTo)} :`,
    default: compSpec?.new.newImportPath || "",
    validate: (v) => (!!v.trim() ? true : "Package name required"),
  });

  /* ── 2.5  import type (named or default)                            */
  const importType = await select({
    message: "🔗  Import type:",
    default: "named",
    choices: [
      {
        name: `named   - import { ${migrateTo} } from '${newPkg}'`,
        value: "named",
      },
      {
        name: `default - import ${migrateTo} from '${newPkg}'`,
        value: "default",
      },
    ],
  });

  /* ------------------------------------------------------------------ */
  /*  3. Persist answers                                                */
  /* ------------------------------------------------------------------ */
  const payload = {
    old: {
      oldImportPath: oldPkgs.sort((a, b) => b.length - a.length).join(","),
      compName,
    },
    new: {
      newImportPath: newPkg,
      importType,
      compName: migrateTo,
    },
  };

  fs.mkdirSync(QUEUE_COMPONENT_SPEC_DIR, { recursive: true });

  fs.writeFileSync(
    QUEUE_COMPONENT_SPEC,
    JSON.stringify(payload, null, 2),
    "utf8"
  );

  console.info(
    chalk.magentaBright(
      "\n📜  Preview of the transformation (context = 3 lines):\n"
    )
  );

  showCompSpecDiff({
    importType,
    compName,
    oldPkgs,
    migrateTo,
    newPkg,
  });

  console.info(
    chalk.greenBright(
      `\n\n✅  Saved to ${path.relative(process.cwd(), QUEUE_COMPONENT_SPEC)}\n`
    )
  );
}

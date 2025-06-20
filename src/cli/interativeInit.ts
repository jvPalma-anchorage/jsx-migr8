/**********************************************************************
 *  src/cli/findInteractive.ts
 *********************************************************************/
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import { GlobalState } from "../types";
import { makeDiff } from "../utils/diff";
import { 
  secureComponentNameInput, 
  securePackageNameInput, 
  secureSelect,
  securePackageCollection 
} from "./secure-prompts";
import { logSecurityEvent, sanitizers } from "../validation";

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
  print = true,
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
export const wizard = async (ctx: GlobalState) => {
  const { compSpec, QUEUE_COMPONENT_SPEC_DIR, QUEUE_COMPONENT_SPEC } = ctx;

  logSecurityEvent(
    'interactive-wizard-start',
    'info',
    'Starting interactive component scanner wizard'
  );

  console.info(chalk.cyanBright("\n✨  Interactive component scanner  ✨\n"));

  /* ── 2.1  component name                                            */
  const compName = await secureComponentNameInput({
    message: "🔍 Component name to search (e.g. Text):",
    default: compSpec?.old?.compName || "",
  });

  /* ── 2.2  target component name                                     */
  const migrateTo = await secureComponentNameInput({
    message: `🚚  Migrate ${chalk.yellow(compSpec?.new?.compName || compName)} ➜  (leave empty for same)`,
    default: compSpec?.new?.compName || compName,
    allowEmpty: true,
  });

  const finalMigrateTo = migrateTo || compName;

  /* ── 2.3  old import sources (multi-line, finish with empty line)   */
  console.info(
    chalk.green(
      "\n↩︎  Type ALL packages that currently export the component.\n" +
        "    Hit Enter on an empty line to finish:",
    ),
  );
  
  const existingPackages = compSpec?.old.oldImportPath ? 
    compSpec.old.oldImportPath.split(',').map(p => p.trim()).filter(p => p.length > 0) : 
    [];
  
  const oldPkgs = await securePackageCollection("   • ", existingPackages);

  if (oldPkgs.length === 0) {
    console.warn(chalk.yellow("⚠️ No packages specified. Adding a placeholder."));
    oldPkgs.push("@placeholder/package");
  }

  /* ── 2.4  new import source                                         */
  const newPkg = await securePackageNameInput({
    message: `📦  Set the NEW import for ${chalk.yellow(finalMigrateTo)} :`,
    default: compSpec?.new.newImportPath || "",
  });

  /* ── 2.5  import type (named or default)                            */
  const importType = await secureSelect({
    message: "🔗  Import type:",
    default: "named",
    choices: [
      {
        name: `named   - import { ${finalMigrateTo} } from '${newPkg}'`,
        value: "named",
      },
      {
        name: `default - import ${finalMigrateTo} from '${newPkg}'`,
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
      compName: finalMigrateTo,
    },
  };

  try {
    // Validate the payload before writing
    const sanitizedPayload = {
      old: {
        oldImportPath: sanitizers.string(payload.old.oldImportPath),
        compName: sanitizers.componentName(payload.old.compName),
      },
      new: {
        newImportPath: sanitizers.packageName(payload.new.newImportPath),
        importType: payload.new.importType,
        compName: sanitizers.componentName(payload.new.compName),
      },
    };

    fs.mkdirSync(QUEUE_COMPONENT_SPEC_DIR, { recursive: true });

    fs.writeFileSync(
      QUEUE_COMPONENT_SPEC,
      JSON.stringify(sanitizedPayload, null, 2),
      "utf8",
    );

    logSecurityEvent(
      'interactive-wizard-complete',
      'info',
      'Component specification saved successfully',
      { 
        componentName: sanitizedPayload.old.compName,
        targetName: sanitizedPayload.new.compName,
        packageCount: oldPkgs.length
      }
    );
  } catch (error) {
    logSecurityEvent(
      'interactive-wizard-error',
      'error',
      'Failed to save component specification',
      { error: error instanceof Error ? error.message : String(error) }
    );
    throw error;
  }

  console.info(
    chalk.magentaBright(
      "\n📜  Preview of the transformation (context = 3 lines):\n",
    ),
  );

  showCompSpecDiff({
    importType,
    compName,
    oldPkgs,
    migrateTo: finalMigrateTo,
    newPkg,
  });

  console.info(
    chalk.greenBright(
      `\n\n✅  Saved to ${path.relative(process.cwd(), QUEUE_COMPONENT_SPEC)}\n`,
    ),
  );
};

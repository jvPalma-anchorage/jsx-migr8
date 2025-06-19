import chalk from "chalk";

export const MAIN_MENU_OPTIONS = {
  welcomeHeader: `
${chalk.blueBright(`Welcome to the ${chalk.cyanBright(chalk.bold("JSX Migr8"))} CLI!`)}

${chalk.green("   📂 Codebase entry point: ROOTPATH")}
${chalk.green("   🔍 Scanning codebase ...")}`,
  showProps: {
    name: "🔍  Inspect components",
    value: "showProps",
    description: chalk.cyanBright(`
📦  Pick any ${chalk.bold("packages")} found in the provided ROOT PATH
🧩  and select any ${chalk.bold("components")} they provide.
🧮  Proceed with checking their props and select what you need for the
🎉  ${chalk.bold("Migr8 file")} with matching rules for each implementation!
`),
  },
  dryRun: {
    name: "🧪  Dry-run migration (diff only)",
    value: "dryRun",
  },
  migrate: {
    name: "🚀  Migrate code for real (YOLO)",
    value: "migrate",
  },
  backupManagement: {
    name: "📦  Backup Management",
    value: "backupManagement",
    description: chalk.cyanBright(
      "Create, list, verify, and manage code backups",
    ),
  },
  rollbackMenu: {
    name: "🔄  Rollback Migration",
    value: "rollbackMenu",
    description: chalk.cyanBright("Restore code from previous backups"),
  },
  exit: { name: "⏹  Exit", value: "exit" },
};

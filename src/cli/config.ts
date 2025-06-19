import { config } from "dotenv";
import { default as yargs } from "yargs";
import { hideBin } from "yargs/helpers";

config();

export const argv = yargs(hideBin(process.argv))
  .option("root", {
    alias: "r",
    type: "string",
    default: process.env.ROOT_PATH,
    describe: "Root folder to scan",
  })
  .option("blacklist", {
    alias: "b",
    type: "string",
    default: process.env.BLACKLIST,
    describe: "Comma-separated folders to ignore",
  })
  .option("interative", {
    alias: "i",
    type: "boolean",
    default: false,
    describe: "Redefine the migration reports for a nre component",
  })
  .option("showProps", {
    alias: "sp",
    type: "boolean",
    default: false,
    describe: "Show the props of the reports made",
  })
  .option("yolo", {
    alias: "y",
    type: "boolean",
    default: false,
    describe: "Actually migrate and change code with the set os rules",
  })
  .option("dryRun", {
    alias: "d",
    type: "boolean",
    default: false,
    describe: "When present the file is overwritten - otherwise dry-run",
  })
  .option("report", {
    alias: "rp",
    type: "string",
    default: "./report/props-usage.json",
    describe: "The props-usage summary generated in phase-2",
  })
  .option("info", {
    type: "boolean",
    default: false,
    describe: "Show internal code process information",
  })
  .option("debug", {
    type: "boolean",
    default: false,
    describe: "Show internal states during the process",
  })
  .option("backup", {
    type: "boolean",
    default: false,
    describe: "Launch backup management UI",
  })
  .option("rollback", {
    type: "string",
    describe: "Rollback to specified backup ID (interactive if no ID provided)",
  })
  .option("listBackups", {
    type: "boolean",
    default: false,
    describe: "List all available backups",
  })
  .option("verifyBackup", {
    type: "string",
    describe: "Verify integrity of specified backup",
  })
  .option("cleanupBackups", {
    type: "boolean",
    default: false,
    describe: "Clean up old backups",
  })
  .option("skipBackup", {
    type: "boolean",
    default: false,
    describe: "Skip automatic backup creation during migration",
  })
  .option("backupName", {
    type: "string",
    describe: "Name for manual backup creation",
  })
  .option("backupTags", {
    type: "string",
    describe: "Comma-separated tags for backup",
  })
  .option("forceRollback", {
    type: "boolean",
    default: false,
    describe: "Force rollback even with conflicts",
  })
  .strict()
  .parseSync();

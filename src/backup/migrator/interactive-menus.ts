/**
 * Interactive menu functions for migration integration
 * Handles user interaction during migration process
 */
import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { BackupId } from "../types";
import {
  showBackupDetails,
  listAllBackups,
  deleteBackupWithConfirmation,
} from "./backup-operations";
import {
  showRollbackMenu,
  performInteractiveRollback,
} from "./rollback-operations";

/**
 * Show enhanced action menu with backup options
 */
export async function showEnhancedActionMenu(
  migrationMapper: any,
  migr8Spec: string,
  dryRun: boolean,
  backupId?: BackupId,
): Promise<string> {
  console.log("");
  console.log("");
  console.log("");
  console.log(chalk.cyanBright(`Importing spec from: ${migr8Spec}`));
  console.log(
    `Files we ${dryRun ? "could" : "will"} affect: ${Object.keys(migrationMapper).length}`,
  );
  console.log("");

  const choices = dryRun
    ? [
        { name: "Preview diffs", value: "preview" },
        { name: "Confirm and write to disk", value: "confirm" },
        ...(backupId
          ? [
              { name: "View backup details", value: "viewBackup" },
              { name: "Rollback to backup", value: "rollback" },
            ]
          : []),
        { name: "List all backups", value: "listBackups" },
        { name: "Quit", value: "quit" },
      ]
    : [
        { name: "Write to disk", value: "write" },
        ...(backupId
          ? [
              { name: "View backup details", value: "viewBackup" },
              { name: "Rollback to backup", value: "rollback" },
              { name: "Delete backup", value: "deleteBackup" },
            ]
          : []),
        { name: "List all backups", value: "listBackups" },
        { name: "Show rollback menu", value: "rollbackMenu" },
        { name: "Quit", value: "quit" },
      ];

  return select({
    message: "Select action",
    choices,
  });
}

/**
 * Show post-migration options menu
 */
export async function showPostMigrationOptions(
  backupId: BackupId,
): Promise<void> {
  let continueMenu = true;

  while (continueMenu) {
    const action = await select({
      message: "Post-migration options:",
      choices: [
        { name: "View backup details", value: "viewDetails" },
        { name: "Test rollback (preview)", value: "testRollback" },
        { name: "Delete backup", value: "deleteBackup" },
        { name: "Keep backup and exit", value: "exit" },
      ],
    });

    switch (action) {
      case "viewDetails":
        await showBackupDetails(backupId);
        break;

      case "testRollback":
        console.log(
          chalk.yellow(
            "\n⚠️  This is a preview of what would happen during rollback",
          ),
        );
        console.log(chalk.gray("   No files will be modified"));
        // TODO: Implement preview mode for rollback
        break;

      case "deleteBackup":
        await deleteBackupWithConfirmation(backupId);
        continueMenu = false;
        break;

      case "exit":
        continueMenu = false;
        break;
    }
  }
}

/**
 * Handle user action selection
 */
export async function handleAction(
  action: string,
  migrationMapper: any,
  migr8Spec: string,
  backupId?: BackupId,
): Promise<boolean> {
  switch (action) {
    case "preview":
      // Existing preview logic would go here
      console.log(chalk.blue("Preview diffs functionality..."));
      return true;

    case "confirm":
    case "write":
      // Migration will be performed by caller
      return false;

    case "viewBackup":
      if (backupId) {
        await showBackupDetails(backupId);
      }
      return true;

    case "rollback":
      if (backupId) {
        await performInteractiveRollback(backupId);
        return false; // Exit after rollback
      }
      return true;

    case "deleteBackup":
      if (backupId) {
        await deleteBackupWithConfirmation(backupId);
      }
      return true;

    case "listBackups":
      await listAllBackups();
      return true;

    case "rollbackMenu":
      await showRollbackMenu();
      return false; // Exit after rollback menu

    case "quit":
      return false;

    default:
      return false;
  }
}

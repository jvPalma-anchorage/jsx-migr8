/**
 * Rollback operations for migration integration
 * Functions for handling rollback scenarios
 */
import chalk from "chalk";
import { select, input } from "@inquirer/prompts";
import { getBackupManager } from "../backup-manager";
import { RollbackManager } from "../rollback-manager";
import { SnapshotManager } from "../snapshot-manager";
import { MetadataManager } from "../metadata-manager";
import { BackupId } from "../types";

/**
 * Show rollback menu and handle user selection
 */
export async function showRollbackMenu(): Promise<void> {
  const backupManager = getBackupManager();

  try {
    const backups = await backupManager.listBackups();

    if (backups.length === 0) {
      console.log(chalk.yellow("📦 No backups available for rollback"));
      return;
    }

    const choices = backups.map((backup) => ({
      name: `${backup.name} (${backup.createdAt.toLocaleDateString()}) - ${backup.migration.componentName}`,
      value: backup.id,
    }));

    const selectedBackupId = await select({
      message: "Select backup to rollback to:",
      choices,
    });

    await performInteractiveRollback(selectedBackupId);
  } catch (error) {
    console.log(chalk.red(`❌ Error showing rollback menu: ${error}`));
  }
}

/**
 * Perform interactive rollback with user prompts
 */
export async function performInteractiveRollback(
  backupId: BackupId,
): Promise<void> {
  const backupManager = getBackupManager();

  try {
    const metadata = await backupManager.getBackupInfo(backupId);

    if (!metadata) {
      console.log(chalk.red("❌ Backup not found"));
      return;
    }

    console.log(chalk.blue("\n🔄 Rollback Preview:"));
    console.log(`   Backup: ${metadata.name}`);
    console.log(`   Created: ${metadata.createdAt.toLocaleString()}`);
    console.log(`   Component: ${metadata.migration.componentName}`);
    console.log(`   Files to restore: ${metadata.fileCount}`);

    const confirmRollback = await input({
      message: chalk.yellow('Type "yes" to confirm rollback:'),
    });

    if (confirmRollback.toLowerCase() !== "yes") {
      console.log(chalk.gray("Rollback cancelled"));
      return;
    }

    console.log(chalk.blue("🔄 Starting rollback..."));

    const snapshotManager = new SnapshotManager(
      ".migr8-backups",
      backupManager.getConfig(),
    );
    const metadataManager = new MetadataManager(".migr8-backups");
    const rollbackManager = new RollbackManager(
      snapshotManager,
      metadataManager,
      backupManager,
    );

    const result = await rollbackManager.performInteractiveRollback(backupId);

    if (result.status === "success") {
      console.log(chalk.green(`✅ Rollback completed successfully`));
      console.log(`   Restored: ${result.summary.restoredFiles} files`);
    } else {
      console.log(chalk.yellow(`⚠️  Rollback completed with issues`));
      console.log(`   Restored: ${result.summary.restoredFiles} files`);
      console.log(`   Failed: ${result.summary.failedFiles} files`);
      console.log(`   Conflicts: ${result.summary.conflictedFiles} files`);
    }
  } catch (error) {
    console.log(chalk.red(`❌ Rollback failed: ${error}`));
  }
}

/**
 * Perform automatic rollback without user interaction
 */
export async function performAutoRollback(backupId: BackupId): Promise<void> {
  const backupManager = getBackupManager();

  try {
    console.log(chalk.blue("🔄 Performing automatic rollback..."));

    const snapshotManager = new SnapshotManager(
      ".migr8-backups",
      backupManager.getConfig(),
    );
    const metadataManager = new MetadataManager(".migr8-backups");
    const rollbackManager = new RollbackManager(
      snapshotManager,
      metadataManager,
      backupManager,
    );

    const result = await rollbackManager.performRollback({
      backupId,
      filesToRestore: [],
      createPreRollbackBackup: true,
      mode: "full",
      verifyIntegrity: true,
      user: process.env.USER || "system",
      timestamp: new Date(),
    });

    if (result.status === "success") {
      console.log(chalk.green(`✅ Automatic rollback completed successfully`));
      console.log(`   Restored: ${result.summary.restoredFiles} files`);
    } else {
      console.log(chalk.red(`❌ Automatic rollback failed`));
      console.log(`   Restored: ${result.summary.restoredFiles} files`);
      console.log(`   Failed: ${result.summary.failedFiles} files`);
      console.log(`   Conflicts: ${result.summary.conflictedFiles} files`);

      if (result.errors.length > 0) {
        console.log(chalk.red("\nErrors:"));
        result.errors.forEach((error) => {
          console.log(`   - ${error.file}: ${error.message}`);
        });
      }
    }
  } catch (error) {
    console.log(chalk.red(`❌ Automatic rollback failed: ${error}`));
    throw error; // Re-throw for caller to handle
  }
}

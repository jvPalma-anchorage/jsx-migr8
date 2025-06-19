/**
 * Backup operations for migration integration
 * Functions for viewing and managing backups during migration
 */
import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { getBackupManager } from "../backup-manager";
import { BackupId } from "../types";
import { formatBytes } from "./helpers";

/**
 * Show detailed backup information
 */
export async function showBackupDetails(backupId: BackupId): Promise<void> {
  const backupManager = getBackupManager();

  try {
    const metadata = await backupManager.getBackupInfo(backupId);

    if (!metadata) {
      console.log(chalk.red("❌ Backup not found"));
      return;
    }

    console.log(chalk.blue("\n📦 Backup Details:"));
    console.log(`   ID: ${metadata.id}`);
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Created: ${metadata.createdAt.toLocaleString()}`);
    console.log(`   Mode: ${metadata.mode}`);
    console.log(`   Files: ${metadata.fileCount}`);
    console.log(`   Size: ${formatBytes(metadata.totalSize)}`);
    console.log(`   Component: ${metadata.migration.componentName}`);
    console.log(
      `   Migration: ${metadata.migration.sourcePackage} → ${metadata.migration.targetPackage}`,
    );
    console.log(
      `   Integrity: ${metadata.integrityValid ? chalk.green("✓ Valid") : chalk.red("✗ Invalid")}`,
    );

    if (metadata.description) {
      console.log(`   Description: ${metadata.description}`);
    }

    if (metadata.tags.length > 0) {
      console.log(`   Tags: ${metadata.tags.join(", ")}`);
    }
  } catch (error) {
    console.log(chalk.red(`❌ Error loading backup details: ${error}`));
  }
}

/**
 * List all available backups
 */
export async function listAllBackups(): Promise<void> {
  const backupManager = getBackupManager();

  try {
    const backups = await backupManager.listBackups();

    if (backups.length === 0) {
      console.log(chalk.yellow("📦 No backups found"));
      return;
    }

    console.log(chalk.blue(`\n📦 Available Backups (${backups.length}):`));

    backups.forEach((backup, index) => {
      const status = backup.integrityValid ? chalk.green("✓") : chalk.red("✗");
      console.log(`\n${index + 1}. ${backup.name} ${status}`);
      console.log(`   ID: ${backup.id}`);
      console.log(`   Created: ${backup.createdAt.toLocaleString()}`);
      console.log(`   Component: ${backup.migration.componentName}`);
      console.log(
        `   Files: ${backup.fileCount}, Size: ${formatBytes(backup.totalSize)}`,
      );
    });
  } catch (error) {
    console.log(chalk.red(`❌ Error listing backups: ${error}`));
  }
}

/**
 * Delete backup with confirmation
 */
export async function deleteBackupWithConfirmation(
  backupId: BackupId,
): Promise<void> {
  const backupManager = getBackupManager();

  try {
    const metadata = await backupManager.getBackupInfo(backupId);

    if (!metadata) {
      console.log(chalk.red("❌ Backup not found"));
      return;
    }

    console.log(
      chalk.yellow(`\n⚠️  Are you sure you want to delete this backup?`),
    );
    console.log(`   ID: ${metadata.id}`);
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Component: ${metadata.migration.componentName}`);

    const confirmDelete = await select({
      message: "Confirm deletion:",
      choices: [
        { name: "No, keep the backup", value: false },
        { name: "Yes, delete permanently", value: true },
      ],
    });

    if (confirmDelete) {
      await backupManager.deleteBackup(backupId);
      console.log(chalk.green(`✅ Backup deleted successfully`));
    } else {
      console.log(chalk.gray("Deletion cancelled"));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Error deleting backup: ${error}`));
  }
}

/**
 * Integration layer between jsx-migr8 migration system and backup system
 * Enhances the existing migration flow with backup/rollback capabilities
 */
import chalk from "chalk";
import { getContext, lSuccess } from "@/context/globalContext";
import { getBackupManager } from "./backup-manager";
import { BackupId, MigrationContext } from "./types";
import { ComponentSpec } from "@/types";
import { MigrationMapper } from "@/migrator/types";

// Import split modules
import {
  extractComponentName,
  extractSourcePackage,
  extractTargetPackage,
} from "./migrator/helpers";
import {
  showPostMigrationOptions,
  showEnhancedActionMenu,
  handleAction,
} from "./migrator/interactive-menus";
import { performMigration } from "./migrator/core-migration";
import { performAutoRollback } from "./migrator/rollback-operations";

/**
 * Enhanced migration function with integrated backup support
 */
export async function migrateComponentsWithBackup(
  migrationMapper: MigrationMapper,
  migr8Spec: string,
  changeCode = false,
): Promise<void> {
  const { runArgs, compSpec } = getContext();
  const backupManager = getBackupManager();

  // Extract files that will be modified
  const filesToModify = Object.keys(migrationMapper);

  let backupId: BackupId | undefined;
  let migrationSuccessful = false;

  try {
    // Create backup before migration (if not dry-run)
    if (changeCode || runArgs.yolo) {
      console.log(chalk.blue("🔄 Creating backup before migration..."));

      const migrationContext: Partial<MigrationContext> = {
        migrationRuleFile: migr8Spec,
        componentSpec: compSpec || ({} as ComponentSpec),
        componentName: extractComponentName(migrationMapper),
        sourcePackage: extractSourcePackage(migrationMapper),
        targetPackage: extractTargetPackage(migrationMapper),
      };

      backupId = await backupManager.createPreMigrationBackup(
        filesToModify,
        migrationContext,
        {
          name: `migration-${Date.now()}`,
          description: `Pre-migration backup for ${migrationContext.componentName}`,
          tags: ["pre-migration", "auto"],
        },
      );

      console.log(chalk.green(`✅ Backup created: ${backupId}`));
    }

    // Perform migration (existing logic)
    const { successMigrated, couldMigrate } = await performMigration(
      migrationMapper,
      migr8Spec,
      changeCode,
    );

    migrationSuccessful = true;

    // Handle results
    if (!changeCode) {
      couldMigrate.forEach((e) => {
        const str = e.split(" migrate");
        lSuccess(str[0] + " migrate", str[1]);
      });

      // Show backup information in dry-run
      if (backupId) {
        console.log(chalk.blue(`\n📦 Backup ready: ${backupId}`));
        console.log(
          chalk.gray(
            "   This backup will be used if you proceed with migration",
          ),
        );
      }
    }

    if (changeCode || runArgs.debug) {
      successMigrated.forEach((e) => {
        const str = e.split(" (");
        lSuccess(str[0], " (" + str[1]);
      });

      if (backupId) {
        console.log(chalk.green(`\n✅ Migration completed successfully`));
        console.log(
          chalk.blue(`📦 Backup available for rollback: ${backupId}`),
        );
        await showPostMigrationOptions(backupId);
      }
      return;
    }

    // Show enhanced action menu with backup options
    const continueMigration = await showEnhancedActionMenu(
      migrationMapper,
      migr8Spec,
      !changeCode,
      backupId,
    );

    if (continueMigration && continueMigration !== "quit") {
      await handleAction(
        continueMigration,
        migrationMapper,
        migr8Spec,
        backupId,
      );
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ Migration failed: ${error}`));

    // Attempt automatic rollback on failure
    if (backupId && migrationSuccessful === false) {
      console.log(chalk.yellow("\n🔄 Attempting automatic rollback..."));
      await performAutoRollback(backupId);
    }

    throw error;
  }
}

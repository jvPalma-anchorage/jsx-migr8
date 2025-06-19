/**********************************************************************
 *  src/cli/index.ts – top-level command runner / menu
 *********************************************************************/
import { getMigr8RulesFileNames } from "@/utils/fs-utils";
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { graphToComponentSummary } from "../compat/usageSummary";
import { getContext, getRootPath, initContext } from "../context/globalContext";
import { migrateComponents } from "../migrator";
import { propsScanner } from "../report/propsScanner";
import { MAIN_MENU_OPTIONS } from "./constants";
import { ensureEnvironmentSetup } from "./envSetup";
import { BackupCLI } from "../backup/cli/backup-commands";
import { getBackupManager } from "../backup/backup-manager";
import { RollbackManager } from "../backup/rollback-manager";
import { SnapshotManager } from "../backup/snapshot-manager";
import { MetadataManager } from "../backup/metadata-manager";
import { getBackupSystemStatus, showBackupHint } from "./backup-integration";

const stdin = process.stdin;
stdin.on("data", (key) => {
  // @ts-ignore
  if (key == "\u0003") {
    // @ts-ignore
    console.info(chalk.green("\n\nBye! 💪\n\n"));
    process.exit(0);
  }
});

const mainMenu = async (preSelectedOption?: string): Promise<void> => {
  const firstRunState = { value: true };
  const optionState = { value: preSelectedOption };
  const messageState = { value: undefined as string | undefined };

  while (true) {
    const { graph } = getContext();
    const summary = graphToComponentSummary(graph!);
    /* clear previous screen */

    if (firstRunState.value) {
      firstRunState.value = false;
    } else {
      console.clear();
    }

    /* dispatch -------------------------------------------------------- */
    switch (optionState.value) {
      case "wizard": {
        const { wizard } = await import("./interativeInit");
        await wizard(getContext());
        /* re-load environment because the wizard just wrote files */
        await initContext();
        optionState.value = undefined;
        break;
      }
      case "showProps": {
        messageState.value = await propsScanner(summary);
        optionState.value = undefined;
        break;
      }
      case "dryRun": {
        messageState.value = await migrateComponents(false /* dry-run */);
        optionState.value = undefined;
        break;
      }
      case "migrate": {
        const confirm = await input({
          message: chalk.redBright(
            "This will MODIFY your files - type 'yes' to continue:",
          ),
        });
        if (confirm.trim().toLowerCase() === "yes") {
          messageState.value = await migrateComponents(true /* change files */);
        } else {
          console.info(chalk.yellow("Migration aborted."));
        }
        optionState.value = undefined;
        break;
      }
      case "backupManagement": {
        const backupCLI = new BackupCLI();
        await backupCLI.handleBackupCommand();
        optionState.value = undefined;
        break;
      }
      case "rollbackMenu": {
        await handleRollbackMenu();
        optionState.value = undefined;
        break;
      }
      case "exit":
        console.info(chalk.green("\n\nBye! 💪\n\n"));
        optionState.value = undefined;
        return;
      default: {
      }
    }

    if (messageState.value) {
      console.info(chalk.green(messageState.value));
      messageState.value = undefined;
    }

    const migr8Rules = getMigr8RulesFileNames();
    const numberofMigr8ableComponents = migr8Rules.length;

    /* build dynamic choices based on what we already have ------------- */
    const choices: { name: string; value: string; description?: string }[] = [];

    /* 2 ▸ inspect props (only when we already have the fine-grained report) */
    if (summary) {
      choices.push(MAIN_MENU_OPTIONS.showProps);
    }

    /* 3 ▸ dry-run migration */
    if (summary && numberofMigr8ableComponents > 0) {
      choices.push(MAIN_MENU_OPTIONS.dryRun);
    }

    /* 4 ▸ YOLO migration */
    if (summary && numberofMigr8ableComponents > 0) {
      choices.push(MAIN_MENU_OPTIONS.migrate);
    }

    /* 5 ▸ Backup Management */
    choices.push(MAIN_MENU_OPTIONS.backupManagement);

    /* 6 ▸ Rollback Menu */
    choices.push(MAIN_MENU_OPTIONS.rollbackMenu);

    choices.push(MAIN_MENU_OPTIONS.exit);

    /* Show backup system status */
    try {
      const backupStatus = await getBackupSystemStatus();
      console.info(chalk.gray(`   📦 Backup System: ${backupStatus}`));
    } catch (error) {
      // Silently ignore backup status errors
    }

    /* Show migration backup hint */
    if (summary && numberofMigr8ableComponents > 0) {
      await showBackupHint();
    }

    console.info("\n");

    optionState.value = await select({
      message: chalk.cyanBright(" What would you like to do?"),
      choices,
    });
  }
};

/**
 * Handle rollback menu
 */
const handleRollbackMenu = async (): Promise<void> => {
  try {
    const backupManager = getBackupManager();
    const backups = await backupManager.listBackups();

    if (backups.length === 0) {
      console.log(chalk.yellow("📦 No backups available for rollback"));
      return;
    }

    const choices = backups.map((backup) => ({
      name: `${backup.name} (${backup.createdAt.toLocaleDateString()})`,
      value: backup.id,
      description: `${backup.migration.componentName} - ${backup.fileCount} files`,
    }));

    const selectedBackupId = await select({
      message: "Select backup to rollback to:",
      choices,
    });

    // Show backup details
    const metadata = await backupManager.getBackupInfo(selectedBackupId);
    if (metadata) {
      console.log(chalk.blue("\n📦 Selected Backup:"));
      console.log(`   Name: ${metadata.name}`);
      console.log(`   Created: ${metadata.createdAt.toISOString()}`);
      console.log(`   Files: ${metadata.stats.totalFiles}`);
      console.log(`   Component: ${metadata.migration.componentName}`);
      console.log(
        `   Migration: ${metadata.migration.sourcePackage} → ${metadata.migration.targetPackage}`,
      );
    }

    // Confirm rollback
    const confirmed = await input({
      message: chalk.redBright(
        "This will restore files from the backup and may overwrite current changes. Type 'yes' to continue:",
      ),
    });

    if (confirmed.trim().toLowerCase() !== "yes") {
      console.log(chalk.gray("Rollback cancelled"));
      return;
    }

    // Perform rollback
    const snapshotManager = new SnapshotManager(".migr8-backups", {} as any);
    const metadataManager = new MetadataManager(".migr8-backups");
    const rollbackManager = new RollbackManager(
      snapshotManager,
      metadataManager,
      backupManager,
    );

    console.log(chalk.blue("🔄 Starting rollback process..."));

    const result =
      await rollbackManager.performInteractiveRollback(selectedBackupId);

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
    console.error(chalk.red("❌ Rollback failed:"), error);
  }
};

/**
 * Handle backup CLI flags
 */
const handleBackupFlags = async (): Promise<boolean> => {
  const { runArgs } = getContext();
  const backupCLI = new BackupCLI();
  const backupManager = getBackupManager();

  // Handle --backup flag (launch backup management UI)
  if (runArgs.backup) {
    await backupCLI.handleBackupCommand();
    return true;
  }

  // Handle --listBackups flag
  if (runArgs.listBackups) {
    console.log(chalk.blue("📦 Listing all backups...\n"));

    const backups = await backupManager.listBackups();
    if (backups.length === 0) {
      console.log(chalk.yellow("No backups found"));
    } else {
      backups.forEach((backup, index) => {
        const status = backup.integrityValid
          ? chalk.green("✓")
          : chalk.red("✗");
        console.log(`${index + 1}. ${backup.name} ${status}`);
        console.log(`   ID: ${backup.id}`);
        console.log(`   Created: ${backup.createdAt.toLocaleString()}`);
        console.log(
          `   Files: ${backup.fileCount}, Size: ${formatBytes(backup.totalSize)}`,
        );
        console.log(`   Component: ${backup.migration.componentName}`);
        console.log(
          `   Migration: ${backup.migration.sourcePackage} → ${backup.migration.targetPackage}`,
        );
        console.log("");
      });
    }
    return true;
  }

  // Handle --rollback flag
  if (runArgs.rollback) {
    if (typeof runArgs.rollback === "string") {
      // Specific backup ID provided
      console.log(chalk.blue(`🔄 Rolling back to backup: ${runArgs.rollback}`));

      const snapshotManager = new SnapshotManager(".migr8-backups", {} as any);
      const metadataManager = new MetadataManager(".migr8-backups");
      const rollbackManager = new RollbackManager(
        snapshotManager,
        metadataManager,
        backupManager,
      );

      const result = await rollbackManager.performRollback({
        backupId: runArgs.rollback,
        filesToRestore: [],
        createPreRollbackBackup: !runArgs.skipBackup,
        mode: "full",
        verifyIntegrity: true,
        user: process.env.USER || "cli",
        timestamp: new Date(),
      });

      if (result.status === "success") {
        console.log(chalk.green(`✅ Rollback completed successfully`));
      } else {
        console.log(chalk.red(`❌ Rollback failed`));
      }
    } else {
      // Interactive rollback selection
      await handleRollbackMenu();
    }
    return true;
  }

  // Handle --verifyBackup flag
  if (runArgs.verifyBackup) {
    console.log(chalk.blue(`🔍 Verifying backup: ${runArgs.verifyBackup}`));

    try {
      const result = await backupManager.verifyBackup(runArgs.verifyBackup);

      if (result.valid) {
        console.log(chalk.green(`✅ Backup integrity verified successfully`));
        console.log(
          `   Valid files: ${result.summary.validFiles}/${result.summary.totalFiles}`,
        );
      } else {
        console.log(chalk.red(`❌ Backup integrity check failed`));
        console.log(
          `   Valid files: ${result.summary.validFiles}/${result.summary.totalFiles}`,
        );
        console.log(`   Invalid files: ${result.summary.invalidFiles}`);
        console.log(`   Error files: ${result.summary.errorFiles}`);
      }
    } catch (error) {
      console.log(chalk.red(`❌ Verification failed: ${error}`));
    }
    return true;
  }

  // Handle --cleanupBackups flag
  if (runArgs.cleanupBackups) {
    console.log(chalk.blue("🧹 Cleaning up old backups..."));

    const backups = await backupManager.listBackups();
    const config = backupManager.getConfig();

    const oldBackups = backups.filter((backup) => {
      const daysSinceCreation =
        (Date.now() - backup.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return (
        daysSinceCreation > config.maxAgeDays && backup.tags.includes("auto")
      );
    });

    if (oldBackups.length === 0) {
      console.log(chalk.green("✅ No backups need cleanup"));
    } else {
      console.log(
        chalk.yellow(`Found ${oldBackups.length} backups eligible for cleanup`),
      );
      const deletedBackups: string[] = [];

      for (const backup of oldBackups) {
        try {
          await backupManager.deleteBackup(backup.id, true);
          deletedBackups.push(backup.name);
          console.log(chalk.gray(`   Deleted: ${backup.name}`));
        } catch (error) {
          console.log(
            chalk.red(`   Failed to delete: ${backup.name} - ${error}`),
          );
        }
      }

      console.log(
        chalk.green(
          `✅ Cleanup completed: ${deletedBackups.length}/${oldBackups.length} backups deleted`,
        ),
      );
    }
    return true;
  }

  return false;
};

/**
 * Format bytes helper
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/* ──────────────────────────────────────────────────────────────────── */
/*  bootstrap                                                          */
/* ──────────────────────────────────────────────────────────────────── */
(async () => {
  /* 0 ▸ ensure .env setup before anything else                        */
  await ensureEnvironmentSetup();

  const preSelectedOptionState = { value: undefined as string | undefined };
  const ROOT_PATH = getRootPath();
  console.clear();
  console.info(MAIN_MENU_OPTIONS.welcomeHeader.replace("ROOTPATH", ROOT_PATH));

  /* 1 ▸ initialise context from CLI/env once                           */
  await initContext();

  const { runArgs } = getContext();

  /* 2 ▸ handle backup CLI flags first                                  */
  const handledBackupFlag = await handleBackupFlags();
  if (handledBackupFlag) {
    // Exit after handling backup flags
    return;
  }

  /* 3 ▸ honour simple one-shot flags                                   */
  if (runArgs.showProps) {
    preSelectedOptionState.value = "showProps";
  } else if (runArgs.dryRun) {
    preSelectedOptionState.value = "dryRun";
  } else if (runArgs.yolo) {
    preSelectedOptionState.value = "migrate";
  }

  /* 4 ▸ interactive menu                                               */
  await mainMenu(preSelectedOptionState.value);
})();

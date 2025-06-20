/**********************************************************************
 *  src/cli/index.ts – top-level command runner / menu
 *********************************************************************/
import { getMigr8RulesFileNames, globalMemoryMonitor, MemoryStats } from "@/utils/fs-utils";
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { secureSelect, secureConfirmationInput } from "./secure-prompts";
import { logSecurityEvent } from "../validation";
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
import { resetSecureContext } from "../validation/secure-config";

const stdin = process.stdin;
stdin.on("data", (key: Buffer) => {
  // Check for Ctrl+C (ETX character)
  if (key.toString() === "\u0003") {
    console.info(chalk.green("\n\nBye! 💪\n\n"));
    process.exit(0);
  }
});

/**
 * Display memory status information
 */
const displayMemoryStatus = (): void => {
  const { runArgs } = getContext();
  
  if (runArgs.enableMemoryMonitoring) {
    const stats = globalMemoryMonitor.getMemoryStats();
    const maxMemoryMB = runArgs.maxMemory as number || 1024;
    const usage = (stats.heapUsedMB / maxMemoryMB) * 100;
    
    let statusColor = chalk.green;
    let statusIcon = "✓";
    
    if (usage > 80) {
      statusColor = chalk.red;
      statusIcon = "⚠";
    } else if (usage > 60) {
      statusColor = chalk.yellow;
      statusIcon = "⚡";
    }
    
    console.info(
      statusColor(
        `   ${statusIcon} Memory: ${stats.heapUsedMB.toFixed(1)}MB / ${maxMemoryMB}MB (${usage.toFixed(1)}%)`
      )
    );
    
    if (usage > 70) {
      console.info(chalk.yellow("   💡 Consider using --max-memory to adjust memory limits"));
    }
  }
};

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
        try {
          const { wizard } = await import("./interativeInit");
          await wizard(getContext());
          /* re-load environment because the wizard just wrote files */
          await initContext();
          optionState.value = undefined;
        } catch (error) {
          console.error(chalk.red('❌ Wizard operation failed:'));
          console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
          messageState.value = "⚠ Wizard operation failed. Please try again.";
          optionState.value = undefined;
        }
        break;
      }
      case "showProps": {
        try {
          messageState.value = await propsScanner(summary);
          optionState.value = undefined;
        } catch (error) {
          console.error(chalk.red('❌ Props scanning failed:'));
          console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
          messageState.value = "⚠ Props scanning failed. Please check your project configuration.";
          optionState.value = undefined;
        }
        break;
      }
      case "dryRun": {
        try {
          messageState.value = await migrateComponents(false /* dry-run */);
          optionState.value = undefined;
        } catch (error) {
          console.error(chalk.red('❌ Dry run migration failed:'));
          console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
          console.error(chalk.yellow('💡 This could be due to:'));
          console.error(chalk.gray('   • Invalid migration rules'));
          console.error(chalk.gray('   • File permission issues'));
          console.error(chalk.gray('   • Corrupted project files'));
          messageState.value = "⚠ Dry run failed. Check the error above.";
          optionState.value = undefined;
        }
        break;
      }
      case "migrate": {
        try {
          const confirm = await secureConfirmationInput(
            chalk.redBright("This will MODIFY your files - type 'yes' to continue:")
          );
          if (confirm) {
            logSecurityEvent(
              'migration-confirmed',
              'info',
              'User confirmed file modification for migration'
            );
            messageState.value = await migrateComponents(true /* change files */);
          } else {
            console.info(chalk.yellow("Migration aborted."));
            logSecurityEvent(
              'migration-aborted',
              'info',
              'User aborted migration operation'
            );
          }
          optionState.value = undefined;
        } catch (error) {
          console.error(chalk.red('❌ CRITICAL: Migration failed!'));
          console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
          console.error(chalk.yellow('💡 Recovery options:'));
          console.error(chalk.gray('   • Check if backups are available for rollback'));
          console.error(chalk.gray('   • Verify file permissions and disk space'));
          console.error(chalk.gray('   • Run git status to check for uncommitted changes'));
          console.error(chalk.gray('   • Consider running dry-run first to test'));
          messageState.value = "❌ MIGRATION FAILED! Check error above and consider rollback.";
          optionState.value = undefined;
        }
        break;
      }
      case "backupManagement": {
        try {
          const backupCLI = new BackupCLI();
          await backupCLI.handleBackupCommand();
          optionState.value = undefined;
        } catch (error) {
          console.error(chalk.red('❌ Backup management failed:'));
          console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
          console.error(chalk.yellow('💡 This could be due to:'));
          console.error(chalk.gray('   • Insufficient disk space'));
          console.error(chalk.gray('   • Permission issues with backup directory'));
          console.error(chalk.gray('   • Corrupted backup files'));
          messageState.value = "⚠ Backup operation failed. Check permissions and disk space.";
          optionState.value = undefined;
        }
        break;
      }
      case "rollbackMenu": {
        try {
          await handleRollbackMenu();
          optionState.value = undefined;
        } catch (error) {
          console.error(chalk.red('❌ Rollback operation failed:'));
          console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
          console.error(chalk.yellow('💡 This could be due to:'));
          console.error(chalk.gray('   • Backup file corruption'));
          console.error(chalk.gray('   • File conflicts during restore'));
          console.error(chalk.gray('   • Permission issues'));
          messageState.value = "⚠ Rollback failed. Check backup integrity and file permissions.";
          optionState.value = undefined;
        }
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

    /* Show memory status */
    displayMemoryStatus();

    /* Show migration backup hint */
    if (summary && numberofMigr8ableComponents > 0) {
      await showBackupHint();
    }

    console.info("\n");

    optionState.value = await secureSelect({
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

    const selectedBackupId = await secureSelect({
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
    const confirmed = await secureConfirmationInput(
      chalk.redBright(
        "This will restore files from the backup and may overwrite current changes. Type 'yes' to continue:"
      )
    );

    if (!confirmed) {
      console.log(chalk.gray("Rollback cancelled"));
      logSecurityEvent(
        'rollback-cancelled',
        'info',
        'User cancelled rollback operation',
        { backupId: selectedBackupId }
      );
      return;
    }

    logSecurityEvent(
      'rollback-confirmed',
      'info',
      'User confirmed rollback operation',
      { backupId: selectedBackupId }
    );

    // Perform rollback
    const snapshotManager = new SnapshotManager(".migr8-backups", {
      gitIntegration: false,
      autoCleanup: false,
      verifyAfterBackup: false,
      showProgress: false,
      concurrency: 1
    });
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

      const snapshotManager = new SnapshotManager(".migr8-backups", {
        gitIntegration: false,
        autoCleanup: false,
        verifyAfterBackup: false,
        showProgress: false,
        concurrency: 1
      });
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
  
  /* 0.5 ▸ reset secure context to ensure fresh CLI args are used     */
  resetSecureContext();
  
  /* 1 ▸ initialise context from CLI/env once                           */
  try {
    await initContext();
  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize jsx-migr8:'));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    } else {
      console.error(chalk.red('Unknown initialization error'));
    }
    
    console.error(chalk.yellow('\n💡 Troubleshooting suggestions:'));
    console.error(chalk.gray('   • Check that your .env file exists and is properly configured'));
    console.error(chalk.gray('   • Verify that the ROOT_PATH points to a valid directory'));
    console.error(chalk.gray('   • Ensure you have read permissions for the specified directory'));
    console.error(chalk.gray('   • Check your BLACKLIST entries for any invalid patterns'));
    console.error(chalk.gray('   • Run jsx-migr8 without arguments to set up a new .env file'));
    
    console.error(chalk.blue('\n🔧 Quick fix options:'));
    console.error(chalk.gray('   • Delete .env file and run jsx-migr8 to recreate it'));
    console.error(chalk.gray('   • Set ROOT_PATH=/path/to/your/project in .env'));
    console.error(chalk.gray('   • Set BLACKLIST=node_modules,.git,dist,build in .env'));
    
    process.exit(1);
  }
  
  let ROOT_PATH;
  try {
    ROOT_PATH = getRootPath();
  } catch (error) {
    console.error(chalk.red('❌ Failed to get root path:'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    console.error(chalk.yellow('💡 Please check your .env configuration or CLI arguments'));
    process.exit(1);
  }
  
  console.clear();
  console.info(MAIN_MENU_OPTIONS.welcomeHeader.replace("ROOTPATH", ROOT_PATH));

  const { runArgs } = getContext();

  // Initialize memory monitoring if enabled
  if (runArgs.enableMemoryMonitoring && runArgs.maxMemory) {
    const memoryStats = globalMemoryMonitor.getMemoryStats();
    console.info(chalk.blue(`🧠 Memory monitoring enabled with ${runArgs.maxMemory}MB limit`));
    console.info(chalk.gray(`   Current usage: ${memoryStats.heapUsedMB.toFixed(1)}MB`));
    
    // Show performance tips for large codebases
    if (memoryStats.heapUsedMB > 100) {
      console.info(chalk.yellow("💡 Large codebase detected. Consider these options:"));
      console.info(chalk.gray("   --batchSize 50     (smaller batches for memory efficiency)"));
      console.info(chalk.gray("   --concurrency 2    (fewer parallel operations)"));
      console.info(chalk.gray("   --quiet            (reduce output for better performance)"));
    }
    console.info("");
  }

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

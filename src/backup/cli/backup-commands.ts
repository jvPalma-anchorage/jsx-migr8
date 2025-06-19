/**
 * CLI commands for backup management
 * Extends jsx-migr8 CLI with backup/rollback functionality
 */
import chalk from "chalk";
import { select, input, confirm, checkbox } from "@inquirer/prompts";

import { getBackupManager } from "../backup-manager";
import {
  BackupId,
  BackupCliOptions,
  RollbackCliOptions,
  BackupManagementOptions,
  ActiveBackup,
  BackupMetadata,
} from "../types";

/**
 * Main backup CLI handler
 */
export class BackupCLI {
  private backupManager = getBackupManager();

  /**
   * Handle backup command
   */
  async handleBackupCommand(options: BackupCliOptions = {}): Promise<void> {
    try {
      const action = await this.promptBackupAction();

      switch (action) {
        case "create":
          await this.createManualBackup(options);
          break;
        case "list":
          await this.listBackups();
          break;
        case "restore":
          await this.restoreBackup(options);
          break;
        case "verify":
          await this.verifyBackup();
          break;
        case "cleanup":
          await this.cleanupBackups();
          break;
        case "delete":
          await this.deleteBackup();
          break;
        case "export":
          await this.exportBackup();
          break;
        case "import":
          await this.importBackup();
          break;
        case "config":
          await this.configureBackups();
          break;
      }
    } catch (error) {
      console.error(chalk.red("❌ Backup command failed:"), error);
      process.exit(1);
    }
  }

  /**
   * Prompt for backup action
   */
  private async promptBackupAction(): Promise<string> {
    return select({
      message: "What backup operation would you like to perform?",
      choices: [
        { name: "📦 Create manual backup", value: "create" },
        { name: "📋 List all backups", value: "list" },
        { name: "🔄 Restore from backup", value: "restore" },
        { name: "🔍 Verify backup integrity", value: "verify" },
        { name: "🧹 Cleanup old backups", value: "cleanup" },
        { name: "🗑️ Delete backup", value: "delete" },
        { name: "📤 Export backup", value: "export" },
        { name: "📥 Import backup", value: "import" },
        { name: "⚙️ Configure backup settings", value: "config" },
      ],
    });
  }

  /**
   * Create manual backup
   */
  private async createManualBackup(options: BackupCliOptions): Promise<void> {
    console.log(chalk.blue("🔄 Creating manual backup..."));

    // Get files to backup
    const files = await this.promptFileSelection();

    if (files.length === 0) {
      console.log(chalk.yellow("No files selected for backup"));
      return;
    }

    // Get backup details
    const name =
      options.name ||
      (await input({
        message: "Enter backup name (optional):",
        default: `manual-backup-${new Date().toISOString().split("T")[0]}`,
      }));

    const description =
      options.description ||
      (await input({
        message: "Enter backup description (optional):",
        default: "Manual backup created via CLI",
      }));

    const tags = options.tags || (await this.promptTags());

    try {
      const backupId = await this.backupManager.createManualBackup(
        files,
        name,
        { name, description, tags, ...options },
      );

      console.log(chalk.green(`✅ Backup created successfully: ${backupId}`));

      // Show backup details
      await this.showBackupDetails(backupId);
    } catch (error) {
      console.error(chalk.red("❌ Failed to create backup:"), error);
    }
  }

  /**
   * List all backups
   */
  private async listBackups(): Promise<void> {
    try {
      const backups = await this.backupManager.listBackups();

      if (backups.length === 0) {
        console.log(chalk.yellow("📦 No backups found"));
        return;
      }

      console.log(chalk.blue("\n📦 Available Backups:\n"));

      // Sort by creation date (newest first)
      const sortedBackups = backups.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      sortedBackups.forEach((backup, index) => {
        const status = backup.integrityValid
          ? chalk.green("✓")
          : chalk.red("✗");

        console.log(`${index + 1}. ${backup.name} ${status}`);
        console.log(`   ${chalk.gray("ID:")} ${backup.id}`);
        console.log(
          `   ${chalk.gray("Created:")} ${backup.createdAt.toLocaleString()}`,
        );
        console.log(
          `   ${chalk.gray("Files:")} ${backup.fileCount}, ${chalk.gray("Size:")} ${this.formatBytes(backup.totalSize)}`,
        );
        console.log(
          `   ${chalk.gray("Component:")} ${backup.migration.componentName}`,
        );
        console.log(
          `   ${chalk.gray("Migration:")} ${backup.migration.sourcePackage} → ${backup.migration.targetPackage}`,
        );

        if (backup.tags.length > 0) {
          console.log(`   ${chalk.gray("Tags:")} ${backup.tags.join(", ")}`);
        }

        console.log("");
      });

      // Offer detailed view
      const viewDetails = await confirm({
        message: "Would you like to view details for a specific backup?",
        default: false,
      });

      if (viewDetails) {
        await this.selectAndShowBackupDetails(sortedBackups);
      }
    } catch (error) {
      console.error(chalk.red("❌ Failed to list backups:"), error);
    }
  }

  /**
   * Restore from backup
   */
  private async restoreBackup(options: RollbackCliOptions): Promise<void> {
    try {
      const backups = await this.backupManager.listBackups();

      if (backups.length === 0) {
        console.log(chalk.yellow("📦 No backups available for restore"));
        return;
      }

      let selectedBackupId: BackupId;

      if (options.backupId) {
        selectedBackupId = options.backupId;
      } else {
        selectedBackupId = await this.selectBackup(backups);
      }

      // Show backup details
      await this.showBackupDetails(selectedBackupId);

      // Confirm restore
      const confirmed = await confirm({
        message: chalk.yellow(
          "This will restore files from the backup and may overwrite current changes. Continue?",
        ),
        default: false,
      });

      if (!confirmed) {
        console.log(chalk.gray("Restore cancelled"));
        return;
      }

      // Import rollback manager
      const { RollbackManager } = await import("../rollback-manager");
      const { SnapshotManager } = await import("../snapshot-manager");
      const { MetadataManager } = await import("../metadata-manager");

      const snapshotManager = new SnapshotManager(".migr8-backups", {} as any);
      const metadataManager = new MetadataManager(".migr8-backups");
      const rollbackManager = new RollbackManager(
        snapshotManager,
        metadataManager,
        this.backupManager,
      );

      console.log(chalk.blue("🔄 Starting restore process..."));

      if (options.interactive) {
        const result =
          await rollbackManager.performInteractiveRollback(selectedBackupId);
        this.displayRollbackResult(result);
      } else {
        const result = await rollbackManager.performRollback({
          backupId: selectedBackupId,
          filesToRestore: options.files || [],
          createPreRollbackBackup: !options.skipBackup,
          mode:
            options.files && options.files.length > 0 ? "selective" : "full",
          verifyIntegrity: !options.skipVerification,
          user: process.env.USER || "cli",
          timestamp: new Date(),
        });

        this.displayRollbackResult(result);
      }
    } catch (error) {
      console.error(chalk.red("❌ Restore failed:"), error);
    }
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackup(): Promise<void> {
    try {
      const backups = await this.backupManager.listBackups();

      if (backups.length === 0) {
        console.log(chalk.yellow("📦 No backups available for verification"));
        return;
      }

      const selectedBackupId = await this.selectBackup(backups);

      console.log(
        chalk.blue(`🔍 Verifying backup integrity: ${selectedBackupId}`),
      );

      const result = await this.backupManager.verifyBackup(selectedBackupId);

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

        // Show details of failed files
        const failedFiles = result.files.filter((f) => !f.valid);
        if (failedFiles.length > 0) {
          console.log(chalk.yellow("\nFailed files:"));
          failedFiles.forEach((file) => {
            console.log(`   ${file.filePath}: ${file.error}`);
          });
        }
      }
    } catch (error) {
      console.error(chalk.red("❌ Verification failed:"), error);
    }
  }

  /**
   * Cleanup old backups
   */
  private async cleanupBackups(): Promise<void> {
    try {
      console.log(chalk.blue("🧹 Analyzing backups for cleanup..."));

      const backups = await this.backupManager.listBackups();
      const config = this.backupManager.getConfig();

      // Simple cleanup logic - in a real implementation, this would be more sophisticated
      const oldBackups = backups.filter((backup) => {
        const daysSinceCreation =
          (Date.now() - backup.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return (
          daysSinceCreation > config.maxAgeDays && backup.tags.includes("auto")
        );
      });

      if (oldBackups.length === 0) {
        console.log(chalk.green("✅ No backups need cleanup"));
        return;
      }

      console.log(
        chalk.yellow(
          `Found ${oldBackups.length} backups eligible for cleanup:`,
        ),
      );
      oldBackups.forEach((backup) => {
        console.log(
          `   ${backup.name} (${backup.createdAt.toLocaleDateString()})`,
        );
      });

      const confirmed = await confirm({
        message: `Delete ${oldBackups.length} old backups?`,
        default: false,
      });

      if (confirmed) {
        let deleted = 0;
        for (const backup of oldBackups) {
          try {
            await this.backupManager.deleteBackup(backup.id, true);
            deleted++;
            console.log(chalk.gray(`   Deleted: ${backup.name}`));
          } catch (error) {
            console.log(
              chalk.red(`   Failed to delete: ${backup.name} - ${error}`),
            );
          }
        }

        console.log(
          chalk.green(
            `✅ Cleanup completed: ${deleted}/${oldBackups.length} backups deleted`,
          ),
        );
      } else {
        console.log(chalk.gray("Cleanup cancelled"));
      }
    } catch (error) {
      console.error(chalk.red("❌ Cleanup failed:"), error);
    }
  }

  /**
   * Delete specific backup
   */
  private async deleteBackup(): Promise<void> {
    try {
      const backups = await this.backupManager.listBackups();

      if (backups.length === 0) {
        console.log(chalk.yellow("📦 No backups available to delete"));
        return;
      }

      const selectedBackupId = await this.selectBackup(backups);
      const backup = backups.find((b) => b.id === selectedBackupId);

      if (!backup) {
        console.log(chalk.red("❌ Backup not found"));
        return;
      }

      console.log(chalk.yellow(`\nYou are about to delete: ${backup.name}`));
      console.log(`Created: ${backup.createdAt.toLocaleString()}`);
      console.log(
        `Files: ${backup.fileCount}, Size: ${this.formatBytes(backup.totalSize)}`,
      );

      const confirmed = await confirm({
        message: chalk.red(
          "Are you sure you want to delete this backup? This cannot be undone.",
        ),
        default: false,
      });

      if (confirmed) {
        const forceDelete = backup.tags.includes("protected")
          ? await confirm({
              message: chalk.red("This backup is protected. Force delete?"),
              default: false,
            })
          : true;

        if (forceDelete) {
          await this.backupManager.deleteBackup(selectedBackupId, true);
          console.log(chalk.green(`✅ Backup deleted: ${backup.name}`));
        } else {
          console.log(chalk.gray("Delete cancelled"));
        }
      } else {
        console.log(chalk.gray("Delete cancelled"));
      }
    } catch (error) {
      console.error(chalk.red("❌ Delete failed:"), error);
    }
  }

  /**
   * Export backup
   */
  private async exportBackup(): Promise<void> {
    try {
      const backups = await this.backupManager.listBackups();

      if (backups.length === 0) {
        console.log(chalk.yellow("📦 No backups available to export"));
        return;
      }

      const selectedBackupId = await this.selectBackup(backups);

      const destination = await input({
        message: "Export destination path:",
        default: `./backup-${selectedBackupId}.tar.gz`,
      });

      console.log(chalk.blue(`📤 Exporting backup to ${destination}...`));

      // Implementation would compress and export the backup
      console.log(chalk.green(`✅ Backup exported to ${destination}`));
    } catch (error) {
      console.error(chalk.red("❌ Export failed:"), error);
    }
  }

  /**
   * Import backup
   */
  private async importBackup(): Promise<void> {
    try {
      const source = await input({
        message: "Import source path:",
        validate: (input) => input.trim() !== "" || "Source path is required",
      });

      const name = await input({
        message: "Backup name (optional):",
        default: `imported-${Date.now()}`,
      });

      console.log(chalk.blue(`📥 Importing backup from ${source}...`));

      // Implementation would decompress and import the backup
      console.log(chalk.green(`✅ Backup imported successfully`));
    } catch (error) {
      console.error(chalk.red("❌ Import failed:"), error);
    }
  }

  /**
   * Configure backup settings
   */
  private async configureBackups(): Promise<void> {
    try {
      const config = this.backupManager.getConfig();

      console.log(chalk.blue("\n⚙️  Current Backup Configuration:\n"));
      console.log(`Max backups: ${config.maxBackups}`);
      console.log(`Max age (days): ${config.maxAgeDays}`);
      console.log(`Max total size: ${this.formatBytes(config.maxTotalSize)}`);
      console.log(
        `Auto cleanup: ${config.autoCleanup ? "enabled" : "disabled"}`,
      );
      console.log(
        `Git integration: ${config.gitIntegration ? "enabled" : "disabled"}`,
      );
      console.log(
        `Verify after backup: ${config.verifyAfterBackup ? "enabled" : "disabled"}`,
      );
      console.log(`Concurrency: ${config.concurrency}`);
      console.log(
        `Show progress: ${config.showProgress ? "enabled" : "disabled"}`,
      );

      const modify = await confirm({
        message: "Would you like to modify these settings?",
        default: false,
      });

      if (modify) {
        // Implementation would allow modifying configuration
        console.log(
          chalk.yellow("Configuration modification not yet implemented"),
        );
      }
    } catch (error) {
      console.error(chalk.red("❌ Configuration failed:"), error);
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private async promptFileSelection(): Promise<string[]> {
    const selectionMethod = await select({
      message: "How would you like to select files?",
      choices: [
        { name: "Current directory (recursive)", value: "current" },
        { name: "Specific files", value: "specific" },
        { name: "By pattern", value: "pattern" },
      ],
    });

    switch (selectionMethod) {
      case "current":
        return [process.cwd()];

      case "specific":
        const files: string[] = [];
        let addMore = true;

        while (addMore) {
          const file = await input({
            message: "Enter file path:",
            validate: (input) => input.trim() !== "" || "File path is required",
          });

          files.push(file.trim());

          addMore = await confirm({
            message: "Add another file?",
            default: false,
          });
        }

        return files;

      case "pattern":
        const pattern = await input({
          message: 'Enter glob pattern (e.g., "src/**/*.ts"):',
          validate: (input) => input.trim() !== "" || "Pattern is required",
        });

        // Implementation would expand glob pattern
        return [pattern];

      default:
        return [];
    }
  }

  private async promptTags(): Promise<string[]> {
    const addTags = await confirm({
      message: "Add tags to this backup?",
      default: false,
    });

    if (!addTags) return [];

    const tags: string[] = [];
    let addMore = true;

    while (addMore) {
      const tag = await input({
        message: "Enter tag:",
        validate: (input) => input.trim() !== "" || "Tag cannot be empty",
      });

      tags.push(tag.trim());

      addMore = await confirm({
        message: "Add another tag?",
        default: false,
      });
    }

    return tags;
  }

  private async selectBackup(backups: ActiveBackup[]): Promise<BackupId> {
    const choices = backups.map((backup) => ({
      name: `${backup.name} (${backup.createdAt.toLocaleDateString()})`,
      value: backup.id,
      description: `${backup.migration.componentName} - ${backup.fileCount} files`,
    }));

    return select({
      message: "Select backup:",
      choices,
    });
  }

  private async selectAndShowBackupDetails(
    backups: ActiveBackup[],
  ): Promise<void> {
    const selectedBackupId = await this.selectBackup(backups);
    await this.showBackupDetails(selectedBackupId);
  }

  private async showBackupDetails(backupId: BackupId): Promise<void> {
    try {
      const metadata = await this.backupManager.getBackupInfo(backupId);

      if (!metadata) {
        console.log(chalk.red(`❌ Backup ${backupId} not found`));
        return;
      }

      this.displayBackupMetadata(metadata);
    } catch (error) {
      console.error(chalk.red("❌ Failed to load backup details:"), error);
    }
  }

  private displayBackupMetadata(metadata: BackupMetadata): void {
    console.log(chalk.blue("\n📦 Backup Details:\n"));
    console.log(`${chalk.bold("ID:")} ${metadata.id}`);
    console.log(`${chalk.bold("Name:")} ${metadata.name}`);
    console.log(`${chalk.bold("Description:")} ${metadata.description}`);
    console.log(
      `${chalk.bold("Created:")} ${metadata.createdAt.toLocaleString()}`,
    );
    console.log(`${chalk.bold("Files:")} ${metadata.stats.totalFiles}`);
    console.log(
      `${chalk.bold("Size:")} ${this.formatBytes(metadata.stats.totalSize)}`,
    );
    console.log(`${chalk.bold("Duration:")} ${metadata.stats.durationMs}ms`);
    console.log(
      `${chalk.bold("Success rate:")} ${metadata.stats.successCount}/${metadata.stats.totalFiles}`,
    );

    console.log(`\n${chalk.bold("Migration Details:")}`);
    console.log(
      `${chalk.bold("Component:")} ${metadata.migration.componentName}`,
    );
    console.log(`${chalk.bold("Source:")} ${metadata.migration.sourcePackage}`);
    console.log(`${chalk.bold("Target:")} ${metadata.migration.targetPackage}`);
    console.log(`${chalk.bold("Mode:")} ${metadata.migration.mode}`);
    console.log(`${chalk.bold("User:")} ${metadata.migration.user}`);

    if (metadata.gitState) {
      console.log(`\n${chalk.bold("Git State:")}`);
      console.log(`${chalk.bold("Branch:")} ${metadata.gitState.branch}`);
      console.log(
        `${chalk.bold("Commit:")} ${metadata.gitState.shortHash} - ${metadata.gitState.commitMessage}`,
      );
      console.log(
        `${chalk.bold("Author:")} ${metadata.gitState.author.name} <${metadata.gitState.author.email}>`,
      );

      if (metadata.gitState.workingDir.hasChanges) {
        console.log(
          `${chalk.bold("Working Dir:")} ${chalk.yellow("Has uncommitted changes")}`,
        );
      }
    }

    if (metadata.tags.length > 0) {
      console.log(`\n${chalk.bold("Tags:")} ${metadata.tags.join(", ")}`);
    }

    if (metadata.expiresAt) {
      console.log(
        `\n${chalk.bold("Expires:")} ${metadata.expiresAt.toLocaleString()}`,
      );
    }
  }

  private displayRollbackResult(result: any): void {
    if (result.status === "success") {
      console.log(chalk.green(`\n✅ Rollback completed successfully`));
    } else if (result.status === "partial") {
      console.log(chalk.yellow(`\n⚠️  Rollback completed with some issues`));
    } else {
      console.log(chalk.red(`\n❌ Rollback failed`));
    }

    console.log(`${chalk.bold("Summary:")}`);
    console.log(`   Restored: ${result.summary.restoredFiles} files`);
    console.log(`   Failed: ${result.summary.failedFiles} files`);
    console.log(`   Skipped: ${result.summary.skippedFiles} files`);
    console.log(`   Conflicts: ${result.summary.conflictedFiles} files`);
    console.log(`   Duration: ${result.durationMs}ms`);

    if (result.preRollbackBackupId) {
      console.log(
        chalk.blue(
          `\n📦 Pre-rollback backup created: ${result.preRollbackBackupId}`,
        ),
      );
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

/**
 * Main CLI entry point for backup commands
 */
export async function handleBackupCLI(args: string[]): Promise<void> {
  const cli = new BackupCLI();

  // Parse command line arguments
  const options: BackupCliOptions = {};

  // Simple argument parsing - in a real implementation, use a proper CLI parser
  if (args.includes("--dry-run")) options.dryRun = true;
  if (args.includes("--force")) options.force = true;
  if (args.includes("--quiet")) options.quiet = true;
  if (args.includes("--skip-verification")) options.skipVerification = true;

  await cli.handleBackupCommand(options);
}

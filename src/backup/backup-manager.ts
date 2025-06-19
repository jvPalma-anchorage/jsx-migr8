/**
 * Main backup system orchestrator for jsx-migr8
 * Coordinates all backup operations and provides high-level API
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";

import { getContext } from "@/context/globalContext";
import { AsyncFileUtils, fileExistsAsync } from "@/utils/fs-utils";
import { ComponentSpec } from "@/types";
import {
  BackupConfig,
  BackupId,
  BackupMetadata,
  BackupMode,
  MigrationContext,
  ActiveBackup,
  BackupError,
  ProgressCallback,
  BackupCliOptions,
} from "./types";
import { SnapshotManager } from "./snapshot-manager";
import { MetadataManager } from "./metadata-manager";
import { IntegrityManager } from "./integrity-manager";
import { GitIntegration } from "./git-integration";
import { CleanupManager } from "./cleanup-manager";

/**
 * Main backup manager class that orchestrates all backup operations
 */
export class BackupManager {
  private snapshotManager: SnapshotManager;
  private metadataManager: MetadataManager;
  private integrityManager: IntegrityManager;
  private gitIntegration: GitIntegration;
  private cleanupManager: CleanupManager;
  private fileUtils: AsyncFileUtils;
  private config: BackupConfig;

  constructor(
    private backupRoot: string = ".migr8-backups",
    config?: Partial<BackupConfig>,
  ) {
    this.config = this.mergeConfig(config);
    this.fileUtils = new AsyncFileUtils(this.config.concurrency);

    // Initialize sub-managers
    this.snapshotManager = new SnapshotManager(this.backupRoot, this.config);
    this.metadataManager = new MetadataManager(this.backupRoot);
    this.integrityManager = new IntegrityManager();
    this.gitIntegration = new GitIntegration(this.config.gitIntegration);
    this.cleanupManager = new CleanupManager(this.backupRoot, this.config);
  }

  /**
   * Create a backup before migration
   */
  async createPreMigrationBackup(
    filesToBackup: string[],
    migrationContext: Partial<MigrationContext>,
    options: BackupCliOptions = {},
  ): Promise<BackupId> {
    const context = getContext();

    const fullMigrationContext: MigrationContext = {
      migrationRuleFile: migrationContext.migrationRuleFile || "unknown",
      componentSpec: migrationContext.componentSpec || ({} as ComponentSpec),
      sourcePackage: migrationContext.sourcePackage || "unknown",
      targetPackage: migrationContext.targetPackage || "unknown",
      componentName: migrationContext.componentName || "unknown",
      cliArgs: context.runArgs,
      timestamp: new Date(),
      user: this.getCurrentUser(),
      mode: this.detectMigrationMode(),
    };

    const backupId = this.generateBackupId(fullMigrationContext);

    return this.createBackup(
      backupId,
      filesToBackup,
      fullMigrationContext,
      "pre-migration",
      options,
    );
  }

  /**
   * Create a manual backup
   */
  async createManualBackup(
    filesToBackup: string[],
    name?: string,
    options: BackupCliOptions = {},
  ): Promise<BackupId> {
    const context = getContext();

    const migrationContext: MigrationContext = {
      migrationRuleFile: "manual-backup",
      componentSpec: {} as ComponentSpec,
      sourcePackage: "manual",
      targetPackage: "manual",
      componentName: "manual-backup",
      cliArgs: context.runArgs,
      timestamp: new Date(),
      user: this.getCurrentUser(),
      mode: "interactive",
    };

    const backupId = name
      ? `${Date.now()}-manual-${this.sanitizeName(name)}`
      : this.generateBackupId(migrationContext);

    return this.createBackup(
      backupId,
      filesToBackup,
      migrationContext,
      "manual",
      options,
    );
  }

  /**
   * Core backup creation method
   */
  private async createBackup(
    backupId: BackupId,
    filesToBackup: string[],
    migrationContext: MigrationContext,
    mode: BackupMode,
    options: BackupCliOptions,
  ): Promise<BackupId> {
    const startTime = Date.now();

    try {
      // Validate inputs
      await this.validateBackupInputs(backupId, filesToBackup);

      // Create backup directory structure
      await this.snapshotManager.createBackupDirectory(backupId);

      // Get Git state if available
      const gitState = await this.gitIntegration.captureGitState(
        migrationContext.cliArgs.root || process.cwd(),
      );

      // Create initial metadata
      const metadata: BackupMetadata = {
        id: backupId,
        name: options.name || this.generateBackupName(migrationContext, mode),
        description:
          options.description ||
          this.generateBackupDescription(migrationContext, mode),
        createdAt: new Date(),
        projectRoot: migrationContext.cliArgs.root || process.cwd(),
        migration: migrationContext,
        gitState,
        files: [],
        stats: {
          totalFiles: filesToBackup.length,
          totalSize: 0,
          successCount: 0,
          failedCount: 0,
          durationMs: 0,
        },
        version: this.getBackupSystemVersion(),
        tags: [...(options.tags || []), mode],
        canAutoClean: mode === "pre-migration",
        expiresAt: this.calculateExpirationDate(mode),
      };

      // Create backup files with progress tracking
      const progressCallback: ProgressCallback | undefined = this.config
        .showProgress
        ? (completed, total, currentItem) => {
            console.log(`Backing up: ${completed}/${total} - ${currentItem}`);
          }
        : undefined;

      const backupResults = await this.snapshotManager.backupFiles(
        backupId,
        filesToBackup,
        progressCallback,
      );

      // Update metadata with results
      metadata.files = backupResults;
      metadata.stats.successCount = backupResults.filter(
        (f) => f.status === "backed-up",
      ).length;
      metadata.stats.failedCount = backupResults.filter(
        (f) => f.status === "failed",
      ).length;
      metadata.stats.totalSize = backupResults.reduce(
        (sum, f) => sum + f.size,
        0,
      );
      metadata.stats.durationMs = Date.now() - startTime;

      // Save metadata
      await this.metadataManager.saveMetadata(backupId, metadata);

      // Verify integrity if requested
      if (!options.skipVerification && this.config.verifyAfterBackup) {
        const integrityResult = await this.integrityManager.verifyBackup(
          backupId,
          metadata,
          this.snapshotManager,
        );

        if (!integrityResult.valid) {
          throw new BackupError(
            `Backup integrity verification failed for ${backupId}`,
            "INTEGRITY_VERIFICATION_FAILED",
            { backupId, integrityResult },
          );
        }
      }

      // Update active backups registry
      await this.updateActiveBackupsRegistry(metadata);

      // Trigger cleanup if needed
      if (this.config.autoCleanup) {
        await this.cleanupManager.performCleanup();
      }

      return backupId;
    } catch (error) {
      // Cleanup failed backup
      try {
        await this.snapshotManager.deleteBackup(backupId);
      } catch (cleanupError) {
        console.warn(
          `Failed to cleanup failed backup ${backupId}:`,
          cleanupError,
        );
      }

      throw error instanceof BackupError
        ? error
        : new BackupError(
            `Backup creation failed: ${error instanceof Error ? error.message : String(error)}`,
            "BACKUP_CREATION_FAILED",
            { backupId, error },
          );
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<ActiveBackup[]> {
    return this.metadataManager.listActiveBackups();
  }

  /**
   * Get detailed information about a specific backup
   */
  async getBackupInfo(backupId: BackupId): Promise<BackupMetadata | null> {
    return this.metadataManager.getMetadata(backupId);
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupId: BackupId) {
    const metadata = await this.metadataManager.getMetadata(backupId);
    if (!metadata) {
      throw new BackupError(`Backup ${backupId} not found`, "BACKUP_NOT_FOUND");
    }

    return this.integrityManager.verifyBackup(
      backupId,
      metadata,
      this.snapshotManager,
    );
  }

  /**
   * Delete a backup
   */
  async deleteBackup(
    backupId: BackupId,
    force: boolean = false,
  ): Promise<void> {
    const metadata = await this.metadataManager.getMetadata(backupId);
    if (!metadata) {
      throw new BackupError(`Backup ${backupId} not found`, "BACKUP_NOT_FOUND");
    }

    if (!force && !metadata.canAutoClean) {
      throw new BackupError(
        `Backup ${backupId} is protected from deletion. Use force=true to override.`,
        "BACKUP_PROTECTED",
      );
    }

    await this.snapshotManager.deleteBackup(backupId);
    await this.metadataManager.removeFromActiveBackups(backupId);
  }

  /**
   * Get backup system configuration
   */
  getConfig(): BackupConfig {
    return { ...this.config };
  }

  /**
   * Update backup system configuration
   */
  async updateConfig(newConfig: Partial<BackupConfig>): Promise<void> {
    this.config = this.mergeConfig(newConfig);
    await this.saveConfig();
  }

  // ========================================================================
  // PRIVATE UTILITY METHODS
  // ========================================================================

  private mergeConfig(config?: Partial<BackupConfig>): BackupConfig {
    const defaultConfig: BackupConfig = {
      maxBackups: 50,
      maxAgeDays: 30,
      maxTotalSize: 1024 * 1024 * 1024, // 1GB
      autoCleanup: true,
      cleanupSchedule: "0 2 * * *", // Daily at 2 AM
      compression: false,
      compressionLevel: 6,
      gitIntegration: true,
      namingPattern: "{timestamp}-{component}-{mode}",
      excludePatterns: [
        "node_modules/**",
        ".git/**",
        "dist/**",
        "build/**",
        "*.log",
        ".migr8-backups/**",
      ],
      verifyAfterBackup: true,
      concurrency: 10,
      showProgress: true,
    };

    return { ...defaultConfig, ...config };
  }

  private async saveConfig(): Promise<void> {
    const configPath = path.join(this.backupRoot, "config.json");
    await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
    await fs.promises.writeFile(
      configPath,
      JSON.stringify(this.config, null, 2),
    );
  }

  private generateBackupId(migrationContext: MigrationContext): BackupId {
    const timestamp = Date.now();
    const component = this.sanitizeName(migrationContext.componentName);
    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(migrationContext))
      .digest("hex")
      .substring(0, 8);

    return `${timestamp}-${component}-${hash}`;
  }

  private generateBackupName(
    migrationContext: MigrationContext,
    mode: BackupMode,
  ): string {
    const pattern = this.config.namingPattern;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    return pattern
      .replace("{timestamp}", timestamp)
      .replace("{component}", migrationContext.componentName)
      .replace("{mode}", mode)
      .replace("{source}", migrationContext.sourcePackage)
      .replace("{target}", migrationContext.targetPackage);
  }

  private generateBackupDescription(
    migrationContext: MigrationContext,
    mode: BackupMode,
  ): string {
    if (mode === "manual") {
      return "Manual backup created by user";
    }

    return `Pre-migration backup for ${migrationContext.componentName} (${migrationContext.sourcePackage} → ${migrationContext.targetPackage})`;
  }

  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  }

  private getCurrentUser(): string {
    return (
      process.env.USER ||
      process.env.USERNAME ||
      os.userInfo().username ||
      "unknown"
    );
  }

  private detectMigrationMode(): MigrationContext["mode"] {
    const context = getContext();

    if (context.runArgs.yolo) return "yolo";
    if (context.runArgs.dryRun) return "dry-run";
    return "interactive";
  }

  private calculateExpirationDate(mode: BackupMode): Date | undefined {
    if (mode === "manual") return undefined;

    const expireDays = mode === "pre-migration" ? 7 : this.config.maxAgeDays;
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + expireDays);

    return expireDate;
  }

  private getBackupSystemVersion(): string {
    // In a real implementation, this would come from package.json
    return "1.0.0";
  }

  private async validateBackupInputs(
    backupId: BackupId,
    filesToBackup: string[],
  ): Promise<void> {
    // Check if backup already exists
    const existingMetadata = await this.metadataManager.getMetadata(backupId);
    if (existingMetadata) {
      throw new BackupError(
        `Backup with ID ${backupId} already exists`,
        "BACKUP_ALREADY_EXISTS",
      );
    }

    // Validate files exist
    const missingFiles: string[] = [];
    for (const filePath of filesToBackup) {
      if (!(await fileExistsAsync(filePath))) {
        missingFiles.push(filePath);
      }
    }

    if (missingFiles.length > 0) {
      throw new BackupError(
        `Some files to backup do not exist: ${missingFiles.join(", ")}`,
        "FILES_NOT_FOUND",
        { missingFiles },
      );
    }

    // Check disk space
    const totalSize = await this.estimateBackupSize(filesToBackup);
    try {
      const diskSpace = await this.fileUtils.checkDiskSpace(this.backupRoot);

      if (totalSize > diskSpace.available * 0.9) {
        // Keep 10% buffer
        throw new BackupError(
          `Insufficient disk space for backup. Required: ${totalSize}, Available: ${diskSpace.available}`,
          "INSUFFICIENT_DISK_SPACE",
          { required: totalSize, available: diskSpace.available },
        );
      }
    } catch (error) {
      // If we can't check disk space, continue with backup but warn
      console.warn("Unable to check disk space:", error);
    }
  }

  private async estimateBackupSize(filesToBackup: string[]): Promise<number> {
    let totalSize = 0;

    for (const filePath of filesToBackup) {
      try {
        const stats = await fs.promises.stat(filePath);
        totalSize += stats.size;
      } catch {
        // Ignore files that can't be accessed
      }
    }

    return totalSize;
  }

  private async updateActiveBackupsRegistry(
    metadata: BackupMetadata,
  ): Promise<void> {
    const activeBackup: ActiveBackup = {
      id: metadata.id,
      name: metadata.name,
      createdAt: metadata.createdAt,
      fileCount: metadata.stats.totalFiles,
      totalSize: metadata.stats.totalSize,
      migration: {
        componentName: metadata.migration.componentName,
        sourcePackage: metadata.migration.sourcePackage,
        targetPackage: metadata.migration.targetPackage,
        mode: metadata.migration.mode,
      },
      integrityValid: true, // Assume valid since we just created it
      tags: metadata.tags,
    };

    await this.metadataManager.addToActiveBackups(activeBackup);
  }
}

/**
 * Singleton instance for global access
 */
let backupManagerInstance: BackupManager | null = null;

/**
 * Get or create the global backup manager instance
 */
export const getBackupManager = (): BackupManager => {
  if (!backupManagerInstance) {
    backupManagerInstance = new BackupManager();
  }
  return backupManagerInstance;
};

/**
 * Initialize backup manager with custom configuration
 */
export const initializeBackupManager = (
  backupRoot?: string,
  config?: Partial<BackupConfig>,
): BackupManager => {
  backupManagerInstance = new BackupManager(backupRoot, config);
  return backupManagerInstance;
};

/**
 * Manages rollback operations and conflict resolution
 * Handles restoration of files from backups with safety checks
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  BackupId,
  RollbackContext,
  RollbackResult,
  FileRestoreResult,
  FileConflict,
  BackupMetadata,
  BackedUpFile,
  BackupError,
  RollbackConflictError,
  ProgressCallback,
} from "./types";
import { SnapshotManager } from "./snapshot-manager";
import { MetadataManager } from "./metadata-manager";
import { BackupManager } from "./backup-manager";

/**
 * Manages all rollback operations
 */
export class RollbackManager {
  constructor(
    private snapshotManager: SnapshotManager,
    private metadataManager: MetadataManager,
    private backupManager: BackupManager,
  ) {}

  /**
   * Perform a complete rollback operation
   */
  async performRollback(context: RollbackContext): Promise<RollbackResult> {
    const startTime = Date.now();

    try {
      // Load backup metadata
      const metadata = await this.metadataManager.getMetadata(context.backupId);
      if (!metadata) {
        throw new BackupError(
          `Backup ${context.backupId} not found`,
          "BACKUP_NOT_FOUND",
        );
      }

      // Verify backup integrity if requested
      if (context.verifyIntegrity) {
        const integrityResult = await this.verifyBackupIntegrity(metadata);
        if (!integrityResult.valid) {
          throw new BackupError(
            `Backup integrity check failed: ${integrityResult.summary.invalidFiles} invalid files`,
            "BACKUP_INTEGRITY_FAILED",
            { integrityResult },
          );
        }
      }

      // Determine files to restore
      const filesToRestore = this.selectFilesToRestore(
        metadata,
        context.filesToRestore,
      );

      // Create pre-rollback backup if requested
      let preRollbackBackupId: BackupId | undefined;
      if (context.createPreRollbackBackup) {
        preRollbackBackupId = await this.createPreRollbackBackup(
          filesToRestore,
          context,
        );
      }

      // Detect conflicts
      const conflicts = await this.detectConflicts(filesToRestore);
      if (conflicts.length > 0 && context.mode !== "interactive") {
        throw new RollbackConflictError(
          `Found ${conflicts.length} file conflicts that require resolution`,
          conflicts,
        );
      }

      // Perform restoration
      const restoreResults = await this.restoreFiles(
        context.backupId,
        filesToRestore,
        conflicts,
        context.mode === "interactive",
      );

      // Calculate results
      const result: RollbackResult = {
        context,
        status: this.calculateRollbackStatus(restoreResults),
        files: restoreResults,
        preRollbackBackupId,
        summary: {
          totalFiles: restoreResults.length,
          restoredFiles: restoreResults.filter((r) => r.status === "restored")
            .length,
          failedFiles: restoreResults.filter((r) => r.status === "failed")
            .length,
          skippedFiles: restoreResults.filter((r) => r.status === "skipped")
            .length,
          conflictedFiles: restoreResults.filter((r) => r.status === "conflict")
            .length,
        },
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      };

      return result;
    } catch (error) {
      throw error instanceof BackupError
        ? error
        : new BackupError(
            `Rollback failed: ${error instanceof Error ? error.message : String(error)}`,
            "ROLLBACK_FAILED",
            { context, error },
          );
    }
  }

  /**
   * Perform an interactive rollback with user prompts
   */
  async performInteractiveRollback(
    backupId: BackupId,
    onProgress?: ProgressCallback,
  ): Promise<RollbackResult> {
    const metadata = await this.metadataManager.getMetadata(backupId);
    if (!metadata) {
      throw new BackupError(`Backup ${backupId} not found`, "BACKUP_NOT_FOUND");
    }

    // Show backup information
    console.log(`\nRollback Information:`);
    console.log(`Backup: ${metadata.name}`);
    console.log(`Created: ${metadata.createdAt.toISOString()}`);
    console.log(`Files: ${metadata.files.length}`);
    console.log(
      `Migration: ${metadata.migration.componentName} (${metadata.migration.sourcePackage} → ${metadata.migration.targetPackage})`,
    );

    // Get user selections
    const filesToRestore = await this.promptFileSelection(metadata.files);

    if (filesToRestore.length === 0) {
      throw new BackupError(
        "No files selected for rollback",
        "NO_FILES_SELECTED",
      );
    }

    // Detect conflicts and get user resolution
    const conflicts = await this.detectConflicts(filesToRestore);
    const resolvedConflicts =
      await this.resolveConflictsInteractively(conflicts);

    // Create context
    const context: RollbackContext = {
      backupId,
      filesToRestore: filesToRestore.map((f) => f.originalPath),
      createPreRollbackBackup: true, // Always create backup in interactive mode
      mode: "interactive",
      verifyIntegrity: true,
      user: process.env.USER || "unknown",
      timestamp: new Date(),
    };

    return this.performRollback(context);
  }

  /**
   * Restore specific files from a backup
   */
  async restoreSpecificFiles(
    backupId: BackupId,
    filePaths: string[],
    options: {
      force?: boolean;
      createBackup?: boolean;
      verifyIntegrity?: boolean;
    } = {},
  ): Promise<FileRestoreResult[]> {
    const metadata = await this.metadataManager.getMetadata(backupId);
    if (!metadata) {
      throw new BackupError(`Backup ${backupId} not found`, "BACKUP_NOT_FOUND");
    }

    // Filter files to restore
    const filesToRestore = metadata.files.filter(
      (file) =>
        filePaths.includes(file.originalPath) ||
        filePaths.includes(file.relativePath),
    );

    if (filesToRestore.length === 0) {
      throw new BackupError(
        "No matching files found in backup",
        "NO_MATCHING_FILES",
      );
    }

    // Check for conflicts
    const conflicts = await this.detectConflicts(filesToRestore);
    if (conflicts.length > 0 && !options.force) {
      throw new RollbackConflictError(
        `Found ${conflicts.length} file conflicts. Use force=true to override.`,
        conflicts,
      );
    }

    // Create backup if requested
    if (options.createBackup) {
      await this.createPreRollbackBackup(filesToRestore, {
        backupId,
        filesToRestore: filePaths,
        createPreRollbackBackup: true,
        mode: "selective",
        verifyIntegrity: options.verifyIntegrity || false,
        user: process.env.USER || "unknown",
        timestamp: new Date(),
      });
    }

    // Restore files
    return this.snapshotManager.restoreFiles(backupId, filesToRestore);
  }

  /**
   * Get rollback preview without actually restoring files
   */
  async getRollbackPreview(
    backupId: BackupId,
    filePaths?: string[],
  ): Promise<{
    backup: BackupMetadata;
    filesToRestore: BackedUpFile[];
    conflicts: FileConflict[];
    summary: {
      totalFiles: number;
      conflictedFiles: number;
      safeToRestore: number;
    };
  }> {
    const metadata = await this.metadataManager.getMetadata(backupId);
    if (!metadata) {
      throw new BackupError(`Backup ${backupId} not found`, "BACKUP_NOT_FOUND");
    }

    const filesToRestore = this.selectFilesToRestore(metadata, filePaths);
    const conflicts = await this.detectConflicts(filesToRestore);

    return {
      backup: metadata,
      filesToRestore,
      conflicts,
      summary: {
        totalFiles: filesToRestore.length,
        conflictedFiles: conflicts.length,
        safeToRestore: filesToRestore.length - conflicts.length,
      },
    };
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private async verifyBackupIntegrity(metadata: BackupMetadata) {
    // This would use the IntegrityManager
    // Simplified implementation for now
    return {
      valid: true,
      summary: {
        totalFiles: metadata.files.length,
        validFiles: metadata.files.length,
        invalidFiles: 0,
        errorFiles: 0,
      },
    };
  }

  private selectFilesToRestore(
    metadata: BackupMetadata,
    filePaths?: string[],
  ): BackedUpFile[] {
    if (!filePaths || filePaths.length === 0) {
      return metadata.files;
    }

    return metadata.files.filter(
      (file) =>
        filePaths.includes(file.originalPath) ||
        filePaths.includes(file.relativePath),
    );
  }

  private async createPreRollbackBackup(
    filesToRestore: BackedUpFile[],
    context: RollbackContext,
  ): Promise<BackupId> {
    const existingFiles = [];

    for (const file of filesToRestore) {
      try {
        await fs.promises.access(file.originalPath);
        existingFiles.push(file.originalPath);
      } catch {
        // File doesn't exist - skip
      }
    }

    if (existingFiles.length === 0) {
      throw new BackupError(
        "No existing files to backup before rollback",
        "NO_FILES_TO_BACKUP",
      );
    }

    return this.backupManager.createManualBackup(
      existingFiles,
      `pre-rollback-${context.backupId}`,
      {
        description: `Pre-rollback backup created before restoring ${context.backupId}`,
        tags: ["pre-rollback", "auto-generated"],
      },
    );
  }

  private async detectConflicts(
    filesToRestore: BackedUpFile[],
  ): Promise<FileConflict[]> {
    const conflicts: FileConflict[] = [];

    for (const file of filesToRestore) {
      try {
        const currentExists = await this.fileExists(file.originalPath);

        if (currentExists) {
          const currentContent = await fs.promises.readFile(
            file.originalPath,
            "utf8",
          );
          const currentChecksum = this.calculateChecksum(currentContent);

          if (currentChecksum !== file.checksum) {
            conflicts.push({
              currentChecksum,
              backupChecksum: file.checksum,
              expectedChecksum: file.checksum,
              type: "modified-since-backup",
              resolution: "overwrite",
            });
          }
        }
      } catch (error) {
        // Error reading file - might be a permission issue
        conflicts.push({
          currentChecksum: "",
          backupChecksum: file.checksum,
          expectedChecksum: file.checksum,
          type: "missing-current",
          resolution: "overwrite",
        });
      }
    }

    return conflicts;
  }

  private async restoreFiles(
    backupId: BackupId,
    filesToRestore: BackedUpFile[],
    conflicts: FileConflict[],
    interactive: boolean,
  ): Promise<FileRestoreResult[]> {
    const results: FileRestoreResult[] = [];

    for (const file of filesToRestore) {
      const conflict = conflicts.find(
        (c) => c.backupChecksum === file.checksum,
      );

      if (conflict && !interactive) {
        results.push({
          filePath: file.originalPath,
          status: "conflict",
          conflict,
        });
        continue;
      }

      try {
        const restoreResult = await this.snapshotManager.restoreFiles(
          backupId,
          [file],
        );
        results.push(...restoreResult);
      } catch (error) {
        results.push({
          filePath: file.originalPath,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  private calculateRollbackStatus(
    restoreResults: FileRestoreResult[],
  ): RollbackResult["status"] {
    const hasFailures = restoreResults.some((r) => r.status === "failed");
    const hasConflicts = restoreResults.some((r) => r.status === "conflict");
    const hasSuccesses = restoreResults.some((r) => r.status === "restored");

    if (hasFailures || hasConflicts) {
      return hasSuccesses ? "partial" : "failed";
    }

    return "success";
  }

  private async promptFileSelection(
    files: BackedUpFile[],
  ): Promise<BackedUpFile[]> {
    // This would integrate with the CLI prompt system
    // For now, return all files
    return files;
  }

  private async resolveConflictsInteractively(
    conflicts: FileConflict[],
  ): Promise<FileConflict[]> {
    // This would present conflict resolution options to the user
    // For now, return conflicts as-is
    return conflicts;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private calculateChecksum(content: string): string {
    return crypto.createHash("sha256").update(content, "utf8").digest("hex");
  }
}

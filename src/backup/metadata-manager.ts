/**
 * Manages backup metadata storage and retrieval
 * Handles the registry of active backups and their metadata
 */
import fs from "node:fs";
import path from "node:path";

import {
  writeJsonFileAsync,
  readFileAsync,
  fileExistsAsync,
} from "@/utils/fs-utils";
import { BackupId, BackupMetadata, ActiveBackup, BackupError } from "./types";

/**
 * Manages all backup metadata operations
 */
export class MetadataManager {
  private activeBackupsPath: string;

  constructor(private backupRoot: string) {
    this.activeBackupsPath = path.join(this.backupRoot, "active-backups.json");
  }

  /**
   * Save metadata for a specific backup
   */
  async saveMetadata(
    backupId: BackupId,
    metadata: BackupMetadata,
  ): Promise<void> {
    const metadataPath = this.getMetadataPath(backupId);

    try {
      await fs.promises.mkdir(path.dirname(metadataPath), { recursive: true });
      await writeJsonFileAsync(metadataPath, metadata);
    } catch (error) {
      throw new BackupError(
        `Failed to save metadata for backup ${backupId}`,
        "METADATA_SAVE_FAILED",
        { backupId, error },
      );
    }
  }

  /**
   * Load metadata for a specific backup
   */
  async getMetadata(backupId: BackupId): Promise<BackupMetadata | null> {
    const metadataPath = this.getMetadataPath(backupId);

    try {
      if (!(await fileExistsAsync(metadataPath))) {
        return null;
      }

      const content = await readFileAsync(metadataPath);
      const metadata = JSON.parse(content) as BackupMetadata;

      // Convert date strings back to Date objects
      metadata.createdAt = new Date(metadata.createdAt);
      metadata.migration.timestamp = new Date(metadata.migration.timestamp);

      if (metadata.expiresAt) {
        metadata.expiresAt = new Date(metadata.expiresAt);
      }

      if (metadata.gitState) {
        // Convert any date fields in git state if needed
      }

      metadata.files.forEach((file) => {
        file.lastModified = new Date(file.lastModified);
      });

      return metadata;
    } catch (error) {
      throw new BackupError(
        `Failed to load metadata for backup ${backupId}`,
        "METADATA_LOAD_FAILED",
        { backupId, error },
      );
    }
  }

  /**
   * Update metadata for a specific backup
   */
  async updateMetadata(
    backupId: BackupId,
    updates: Partial<BackupMetadata>,
  ): Promise<void> {
    const currentMetadata = await this.getMetadata(backupId);

    if (!currentMetadata) {
      throw new BackupError(
        `Backup ${backupId} not found`,
        "BACKUP_NOT_FOUND",
        { backupId },
      );
    }

    const updatedMetadata = { ...currentMetadata, ...updates };
    await this.saveMetadata(backupId, updatedMetadata);
  }

  /**
   * Delete metadata for a specific backup
   */
  async deleteMetadata(backupId: BackupId): Promise<void> {
    const metadataPath = this.getMetadataPath(backupId);

    try {
      if (await fileExistsAsync(metadataPath)) {
        await fs.promises.unlink(metadataPath);
      }
    } catch (error) {
      throw new BackupError(
        `Failed to delete metadata for backup ${backupId}`,
        "METADATA_DELETE_FAILED",
        { backupId, error },
      );
    }
  }

  /**
   * Get all active backups
   */
  async listActiveBackups(): Promise<ActiveBackup[]> {
    try {
      if (!(await fileExistsAsync(this.activeBackupsPath))) {
        return [];
      }

      const content = await readFileAsync(this.activeBackupsPath);
      const activeBackups = JSON.parse(content) as ActiveBackup[];

      // Convert date strings back to Date objects
      return activeBackups.map((backup) => ({
        ...backup,
        createdAt: new Date(backup.createdAt),
        lastVerified: backup.lastVerified
          ? new Date(backup.lastVerified)
          : undefined,
      }));
    } catch (error) {
      throw new BackupError(
        "Failed to load active backups registry",
        "REGISTRY_LOAD_FAILED",
        { error },
      );
    }
  }

  /**
   * Add backup to active backups registry
   */
  async addToActiveBackups(backup: ActiveBackup): Promise<void> {
    try {
      const activeBackups = await this.listActiveBackups();

      // Remove any existing backup with the same ID
      const filteredBackups = activeBackups.filter((b) => b.id !== backup.id);

      // Add the new backup
      filteredBackups.push(backup);

      // Sort by creation date (newest first)
      filteredBackups.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      await this.saveActiveBackups(filteredBackups);
    } catch (error) {
      throw new BackupError(
        `Failed to add backup ${backup.id} to registry`,
        "REGISTRY_ADD_FAILED",
        { backupId: backup.id, error },
      );
    }
  }

  /**
   * Remove backup from active backups registry
   */
  async removeFromActiveBackups(backupId: BackupId): Promise<void> {
    try {
      const activeBackups = await this.listActiveBackups();
      const filteredBackups = activeBackups.filter((b) => b.id !== backupId);

      await this.saveActiveBackups(filteredBackups);
    } catch (error) {
      throw new BackupError(
        `Failed to remove backup ${backupId} from registry`,
        "REGISTRY_REMOVE_FAILED",
        { backupId, error },
      );
    }
  }

  /**
   * Update backup in active backups registry
   */
  async updateActiveBackup(
    backupId: BackupId,
    updates: Partial<ActiveBackup>,
  ): Promise<void> {
    try {
      const activeBackups = await this.listActiveBackups();
      const backupIndex = activeBackups.findIndex((b) => b.id === backupId);

      if (backupIndex === -1) {
        throw new BackupError(
          `Backup ${backupId} not found in registry`,
          "BACKUP_NOT_IN_REGISTRY",
          { backupId },
        );
      }

      activeBackups[backupIndex] = {
        ...activeBackups[backupIndex],
        ...updates,
      };
      await this.saveActiveBackups(activeBackups);
    } catch (error) {
      throw new BackupError(
        `Failed to update backup ${backupId} in registry`,
        "REGISTRY_UPDATE_FAILED",
        { backupId, error },
      );
    }
  }

  /**
   * Find backups by criteria
   */
  async findBackups(criteria: {
    componentName?: string;
    sourcePackage?: string;
    targetPackage?: string;
    mode?: string;
    tags?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
  }): Promise<ActiveBackup[]> {
    const activeBackups = await this.listActiveBackups();

    return activeBackups.filter((backup) => {
      if (
        criteria.componentName &&
        backup.migration.componentName !== criteria.componentName
      ) {
        return false;
      }

      if (
        criteria.sourcePackage &&
        backup.migration.sourcePackage !== criteria.sourcePackage
      ) {
        return false;
      }

      if (
        criteria.targetPackage &&
        backup.migration.targetPackage !== criteria.targetPackage
      ) {
        return false;
      }

      if (criteria.mode && backup.migration.mode !== criteria.mode) {
        return false;
      }

      if (
        criteria.tags &&
        !criteria.tags.every((tag) => backup.tags.includes(tag))
      ) {
        return false;
      }

      if (criteria.createdAfter && backup.createdAt < criteria.createdAfter) {
        return false;
      }

      if (criteria.createdBefore && backup.createdAt > criteria.createdBefore) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    averageSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    byMode: Record<string, number>;
    byComponent: Record<string, number>;
  }> {
    const activeBackups = await this.listActiveBackups();

    if (activeBackups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        averageSize: 0,
        byMode: {},
        byComponent: {},
      };
    }

    const totalSize = activeBackups.reduce(
      (sum, backup) => sum + backup.totalSize,
      0,
    );
    const dates = activeBackups.map((b) => b.createdAt);

    const byMode: Record<string, number> = {};
    const byComponent: Record<string, number> = {};

    activeBackups.forEach((backup) => {
      byMode[backup.migration.mode] = (byMode[backup.migration.mode] || 0) + 1;
      byComponent[backup.migration.componentName] =
        (byComponent[backup.migration.componentName] || 0) + 1;
    });

    return {
      totalBackups: activeBackups.length,
      totalSize,
      averageSize: totalSize / activeBackups.length,
      oldestBackup: new Date(Math.min(...dates.map((d) => d.getTime()))),
      newestBackup: new Date(Math.max(...dates.map((d) => d.getTime()))),
      byMode,
      byComponent,
    };
  }

  /**
   * Get backups that can be cleaned up
   */
  async getCleanupCandidates(): Promise<ActiveBackup[]> {
    const activeBackups = await this.listActiveBackups();
    const now = new Date();

    const candidates: ActiveBackup[] = [];

    for (const backup of activeBackups) {
      try {
        const metadata = await this.getMetadata(backup.id);
        if (metadata && metadata.canAutoClean) {
          if (metadata.expiresAt && metadata.expiresAt < now) {
            candidates.push(backup);
          }
        }
      } catch (error) {
        // If we can't load metadata, consider it a cleanup candidate
        candidates.push(backup);
      }
    }

    return candidates;
  }

  /**
   * Export backup metadata
   */
  async exportMetadata(backupId: BackupId): Promise<string> {
    const metadata = await this.getMetadata(backupId);

    if (!metadata) {
      throw new BackupError(
        `Backup ${backupId} not found`,
        "BACKUP_NOT_FOUND",
        { backupId },
      );
    }

    return JSON.stringify(metadata, null, 2);
  }

  /**
   * Import backup metadata
   */
  async importMetadata(metadataJson: string): Promise<BackupId> {
    try {
      const metadata = JSON.parse(metadataJson) as BackupMetadata;

      // Validate required fields
      if (!metadata.id || !metadata.name || !metadata.files) {
        throw new Error("Invalid metadata format");
      }

      await this.saveMetadata(metadata.id, metadata);

      // Add to active backups
      const activeBackup: ActiveBackup = {
        id: metadata.id,
        name: metadata.name,
        createdAt: new Date(metadata.createdAt),
        fileCount: metadata.stats.totalFiles,
        totalSize: metadata.stats.totalSize,
        migration: {
          componentName: metadata.migration.componentName,
          sourcePackage: metadata.migration.sourcePackage,
          targetPackage: metadata.migration.targetPackage,
          mode: metadata.migration.mode,
        },
        integrityValid: false, // Will need to be verified
        tags: metadata.tags,
      };

      await this.addToActiveBackups(activeBackup);

      return metadata.id;
    } catch (error) {
      throw new BackupError(
        "Failed to import metadata",
        "METADATA_IMPORT_FAILED",
        { error },
      );
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Get metadata file path for a backup
   */
  private getMetadataPath(backupId: BackupId): string {
    return path.join(this.backupRoot, "snapshots", backupId, "metadata.json");
  }

  /**
   * Save active backups registry to disk
   */
  private async saveActiveBackups(
    activeBackups: ActiveBackup[],
  ): Promise<void> {
    await fs.promises.mkdir(path.dirname(this.activeBackupsPath), {
      recursive: true,
    });
    await writeJsonFileAsync(this.activeBackupsPath, activeBackups);
  }

  /**
   * Validate metadata structure
   */
  private validateMetadata(metadata: any): metadata is BackupMetadata {
    return (
      typeof metadata.id === "string" &&
      typeof metadata.name === "string" &&
      typeof metadata.createdAt === "string" &&
      typeof metadata.projectRoot === "string" &&
      typeof metadata.migration === "object" &&
      Array.isArray(metadata.files) &&
      typeof metadata.stats === "object"
    );
  }

  /**
   * Sanitize metadata before saving
   */
  private sanitizeMetadata(metadata: BackupMetadata): BackupMetadata {
    // Remove any circular references or non-serializable data
    return JSON.parse(JSON.stringify(metadata));
  }
}

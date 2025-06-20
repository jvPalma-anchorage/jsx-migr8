/**
 * Manages creation and restoration of file snapshots
 * Handles physical file backup and restore operations
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  AsyncFileUtils,
  AsyncBatchProcessor,
  fileExistsAsync,
} from "@/utils/fs-utils";
import {
  BackupId,
  BackedUpFile,
  BackupConfig,
  FileRestoreResult,
  FileConflict,
  BackupFileError,
  ProgressCallback,
  FilePathEncoding,
} from "./types";

/**
 * Manages snapshot creation and restoration operations
 */
export class SnapshotManager {
  private fileUtils: AsyncFileUtils;
  constructor(
    private backupRoot: string,
    private config: BackupConfig,
  ) {
    this.fileUtils = new AsyncFileUtils(config.concurrency);
  }

  /**
   * Create backup directory structure for a specific backup
   */
  async createBackupDirectory(backupId: BackupId): Promise<void> {
    const backupDir = this.getBackupDirectory(backupId);
    const filesDir = path.join(backupDir, "files");

    await fs.promises.mkdir(filesDir, { recursive: true });
  }

  /**
   * Backup multiple files to a snapshot
   */
  async backupFiles(
    backupId: BackupId,
    filePaths: string[],
    onProgress?: ProgressCallback,
  ): Promise<BackedUpFile[]> {
    const projectRoot = process.cwd();

    const batchProcessor = new AsyncBatchProcessor<string, BackedUpFile>(
      filePaths,
      async (filePath: string) =>
        this.backupSingleFile(backupId, filePath, projectRoot),
      this.config.concurrency,
    );

    return batchProcessor.process(onProgress);
  }

  /**
   * Backup a single file
   */
  private async backupSingleFile(
    backupId: BackupId,
    filePath: string,
    projectRoot: string,
  ): Promise<BackedUpFile> {
    const absolutePath = path.resolve(filePath);
    const relativePath = path.relative(projectRoot, absolutePath);
    const encodedPath = this.encodeFilePath(relativePath);

    const backedUpFile: BackedUpFile = {
      originalPath: absolutePath,
      relativePath,
      encodedPath,
      size: 0,
      lastModified: new Date(),
      checksum: "",
      status: "failed",
    };

    try {
      // Check if file exists and get stats
      const stats = await fs.promises.stat(absolutePath);
      backedUpFile.size = stats.size;
      backedUpFile.lastModified = stats.mtime;

      // Read file content
      const content = await fs.promises.readFile(absolutePath, "utf8");

      // Calculate checksum
      backedUpFile.checksum = this.calculateChecksum(content);

      // Determine backup file path
      const backupFilePath = this.getBackupFilePath(backupId, encodedPath);

      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(backupFilePath), {
        recursive: true,
      });

      // Write backup file atomically
      const tempBackupPath = `${backupFilePath}.tmp.${process.pid}`;
      await fs.promises.writeFile(tempBackupPath, content, "utf8");
      await fs.promises.rename(tempBackupPath, backupFilePath);

      // Verify backup was written correctly
      const backupStats = await fs.promises.stat(backupFilePath);
      if (backupStats.size !== stats.size) {
        throw new Error(
          `Backup file size mismatch: expected ${stats.size}, got ${backupStats.size}`,
        );
      }

      backedUpFile.status = "backed-up";
      return backedUpFile;
    } catch (error) {
      backedUpFile.status = "failed";
      backedUpFile.error =
        error instanceof Error ? error.message : String(error);

      // Log error but don't throw - we want to continue backing up other files
      console.warn(`Failed to backup file ${absolutePath}:`, error);

      return backedUpFile;
    }
  }

  /**
   * Restore files from a snapshot
   */
  async restoreFiles(
    backupId: BackupId,
    filesToRestore: BackedUpFile[],
    onProgress?: ProgressCallback,
  ): Promise<FileRestoreResult[]> {
    const processor = new AsyncBatchProcessor<BackedUpFile, FileRestoreResult>(
      this.config.concurrency,
    );

    return processor.process(
      filesToRestore,
      async (fileInfo: BackedUpFile) =>
        this.restoreSingleFile(backupId, fileInfo),
      onProgress,
    );
  }

  /**
   * Restore a single file from backup
   */
  private async restoreSingleFile(
    backupId: BackupId,
    fileInfo: BackedUpFile,
  ): Promise<FileRestoreResult> {
    const result: FileRestoreResult = {
      filePath: fileInfo.originalPath,
      status: "failed",
    };

    try {
      const backupFilePath = this.getBackupFilePath(
        backupId,
        fileInfo.encodedPath,
      );

      // Check if backup file exists
      if (!(await this.fileExists(backupFilePath))) {
        result.status = "failed";
        result.error = "Backup file not found";
        return result;
      }

      // Check for conflicts
      const conflict = await this.detectFileConflict(fileInfo, backupFilePath);
      if (conflict) {
        result.status = "conflict";
        result.conflict = conflict;
        return result;
      }

      // Read backup content
      const backupContent = await fs.promises.readFile(backupFilePath, "utf8");

      // Verify backup integrity
      const actualChecksum = this.calculateChecksum(backupContent);
      if (actualChecksum !== fileInfo.checksum) {
        result.status = "failed";
        result.error = `Backup integrity check failed: expected ${fileInfo.checksum}, got ${actualChecksum}`;
        return result;
      }

      // Ensure target directory exists
      await fs.promises.mkdir(path.dirname(fileInfo.originalPath), {
        recursive: true,
      });

      // Restore file atomically
      const tempPath = `${fileInfo.originalPath}.migr8-restore-${Date.now()}`;
      await fs.promises.writeFile(tempPath, backupContent, "utf8");
      await fs.promises.rename(tempPath, fileInfo.originalPath);

      result.status = "restored";
      return result;
    } catch (error) {
      result.status = "failed";
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * Detect file conflicts before restoration
   */
  private async detectFileConflict(
    fileInfo: BackedUpFile,
    backupFilePath: string,
  ): Promise<FileConflict | null> {
    const currentExists = await this.fileExists(fileInfo.originalPath);
    const backupExists = await this.fileExists(backupFilePath);

    if (!backupExists) {
      return {
        currentChecksum: "",
        backupChecksum: "",
        expectedChecksum: fileInfo.checksum,
        type: "missing-backup",
        resolution: "skip",
      };
    }

    if (!currentExists) {
      // File was deleted since backup - not a conflict, safe to restore
      return null;
    }

    // Both files exist - check for modifications
    const currentContent = await fs.promises.readFile(
      fileInfo.originalPath,
      "utf8",
    );
    const currentChecksum = this.calculateChecksum(currentContent);

    const backupContent = await fs.promises.readFile(backupFilePath, "utf8");
    const backupChecksum = this.calculateChecksum(backupContent);

    if (currentChecksum === fileInfo.checksum) {
      // File hasn't changed since backup - safe to restore
      return null;
    }

    if (backupChecksum !== fileInfo.checksum) {
      return {
        currentChecksum,
        backupChecksum,
        expectedChecksum: fileInfo.checksum,
        type: "checksum-mismatch",
        resolution: "skip",
      };
    }

    // File has been modified since backup
    return {
      currentChecksum,
      backupChecksum,
      expectedChecksum: fileInfo.checksum,
      type: "modified-since-backup",
      resolution: "overwrite", // Default to overwrite, but user can change this
    };
  }

  /**
   * Get backup file content for comparison
   */
  async getBackupFileContent(
    backupId: BackupId,
    encodedPath: string,
  ): Promise<string> {
    const backupFilePath = this.getBackupFilePath(backupId, encodedPath);
    return fs.promises.readFile(backupFilePath, "utf8");
  }

  /**
   * Delete an entire backup snapshot
   */
  async deleteBackup(backupId: BackupId): Promise<void> {
    const backupDir = this.getBackupDirectory(backupId);

    if (await this.fileExists(backupDir)) {
      await this.removeDirectory(backupDir);
    }
  }

  /**
   * Get backup directory path
   */
  private getBackupDirectory(backupId: BackupId): string {
    return path.join(this.backupRoot, "snapshots", backupId);
  }

  /**
   * Get backup file path
   */
  private getBackupFilePath(backupId: BackupId, encodedPath: string): string {
    return path.join(this.getBackupDirectory(backupId), "files", encodedPath);
  }

  /**
   * Encode file path for safe filesystem storage
   */
  private encodeFilePath(
    filePath: string,
    encoding: FilePathEncoding = "base64",
  ): string {
    switch (encoding) {
      case "base64":
        return Buffer.from(filePath).toString("base64");

      case "hex":
        return Buffer.from(filePath).toString("hex");

      case "safe-path":
        return filePath
          .replace(/[/\\]/g, "_SLASH_")
          .replace(/[<>:"|?*]/g, "_")
          .replace(/\s+/g, "_")
          .replace(/\.+/g, "_DOT_");

      default:
        return filePath;
    }
  }

  /**
   * Decode file path from encoded format
   */
  private decodeFilePath(
    encodedPath: string,
    encoding: FilePathEncoding = "base64",
  ): string {
    switch (encoding) {
      case "base64":
        return Buffer.from(encodedPath, "base64").toString("utf8");

      case "hex":
        return Buffer.from(encodedPath, "hex").toString("utf8");

      case "safe-path":
        return encodedPath
          .replace(/_SLASH_/g, "/")
          .replace(/_DOT_/g, ".")
          .replace(/_/g, " ");

      default:
        return encodedPath;
    }
  }

  /**
   * Calculate SHA-256 checksum of content
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash("sha256").update(content, "utf8").digest("hex");
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    return fileExistsAsync(filePath);
  }

  /**
   * Remove directory recursively
   */
  private async removeDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      throw new BackupFileError(
        `Failed to remove directory ${dirPath}`,
        dirPath,
        "delete",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(backupId: BackupId): Promise<{
    totalFiles: number;
    totalSize: number;
    diskUsage: number;
  }> {
    const backupDir = this.getBackupDirectory(backupId);
    const filesDir = path.join(backupDir, "files");

    let totalFiles = 0;
    let totalSize = 0;
    let diskUsage = 0;

    if (await this.fileExists(filesDir)) {
      const files = await this.getAllFiles(filesDir);
      totalFiles = files.length;

      for (const file of files) {
        const stats = await fs.promises.stat(file);
        totalSize += stats.size;
        diskUsage += stats.size;
      }
    }

    return { totalFiles, totalSize, diskUsage };
  }

  /**
   * Get all files in directory recursively
   */
  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        const subFiles = await this.getAllFiles(itemPath);
        files.push(...subFiles);
      } else if (item.isFile()) {
        files.push(itemPath);
      }
    }

    return files;
  }

  /**
   * Verify backup file integrity
   */
  async verifyBackupFile(
    backupId: BackupId,
    fileInfo: BackedUpFile,
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const backupFilePath = this.getBackupFilePath(
        backupId,
        fileInfo.encodedPath,
      );

      if (!(await this.fileExists(backupFilePath))) {
        return { valid: false, error: "Backup file not found" };
      }

      const content = await fs.promises.readFile(backupFilePath, "utf8");
      const actualChecksum = this.calculateChecksum(content);

      if (actualChecksum !== fileInfo.checksum) {
        return {
          valid: false,
          error: `Checksum mismatch: expected ${fileInfo.checksum}, got ${actualChecksum}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

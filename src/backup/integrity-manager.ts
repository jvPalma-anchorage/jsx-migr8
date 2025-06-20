/**
 * Manages backup integrity verification using checksums
 * Ensures backup files are not corrupted and can be safely restored
 */
import crypto from "node:crypto";
import fs from "node:fs";

import {
  BackupId,
  BackupMetadata,
  BackedUpFile,
  IntegrityCheckResult,
  BackupIntegrityResult,
  IntegrityError,
  ProgressCallback,
} from "./types";
import { SnapshotManager } from "./snapshot-manager";
import { AsyncBatchProcessor } from "@/utils/fs-utils";

/**
 * Manages all backup integrity verification operations
 */
export class IntegrityManager {
  constructor(private concurrency: number = 10) {
  }

  /**
   * Verify the integrity of an entire backup
   */
  async verifyBackup(
    backupId: BackupId,
    metadata: BackupMetadata,
    snapshotManager: SnapshotManager,
    onProgress?: ProgressCallback,
  ): Promise<BackupIntegrityResult> {
    const startTime = Date.now();

    try {
      // Verify each file in the backup
      const batchProcessor = new AsyncBatchProcessor<
        BackedUpFile,
        IntegrityCheckResult
      >(
        metadata.files,
        async (fileInfo: BackedUpFile) =>
          this.verifyBackupFile(backupId, fileInfo, snapshotManager),
        this.concurrency,
      );

      const fileResults = await batchProcessor.process(onProgress);

      // Calculate summary statistics
      const summary = {
        totalFiles: fileResults.length,
        validFiles: fileResults.filter((r) => r.valid).length,
        invalidFiles: fileResults.filter((r) => !r.valid && !r.error).length,
        errorFiles: fileResults.filter((r) => !!r.error).length,
      };

      const result: BackupIntegrityResult = {
        backupId,
        valid: summary.invalidFiles === 0 && summary.errorFiles === 0,
        files: fileResults,
        summary,
        verifiedAt: new Date(),
      };

      return result;
    } catch (error) {
      throw new IntegrityError(
        `Backup integrity verification failed for ${backupId}`,
        backupId,
        [],
      );
    }
  }

  /**
   * Verify integrity of a single backup file
   */
  async verifyBackupFile(
    backupId: BackupId,
    fileInfo: BackedUpFile,
    snapshotManager: SnapshotManager,
  ): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      filePath: fileInfo.originalPath,
      valid: false,
      expectedChecksum: fileInfo.checksum,
    };

    try {
      // Get backup file content
      const backupContent = await snapshotManager.getBackupFileContent(
        backupId,
        fileInfo.encodedPath,
      );

      // Calculate actual checksum
      result.actualChecksum = this.calculateChecksum(backupContent);

      // Compare checksums
      result.valid = result.actualChecksum === result.expectedChecksum;

      if (!result.valid) {
        result.error = `Checksum mismatch: expected ${result.expectedChecksum}, got ${result.actualChecksum}`;
      }
    } catch (error) {
      result.error = `Failed to verify file: ${error instanceof Error ? error.message : String(error)}`;
    }

    return result;
  }

  /**
   * Verify integrity of original files against their checksums
   */
  async verifyOriginalFiles(
    files: BackedUpFile[],
    onProgress?: ProgressCallback,
  ): Promise<IntegrityCheckResult[]> {
    return this.batchProcessor.process(
      files,
      async (fileInfo: BackedUpFile) => this.verifyOriginalFile(fileInfo),
      onProgress,
    );
  }

  /**
   * Verify integrity of a single original file
   */
  async verifyOriginalFile(
    fileInfo: BackedUpFile,
  ): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      filePath: fileInfo.originalPath,
      valid: false,
      expectedChecksum: fileInfo.checksum,
    };

    try {
      // Check if file exists
      await fs.promises.access(fileInfo.originalPath);

      // Read file content
      const content = await fs.promises.readFile(fileInfo.originalPath, "utf8");

      // Calculate actual checksum
      result.actualChecksum = this.calculateChecksum(content);

      // Compare checksums
      result.valid = result.actualChecksum === result.expectedChecksum;

      if (!result.valid) {
        result.error = `File modified since backup: expected ${result.expectedChecksum}, got ${result.actualChecksum}`;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        result.error = "File not found";
      } else {
        result.error = `Failed to verify file: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return result;
  }

  /**
   * Calculate checksum for file content
   */
  calculateChecksum(content: string): string {
    return crypto.createHash("sha256").update(content, "utf8").digest("hex");
  }

  /**
   * Calculate checksum for file by path
   */
  async calculateFileChecksum(filePath: string): Promise<string> {
    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      return this.calculateChecksum(content);
    } catch (error) {
      throw new Error(
        `Failed to calculate checksum for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Batch calculate checksums for multiple files
   */
  async calculateFileChecksums(
    filePaths: string[],
    onProgress?: ProgressCallback,
  ): Promise<Array<{ path: string; checksum: string; error?: string }>> {
    const processor = new AsyncBatchProcessor<
      string,
      { path: string; checksum: string; error?: string }
    >();

    return processor.process(
      filePaths,
      async (filePath: string) => {
        try {
          const checksum = await this.calculateFileChecksum(filePath);
          return { path: filePath, checksum };
        } catch (error) {
          return {
            path: filePath,
            checksum: "",
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      onProgress,
    );
  }

  /**
   * Compare two sets of file checksums
   */
  compareChecksums(
    original: Array<{ path: string; checksum: string }>,
    current: Array<{ path: string; checksum: string }>,
  ): {
    identical: Array<{ path: string; checksum: string }>;
    modified: Array<{
      path: string;
      originalChecksum: string;
      currentChecksum: string;
    }>;
    added: Array<{ path: string; checksum: string }>;
    removed: Array<{ path: string; checksum: string }>;
  } {
    const originalMap = new Map(original.map((f) => [f.path, f.checksum]));
    const currentMap = new Map(current.map((f) => [f.path, f.checksum]));

    const identical: Array<{ path: string; checksum: string }> = [];
    const modified: Array<{
      path: string;
      originalChecksum: string;
      currentChecksum: string;
    }> = [];
    const added: Array<{ path: string; checksum: string }> = [];
    const removed: Array<{ path: string; checksum: string }> = [];

    // Check for identical and modified files
    for (const [path, originalChecksum] of originalMap) {
      const currentChecksum = currentMap.get(path);

      if (currentChecksum === undefined) {
        removed.push({ path, checksum: originalChecksum });
      } else if (currentChecksum === originalChecksum) {
        identical.push({ path, checksum: originalChecksum });
      } else {
        modified.push({ path, originalChecksum, currentChecksum });
      }
    }

    // Check for added files
    for (const [path, checksum] of currentMap) {
      if (!originalMap.has(path)) {
        added.push({ path, checksum });
      }
    }

    return { identical, modified, added, removed };
  }

  /**
   * Generate integrity report
   */
  generateIntegrityReport(result: BackupIntegrityResult): string {
    const lines: string[] = [];

    lines.push(`Backup Integrity Report: ${result.backupId}`);
    lines.push(`Verified at: ${result.verifiedAt.toISOString()}`);
    lines.push(`Overall Status: ${result.valid ? "VALID" : "INVALID"}`);
    lines.push("");

    lines.push("Summary:");
    lines.push(`  Total Files: ${result.summary.totalFiles}`);
    lines.push(`  Valid Files: ${result.summary.validFiles}`);
    lines.push(`  Invalid Files: ${result.summary.invalidFiles}`);
    lines.push(`  Error Files: ${result.summary.errorFiles}`);
    lines.push("");

    if (result.summary.invalidFiles > 0 || result.summary.errorFiles > 0) {
      lines.push("Issues Found:");
      result.files.forEach((file) => {
        if (!file.valid || file.error) {
          lines.push(`  ${file.filePath}:`);
          if (file.error) {
            lines.push(`    Error: ${file.error}`);
          } else {
            lines.push(`    Expected: ${file.expectedChecksum}`);
            lines.push(`    Actual: ${file.actualChecksum}`);
          }
        }
      });
    }

    return lines.join("\n");
  }

  /**
   * Save integrity report to file
   */
  async saveIntegrityReport(
    result: BackupIntegrityResult,
    outputPath: string,
  ): Promise<void> {
    const report = this.generateIntegrityReport(result);
    await fs.promises.writeFile(outputPath, report, "utf8");
  }
}

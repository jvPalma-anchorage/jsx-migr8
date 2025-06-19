/**
 * Comprehensive tests for SnapshotManager
 * Tests file backup/restore operations, encoding, conflict detection, and edge cases
 */
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Mock modules before importing
jest.mock("node:fs");

import { SnapshotManager } from "../snapshot-manager";
import {
  BackupConfig,
  BackedUpFile,
  FileRestoreResult,
  FileConflict,
} from "../types";
import {
  testEnv,
  errorSimulator,
  PerformanceMonitor,
} from "./helpers/jest-setup";
import {
  generateBackedUpFiles,
  TEST_PROJECT_STRUCTURES,
  ERROR_SCENARIOS,
} from "./__fixtures__/test-data";
import { mockFsUtils } from "./__mocks__/fs";

describe("SnapshotManager", () => {
  let snapshotManager: SnapshotManager;
  let tempDir: string;
  let backupRoot: string;
  let mockConfig: BackupConfig;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockFsUtils.reset();
    errorSimulator.clear();

    // Create temporary directory
    tempDir = await testEnv.createTempDir("snapshot-manager-test");
    backupRoot = path.join(tempDir, ".migr8-backups");

    // Setup test configuration
    mockConfig = {
      maxBackups: 10,
      maxAgeDays: 30,
      maxTotalSize: 1024 * 1024 * 100, // 100MB
      autoCleanup: false,
      cleanupSchedule: "0 2 * * *",
      compression: false,
      compressionLevel: 6,
      gitIntegration: false,
      namingPattern: "{timestamp}-{component}-{mode}",
      excludePatterns: [],
      verifyAfterBackup: false,
      concurrency: 5,
      showProgress: false,
    };

    // Create SnapshotManager instance
    snapshotManager = new SnapshotManager(backupRoot, mockConfig);
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  describe("Directory Management", () => {
    it("should create backup directory structure", async () => {
      const backupId = "test-backup-123";

      await snapshotManager.createBackupDirectory(backupId);

      const backupDir = path.join(backupRoot, "snapshots", backupId);
      const filesDir = path.join(backupDir, "files");

      expect(mockFsUtils.exists(backupDir)).toBe(true);
      expect(mockFsUtils.exists(filesDir)).toBe(true);
    });

    it("should handle existing directory gracefully", async () => {
      const backupId = "existing-backup-123";

      // Create directory first
      await snapshotManager.createBackupDirectory(backupId);

      // Should not throw when creating again
      await expect(
        snapshotManager.createBackupDirectory(backupId),
      ).resolves.not.toThrow();
    });

    it("should handle permission errors during directory creation", async () => {
      const backupId = "permission-test-123";

      // Simulate permission error
      errorSimulator.setErrorCondition(
        "mkdir",
        new Error("EACCES: permission denied"),
      );

      await expect(
        snapshotManager.createBackupDirectory(backupId),
      ).rejects.toThrow();
    });
  });

  describe("File Backup Operations", () => {
    it("should backup single file successfully", async () => {
      const backupId = "single-file-test";
      const testFile = path.join(tempDir, "test-file.ts");
      const testContent = 'console.log("Hello, World!");';

      // Setup test file
      mockFsUtils.setFile(testFile, testContent);

      // Create backup directory
      await snapshotManager.createBackupDirectory(backupId);

      // Backup the file
      const results = await snapshotManager.backupFiles(backupId, [testFile]);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("backed-up");
      expect(results[0].originalPath).toBe(testFile);
      expect(results[0].size).toBe(Buffer.byteLength(testContent, "utf8"));
      expect(results[0].checksum).toBeValidChecksum();
    });

    it("should backup multiple files concurrently", async () => {
      const backupId = "multi-file-test";
      const testFiles = [
        { path: path.join(tempDir, "file1.ts"), content: "File 1 content" },
        { path: path.join(tempDir, "file2.ts"), content: "File 2 content" },
        { path: path.join(tempDir, "file3.ts"), content: "File 3 content" },
      ];

      // Setup test files
      testFiles.forEach(({ path: filePath, content }) => {
        mockFsUtils.setFile(filePath, content);
      });

      await snapshotManager.createBackupDirectory(backupId);

      // Backup all files
      const results = await snapshotManager.backupFiles(
        backupId,
        testFiles.map((f) => f.path),
      );

      expect(results).toHaveLength(testFiles.length);
      results.forEach((result, index) => {
        expect(result.status).toBe("backed-up");
        expect(result.originalPath).toBe(testFiles[index].path);
        expect(result.size).toBe(
          Buffer.byteLength(testFiles[index].content, "utf8"),
        );
      });
    });

    it("should handle missing files gracefully", async () => {
      const backupId = "missing-file-test";
      const existingFile = path.join(tempDir, "existing.ts");
      const missingFile = path.join(tempDir, "missing.ts");

      // Only create one file
      mockFsUtils.setFile(existingFile, "Existing content");

      await snapshotManager.createBackupDirectory(backupId);

      const results = await snapshotManager.backupFiles(backupId, [
        existingFile,
        missingFile,
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe("backed-up");
      expect(results[1].status).toBe("failed");
      expect(results[1].error).toContain("ENOENT");
    });

    it("should handle file read errors", async () => {
      const backupId = "read-error-test";
      const testFile = path.join(tempDir, "error-file.ts");

      mockFsUtils.setFile(testFile, "Test content");

      // Simulate read error
      errorSimulator.setErrorCondition(
        "readFile",
        new Error("EACCES: permission denied"),
      );

      await snapshotManager.createBackupDirectory(backupId);

      const results = await snapshotManager.backupFiles(backupId, [testFile]);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("failed");
      expect(results[0].error).toContain("permission denied");
    });

    it("should verify backup file integrity", async () => {
      const backupId = "integrity-test";
      const testFile = path.join(tempDir, "integrity-file.ts");
      const testContent = "Integrity test content";

      mockFsUtils.setFile(testFile, testContent);

      await snapshotManager.createBackupDirectory(backupId);

      const results = await snapshotManager.backupFiles(backupId, [testFile]);
      const backedUpFile = results[0];

      // Verify the backup file has correct size and checksum
      expect(backedUpFile.status).toBe("backed-up");
      expect(backedUpFile.size).toBe(Buffer.byteLength(testContent, "utf8"));

      const expectedChecksum = crypto
        .createHash("sha256")
        .update(testContent, "utf8")
        .digest("hex");
      expect(backedUpFile.checksum).toBe(expectedChecksum);
    });

    it("should handle atomic write failures", async () => {
      const backupId = "atomic-write-test";
      const testFile = path.join(tempDir, "atomic-file.ts");

      mockFsUtils.setFile(testFile, "Atomic test content");

      // Simulate write failure after reading
      let readCalled = false;
      errorSimulator.setErrorCondition(
        "writeFile",
        new Error("ENOSPC: no space left on device"),
      );

      await snapshotManager.createBackupDirectory(backupId);

      const results = await snapshotManager.backupFiles(backupId, [testFile]);

      expect(results[0].status).toBe("failed");
      expect(results[0].error).toContain("no space left on device");
    });

    it("should track progress during backup", async () => {
      const backupId = "progress-test";
      const testFiles = Array.from({ length: 5 }, (_, i) => {
        const filePath = path.join(tempDir, `progress-file-${i}.ts`);
        mockFsUtils.setFile(filePath, `Content ${i}`);
        return filePath;
      });

      await snapshotManager.createBackupDirectory(backupId);

      const progressUpdates: Array<{ completed: number; total: number }> = [];

      await snapshotManager.backupFiles(
        backupId,
        testFiles,
        (completed, total) => {
          progressUpdates.push({ completed, total });
        },
      );

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toEqual({
        completed: testFiles.length,
        total: testFiles.length,
      });
    });
  });

  describe("File Path Encoding", () => {
    it("should encode file paths safely", async () => {
      const backupId = "encoding-test";
      const specialFiles = [
        path.join(tempDir, "file with spaces.ts"),
        path.join(tempDir, "file/with/slashes.ts"),
        path.join(tempDir, "file-with-unicode-é.ts"),
        path.join(tempDir, "file@with#symbols$.ts"),
      ];

      specialFiles.forEach((filePath, index) => {
        mockFsUtils.setFile(filePath, `Special content ${index}`);
      });

      await snapshotManager.createBackupDirectory(backupId);

      const results = await snapshotManager.backupFiles(backupId, specialFiles);

      results.forEach((result) => {
        expect(result.status).toBe("backed-up");
        expect(result.encodedPath).toBeTruthy();
        expect(result.encodedPath).not.toContain(" ");
        expect(result.encodedPath).not.toContain("/");
        expect(result.encodedPath).not.toContain("@");
        expect(result.encodedPath).not.toContain("#");
      });
    });

    it("should handle very long file paths", async () => {
      const backupId = "long-path-test";
      // Create a very long path
      const longPath = path.join(
        tempDir,
        "very/long/directory/structure/with/many/levels/and/components",
        "that/exceeds/normal/path/length/limits/in/most/systems",
        "final-file-with-long-name.ts",
      );

      mockFsUtils.setFile(longPath, "Long path content");

      await snapshotManager.createBackupDirectory(backupId);

      const results = await snapshotManager.backupFiles(backupId, [longPath]);

      expect(results[0].status).toBe("backed-up");
      expect(results[0].encodedPath.length).toBeLessThan(255); // Most filesystems limit filename to 255 chars
    });
  });

  describe("File Restore Operations", () => {
    let sampleBackedUpFiles: BackedUpFile[];
    let backupId: string;

    beforeEach(async () => {
      backupId = "restore-test";

      // Create sample files and backup them
      const testFiles = [
        {
          path: path.join(tempDir, "restore1.ts"),
          content: "Restore content 1",
        },
        {
          path: path.join(tempDir, "restore2.ts"),
          content: "Restore content 2",
        },
      ];

      testFiles.forEach(({ path: filePath, content }) => {
        mockFsUtils.setFile(filePath, content);
      });

      await snapshotManager.createBackupDirectory(backupId);
      sampleBackedUpFiles = await snapshotManager.backupFiles(
        backupId,
        testFiles.map((f) => f.path),
      );
    });

    it("should restore files successfully", async () => {
      // Delete original files to simulate need for restore
      sampleBackedUpFiles.forEach((file) => {
        mockFsUtils.removeFile(file.originalPath);
      });

      const results = await snapshotManager.restoreFiles(
        backupId,
        sampleBackedUpFiles,
      );

      expect(results).toHaveLength(sampleBackedUpFiles.length);
      results.forEach((result) => {
        expect(result.status).toBe("restored");
        expect(mockFsUtils.exists(result.filePath)).toBe(true);
      });
    });

    it("should detect conflicts when files were modified", async () => {
      // Modify one of the original files
      const modifiedFile = sampleBackedUpFiles[0];
      mockFsUtils.setFile(modifiedFile.originalPath, "Modified content");

      const results = await snapshotManager.restoreFiles(backupId, [
        modifiedFile,
      ]);

      expect(results[0].status).toBe("conflict");
      expect(results[0].conflict).toBeDefined();
      expect(results[0].conflict!.type).toBe("modified-since-backup");
    });

    it("should handle missing backup files", async () => {
      // Remove backup file
      const backupFilePath = path.join(
        backupRoot,
        "snapshots",
        backupId,
        "files",
        sampleBackedUpFiles[0].encodedPath,
      );
      mockFsUtils.removeFile(backupFilePath);

      const results = await snapshotManager.restoreFiles(backupId, [
        sampleBackedUpFiles[0],
      ]);

      expect(results[0].status).toBe("failed");
      expect(results[0].error).toContain("Backup file not found");
    });

    it("should verify backup integrity during restore", async () => {
      // Corrupt backup file
      const backupFilePath = path.join(
        backupRoot,
        "snapshots",
        backupId,
        "files",
        sampleBackedUpFiles[0].encodedPath,
      );
      mockFsUtils.setFile(backupFilePath, "Corrupted content");

      const results = await snapshotManager.restoreFiles(backupId, [
        sampleBackedUpFiles[0],
      ]);

      expect(results[0].status).toBe("failed");
      expect(results[0].error).toContain("integrity check failed");
    });

    it("should handle permission errors during restore", async () => {
      // Simulate permission error during restore
      errorSimulator.setErrorCondition(
        "writeFile",
        new Error("EACCES: permission denied"),
      );

      const results = await snapshotManager.restoreFiles(backupId, [
        sampleBackedUpFiles[0],
      ]);

      expect(results[0].status).toBe("failed");
      expect(results[0].error).toContain("permission denied");
    });

    it("should restore files atomically", async () => {
      // Delete original file
      mockFsUtils.removeFile(sampleBackedUpFiles[0].originalPath);

      // Mock rename to fail after write
      let writeSucceeded = false;
      const originalWriteFile = mockFsUtils.setFile;
      mockFsUtils.setFile = (filePath: string, content: string) => {
        if (filePath.includes(".migr8-restore-")) {
          writeSucceeded = true;
          originalWriteFile(filePath, content);
        } else {
          originalWriteFile(filePath, content);
        }
      };

      errorSimulator.setErrorCondition("rename", new Error("Rename failed"));

      const results = await snapshotManager.restoreFiles(backupId, [
        sampleBackedUpFiles[0],
      ]);

      expect(results[0].status).toBe("failed");
      expect(writeSucceeded).toBe(true); // Write should have succeeded
      expect(mockFsUtils.exists(sampleBackedUpFiles[0].originalPath)).toBe(
        false,
      ); // But file shouldn't exist at final location
    });
  });

  describe("Conflict Detection", () => {
    it("should detect no conflict for unchanged files", async () => {
      const backupId = "conflict-none-test";
      const testFile = path.join(tempDir, "unchanged.ts");
      const testContent = "Unchanged content";

      mockFsUtils.setFile(testFile, testContent);

      await snapshotManager.createBackupDirectory(backupId);
      const backedUpFiles = await snapshotManager.backupFiles(backupId, [
        testFile,
      ]);

      // File hasn't changed
      const results = await snapshotManager.restoreFiles(
        backupId,
        backedUpFiles,
      );

      expect(results[0].status).toBe("restored");
      expect(results[0].conflict).toBeUndefined();
    });

    it("should detect conflict for modified files", async () => {
      const backupId = "conflict-modified-test";
      const testFile = path.join(tempDir, "modified.ts");
      const originalContent = "Original content";
      const modifiedContent = "Modified content";

      mockFsUtils.setFile(testFile, originalContent);

      await snapshotManager.createBackupDirectory(backupId);
      const backedUpFiles = await snapshotManager.backupFiles(backupId, [
        testFile,
      ]);

      // Modify the file after backup
      mockFsUtils.setFile(testFile, modifiedContent);

      const results = await snapshotManager.restoreFiles(
        backupId,
        backedUpFiles,
      );

      expect(results[0].status).toBe("conflict");
      expect(results[0].conflict).toBeDefined();
      expect(results[0].conflict!.type).toBe("modified-since-backup");
    });

    it("should detect conflict for deleted files", async () => {
      const backupId = "conflict-deleted-test";
      const testFile = path.join(tempDir, "deleted.ts");

      mockFsUtils.setFile(testFile, "Content to be deleted");

      await snapshotManager.createBackupDirectory(backupId);
      const backedUpFiles = await snapshotManager.backupFiles(backupId, [
        testFile,
      ]);

      // Delete the file after backup
      mockFsUtils.removeFile(testFile);

      const results = await snapshotManager.restoreFiles(
        backupId,
        backedUpFiles,
      );

      // Deleted files should restore without conflict
      expect(results[0].status).toBe("restored");
      expect(results[0].conflict).toBeUndefined();
    });

    it("should detect checksum mismatch", async () => {
      const backupId = "checksum-mismatch-test";
      const testFile = path.join(tempDir, "checksum-test.ts");

      mockFsUtils.setFile(testFile, "Original content");

      await snapshotManager.createBackupDirectory(backupId);
      const backedUpFiles = await snapshotManager.backupFiles(backupId, [
        testFile,
      ]);

      // Corrupt the backup file
      const backupFilePath = path.join(
        backupRoot,
        "snapshots",
        backupId,
        "files",
        backedUpFiles[0].encodedPath,
      );
      mockFsUtils.setFile(backupFilePath, "Corrupted backup content");

      const results = await snapshotManager.restoreFiles(
        backupId,
        backedUpFiles,
      );

      expect(results[0].status).toBe("failed");
      expect(results[0].error).toContain("integrity check failed");
    });
  });

  describe("Backup Deletion", () => {
    it("should delete backup completely", async () => {
      const backupId = "delete-test";
      const testFile = path.join(tempDir, "delete-file.ts");

      mockFsUtils.setFile(testFile, "Content to delete");

      await snapshotManager.createBackupDirectory(backupId);
      await snapshotManager.backupFiles(backupId, [testFile]);

      // Verify backup exists
      const backupDir = path.join(backupRoot, "snapshots", backupId);
      expect(mockFsUtils.exists(backupDir)).toBe(true);

      // Delete backup
      await snapshotManager.deleteBackup(backupId);

      // Verify backup is gone
      expect(mockFsUtils.exists(backupDir)).toBe(false);
    });

    it("should handle deletion of non-existent backup", async () => {
      // Should not throw when deleting non-existent backup
      await expect(
        snapshotManager.deleteBackup("non-existent-backup"),
      ).resolves.not.toThrow();
    });

    it("should handle permission errors during deletion", async () => {
      const backupId = "delete-permission-test";

      await snapshotManager.createBackupDirectory(backupId);

      // Simulate permission error
      errorSimulator.setErrorCondition(
        "rm",
        new Error("EACCES: permission denied"),
      );

      await expect(snapshotManager.deleteBackup(backupId)).rejects.toThrow(
        "Failed to remove directory",
      );
    });
  });

  describe("Backup Statistics", () => {
    it("should calculate backup statistics", async () => {
      const backupId = "stats-test";
      const testFiles = [
        { path: path.join(tempDir, "stats1.ts"), content: "Stats content 1" },
        {
          path: path.join(tempDir, "stats2.ts"),
          content: "Stats content 2 - longer content",
        },
      ];

      testFiles.forEach(({ path: filePath, content }) => {
        mockFsUtils.setFile(filePath, content);
      });

      await snapshotManager.createBackupDirectory(backupId);
      await snapshotManager.backupFiles(
        backupId,
        testFiles.map((f) => f.path),
      );

      const stats = await snapshotManager.getBackupStats(backupId);

      expect(stats.totalFiles).toBe(testFiles.length);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.diskUsage).toBeGreaterThan(0);
    });

    it("should handle stats for non-existent backup", async () => {
      const stats = await snapshotManager.getBackupStats("non-existent");

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.diskUsage).toBe(0);
    });
  });

  describe("File Verification", () => {
    it("should verify backup file integrity", async () => {
      const backupId = "verify-test";
      const testFile = path.join(tempDir, "verify-file.ts");
      const testContent = "Verify content";

      mockFsUtils.setFile(testFile, testContent);

      await snapshotManager.createBackupDirectory(backupId);
      const backedUpFiles = await snapshotManager.backupFiles(backupId, [
        testFile,
      ]);

      const result = await snapshotManager.verifyBackupFile(
        backupId,
        backedUpFiles[0],
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should detect corrupted backup file", async () => {
      const backupId = "verify-corrupt-test";
      const testFile = path.join(tempDir, "verify-corrupt.ts");

      mockFsUtils.setFile(testFile, "Original content");

      await snapshotManager.createBackupDirectory(backupId);
      const backedUpFiles = await snapshotManager.backupFiles(backupId, [
        testFile,
      ]);

      // Corrupt the backup file
      const backupFilePath = path.join(
        backupRoot,
        "snapshots",
        backupId,
        "files",
        backedUpFiles[0].encodedPath,
      );
      mockFsUtils.setFile(backupFilePath, "Corrupted content");

      const result = await snapshotManager.verifyBackupFile(
        backupId,
        backedUpFiles[0],
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Checksum mismatch");
    });

    it("should handle missing backup file during verification", async () => {
      const backupId = "verify-missing-test";
      const backedUpFile: BackedUpFile = {
        originalPath: path.join(tempDir, "missing.ts"),
        relativePath: "missing.ts",
        encodedPath: "bWlzc2luZy50cw==", // base64 of 'missing.ts'
        size: 100,
        lastModified: new Date(),
        checksum: "dummy-checksum",
        status: "backed-up",
      };

      const result = await snapshotManager.verifyBackupFile(
        backupId,
        backedUpFile,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Backup file not found");
    });
  });

  describe("Performance and Concurrency", () => {
    it("should handle large number of files efficiently", async () => {
      const monitor = new PerformanceMonitor();
      monitor.start();

      const backupId = "performance-test";
      const fileCount = 100;
      const testFiles = [];

      // Create many small files
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(tempDir, `perf-${i}.ts`);
        mockFsUtils.setFile(filePath, `Performance test content ${i}`);
        testFiles.push(filePath);
      }

      await snapshotManager.createBackupDirectory(backupId);
      const results = await snapshotManager.backupFiles(backupId, testFiles);

      const performance = monitor.stop();

      expect(results).toHaveLength(fileCount);
      expect(results.every((r) => r.status === "backed-up")).toBe(true);

      // Performance assertions
      expect(performance.durationMs).toBeLessThan(30000); // Should complete within 30 seconds
      expect(performance.memoryDelta.heapUsed).toBeLessThan(200 * 1024 * 1024); // Less than 200MB additional memory
    });

    it("should handle concurrent backup operations", async () => {
      const backupIds = ["concurrent-1", "concurrent-2", "concurrent-3"];
      const testFiles = backupIds.map((id, index) => {
        const filePath = path.join(tempDir, `concurrent-${index}.ts`);
        mockFsUtils.setFile(filePath, `Concurrent content ${index}`);
        return filePath;
      });

      // Create backup directories
      await Promise.all(
        backupIds.map((id) => snapshotManager.createBackupDirectory(id)),
      );

      // Backup files concurrently
      const promises = backupIds.map((id, index) =>
        snapshotManager.backupFiles(id, [testFiles[index]]),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(backupIds.length);
      results.forEach((result, index) => {
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe("backed-up");
        expect(result[0].originalPath).toBe(testFiles[index]);
      });
    });

    it("should handle mixed success/failure scenarios", async () => {
      const backupId = "mixed-scenario-test";
      const testFiles = [
        path.join(tempDir, "success1.ts"),
        path.join(tempDir, "success2.ts"),
        path.join(tempDir, "missing1.ts"), // This will fail
        path.join(tempDir, "success3.ts"),
        path.join(tempDir, "missing2.ts"), // This will fail
      ];

      // Create only some files
      mockFsUtils.setFile(testFiles[0], "Success 1");
      mockFsUtils.setFile(testFiles[1], "Success 2");
      mockFsUtils.setFile(testFiles[3], "Success 3");

      await snapshotManager.createBackupDirectory(backupId);
      const results = await snapshotManager.backupFiles(backupId, testFiles);

      expect(results).toHaveLength(testFiles.length);
      expect(results[0].status).toBe("backed-up");
      expect(results[1].status).toBe("backed-up");
      expect(results[2].status).toBe("failed");
      expect(results[3].status).toBe("backed-up");
      expect(results[4].status).toBe("failed");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty files", async () => {
      const backupId = "empty-file-test";
      const emptyFile = path.join(tempDir, "empty.ts");

      mockFsUtils.setFile(emptyFile, ""); // Empty file

      await snapshotManager.createBackupDirectory(backupId);
      const results = await snapshotManager.backupFiles(backupId, [emptyFile]);

      expect(results[0].status).toBe("backed-up");
      expect(results[0].size).toBe(0);
      expect(results[0].checksum).toBeValidChecksum();
    });

    it("should handle very large files", async () => {
      const backupId = "large-file-test";
      const largeFile = path.join(tempDir, "large.ts");
      const largeContent = "x".repeat(1024 * 1024); // 1MB file

      mockFsUtils.setFile(largeFile, largeContent);

      await snapshotManager.createBackupDirectory(backupId);
      const results = await snapshotManager.backupFiles(backupId, [largeFile]);

      expect(results[0].status).toBe("backed-up");
      expect(results[0].size).toBe(largeContent.length);
    });

    it("should handle binary files", async () => {
      const backupId = "binary-file-test";
      const binaryFile = path.join(tempDir, "binary.png");

      // Simulate binary content
      const binaryContent = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]).toString("utf8");
      mockFsUtils.setFile(binaryFile, binaryContent);

      await snapshotManager.createBackupDirectory(backupId);
      const results = await snapshotManager.backupFiles(backupId, [binaryFile]);

      expect(results[0].status).toBe("backed-up");
      expect(results[0].checksum).toBeValidChecksum();
    });

    it("should handle files with different encodings", async () => {
      const backupId = "encoding-test";
      const unicodeFile = path.join(tempDir, "unicode.ts");
      const unicodeContent = "// 这是一个测试文件 with émojis 🚀";

      mockFsUtils.setFile(unicodeFile, unicodeContent);

      await snapshotManager.createBackupDirectory(backupId);
      const results = await snapshotManager.backupFiles(backupId, [
        unicodeFile,
      ]);

      expect(results[0].status).toBe("backed-up");
      expect(results[0].size).toBe(Buffer.byteLength(unicodeContent, "utf8"));
    });

    it("should handle backup content retrieval", async () => {
      const backupId = "content-test";
      const testFile = path.join(tempDir, "content.ts");
      const testContent = "Content retrieval test";

      mockFsUtils.setFile(testFile, testContent);

      await snapshotManager.createBackupDirectory(backupId);
      const results = await snapshotManager.backupFiles(backupId, [testFile]);

      const retrievedContent = await snapshotManager.getBackupFileContent(
        backupId,
        results[0].encodedPath,
      );

      expect(retrievedContent).toBe(testContent);
    });

    it("should handle missing backup content retrieval", async () => {
      const backupId = "missing-content-test";
      const encodedPath = "bm9uLWV4aXN0ZW50LnRz"; // base64 of 'non-existent.ts'

      await expect(
        snapshotManager.getBackupFileContent(backupId, encodedPath),
      ).rejects.toThrow();
    });
  });
});

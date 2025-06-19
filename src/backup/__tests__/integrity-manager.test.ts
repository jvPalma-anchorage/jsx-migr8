/**
 * Comprehensive tests for IntegrityManager
 * Tests backup integrity verification, checksum calculation, and error detection
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
import crypto from "node:crypto";

// Mock modules before importing
jest.mock("node:fs");

import { IntegrityManager } from "../integrity-manager";
import { SnapshotManager } from "../snapshot-manager";
import {
  BackupMetadata,
  BackedUpFile,
  IntegrityCheckResult,
  BackupIntegrityResult,
} from "../types";
import {
  testEnv,
  errorSimulator,
  PerformanceMonitor,
} from "./helpers/jest-setup";
import {
  generateBackupMetadata,
  generateBackedUpFiles,
} from "./__fixtures__/test-data";
import { mockFsUtils } from "./__mocks__/fs";

describe("IntegrityManager", () => {
  let integrityManager: IntegrityManager;
  let mockSnapshotManager: jest.Mocked<SnapshotManager>;
  let tempDir: string;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockFsUtils.reset();
    errorSimulator.clear();

    // Create temporary directory
    tempDir = await testEnv.createTempDir("integrity-manager-test");

    // Create IntegrityManager instance
    integrityManager = new IntegrityManager();

    // Create mock SnapshotManager
    mockSnapshotManager = {
      getBackupFileContent: jest.fn(),
    } as any;
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  describe("Checksum Calculation", () => {
    it("should calculate SHA-256 checksum correctly", () => {
      const content = "Hello, World!";
      const expectedChecksum = crypto
        .createHash("sha256")
        .update(content, "utf8")
        .digest("hex");

      const actualChecksum = integrityManager.calculateChecksum(content);

      expect(actualChecksum).toBe(expectedChecksum);
      expect(actualChecksum).toBeValidChecksum();
    });

    it("should handle empty content", () => {
      const content = "";
      const checksum = integrityManager.calculateChecksum(content);

      expect(checksum).toBeValidChecksum();
      expect(checksum).toBe(
        crypto.createHash("sha256").update("", "utf8").digest("hex"),
      );
    });

    it("should handle unicode content", () => {
      const content = "你好世界 🌍 émojis and spéciał characters";
      const checksum = integrityManager.calculateChecksum(content);

      expect(checksum).toBeValidChecksum();

      // Should be consistent
      const checksum2 = integrityManager.calculateChecksum(content);
      expect(checksum).toBe(checksum2);
    });

    it("should handle very large content", () => {
      const largeContent = "x".repeat(1024 * 1024); // 1MB
      const checksum = integrityManager.calculateChecksum(largeContent);

      expect(checksum).toBeValidChecksum();
    });

    it("should produce different checksums for different content", () => {
      const content1 = "Content 1";
      const content2 = "Content 2";

      const checksum1 = integrityManager.calculateChecksum(content1);
      const checksum2 = integrityManager.calculateChecksum(content2);

      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe("File Checksum Calculation", () => {
    it("should calculate checksum for existing file", async () => {
      const filePath = path.join(tempDir, "test-file.ts");
      const content = "Test file content for checksum";

      mockFsUtils.setFile(filePath, content);

      const checksum = await integrityManager.calculateFileChecksum(filePath);
      const expectedChecksum = crypto
        .createHash("sha256")
        .update(content, "utf8")
        .digest("hex");

      expect(checksum).toBe(expectedChecksum);
    });

    it("should handle file read errors", async () => {
      const filePath = path.join(tempDir, "missing-file.ts");

      await expect(
        integrityManager.calculateFileChecksum(filePath),
      ).rejects.toThrow("Failed to calculate checksum");
    });

    it("should handle permission errors", async () => {
      const filePath = path.join(tempDir, "permission-error.ts");
      mockFsUtils.setFile(filePath, "Content");

      // Simulate permission error
      errorSimulator.setErrorCondition(
        "readFile",
        new Error("EACCES: permission denied"),
      );

      await expect(
        integrityManager.calculateFileChecksum(filePath),
      ).rejects.toThrow("Failed to calculate checksum");
    });
  });

  describe("Batch Checksum Calculation", () => {
    it("should calculate checksums for multiple files", async () => {
      const files = [
        { path: path.join(tempDir, "file1.ts"), content: "Content 1" },
        { path: path.join(tempDir, "file2.ts"), content: "Content 2" },
        { path: path.join(tempDir, "file3.ts"), content: "Content 3" },
      ];

      // Setup files
      files.forEach(({ path, content }) => {
        mockFsUtils.setFile(path, content);
      });

      const results = await integrityManager.calculateFileChecksums(
        files.map((f) => f.path),
      );

      expect(results).toHaveLength(files.length);

      results.forEach((result, index) => {
        expect(result.path).toBe(files[index].path);
        expect(result.checksum).toBeValidChecksum();
        expect(result.error).toBeUndefined();

        // Verify checksum is correct
        const expectedChecksum = crypto
          .createHash("sha256")
          .update(files[index].content, "utf8")
          .digest("hex");
        expect(result.checksum).toBe(expectedChecksum);
      });
    });

    it("should handle mixed success/failure scenarios", async () => {
      const files = [
        path.join(tempDir, "success1.ts"),
        path.join(tempDir, "missing.ts"), // This will fail
        path.join(tempDir, "success2.ts"),
      ];

      // Setup only some files
      mockFsUtils.setFile(files[0], "Success 1");
      mockFsUtils.setFile(files[2], "Success 2");

      const results = await integrityManager.calculateFileChecksums(files);

      expect(results).toHaveLength(files.length);
      expect(results[0].checksum).toBeValidChecksum();
      expect(results[0].error).toBeUndefined();
      expect(results[1].checksum).toBe("");
      expect(results[1].error).toBeDefined();
      expect(results[2].checksum).toBeValidChecksum();
      expect(results[2].error).toBeUndefined();
    });

    it("should track progress during batch processing", async () => {
      const fileCount = 10;
      const files = Array.from({ length: fileCount }, (_, i) => {
        const filePath = path.join(tempDir, `batch-file-${i}.ts`);
        mockFsUtils.setFile(filePath, `Batch content ${i}`);
        return filePath;
      });

      const progressUpdates: Array<{ completed: number; total: number }> = [];

      await integrityManager.calculateFileChecksums(
        files,
        (completed, total) => {
          progressUpdates.push({ completed, total });
        },
      );

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toEqual({
        completed: fileCount,
        total: fileCount,
      });
    });
  });

  describe("Backup File Verification", () => {
    it("should verify backup file integrity successfully", async () => {
      const backupId = "verify-test-123";
      const content = "Backup file content";
      const checksum = crypto
        .createHash("sha256")
        .update(content, "utf8")
        .digest("hex");

      const fileInfo: BackedUpFile = {
        originalPath: path.join(tempDir, "test.ts"),
        relativePath: "test.ts",
        encodedPath: "dGVzdC50cw==",
        size: Buffer.byteLength(content, "utf8"),
        lastModified: new Date(),
        checksum,
        status: "backed-up",
      };

      // Mock snapshot manager to return the content
      mockSnapshotManager.getBackupFileContent.mockResolvedValue(content);

      const result = await integrityManager.verifyBackupFile(
        backupId,
        fileInfo,
        mockSnapshotManager,
      );

      expect(result.valid).toBe(true);
      expect(result.filePath).toBe(fileInfo.originalPath);
      expect(result.expectedChecksum).toBe(checksum);
      expect(result.actualChecksum).toBe(checksum);
      expect(result.error).toBeUndefined();
    });

    it("should detect corrupted backup file", async () => {
      const backupId = "corrupt-test-123";
      const originalContent = "Original content";
      const corruptedContent = "Corrupted content";
      const originalChecksum = crypto
        .createHash("sha256")
        .update(originalContent, "utf8")
        .digest("hex");

      const fileInfo: BackedUpFile = {
        originalPath: path.join(tempDir, "corrupt.ts"),
        relativePath: "corrupt.ts",
        encodedPath: "Y29ycnVwdC50cw==",
        size: Buffer.byteLength(originalContent, "utf8"),
        lastModified: new Date(),
        checksum: originalChecksum,
        status: "backed-up",
      };

      // Mock snapshot manager to return corrupted content
      mockSnapshotManager.getBackupFileContent.mockResolvedValue(
        corruptedContent,
      );

      const result = await integrityManager.verifyBackupFile(
        backupId,
        fileInfo,
        mockSnapshotManager,
      );

      expect(result.valid).toBe(false);
      expect(result.expectedChecksum).toBe(originalChecksum);
      expect(result.actualChecksum).not.toBe(originalChecksum);
      expect(result.error).toContain("Checksum mismatch");
    });

    it("should handle missing backup file", async () => {
      const backupId = "missing-test-123";
      const fileInfo: BackedUpFile = {
        originalPath: path.join(tempDir, "missing.ts"),
        relativePath: "missing.ts",
        encodedPath: "bWlzc2luZy50cw==",
        size: 100,
        lastModified: new Date(),
        checksum: "dummy-checksum",
        status: "backed-up",
      };

      // Mock snapshot manager to throw error
      mockSnapshotManager.getBackupFileContent.mockRejectedValue(
        new Error("Backup file not found"),
      );

      const result = await integrityManager.verifyBackupFile(
        backupId,
        fileInfo,
        mockSnapshotManager,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Failed to verify file");
    });

    it("should handle snapshot manager errors", async () => {
      const backupId = "error-test-123";
      const fileInfo: BackedUpFile = {
        originalPath: path.join(tempDir, "error.ts"),
        relativePath: "error.ts",
        encodedPath: "ZXJyb3IudHM=",
        size: 100,
        lastModified: new Date(),
        checksum: "dummy-checksum",
        status: "backed-up",
      };

      // Mock snapshot manager to throw unexpected error
      mockSnapshotManager.getBackupFileContent.mockRejectedValue(
        new Error("Unexpected error occurred"),
      );

      const result = await integrityManager.verifyBackupFile(
        backupId,
        fileInfo,
        mockSnapshotManager,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unexpected error occurred");
    });
  });

  describe("Full Backup Verification", () => {
    it("should verify complete backup successfully", async () => {
      const backupId = "full-verify-test";
      const files = generateBackedUpFiles(3);
      const metadata = generateBackupMetadata({
        id: backupId,
        files,
      });

      // Mock snapshot manager to return correct content for each file
      files.forEach((file, index) => {
        const content = `File content ${index}`;
        const expectedChecksum = crypto
          .createHash("sha256")
          .update(content, "utf8")
          .digest("hex");
        file.checksum = expectedChecksum;

        mockSnapshotManager.getBackupFileContent.mockResolvedValueOnce(content);
      });

      const result = await integrityManager.verifyBackup(
        backupId,
        metadata,
        mockSnapshotManager,
      );

      expect(result.valid).toBe(true);
      expect(result.backupId).toBe(backupId);
      expect(result.summary.totalFiles).toBe(files.length);
      expect(result.summary.validFiles).toBe(files.length);
      expect(result.summary.invalidFiles).toBe(0);
      expect(result.summary.errorFiles).toBe(0);
      expect(result.verifiedAt).toBeInstanceOf(Date);
    });

    it("should detect partial corruption in backup", async () => {
      const backupId = "partial-corrupt-test";
      const files = generateBackedUpFiles(5);
      const metadata = generateBackupMetadata({
        id: backupId,
        files,
      });

      // Mock snapshot manager - make some files valid, some corrupted
      files.forEach((file, index) => {
        if (index < 3) {
          // Valid files
          const content = `Valid content ${index}`;
          const checksum = crypto
            .createHash("sha256")
            .update(content, "utf8")
            .digest("hex");
          file.checksum = checksum;
          mockSnapshotManager.getBackupFileContent.mockResolvedValueOnce(
            content,
          );
        } else {
          // Corrupted files
          const originalContent = `Original content ${index}`;
          const corruptedContent = `Corrupted content ${index}`;
          const originalChecksum = crypto
            .createHash("sha256")
            .update(originalContent, "utf8")
            .digest("hex");
          file.checksum = originalChecksum;
          mockSnapshotManager.getBackupFileContent.mockResolvedValueOnce(
            corruptedContent,
          );
        }
      });

      const result = await integrityManager.verifyBackup(
        backupId,
        metadata,
        mockSnapshotManager,
      );

      expect(result.valid).toBe(false);
      expect(result.summary.totalFiles).toBe(5);
      expect(result.summary.validFiles).toBe(3);
      expect(result.summary.invalidFiles).toBe(2);
      expect(result.summary.errorFiles).toBe(0);
    });

    it("should handle files with access errors", async () => {
      const backupId = "error-files-test";
      const files = generateBackedUpFiles(4);
      const metadata = generateBackupMetadata({
        id: backupId,
        files,
      });

      // Mock snapshot manager - some succeed, some error
      files.forEach((file, index) => {
        if (index < 2) {
          // Successful files
          const content = `Success content ${index}`;
          const checksum = crypto
            .createHash("sha256")
            .update(content, "utf8")
            .digest("hex");
          file.checksum = checksum;
          mockSnapshotManager.getBackupFileContent.mockResolvedValueOnce(
            content,
          );
        } else {
          // Error files
          mockSnapshotManager.getBackupFileContent.mockRejectedValueOnce(
            new Error(`Access denied for file ${index}`),
          );
        }
      });

      const result = await integrityManager.verifyBackup(
        backupId,
        metadata,
        mockSnapshotManager,
      );

      expect(result.valid).toBe(false);
      expect(result.summary.totalFiles).toBe(4);
      expect(result.summary.validFiles).toBe(2);
      expect(result.summary.invalidFiles).toBe(0);
      expect(result.summary.errorFiles).toBe(2);
    });

    it("should track progress during full backup verification", async () => {
      const backupId = "progress-verify-test";
      const files = generateBackedUpFiles(10);
      const metadata = generateBackupMetadata({
        id: backupId,
        files,
      });

      // Mock all files as valid
      files.forEach((file, index) => {
        const content = `Progress content ${index}`;
        const checksum = crypto
          .createHash("sha256")
          .update(content, "utf8")
          .digest("hex");
        file.checksum = checksum;
        mockSnapshotManager.getBackupFileContent.mockResolvedValueOnce(content);
      });

      const progressUpdates: Array<{ completed: number; total: number }> = [];

      await integrityManager.verifyBackup(
        backupId,
        metadata,
        mockSnapshotManager,
        (completed, total) => {
          progressUpdates.push({ completed, total });
        },
      );

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toEqual({
        completed: files.length,
        total: files.length,
      });
    });

    it("should handle empty backup verification", async () => {
      const backupId = "empty-backup-test";
      const metadata = generateBackupMetadata({
        id: backupId,
        files: [],
      });

      const result = await integrityManager.verifyBackup(
        backupId,
        metadata,
        mockSnapshotManager,
      );

      expect(result.valid).toBe(true);
      expect(result.summary.totalFiles).toBe(0);
      expect(result.summary.validFiles).toBe(0);
      expect(result.summary.invalidFiles).toBe(0);
      expect(result.summary.errorFiles).toBe(0);
    });
  });

  describe("Original File Verification", () => {
    it("should verify original files match backup checksums", async () => {
      const files: BackedUpFile[] = [
        {
          originalPath: path.join(tempDir, "original1.ts"),
          relativePath: "original1.ts",
          encodedPath: "b3JpZ2luYWwxLnRz",
          size: 0,
          lastModified: new Date(),
          checksum: "",
          status: "backed-up",
        },
        {
          originalPath: path.join(tempDir, "original2.ts"),
          relativePath: "original2.ts",
          encodedPath: "b3JpZ2luYWwyLnRz",
          size: 0,
          lastModified: new Date(),
          checksum: "",
          status: "backed-up",
        },
      ];

      // Setup files with content and calculate checksums
      const contents = ["Original content 1", "Original content 2"];
      files.forEach((file, index) => {
        const content = contents[index];
        mockFsUtils.setFile(file.originalPath, content);
        file.checksum = crypto
          .createHash("sha256")
          .update(content, "utf8")
          .digest("hex");
        file.size = Buffer.byteLength(content, "utf8");
      });

      const results = await integrityManager.verifyOriginalFiles(files);

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it("should detect modified original files", async () => {
      const file: BackedUpFile = {
        originalPath: path.join(tempDir, "modified.ts"),
        relativePath: "modified.ts",
        encodedPath: "bW9kaWZpZWQudHM=",
        size: 0,
        lastModified: new Date(),
        checksum: crypto
          .createHash("sha256")
          .update("Original content", "utf8")
          .digest("hex"),
        status: "backed-up",
      };

      // File has been modified since backup
      mockFsUtils.setFile(file.originalPath, "Modified content");

      const results = await integrityManager.verifyOriginalFiles([file]);

      expect(results[0].valid).toBe(false);
      expect(results[0].error).toContain("File modified since backup");
    });

    it("should detect deleted original files", async () => {
      const file: BackedUpFile = {
        originalPath: path.join(tempDir, "deleted.ts"),
        relativePath: "deleted.ts",
        encodedPath: "ZGVsZXRlZC50cw==",
        size: 0,
        lastModified: new Date(),
        checksum: "dummy-checksum",
        status: "backed-up",
      };

      // File doesn't exist

      const results = await integrityManager.verifyOriginalFiles([file]);

      expect(results[0].valid).toBe(false);
      expect(results[0].error).toBe("File not found");
    });

    it("should handle permission errors on original files", async () => {
      const file: BackedUpFile = {
        originalPath: path.join(tempDir, "permission-error.ts"),
        relativePath: "permission-error.ts",
        encodedPath: "cGVybWlzc2lvbi1lcnJvci50cw==",
        size: 0,
        lastModified: new Date(),
        checksum: "dummy-checksum",
        status: "backed-up",
      };

      mockFsUtils.setFile(file.originalPath, "Content");

      // Simulate permission error
      errorSimulator.setErrorCondition(
        "readFile",
        new Error("EACCES: permission denied"),
      );

      const results = await integrityManager.verifyOriginalFiles([file]);

      expect(results[0].valid).toBe(false);
      expect(results[0].error).toContain("Failed to verify file");
    });
  });

  describe("Checksum Comparison", () => {
    it("should compare checksum sets and identify differences", () => {
      const original = [
        { path: "file1.ts", checksum: "checksum1" },
        { path: "file2.ts", checksum: "checksum2" },
        { path: "file3.ts", checksum: "checksum3" },
      ];

      const current = [
        { path: "file1.ts", checksum: "checksum1" }, // Identical
        { path: "file2.ts", checksum: "modified2" }, // Modified
        { path: "file4.ts", checksum: "checksum4" }, // Added
        // file3.ts is removed
      ];

      const comparison = integrityManager.compareChecksums(original, current);

      expect(comparison.identical).toEqual([
        { path: "file1.ts", checksum: "checksum1" },
      ]);

      expect(comparison.modified).toEqual([
        {
          path: "file2.ts",
          originalChecksum: "checksum2",
          currentChecksum: "modified2",
        },
      ]);

      expect(comparison.added).toEqual([
        { path: "file4.ts", checksum: "checksum4" },
      ]);

      expect(comparison.removed).toEqual([
        { path: "file3.ts", checksum: "checksum3" },
      ]);
    });

    it("should handle empty checksum sets", () => {
      const comparison = integrityManager.compareChecksums([], []);

      expect(comparison.identical).toEqual([]);
      expect(comparison.modified).toEqual([]);
      expect(comparison.added).toEqual([]);
      expect(comparison.removed).toEqual([]);
    });

    it("should handle one-sided comparisons", () => {
      const original = [{ path: "file1.ts", checksum: "checksum1" }];

      const comparison1 = integrityManager.compareChecksums(original, []);
      expect(comparison1.removed).toEqual(original);
      expect(comparison1.added).toEqual([]);

      const comparison2 = integrityManager.compareChecksums([], original);
      expect(comparison2.added).toEqual(original);
      expect(comparison2.removed).toEqual([]);
    });
  });

  describe("Integrity Report Generation", () => {
    it("should generate comprehensive integrity report", () => {
      const result: BackupIntegrityResult = {
        backupId: "report-test-123",
        valid: false,
        files: [
          {
            filePath: "/test/valid.ts",
            valid: true,
            expectedChecksum: "valid-checksum",
            actualChecksum: "valid-checksum",
          },
          {
            filePath: "/test/invalid.ts",
            valid: false,
            expectedChecksum: "expected-checksum",
            actualChecksum: "actual-checksum",
            error: "Checksum mismatch",
          },
          {
            filePath: "/test/error.ts",
            valid: false,
            expectedChecksum: "error-checksum",
            error: "File not found",
          },
        ],
        summary: {
          totalFiles: 3,
          validFiles: 1,
          invalidFiles: 1,
          errorFiles: 1,
        },
        verifiedAt: new Date("2023-01-01T12:00:00Z"),
      };

      const report = integrityManager.generateIntegrityReport(result);

      expect(report).toContain("Backup Integrity Report: report-test-123");
      expect(report).toContain("Overall Status: INVALID");
      expect(report).toContain("Total Files: 3");
      expect(report).toContain("Valid Files: 1");
      expect(report).toContain("Invalid Files: 1");
      expect(report).toContain("Error Files: 1");
      expect(report).toContain("Issues Found:");
      expect(report).toContain("/test/invalid.ts:");
      expect(report).toContain("Expected: expected-checksum");
      expect(report).toContain("Actual: actual-checksum");
      expect(report).toContain("/test/error.ts:");
      expect(report).toContain("Error: File not found");
    });

    it("should generate clean report for valid backup", () => {
      const result: BackupIntegrityResult = {
        backupId: "clean-report-test",
        valid: true,
        files: [
          {
            filePath: "/test/file1.ts",
            valid: true,
            expectedChecksum: "checksum1",
            actualChecksum: "checksum1",
          },
          {
            filePath: "/test/file2.ts",
            valid: true,
            expectedChecksum: "checksum2",
            actualChecksum: "checksum2",
          },
        ],
        summary: {
          totalFiles: 2,
          validFiles: 2,
          invalidFiles: 0,
          errorFiles: 0,
        },
        verifiedAt: new Date("2023-01-01T12:00:00Z"),
      };

      const report = integrityManager.generateIntegrityReport(result);

      expect(report).toContain("Overall Status: VALID");
      expect(report).not.toContain("Issues Found:");
    });

    it("should save integrity report to file", async () => {
      const result: BackupIntegrityResult = {
        backupId: "save-report-test",
        valid: true,
        files: [],
        summary: {
          totalFiles: 0,
          validFiles: 0,
          invalidFiles: 0,
          errorFiles: 0,
        },
        verifiedAt: new Date(),
      };

      const outputPath = path.join(tempDir, "integrity-report.txt");

      await integrityManager.saveIntegrityReport(result, outputPath);

      expect(mockFsUtils.exists(outputPath)).toBe(true);
      const savedContent = mockFsUtils.getFile(outputPath)?.content;
      expect(savedContent).toContain(
        "Backup Integrity Report: save-report-test",
      );
    });
  });

  describe("Performance and Concurrency", () => {
    it("should handle large backup verification efficiently", async () => {
      const monitor = new PerformanceMonitor();
      monitor.start();

      const backupId = "large-verify-test";
      const fileCount = 1000;
      const files = generateBackedUpFiles(fileCount);
      const metadata = generateBackupMetadata({
        id: backupId,
        files,
      });

      // Mock all files as valid
      files.forEach((file, index) => {
        const content = `Large verify content ${index}`;
        const checksum = crypto
          .createHash("sha256")
          .update(content, "utf8")
          .digest("hex");
        file.checksum = checksum;
        mockSnapshotManager.getBackupFileContent.mockResolvedValueOnce(content);
      });

      const result = await integrityManager.verifyBackup(
        backupId,
        metadata,
        mockSnapshotManager,
      );

      const performance = monitor.stop();

      expect(result.valid).toBe(true);
      expect(result.summary.totalFiles).toBe(fileCount);
      expect(result.summary.validFiles).toBe(fileCount);

      // Performance assertions
      expect(performance.durationMs).toBeLessThan(30000); // Should complete within 30 seconds
      expect(performance.memoryDelta.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB additional memory
    });

    it("should handle concurrent verification requests", async () => {
      const backupIds = ["concurrent-1", "concurrent-2", "concurrent-3"];
      const verificationPromises = backupIds.map(async (backupId, index) => {
        const files = generateBackedUpFiles(10);
        const metadata = generateBackupMetadata({
          id: backupId,
          files,
        });

        // Mock files for this backup
        files.forEach((file, fileIndex) => {
          const content = `Concurrent content ${index}-${fileIndex}`;
          const checksum = crypto
            .createHash("sha256")
            .update(content, "utf8")
            .digest("hex");
          file.checksum = checksum;
          mockSnapshotManager.getBackupFileContent.mockResolvedValue(content);
        });

        return integrityManager.verifyBackup(
          backupId,
          metadata,
          mockSnapshotManager,
        );
      });

      const results = await Promise.all(verificationPromises);

      expect(results).toHaveLength(backupIds.length);
      results.forEach((result, index) => {
        expect(result.valid).toBe(true);
        expect(result.backupId).toBe(backupIds[index]);
      });
    });

    it("should handle memory-efficient verification of large files", async () => {
      const backupId = "memory-efficient-test";
      const largeContent = "x".repeat(10 * 1024 * 1024); // 10MB content
      const checksum = crypto
        .createHash("sha256")
        .update(largeContent, "utf8")
        .digest("hex");

      const file: BackedUpFile = {
        originalPath: path.join(tempDir, "large-file.ts"),
        relativePath: "large-file.ts",
        encodedPath: "bGFyZ2UtZmlsZS50cw==",
        size: Buffer.byteLength(largeContent, "utf8"),
        lastModified: new Date(),
        checksum,
        status: "backed-up",
      };

      const metadata = generateBackupMetadata({
        id: backupId,
        files: [file],
      });

      mockSnapshotManager.getBackupFileContent.mockResolvedValue(largeContent);

      const monitor = new PerformanceMonitor();
      monitor.start();

      const result = await integrityManager.verifyBackup(
        backupId,
        metadata,
        mockSnapshotManager,
      );

      const performance = monitor.stop();

      expect(result.valid).toBe(true);
      expect(performance.memoryDelta.heapUsed).toBeLessThan(50 * 1024 * 1024); // Should not use excessive memory
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle corrupted metadata during verification", async () => {
      const backupId = "corrupt-metadata-test";
      const corruptMetadata = {
        // Missing required fields
        id: backupId,
        files: null,
      } as any;

      await expect(
        integrityManager.verifyBackup(
          backupId,
          corruptMetadata,
          mockSnapshotManager,
        ),
      ).rejects.toThrow();
    });

    it("should handle network errors during verification", async () => {
      const backupId = "network-error-test";
      const files = generateBackedUpFiles(2);
      const metadata = generateBackupMetadata({
        id: backupId,
        files,
      });

      // Mock network error
      mockSnapshotManager.getBackupFileContent.mockRejectedValue(
        new Error("ENETUNREACH: network is unreachable"),
      );

      const result = await integrityManager.verifyBackup(
        backupId,
        metadata,
        mockSnapshotManager,
      );

      expect(result.valid).toBe(false);
      expect(result.summary.errorFiles).toBe(files.length);
    });

    it("should handle very long file paths", async () => {
      const longPath = "very/".repeat(100) + "long/path/to/file.ts";
      const content = "Long path content";
      const checksum = crypto
        .createHash("sha256")
        .update(content, "utf8")
        .digest("hex");

      const file: BackedUpFile = {
        originalPath: longPath,
        relativePath: longPath,
        encodedPath: Buffer.from(longPath).toString("base64"),
        size: Buffer.byteLength(content, "utf8"),
        lastModified: new Date(),
        checksum,
        status: "backed-up",
      };

      mockSnapshotManager.getBackupFileContent.mockResolvedValue(content);

      const result = await integrityManager.verifyBackupFile(
        "long-path-test",
        file,
        mockSnapshotManager,
      );

      expect(result.valid).toBe(true);
      expect(result.filePath).toBe(longPath);
    });

    it("should handle files with special characters in checksums", async () => {
      const content = "Content with unicode: 你好世界 🌍";
      const checksum = crypto
        .createHash("sha256")
        .update(content, "utf8")
        .digest("hex");

      const file: BackedUpFile = {
        originalPath: path.join(tempDir, "unicode.ts"),
        relativePath: "unicode.ts",
        encodedPath: "dW5pY29kZS50cw==",
        size: Buffer.byteLength(content, "utf8"),
        lastModified: new Date(),
        checksum,
        status: "backed-up",
      };

      mockSnapshotManager.getBackupFileContent.mockResolvedValue(content);

      const result = await integrityManager.verifyBackupFile(
        "unicode-test",
        file,
        mockSnapshotManager,
      );

      expect(result.valid).toBe(true);
      expect(result.actualChecksum).toBe(checksum);
    });
  });
});

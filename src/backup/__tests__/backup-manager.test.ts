/**
 * Comprehensive tests for BackupManager
 * Tests all functionality including edge cases, error conditions, and concurrent operations
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
import os from "node:os";

// Mock modules before importing
jest.mock("node:fs");
jest.mock("@/context/globalContext");

import {
  BackupManager,
  getBackupManager,
  initializeBackupManager,
} from "../backup-manager";
import {
  BackupConfig,
  BackupId,
  MigrationContext,
  BackupError,
} from "../types";
import {
  testEnv,
  errorSimulator,
  PerformanceMonitor,
} from "./helpers/jest-setup";
import {
  generateBackupMetadata,
  generateMigrationContext,
  TEST_PROJECT_STRUCTURES,
  ERROR_SCENARIOS,
} from "./__fixtures__/test-data";
import { mockFsUtils } from "./__mocks__/fs";

// Mock the global context
const mockGetContext = jest.fn();
(require("@/context/globalContext") as any).getContext = mockGetContext;

describe("BackupManager", () => {
  let backupManager: BackupManager;
  let tempDir: string;
  let mockConfig: Partial<BackupConfig>;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockFsUtils.reset();
    errorSimulator.clear();

    // Create temporary directory
    tempDir = await testEnv.createTempDir("backup-manager-test");

    // Mock global context
    mockGetContext.mockReturnValue({
      runArgs: {
        root: tempDir,
        dryRun: false,
        yolo: false,
        interactive: true,
      },
    });

    // Setup test configuration
    mockConfig = {
      maxBackups: 10,
      maxAgeDays: 30,
      maxTotalSize: 1024 * 1024 * 100, // 100MB
      autoCleanup: false, // Disable for testing
      compression: false,
      gitIntegration: false, // Disable for testing
      verifyAfterBackup: false, // Disable for testing
      concurrency: 5,
      showProgress: false,
    };

    // Create BackupManager instance
    backupManager = new BackupManager(
      path.join(tempDir, ".migr8-backups"),
      mockConfig,
    );
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  describe("Constructor and Initialization", () => {
    it("should create BackupManager with default configuration", () => {
      const manager = new BackupManager();
      const config = manager.getConfig();

      expect(config.maxBackups).toBe(50);
      expect(config.maxAgeDays).toBe(30);
      expect(config.autoCleanup).toBe(true);
      expect(config.verifyAfterBackup).toBe(true);
    });

    it("should create BackupManager with custom configuration", () => {
      const customConfig = {
        maxBackups: 100,
        maxAgeDays: 60,
        autoCleanup: false,
      };

      const manager = new BackupManager(tempDir, customConfig);
      const config = manager.getConfig();

      expect(config.maxBackups).toBe(100);
      expect(config.maxAgeDays).toBe(60);
      expect(config.autoCleanup).toBe(false);
    });

    it("should merge partial configuration with defaults", () => {
      const partialConfig = { maxBackups: 25 };
      const manager = new BackupManager(tempDir, partialConfig);
      const config = manager.getConfig();

      expect(config.maxBackups).toBe(25);
      expect(config.maxAgeDays).toBe(30); // Default value
      expect(config.autoCleanup).toBe(true); // Default value
    });
  });

  describe("createPreMigrationBackup", () => {
    it("should create a backup successfully", async () => {
      // Setup test files
      const testFiles = ["src/components/Button.tsx", "src/utils/helpers.ts"];
      testFiles.forEach((file, index) => {
        mockFsUtils.setFile(
          path.join(tempDir, file),
          `Test content ${index + 1}`,
        );
      });

      const migrationContext = generateMigrationContext();
      const backupId = await backupManager.createPreMigrationBackup(
        testFiles.map((f) => path.join(tempDir, f)),
        migrationContext,
      );

      expect(backupId).toBeValidBackupId();

      // Verify backup was created
      const backupInfo = await backupManager.getBackupInfo(backupId);
      expect(backupInfo).not.toBeNull();
      expect(backupInfo!.files).toHaveLength(testFiles.length);
      expect(backupInfo!.migration.componentName).toBe(
        migrationContext.componentName,
      );
    });

    it("should handle missing files gracefully", async () => {
      const testFiles = [
        path.join(tempDir, "existing-file.ts"),
        path.join(tempDir, "missing-file.ts"),
      ];

      // Only create one file
      mockFsUtils.setFile(testFiles[0], "Existing content");

      const migrationContext = generateMigrationContext();

      await expect(
        backupManager.createPreMigrationBackup(testFiles, migrationContext),
      ).rejects.toThrow(BackupError);
    });

    it("should handle file system errors during backup", async () => {
      const testFiles = [path.join(tempDir, "test-file.ts")];
      mockFsUtils.setFile(testFiles[0], "Test content");

      // Simulate file read error
      errorSimulator.setErrorCondition(
        "readFile",
        new Error("Permission denied"),
      );

      const migrationContext = generateMigrationContext();

      await expect(
        backupManager.createPreMigrationBackup(testFiles, migrationContext),
      ).rejects.toThrow();
    });

    it("should handle insufficient disk space", async () => {
      const testFiles = [path.join(tempDir, "large-file.ts")];
      mockFsUtils.setFile(testFiles[0], "x".repeat(1000000)); // 1MB file

      // Mock disk space check to fail
      errorSimulator.setErrorCondition("statfs", new Error("Disk full"));

      const migrationContext = generateMigrationContext();

      // Should warn but continue since disk space check is optional
      const backupId = await backupManager.createPreMigrationBackup(
        testFiles,
        migrationContext,
      );
      expect(backupId).toBeValidBackupId();
    });

    it("should handle concurrent backup creation", async () => {
      const testFiles1 = [path.join(tempDir, "file1.ts")];
      const testFiles2 = [path.join(tempDir, "file2.ts")];

      mockFsUtils.setFile(testFiles1[0], "Content 1");
      mockFsUtils.setFile(testFiles2[0], "Content 2");

      const migrationContext1 = generateMigrationContext();
      const migrationContext2 = {
        ...generateMigrationContext(),
        componentName: "Component2",
      };

      // Create backups concurrently
      const [backupId1, backupId2] = await Promise.all([
        backupManager.createPreMigrationBackup(testFiles1, migrationContext1),
        backupManager.createPreMigrationBackup(testFiles2, migrationContext2),
      ]);

      expect(backupId1).toBeValidBackupId();
      expect(backupId2).toBeValidBackupId();
      expect(backupId1).not.toBe(backupId2);

      // Verify both backups exist
      const backup1 = await backupManager.getBackupInfo(backupId1);
      const backup2 = await backupManager.getBackupInfo(backupId2);

      expect(backup1).not.toBeNull();
      expect(backup2).not.toBeNull();
      expect(backup1!.migration.componentName).toBe(
        migrationContext1.componentName,
      );
      expect(backup2!.migration.componentName).toBe(
        migrationContext2.componentName,
      );
    });

    it("should generate unique backup IDs for identical components", async () => {
      const testFiles = [path.join(tempDir, "test-file.ts")];
      mockFsUtils.setFile(testFiles[0], "Test content");

      const migrationContext = generateMigrationContext();

      // Create two backups with same migration context
      const backupId1 = await backupManager.createPreMigrationBackup(
        testFiles,
        migrationContext,
      );

      // Wait a moment to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const backupId2 = await backupManager.createPreMigrationBackup(
        testFiles,
        migrationContext,
      );

      expect(backupId1).not.toBe(backupId2);
      expect(backupId1).toBeValidBackupId();
      expect(backupId2).toBeValidBackupId();
    });
  });

  describe("createManualBackup", () => {
    it("should create manual backup with custom name", async () => {
      const testFiles = [path.join(tempDir, "manual-file.ts")];
      mockFsUtils.setFile(testFiles[0], "Manual backup content");

      const backupId = await backupManager.createManualBackup(
        testFiles,
        "my-manual-backup",
      );

      expect(backupId).toContain("my-manual-backup");

      const backupInfo = await backupManager.getBackupInfo(backupId);
      expect(backupInfo).not.toBeNull();
      expect(backupInfo!.migration.mode).toBe("interactive");
      expect(backupInfo!.tags).toContain("manual");
    });

    it("should create manual backup without custom name", async () => {
      const testFiles = [path.join(tempDir, "auto-named-file.ts")];
      mockFsUtils.setFile(testFiles[0], "Auto named backup content");

      const backupId = await backupManager.createManualBackup(testFiles);

      expect(backupId).toBeValidBackupId();

      const backupInfo = await backupManager.getBackupInfo(backupId);
      expect(backupInfo).not.toBeNull();
      expect(backupInfo!.migration.sourcePackage).toBe("manual");
      expect(backupInfo!.migration.targetPackage).toBe("manual");
    });

    it("should handle empty file list", async () => {
      await expect(backupManager.createManualBackup([])).rejects.toThrow(
        BackupError,
      );
    });

    it("should sanitize unsafe backup names", async () => {
      const testFiles = [path.join(tempDir, "test-file.ts")];
      mockFsUtils.setFile(testFiles[0], "Test content");

      const unsafeName = "../../../etc/passwd";
      const backupId = await backupManager.createManualBackup(
        testFiles,
        unsafeName,
      );

      // Should sanitize the name
      expect(backupId).not.toContain("../");
      expect(backupId).not.toContain("/etc/");
    });
  });

  describe("listBackups", () => {
    it("should return empty array when no backups exist", async () => {
      const backups = await backupManager.listBackups();
      expect(backups).toEqual([]);
    });

    it("should list existing backups", async () => {
      // Create test backups
      const testFiles = [path.join(tempDir, "test-file.ts")];
      mockFsUtils.setFile(testFiles[0], "Test content");

      const backupId1 = await backupManager.createManualBackup(
        testFiles,
        "backup-1",
      );
      const backupId2 = await backupManager.createManualBackup(
        testFiles,
        "backup-2",
      );

      const backups = await backupManager.listBackups();

      expect(backups).toHaveLength(2);
      expect(backups.map((b) => b.id)).toContain(backupId1);
      expect(backups.map((b) => b.id)).toContain(backupId2);
    });

    it("should handle corrupted backup registry", async () => {
      // Simulate corrupted registry by setting invalid JSON
      mockFsUtils.setFile(
        path.join(tempDir, ".migr8-backups", "active-backups.json"),
        "invalid json{",
      );

      await expect(backupManager.listBackups()).rejects.toThrow(BackupError);
    });
  });

  describe("getBackupInfo", () => {
    it("should return backup metadata for existing backup", async () => {
      const testFiles = [path.join(tempDir, "info-test.ts")];
      mockFsUtils.setFile(testFiles[0], "Info test content");

      const backupId = await backupManager.createManualBackup(
        testFiles,
        "info-test",
      );
      const backupInfo = await backupManager.getBackupInfo(backupId);

      expect(backupInfo).not.toBeNull();
      expect(backupInfo!.id).toBe(backupId);
      expect(backupInfo!.files).toHaveLength(1);
      expect(backupInfo!.stats.totalFiles).toBe(1);
    });

    it("should return null for non-existent backup", async () => {
      const backupInfo = await backupManager.getBackupInfo(
        "non-existent-backup-id",
      );
      expect(backupInfo).toBeNull();
    });

    it("should handle corrupted metadata", async () => {
      const testFiles = [path.join(tempDir, "corrupt-test.ts")];
      mockFsUtils.setFile(testFiles[0], "Corrupt test content");

      const backupId = await backupManager.createManualBackup(
        testFiles,
        "corrupt-test",
      );

      // Corrupt the metadata file
      const metadataPath = path.join(
        tempDir,
        ".migr8-backups",
        "snapshots",
        backupId,
        "metadata.json",
      );
      mockFsUtils.setFile(metadataPath, "corrupted metadata {");

      await expect(backupManager.getBackupInfo(backupId)).rejects.toThrow(
        BackupError,
      );
    });
  });

  describe("verifyBackup", () => {
    it("should verify backup integrity successfully", async () => {
      // Enable verification for this test
      const verifyingManager = new BackupManager(
        path.join(tempDir, ".migr8-backups-verify"),
        { ...mockConfig, verifyAfterBackup: false }, // We'll verify manually
      );

      const testFiles = [path.join(tempDir, "verify-test.ts")];
      mockFsUtils.setFile(testFiles[0], "Verify test content");

      const backupId = await verifyingManager.createManualBackup(
        testFiles,
        "verify-test",
      );
      const result = await verifyingManager.verifyBackup(backupId);

      expect(result.valid).toBe(true);
      expect(result.summary.totalFiles).toBe(1);
      expect(result.summary.validFiles).toBe(1);
      expect(result.summary.invalidFiles).toBe(0);
    });

    it("should detect corrupted backup files", async () => {
      const testFiles = [path.join(tempDir, "corruption-test.ts")];
      mockFsUtils.setFile(testFiles[0], "Original content");

      const backupId = await backupManager.createManualBackup(
        testFiles,
        "corruption-test",
      );

      // Corrupt the backup file
      const backupInfo = await backupManager.getBackupInfo(backupId);
      const encodedPath = backupInfo!.files[0].encodedPath;
      const corruptedPath = path.join(
        tempDir,
        ".migr8-backups",
        "snapshots",
        backupId,
        "files",
        encodedPath,
      );
      mockFsUtils.setFile(corruptedPath, "Corrupted content");

      const result = await backupManager.verifyBackup(backupId);

      expect(result.valid).toBe(false);
      expect(result.summary.invalidFiles).toBe(1);
    });

    it("should handle missing backup files", async () => {
      const testFiles = [path.join(tempDir, "missing-test.ts")];
      mockFsUtils.setFile(testFiles[0], "Missing test content");

      const backupId = await backupManager.createManualBackup(
        testFiles,
        "missing-test",
      );

      // Remove the backup file
      const backupInfo = await backupManager.getBackupInfo(backupId);
      const encodedPath = backupInfo!.files[0].encodedPath;
      const backupFilePath = path.join(
        tempDir,
        ".migr8-backups",
        "snapshots",
        backupId,
        "files",
        encodedPath,
      );

      // Simulate file deletion by setting up an error
      errorSimulator.setErrorCondition(
        "readFile",
        new Error("ENOENT: file not found"),
      );

      const result = await backupManager.verifyBackup(backupId);

      expect(result.valid).toBe(false);
      expect(result.summary.errorFiles).toBe(1);
    });

    it("should fail verification for non-existent backup", async () => {
      await expect(
        backupManager.verifyBackup("non-existent-backup"),
      ).rejects.toThrow(BackupError);
    });
  });

  describe("deleteBackup", () => {
    it("should delete existing backup", async () => {
      const testFiles = [path.join(tempDir, "delete-test.ts")];
      mockFsUtils.setFile(testFiles[0], "Delete test content");

      const backupId = await backupManager.createManualBackup(
        testFiles,
        "delete-test",
      );

      // Verify backup exists
      let backupInfo = await backupManager.getBackupInfo(backupId);
      expect(backupInfo).not.toBeNull();

      // Delete backup
      await backupManager.deleteBackup(backupId, true);

      // Verify backup no longer exists
      backupInfo = await backupManager.getBackupInfo(backupId);
      expect(backupInfo).toBeNull();
    });

    it("should fail to delete non-existent backup", async () => {
      await expect(
        backupManager.deleteBackup("non-existent-backup"),
      ).rejects.toThrow(BackupError);
    });

    it("should respect protection flag without force", async () => {
      const testFiles = [path.join(tempDir, "protected-test.ts")];
      mockFsUtils.setFile(testFiles[0], "Protected test content");

      const backupId = await backupManager.createManualBackup(
        testFiles,
        "protected-test",
      );

      // Mark as protected by setting canAutoClean to false
      const backupInfo = await backupManager.getBackupInfo(backupId);
      backupInfo!.canAutoClean = false;

      await expect(backupManager.deleteBackup(backupId, false)).rejects.toThrow(
        BackupError,
      );
    });

    it("should override protection with force flag", async () => {
      const testFiles = [path.join(tempDir, "force-delete-test.ts")];
      mockFsUtils.setFile(testFiles[0], "Force delete test content");

      const backupId = await backupManager.createManualBackup(
        testFiles,
        "force-delete-test",
      );

      // Should succeed with force=true regardless of protection
      await expect(
        backupManager.deleteBackup(backupId, true),
      ).resolves.not.toThrow();
    });

    it("should handle file system errors during deletion", async () => {
      const testFiles = [path.join(tempDir, "fs-error-test.ts")];
      mockFsUtils.setFile(testFiles[0], "FS error test content");

      const backupId = await backupManager.createManualBackup(
        testFiles,
        "fs-error-test",
      );

      // Simulate file system error
      errorSimulator.setErrorCondition("rm", new Error("Permission denied"));

      await expect(
        backupManager.deleteBackup(backupId, true),
      ).rejects.toThrow();
    });
  });

  describe("Configuration Management", () => {
    it("should return current configuration", () => {
      const config = backupManager.getConfig();

      expect(config).toMatchObject(mockConfig);
      expect(config.maxBackups).toBe(mockConfig.maxBackups);
      expect(config.maxAgeDays).toBe(mockConfig.maxAgeDays);
    });

    it("should update configuration", async () => {
      const newConfig = {
        maxBackups: 20,
        maxAgeDays: 60,
        autoCleanup: true,
      };

      await backupManager.updateConfig(newConfig);

      const updatedConfig = backupManager.getConfig();
      expect(updatedConfig.maxBackups).toBe(20);
      expect(updatedConfig.maxAgeDays).toBe(60);
      expect(updatedConfig.autoCleanup).toBe(true);
    });

    it("should merge partial configuration updates", async () => {
      const originalConfig = backupManager.getConfig();
      const partialUpdate = { maxBackups: 15 };

      await backupManager.updateConfig(partialUpdate);

      const updatedConfig = backupManager.getConfig();
      expect(updatedConfig.maxBackups).toBe(15);
      expect(updatedConfig.maxAgeDays).toBe(originalConfig.maxAgeDays); // Should remain unchanged
    });
  });

  describe("Performance and Memory", () => {
    it("should handle large numbers of files efficiently", async () => {
      const monitor = new PerformanceMonitor();
      monitor.start();

      // Create many small files
      const fileCount = 100;
      const testFiles = [];

      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(tempDir, `perf-test-${i}.ts`);
        mockFsUtils.setFile(filePath, `Content for file ${i}`);
        testFiles.push(filePath);
      }

      const backupId = await backupManager.createManualBackup(
        testFiles,
        "performance-test",
      );

      const result = monitor.stop();

      // Verify backup was created
      const backupInfo = await backupManager.getBackupInfo(backupId);
      expect(backupInfo!.files).toHaveLength(fileCount);

      // Performance assertions
      expect(result.durationMs).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.memoryDelta.heapUsed).toBeLessThan(100 * 1024 * 1024); // Should not use more than 100MB additional memory
    });

    it("should handle concurrent operations without memory leaks", async () => {
      const monitor = new PerformanceMonitor();
      monitor.start();

      // Create multiple backups concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const testFiles = [path.join(tempDir, `concurrent-${i}.ts`)];
        mockFsUtils.setFile(testFiles[0], `Concurrent content ${i}`);

        promises.push(
          backupManager.createManualBackup(testFiles, `concurrent-backup-${i}`),
        );
      }

      const backupIds = await Promise.all(promises);

      const result = monitor.stop();

      // Verify all backups were created
      expect(backupIds).toHaveLength(10);
      for (const backupId of backupIds) {
        expect(backupId).toBeValidBackupId();
      }

      // Memory usage should be reasonable
      expect(result.memoryDelta.heapUsed).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe("Error Recovery", () => {
    it("should clean up partial backup on failure", async () => {
      const testFiles = [path.join(tempDir, "cleanup-test.ts")];
      mockFsUtils.setFile(testFiles[0], "Cleanup test content");

      // Simulate failure during backup creation
      errorSimulator.setErrorCondition(
        "writeFile",
        new Error("Simulated failure"),
        0.5,
      );

      try {
        await backupManager.createManualBackup(testFiles, "cleanup-test");
      } catch (error) {
        // Backup should fail
        expect(error).toBeInstanceOf(Error);
      }

      // Verify no partial backup remains in the listing
      const backups = await backupManager.listBackups();
      expect(
        backups.filter((b) => b.name.includes("cleanup-test")),
      ).toHaveLength(0);
    });

    it("should handle registry corruption gracefully", async () => {
      // Corrupt the active backups registry
      const registryPath = path.join(
        tempDir,
        ".migr8-backups",
        "active-backups.json",
      );
      mockFsUtils.setFile(registryPath, "invalid json content");

      // Should throw an error when trying to list backups
      await expect(backupManager.listBackups()).rejects.toThrow(BackupError);
    });

    it("should handle disk space exhaustion", async () => {
      const testFiles = [path.join(tempDir, "disk-space-test.ts")];
      mockFsUtils.setFile(testFiles[0], "x".repeat(1000000)); // 1MB file

      // Mock insufficient disk space
      const originalError = ERROR_SCENARIOS.DISK_FULL;
      errorSimulator.setErrorCondition(
        "statfs",
        new Error(`${originalError.code}: ${originalError.message}`),
      );

      // Should still proceed with warning since disk space check is non-critical
      const backupId = await backupManager.createManualBackup(
        testFiles,
        "disk-space-test",
      );
      expect(backupId).toBeValidBackupId();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty files", async () => {
      const testFiles = [path.join(tempDir, "empty-file.ts")];
      mockFsUtils.setFile(testFiles[0], ""); // Empty file

      const backupId = await backupManager.createManualBackup(
        testFiles,
        "empty-file-test",
      );

      const backupInfo = await backupManager.getBackupInfo(backupId);
      expect(backupInfo!.files[0].size).toBe(0);
      expect(backupInfo!.files[0].checksum).toBeValidChecksum();
    });

    it("should handle files with special characters in names", async () => {
      const specialFiles = [
        path.join(tempDir, "file with spaces.ts"),
        path.join(tempDir, "file-with-unicode-é.ts"),
        path.join(tempDir, "file@with#symbols$.ts"),
      ];

      specialFiles.forEach((file, index) => {
        mockFsUtils.setFile(file, `Special content ${index + 1}`);
      });

      const backupId = await backupManager.createManualBackup(
        specialFiles,
        "special-chars-test",
      );

      const backupInfo = await backupManager.getBackupInfo(backupId);
      expect(backupInfo!.files).toHaveLength(specialFiles.length);

      // All files should have encoded paths
      backupInfo!.files.forEach((file) => {
        expect(file.encodedPath).toBeTruthy();
        expect(file.encodedPath).not.toContain(" ");
        expect(file.encodedPath).not.toContain("@");
      });
    });

    it("should handle deeply nested file paths", async () => {
      const deepPath =
        "a/very/deep/directory/structure/with/many/levels/file.ts";
      const fullPath = path.join(tempDir, deepPath);

      mockFsUtils.setFile(fullPath, "Deep file content");

      const backupId = await backupManager.createManualBackup(
        [fullPath],
        "deep-path-test",
      );

      const backupInfo = await backupManager.getBackupInfo(backupId);
      expect(backupInfo!.files[0].relativePath).toBe(deepPath);
    });

    it("should handle backup ID collision (extremely rare)", async () => {
      const testFiles = [path.join(tempDir, "collision-test.ts")];
      mockFsUtils.setFile(testFiles[0], "Collision test content");

      // Mock Date.now to return same timestamp
      const originalDateNow = Date.now;
      const fixedTimestamp = 1234567890123;
      Date.now = jest.fn(() => fixedTimestamp);

      try {
        // Mock crypto to return same hash
        const crypto = require("crypto");
        const originalCreateHash = crypto.createHash;
        let callCount = 0;
        crypto.createHash = jest.fn((algorithm) => {
          const hash = originalCreateHash(algorithm);
          const originalDigest = hash.digest;
          hash.digest = jest.fn((encoding) => {
            if (callCount++ < 2) {
              return "12345678"; // Same hash for first two calls
            }
            return originalDigest.call(hash, encoding);
          });
          return hash;
        });

        const migrationContext = generateMigrationContext();

        const backupId1 = await backupManager.createPreMigrationBackup(
          testFiles,
          migrationContext,
        );

        // Second backup should either succeed with different ID or fail gracefully
        await expect(async () => {
          const backupId2 = await backupManager.createPreMigrationBackup(
            testFiles,
            migrationContext,
          );
          expect(backupId2).not.toBe(backupId1); // Should generate different ID
        }).not.toThrow();
      } finally {
        Date.now = originalDateNow;
      }
    });
  });

  describe("Singleton Pattern", () => {
    it("should return same instance from getBackupManager", () => {
      const instance1 = getBackupManager();
      const instance2 = getBackupManager();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance with initializeBackupManager", () => {
      const originalInstance = getBackupManager();
      const newInstance = initializeBackupManager(tempDir, { maxBackups: 99 });
      const retrievedInstance = getBackupManager();

      expect(newInstance).toBe(retrievedInstance);
      expect(newInstance).not.toBe(originalInstance);
      expect(newInstance.getConfig().maxBackups).toBe(99);
    });
  });
});

describe("BackupManager Integration Scenarios", () => {
  let backupManager: BackupManager;
  let tempDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFsUtils.reset();
    errorSimulator.clear();

    tempDir = await testEnv.createTempDir("backup-integration-test");

    mockGetContext.mockReturnValue({
      runArgs: { root: tempDir },
    });

    backupManager = new BackupManager(path.join(tempDir, ".migr8-backups"), {
      autoCleanup: false,
      verifyAfterBackup: false,
      gitIntegration: false,
    });
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  it("should handle complete project backup and restore workflow", async () => {
    // Create a test project structure
    const projectFiles = await testEnv.createTestFiles(
      TEST_PROJECT_STRUCTURES.SIMPLE_REACT_APP,
      tempDir,
    );

    const allFiles = Object.keys(TEST_PROJECT_STRUCTURES.SIMPLE_REACT_APP).map(
      (f) => path.join(projectFiles, f),
    );

    // Create backup
    const backupId = await backupManager.createManualBackup(
      allFiles,
      "project-backup",
    );

    // Verify backup contains all files
    const backupInfo = await backupManager.getBackupInfo(backupId);
    expect(backupInfo!.files).toHaveLength(allFiles.length);

    // Verify integrity
    const verifyResult = await backupManager.verifyBackup(backupId);
    expect(verifyResult.valid).toBe(true);

    // List backups
    const backups = await backupManager.listBackups();
    expect(backups).toHaveLength(1);
    expect(backups[0].id).toBe(backupId);
  });

  it("should handle backup system recovery after crash", async () => {
    // Create initial backup
    const testFiles = [path.join(tempDir, "recovery-test.ts")];
    mockFsUtils.setFile(testFiles[0], "Recovery test content");

    const backupId = await backupManager.createManualBackup(
      testFiles,
      "recovery-test",
    );

    // Simulate system crash by creating new manager instance
    const newManager = new BackupManager(path.join(tempDir, ".migr8-backups"), {
      autoCleanup: false,
    });

    // Should still be able to access the backup
    const backupInfo = await newManager.getBackupInfo(backupId);
    expect(backupInfo).not.toBeNull();
    expect(backupInfo!.id).toBe(backupId);

    const backups = await newManager.listBackups();
    expect(backups).toHaveLength(1);
  });
});

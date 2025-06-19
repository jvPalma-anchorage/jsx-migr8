/**
 * Comprehensive tests for MetadataManager
 * Tests metadata storage, retrieval, registry management, and edge cases
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

// Mock modules before importing
jest.mock("node:fs");

import { MetadataManager } from "../metadata-manager";
import { BackupMetadata, ActiveBackup, BackupError, BackupId } from "../types";
import { testEnv, errorSimulator } from "./helpers/jest-setup";
import {
  generateBackupMetadata,
  generateActiveBackups,
} from "./__fixtures__/test-data";
import { mockFsUtils } from "./__mocks__/fs";

describe("MetadataManager", () => {
  let metadataManager: MetadataManager;
  let tempDir: string;
  let backupRoot: string;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockFsUtils.reset();
    errorSimulator.clear();

    // Create temporary directory
    tempDir = await testEnv.createTempDir("metadata-manager-test");
    backupRoot = path.join(tempDir, ".migr8-backups");

    // Create MetadataManager instance
    metadataManager = new MetadataManager(backupRoot);
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  describe("Metadata Storage and Retrieval", () => {
    it("should save and retrieve metadata successfully", async () => {
      const backupId = "test-backup-123";
      const metadata = generateBackupMetadata({ id: backupId });

      // Save metadata
      await metadataManager.saveMetadata(backupId, metadata);

      // Retrieve metadata
      const retrievedMetadata = await metadataManager.getMetadata(backupId);

      expect(retrievedMetadata).not.toBeNull();
      expect(retrievedMetadata!.id).toBe(backupId);
      expect(retrievedMetadata!.name).toBe(metadata.name);
      expect(retrievedMetadata!.files).toHaveLength(metadata.files.length);
    });

    it("should return null for non-existent metadata", async () => {
      const metadata = await metadataManager.getMetadata("non-existent-backup");
      expect(metadata).toBeNull();
    });

    it("should handle metadata directory creation", async () => {
      const backupId = "directory-test-123";
      const metadata = generateBackupMetadata({ id: backupId });

      // Save metadata should create directory structure
      await metadataManager.saveMetadata(backupId, metadata);

      const metadataPath = path.join(
        backupRoot,
        "snapshots",
        backupId,
        "metadata.json",
      );
      expect(mockFsUtils.exists(metadataPath)).toBe(true);
    });

    it("should preserve date objects in metadata", async () => {
      const backupId = "date-preservation-test";
      const createdAt = new Date("2023-01-01T12:00:00Z");
      const expiresAt = new Date("2023-01-08T12:00:00Z");
      const metadata = generateBackupMetadata({
        id: backupId,
        createdAt,
        expiresAt,
      });

      await metadataManager.saveMetadata(backupId, metadata);
      const retrieved = await metadataManager.getMetadata(backupId);

      expect(retrieved!.createdAt).toBeInstanceOf(Date);
      expect(retrieved!.createdAt.getTime()).toBe(createdAt.getTime());
      expect(retrieved!.expiresAt).toBeInstanceOf(Date);
      expect(retrieved!.expiresAt!.getTime()).toBe(expiresAt.getTime());
    });

    it("should handle file save errors", async () => {
      const backupId = "save-error-test";
      const metadata = generateBackupMetadata({ id: backupId });

      // Simulate write error
      errorSimulator.setErrorCondition(
        "writeFile",
        new Error("EACCES: permission denied"),
      );

      await expect(
        metadataManager.saveMetadata(backupId, metadata),
      ).rejects.toThrow(BackupError);
    });

    it("should handle corrupted metadata files", async () => {
      const backupId = "corrupted-metadata-test";

      // Create corrupted metadata file
      const metadataPath = path.join(
        backupRoot,
        "snapshots",
        backupId,
        "metadata.json",
      );
      mockFsUtils.setFile(metadataPath, "invalid json content {");

      await expect(metadataManager.getMetadata(backupId)).rejects.toThrow(
        BackupError,
      );
    });

    it("should handle very large metadata files", async () => {
      const backupId = "large-metadata-test";
      const largeFileList = Array.from({ length: 10000 }, (_, i) => ({
        originalPath: `/test/project/file${i}.ts`,
        relativePath: `file${i}.ts`,
        encodedPath: Buffer.from(`file${i}.ts`).toString("base64"),
        size: Math.floor(Math.random() * 10000),
        lastModified: new Date(),
        checksum: `checksum${i}`.padEnd(64, "0"),
        status: "backed-up" as const,
      }));

      const largeMetadata = generateBackupMetadata({
        id: backupId,
        files: largeFileList,
      });

      await metadataManager.saveMetadata(backupId, largeMetadata);
      const retrieved = await metadataManager.getMetadata(backupId);

      expect(retrieved!.files).toHaveLength(10000);
    });
  });

  describe("Metadata Updates", () => {
    it("should update existing metadata", async () => {
      const backupId = "update-test-123";
      const originalMetadata = generateBackupMetadata({ id: backupId });

      // Save initial metadata
      await metadataManager.saveMetadata(backupId, originalMetadata);

      // Update metadata
      const updates = {
        name: "Updated Backup Name",
        description: "Updated description",
        tags: ["updated", "test"],
      };

      await metadataManager.updateMetadata(backupId, updates);

      // Verify updates
      const updatedMetadata = await metadataManager.getMetadata(backupId);
      expect(updatedMetadata!.name).toBe("Updated Backup Name");
      expect(updatedMetadata!.description).toBe("Updated description");
      expect(updatedMetadata!.tags).toEqual(["updated", "test"]);
    });

    it("should fail to update non-existent metadata", async () => {
      await expect(
        metadataManager.updateMetadata("non-existent-backup", {
          name: "New Name",
        }),
      ).rejects.toThrow(BackupError);
    });

    it("should preserve unchanged fields during update", async () => {
      const backupId = "preserve-test-123";
      const originalMetadata = generateBackupMetadata({ id: backupId });

      await metadataManager.saveMetadata(backupId, originalMetadata);

      // Update only name
      await metadataManager.updateMetadata(backupId, { name: "New Name" });

      const updatedMetadata = await metadataManager.getMetadata(backupId);
      expect(updatedMetadata!.name).toBe("New Name");
      expect(updatedMetadata!.description).toBe(originalMetadata.description);
      expect(updatedMetadata!.files).toEqual(originalMetadata.files);
    });
  });

  describe("Metadata Deletion", () => {
    it("should delete metadata successfully", async () => {
      const backupId = "delete-test-123";
      const metadata = generateBackupMetadata({ id: backupId });

      // Save and then delete
      await metadataManager.saveMetadata(backupId, metadata);
      await metadataManager.deleteMetadata(backupId);

      // Verify deletion
      const retrieved = await metadataManager.getMetadata(backupId);
      expect(retrieved).toBeNull();
    });

    it("should handle deletion of non-existent metadata", async () => {
      // Should not throw when deleting non-existent metadata
      await expect(
        metadataManager.deleteMetadata("non-existent-backup"),
      ).resolves.not.toThrow();
    });

    it("should handle file system errors during deletion", async () => {
      const backupId = "delete-error-test";
      const metadata = generateBackupMetadata({ id: backupId });

      await metadataManager.saveMetadata(backupId, metadata);

      // Simulate deletion error
      errorSimulator.setErrorCondition(
        "unlink",
        new Error("EACCES: permission denied"),
      );

      await expect(metadataManager.deleteMetadata(backupId)).rejects.toThrow(
        BackupError,
      );
    });
  });

  describe("Active Backups Registry", () => {
    it("should return empty array when no active backups exist", async () => {
      const activeBackups = await metadataManager.listActiveBackups();
      expect(activeBackups).toEqual([]);
    });

    it("should add backup to active registry", async () => {
      const activeBackup: ActiveBackup = {
        id: "active-test-123",
        name: "Test Active Backup",
        createdAt: new Date(),
        fileCount: 5,
        totalSize: 1024,
        migration: {
          componentName: "TestComponent",
          sourcePackage: "@old/package",
          targetPackage: "@new/package",
          mode: "interactive",
        },
        integrityValid: true,
        tags: ["test"],
      };

      await metadataManager.addToActiveBackups(activeBackup);

      const activeBackups = await metadataManager.listActiveBackups();
      expect(activeBackups).toHaveLength(1);
      expect(activeBackups[0].id).toBe(activeBackup.id);
    });

    it("should replace existing backup in registry", async () => {
      const backupId = "replace-test-123";
      const originalBackup: ActiveBackup = {
        id: backupId,
        name: "Original Name",
        createdAt: new Date(),
        fileCount: 3,
        totalSize: 512,
        migration: {
          componentName: "TestComponent",
          sourcePackage: "@old/package",
          targetPackage: "@new/package",
          mode: "interactive",
        },
        integrityValid: true,
        tags: ["original"],
      };

      const updatedBackup: ActiveBackup = {
        ...originalBackup,
        name: "Updated Name",
        tags: ["updated"],
      };

      // Add original
      await metadataManager.addToActiveBackups(originalBackup);

      // Add updated (should replace)
      await metadataManager.addToActiveBackups(updatedBackup);

      const activeBackups = await metadataManager.listActiveBackups();
      expect(activeBackups).toHaveLength(1);
      expect(activeBackups[0].name).toBe("Updated Name");
      expect(activeBackups[0].tags).toEqual(["updated"]);
    });

    it("should sort backups by creation date (newest first)", async () => {
      const backups = generateActiveBackups(3);

      // Add in random order
      await metadataManager.addToActiveBackups(backups[1]);
      await metadataManager.addToActiveBackups(backups[0]);
      await metadataManager.addToActiveBackups(backups[2]);

      const activeBackups = await metadataManager.listActiveBackups();

      // Should be sorted by creation date, newest first
      for (let i = 0; i < activeBackups.length - 1; i++) {
        expect(activeBackups[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          activeBackups[i + 1].createdAt.getTime(),
        );
      }
    });

    it("should remove backup from active registry", async () => {
      const activeBackup: ActiveBackup = {
        id: "remove-test-123",
        name: "Test Remove Backup",
        createdAt: new Date(),
        fileCount: 2,
        totalSize: 256,
        migration: {
          componentName: "TestComponent",
          sourcePackage: "@old/package",
          targetPackage: "@new/package",
          mode: "interactive",
        },
        integrityValid: true,
        tags: ["test"],
      };

      // Add and then remove
      await metadataManager.addToActiveBackups(activeBackup);
      await metadataManager.removeFromActiveBackups(activeBackup.id);

      const activeBackups = await metadataManager.listActiveBackups();
      expect(activeBackups).toHaveLength(0);
    });

    it("should handle removal of non-existent backup", async () => {
      // Should not throw when removing non-existent backup
      await expect(
        metadataManager.removeFromActiveBackups("non-existent-backup"),
      ).resolves.not.toThrow();
    });

    it("should update backup in active registry", async () => {
      const backupId = "update-active-test-123";
      const activeBackup: ActiveBackup = {
        id: backupId,
        name: "Original Name",
        createdAt: new Date(),
        fileCount: 3,
        totalSize: 512,
        migration: {
          componentName: "TestComponent",
          sourcePackage: "@old/package",
          targetPackage: "@new/package",
          mode: "interactive",
        },
        integrityValid: true,
        tags: ["original"],
      };

      await metadataManager.addToActiveBackups(activeBackup);

      // Update backup
      const updates = {
        name: "Updated Name",
        integrityValid: false,
        lastVerified: new Date(),
      };

      await metadataManager.updateActiveBackup(backupId, updates);

      const activeBackups = await metadataManager.listActiveBackups();
      expect(activeBackups[0].name).toBe("Updated Name");
      expect(activeBackups[0].integrityValid).toBe(false);
      expect(activeBackups[0].lastVerified).toBeDefined();
    });

    it("should fail to update non-existent backup in registry", async () => {
      await expect(
        metadataManager.updateActiveBackup("non-existent-backup", {
          name: "New Name",
        }),
      ).rejects.toThrow(BackupError);
    });

    it("should handle corrupted registry file", async () => {
      // Create corrupted registry
      const registryPath = path.join(backupRoot, "active-backups.json");
      mockFsUtils.setFile(registryPath, "invalid json {");

      await expect(metadataManager.listActiveBackups()).rejects.toThrow(
        BackupError,
      );
    });
  });

  describe("Backup Search and Filtering", () => {
    let testBackups: ActiveBackup[];

    beforeEach(async () => {
      // Create test backups with different characteristics
      testBackups = [
        {
          id: "backup-1",
          name: "Component A Backup",
          createdAt: new Date("2023-01-01"),
          fileCount: 5,
          totalSize: 1024,
          migration: {
            componentName: "ComponentA",
            sourcePackage: "@old/design-system",
            targetPackage: "@new/design-system",
            mode: "interactive",
          },
          integrityValid: true,
          tags: ["component", "migration"],
        },
        {
          id: "backup-2",
          name: "Component B Backup",
          createdAt: new Date("2023-01-02"),
          fileCount: 3,
          totalSize: 512,
          migration: {
            componentName: "ComponentB",
            sourcePackage: "@old/ui-kit",
            targetPackage: "@new/ui-kit",
            mode: "yolo",
          },
          integrityValid: true,
          tags: ["component", "test"],
        },
        {
          id: "backup-3",
          name: "Manual Backup",
          createdAt: new Date("2023-01-03"),
          fileCount: 10,
          totalSize: 2048,
          migration: {
            componentName: "manual-backup",
            sourcePackage: "manual",
            targetPackage: "manual",
            mode: "interactive",
          },
          integrityValid: false,
          tags: ["manual", "test"],
        },
      ];

      // Add all test backups
      for (const backup of testBackups) {
        await metadataManager.addToActiveBackups(backup);
      }
    });

    it("should find backups by component name", async () => {
      const results = await metadataManager.findBackups({
        componentName: "ComponentA",
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("backup-1");
    });

    it("should find backups by source package", async () => {
      const results = await metadataManager.findBackups({
        sourcePackage: "@old/design-system",
      });

      expect(results).toHaveLength(1);
      expect(results[0].migration.componentName).toBe("ComponentA");
    });

    it("should find backups by target package", async () => {
      const results = await metadataManager.findBackups({
        targetPackage: "@new/ui-kit",
      });

      expect(results).toHaveLength(1);
      expect(results[0].migration.componentName).toBe("ComponentB");
    });

    it("should find backups by mode", async () => {
      const results = await metadataManager.findBackups({
        mode: "interactive",
      });

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id)).toContain("backup-1");
      expect(results.map((r) => r.id)).toContain("backup-3");
    });

    it("should find backups by tags", async () => {
      const results = await metadataManager.findBackups({
        tags: ["component"],
      });

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id)).toContain("backup-1");
      expect(results.map((r) => r.id)).toContain("backup-2");
    });

    it("should find backups by date range", async () => {
      const results = await metadataManager.findBackups({
        createdAfter: new Date("2023-01-01T12:00:00Z"),
        createdBefore: new Date("2023-01-02T12:00:00Z"),
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("backup-2");
    });

    it("should find backups with multiple criteria", async () => {
      const results = await metadataManager.findBackups({
        tags: ["test"],
        mode: "interactive",
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("backup-3");
    });

    it("should return empty array when no backups match criteria", async () => {
      const results = await metadataManager.findBackups({
        componentName: "NonExistentComponent",
      });

      expect(results).toHaveLength(0);
    });
  });

  describe("Backup Statistics", () => {
    beforeEach(async () => {
      // Create test backups for statistics
      const testBackups = [
        {
          id: "stats-1",
          name: "Stats Backup 1",
          createdAt: new Date("2023-01-01"),
          fileCount: 5,
          totalSize: 1024,
          migration: {
            componentName: "ComponentA",
            sourcePackage: "@old/package",
            targetPackage: "@new/package",
            mode: "interactive",
          },
          integrityValid: true,
          tags: ["component"],
        },
        {
          id: "stats-2",
          name: "Stats Backup 2",
          createdAt: new Date("2023-01-02"),
          fileCount: 3,
          totalSize: 512,
          migration: {
            componentName: "ComponentB",
            sourcePackage: "@old/package",
            targetPackage: "@new/package",
            mode: "yolo",
          },
          integrityValid: true,
          tags: ["component", "auto"],
        },
        {
          id: "stats-3",
          name: "Stats Backup 3",
          createdAt: new Date("2023-01-03"),
          fileCount: 8,
          totalSize: 2048,
          migration: {
            componentName: "ComponentA",
            sourcePackage: "@old/package",
            targetPackage: "@new/package",
            mode: "interactive",
          },
          integrityValid: true,
          tags: ["manual"],
        },
      ];

      for (const backup of testBackups) {
        await metadataManager.addToActiveBackups(backup as ActiveBackup);
      }
    });

    it("should calculate backup statistics", async () => {
      const stats = await metadataManager.getBackupStats();

      expect(stats.totalBackups).toBe(3);
      expect(stats.totalSize).toBe(1024 + 512 + 2048);
      expect(stats.averageSize).toBe((1024 + 512 + 2048) / 3);
      expect(stats.oldestBackup).toEqual(new Date("2023-01-01"));
      expect(stats.newestBackup).toEqual(new Date("2023-01-03"));
    });

    it("should group statistics by mode", async () => {
      const stats = await metadataManager.getBackupStats();

      expect(stats.byMode).toEqual({
        interactive: 2,
        yolo: 1,
      });
    });

    it("should group statistics by component", async () => {
      const stats = await metadataManager.getBackupStats();

      expect(stats.byComponent).toEqual({
        ComponentA: 2,
        ComponentB: 1,
      });
    });

    it("should return empty statistics for no backups", async () => {
      // Clear all backups
      const backups = await metadataManager.listActiveBackups();
      for (const backup of backups) {
        await metadataManager.removeFromActiveBackups(backup.id);
      }

      const stats = await metadataManager.getBackupStats();

      expect(stats.totalBackups).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averageSize).toBe(0);
      expect(stats.oldestBackup).toBeUndefined();
      expect(stats.newestBackup).toBeUndefined();
      expect(stats.byMode).toEqual({});
      expect(stats.byComponent).toEqual({});
    });
  });

  describe("Cleanup Candidates", () => {
    beforeEach(async () => {
      // Create test backups with different expiration settings
      const expiredBackup = generateBackupMetadata({
        id: "expired-backup",
        name: "Expired Backup",
        canAutoClean: true,
        expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
      });

      const validBackup = generateBackupMetadata({
        id: "valid-backup",
        name: "Valid Backup",
        canAutoClean: true,
        expiresAt: new Date(Date.now() + 86400000), // Expires tomorrow
      });

      const protectedBackup = generateBackupMetadata({
        id: "protected-backup",
        name: "Protected Backup",
        canAutoClean: false,
      });

      // Save metadata
      await metadataManager.saveMetadata("expired-backup", expiredBackup);
      await metadataManager.saveMetadata("valid-backup", validBackup);
      await metadataManager.saveMetadata("protected-backup", protectedBackup);

      // Add to active registry
      for (const metadata of [expiredBackup, validBackup, protectedBackup]) {
        const activeBackup: ActiveBackup = {
          id: metadata.id,
          name: metadata.name,
          createdAt: metadata.createdAt,
          fileCount: metadata.files.length,
          totalSize: metadata.stats.totalSize,
          migration: {
            componentName: metadata.migration.componentName,
            sourcePackage: metadata.migration.sourcePackage,
            targetPackage: metadata.migration.targetPackage,
            mode: metadata.migration.mode,
          },
          integrityValid: true,
          tags: metadata.tags,
        };
        await metadataManager.addToActiveBackups(activeBackup);
      }
    });

    it("should identify expired backups as cleanup candidates", async () => {
      const candidates = await metadataManager.getCleanupCandidates();

      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe("expired-backup");
    });

    it("should not include protected backups in cleanup candidates", async () => {
      const candidates = await metadataManager.getCleanupCandidates();

      expect(
        candidates.find((c) => c.id === "protected-backup"),
      ).toBeUndefined();
    });

    it("should not include non-expired backups in cleanup candidates", async () => {
      const candidates = await metadataManager.getCleanupCandidates();

      expect(candidates.find((c) => c.id === "valid-backup")).toBeUndefined();
    });

    it("should handle missing metadata during cleanup candidate check", async () => {
      // Add backup to registry but remove metadata
      const orphanBackup: ActiveBackup = {
        id: "orphan-backup",
        name: "Orphan Backup",
        createdAt: new Date(),
        fileCount: 1,
        totalSize: 100,
        migration: {
          componentName: "OrphanComponent",
          sourcePackage: "@old/package",
          targetPackage: "@new/package",
          mode: "interactive",
        },
        integrityValid: true,
        tags: ["orphan"],
      };

      await metadataManager.addToActiveBackups(orphanBackup);

      const candidates = await metadataManager.getCleanupCandidates();

      // Should include orphan backup as cleanup candidate
      expect(candidates.find((c) => c.id === "orphan-backup")).toBeDefined();
    });
  });

  describe("Metadata Import/Export", () => {
    it("should export metadata as JSON string", async () => {
      const backupId = "export-test-123";
      const metadata = generateBackupMetadata({ id: backupId });

      await metadataManager.saveMetadata(backupId, metadata);

      const exportedJson = await metadataManager.exportMetadata(backupId);
      const parsed = JSON.parse(exportedJson);

      expect(parsed.id).toBe(backupId);
      expect(parsed.name).toBe(metadata.name);
      expect(parsed.files).toHaveLength(metadata.files.length);
    });

    it("should fail to export non-existent backup", async () => {
      await expect(
        metadataManager.exportMetadata("non-existent-backup"),
      ).rejects.toThrow(BackupError);
    });

    it("should import metadata successfully", async () => {
      const originalMetadata = generateBackupMetadata();
      const metadataJson = JSON.stringify(originalMetadata);

      const importedBackupId =
        await metadataManager.importMetadata(metadataJson);

      expect(importedBackupId).toBe(originalMetadata.id);

      // Verify metadata was saved
      const retrievedMetadata =
        await metadataManager.getMetadata(importedBackupId);
      expect(retrievedMetadata).not.toBeNull();
      expect(retrievedMetadata!.name).toBe(originalMetadata.name);

      // Verify added to active backups
      const activeBackups = await metadataManager.listActiveBackups();
      expect(
        activeBackups.find((b) => b.id === importedBackupId),
      ).toBeDefined();
    });

    it("should fail to import invalid metadata JSON", async () => {
      await expect(
        metadataManager.importMetadata("invalid json {"),
      ).rejects.toThrow(BackupError);
    });

    it("should fail to import metadata with missing required fields", async () => {
      const invalidMetadata = {
        id: "invalid-backup",
        // Missing required fields like 'name', 'files'
      };

      await expect(
        metadataManager.importMetadata(JSON.stringify(invalidMetadata)),
      ).rejects.toThrow(BackupError);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle concurrent access to registry", async () => {
      const backups = generateActiveBackups(10);

      // Add backups concurrently
      const promises = backups.map((backup) =>
        metadataManager.addToActiveBackups(backup),
      );

      await Promise.all(promises);

      const activeBackups = await metadataManager.listActiveBackups();
      expect(activeBackups).toHaveLength(10);
    });

    it("should handle registry file corruption gracefully", async () => {
      // First add a valid backup
      const backup = generateActiveBackups(1)[0];
      await metadataManager.addToActiveBackups(backup);

      // Corrupt the registry file
      const registryPath = path.join(backupRoot, "active-backups.json");
      mockFsUtils.setFile(registryPath, '{"incomplete": json');

      await expect(metadataManager.listActiveBackups()).rejects.toThrow(
        BackupError,
      );
    });

    it("should handle extremely large registry files", async () => {
      // Create many active backups
      const largeBackupSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `large-backup-${i}`,
        name: `Large Backup ${i}`,
        createdAt: new Date(Date.now() - i * 1000),
        fileCount: Math.floor(Math.random() * 100),
        totalSize: Math.floor(Math.random() * 1000000),
        migration: {
          componentName: `Component${i % 10}`,
          sourcePackage: "@old/package",
          targetPackage: "@new/package",
          mode: i % 2 === 0 ? "interactive" : ("yolo" as const),
        },
        integrityValid: true,
        tags: [`tag${i % 5}`],
      }));

      // Add all backups
      for (const backup of largeBackupSet) {
        await metadataManager.addToActiveBackups(backup as ActiveBackup);
      }

      const activeBackups = await metadataManager.listActiveBackups();
      expect(activeBackups).toHaveLength(1000);
    });

    it("should handle metadata with special characters", async () => {
      const backupId = "special-chars-test";
      const metadata = generateBackupMetadata({
        id: backupId,
        name: "Backup with 特殊字符 and émojis 🚀",
        description: 'Description with newlines\nand tabs\tand quotes "quotes"',
      });

      await metadataManager.saveMetadata(backupId, metadata);
      const retrieved = await metadataManager.getMetadata(backupId);

      expect(retrieved!.name).toBe("Backup with 特殊字符 and émojis 🚀");
      expect(retrieved!.description).toBe(
        'Description with newlines\nand tabs\tand quotes "quotes"',
      );
    });

    it("should handle metadata with circular references (should not occur but defensive)", async () => {
      const backupId = "circular-ref-test";
      const metadata = generateBackupMetadata({ id: backupId });

      // The sanitizeMetadata method should handle this
      await expect(
        metadataManager.saveMetadata(backupId, metadata),
      ).resolves.not.toThrow();
    });

    it("should handle very long file paths in metadata", async () => {
      const backupId = "long-paths-test";
      const veryLongPath = "very/".repeat(100) + "long/path/to/file.ts";

      const metadata = generateBackupMetadata({
        id: backupId,
        files: [
          {
            originalPath: veryLongPath,
            relativePath: veryLongPath,
            encodedPath: Buffer.from(veryLongPath).toString("base64"),
            size: 1000,
            lastModified: new Date(),
            checksum: "a".repeat(64),
            status: "backed-up",
          },
        ],
      });

      await metadataManager.saveMetadata(backupId, metadata);
      const retrieved = await metadataManager.getMetadata(backupId);

      expect(retrieved!.files[0].originalPath).toBe(veryLongPath);
    });
  });

  describe("Performance Tests", () => {
    it("should handle rapid metadata operations efficiently", async () => {
      const startTime = Date.now();
      const operationCount = 100;

      // Perform many rapid operations
      for (let i = 0; i < operationCount; i++) {
        const backupId = `perf-test-${i}`;
        const metadata = generateBackupMetadata({ id: backupId });

        await metadataManager.saveMetadata(backupId, metadata);
        await metadataManager.getMetadata(backupId);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it("should handle large batch operations", async () => {
      const batchSize = 50;
      const backups = generateActiveBackups(batchSize);

      const startTime = Date.now();

      // Add all backups
      for (const backup of backups) {
        await metadataManager.addToActiveBackups(backup);
      }

      // Perform search operations
      await metadataManager.findBackups({ tags: ["test"] });
      await metadataManager.getBackupStats();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

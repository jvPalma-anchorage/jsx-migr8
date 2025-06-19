/**
 * Comprehensive tests for RollbackManager
 * Tests rollback operations, conflict resolution, and recovery scenarios
 */
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import path from "node:path";

// Mock modules before importing
jest.mock("node:fs");

import { RollbackManager } from "../rollback-manager";
import { SnapshotManager } from "../snapshot-manager";
import { MetadataManager } from "../metadata-manager";
import { BackupManager } from "../backup-manager";
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

describe("RollbackManager", () => {
  let rollbackManager: RollbackManager;
  let mockSnapshotManager: jest.Mocked<SnapshotManager>;
  let mockMetadataManager: jest.Mocked<MetadataManager>;
  let mockBackupManager: jest.Mocked<BackupManager>;
  let tempDir: string;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockFsUtils.reset();
    errorSimulator.clear();

    // Create temporary directory
    tempDir = await testEnv.createTempDir("rollback-manager-test");

    // Create mock managers
    mockSnapshotManager = {
      restoreFiles: jest.fn(),
      getBackupFileContent: jest.fn(),
      verifyBackupFile: jest.fn(),
    } as any;

    mockMetadataManager = {
      getMetadata: jest.fn(),
    } as any;

    mockBackupManager = {
      createManualBackup: jest.fn(),
    } as any;

    // Create RollbackManager instance
    rollbackManager = new RollbackManager(
      mockSnapshotManager,
      mockMetadataManager,
      mockBackupManager,
    );
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  describe("Full Rollback Operations", () => {
    it("should perform complete rollback successfully", async () => {
      const backupId = "rollback-test-123";
      const metadata = generateBackupMetadata({ id: backupId });
      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      // Mock metadata retrieval
      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Mock successful file restoration
      const restoreResults: FileRestoreResult[] = metadata.files.map(
        (file) => ({
          filePath: file.originalPath,
          status: "restored",
        }),
      );
      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      const result = await rollbackManager.performRollback(context);

      expect(result.status).toBe("success");
      expect(result.context).toBe(context);
      expect(result.files).toEqual(restoreResults);
      expect(result.summary.restoredFiles).toBe(metadata.files.length);
      expect(result.summary.failedFiles).toBe(0);
      expect(result.summary.conflictedFiles).toBe(0);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it("should handle non-existent backup", async () => {
      const context: RollbackContext = {
        backupId: "non-existent-backup",
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(null);

      await expect(rollbackManager.performRollback(context)).rejects.toThrow(
        BackupError,
      );
    });

    it("should handle integrity verification failure", async () => {
      const backupId = "integrity-fail-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: true,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Mock integrity check failure
      jest
        .spyOn(rollbackManager as any, "verifyBackupIntegrity")
        .mockResolvedValue({
          valid: false,
          summary: {
            totalFiles: 5,
            validFiles: 3,
            invalidFiles: 2,
            errorFiles: 0,
          },
        });

      await expect(rollbackManager.performRollback(context)).rejects.toThrow(
        BackupError,
      );
    });

    it("should create pre-rollback backup when requested", async () => {
      const backupId = "pre-rollback-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: true,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      // Setup existing files
      metadata.files.forEach((file) => {
        mockFsUtils.setFile(file.originalPath, "Current content");
      });

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);
      mockBackupManager.createManualBackup.mockResolvedValue(
        "pre-rollback-backup-id",
      );

      const restoreResults: FileRestoreResult[] = metadata.files.map(
        (file) => ({
          filePath: file.originalPath,
          status: "restored",
        }),
      );
      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      const result = await rollbackManager.performRollback(context);

      expect(result.preRollbackBackupId).toBe("pre-rollback-backup-id");
      expect(mockBackupManager.createManualBackup).toHaveBeenCalledWith(
        expect.any(Array),
        expect.stringContaining("pre-rollback"),
        expect.objectContaining({
          description: expect.stringContaining("Pre-rollback backup"),
          tags: expect.arrayContaining(["pre-rollback", "auto-generated"]),
        }),
      );
    });

    it("should handle partial rollback success", async () => {
      const backupId = "partial-rollback-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Mock mixed success/failure results
      const restoreResults: FileRestoreResult[] = [
        { filePath: metadata.files[0].originalPath, status: "restored" },
        {
          filePath: metadata.files[1].originalPath,
          status: "failed",
          error: "Permission denied",
        },
        { filePath: metadata.files[2].originalPath, status: "restored" },
      ];
      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      const result = await rollbackManager.performRollback(context);

      expect(result.status).toBe("partial");
      expect(result.summary.restoredFiles).toBe(2);
      expect(result.summary.failedFiles).toBe(1);
    });

    it("should handle complete rollback failure", async () => {
      const backupId = "failed-rollback-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Mock all files failing
      const restoreResults: FileRestoreResult[] = metadata.files.map(
        (file) => ({
          filePath: file.originalPath,
          status: "failed",
          error: "Restore failed",
        }),
      );
      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      const result = await rollbackManager.performRollback(context);

      expect(result.status).toBe("failed");
      expect(result.summary.restoredFiles).toBe(0);
      expect(result.summary.failedFiles).toBe(metadata.files.length);
    });
  });

  describe("Selective File Restoration", () => {
    it("should restore specific files successfully", async () => {
      const backupId = "selective-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const filesToRestore = [
        metadata.files[0].originalPath,
        metadata.files[1].originalPath,
      ];

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      const restoreResults: FileRestoreResult[] = [
        { filePath: filesToRestore[0], status: "restored" },
        { filePath: filesToRestore[1], status: "restored" },
      ];
      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      const results = await rollbackManager.restoreSpecificFiles(
        backupId,
        filesToRestore,
        { force: false, createBackup: false },
      );

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.status === "restored")).toBe(true);
    });

    it("should handle selective restore with conflicts", async () => {
      const backupId = "selective-conflict-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const filesToRestore = [metadata.files[0].originalPath];

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Setup current file that conflicts
      const currentContent = "Modified current content";
      mockFsUtils.setFile(filesToRestore[0], currentContent);

      // Mock conflict detection
      jest.spyOn(rollbackManager as any, "detectConflicts").mockResolvedValue([
        {
          currentChecksum: "current-checksum",
          backupChecksum: metadata.files[0].checksum,
          expectedChecksum: metadata.files[0].checksum,
          type: "modified-since-backup",
          resolution: "overwrite",
        } as FileConflict,
      ]);

      await expect(
        rollbackManager.restoreSpecificFiles(backupId, filesToRestore, {
          force: false,
        }),
      ).rejects.toThrow(RollbackConflictError);
    });

    it("should force restore with conflicts when force=true", async () => {
      const backupId = "force-restore-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const filesToRestore = [metadata.files[0].originalPath];

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Mock conflicts
      jest.spyOn(rollbackManager as any, "detectConflicts").mockResolvedValue([
        {
          type: "modified-since-backup",
          resolution: "overwrite",
        },
      ]);

      const restoreResults: FileRestoreResult[] = [
        { filePath: filesToRestore[0], status: "restored" },
      ];
      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      const results = await rollbackManager.restoreSpecificFiles(
        backupId,
        filesToRestore,
        { force: true },
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("restored");
    });

    it("should handle no matching files", async () => {
      const backupId = "no-match-test";
      const metadata = generateBackupMetadata({ id: backupId });

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      await expect(
        rollbackManager.restoreSpecificFiles(backupId, [
          "non-existent-file.ts",
        ]),
      ).rejects.toThrow(BackupError);
    });

    it("should create backup before selective restore", async () => {
      const backupId = "selective-backup-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const filesToRestore = [metadata.files[0].originalPath];

      // Setup existing file
      mockFsUtils.setFile(filesToRestore[0], "Existing content");

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);
      mockBackupManager.createManualBackup.mockResolvedValue(
        "selective-pre-backup",
      );

      const restoreResults: FileRestoreResult[] = [
        { filePath: filesToRestore[0], status: "restored" },
      ];
      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      await rollbackManager.restoreSpecificFiles(backupId, filesToRestore, {
        createBackup: true,
      });

      expect(mockBackupManager.createManualBackup).toHaveBeenCalled();
    });
  });

  describe("Interactive Rollback", () => {
    it("should perform interactive rollback", async () => {
      const backupId = "interactive-test";
      const metadata = generateBackupMetadata({ id: backupId });

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Mock file selection (return all files)
      jest
        .spyOn(rollbackManager as any, "promptFileSelection")
        .mockResolvedValue(metadata.files);

      // Mock conflict resolution
      jest
        .spyOn(rollbackManager as any, "resolveConflictsInteractively")
        .mockResolvedValue([]);

      const restoreResults: FileRestoreResult[] = metadata.files.map(
        (file) => ({
          filePath: file.originalPath,
          status: "restored",
        }),
      );
      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      const result = await rollbackManager.performInteractiveRollback(backupId);

      expect(result.status).toBe("success");
      expect(result.context.mode).toBe("interactive");
      expect(result.context.createPreRollbackBackup).toBe(true);
    });

    it("should handle no files selected in interactive mode", async () => {
      const backupId = "no-selection-test";
      const metadata = generateBackupMetadata({ id: backupId });

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Mock no file selection
      jest
        .spyOn(rollbackManager as any, "promptFileSelection")
        .mockResolvedValue([]);

      await expect(
        rollbackManager.performInteractiveRollback(backupId),
      ).rejects.toThrow(BackupError);
    });

    it("should handle interactive conflict resolution", async () => {
      const backupId = "interactive-conflicts-test";
      const metadata = generateBackupMetadata({ id: backupId });

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Mock file selection
      jest
        .spyOn(rollbackManager as any, "promptFileSelection")
        .mockResolvedValue(metadata.files);

      // Mock conflicts
      const conflicts: FileConflict[] = [
        {
          currentChecksum: "current-checksum",
          backupChecksum: metadata.files[0].checksum,
          expectedChecksum: metadata.files[0].checksum,
          type: "modified-since-backup",
          resolution: "overwrite",
        },
      ];
      jest
        .spyOn(rollbackManager as any, "detectConflicts")
        .mockResolvedValue(conflicts);
      jest
        .spyOn(rollbackManager as any, "resolveConflictsInteractively")
        .mockResolvedValue(conflicts);

      const restoreResults: FileRestoreResult[] = metadata.files.map(
        (file) => ({
          filePath: file.originalPath,
          status: "restored",
        }),
      );
      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      const result = await rollbackManager.performInteractiveRollback(backupId);

      expect(result.status).toBe("success");
    });
  });

  describe("Rollback Preview", () => {
    it("should provide rollback preview without restoration", async () => {
      const backupId = "preview-test";
      const metadata = generateBackupMetadata({ id: backupId });

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Mock conflict detection
      const conflicts: FileConflict[] = [
        {
          currentChecksum: "current-checksum",
          backupChecksum: metadata.files[0].checksum,
          expectedChecksum: metadata.files[0].checksum,
          type: "modified-since-backup",
          resolution: "overwrite",
        },
      ];
      jest
        .spyOn(rollbackManager as any, "detectConflicts")
        .mockResolvedValue(conflicts);

      const preview = await rollbackManager.getRollbackPreview(backupId);

      expect(preview.backup).toBe(metadata);
      expect(preview.filesToRestore).toEqual(metadata.files);
      expect(preview.conflicts).toEqual(conflicts);
      expect(preview.summary.totalFiles).toBe(metadata.files.length);
      expect(preview.summary.conflictedFiles).toBe(1);
      expect(preview.summary.safeToRestore).toBe(metadata.files.length - 1);
    });

    it("should provide selective rollback preview", async () => {
      const backupId = "selective-preview-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const selectedFiles = [
        metadata.files[0].originalPath,
        metadata.files[1].originalPath,
      ];

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);
      jest
        .spyOn(rollbackManager as any, "detectConflicts")
        .mockResolvedValue([]);

      const preview = await rollbackManager.getRollbackPreview(
        backupId,
        selectedFiles,
      );

      expect(preview.filesToRestore).toHaveLength(2);
      expect(preview.summary.totalFiles).toBe(2);
      expect(preview.summary.conflictedFiles).toBe(0);
      expect(preview.summary.safeToRestore).toBe(2);
    });

    it("should handle preview for non-existent backup", async () => {
      mockMetadataManager.getMetadata.mockResolvedValue(null);

      await expect(
        rollbackManager.getRollbackPreview("non-existent-backup"),
      ).rejects.toThrow(BackupError);
    });
  });

  describe("Conflict Detection and Resolution", () => {
    it("should detect file modifications since backup", async () => {
      const files: BackedUpFile[] = [
        {
          originalPath: path.join(tempDir, "modified.ts"),
          relativePath: "modified.ts",
          encodedPath: "bW9kaWZpZWQudHM=",
          size: 100,
          lastModified: new Date(),
          checksum: "original-checksum",
          status: "backed-up",
        },
      ];

      // Setup current file with different content
      mockFsUtils.setFile(files[0].originalPath, "Modified content");

      const conflicts = await (rollbackManager as any).detectConflicts(files);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("modified-since-backup");
    });

    it("should detect missing current files", async () => {
      const files: BackedUpFile[] = [
        {
          originalPath: path.join(tempDir, "missing.ts"),
          relativePath: "missing.ts",
          encodedPath: "bWlzc2luZy50cw==",
          size: 100,
          lastModified: new Date(),
          checksum: "checksum",
          status: "backed-up",
        },
      ];

      // File doesn't exist (no conflict - safe to restore)
      const conflicts = await (rollbackManager as any).detectConflicts(files);

      expect(conflicts).toHaveLength(0);
    });

    it("should handle file read errors during conflict detection", async () => {
      const files: BackedUpFile[] = [
        {
          originalPath: path.join(tempDir, "error.ts"),
          relativePath: "error.ts",
          encodedPath: "ZXJyb3IudHM=",
          size: 100,
          lastModified: new Date(),
          checksum: "checksum",
          status: "backed-up",
        },
      ];

      mockFsUtils.setFile(files[0].originalPath, "Content");

      // Simulate read error
      errorSimulator.setErrorCondition(
        "readFile",
        new Error("EACCES: permission denied"),
      );

      const conflicts = await (rollbackManager as any).detectConflicts(files);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("missing-current");
    });

    it("should not detect conflicts for unchanged files", async () => {
      const content = "Unchanged content";
      const checksum = require("crypto")
        .createHash("sha256")
        .update(content, "utf8")
        .digest("hex");

      const files: BackedUpFile[] = [
        {
          originalPath: path.join(tempDir, "unchanged.ts"),
          relativePath: "unchanged.ts",
          encodedPath: "dW5jaGFuZ2VkLnRz",
          size: Buffer.byteLength(content, "utf8"),
          lastModified: new Date(),
          checksum,
          status: "backed-up",
        },
      ];

      mockFsUtils.setFile(files[0].originalPath, content);

      const conflicts = await (rollbackManager as any).detectConflicts(files);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe("Pre-Rollback Backup Creation", () => {
    it("should create backup of existing files before rollback", async () => {
      const files: BackedUpFile[] = [
        {
          originalPath: path.join(tempDir, "file1.ts"),
          relativePath: "file1.ts",
          encodedPath: "ZmlsZTEudHM=",
          size: 100,
          lastModified: new Date(),
          checksum: "checksum1",
          status: "backed-up",
        },
        {
          originalPath: path.join(tempDir, "file2.ts"),
          relativePath: "file2.ts",
          encodedPath: "ZmlsZTIudHM=",
          size: 100,
          lastModified: new Date(),
          checksum: "checksum2",
          status: "backed-up",
        },
      ];

      // Setup existing files
      mockFsUtils.setFile(files[0].originalPath, "Existing content 1");
      mockFsUtils.setFile(files[1].originalPath, "Existing content 2");

      const context: RollbackContext = {
        backupId: "original-backup",
        filesToRestore: [],
        createPreRollbackBackup: true,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockBackupManager.createManualBackup.mockResolvedValue(
        "pre-rollback-backup-id",
      );

      const backupId = await (rollbackManager as any).createPreRollbackBackup(
        files,
        context,
      );

      expect(backupId).toBe("pre-rollback-backup-id");
      expect(mockBackupManager.createManualBackup).toHaveBeenCalledWith(
        [files[0].originalPath, files[1].originalPath],
        expect.stringContaining("pre-rollback"),
        expect.objectContaining({
          description: expect.stringContaining("Pre-rollback backup"),
          tags: expect.arrayContaining(["pre-rollback", "auto-generated"]),
        }),
      );
    });

    it("should handle no existing files for pre-rollback backup", async () => {
      const files: BackedUpFile[] = [
        {
          originalPath: path.join(tempDir, "missing.ts"),
          relativePath: "missing.ts",
          encodedPath: "bWlzc2luZy50cw==",
          size: 100,
          lastModified: new Date(),
          checksum: "checksum",
          status: "backed-up",
        },
      ];

      const context: RollbackContext = {
        backupId: "original-backup",
        filesToRestore: [],
        createPreRollbackBackup: true,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      await expect(
        (rollbackManager as any).createPreRollbackBackup(files, context),
      ).rejects.toThrow(BackupError);
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle metadata loading errors", async () => {
      const context: RollbackContext = {
        backupId: "error-backup",
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockRejectedValue(
        new Error("Metadata corrupted"),
      );

      await expect(rollbackManager.performRollback(context)).rejects.toThrow(
        BackupError,
      );
    });

    it("should handle snapshot restoration errors", async () => {
      const backupId = "snapshot-error-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);
      mockSnapshotManager.restoreFiles.mockRejectedValue(
        new Error("Restore failed"),
      );

      // Should catch and convert error
      const result = await rollbackManager.performRollback(context);

      expect(result.status).toBe("failed");
    });

    it("should handle pre-rollback backup creation failures", async () => {
      const backupId = "pre-backup-error-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: true,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      // Setup existing files
      metadata.files.forEach((file) => {
        mockFsUtils.setFile(file.originalPath, "Current content");
      });

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);
      mockBackupManager.createManualBackup.mockRejectedValue(
        new Error("Backup creation failed"),
      );

      await expect(rollbackManager.performRollback(context)).rejects.toThrow();
    });

    it("should handle conflicts in non-interactive mode", async () => {
      const backupId = "conflict-error-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Mock conflicts
      jest.spyOn(rollbackManager as any, "detectConflicts").mockResolvedValue([
        {
          type: "modified-since-backup",
          resolution: "overwrite",
        },
      ]);

      await expect(rollbackManager.performRollback(context)).rejects.toThrow(
        RollbackConflictError,
      );
    });

    it("should handle unexpected errors gracefully", async () => {
      const backupId = "unexpected-error-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Mock unexpected error
      jest
        .spyOn(rollbackManager as any, "detectConflicts")
        .mockImplementation(() => {
          throw new Error("Unexpected system error");
        });

      await expect(rollbackManager.performRollback(context)).rejects.toThrow(
        BackupError,
      );
    });
  });

  describe("Performance and Concurrency", () => {
    it("should handle large rollback operations efficiently", async () => {
      const monitor = new PerformanceMonitor();
      monitor.start();

      const backupId = "large-rollback-test";
      const fileCount = 1000;
      const largeFiles = generateBackedUpFiles(fileCount);
      const metadata = generateBackupMetadata({
        id: backupId,
        files: largeFiles,
      });

      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      const restoreResults: FileRestoreResult[] = largeFiles.map((file) => ({
        filePath: file.originalPath,
        status: "restored",
      }));
      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      const result = await rollbackManager.performRollback(context);
      const performance = monitor.stop();

      expect(result.status).toBe("success");
      expect(result.summary.restoredFiles).toBe(fileCount);

      // Performance assertions
      expect(performance.durationMs).toBeLessThan(30000); // Should complete within 30 seconds
      expect(performance.memoryDelta.heapUsed).toBeLessThan(200 * 1024 * 1024); // Less than 200MB additional memory
    });

    it("should handle concurrent rollback operations", async () => {
      const backupIds = ["concurrent-1", "concurrent-2", "concurrent-3"];
      const rollbackPromises = backupIds.map(async (backupId, index) => {
        const metadata = generateBackupMetadata({
          id: backupId,
          files: generateBackedUpFiles(10),
        });

        const context: RollbackContext = {
          backupId,
          filesToRestore: [],
          createPreRollbackBackup: false,
          mode: "full",
          verifyIntegrity: false,
          user: `test-user-${index}`,
          timestamp: new Date(),
        };

        mockMetadataManager.getMetadata.mockResolvedValue(metadata);

        const restoreResults: FileRestoreResult[] = metadata.files.map(
          (file) => ({
            filePath: file.originalPath,
            status: "restored",
          }),
        );
        mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

        return rollbackManager.performRollback(context);
      });

      const results = await Promise.all(rollbackPromises);

      expect(results).toHaveLength(backupIds.length);
      results.forEach((result, index) => {
        expect(result.status).toBe("success");
        expect(result.context.backupId).toBe(backupIds[index]);
      });
    });

    it("should handle mixed success/failure scenarios efficiently", async () => {
      const backupId = "mixed-scenario-test";
      const files = generateBackedUpFiles(100);
      const metadata = generateBackupMetadata({
        id: backupId,
        files,
      });

      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Mock mixed results (70% success, 20% failed, 10% conflicts)
      const restoreResults: FileRestoreResult[] = files.map((file, index) => {
        const rand = index % 10;
        if (rand < 7) {
          return { filePath: file.originalPath, status: "restored" };
        } else if (rand < 9) {
          return {
            filePath: file.originalPath,
            status: "failed",
            error: "Restore failed",
          };
        } else {
          return {
            filePath: file.originalPath,
            status: "conflict",
            conflict: {
              type: "modified-since-backup",
              resolution: "overwrite",
            } as FileConflict,
          };
        }
      });

      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      const result = await rollbackManager.performRollback(context);

      expect(result.status).toBe("partial");
      expect(result.summary.restoredFiles).toBe(70);
      expect(result.summary.failedFiles).toBe(20);
      expect(result.summary.conflictedFiles).toBe(10);
    });
  });

  describe("Edge Cases and Special Scenarios", () => {
    it("should handle empty backup rollback", async () => {
      const backupId = "empty-backup-test";
      const metadata = generateBackupMetadata({
        id: backupId,
        files: [],
      });

      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);
      mockSnapshotManager.restoreFiles.mockResolvedValue([]);

      const result = await rollbackManager.performRollback(context);

      expect(result.status).toBe("success");
      expect(result.summary.totalFiles).toBe(0);
      expect(result.summary.restoredFiles).toBe(0);
    });

    it("should handle rollback with very long file paths", async () => {
      const longPath = "very/".repeat(100) + "long/path/to/file.ts";
      const files: BackedUpFile[] = [
        {
          originalPath: longPath,
          relativePath: longPath,
          encodedPath: Buffer.from(longPath).toString("base64"),
          size: 1000,
          lastModified: new Date(),
          checksum: "long-path-checksum",
          status: "backed-up",
        },
      ];

      const metadata = generateBackupMetadata({
        id: "long-path-test",
        files,
      });

      const context: RollbackContext = {
        backupId: "long-path-test",
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      const restoreResults: FileRestoreResult[] = [
        { filePath: longPath, status: "restored" },
      ];
      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      const result = await rollbackManager.performRollback(context);

      expect(result.status).toBe("success");
      expect(result.files[0].filePath).toBe(longPath);
    });

    it("should handle rollback with unicode file paths", async () => {
      const unicodePath = path.join(tempDir, "测试文件-émojis🚀.ts");
      const files: BackedUpFile[] = [
        {
          originalPath: unicodePath,
          relativePath: "测试文件-émojis🚀.ts",
          encodedPath: Buffer.from("测试文件-émojis🚀.ts").toString("base64"),
          size: 1000,
          lastModified: new Date(),
          checksum: "unicode-checksum",
          status: "backed-up",
        },
      ];

      const metadata = generateBackupMetadata({
        id: "unicode-test",
        files,
      });

      const context: RollbackContext = {
        backupId: "unicode-test",
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      const restoreResults: FileRestoreResult[] = [
        { filePath: unicodePath, status: "restored" },
      ];
      mockSnapshotManager.restoreFiles.mockResolvedValue(restoreResults);

      const result = await rollbackManager.performRollback(context);

      expect(result.status).toBe("success");
      expect(result.files[0].filePath).toBe(unicodePath);
    });

    it("should handle rollback timing and duration tracking", async () => {
      const backupId = "timing-test";
      const metadata = generateBackupMetadata({ id: backupId });
      const context: RollbackContext = {
        backupId,
        filesToRestore: [],
        createPreRollbackBackup: false,
        mode: "full",
        verifyIntegrity: false,
        user: "test-user",
        timestamp: new Date(),
      };

      mockMetadataManager.getMetadata.mockResolvedValue(metadata);

      // Add artificial delay
      mockSnapshotManager.restoreFiles.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return metadata.files.map((file) => ({
          filePath: file.originalPath,
          status: "restored" as const,
        }));
      });

      const startTime = Date.now();
      const result = await rollbackManager.performRollback(context);
      const endTime = Date.now();

      expect(result.durationMs).toBeGreaterThanOrEqual(100);
      expect(result.durationMs).toBeLessThanOrEqual(endTime - startTime + 10); // Allow small margin
      expect(result.completedAt).toBeInstanceOf(Date);
    });
  });
});

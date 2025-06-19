/**
 * Integration tests for complete backup workflows
 * Tests end-to-end scenarios combining multiple backup system components
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
jest.mock("@inquirer/prompts");

import { BackupManager } from "../../backup-manager";
import { SnapshotManager } from "../../snapshot-manager";
import { MetadataManager } from "../../metadata-manager";
import { IntegrityManager } from "../../integrity-manager";
import { RollbackManager } from "../../rollback-manager";
import { BackupCLI } from "../../cli/backup-commands";
import {
  BackupId,
  BackupMetadata,
  BackupConfig,
  BackupMode,
  RestoreContext,
  RollbackContext,
  VerificationResult,
} from "../../types";
import {
  testEnv,
  errorSimulator,
  PerformanceMonitor,
} from "../helpers/jest-setup";
import {
  generateTestProjectStructure,
  generateLargeTestData,
} from "../__fixtures__/test-data";
import { mockFsUtils } from "../__mocks__/fs";
import { mockInquirer } from "../__mocks__/inquirer";
import { mockGit } from "../__mocks__/git";

describe("Backup System Integration Tests", () => {
  let backupManager: BackupManager;
  let snapshotManager: SnapshotManager;
  let metadataManager: MetadataManager;
  let integrityManager: IntegrityManager;
  let rollbackManager: RollbackManager;
  let backupCLI: BackupCLI;
  let tempDir: string;
  let backupRoot: string;
  let projectRoot: string;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    mockFsUtils.reset();
    errorSimulator.clear();
    mockInquirer.reset();
    mockGit.reset();

    // Create temporary directories
    tempDir = await testEnv.createTempDir("backup-integration-test");
    backupRoot = path.join(tempDir, ".migr8-backups");
    projectRoot = path.join(tempDir, "project");

    // Set up test project structure
    const projectStructure = generateTestProjectStructure();
    Object.entries(projectStructure.files).forEach(([filePath, content]) => {
      const fullPath = path.join(projectRoot, filePath);
      mockFsUtils.setFile(fullPath, content);
    });

    // Initialize backup system components
    const config: BackupConfig = {
      backupRoot,
      maxBackups: 50,
      maxAgeDays: 30,
      maxTotalSize: 1024 * 1024 * 1024, // 1GB
      autoCleanup: true,
      gitIntegration: true,
      verifyAfterBackup: true,
      concurrency: 5,
      showProgress: false,
      compressionLevel: 6,
    };

    metadataManager = new MetadataManager(backupRoot);
    snapshotManager = new SnapshotManager(backupRoot, config);
    integrityManager = new IntegrityManager(snapshotManager, metadataManager);
    backupManager = new BackupManager(
      config,
      snapshotManager,
      metadataManager,
      integrityManager,
    );
    rollbackManager = new RollbackManager(
      snapshotManager,
      metadataManager,
      backupManager,
    );
    backupCLI = new BackupCLI();

    // Replace CLI's backup manager with our test instance
    (backupCLI as any).backupManager = backupManager;
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  describe("Complete Backup-Restore-Verify Workflow", () => {
    it("should complete full backup and restore workflow successfully", async () => {
      const perfMonitor = new PerformanceMonitor();
      perfMonitor.start("full-workflow");

      // Step 1: Create a backup
      const filesToBackup = [
        path.join(projectRoot, "src/components/Button.tsx"),
        path.join(projectRoot, "src/components/Card.tsx"),
        path.join(projectRoot, "src/utils/helpers.ts"),
      ];

      const backupId = await backupManager.createManualBackup(
        filesToBackup,
        "integration-test-backup",
        {
          name: "integration-test-backup",
          description: "Test backup for integration workflow",
          tags: ["integration", "test"],
          mode: "interactive" as BackupMode,
          user: "test-user",
        },
      );

      expect(backupId).toBeValidBackupId();

      // Step 2: Verify the backup was created correctly
      const backups = await backupManager.listBackups();
      expect(backups).toHaveLength(1);
      expect(backups[0].id).toBe(backupId);
      expect(backups[0].name).toBe("integration-test-backup");

      // Step 3: Get backup details
      const backupInfo = await backupManager.getBackupInfo(backupId);
      expect(backupInfo).toBeDefined();
      expect(backupInfo.files).toHaveLength(3);
      expect(backupInfo.stats.totalFiles).toBe(3);
      expect(backupInfo.stats.totalSize).toBeGreaterThan(0);

      // Step 4: Verify backup integrity
      const verificationResult = await backupManager.verifyBackup(backupId);
      expect(verificationResult.valid).toBe(true);
      expect(verificationResult.summary.totalFiles).toBe(3);
      expect(verificationResult.summary.validFiles).toBe(3);
      expect(verificationResult.summary.invalidFiles).toBe(0);

      // Step 5: Modify original files
      const buttonPath = path.join(projectRoot, "src/components/Button.tsx");
      const originalButtonContent = mockFsUtils.getFile(buttonPath);
      const modifiedButtonContent =
        originalButtonContent + "\n// Modified content";
      mockFsUtils.setFile(buttonPath, modifiedButtonContent);

      // Step 6: Restore from backup
      const restoreContext: RestoreContext = {
        backupId,
        targetDirectory: projectRoot,
        filesToRestore: filesToBackup,
        conflictResolution: "overwrite",
        createPreRestoreBackup: true,
        verifyIntegrity: true,
        user: "test-user",
        timestamp: new Date(),
      };

      const restoreResult = await snapshotManager.restoreFiles(restoreContext);

      expect(
        restoreResult.every((result) => result.status === "restored"),
      ).toBe(true);
      expect(restoreResult).toHaveLength(3);

      // Step 7: Verify restoration
      const restoredButtonContent = mockFsUtils.getFile(buttonPath);
      expect(restoredButtonContent).toBe(originalButtonContent);
      expect(restoredButtonContent).not.toBe(modifiedButtonContent);

      // Step 8: Verify that pre-restore backup was created
      const backupsAfterRestore = await backupManager.listBackups();
      expect(backupsAfterRestore.length).toBeGreaterThan(1);

      const preRestoreBackup = backupsAfterRestore.find(
        (b) =>
          b.tags?.includes("pre-restore") || b.name.includes("pre-restore"),
      );
      expect(preRestoreBackup).toBeDefined();

      perfMonitor.end("full-workflow");
      expect(perfMonitor.getDuration("full-workflow")).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it("should handle large file backup and restore workflow", async () => {
      const perfMonitor = new PerformanceMonitor();
      perfMonitor.start("large-file-workflow");

      // Create large test files
      const largeFiles = generateLargeTestData(5, 1024 * 1024); // 5 files, 1MB each

      const filePaths: string[] = [];
      Object.entries(largeFiles).forEach(([fileName, content]) => {
        const filePath = path.join(projectRoot, fileName);
        mockFsUtils.setFile(filePath, content);
        filePaths.push(filePath);
      });

      // Create backup with large files
      const backupId = await backupManager.createManualBackup(
        filePaths,
        "large-file-backup",
        {
          name: "large-file-backup",
          description: "Test backup with large files",
          tags: ["large", "performance"],
          mode: "yolo" as BackupMode,
          user: "test-user",
        },
      );

      expect(backupId).toBeValidBackupId();

      // Verify backup info reflects large size
      const backupInfo = await backupManager.getBackupInfo(backupId);
      expect(backupInfo.stats.totalSize).toBeGreaterThan(5 * 1024 * 1024); // At least 5MB
      expect(backupInfo.files).toHaveLength(5);

      // Verify integrity of large backup
      const verificationResult = await backupManager.verifyBackup(backupId);
      expect(verificationResult.valid).toBe(true);

      // Restore large files
      const restoreContext: RestoreContext = {
        backupId,
        targetDirectory: projectRoot,
        filesToRestore: filePaths,
        conflictResolution: "overwrite",
        createPreRestoreBackup: false,
        verifyIntegrity: true,
        user: "test-user",
        timestamp: new Date(),
      };

      const restoreResult = await snapshotManager.restoreFiles(restoreContext);
      expect(
        restoreResult.every((result) => result.status === "restored"),
      ).toBe(true);

      perfMonitor.end("large-file-workflow");
      expect(perfMonitor.getDuration("large-file-workflow")).toBeLessThan(
        30000,
      ); // Should complete within 30 seconds
    });
  });

  describe("Rollback Workflow Integration", () => {
    it("should complete backup-modify-rollback workflow successfully", async () => {
      const filesToBackup = [
        path.join(projectRoot, "src/components/Button.tsx"),
        path.join(projectRoot, "src/components/Card.tsx"),
      ];

      // Step 1: Create initial backup
      const initialBackupId = await backupManager.createManualBackup(
        filesToBackup,
        "pre-modification-backup",
        {
          name: "pre-modification-backup",
          description: "Backup before modifications",
          tags: ["pre-modify"],
          mode: "interactive" as BackupMode,
          user: "test-user",
        },
      );

      // Step 2: Modify files significantly
      const buttonPath = path.join(projectRoot, "src/components/Button.tsx");
      const cardPath = path.join(projectRoot, "src/components/Card.tsx");

      const originalButtonContent = mockFsUtils.getFile(buttonPath);
      const originalCardContent = mockFsUtils.getFile(cardPath);

      const modifiedButtonContent = originalButtonContent.replace(
        "Button",
        "ModifiedButton",
      );
      const modifiedCardContent = originalCardContent.replace(
        "Card",
        "ModifiedCard",
      );

      mockFsUtils.setFile(buttonPath, modifiedButtonContent);
      mockFsUtils.setFile(cardPath, modifiedCardContent);

      // Step 3: Create another backup after modifications
      const postModifyBackupId = await backupManager.createManualBackup(
        filesToBackup,
        "post-modification-backup",
        {
          name: "post-modification-backup",
          description: "Backup after modifications",
          tags: ["post-modify"],
          mode: "interactive" as BackupMode,
          user: "test-user",
        },
      );

      // Step 4: Perform rollback to initial state
      const rollbackContext: RollbackContext = {
        backupId: initialBackupId,
        filesToRestore: filesToBackup,
        createPreRollbackBackup: true,
        mode: "selective",
        verifyIntegrity: true,
        user: "test-user",
        timestamp: new Date(),
      };

      const rollbackResult =
        await rollbackManager.performRollback(rollbackContext);

      expect(rollbackResult.status).toBe("success");
      expect(rollbackResult.summary.restoredFiles).toBe(2);
      expect(rollbackResult.summary.failedFiles).toBe(0);
      expect(rollbackResult.preRollbackBackupId).toBeDefined();

      // Step 5: Verify rollback worked
      const rolledBackButtonContent = mockFsUtils.getFile(buttonPath);
      const rolledBackCardContent = mockFsUtils.getFile(cardPath);

      expect(rolledBackButtonContent).toBe(originalButtonContent);
      expect(rolledBackCardContent).toBe(originalCardContent);
      expect(rolledBackButtonContent).not.toContain("ModifiedButton");
      expect(rolledBackCardContent).not.toContain("ModifiedCard");

      // Step 6: Verify pre-rollback backup was created
      const allBackups = await backupManager.listBackups();
      expect(allBackups.length).toBeGreaterThanOrEqual(3); // initial + post-modify + pre-rollback

      const preRollbackBackup = allBackups.find(
        (b) => b.id === rollbackResult.preRollbackBackupId,
      );
      expect(preRollbackBackup).toBeDefined();
      expect(preRollbackBackup!.tags).toContain("pre-rollback");
    });
  });

  describe("CLI Integration Workflows", () => {
    it("should complete CLI-driven backup workflow", async () => {
      // Mock CLI interactions for creating a backup
      mockInquirer.queueResponses([
        { type: "select", response: "create" },
        { type: "select", response: "current" },
        { type: "input", response: "cli-integration-backup" },
        { type: "input", response: "CLI integration test backup" },
        { type: "confirm", response: true }, // Add tags
        { type: "input", response: "cli" },
        { type: "confirm", response: true }, // Add another tag
        { type: "input", response: "integration" },
        { type: "confirm", response: false }, // No more tags
      ]);

      // Set current working directory to project root
      process.chdir(projectRoot);

      await backupCLI.handleBackupCommand({});

      // Verify backup was created through CLI
      const backups = await backupManager.listBackups();
      expect(backups).toHaveLength(1);
      expect(backups[0].name).toBe("cli-integration-backup");
      expect(backups[0].tags).toContain("cli");
      expect(backups[0].tags).toContain("integration");
    });

    it("should complete CLI-driven list and verify workflow", async () => {
      // Create a backup first
      const backupId = await backupManager.createManualBackup(
        [path.join(projectRoot, "src/components/Button.tsx")],
        "cli-verify-test",
        {
          name: "cli-verify-test",
          description: "Test for CLI verification",
          tags: ["cli-test"],
          mode: "interactive" as BackupMode,
          user: "test-user",
        },
      );

      // Mock CLI interactions for listing backups
      mockInquirer.queueResponses([
        { type: "select", response: "list" },
        { type: "confirm", response: false }, // Don't view details
      ]);

      await backupCLI.handleBackupCommand({});

      // Mock CLI interactions for verifying backup
      mockInquirer.queueResponses([
        { type: "select", response: "verify" },
        { type: "select", response: backupId },
      ]);

      await backupCLI.handleBackupCommand({});

      // Both operations should complete without errors
      expect(true).toBe(true); // If we get here, both operations succeeded
    });
  });

  describe("Error Recovery Workflows", () => {
    it("should handle backup corruption and recovery workflow", async () => {
      const filesToBackup = [
        path.join(projectRoot, "src/components/Button.tsx"),
      ];

      // Create initial backup
      const backupId = await backupManager.createManualBackup(
        filesToBackup,
        "corruption-test-backup",
        {
          name: "corruption-test-backup",
          description: "Test backup for corruption recovery",
          tags: ["corruption-test"],
          mode: "interactive" as BackupMode,
          user: "test-user",
        },
      );

      // Verify backup is initially valid
      let verificationResult = await backupManager.verifyBackup(backupId);
      expect(verificationResult.valid).toBe(true);

      // Simulate backup corruption by modifying backup files
      const backupInfo = await backupManager.getBackupInfo(backupId);
      const backupFile = backupInfo.files[0];
      const backupFilePath = path.join(
        backupRoot,
        backupId,
        "files",
        backupFile.backupPath,
      );

      // Corrupt the backup file
      mockFsUtils.setFile(backupFilePath, "CORRUPTED CONTENT");

      // Verify corruption is detected
      verificationResult = await backupManager.verifyBackup(backupId);
      expect(verificationResult.valid).toBe(false);
      expect(verificationResult.summary.invalidFiles).toBeGreaterThan(0);

      // Attempt restoration (should handle corruption gracefully)
      const restoreContext: RestoreContext = {
        backupId,
        targetDirectory: projectRoot,
        filesToRestore: filesToBackup,
        conflictResolution: "skip",
        createPreRestoreBackup: false,
        verifyIntegrity: true,
        user: "test-user",
        timestamp: new Date(),
      };

      const restoreResult = await snapshotManager.restoreFiles(restoreContext);

      // Should handle corruption gracefully
      expect(restoreResult.some((result) => result.status === "error")).toBe(
        true,
      );
      expect(
        restoreResult.some(
          (result) =>
            result.error?.message.includes("checksum") ||
            result.error?.message.includes("corruption"),
        ),
      ).toBe(true);
    });

    it("should handle concurrent backup operations workflow", async () => {
      const perfMonitor = new PerformanceMonitor();
      perfMonitor.start("concurrent-operations");

      const filesToBackup1 = [
        path.join(projectRoot, "src/components/Button.tsx"),
      ];
      const filesToBackup2 = [
        path.join(projectRoot, "src/components/Card.tsx"),
      ];
      const filesToBackup3 = [path.join(projectRoot, "src/utils/helpers.ts")];

      // Start multiple backup operations concurrently
      const backupPromises = [
        backupManager.createManualBackup(
          filesToBackup1,
          "concurrent-backup-1",
          {
            name: "concurrent-backup-1",
            description: "First concurrent backup",
            tags: ["concurrent", "test1"],
            mode: "yolo" as BackupMode,
            user: "test-user",
          },
        ),
        backupManager.createManualBackup(
          filesToBackup2,
          "concurrent-backup-2",
          {
            name: "concurrent-backup-2",
            description: "Second concurrent backup",
            tags: ["concurrent", "test2"],
            mode: "yolo" as BackupMode,
            user: "test-user",
          },
        ),
        backupManager.createManualBackup(
          filesToBackup3,
          "concurrent-backup-3",
          {
            name: "concurrent-backup-3",
            description: "Third concurrent backup",
            tags: ["concurrent", "test3"],
            mode: "yolo" as BackupMode,
            user: "test-user",
          },
        ),
      ];

      // Wait for all backups to complete
      const backupIds = await Promise.all(backupPromises);

      // Verify all backups were created successfully
      expect(backupIds).toHaveLength(3);
      backupIds.forEach((id) => expect(id).toBeValidBackupId());

      // Verify all backups exist in the system
      const allBackups = await backupManager.listBackups();
      expect(allBackups).toHaveLength(3);

      // Verify each backup individually
      const verificationPromises = backupIds.map((id) =>
        backupManager.verifyBackup(id),
      );
      const verificationResults = await Promise.all(verificationPromises);

      verificationResults.forEach((result) => {
        expect(result.valid).toBe(true);
        expect(result.summary.invalidFiles).toBe(0);
      });

      perfMonitor.end("concurrent-operations");
      expect(perfMonitor.getDuration("concurrent-operations")).toBeLessThan(
        15000,
      ); // Should complete within 15 seconds
    });
  });

  describe("Performance and Scale Workflows", () => {
    it("should handle workflow with many files efficiently", async () => {
      const perfMonitor = new PerformanceMonitor();
      perfMonitor.start("many-files-workflow");

      // Create many test files
      const manyFiles: string[] = [];
      for (let i = 0; i < 100; i++) {
        const fileName = `test-file-${i}.ts`;
        const filePath = path.join(projectRoot, "src", "generated", fileName);
        const content = `// Generated test file ${i}\nexport const value${i} = ${i};\n`;

        mockFsUtils.setFile(filePath, content);
        manyFiles.push(filePath);
      }

      // Create backup with many files
      const backupId = await backupManager.createManualBackup(
        manyFiles,
        "many-files-backup",
        {
          name: "many-files-backup",
          description: "Backup with many files for performance testing",
          tags: ["performance", "many-files"],
          mode: "yolo" as BackupMode,
          user: "test-user",
        },
      );

      expect(backupId).toBeValidBackupId();

      // Verify backup with many files
      const verificationResult = await backupManager.verifyBackup(backupId);
      expect(verificationResult.valid).toBe(true);
      expect(verificationResult.summary.totalFiles).toBe(100);

      // Modify some files
      const filesToModify = manyFiles.slice(0, 10);
      filesToModify.forEach((filePath) => {
        const originalContent = mockFsUtils.getFile(filePath);
        mockFsUtils.setFile(filePath, originalContent + "\n// Modified");
      });

      // Restore subset of files
      const restoreContext: RestoreContext = {
        backupId,
        targetDirectory: projectRoot,
        filesToRestore: filesToModify,
        conflictResolution: "overwrite",
        createPreRestoreBackup: false,
        verifyIntegrity: false, // Skip verification for performance
        user: "test-user",
        timestamp: new Date(),
      };

      const restoreResult = await snapshotManager.restoreFiles(restoreContext);
      expect(restoreResult).toHaveLength(10);
      expect(
        restoreResult.every((result) => result.status === "restored"),
      ).toBe(true);

      perfMonitor.end("many-files-workflow");
      expect(perfMonitor.getDuration("many-files-workflow")).toBeLessThan(
        20000,
      ); // Should complete within 20 seconds
    });
  });

  describe("Cleanup and Maintenance Workflows", () => {
    it("should complete backup cleanup workflow", async () => {
      // Create multiple backups with different ages
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const filesToBackup = [
        path.join(projectRoot, "src/components/Button.tsx"),
      ];

      // Create old backup (should be eligible for cleanup)
      const oldBackupId = await backupManager.createManualBackup(
        filesToBackup,
        "old-backup",
        {
          name: "old-backup",
          description: "Old backup for cleanup testing",
          tags: ["auto"],
          mode: "yolo" as BackupMode,
          user: "test-user",
        },
      );

      // Create recent backup (should be kept)
      const recentBackupId = await backupManager.createManualBackup(
        filesToBackup,
        "recent-backup",
        {
          name: "recent-backup",
          description: "Recent backup that should be kept",
          tags: ["auto"],
          mode: "yolo" as BackupMode,
          user: "test-user",
        },
      );

      // Manually set backup dates by updating metadata
      const oldBackupInfo = await backupManager.getBackupInfo(oldBackupId);
      const recentBackupInfo =
        await backupManager.getBackupInfo(recentBackupId);

      // Mock the metadata to show old dates
      jest
        .spyOn(metadataManager, "getMetadata")
        .mockResolvedValueOnce({ ...oldBackupInfo, createdAt: oldDate })
        .mockResolvedValueOnce({ ...recentBackupInfo, createdAt: recentDate });

      // Get initial backup count
      const initialBackups = await backupManager.listBackups();
      expect(initialBackups).toHaveLength(2);

      // Perform cleanup
      const config = backupManager.getConfig();
      const oldBackups = await backupManager.listBackups();
      const eligibleBackups = oldBackups.filter((backup) => {
        const age = Date.now() - backup.createdAt.getTime();
        const maxAge = config.maxAgeDays * 24 * 60 * 60 * 1000;
        return age > maxAge && backup.tags?.includes("auto");
      });

      // Clean up eligible backups
      for (const backup of eligibleBackups) {
        await backupManager.deleteBackup(backup.id, true);
      }

      // Verify cleanup results
      const remainingBackups = await backupManager.listBackups();
      expect(remainingBackups.length).toBeLessThan(initialBackups.length);
    });
  });

  describe("Git Integration Workflows", () => {
    it("should complete git-integrated backup workflow", async () => {
      // Mock git operations
      mockGit.setCurrentBranch("feature/test-branch");
      mockGit.setCommitHash("abc123def456");
      mockGit.setStatus("clean");

      const filesToBackup = [
        path.join(projectRoot, "src/components/Button.tsx"),
      ];

      // Create backup with git integration
      const backupId = await backupManager.createManualBackup(
        filesToBackup,
        "git-integrated-backup",
        {
          name: "git-integrated-backup",
          description: "Backup with git integration",
          tags: ["git-test"],
          mode: "interactive" as BackupMode,
          user: "test-user",
        },
      );

      // Verify git information was captured
      const backupInfo = await backupManager.getBackupInfo(backupId);
      expect(backupInfo.gitInfo).toBeDefined();
      expect(backupInfo.gitInfo?.branch).toBe("feature/test-branch");
      expect(backupInfo.gitInfo?.commit).toBe("abc123def456");
    });
  });
});

/**
 * Performance benchmarks for backup system
 */
describe("Backup System Performance Benchmarks", () => {
  let backupManager: BackupManager;
  let tempDir: string;
  let projectRoot: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFsUtils.reset();

    tempDir = await testEnv.createTempDir("backup-performance-test");
    projectRoot = path.join(tempDir, "project");

    const config: BackupConfig = {
      backupRoot: path.join(tempDir, ".migr8-backups"),
      maxBackups: 100,
      maxAgeDays: 30,
      maxTotalSize: 1024 * 1024 * 1024,
      autoCleanup: true,
      gitIntegration: false, // Disable for performance tests
      verifyAfterBackup: false, // Disable for performance tests
      concurrency: 10,
      showProgress: false,
      compressionLevel: 1, // Fast compression
    };

    const metadataManager = new MetadataManager(config.backupRoot);
    const snapshotManager = new SnapshotManager(config.backupRoot, config);
    const integrityManager = new IntegrityManager(
      snapshotManager,
      metadataManager,
    );
    backupManager = new BackupManager(
      config,
      snapshotManager,
      metadataManager,
      integrityManager,
    );
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  it("should handle 1000 small files within time limit", async () => {
    const perfMonitor = new PerformanceMonitor();
    perfMonitor.start("1000-small-files");

    // Create 1000 small files
    const files: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const filePath = path.join(projectRoot, `file-${i}.ts`);
      const content = `// File ${i}\nexport const value${i} = ${i};\n`;
      mockFsUtils.setFile(filePath, content);
      files.push(filePath);
    }

    // Create backup
    const backupId = await backupManager.createManualBackup(
      files,
      "performance-test-1000-files",
      {
        name: "performance-test-1000-files",
        description: "Performance test with 1000 small files",
        tags: ["performance"],
        mode: "yolo" as BackupMode,
        user: "perf-test",
      },
    );

    expect(backupId).toBeValidBackupId();

    perfMonitor.end("1000-small-files");
    const duration = perfMonitor.getDuration("1000-small-files");

    // Should complete within 30 seconds
    expect(duration).toBeLessThan(30000);

    // Log performance metrics for monitoring
    console.log(`1000 small files backup completed in ${duration}ms`);
  });

  it("should handle large file backup efficiently", async () => {
    const perfMonitor = new PerformanceMonitor();
    perfMonitor.start("large-file-backup");

    // Create a large file (10MB)
    const largeContent = "x".repeat(10 * 1024 * 1024);
    const largeFilePath = path.join(projectRoot, "large-file.txt");
    mockFsUtils.setFile(largeFilePath, largeContent);

    // Create backup
    const backupId = await backupManager.createManualBackup(
      [largeFilePath],
      "large-file-performance-test",
      {
        name: "large-file-performance-test",
        description: "Performance test with large file",
        tags: ["performance", "large"],
        mode: "yolo" as BackupMode,
        user: "perf-test",
      },
    );

    expect(backupId).toBeValidBackupId();

    perfMonitor.end("large-file-backup");
    const duration = perfMonitor.getDuration("large-file-backup");

    // Should complete within 15 seconds
    expect(duration).toBeLessThan(15000);

    console.log(`Large file backup completed in ${duration}ms`);
  });
});

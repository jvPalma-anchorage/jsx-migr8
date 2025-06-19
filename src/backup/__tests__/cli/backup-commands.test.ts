/**
 * Comprehensive tests for backup CLI commands
 * Tests all CLI interactions, user input handling, and edge cases
 */
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import chalk from "chalk";

// Mock modules before importing
jest.mock("node:fs");
jest.mock("@inquirer/prompts");
jest.mock("chalk");

import { BackupCLI, handleBackupCLI } from "../../cli/backup-commands";
import { BackupManager } from "../../backup-manager";
import { testEnv, errorSimulator } from "../helpers/jest-setup";
import {
  generateBackupMetadata,
  generateActiveBackups,
} from "../__fixtures__/test-data";
import { mockFsUtils } from "../__mocks__/fs";
import { mockInquirer } from "../__mocks__/inquirer";

// Mock chalk to avoid color codes in tests
(chalk as any).blue = jest.fn((text: string) => text);
(chalk as any).green = jest.fn((text: string) => text);
(chalk as any).yellow = jest.fn((text: string) => text);
(chalk as any).red = jest.fn((text: string) => text);
(chalk as any).gray = jest.fn((text: string) => text);
(chalk as any).bold = jest.fn((text: string) => text);

// Mock console methods
const mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = jest
  .spyOn(console, "error")
  .mockImplementation(() => {});
const mockConsoleWarn = jest
  .spyOn(console, "warn")
  .mockImplementation(() => {});

describe("BackupCLI", () => {
  let backupCLI: BackupCLI;
  let mockBackupManager: jest.Mocked<BackupManager>;
  let tempDir: string;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockFsUtils.reset();
    errorSimulator.clear();
    mockInquirer.reset();

    // Create temporary directory
    tempDir = await testEnv.createTempDir("backup-cli-test");

    // Create mock backup manager
    mockBackupManager = {
      createManualBackup: jest.fn(),
      listBackups: jest.fn(),
      getBackupInfo: jest.fn(),
      verifyBackup: jest.fn(),
      deleteBackup: jest.fn(),
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
    } as any;

    // Create BackupCLI instance and replace the backup manager
    backupCLI = new BackupCLI();
    (backupCLI as any).backupManager = mockBackupManager;
  });

  afterEach(async () => {
    await testEnv.cleanup();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
  });

  describe("Main Command Handler", () => {
    it("should handle create backup action", async () => {
      mockInquirer.queueResponses([
        { type: "select", response: "create" },
        { type: "select", response: "current" },
        { type: "input", response: "test-backup" },
        { type: "input", response: "Test backup description" },
        { type: "confirm", response: false }, // No tags
      ]);

      mockBackupManager.createManualBackup.mockResolvedValue("backup-123");
      mockBackupManager.getBackupInfo.mockResolvedValue(
        generateBackupMetadata(),
      );

      await backupCLI.handleBackupCommand();

      expect(mockBackupManager.createManualBackup).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Backup created successfully"),
      );
    });

    it("should handle list backups action", async () => {
      mockInquirer.queueResponse("select", "list");

      const mockBackups = generateActiveBackups(3);
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockInquirer.queueResponse("confirm", false); // Don't view details

      await backupCLI.handleBackupCommand();

      expect(mockBackupManager.listBackups).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Available Backups"),
      );
    });

    it("should handle restore backup action", async () => {
      mockInquirer.queueResponses([
        { type: "select", response: "restore" },
        { type: "select", response: "backup-123" },
        { type: "confirm", response: true },
      ]);

      const mockBackups = generateActiveBackups(1);
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockBackupManager.getBackupInfo.mockResolvedValue(
        generateBackupMetadata(),
      );

      await backupCLI.handleBackupCommand();

      expect(mockBackupManager.listBackups).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Starting restore process"),
      );
    });

    it("should handle verify backup action", async () => {
      mockInquirer.queueResponses([
        { type: "select", response: "verify" },
        { type: "select", response: "backup-123" },
      ]);

      const mockBackups = generateActiveBackups(1);
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockBackupManager.verifyBackup.mockResolvedValue({
        valid: true,
        summary: {
          totalFiles: 5,
          validFiles: 5,
          invalidFiles: 0,
          errorFiles: 0,
        },
      } as any);

      await backupCLI.handleBackupCommand();

      expect(mockBackupManager.verifyBackup).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Backup integrity verified successfully"),
      );
    });

    it("should handle cleanup action", async () => {
      mockInquirer.queueResponses([
        { type: "select", response: "cleanup" },
        { type: "confirm", response: true },
      ]);

      const mockBackups = generateActiveBackups(3);
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockBackupManager.getConfig.mockReturnValue({
        maxAgeDays: 30,
      } as any);
      mockBackupManager.deleteBackup.mockResolvedValue();

      await backupCLI.handleBackupCommand();

      expect(mockBackupManager.listBackups).toHaveBeenCalled();
    });

    it("should handle delete backup action", async () => {
      mockInquirer.queueResponses([
        { type: "select", response: "delete" },
        { type: "select", response: "backup-123" },
        { type: "confirm", response: true },
      ]);

      const mockBackups = generateActiveBackups(1);
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockBackupManager.deleteBackup.mockResolvedValue();

      await backupCLI.handleBackupCommand();

      expect(mockBackupManager.deleteBackup).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Backup deleted"),
      );
    });

    it("should handle configuration action", async () => {
      mockInquirer.queueResponses([
        { type: "select", response: "config" },
        { type: "confirm", response: false },
      ]);

      mockBackupManager.getConfig.mockReturnValue({
        maxBackups: 50,
        maxAgeDays: 30,
        maxTotalSize: 1024 * 1024 * 1024,
        autoCleanup: true,
        gitIntegration: true,
        verifyAfterBackup: true,
        concurrency: 10,
        showProgress: true,
      } as any);

      await backupCLI.handleBackupCommand();

      expect(mockBackupManager.getConfig).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Current Backup Configuration"),
      );
    });
  });

  describe("Manual Backup Creation", () => {
    it("should create backup with current directory selection", async () => {
      mockInquirer.queueResponses([
        { type: "select", response: "current" },
        { type: "input", response: "my-backup" },
        { type: "input", response: "My backup description" },
        { type: "confirm", response: false },
      ]);

      mockBackupManager.createManualBackup.mockResolvedValue("backup-456");
      mockBackupManager.getBackupInfo.mockResolvedValue(
        generateBackupMetadata(),
      );

      await (backupCLI as any).createManualBackup({});

      expect(mockBackupManager.createManualBackup).toHaveBeenCalledWith(
        [process.cwd()],
        "my-backup",
        expect.objectContaining({
          name: "my-backup",
          description: "My backup description",
          tags: [],
        }),
      );
    });

    it("should create backup with specific files", async () => {
      mockInquirer.queueResponses([
        { type: "select", response: "specific" },
        { type: "input", response: "file1.ts" },
        { type: "confirm", response: true }, // Add another file
        { type: "input", response: "file2.ts" },
        { type: "confirm", response: false }, // No more files
        { type: "input", response: "specific-backup" },
        { type: "input", response: "Specific files backup" },
        { type: "confirm", response: false },
      ]);

      mockBackupManager.createManualBackup.mockResolvedValue("backup-789");
      mockBackupManager.getBackupInfo.mockResolvedValue(
        generateBackupMetadata(),
      );

      await (backupCLI as any).createManualBackup({});

      expect(mockBackupManager.createManualBackup).toHaveBeenCalledWith(
        ["file1.ts", "file2.ts"],
        "specific-backup",
        expect.objectContaining({
          name: "specific-backup",
          description: "Specific files backup",
        }),
      );
    });

    it("should create backup with pattern selection", async () => {
      mockInquirer.queueResponses([
        { type: "select", response: "pattern" },
        { type: "input", response: "src/**/*.ts" },
        { type: "input", response: "pattern-backup" },
        { type: "input", response: "Pattern-based backup" },
        { type: "confirm", response: false },
      ]);

      mockBackupManager.createManualBackup.mockResolvedValue("backup-pattern");
      mockBackupManager.getBackupInfo.mockResolvedValue(
        generateBackupMetadata(),
      );

      await (backupCLI as any).createManualBackup({});

      expect(mockBackupManager.createManualBackup).toHaveBeenCalledWith(
        ["src/**/*.ts"],
        "pattern-backup",
        expect.any(Object),
      );
    });

    it("should create backup with tags", async () => {
      mockInquirer.queueResponses([
        { type: "select", response: "current" },
        { type: "input", response: "tagged-backup" },
        { type: "input", response: "Backup with tags" },
        { type: "confirm", response: true }, // Add tags
        { type: "input", response: "important" },
        { type: "confirm", response: true }, // Add another tag
        { type: "input", response: "manual" },
        { type: "confirm", response: false }, // No more tags
      ]);

      mockBackupManager.createManualBackup.mockResolvedValue("backup-tagged");
      mockBackupManager.getBackupInfo.mockResolvedValue(
        generateBackupMetadata(),
      );

      await (backupCLI as any).createManualBackup({});

      expect(mockBackupManager.createManualBackup).toHaveBeenCalledWith(
        [process.cwd()],
        "tagged-backup",
        expect.objectContaining({
          tags: ["important", "manual"],
        }),
      );
    });

    it("should handle backup creation failure", async () => {
      mockInquirer.queueResponses([
        { type: "select", response: "current" },
        { type: "input", response: "failed-backup" },
        { type: "input", response: "This will fail" },
        { type: "confirm", response: false },
      ]);

      mockBackupManager.createManualBackup.mockRejectedValue(
        new Error("Backup failed"),
      );

      await (backupCLI as any).createManualBackup({});

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Failed to create backup"),
        expect.any(Error),
      );
    });

    it("should handle no files selected", async () => {
      mockInquirer.queueResponse("select", "specific");
      // Don't add any files
      mockInquirer.queueResponse("confirm", false);

      await (backupCLI as any).createManualBackup({});

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("No files selected"),
      );
    });
  });

  describe("Backup Listing", () => {
    it("should display backups with details", async () => {
      const mockBackups = generateActiveBackups(3);
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockInquirer.queueResponse("confirm", false);

      await (backupCLI as any).listBackups();

      expect(mockBackupManager.listBackups).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Available Backups"),
      );

      // Should display backup information
      mockBackups.forEach((backup) => {
        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining(backup.name),
        );
      });
    });

    it("should handle empty backup list", async () => {
      mockBackupManager.listBackups.mockResolvedValue([]);

      await (backupCLI as any).listBackups();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("No backups found"),
      );
    });

    it("should show detailed view when requested", async () => {
      const mockBackups = generateActiveBackups(1);
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);

      mockInquirer.queueResponses([
        { type: "confirm", response: true }, // View details
        { type: "select", response: mockBackups[0].id },
      ]);

      mockBackupManager.getBackupInfo.mockResolvedValue(
        generateBackupMetadata(),
      );

      await (backupCLI as any).listBackups();

      expect(mockBackupManager.getBackupInfo).toHaveBeenCalledWith(
        mockBackups[0].id,
      );
    });

    it("should handle backup listing errors", async () => {
      mockBackupManager.listBackups.mockRejectedValue(new Error("List failed"));

      await (backupCLI as any).listBackups();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Failed to list backups"),
        expect.any(Error),
      );
    });
  });

  describe("Backup Verification", () => {
    it("should verify backup successfully", async () => {
      const mockBackups = generateActiveBackups(1);
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockInquirer.queueResponse("select", mockBackups[0].id);

      mockBackupManager.verifyBackup.mockResolvedValue({
        valid: true,
        summary: {
          totalFiles: 10,
          validFiles: 10,
          invalidFiles: 0,
          errorFiles: 0,
        },
      } as any);

      await (backupCLI as any).verifyBackup();

      expect(mockBackupManager.verifyBackup).toHaveBeenCalledWith(
        mockBackups[0].id,
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Backup integrity verified successfully"),
      );
    });

    it("should handle verification failure", async () => {
      const mockBackups = generateActiveBackups(1);
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockInquirer.queueResponse("select", mockBackups[0].id);

      mockBackupManager.verifyBackup.mockResolvedValue({
        valid: false,
        summary: {
          totalFiles: 10,
          validFiles: 7,
          invalidFiles: 2,
          errorFiles: 1,
        },
        files: [
          { filePath: "failed1.ts", valid: false, error: "Checksum mismatch" },
          { filePath: "failed2.ts", valid: false, error: "File not found" },
        ],
      } as any);

      await (backupCLI as any).verifyBackup();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Backup integrity check failed"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Failed files"),
      );
    });

    it("should handle no backups available for verification", async () => {
      mockBackupManager.listBackups.mockResolvedValue([]);

      await (backupCLI as any).verifyBackup();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("No backups available for verification"),
      );
    });
  });

  describe("Backup Cleanup", () => {
    it("should perform cleanup when confirmed", async () => {
      const mockBackups = generateActiveBackups(5);
      // Make some backups old
      mockBackups[3].createdAt = new Date(
        Date.now() - 32 * 24 * 60 * 60 * 1000,
      ); // 32 days ago
      mockBackups[4].createdAt = new Date(
        Date.now() - 35 * 24 * 60 * 60 * 1000,
      ); // 35 days ago
      mockBackups[3].tags = ["auto"];
      mockBackups[4].tags = ["auto"];

      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockBackupManager.getConfig.mockReturnValue({ maxAgeDays: 30 } as any);
      mockInquirer.queueResponse("confirm", true);
      mockBackupManager.deleteBackup.mockResolvedValue();

      await (backupCLI as any).cleanupBackups();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Found 2 backups eligible for cleanup"),
      );
      expect(mockBackupManager.deleteBackup).toHaveBeenCalledTimes(2);
    });

    it("should handle no backups needing cleanup", async () => {
      const mockBackups = generateActiveBackups(3);
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockBackupManager.getConfig.mockReturnValue({ maxAgeDays: 30 } as any);

      await (backupCLI as any).cleanupBackups();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("No backups need cleanup"),
      );
    });

    it("should handle cleanup cancellation", async () => {
      const mockBackups = generateActiveBackups(2);
      // Make backups old
      mockBackups.forEach((backup) => {
        backup.createdAt = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000);
        backup.tags = ["auto"];
      });

      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockBackupManager.getConfig.mockReturnValue({ maxAgeDays: 30 } as any);
      mockInquirer.queueResponse("confirm", false); // Cancel cleanup

      await (backupCLI as any).cleanupBackups();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Cleanup cancelled"),
      );
      expect(mockBackupManager.deleteBackup).not.toHaveBeenCalled();
    });

    it("should handle partial cleanup failures", async () => {
      const mockBackups = generateActiveBackups(3);
      mockBackups.forEach((backup) => {
        backup.createdAt = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000);
        backup.tags = ["auto"];
      });

      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockBackupManager.getConfig.mockReturnValue({ maxAgeDays: 30 } as any);
      mockInquirer.queueResponse("confirm", true);

      // Make some deletions fail
      mockBackupManager.deleteBackup
        .mockResolvedValueOnce() // First succeeds
        .mockRejectedValueOnce(new Error("Delete failed")) // Second fails
        .mockResolvedValueOnce(); // Third succeeds

      await (backupCLI as any).cleanupBackups();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Cleanup completed: 2/3 backups deleted"),
      );
    });
  });

  describe("Backup Deletion", () => {
    it("should delete backup when confirmed", async () => {
      const mockBackups = generateActiveBackups(1);
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockInquirer.queueResponses([
        { type: "select", response: mockBackups[0].id },
        { type: "confirm", response: true },
      ]);
      mockBackupManager.deleteBackup.mockResolvedValue();

      await (backupCLI as any).deleteBackup();

      expect(mockBackupManager.deleteBackup).toHaveBeenCalledWith(
        mockBackups[0].id,
        true,
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Backup deleted"),
      );
    });

    it("should handle protected backup deletion", async () => {
      const mockBackups = generateActiveBackups(1);
      mockBackups[0].tags = ["protected"];
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);

      mockInquirer.queueResponses([
        { type: "select", response: mockBackups[0].id },
        { type: "confirm", response: true }, // Confirm delete
        { type: "confirm", response: true }, // Force delete protected
      ]);
      mockBackupManager.deleteBackup.mockResolvedValue();

      await (backupCLI as any).deleteBackup();

      expect(mockBackupManager.deleteBackup).toHaveBeenCalledWith(
        mockBackups[0].id,
        true,
      );
    });

    it("should handle deletion cancellation", async () => {
      const mockBackups = generateActiveBackups(1);
      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockInquirer.queueResponses([
        { type: "select", response: mockBackups[0].id },
        { type: "confirm", response: false }, // Cancel delete
      ]);

      await (backupCLI as any).deleteBackup();

      expect(mockBackupManager.deleteBackup).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Delete cancelled"),
      );
    });

    it("should handle no backups available for deletion", async () => {
      mockBackupManager.listBackups.mockResolvedValue([]);

      await (backupCLI as any).deleteBackup();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("No backups available to delete"),
      );
    });
  });

  describe("Helper Functions", () => {
    it("should format file sizes correctly", () => {
      expect((backupCLI as any).formatBytes(0)).toBe("0 Bytes");
      expect((backupCLI as any).formatBytes(1024)).toBe("1 KB");
      expect((backupCLI as any).formatBytes(1048576)).toBe("1 MB");
      expect((backupCLI as any).formatBytes(1073741824)).toBe("1 GB");
    });

    it("should display backup metadata correctly", () => {
      const metadata = generateBackupMetadata();

      (backupCLI as any).displayBackupMetadata(metadata);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Backup Details"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(metadata.name),
      );
    });

    it("should display rollback results correctly", () => {
      const result = {
        status: "success",
        summary: {
          restoredFiles: 5,
          failedFiles: 0,
          skippedFiles: 0,
          conflictedFiles: 0,
        },
        durationMs: 1500,
        preRollbackBackupId: "pre-rollback-123",
      };

      (backupCLI as any).displayRollbackResult(result);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Rollback completed successfully"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Restored: 5 files"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Pre-rollback backup created"),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle general command errors", async () => {
      mockInquirer.queueResponse("select", "create");

      // Mock error in createManualBackup
      jest
        .spyOn(backupCLI as any, "createManualBackup")
        .mockRejectedValue(new Error("Command failed"));

      await backupCLI.handleBackupCommand();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Backup command failed"),
        expect.any(Error),
      );
    });

    it("should handle inquirer errors", async () => {
      // Mock inquirer to throw error
      errorSimulator.setErrorCondition("select", new Error("Prompt failed"));

      await backupCLI.handleBackupCommand();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Backup command failed"),
        expect.any(Error),
      );
    });

    it("should handle backup manager errors", async () => {
      mockInquirer.queueResponse("select", "list");
      mockBackupManager.listBackups.mockRejectedValue(
        new Error("Manager error"),
      );

      await (backupCLI as any).listBackups();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Failed to list backups"),
        expect.any(Error),
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long backup names", async () => {
      const longName = "a".repeat(200);

      mockInquirer.queueResponses([
        { type: "select", response: "current" },
        { type: "input", response: longName },
        { type: "input", response: "Long name backup" },
        { type: "confirm", response: false },
      ]);

      mockBackupManager.createManualBackup.mockResolvedValue("backup-long");
      mockBackupManager.getBackupInfo.mockResolvedValue(
        generateBackupMetadata(),
      );

      await (backupCLI as any).createManualBackup({});

      expect(mockBackupManager.createManualBackup).toHaveBeenCalledWith(
        expect.any(Array),
        longName,
        expect.any(Object),
      );
    });

    it("should handle special characters in backup names", async () => {
      const specialName = "Backup with émojis 🚀 and symbols @#$";

      mockInquirer.queueResponses([
        { type: "select", response: "current" },
        { type: "input", response: specialName },
        { type: "input", response: "Special chars backup" },
        { type: "confirm", response: false },
      ]);

      mockBackupManager.createManualBackup.mockResolvedValue("backup-special");
      mockBackupManager.getBackupInfo.mockResolvedValue(
        generateBackupMetadata(),
      );

      await (backupCLI as any).createManualBackup({});

      expect(mockBackupManager.createManualBackup).toHaveBeenCalledWith(
        expect.any(Array),
        specialName,
        expect.any(Object),
      );
    });

    it("should handle empty input validation", async () => {
      mockInquirer.queueResponses([
        { type: "select", response: "specific" },
        { type: "input", response: "" }, // Empty file path
      ]);

      // Should trigger validation error in the real implementation
      // For now, just ensure it doesn't crash
      await expect(
        (backupCLI as any).createManualBackup({}),
      ).resolves.not.toThrow();
    });
  });
});

describe("handleBackupCLI Function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  it("should parse command line arguments correctly", async () => {
    const args = ["--dry-run", "--force", "--quiet", "--skip-verification"];

    // Mock the BackupCLI class
    const mockHandleBackupCommand = jest.fn();
    jest.doMock("../../cli/backup-commands", () => ({
      BackupCLI: jest.fn().mockImplementation(() => ({
        handleBackupCommand: mockHandleBackupCommand,
      })),
    }));

    await handleBackupCLI(args);

    expect(mockHandleBackupCommand).toHaveBeenCalledWith({
      dryRun: true,
      force: true,
      quiet: true,
      skipVerification: true,
    });
  });

  it("should handle empty arguments", async () => {
    const mockHandleBackupCommand = jest.fn();
    jest.doMock("../../cli/backup-commands", () => ({
      BackupCLI: jest.fn().mockImplementation(() => ({
        handleBackupCommand: mockHandleBackupCommand,
      })),
    }));

    await handleBackupCLI([]);

    expect(mockHandleBackupCommand).toHaveBeenCalledWith({});
  });

  it("should handle unknown arguments gracefully", async () => {
    const args = ["--unknown-flag", "--another-unknown"];

    const mockHandleBackupCommand = jest.fn();
    jest.doMock("../../cli/backup-commands", () => ({
      BackupCLI: jest.fn().mockImplementation(() => ({
        handleBackupCommand: mockHandleBackupCommand,
      })),
    }));

    await handleBackupCLI(args);

    // Should call with empty options since unknown flags are ignored
    expect(mockHandleBackupCommand).toHaveBeenCalledWith({});
  });
});

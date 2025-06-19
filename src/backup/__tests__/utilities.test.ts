/**
 * Comprehensive tests for backup utility functions
 * Tests all utility functions with edge cases and error conditions
 */
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import crypto from "node:crypto";

// Mock modules before importing
jest.mock("node:fs");

import {
  createBackupSnapshot,
  restoreFromSnapshot,
  verifyBackupIntegrity,
  listAvailableBackups,
  getBackupDetails,
  findBackups,
  getBackupStatistics,
  cleanupOldBackups,
  exportBackup,
  importBackup,
  compareBackups,
  formatFileSize,
  formatDuration,
  isValidBackupId,
  generateBackupReport,
  encodeFilePath,
  decodeFilePath,
  calculateChecksum,
  calculateFileChecksum,
  generateBackupId,
  sanitizeBackupName,
  isSafePath,
  generateTempFileName,
  estimateBackupDuration,
  ensureBackupDirectory,
  validateBackupConfig,
  safeJsonParse,
  isSameFile,
  getFileExtension,
  isTextFile,
} from "../utilities";
import { testEnv, errorSimulator } from "./helpers/jest-setup";
import {
  generateBackupMetadata,
  generateActiveBackups,
} from "./__fixtures__/test-data";
import { mockFsUtils } from "./__mocks__/fs";

// Mock the backup manager
jest.mock("../backup-manager");
const mockGetBackupManager = jest.fn();

describe("Backup Utilities", () => {
  let tempDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFsUtils.reset();
    errorSimulator.clear();
    tempDir = await testEnv.createTempDir("utilities-test");
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  describe("File Size Formatting", () => {
    it("should format bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 Bytes");
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1024 * 1024)).toBe("1 MB");
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1536 * 1024)).toBe("1.5 MB");
    });

    it("should handle very large numbers", () => {
      const largeSize = 5 * 1024 * 1024 * 1024 * 1024; // 5TB
      expect(formatFileSize(largeSize)).toContain("TB");
    });

    it("should handle decimal precision", () => {
      expect(formatFileSize(1536.7)).toBe("1.5 KB");
      expect(formatFileSize(1048576.5)).toBe("1 MB");
    });
  });

  describe("Duration Formatting", () => {
    it("should format milliseconds correctly", () => {
      expect(formatDuration(1000)).toBe("1s");
      expect(formatDuration(60000)).toBe("1m 0s");
      expect(formatDuration(3600000)).toBe("1h 0m 0s");
      expect(formatDuration(3661000)).toBe("1h 1m 1s");
      expect(formatDuration(125000)).toBe("2m 5s");
    });

    it("should handle edge cases", () => {
      expect(formatDuration(0)).toBe("0s");
      expect(formatDuration(999)).toBe("0s");
      expect(formatDuration(90061000)).toBe("25h 1m 1s");
    });
  });

  describe("Backup ID Validation", () => {
    it("should validate correct backup ID format", () => {
      expect(isValidBackupId("1234567890-component-12345678")).toBe(true);
      expect(isValidBackupId("1640995200000-text-component-abcd1234")).toBe(
        true,
      );
      expect(isValidBackupId("1234567890-my-component-name-1a2b3c4d")).toBe(
        true,
      );
    });

    it("should reject invalid backup ID formats", () => {
      expect(isValidBackupId("")).toBe(false);
      expect(isValidBackupId("invalid-id")).toBe(false);
      expect(isValidBackupId("1234567890")).toBe(false);
      expect(isValidBackupId("1234567890-component")).toBe(false);
      expect(isValidBackupId("1234567890-component-toolong123456789")).toBe(
        false,
      );
      expect(isValidBackupId("timestamp-component-12345678")).toBe(false);
    });

    it("should handle special characters in component names", () => {
      expect(isValidBackupId("1234567890-component_name-12345678")).toBe(true);
      expect(isValidBackupId("1234567890-component-name-12345678")).toBe(true);
      expect(isValidBackupId("1234567890-component@name-12345678")).toBe(false);
    });
  });

  describe("Path Encoding/Decoding", () => {
    it("should encode and decode file paths with base64", () => {
      const originalPath = "src/components/Button.tsx";
      const encoded = encodeFilePath(originalPath, "base64");

      expect(encoded.encoded).toBeTruthy();
      expect(encoded.original).toBe(originalPath);
      expect(encoded.method).toBe("base64");

      const decoded = decodeFilePath(encoded.encoded, "base64");
      expect(decoded).toBe(originalPath);
    });

    it("should encode and decode file paths with hex", () => {
      const originalPath = "src/utils/helpers.ts";
      const encoded = encodeFilePath(originalPath, "hex");

      expect(encoded.method).toBe("hex");

      const decoded = decodeFilePath(encoded.encoded, "hex");
      expect(decoded).toBe(originalPath);
    });

    it("should encode and decode file paths with safe-path", () => {
      const originalPath = "src/file with spaces/special:chars*.tsx";
      const encoded = encodeFilePath(originalPath, "safe-path");

      expect(encoded.encoded).not.toContain(" ");
      expect(encoded.encoded).not.toContain(":");
      expect(encoded.encoded).not.toContain("*");

      const decoded = decodeFilePath(encoded.encoded, "safe-path");
      expect(decoded).toContain("file with spaces");
    });

    it("should handle unicode characters", () => {
      const originalPath = "src/测试文件-émojis🚀.tsx";
      const encoded = encodeFilePath(originalPath, "base64");
      const decoded = decodeFilePath(encoded.encoded, "base64");

      expect(decoded).toBe(originalPath);
    });

    it("should handle very long paths", () => {
      const longPath = "very/".repeat(100) + "long/path.tsx";
      const encoded = encodeFilePath(longPath, "safe-path");

      expect(encoded.encoded.length).toBeLessThanOrEqual(200);
    });
  });

  describe("Checksum Calculation", () => {
    it("should calculate consistent checksums", () => {
      const content = "Test content for checksum";
      const expectedChecksum = crypto
        .createHash("sha256")
        .update(content, "utf8")
        .digest("hex");

      const actualChecksum = calculateChecksum(content);
      expect(actualChecksum).toBe(expectedChecksum);
      expect(actualChecksum).toBeValidChecksum();
    });

    it("should handle empty content", () => {
      const checksum = calculateChecksum("");
      expect(checksum).toBeValidChecksum();
    });

    it("should handle unicode content", () => {
      const content = "你好世界 🌍";
      const checksum = calculateChecksum(content);
      expect(checksum).toBeValidChecksum();
    });

    it("should produce different checksums for different content", () => {
      const checksum1 = calculateChecksum("Content 1");
      const checksum2 = calculateChecksum("Content 2");
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe("File Checksum Calculation", () => {
    it("should calculate checksum for existing file", async () => {
      const filePath = `${tempDir}/test-file.ts`;
      const content = "File content for checksum";

      mockFsUtils.setFile(filePath, content);

      const checksum = await calculateFileChecksum(filePath);
      const expectedChecksum = crypto
        .createHash("sha256")
        .update(content, "utf8")
        .digest("hex");

      expect(checksum).toBe(expectedChecksum);
    });

    it("should handle missing files", async () => {
      await expect(
        calculateFileChecksum(`${tempDir}/missing-file.ts`),
      ).rejects.toThrow();
    });
  });

  describe("Backup ID Generation", () => {
    it("should generate valid backup IDs", () => {
      const backupId = generateBackupId("TestComponent");
      expect(backupId).toBeValidBackupId();
      expect(backupId).toContain("testcomponent");
    });

    it("should generate unique backup IDs", () => {
      const id1 = generateBackupId("Component");
      const id2 = generateBackupId("Component");
      expect(id1).not.toBe(id2);
    });

    it("should handle special characters in component name", () => {
      const backupId = generateBackupId("Component@Name#123");
      expect(backupId).toBeValidBackupId();
      expect(backupId).toContain("component-name-123");
    });

    it("should use custom timestamp", () => {
      const timestamp = 1234567890000;
      const backupId = generateBackupId("Component", timestamp);
      expect(backupId).toContain(timestamp.toString());
    });
  });

  describe("Backup Name Sanitization", () => {
    it("should sanitize backup names", () => {
      expect(sanitizeBackupName("Valid Name")).toBe("valid-name");
      expect(sanitizeBackupName("Name with @#$ symbols")).toBe(
        "name-with-symbols",
      );
      expect(sanitizeBackupName("Multiple   spaces")).toBe("multiple-spaces");
      expect(sanitizeBackupName("---dash---heavy---")).toBe("dash-heavy");
    });

    it("should limit name length", () => {
      const longName = "a".repeat(100);
      const sanitized = sanitizeBackupName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(50);
    });

    it("should handle empty names", () => {
      expect(sanitizeBackupName("")).toBe("");
      expect(sanitizeBackupName("   ")).toBe("");
    });
  });

  describe("Path Safety Validation", () => {
    it("should validate safe paths", () => {
      expect(isSafePath("src/components/Button.tsx")).toBe(true);
      expect(isSafePath("relative/path/file.ts")).toBe(true);
      expect(isSafePath("file.js")).toBe(true);
    });

    it("should reject unsafe paths", () => {
      expect(isSafePath("../../../etc/passwd")).toBe(false);
      expect(isSafePath("/etc/passwd")).toBe(false);
      expect(isSafePath("/usr/bin/ls")).toBe(false);
      expect(isSafePath("/sys/kernel")).toBe(false);
      expect(isSafePath("/proc/version")).toBe(false);
      expect(isSafePath("/dev/null")).toBe(false);
      expect(isSafePath("/root/secret")).toBe(false);
    });

    it("should handle normalized paths", () => {
      expect(isSafePath("src/../components/Button.tsx")).toBe(false);
      expect(isSafePath("./src/./components/Button.tsx")).toBe(true);
    });
  });

  describe("Temporary File Name Generation", () => {
    it("should generate unique temporary file names", () => {
      const temp1 = generateTempFileName("backup");
      const temp2 = generateTempFileName("backup");

      expect(temp1).toContain("backup.tmp.");
      expect(temp2).toContain("backup.tmp.");
      expect(temp1).not.toBe(temp2);
    });

    it("should include timestamp and random component", () => {
      const tempName = generateTempFileName("test");
      expect(tempName).toMatch(/test\.tmp\.\d+\.[a-f0-9]+/);
    });
  });

  describe("Backup Duration Estimation", () => {
    it("should estimate duration based on file count and size", () => {
      const duration1 = estimateBackupDuration(10, 1024 * 1024); // 10 files, 1MB
      const duration2 = estimateBackupDuration(100, 10 * 1024 * 1024); // 100 files, 10MB

      expect(duration1).toBeGreaterThanOrEqual(1000); // Minimum 1 second
      expect(duration2).toBeGreaterThan(duration1); // More files/data = longer duration
    });

    it("should have minimum duration", () => {
      const duration = estimateBackupDuration(1, 100); // Very small backup
      expect(duration).toBeGreaterThanOrEqual(1000);
    });
  });

  describe("Directory Creation", () => {
    it("should create backup directory structure", async () => {
      const backupRoot = `${tempDir}/backup-root`;
      const backupId = "test-backup-123";

      const backupDir = await ensureBackupDirectory(backupRoot, backupId);

      expect(mockFsUtils.exists(backupDir)).toBe(true);
      expect(mockFsUtils.exists(`${backupDir}/files`)).toBe(true);
      expect(mockFsUtils.exists(`${backupDir}/metadata`)).toBe(true);
    });
  });

  describe("Configuration Validation", () => {
    it("should validate correct configuration", () => {
      const config = {
        maxBackups: 50,
        maxAgeDays: 30,
        concurrency: 10,
      };

      const result = validateBackupConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid configuration", () => {
      const config = {
        maxBackups: -1,
        maxAgeDays: 0,
        concurrency: 100,
      };

      const result = validateBackupConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate concurrency limits", () => {
      const config = {
        maxBackups: 10,
        maxAgeDays: 30,
        concurrency: 60, // Too high
      };

      const result = validateBackupConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("concurrency"))).toBe(true);
    });
  });

  describe("JSON Parsing", () => {
    it("should parse valid JSON", () => {
      const obj = { test: "value", number: 42 };
      const json = JSON.stringify(obj);

      const parsed = safeJsonParse(json);
      expect(parsed).toEqual(obj);
    });

    it("should handle invalid JSON with fallback", () => {
      const fallback = { error: "fallback" };
      const parsed = safeJsonParse("invalid json {", fallback);
      expect(parsed).toBe(fallback);
    });

    it("should return undefined for invalid JSON without fallback", () => {
      const parsed = safeJsonParse("invalid json {");
      expect(parsed).toBeUndefined();
    });
  });

  describe("File Comparison", () => {
    it("should detect same files", async () => {
      const filePath = `${tempDir}/same-file.ts`;
      mockFsUtils.setFile(filePath, "content");

      const same = await isSameFile(filePath, filePath);
      expect(same).toBe(true);
    });

    it("should handle missing files", async () => {
      const same = await isSameFile(
        `${tempDir}/missing1.ts`,
        `${tempDir}/missing2.ts`,
      );
      expect(same).toBe(false);
    });
  });

  describe("File Extension Utilities", () => {
    it("should extract file extensions", () => {
      expect(getFileExtension("file.ts")).toBe(".ts");
      expect(getFileExtension("file.tsx")).toBe(".tsx");
      expect(getFileExtension("file.JS")).toBe(".js"); // Should lowercase
      expect(getFileExtension("file")).toBe("");
      expect(getFileExtension("file.name.tsx")).toBe(".tsx");
    });

    it("should identify text files", () => {
      expect(isTextFile("file.ts")).toBe(true);
      expect(isTextFile("file.tsx")).toBe(true);
      expect(isTextFile("file.js")).toBe(true);
      expect(isTextFile("file.jsx")).toBe(true);
      expect(isTextFile("file.json")).toBe(true);
      expect(isTextFile("file.css")).toBe(true);
      expect(isTextFile("file.scss")).toBe(true);
      expect(isTextFile("file.md")).toBe(true);
      expect(isTextFile("file.txt")).toBe(true);
      expect(isTextFile("file.yml")).toBe(true);
      expect(isTextFile("file.yaml")).toBe(true);

      expect(isTextFile("file.png")).toBe(false);
      expect(isTextFile("file.jpg")).toBe(false);
      expect(isTextFile("file.exe")).toBe(false);
      expect(isTextFile("file.bin")).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle utility function errors gracefully", async () => {
      // Test error handling in calculateFileChecksum
      errorSimulator.setErrorCondition(
        "readFile",
        new Error("Permission denied"),
      );

      await expect(
        calculateFileChecksum(`${tempDir}/error-file.ts`),
      ).rejects.toThrow("Failed to calculate checksum");
    });

    it("should handle directory creation errors", async () => {
      errorSimulator.setErrorCondition("mkdir", new Error("Permission denied"));

      await expect(
        ensureBackupDirectory(`${tempDir}/error-dir`, "test-backup"),
      ).rejects.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle extremely long content for checksums", () => {
      const largeContent = "x".repeat(10 * 1024 * 1024); // 10MB
      const checksum = calculateChecksum(largeContent);
      expect(checksum).toBeValidChecksum();
    });

    it("should handle special characters in backup names", () => {
      const specialName = "Backup with émojis 🚀 and unicode 测试";
      const sanitized = sanitizeBackupName(specialName);
      expect(sanitized).not.toContain("🚀");
      expect(sanitized).not.toContain("测试");
    });

    it("should handle path encoding edge cases", () => {
      const edgeCases = ["", ".", "..", "....", "/", "\\", "normal-path.ts"];

      edgeCases.forEach((path) => {
        const encoded = encodeFilePath(path, "safe-path");
        const decoded = decodeFilePath(encoded.encoded, "safe-path");
        expect(typeof decoded).toBe("string");
      });
    });
  });

  describe("Performance", () => {
    it("should handle checksum calculation efficiently", () => {
      const start = Date.now();

      // Calculate checksums for many small strings
      for (let i = 0; i < 1000; i++) {
        calculateChecksum(`Content ${i}`);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should handle backup ID generation efficiently", () => {
      const start = Date.now();
      const ids = [];

      for (let i = 0; i < 1000; i++) {
        ids.push(generateBackupId(`Component${i}`));
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});

// Integration-style tests that would use real utilities
describe("Backup Utilities Integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await testEnv.createTempDir("utilities-integration-test");
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  describe("Backup Report Generation", () => {
    it("should generate comprehensive backup report", async () => {
      // Mock the health check and statistics functions
      const mockHealthCheck = {
        status: "healthy",
        issues: [],
      };

      const mockStats = {
        totalBackups: 5,
        totalSize: 1024 * 1024 * 10, // 10MB
        averageSize: 1024 * 1024 * 2, // 2MB
        oldestBackup: new Date("2023-01-01"),
        newestBackup: new Date("2023-01-05"),
        byMode: {
          interactive: 3,
          yolo: 2,
        },
        byComponent: {
          Button: 2,
          Card: 2,
          Modal: 1,
        },
      };

      // Mock the index module functions
      jest.doMock("../index", () => ({
        performHealthCheck: jest.fn().mockResolvedValue(mockHealthCheck),
      }));

      jest.doMock("../utilities", () => ({
        ...jest.requireActual("../utilities"),
        getBackupStatistics: jest.fn().mockResolvedValue(mockStats),
      }));

      const report = await generateBackupReport();

      expect(report).toContain("jsx-migr8 Backup System Report");
      expect(report).toContain("Status: HEALTHY");
      expect(report).toContain("Total Backups: 5");
      expect(report).toContain("Total Size: 10 MB");
      expect(report).toContain("interactive: 3");
      expect(report).toContain("Button: 2");
    });
  });
});

/**
 * Jest setup file for backup system tests
 * Provides global test utilities and configuration
 */
/// <reference path="../types/jest.d.ts" />
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { expect } from "@jest/globals";

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidBackupId(): R;
      toBeValidChecksum(): R;
      toBeValidFilePath(): R;
      toHaveBackupStructure(): R;
      toHaveFileContent(expectedContent: string): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidBackupId(received: string) {
    const pattern = /^\d+-[a-zA-Z0-9\-_]+-[a-f0-9]{8}$/;
    const pass = pattern.test(received);

    return {
      message: () =>
        pass
          ? `Expected ${received} not to be a valid backup ID`
          : `Expected ${received} to be a valid backup ID (format: timestamp-component-hash)`,
      pass,
    };
  },

  toBeValidChecksum(received: string) {
    const pattern = /^[a-f0-9]{64}$/;
    const pass = pattern.test(received);

    return {
      message: () =>
        pass
          ? `Expected ${received} not to be a valid SHA-256 checksum`
          : `Expected ${received} to be a valid SHA-256 checksum`,
      pass,
    };
  },

  toBeValidFilePath(received: string) {
    const pass =
      typeof received === "string" &&
      received.length > 0 &&
      !received.includes("\0");

    return {
      message: () =>
        pass
          ? `Expected ${received} not to be a valid file path`
          : `Expected ${received} to be a valid file path`,
      pass,
    };
  },

  async toHaveBackupStructure(received: string) {
    try {
      const stats = await fs.promises.stat(received);
      if (!stats.isDirectory()) {
        return {
          message: () => `Expected ${received} to be a directory`,
          pass: false,
        };
      }

      const requiredPaths = [
        path.join(received, "files"),
        path.join(received, "metadata.json"),
      ];

      for (const requiredPath of requiredPaths) {
        try {
          await fs.promises.access(requiredPath);
        } catch {
          return {
            message: () =>
              `Expected ${received} to have required path: ${requiredPath}`,
            pass: false,
          };
        }
      }

      return {
        message: () =>
          `Expected ${received} not to have valid backup structure`,
        pass: true,
      };
    } catch (error) {
      return {
        message: () =>
          `Expected ${received} to exist and have backup structure: ${error}`,
        pass: false,
      };
    }
  },

  async toHaveFileContent(received: string, expectedContent: string) {
    try {
      const actualContent = await fs.promises.readFile(received, "utf8");
      const pass = actualContent === expectedContent;

      return {
        message: () =>
          pass
            ? `Expected file ${received} not to have content:\n${expectedContent}`
            : `Expected file ${received} to have content:\n${expectedContent}\nActual:\n${actualContent}`,
        pass,
      };
    } catch (error) {
      return {
        message: () =>
          `Expected file ${received} to exist and have content: ${error}`,
        pass: false,
      };
    }
  },
});

// Global test utilities
export class TestEnvironment {
  private static instance: TestEnvironment;
  private tempDirs: string[] = [];
  private cleanupCallbacks: Array<() => Promise<void>> = [];

  static getInstance(): TestEnvironment {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment();
    }
    return TestEnvironment.instance;
  }

  /**
   * Create a temporary directory for testing
   */
  async createTempDir(prefix: string = "jsx-migr8-test"): Promise<string> {
    const tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), `${prefix}-`),
    );
    this.tempDirs.push(tempDir);
    return tempDir;
  }

  /**
   * Create a temporary file with content
   */
  async createTempFile(
    content: string,
    fileName?: string,
    dir?: string,
  ): Promise<string> {
    const tempDir = dir || (await this.createTempDir());
    const filePath = path.join(tempDir, fileName || `temp-${Date.now()}.txt`);
    await fs.promises.writeFile(filePath, content, "utf8");
    return filePath;
  }

  /**
   * Create multiple test files in a directory structure
   */
  async createTestFiles(
    structure: Record<string, string>,
    baseDir?: string,
  ): Promise<string> {
    const rootDir = baseDir || (await this.createTempDir());

    for (const [relativePath, content] of Object.entries(structure)) {
      const fullPath = path.join(rootDir, relativePath);
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, content, "utf8");
    }

    return rootDir;
  }

  /**
   * Add cleanup callback
   */
  addCleanup(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Clean up all temporary resources
   */
  async cleanup(): Promise<void> {
    // Run custom cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.warn("Cleanup callback failed:", error);
      }
    }
    this.cleanupCallbacks = [];

    // Remove temporary directories
    for (const tempDir of this.tempDirs) {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to remove temp dir ${tempDir}:`, error);
      }
    }
    this.tempDirs = [];
  }

  /**
   * Generate test data
   */
  generateTestData(): {
    files: Array<{ path: string; content: string; checksum: string }>;
    metadata: any;
    projectStructure: Record<string, string>;
  } {
    const files = [
      {
        path: "src/components/Button.tsx",
        content:
          'import React from "react";\n\nexport const Button = () => <button>Click me</button>;',
      },
      {
        path: "src/components/Card.tsx",
        content:
          'import React from "react";\n\nexport const Card = ({ children }) => <div className="card">{children}</div>;',
      },
      {
        path: "src/utils/helpers.ts",
        content:
          "export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);",
      },
    ];

    const filesWithChecksums = files.map((file) => ({
      ...file,
      checksum: crypto
        .createHash("sha256")
        .update(file.content, "utf8")
        .digest("hex"),
    }));

    const metadata = {
      id: `${Date.now()}-test-component-12345678`,
      name: "Test Migration Backup",
      description: "Test backup for migration",
      createdAt: new Date(),
      projectRoot: "/test/project",
      migration: {
        migrationRuleFile: "test-rule.json",
        componentSpec: { name: "TestComponent" },
        sourcePackage: "@old/package",
        targetPackage: "@new/package",
        componentName: "TestComponent",
        cliArgs: { root: "/test/project" },
        timestamp: new Date(),
        user: "test-user",
        mode: "dry-run" as const,
      },
      gitState: null,
      files: filesWithChecksums.map((f) => ({
        originalPath: path.join("/test/project", f.path),
        relativePath: f.path,
        encodedPath: Buffer.from(f.path).toString("base64"),
        size: Buffer.byteLength(f.content, "utf8"),
        lastModified: new Date(),
        checksum: f.checksum,
        status: "backed-up" as const,
      })),
      stats: {
        totalFiles: files.length,
        totalSize: files.reduce(
          (sum, f) => sum + Buffer.byteLength(f.content, "utf8"),
          0,
        ),
        successCount: files.length,
        failedCount: 0,
        durationMs: 1000,
      },
      version: "1.0.0",
      tags: ["test", "migration"],
      canAutoClean: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    const projectStructure = Object.fromEntries(
      files.map((f) => [f.path, f.content]),
    );

    return { files: filesWithChecksums, metadata, projectStructure };
  }
}

// Global test environment instance
export const testEnv = TestEnvironment.getInstance();

// Mock implementations for testing
export const mockFs = {
  existingFiles: new Map<string, string>(),

  setFile(path: string, content: string): void {
    this.existingFiles.set(path, content);
  },

  removeFile(path: string): void {
    this.existingFiles.delete(path);
  },

  clear(): void {
    this.existingFiles.clear();
  },

  getFile(path: string): string | undefined {
    return this.existingFiles.get(path);
  },
};

// Error simulation utilities
export class ErrorSimulator {
  private errorConditions = new Map<
    string,
    { error: Error; probability: number }
  >();

  /**
   * Set error condition for a specific operation
   */
  setErrorCondition(
    operation: string,
    error: Error,
    probability: number = 1,
  ): void {
    this.errorConditions.set(operation, { error, probability });
  }

  /**
   * Remove error condition
   */
  removeErrorCondition(operation: string): void {
    this.errorConditions.delete(operation);
  }

  /**
   * Check if operation should fail
   */
  shouldFail(operation: string): Error | null {
    const condition = this.errorConditions.get(operation);
    if (!condition) return null;

    if (Math.random() < condition.probability) {
      return condition.error;
    }

    return null;
  }

  /**
   * Clear all error conditions
   */
  clear(): void {
    this.errorConditions.clear();
  }
}

export const errorSimulator = new ErrorSimulator();

// Memory and performance monitoring
export class PerformanceMonitor {
  private startTime: number = 0;
  private initialMemory: NodeJS.MemoryUsage = {
    rss: 0,
    heapTotal: 0,
    heapUsed: 0,
    external: 0,
    arrayBuffers: 0,
  };

  start(): void {
    this.startTime = Date.now();
    this.initialMemory = process.memoryUsage();
  }

  stop(): { durationMs: number; memoryDelta: NodeJS.MemoryUsage } {
    const endTime = Date.now();
    const finalMemory = process.memoryUsage();

    return {
      durationMs: endTime - this.startTime,
      memoryDelta: {
        rss: finalMemory.rss - this.initialMemory.rss,
        heapTotal: finalMemory.heapTotal - this.initialMemory.heapTotal,
        heapUsed: finalMemory.heapUsed - this.initialMemory.heapUsed,
        external: finalMemory.external - this.initialMemory.external,
        arrayBuffers:
          finalMemory.arrayBuffers - this.initialMemory.arrayBuffers,
      },
    };
  }
}

// Setup and teardown for each test file
beforeEach(async () => {
  // Clear mocks
  mockFs.clear();
  errorSimulator.clear();

  // Setup test environment
  jest.clearAllMocks();
});

afterEach(async () => {
  // Clean up test environment
  await testEnv.cleanup();
});

// Process exit cleanup
process.on("exit", () => {
  testEnv.cleanup().catch(console.error);
});

process.on("SIGINT", async () => {
  await testEnv.cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await testEnv.cleanup();
  process.exit(0);
});

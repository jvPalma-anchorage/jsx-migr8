import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { types as T } from "recast";
import {
  getMigr8RulesFileNames,
  getAstFromCode,
  getFileAstAndCode,
  getFileAstAndCodeAsync,
  getJsonFile,
  FileOperationError,
  Semaphore,
  AsyncBatchProcessor,
  getConcurrencyLimit,
  readFileAsync,
  writeFileAsync,
  fileExistsAsync,
  getFileStatsAsync,
  getMigr8RulesFileNamesAsync,
  getJsonFileAsync,
  writeJsonFileAsync,
  AsyncFileUtils,
  DEFAULT_RETRY_CONFIG,
} from "../fs-utils";

// Mock fs module
jest.mock("node:fs");
jest.mock("node:os");

const mockFs = fs as jest.Mocked<typeof fs>;
const mockOs = os as jest.Mocked<typeof os>;

describe("fs-utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getMigr8RulesFileNames", () => {
    it("should return only .migr8.json files", () => {
      mockFs.readdirSync.mockReturnValue([
        "rule1.migr8.json",
        "rule2.migr8.json",
        "other.json",
        "readme.md",
      ] as any);

      const result = getMigr8RulesFileNames();

      expect(mockFs.readdirSync).toHaveBeenCalledWith("migr8Rules");
      expect(result).toEqual(["rule1.migr8.json", "rule2.migr8.json"]);
    });

    it("should return empty array when no migr8 files exist", () => {
      mockFs.readdirSync.mockReturnValue(["other.json", "readme.md"] as any);

      const result = getMigr8RulesFileNames();

      expect(result).toEqual([]);
    });

    it("should throw error when directory does not exist", () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      expect(() => getMigr8RulesFileNames()).toThrow();
    });
  });

  describe("getAstFromCode", () => {
    it("should parse valid JavaScript code", () => {
      const code = "const x = 5;";
      const ast = getAstFromCode(code);

      expect(ast).toBeDefined();
      expect(ast.type).toBe("File");
    });

    it("should parse JSX code", () => {
      const code = "const App = () => <div>Hello</div>;";
      const ast = getAstFromCode(code);

      expect(ast).toBeDefined();
      expect(ast.type).toBe("File");
    });

    it("should parse TypeScript code", () => {
      const code = "const x: number = 5;";
      const ast = getAstFromCode(code);

      expect(ast).toBeDefined();
      expect(ast.type).toBe("File");
    });
  });

  describe("getFileAstAndCode", () => {
    it("should read file and return AST and code", () => {
      const filePath = "/test/file.js";
      const code = "const x = 5;";
      mockFs.readFileSync.mockReturnValue(code);

      const [ast, returnedCode] = getFileAstAndCode(filePath);

      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, "utf8");
      expect(returnedCode).toBe(code);
      expect(ast.type).toBe("File");
    });

    it("should throw error for non-existent file", () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      expect(() => getFileAstAndCode("/nonexistent.js")).toThrow();
    });
  });

  describe("getFileAstAndCodeAsync", () => {
    it("should read file asynchronously and return AST and code", async () => {
      const filePath = "/test/file.js";
      const code = "const x = 5;";
      mockFs.promises = {
        readFile: jest.fn().mockResolvedValue(code),
      } as any;

      const [ast, returnedCode] = await getFileAstAndCodeAsync(filePath);

      expect(mockFs.promises.readFile).toHaveBeenCalledWith(filePath, "utf8");
      expect(returnedCode).toBe(code);
      expect(ast.type).toBe("File");
    });
  });

  describe("getJsonFile", () => {
    it("should parse valid JSON file", () => {
      const filePath = "/test/data.json";
      const jsonData = { name: "test", value: 123 };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(jsonData));

      const result = getJsonFile<typeof jsonData>(filePath);

      expect(result).toEqual(jsonData);
    });

    it("should return undefined for invalid JSON", () => {
      mockFs.readFileSync.mockReturnValue("invalid json {");

      const result = getJsonFile("/test/invalid.json");

      expect(result).toBeUndefined();
    });

    it("should return undefined when file read fails", () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("File not found");
      });

      const result = getJsonFile("/test/missing.json");

      expect(result).toBeUndefined();
    });
  });

  describe("FileOperationError", () => {
    it("should create error with proper message and properties", () => {
      const originalError = new Error("Original error");
      const error = new FileOperationError(
        "read",
        "/test/file.txt",
        originalError,
        2,
      );

      expect(error.message).toBe(
        "read failed for /test/file.txt: Original error",
      );
      expect(error.name).toBe("FileOperationError");
      expect(error.operation).toBe("read");
      expect(error.filePath).toBe("/test/file.txt");
      expect(error.originalError).toBe(originalError);
      expect(error.retryAttempt).toBe(2);
    });
  });

  describe("Semaphore", () => {
    it("should control concurrent access", async () => {
      const semaphore = new Semaphore(2);
      const results: number[] = [];
      let concurrent = 0;
      let maxConcurrent = 0;

      const task = async (id: number) => {
        await semaphore.acquire();
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);

        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(id);

        concurrent--;
        semaphore.release();
      };

      await Promise.all([task(1), task(2), task(3), task(4)]);

      expect(results).toHaveLength(4);
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it("should work with withLock helper", async () => {
      const semaphore = new Semaphore(1);
      const results: number[] = [];

      const task = (id: number) =>
        semaphore.withLock(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(id);
          return id;
        });

      const values = await Promise.all([task(1), task(2), task(3)]);

      expect(values).toEqual([1, 2, 3]);
      expect(results).toEqual([1, 2, 3]);
    });

    it("should report available permits correctly", () => {
      const semaphore = new Semaphore(3);

      expect(semaphore.availablePermits).toBe(3);

      semaphore.acquire();
      expect(semaphore.availablePermits).toBe(2);

      semaphore.release();
      expect(semaphore.availablePermits).toBe(3);
    });
  });

  describe("getConcurrencyLimit", () => {
    it("should calculate reasonable concurrency limit", () => {
      mockOs.cpus.mockReturnValue(new Array(4));
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB

      const limit = getConcurrencyLimit();

      expect(limit).toBe(8); // 4 CPUs * 2
      expect(limit).toBeLessThanOrEqual(32);
    });

    it("should cap at 32 even with many CPUs", () => {
      mockOs.cpus.mockReturnValue(new Array(32));
      mockOs.totalmem.mockReturnValue(64 * 1024 * 1024 * 1024); // 64GB

      const limit = getConcurrencyLimit();

      expect(limit).toBe(32);
    });
  });

  describe("AsyncBatchProcessor", () => {
    it("should process items with controlled concurrency", async () => {
      const processor = new AsyncBatchProcessor<number, string>(2);
      const items = [1, 2, 3, 4, 5];
      let concurrent = 0;
      let maxConcurrent = 0;

      const results = await processor.process(items, async (item) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrent--;
        return `processed-${item}`;
      });

      expect(results).toEqual([
        "processed-1",
        "processed-2",
        "processed-3",
        "processed-4",
        "processed-5",
      ]);
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it("should call progress callback", async () => {
      const processor = new AsyncBatchProcessor<number, string>(2);
      const progressUpdates: Array<[number, number]> = [];

      await processor.process(
        [1, 2, 3],
        async (item) => `processed-${item}`,
        (completed, total) => progressUpdates.push([completed, total]),
      );

      expect(progressUpdates).toContainEqual([1, 3]);
      expect(progressUpdates).toContainEqual([2, 3]);
      expect(progressUpdates).toContainEqual([3, 3]);
    });
  });

  describe("readFileAsync", () => {
    beforeEach(() => {
      mockFs.promises = {
        readFile: jest.fn(),
      } as any;
    });

    it("should read file successfully", async () => {
      const content = "file content";
      mockFs.promises.readFile.mockResolvedValue(content);

      const result = await readFileAsync("/test/file.txt");

      expect(result).toBe(content);
      expect(mockFs.promises.readFile).toHaveBeenCalledWith(
        "/test/file.txt",
        "utf8",
      );
    });

    it("should retry on retryable errors", async () => {
      const content = "file content";
      mockFs.promises.readFile
        .mockRejectedValueOnce({ code: "EBUSY" })
        .mockResolvedValueOnce(content);

      const result = await readFileAsync("/test/file.txt");

      expect(result).toBe(content);
      expect(mockFs.promises.readFile).toHaveBeenCalledTimes(2);
    });

    it("should throw FileOperationError after max retries", async () => {
      const error = { code: "EBUSY", message: "Resource busy" };
      mockFs.promises.readFile.mockRejectedValue(error);

      await expect(
        readFileAsync("/test/file.txt", "utf8", {
          ...DEFAULT_RETRY_CONFIG,
          maxAttempts: 2,
          delayMs: 1,
        }),
      ).rejects.toThrow(FileOperationError);

      expect(mockFs.promises.readFile).toHaveBeenCalledTimes(2);
    });

    it("should not retry on non-retryable errors", async () => {
      const error = new Error("Permission denied");
      mockFs.promises.readFile.mockRejectedValue(error);

      await expect(readFileAsync("/test/file.txt")).rejects.toThrow(
        FileOperationError,
      );
      expect(mockFs.promises.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe("writeFileAsync", () => {
    beforeEach(() => {
      mockFs.promises = {
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        rename: jest.fn(),
        unlink: jest.fn(),
      } as any;
    });

    it("should write file atomically", async () => {
      const data = "file content";
      const filePath = "/test/file.txt";

      await writeFileAsync(filePath, data);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(".tmp."),
        data,
        "utf8",
      );
      expect(mockFs.promises.mkdir).toHaveBeenCalledWith(
        path.dirname(filePath),
        { recursive: true },
      );
      expect(mockFs.promises.rename).toHaveBeenCalled();
    });

    it("should cleanup temp file on failure", async () => {
      const error = new Error("Write failed");
      mockFs.promises.writeFile.mockRejectedValue(error);

      await expect(writeFileAsync("/test/file.txt", "data")).rejects.toThrow();

      expect(mockFs.promises.unlink).toHaveBeenCalled();
    });

    it("should handle Buffer data", async () => {
      const data = Buffer.from("binary data");

      await writeFileAsync("/test/file.bin", data);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(".tmp."),
        data,
        "utf8",
      );
    });
  });

  describe("fileExistsAsync", () => {
    beforeEach(() => {
      mockFs.promises = {
        access: jest.fn(),
      } as any;
      mockFs.constants = {
        F_OK: 0,
      } as any;
    });

    it("should return true for existing file", async () => {
      mockFs.promises.access.mockResolvedValue(undefined);

      const exists = await fileExistsAsync("/test/file.txt");

      expect(exists).toBe(true);
    });

    it("should return false for non-existent file", async () => {
      mockFs.promises.access.mockRejectedValue(new Error("ENOENT"));

      const exists = await fileExistsAsync("/test/missing.txt");

      expect(exists).toBe(false);
    });
  });

  describe("AsyncFileUtils", () => {
    let asyncFileUtils: AsyncFileUtils;

    beforeEach(() => {
      asyncFileUtils = new AsyncFileUtils(2);
      mockFs.promises = {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        rename: jest.fn(),
        unlink: jest.fn(),
        statfs: jest.fn(),
      } as any;
    });

    describe("readFiles", () => {
      it("should read multiple files concurrently", async () => {
        mockFs.promises.readFile
          .mockResolvedValueOnce("content1")
          .mockResolvedValueOnce("content2")
          .mockResolvedValueOnce("content3");

        const results = await asyncFileUtils.readFiles([
          "/file1.txt",
          "/file2.txt",
          "/file3.txt",
        ]);

        expect(results).toEqual([
          { path: "/file1.txt", content: "content1" },
          { path: "/file2.txt", content: "content2" },
          { path: "/file3.txt", content: "content3" },
        ]);
      });

      it("should handle errors gracefully", async () => {
        mockFs.promises.readFile
          .mockResolvedValueOnce("content1")
          .mockRejectedValueOnce(new Error("Read failed"))
          .mockResolvedValueOnce("content3");

        const results = await asyncFileUtils.readFiles([
          "/file1.txt",
          "/file2.txt",
          "/file3.txt",
        ]);

        expect(results[0].content).toBe("content1");
        expect(results[1].error).toBeDefined();
        expect(results[2].content).toBe("content3");
      });
    });

    describe("writeFiles", () => {
      it("should write multiple files concurrently", async () => {
        const files = [
          { path: "/file1.txt", content: "content1" },
          { path: "/file2.txt", content: "content2" },
        ];

        const results = await asyncFileUtils.writeFiles(files);

        expect(results).toEqual([
          { path: "/file1.txt", success: true },
          { path: "/file2.txt", success: true },
        ]);
      });

      it("should handle write errors", async () => {
        mockFs.promises.writeFile
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error("Write failed"));

        const files = [
          { path: "/file1.txt", content: "content1" },
          { path: "/file2.txt", content: "content2" },
        ];

        const results = await asyncFileUtils.writeFiles(files);

        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(false);
        expect(results[1].error).toBeDefined();
      });
    });

    describe("checkDiskSpace", () => {
      it("should return disk space info", async () => {
        mockFs.promises.statfs.mockResolvedValue({
          bavail: 1000,
          blocks: 2000,
          bsize: 4096,
        } as any);

        const space = await asyncFileUtils.checkDiskSpace("/test/file.txt");

        expect(space.available).toBe(1000 * 4096);
        expect(space.total).toBe(2000 * 4096);
      });

      it("should throw FileOperationError on failure", async () => {
        mockFs.promises.statfs.mockRejectedValue(new Error("statfs failed"));

        await expect(
          asyncFileUtils.checkDiskSpace("/test/file.txt"),
        ).rejects.toThrow(FileOperationError);
      });
    });
  });

  describe("getJsonFileAsync", () => {
    beforeEach(() => {
      mockFs.promises = {
        readFile: jest.fn(),
      } as any;
    });

    it("should parse JSON file successfully", async () => {
      const jsonData = { test: "data" };
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify(jsonData));

      const result = await getJsonFileAsync("/test/data.json");

      expect(result).toEqual(jsonData);
    });

    it("should throw FileOperationError for invalid JSON", async () => {
      mockFs.promises.readFile.mockResolvedValue("invalid json");

      await expect(getJsonFileAsync("/test/invalid.json")).rejects.toThrow(
        FileOperationError,
      );
    });
  });

  describe("writeJsonFileAsync", () => {
    beforeEach(() => {
      mockFs.promises = {
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        rename: jest.fn(),
        unlink: jest.fn(),
      } as any;
    });

    it("should write JSON with proper formatting", async () => {
      const data = { test: "data", nested: { value: 123 } };

      await writeJsonFileAsync("/test/data.json", data);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(".tmp."),
        JSON.stringify(data, null, 2),
        "utf8",
      );
    });
  });
});

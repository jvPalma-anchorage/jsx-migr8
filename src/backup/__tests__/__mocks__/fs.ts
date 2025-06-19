/**
 * Mock implementation of Node.js fs module for testing
 * Provides in-memory file system simulation with error injection
 */
import { EventEmitter } from "events";
import path from "node:path";
import { Readable, Writable } from "stream";
import { errorSimulator } from "../helpers/jest-setup";

export interface MockFileStats {
  isFile(): boolean;
  isDirectory(): boolean;
  size: number;
  mtime: Date;
  ctime: Date;
  ino: number;
  dev: number;
}

export interface MockFileSystemEntry {
  type: "file" | "directory";
  content?: string;
  stats: MockFileStats;
  children?: Map<string, MockFileSystemEntry>;
}

class MockFileSystem {
  private files = new Map<string, MockFileSystemEntry>();
  private nextIno = 1;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.files.clear();
    this.nextIno = 1;

    // Create root directory
    this.files.set("/", {
      type: "directory",
      children: new Map(),
      stats: this.createStats("directory", 0),
    });
  }

  private createStats(type: "file" | "directory", size: number): MockFileStats {
    const now = new Date();
    const ino = this.nextIno++;

    return {
      isFile: () => type === "file",
      isDirectory: () => type === "directory",
      size,
      mtime: now,
      ctime: now,
      ino,
      dev: 1,
    };
  }

  private normalizePath(filePath: string): string {
    return path.posix.normalize(path.posix.resolve("/", filePath));
  }

  private getParentPath(filePath: string): string {
    return path.posix.dirname(filePath);
  }

  private getBaseName(filePath: string): string {
    return path.posix.basename(filePath);
  }

  exists(filePath: string): boolean {
    const normalizedPath = this.normalizePath(filePath);
    return this.files.has(normalizedPath);
  }

  get(filePath: string): MockFileSystemEntry | undefined {
    const normalizedPath = this.normalizePath(filePath);
    return this.files.get(normalizedPath);
  }

  set(filePath: string, content: string): void {
    const normalizedPath = this.normalizePath(filePath);
    const parentPath = this.getParentPath(normalizedPath);

    // Ensure parent directory exists
    this.ensureDirectory(parentPath);

    // Create file entry
    const entry: MockFileSystemEntry = {
      type: "file",
      content,
      stats: this.createStats("file", Buffer.byteLength(content, "utf8")),
    };

    this.files.set(normalizedPath, entry);

    // Add to parent directory
    const parent = this.files.get(parentPath);
    if (parent && parent.children) {
      parent.children.set(this.getBaseName(normalizedPath), entry);
    }
  }

  mkdir(dirPath: string): void {
    const normalizedPath = this.normalizePath(dirPath);

    if (this.exists(normalizedPath)) {
      return; // Directory already exists
    }

    const parentPath = this.getParentPath(normalizedPath);
    this.ensureDirectory(parentPath);

    const entry: MockFileSystemEntry = {
      type: "directory",
      children: new Map(),
      stats: this.createStats("directory", 0),
    };

    this.files.set(normalizedPath, entry);

    // Add to parent directory
    const parent = this.files.get(parentPath);
    if (parent && parent.children) {
      parent.children.set(this.getBaseName(normalizedPath), entry);
    }
  }

  private ensureDirectory(dirPath: string): void {
    const normalizedPath = this.normalizePath(dirPath);

    if (normalizedPath === "/") {
      return; // Root already exists
    }

    if (!this.exists(normalizedPath)) {
      this.mkdir(normalizedPath);
    }
  }

  rm(
    filePath: string,
    options?: { recursive?: boolean; force?: boolean },
  ): void {
    const normalizedPath = this.normalizePath(filePath);
    const entry = this.files.get(normalizedPath);

    if (!entry) {
      if (options?.force) {
        return;
      }
      throw new Error(`ENOENT: no such file or directory, rm '${filePath}'`);
    }

    if (
      entry.type === "directory" &&
      entry.children?.size &&
      !options?.recursive
    ) {
      throw new Error(`ENOTEMPTY: directory not empty, rmdir '${filePath}'`);
    }

    // Remove from parent directory
    const parentPath = this.getParentPath(normalizedPath);
    const parent = this.files.get(parentPath);
    if (parent && parent.children) {
      parent.children.delete(this.getBaseName(normalizedPath));
    }

    // Remove entry and all children
    this.files.delete(normalizedPath);

    if (entry.type === "directory" && options?.recursive) {
      // Remove all child entries
      for (const [filePath] of this.files) {
        if (filePath.startsWith(normalizedPath + "/")) {
          this.files.delete(filePath);
        }
      }
    }
  }

  readdir(dirPath: string): string[] {
    const normalizedPath = this.normalizePath(dirPath);
    const entry = this.files.get(normalizedPath);

    if (!entry) {
      throw new Error(
        `ENOENT: no such file or directory, scandir '${dirPath}'`,
      );
    }

    if (entry.type !== "directory") {
      throw new Error(`ENOTDIR: not a directory, scandir '${dirPath}'`);
    }

    return Array.from(entry.children?.keys() || []);
  }

  readdirWithFileTypes(
    dirPath: string,
  ): Array<{ name: string; isDirectory(): boolean; isFile(): boolean }> {
    const normalizedPath = this.normalizePath(dirPath);
    const entry = this.files.get(normalizedPath);

    if (!entry) {
      throw new Error(
        `ENOENT: no such file or directory, scandir '${dirPath}'`,
      );
    }

    if (entry.type !== "directory") {
      throw new Error(`ENOTDIR: not a directory, scandir '${dirPath}'`);
    }

    const items: Array<{
      name: string;
      isDirectory(): boolean;
      isFile(): boolean;
    }> = [];

    if (entry.children) {
      for (const [name, childEntry] of entry.children) {
        items.push({
          name,
          isDirectory: () => childEntry.type === "directory",
          isFile: () => childEntry.type === "file",
        });
      }
    }

    return items;
  }

  rename(oldPath: string, newPath: string): void {
    const normalizedOldPath = this.normalizePath(oldPath);
    const normalizedNewPath = this.normalizePath(newPath);

    const entry = this.files.get(normalizedOldPath);
    if (!entry) {
      throw new Error(
        `ENOENT: no such file or directory, rename '${oldPath}' -> '${newPath}'`,
      );
    }

    // Remove from old location
    this.files.delete(normalizedOldPath);

    // Add to new location
    this.files.set(normalizedNewPath, entry);

    // Update parent directories
    const oldParent = this.files.get(this.getParentPath(normalizedOldPath));
    if (oldParent?.children) {
      oldParent.children.delete(this.getBaseName(normalizedOldPath));
    }

    this.ensureDirectory(this.getParentPath(normalizedNewPath));
    const newParent = this.files.get(this.getParentPath(normalizedNewPath));
    if (newParent?.children) {
      newParent.children.set(this.getBaseName(normalizedNewPath), entry);
    }
  }
}

// Global mock file system instance
const mockFileSystem = new MockFileSystem();

// Mock implementations
export const promises = {
  async readFile(filePath: string, encoding?: BufferEncoding): Promise<string> {
    const error = errorSimulator.shouldFail("readFile");
    if (error) throw error;

    const entry = mockFileSystem.get(filePath);
    if (!entry) {
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }

    if (entry.type !== "file") {
      throw new Error(`EISDIR: illegal operation on a directory, read`);
    }

    return entry.content || "";
  },

  async writeFile(
    filePath: string,
    data: string | Buffer,
    encoding?: BufferEncoding,
  ): Promise<void> {
    const error = errorSimulator.shouldFail("writeFile");
    if (error) throw error;

    const content =
      typeof data === "string" ? data : data.toString(encoding || "utf8");
    mockFileSystem.set(filePath, content);
  },

  async access(filePath: string, mode?: number): Promise<void> {
    const error = errorSimulator.shouldFail("access");
    if (error) throw error;

    if (!mockFileSystem.exists(filePath)) {
      throw new Error(
        `ENOENT: no such file or directory, access '${filePath}'`,
      );
    }
  },

  async stat(filePath: string): Promise<MockFileStats> {
    const error = errorSimulator.shouldFail("stat");
    if (error) throw error;

    const entry = mockFileSystem.get(filePath);
    if (!entry) {
      throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
    }

    return entry.stats;
  },

  async mkdir(
    dirPath: string,
    options?: { recursive?: boolean },
  ): Promise<string | undefined> {
    const error = errorSimulator.shouldFail("mkdir");
    if (error) throw error;

    try {
      mockFileSystem.mkdir(dirPath);
      return dirPath;
    } catch (err) {
      if (options?.recursive) {
        // Create parent directories
        const parent = path.dirname(dirPath);
        if (parent !== dirPath) {
          await this.mkdir(parent, options);
          mockFileSystem.mkdir(dirPath);
          return dirPath;
        }
      }
      throw err;
    }
  },

  async rm(
    filePath: string,
    options?: { recursive?: boolean; force?: boolean },
  ): Promise<void> {
    const error = errorSimulator.shouldFail("rm");
    if (error) throw error;

    mockFileSystem.rm(filePath, options);
  },

  async unlink(filePath: string): Promise<void> {
    const error = errorSimulator.shouldFail("unlink");
    if (error) throw error;

    mockFileSystem.rm(filePath);
  },

  async readdir(
    dirPath: string,
    options?: { withFileTypes?: boolean },
  ): Promise<
    | string[]
    | Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>
  > {
    const error = errorSimulator.shouldFail("readdir");
    if (error) throw error;

    if (options?.withFileTypes) {
      return mockFileSystem.readdirWithFileTypes(dirPath);
    }
    return mockFileSystem.readdir(dirPath);
  },

  async rename(oldPath: string, newPath: string): Promise<void> {
    const error = errorSimulator.shouldFail("rename");
    if (error) throw error;

    mockFileSystem.rename(oldPath, newPath);
  },

  async statfs(
    path: string,
  ): Promise<{ bavail: number; bsize: number; blocks: number }> {
    const error = errorSimulator.shouldFail("statfs");
    if (error) throw error;

    // Mock disk space: 10GB total, 5GB available
    return {
      bavail: (5 * 1024 * 1024 * 1024) / 4096, // 5GB in 4KB blocks
      bsize: 4096,
      blocks: (10 * 1024 * 1024 * 1024) / 4096, // 10GB in 4KB blocks
    };
  },
};

// Synchronous versions
export function readFileSync(
  filePath: string,
  encoding?: BufferEncoding,
): string {
  const error = errorSimulator.shouldFail("readFileSync");
  if (error) throw error;

  const entry = mockFileSystem.get(filePath);
  if (!entry) {
    throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
  }

  if (entry.type !== "file") {
    throw new Error(`EISDIR: illegal operation on a directory, read`);
  }

  return entry.content || "";
}

export function existsSync(filePath: string): boolean {
  return mockFileSystem.exists(filePath);
}

export function statSync(filePath: string): MockFileStats {
  const error = errorSimulator.shouldFail("statSync");
  if (error) throw error;

  const entry = mockFileSystem.get(filePath);
  if (!entry) {
    throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
  }

  return entry.stats;
}

export function readdirSync(dirPath: string): string[] {
  const error = errorSimulator.shouldFail("readdirSync");
  if (error) throw error;

  return mockFileSystem.readdir(dirPath);
}

// Stream implementations
export function createReadStream(
  filePath: string,
  options?: { encoding?: BufferEncoding; highWaterMark?: number },
): Readable {
  const content = mockFileSystem.get(filePath)?.content || "";

  return new Readable({
    read() {
      this.push(content);
      this.push(null); // End of stream
    },
  });
}

export function createWriteStream(
  filePath: string,
  options?: { encoding?: BufferEncoding },
): Writable {
  let content = "";

  return new Writable({
    write(chunk, encoding, callback) {
      content += chunk.toString();
      callback();
    },
    final(callback) {
      mockFileSystem.set(filePath, content);
      callback();
    },
  });
}

// Constants
export const constants = {
  F_OK: 0,
  R_OK: 4,
  W_OK: 2,
  X_OK: 1,
};

// Mock file system utilities for tests
export const mockFsUtils = {
  reset: () => mockFileSystem.reset(),
  setFile: (path: string, content: string) => mockFileSystem.set(path, content),
  getFile: (path: string) => mockFileSystem.get(path),
  mkdir: (path: string) => mockFileSystem.mkdir(path),
  exists: (path: string) => mockFileSystem.exists(path),
  listFiles: () => Array.from(mockFileSystem["files"].keys()),

  // Helper to create test file structure
  createStructure: (structure: Record<string, string>) => {
    for (const [filePath, content] of Object.entries(structure)) {
      mockFileSystem.set(filePath, content);
    }
  },
};

export default {
  promises,
  readFileSync,
  existsSync,
  statSync,
  readdirSync,
  createReadStream,
  createWriteStream,
  constants,
  mockFsUtils,
};

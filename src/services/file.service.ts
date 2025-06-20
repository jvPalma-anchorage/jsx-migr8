/**
 * File service implementation
 */

import { promises as fs } from 'node:fs';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { IFileService, IConfigurationService } from '../di/types';

export class FileService implements IFileService {
  constructor(private configService: IConfigurationService) {}

  async initialize(): Promise<void> {
    // Any initialization logic
  }

  async dispose(): Promise<void> {
    // Cleanup if needed
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  readFileSync(filePath: string): string {
    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await this.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  writeFileSync(filePath: string, content: string): void {
    try {
      this.ensureDirSync(path.dirname(filePath));
      writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  fileExistsSync(filePath: string): boolean {
    return existsSync(filePath);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  ensureDirSync(dirPath: string): void {
    try {
      require('fs').mkdirSync(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async glob(pattern: string, options: { cwd?: string; absolute?: boolean; ignore?: string[] } = {}): Promise<string[]> {
    try {
      const defaultOptions = {
        cwd: options.cwd || this.configService.getRootPath(),
        absolute: options.absolute ?? true,
        ignore: options.ignore || this.configService.getIgnorePatterns(),
      };

      return await fg(pattern, defaultOptions);
    } catch (error) {
      throw new Error(`Failed to glob pattern ${pattern}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  globSync(pattern: string, options: { cwd?: string; absolute?: boolean; ignore?: string[] } = {}): string[] {
    try {
      const defaultOptions = {
        cwd: options.cwd || this.configService.getRootPath(),
        absolute: options.absolute ?? true,
        ignore: options.ignore || this.configService.getIgnorePatterns(),
      };

      return fg.sync(pattern, defaultOptions);
    } catch (error) {
      throw new Error(`Failed to glob pattern ${pattern}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getFileStats(filePath: string): Promise<{ size: number; mtime: Date }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to get file stats for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getFileStatsSync(filePath: string): { size: number; mtime: Date } {
    try {
      const stats = statSync(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to get file stats for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async readDir(dirPath: string): Promise<string[]> {
    try {
      return await fs.readdir(dirPath);
    } catch (error) {
      throw new Error(`Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await this.ensureDir(path.dirname(destinationPath));
      await fs.copyFile(sourcePath, destinationPath);
    } catch (error) {
      throw new Error(`Failed to copy file from ${sourcePath} to ${destinationPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await this.ensureDir(path.dirname(destinationPath));
      await fs.rename(sourcePath, destinationPath);
    } catch (error) {
      throw new Error(`Failed to move file from ${sourcePath} to ${destinationPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Utility methods for common file operations
  async readJsonFile<T = any>(filePath: string): Promise<T> {
    try {
      const content = await this.readFile(filePath);
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read JSON file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async writeJsonFile(filePath: string, data: any, pretty: boolean = true): Promise<void> {
    try {
      const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
      await this.writeFile(filePath, content);
    } catch (error) {
      throw new Error(`Failed to write JSON file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Find files matching specific patterns
  async findJSXFiles(rootPath?: string): Promise<string[]> {
    const searchPath = rootPath || this.configService.getRootPath();
    return this.glob(this.configService.getIncludePatterns(), { cwd: searchPath });
  }

  async findMigr8RuleFiles(): Promise<string[]> {
    const migr8Dir = this.configService.getMigr8RulesDir();
    
    if (!await this.fileExists(migr8Dir)) {
      return [];
    }

    return this.glob('*.json', { cwd: migr8Dir, absolute: true });
  }

  // Batch file operations
  async readMultipleFiles(filePaths: string[]): Promise<Array<{ path: string; content: string; error?: Error }>> {
    const results = await Promise.allSettled(
      filePaths.map(async (filePath) => ({
        path: filePath,
        content: await this.readFile(filePath),
      }))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          path: filePaths[index],
          content: '',
          error: result.reason,
        };
      }
    });
  }

  async writeMultipleFiles(files: Array<{ path: string; content: string }>): Promise<Array<{ path: string; success: boolean; error?: Error }>> {
    const results = await Promise.allSettled(
      files.map(async (file) => {
        await this.writeFile(file.path, file.content);
        return { path: file.path, success: true };
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          path: files[index].path,
          success: false,
          error: result.reason,
        };
      }
    });
  }

  // File path utilities
  resolveFromRoot(relativePath: string): string {
    return path.resolve(this.configService.getRootPath(), relativePath);
  }

  isInRoot(filePath: string): boolean {
    const rootPath = this.configService.getRootPath();
    const resolvedPath = path.resolve(filePath);
    return resolvedPath.startsWith(rootPath);
  }

  getRelativePath(filePath: string): string {
    const rootPath = this.configService.getRootPath();
    return path.relative(rootPath, filePath);
  }

  // Validation
  async validateFileAccess(filePath: string): Promise<{ readable: boolean; writable: boolean; error?: Error }> {
    try {
      // Check if file exists and is readable
      await fs.access(filePath, fs.constants.R_OK);
      const readable = true;

      // Check if file is writable
      let writable = false;
      try {
        await fs.access(filePath, fs.constants.W_OK);
        writable = true;
      } catch {
        // File might not be writable, but that's okay
      }

      return { readable, writable };
    } catch (error) {
      return {
        readable: false,
        writable: false,
        error: error as Error,
      };
    }
  }
}
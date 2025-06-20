/**
 * @jest-environment node
 */

import { FileService } from '../file.service';
import { IConfigurationService } from '../../di/types';
import { jest } from '@jest/globals';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

// Mock node:fs
jest.mock('node:fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn(),
    copyFile: jest.fn(),
    rename: jest.fn(),
    constants: {
      R_OK: 4,
      W_OK: 2,
    },
  },
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Mock fast-glob
jest.mock('fast-glob', () => ({
  __esModule: true,
  default: jest.fn(),
  sync: jest.fn(),
}));

// Mock require for mkdirSync
const mockRequire = jest.fn();
jest.mock('fs', () => ({
  mkdirSync: mockRequire,
}));
global.require = mockRequire as any;
mockRequire.mockReturnValue({ mkdirSync: jest.fn() });

describe('FileService', () => {
  let fileService: FileService;
  let mockConfigService: jest.Mocked<IConfigurationService>;
  let mockFs: jest.Mocked<typeof fs>;
  let mockFg: jest.Mocked<typeof fg>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock config service
    mockConfigService = {
      initialize: jest.fn(),
      dispose: jest.fn(),
      getRootPath: jest.fn().mockReturnValue('/test/project'),
      getBlacklist: jest.fn().mockReturnValue(['node_modules', 'dist']),
      getPackages: jest.fn().mockReturnValue([]),
      getRunArgs: jest.fn().mockReturnValue({}),
      getMigr8RulesDir: jest.fn().mockReturnValue('./migr8Rules'),
      getQueueDir: jest.fn().mockReturnValue('./queue'),
      isDebugMode: jest.fn().mockReturnValue(false),
      isQuietMode: jest.fn().mockReturnValue(false),
      getIncludePatterns: jest.fn().mockReturnValue(['**/*.{js,jsx,ts,tsx}']),
      getIgnorePatterns: jest.fn().mockReturnValue(['**/node_modules/**', '**/dist/**']),
    } as any;

    // Get mocked modules
    mockFs = fs as jest.Mocked<typeof fs>;
    mockFg = fg as jest.Mocked<typeof fg>;

    // Create service instance
    fileService = new FileService(mockConfigService);
  });

  describe('lifecycle methods', () => {
    it('should initialize without errors', async () => {
      await expect(fileService.initialize()).resolves.toBeUndefined();
    });

    it('should dispose without errors', async () => {
      await expect(fileService.dispose()).resolves.toBeUndefined();
    });
  });

  describe('readFile', () => {
    it('should read file successfully', async () => {
      const filePath = '/test/file.ts';
      const content = 'export const test = true;';
      mockFs.readFile.mockResolvedValue(content as any);

      const result = await fileService.readFile(filePath);

      expect(result).toBe(content);
      expect(mockFs.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });

    it('should throw error when file read fails', async () => {
      const filePath = '/test/nonexistent.ts';
      const error = new Error('ENOENT: no such file or directory');
      mockFs.readFile.mockRejectedValue(error);

      await expect(fileService.readFile(filePath)).rejects.toThrow(
        `Failed to read file ${filePath}: ${error.message}`
      );
    });

    it('should handle non-Error objects', async () => {
      const filePath = '/test/file.ts';
      mockFs.readFile.mockRejectedValue('string error');

      await expect(fileService.readFile(filePath)).rejects.toThrow(
        `Failed to read file ${filePath}: string error`
      );
    });
  });

  describe('readFileSync', () => {
    it('should read file synchronously', () => {
      const filePath = '/test/file.ts';
      const content = 'export const test = true;';
      const { readFileSync } = require('node:fs');
      readFileSync.mockReturnValue(content);

      const result = fileService.readFileSync(filePath);

      expect(result).toBe(content);
      expect(readFileSync).toHaveBeenCalledWith(filePath, 'utf-8');
    });

    it('should throw error when sync file read fails', () => {
      const filePath = '/test/nonexistent.ts';
      const error = new Error('ENOENT: no such file or directory');
      const { readFileSync } = require('node:fs');
      readFileSync.mockImplementation(() => { throw error; });

      expect(() => fileService.readFileSync(filePath)).toThrow(
        `Failed to read file ${filePath}: ${error.message}`
      );
    });
  });

  describe('writeFile', () => {
    it('should write file successfully', async () => {
      const filePath = '/test/output/file.ts';
      const content = 'export const test = true;';
      mockFs.mkdir.mockResolvedValue(undefined as any);
      mockFs.writeFile.mockResolvedValue(undefined as any);

      await fileService.writeFile(filePath, content);

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/output', { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(filePath, content, 'utf-8');
    });

    it('should throw error when file write fails', async () => {
      const filePath = '/test/file.ts';
      const content = 'content';
      const error = new Error('Permission denied');
      mockFs.mkdir.mockResolvedValue(undefined as any);
      mockFs.writeFile.mockRejectedValue(error);

      await expect(fileService.writeFile(filePath, content)).rejects.toThrow(
        `Failed to write file ${filePath}: ${error.message}`
      );
    });

    it('should throw error when directory creation fails', async () => {
      const filePath = '/test/output/file.ts';
      const content = 'content';
      const error = new Error('Permission denied');
      mockFs.mkdir.mockRejectedValue(error);

      await expect(fileService.writeFile(filePath, content)).rejects.toThrow(
        `Failed to create directory /test/output: ${error.message}`
      );
    });
  });

  describe('writeFileSync', () => {
    it('should write file synchronously', () => {
      const filePath = '/test/output/file.ts';
      const content = 'export const test = true;';
      const { writeFileSync } = require('node:fs');
      const mockMkdirSync = jest.fn();
      mockRequire.mockReturnValue({ mkdirSync: mockMkdirSync });

      fileService.writeFileSync(filePath, content);

      expect(mockMkdirSync).toHaveBeenCalledWith('/test/output', { recursive: true });
      expect(writeFileSync).toHaveBeenCalledWith(filePath, content, 'utf-8');
    });

    it('should throw error when sync file write fails', () => {
      const filePath = '/test/file.ts';
      const content = 'content';
      const error = new Error('Permission denied');
      const { writeFileSync } = require('node:fs');
      const mockMkdirSync = jest.fn();
      mockRequire.mockReturnValue({ mkdirSync: mockMkdirSync });
      writeFileSync.mockImplementation(() => { throw error; });

      expect(() => fileService.writeFileSync(filePath, content)).toThrow(
        `Failed to write file ${filePath}: ${error.message}`
      );
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      const filePath = '/test/file.ts';
      mockFs.access.mockResolvedValue(undefined as any);

      const result = await fileService.fileExists(filePath);

      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith(filePath);
    });

    it('should return false when file does not exist', async () => {
      const filePath = '/test/nonexistent.ts';
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await fileService.fileExists(filePath);

      expect(result).toBe(false);
    });
  });

  describe('fileExistsSync', () => {
    it('should return true when file exists synchronously', () => {
      const filePath = '/test/file.ts';
      const { existsSync } = require('node:fs');
      existsSync.mockReturnValue(true);

      const result = fileService.fileExistsSync(filePath);

      expect(result).toBe(true);
      expect(existsSync).toHaveBeenCalledWith(filePath);
    });

    it('should return false when file does not exist synchronously', () => {
      const filePath = '/test/nonexistent.ts';
      const { existsSync } = require('node:fs');
      existsSync.mockReturnValue(false);

      const result = fileService.fileExistsSync(filePath);

      expect(result).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const filePath = '/test/file.ts';
      mockFs.unlink.mockResolvedValue(undefined as any);

      await fileService.deleteFile(filePath);

      expect(mockFs.unlink).toHaveBeenCalledWith(filePath);
    });

    it('should throw error when file deletion fails', async () => {
      const filePath = '/test/file.ts';
      const error = new Error('Permission denied');
      mockFs.unlink.mockRejectedValue(error);

      await expect(fileService.deleteFile(filePath)).rejects.toThrow(
        `Failed to delete file ${filePath}: ${error.message}`
      );
    });
  });

  describe('ensureDir', () => {
    it('should create directory successfully', async () => {
      const dirPath = '/test/output';
      mockFs.mkdir.mockResolvedValue(undefined as any);

      await fileService.ensureDir(dirPath);

      expect(mockFs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it('should throw error when directory creation fails', async () => {
      const dirPath = '/test/output';
      const error = new Error('Permission denied');
      mockFs.mkdir.mockRejectedValue(error);

      await expect(fileService.ensureDir(dirPath)).rejects.toThrow(
        `Failed to create directory ${dirPath}: ${error.message}`
      );
    });
  });

  describe('ensureDirSync', () => {
    it('should create directory synchronously', () => {
      const dirPath = '/test/output';
      const mockMkdirSync = jest.fn();
      mockRequire.mockReturnValue({ mkdirSync: mockMkdirSync });

      fileService.ensureDirSync(dirPath);

      expect(mockMkdirSync).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it('should throw error when sync directory creation fails', () => {
      const dirPath = '/test/output';
      const error = new Error('Permission denied');
      const mockMkdirSync = jest.fn().mockImplementation(() => { throw error; });
      mockRequire.mockReturnValue({ mkdirSync: mockMkdirSync });

      expect(() => fileService.ensureDirSync(dirPath)).toThrow(
        `Failed to create directory ${dirPath}: ${error.message}`
      );
    });
  });

  describe('glob', () => {
    it('should glob files with default options', async () => {
      const pattern = '**/*.ts';
      const files = ['/test/project/file1.ts', '/test/project/file2.ts'];
      mockFg.mockResolvedValue(files as any);

      const result = await fileService.glob(pattern);

      expect(result).toEqual(files);
      expect(mockFg).toHaveBeenCalledWith(pattern, {
        cwd: '/test/project',
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });
    });

    it('should glob files with custom options', async () => {
      const pattern = '*.js';
      const files = ['/custom/path/file1.js'];
      const options = { cwd: '/custom/path', absolute: false, ignore: ['test/**'] };
      mockFg.mockResolvedValue(files as any);

      const result = await fileService.glob(pattern, options);

      expect(result).toEqual(files);
      expect(mockFg).toHaveBeenCalledWith(pattern, options);
    });

    it('should throw error when glob fails', async () => {
      const pattern = '**/*.ts';
      const error = new Error('Invalid pattern');
      mockFg.mockRejectedValue(error);

      await expect(fileService.glob(pattern)).rejects.toThrow(
        `Failed to glob pattern ${pattern}: ${error.message}`
      );
    });
  });

  describe('globSync', () => {
    it('should glob files synchronously', () => {
      const pattern = '**/*.ts';
      const files = ['/test/project/file1.ts', '/test/project/file2.ts'];
      mockFg.sync.mockReturnValue(files as any);

      const result = fileService.globSync(pattern);

      expect(result).toEqual(files);
      expect(mockFg.sync).toHaveBeenCalledWith(pattern, {
        cwd: '/test/project',
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });
    });

    it('should throw error when sync glob fails', () => {
      const pattern = '**/*.ts';
      const error = new Error('Invalid pattern');
      mockFg.sync.mockImplementation(() => { throw error; });

      expect(() => fileService.globSync(pattern)).toThrow(
        `Failed to glob pattern ${pattern}: ${error.message}`
      );
    });
  });

  describe('getFileStats', () => {
    it('should get file stats successfully', async () => {
      const filePath = '/test/file.ts';
      const stats = { size: 1024, mtime: new Date('2023-01-01') };
      mockFs.stat.mockResolvedValue(stats as any);

      const result = await fileService.getFileStats(filePath);

      expect(result).toEqual(stats);
      expect(mockFs.stat).toHaveBeenCalledWith(filePath);
    });

    it('should throw error when getting file stats fails', async () => {
      const filePath = '/test/nonexistent.ts';
      const error = new Error('ENOENT');
      mockFs.stat.mockRejectedValue(error);

      await expect(fileService.getFileStats(filePath)).rejects.toThrow(
        `Failed to get file stats for ${filePath}: ${error.message}`
      );
    });
  });

  describe('getFileStatsSync', () => {
    it('should get file stats synchronously', () => {
      const filePath = '/test/file.ts';
      const stats = { size: 1024, mtime: new Date('2023-01-01') };
      const { statSync } = require('node:fs');
      statSync.mockReturnValue(stats);

      const result = fileService.getFileStatsSync(filePath);

      expect(result).toEqual(stats);
      expect(statSync).toHaveBeenCalledWith(filePath);
    });

    it('should throw error when getting sync file stats fails', () => {
      const filePath = '/test/nonexistent.ts';
      const error = new Error('ENOENT');
      const { statSync } = require('node:fs');
      statSync.mockImplementation(() => { throw error; });

      expect(() => fileService.getFileStatsSync(filePath)).toThrow(
        `Failed to get file stats for ${filePath}: ${error.message}`
      );
    });
  });

  describe('readDir', () => {
    it('should read directory successfully', async () => {
      const dirPath = '/test/dir';
      const files = ['file1.ts', 'file2.ts'];
      mockFs.readdir.mockResolvedValue(files as any);

      const result = await fileService.readDir(dirPath);

      expect(result).toEqual(files);
      expect(mockFs.readdir).toHaveBeenCalledWith(dirPath);
    });

    it('should throw error when reading directory fails', async () => {
      const dirPath = '/test/nonexistent';
      const error = new Error('ENOENT');
      mockFs.readdir.mockRejectedValue(error);

      await expect(fileService.readDir(dirPath)).rejects.toThrow(
        `Failed to read directory ${dirPath}: ${error.message}`
      );
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      const sourcePath = '/test/source.ts';
      const destinationPath = '/test/output/dest.ts';
      mockFs.mkdir.mockResolvedValue(undefined as any);
      mockFs.copyFile.mockResolvedValue(undefined as any);

      await fileService.copyFile(sourcePath, destinationPath);

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/output', { recursive: true });
      expect(mockFs.copyFile).toHaveBeenCalledWith(sourcePath, destinationPath);
    });

    it('should throw error when copying file fails', async () => {
      const sourcePath = '/test/source.ts';
      const destinationPath = '/test/output/dest.ts';
      const error = new Error('Permission denied');
      mockFs.mkdir.mockResolvedValue(undefined as any);
      mockFs.copyFile.mockRejectedValue(error);

      await expect(fileService.copyFile(sourcePath, destinationPath)).rejects.toThrow(
        `Failed to copy file from ${sourcePath} to ${destinationPath}: ${error.message}`
      );
    });
  });

  describe('moveFile', () => {
    it('should move file successfully', async () => {
      const sourcePath = '/test/source.ts';
      const destinationPath = '/test/output/dest.ts';
      mockFs.mkdir.mockResolvedValue(undefined as any);
      mockFs.rename.mockResolvedValue(undefined as any);

      await fileService.moveFile(sourcePath, destinationPath);

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/output', { recursive: true });
      expect(mockFs.rename).toHaveBeenCalledWith(sourcePath, destinationPath);
    });

    it('should throw error when moving file fails', async () => {
      const sourcePath = '/test/source.ts';
      const destinationPath = '/test/output/dest.ts';
      const error = new Error('Permission denied');
      mockFs.mkdir.mockResolvedValue(undefined as any);
      mockFs.rename.mockRejectedValue(error);

      await expect(fileService.moveFile(sourcePath, destinationPath)).rejects.toThrow(
        `Failed to move file from ${sourcePath} to ${destinationPath}: ${error.message}`
      );
    });
  });

  describe('JSON file operations', () => {
    describe('readJsonFile', () => {
      it('should read and parse JSON file successfully', async () => {
        const filePath = '/test/config.json';
        const data = { name: 'test', version: '1.0.0' };
        const content = JSON.stringify(data);
        mockFs.readFile.mockResolvedValue(content as any);

        const result = await fileService.readJsonFile(filePath);

        expect(result).toEqual(data);
        expect(mockFs.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
      });

      it('should throw error when JSON parsing fails', async () => {
        const filePath = '/test/invalid.json';
        const content = '{ invalid json }';
        mockFs.readFile.mockResolvedValue(content as any);

        await expect(fileService.readJsonFile(filePath)).rejects.toThrow(
          `Failed to read JSON file ${filePath}`
        );
      });

      it('should throw error when file read fails', async () => {
        const filePath = '/test/nonexistent.json';
        const error = new Error('ENOENT');
        mockFs.readFile.mockRejectedValue(error);

        await expect(fileService.readJsonFile(filePath)).rejects.toThrow(
          `Failed to read JSON file ${filePath}: Failed to read file ${filePath}: ${error.message}`
        );
      });
    });

    describe('writeJsonFile', () => {
      it('should write JSON file with pretty formatting by default', async () => {
        const filePath = '/test/output/config.json';
        const data = { name: 'test', version: '1.0.0' };
        const expectedContent = JSON.stringify(data, null, 2);
        mockFs.mkdir.mockResolvedValue(undefined as any);
        mockFs.writeFile.mockResolvedValue(undefined as any);

        await fileService.writeJsonFile(filePath, data);

        expect(mockFs.writeFile).toHaveBeenCalledWith(filePath, expectedContent, 'utf-8');
      });

      it('should write JSON file without pretty formatting when disabled', async () => {
        const filePath = '/test/output/config.json';
        const data = { name: 'test', version: '1.0.0' };
        const expectedContent = JSON.stringify(data);
        mockFs.mkdir.mockResolvedValue(undefined as any);
        mockFs.writeFile.mockResolvedValue(undefined as any);

        await fileService.writeJsonFile(filePath, data, false);

        expect(mockFs.writeFile).toHaveBeenCalledWith(filePath, expectedContent, 'utf-8');
      });

      it('should throw error when JSON write fails', async () => {
        const filePath = '/test/config.json';
        const data = { name: 'test' };
        const error = new Error('Permission denied');
        mockFs.mkdir.mockResolvedValue(undefined as any);
        mockFs.writeFile.mockRejectedValue(error);

        await expect(fileService.writeJsonFile(filePath, data)).rejects.toThrow(
          `Failed to write JSON file ${filePath}: Failed to write file ${filePath}: ${error.message}`
        );
      });
    });
  });

  describe('specialized file operations', () => {
    describe('findJSXFiles', () => {
      it('should find JSX files in root path', async () => {
        const files = ['/test/project/component.tsx', '/test/project/utils.ts'];
        mockFg.mockResolvedValue(files as any);

        const result = await fileService.findJSXFiles();

        expect(result).toEqual(files);
        expect(mockFg).toHaveBeenCalledWith(['**/*.{js,jsx,ts,tsx}'], {
          cwd: '/test/project',
          absolute: true,
          ignore: ['**/node_modules/**', '**/dist/**'],
        });
      });

      it('should find JSX files in custom path', async () => {
        const customPath = '/custom/project';
        const files = ['/custom/project/component.tsx'];
        mockFg.mockResolvedValue(files as any);

        const result = await fileService.findJSXFiles(customPath);

        expect(result).toEqual(files);
        expect(mockFg).toHaveBeenCalledWith(['**/*.{js,jsx,ts,tsx}'], {
          cwd: customPath,
          absolute: true,
          ignore: ['**/node_modules/**', '**/dist/**'],
        });
      });
    });

    describe('findMigr8RuleFiles', () => {
      it('should find rule files when migr8 directory exists', async () => {
        const ruleFiles = ['/test/project/migr8Rules/rule1.json', '/test/project/migr8Rules/rule2.json'];
        mockFs.access.mockResolvedValue(undefined as any);
        mockFg.mockResolvedValue(ruleFiles as any);

        const result = await fileService.findMigr8RuleFiles();

        expect(result).toEqual(ruleFiles);
        expect(mockFs.access).toHaveBeenCalledWith('./migr8Rules');
        expect(mockFg).toHaveBeenCalledWith('*.json', {
          cwd: './migr8Rules',
          absolute: true,
        });
      });

      it('should return empty array when migr8 directory does not exist', async () => {
        mockFs.access.mockRejectedValue(new Error('ENOENT'));

        const result = await fileService.findMigr8RuleFiles();

        expect(result).toEqual([]);
      });
    });
  });

  describe('batch file operations', () => {
    describe('readMultipleFiles', () => {
      it('should read multiple files successfully', async () => {
        const filePaths = ['/test/file1.ts', '/test/file2.ts'];
        const contents = ['content1', 'content2'];
        mockFs.readFile
          .mockResolvedValueOnce(contents[0] as any)
          .mockResolvedValueOnce(contents[1] as any);

        const result = await fileService.readMultipleFiles(filePaths);

        expect(result).toEqual([
          { path: '/test/file1.ts', content: 'content1' },
          { path: '/test/file2.ts', content: 'content2' },
        ]);
      });

      it('should handle mixed success and failure', async () => {
        const filePaths = ['/test/file1.ts', '/test/nonexistent.ts'];
        const error = new Error('ENOENT');
        mockFs.readFile
          .mockResolvedValueOnce('content1' as any)
          .mockRejectedValueOnce(error);

        const result = await fileService.readMultipleFiles(filePaths);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ path: '/test/file1.ts', content: 'content1' });
        expect(result[1]).toEqual({
          path: '/test/nonexistent.ts',
          content: '',
          error: error,
        });
      });
    });

    describe('writeMultipleFiles', () => {
      it('should write multiple files successfully', async () => {
        const files = [
          { path: '/test/file1.ts', content: 'content1' },
          { path: '/test/file2.ts', content: 'content2' },
        ];
        mockFs.mkdir.mockResolvedValue(undefined as any);
        mockFs.writeFile.mockResolvedValue(undefined as any);

        const result = await fileService.writeMultipleFiles(files);

        expect(result).toEqual([
          { path: '/test/file1.ts', success: true },
          { path: '/test/file2.ts', success: true },
        ]);
      });

      it('should handle mixed success and failure', async () => {
        const files = [
          { path: '/test/file1.ts', content: 'content1' },
          { path: '/test/readonly.ts', content: 'content2' },
        ];
        const error = new Error('Permission denied');
        mockFs.mkdir.mockResolvedValue(undefined as any);
        mockFs.writeFile
          .mockResolvedValueOnce(undefined as any)
          .mockRejectedValueOnce(error);

        const result = await fileService.writeMultipleFiles(files);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ path: '/test/file1.ts', success: true });
        expect(result[1]).toEqual({
          path: '/test/readonly.ts',
          success: false,
          error: error,
        });
      });
    });
  });

  describe('path utilities', () => {
    describe('resolveFromRoot', () => {
      it('should resolve path from root', () => {
        const result = fileService.resolveFromRoot('src/components');
        expect(result).toBe(path.resolve('/test/project', 'src/components'));
      });
    });

    describe('isInRoot', () => {
      it('should return true for paths within root', () => {
        const result = fileService.isInRoot('/test/project/src/component.ts');
        expect(result).toBe(true);
      });

      it('should return false for paths outside root', () => {
        const result = fileService.isInRoot('/other/project/component.ts');
        expect(result).toBe(false);
      });

      it('should handle relative paths', () => {
        const result = fileService.isInRoot('../outside/component.ts');
        expect(result).toBe(false);
      });
    });

    describe('getRelativePath', () => {
      it('should return relative path from root', () => {
        const result = fileService.getRelativePath('/test/project/src/component.ts');
        expect(result).toBe('src/component.ts');
      });

      it('should handle paths outside root', () => {
        const result = fileService.getRelativePath('/other/project/component.ts');
        expect(result).toBe('../other/project/component.ts');
      });
    });
  });

  describe('file access validation', () => {
    describe('validateFileAccess', () => {
      it('should validate readable and writable file', async () => {
        const filePath = '/test/file.ts';
        mockFs.access.mockResolvedValue(undefined as any);

        const result = await fileService.validateFileAccess(filePath);

        expect(result).toEqual({ readable: true, writable: true });
        expect(mockFs.access).toHaveBeenCalledWith(filePath, mockFs.constants.R_OK);
        expect(mockFs.access).toHaveBeenCalledWith(filePath, mockFs.constants.W_OK);
      });

      it('should validate readable but not writable file', async () => {
        const filePath = '/test/readonly.ts';
        mockFs.access
          .mockResolvedValueOnce(undefined as any) // R_OK succeeds
          .mockRejectedValueOnce(new Error('Permission denied')); // W_OK fails

        const result = await fileService.validateFileAccess(filePath);

        expect(result).toEqual({ readable: true, writable: false });
      });

      it('should handle non-existent file', async () => {
        const filePath = '/test/nonexistent.ts';
        const error = new Error('ENOENT');
        mockFs.access.mockRejectedValue(error);

        const result = await fileService.validateFileAccess(filePath);

        expect(result).toEqual({
          readable: false,
          writable: false,
          error: error,
        });
      });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle circular JSON serialization', async () => {
      const filePath = '/test/circular.json';
      const circular: any = { name: 'test' };
      circular.self = circular;
      mockFs.mkdir.mockResolvedValue(undefined as any);

      await expect(fileService.writeJsonFile(filePath, circular)).rejects.toThrow(
        `Failed to write JSON file ${filePath}`
      );
    });

    it('should handle invalid file paths', async () => {
      const invalidPath = '\0invalid\0path';
      const error = new Error('Invalid path');
      mockFs.readFile.mockRejectedValue(error);

      await expect(fileService.readFile(invalidPath)).rejects.toThrow(
        `Failed to read file ${invalidPath}: ${error.message}`
      );
    });

    it('should handle empty file paths', async () => {
      const emptyPath = '';
      const error = new Error('Path cannot be empty');
      mockFs.readFile.mockRejectedValue(error);

      await expect(fileService.readFile(emptyPath)).rejects.toThrow(
        `Failed to read file ${emptyPath}: ${error.message}`
      );
    });
  });

  describe('performance considerations', () => {
    it('should handle large file batches', async () => {
      const filePaths = Array.from({ length: 100 }, (_, i) => `/test/file${i}.ts`);
      mockFs.readFile.mockResolvedValue('content' as any);

      const result = await fileService.readMultipleFiles(filePaths);

      expect(result).toHaveLength(100);
      expect(result.every(r => r.content === 'content')).toBe(true);
    });

    it('should handle glob patterns with many results', async () => {
      const pattern = '**/*.ts';
      const files = Array.from({ length: 1000 }, (_, i) => `/test/file${i}.ts`);
      mockFg.mockResolvedValue(files as any);

      const result = await fileService.glob(pattern);

      expect(result).toHaveLength(1000);
      expect(mockFg).toHaveBeenCalledTimes(1);
    });
  });
});
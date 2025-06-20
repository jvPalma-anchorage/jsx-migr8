/**
 * @file globalContext.test.ts
 * @description Comprehensive unit tests for global context management and initialization
 */

import { describe, it, expect, jest, beforeEach, afterEach, beforeAll } from '@jest/globals';
import path from 'node:path';
import * as globalContext from '../globalContext';
import * as buildGraphModule from '../../graph/buildGraph';
import * as backupManagerModule from '../../backup/backup-manager';
import * as validationModule from '../../validation';
import { FileOperationError } from '../../utils/fs-utils';

// Mock dependencies
jest.mock('node:path');
jest.mock('../../cli/config');
jest.mock('../../graph/buildGraph');
jest.mock('../../backup/backup-manager');
jest.mock('../../validation');
jest.mock('../../utils/logger');

const mockCliConfig = require('../../cli/config');
const mockBuildGraph = buildGraphModule as jest.Mocked<typeof buildGraphModule>;
const mockBackupManager = backupManagerModule as jest.Mocked<typeof backupManagerModule>;
const mockValidation = validationModule as jest.Mocked<typeof validationModule>;

describe('globalContext', () => {
  const mockRootPath = '/test/project';
  const mockBlacklist = ['node_modules', 'dist', 'build'];
  const mockArgv = {
    root: mockRootPath,
    blacklist: mockBlacklist.join(','),
    quiet: false,
    yolo: false,
    dryRun: false,
    showProps: false,
  };

  const mockGraph = {
    imports: [
      { source: 'react', specifiers: ['React'], filePath: '/test/Component.tsx' }
    ],
    jsx: [
      { name: 'Button', props: { type: 'primary' }, filePath: '/test/Component.tsx' }
    ],
    files: ['/test/Component.tsx'],
    packages: ['react']
  };

  beforeAll(() => {
    // Mock CLI config
    mockCliConfig.argv = mockArgv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset module state before each test
    jest.resetModules();
    
    // Mock path operations
    (path.resolve as jest.Mock).mockImplementation((p: string) => p.startsWith('/') ? p : `/test/${p}`);
    (path.join as jest.Mock).mockImplementation((...paths: string[]) => paths.join('/'));
    
    // Mock validation module
    mockValidation.getSecureContext.mockReturnValue({
      rootPath: mockRootPath,
      blacklist: mockBlacklist,
      isValid: true
    });
    mockValidation.logSecurityEvent.mockImplementation(() => {});
    
    // Mock graph building
    mockBuildGraph.buildGraph.mockReturnValue(mockGraph);
    mockBuildGraph.buildGraphAsync.mockResolvedValue({ 
      graph: mockGraph, 
      errors: [] 
    });
    mockBuildGraph.buildGraphAsyncBatched.mockResolvedValue({ 
      graph: mockGraph, 
      errors: [] 
    });
    
    // Mock backup manager
    mockBackupManager.initializeBackupManager.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getRootPath', () => {
    it('should return secure root path when available', () => {
      const result = globalContext.getRootPath();
      
      expect(result).toBe(mockRootPath);
      expect(mockValidation.getSecureContext).toHaveBeenCalled();
    });

    it('should fallback to argv.root when secure context fails', () => {
      mockValidation.getSecureContext.mockImplementation(() => {
        throw new Error('Secure context failed');
      });

      const result = globalContext.getRootPath();
      
      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'root-path-fallback',
        'warn',
        'Failed to get secure root path, using fallback',
        expect.any(Object)
      );
      expect(result).toBe(mockRootPath);
    });

    it('should fallback to process.cwd when no argv.root', () => {
      mockValidation.getSecureContext.mockImplementation(() => {
        throw new Error('Secure context failed');
      });
      const originalCwd = process.cwd();
      mockCliConfig.argv = { ...mockArgv, root: undefined };

      const result = globalContext.getRootPath();
      
      expect(path.resolve).toHaveBeenCalledWith(originalCwd);
    });
  });

  describe('initContext', () => {
    it('should initialize context successfully', async () => {
      await globalContext.initContext();
      
      const context = globalContext.getContext();
      
      expect(context.ROOT_PATH).toBe(mockRootPath);
      expect(context.BLACKLIST).toEqual(mockBlacklist);
      expect(context.graph).toEqual(mockGraph);
      expect(mockBuildGraph.buildGraph).toHaveBeenCalledWith(mockRootPath, mockBlacklist);
    });

    it('should initialize backup manager', async () => {
      await globalContext.initContext();
      
      expect(mockBackupManager.initializeBackupManager).toHaveBeenCalledWith(
        path.join(mockRootPath, '.migr8-backups'),
        expect.objectContaining({
          gitIntegration: true,
          autoCleanup: true,
          verifyAfterBackup: true,
          showProgress: true
        })
      );
    });

    it('should handle backup manager initialization failure', async () => {
      mockBackupManager.initializeBackupManager.mockImplementation(() => {
        throw new Error('Backup init failed');
      });

      await globalContext.initContext();
      
      // Should not throw, just log warning
      const context = globalContext.getContext();
      expect(context.ROOT_PATH).toBe(mockRootPath);
    });

    it('should log security events', async () => {
      await globalContext.initContext();
      
      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'context-initialization',
        'info',
        'Starting secure context initialization'
      );
      
      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'context-paths-set',
        'info',
        'Context paths configured',
        expect.objectContaining({
          rootPath: expect.any(String),
          blacklistCount: mockBlacklist.length
        })
      );
    });

    it('should handle secure context fallback', async () => {
      mockValidation.getSecureContext.mockImplementation(() => {
        throw new Error('Secure context not available');
      });

      await globalContext.initContext();
      
      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'context-init-fallback',
        'warn',
        'Failed to get secure context, using fallback initialization',
        expect.any(Object)
      );
    });
  });

  describe('initContextAsync', () => {
    it('should initialize context with async graph building', async () => {
      const result = await globalContext.initContextAsync({
        useAsync: true,
        concurrency: 4
      });
      
      expect(result.errors).toHaveLength(0);
      expect(mockBuildGraph.buildGraphAsync).toHaveBeenCalledWith(
        mockRootPath,
        mockBlacklist,
        expect.objectContaining({
          concurrency: 4
        })
      );
    });

    it('should use batched processing when requested', async () => {
      const result = await globalContext.initContextAsync({
        useAsync: true,
        useBatched: true,
        batchSize: 10,
        memoryLimitMB: 512
      });
      
      expect(result.errors).toHaveLength(0);
      expect(mockBuildGraph.buildGraphAsyncBatched).toHaveBeenCalledWith(
        mockRootPath,
        mockBlacklist,
        expect.objectContaining({
          batchSize: 10,
          memoryLimitMB: 512
        })
      );
    });

    it('should fallback to sync when useAsync is false', async () => {
      const result = await globalContext.initContextAsync({
        useAsync: false
      });
      
      expect(result.errors).toHaveLength(0);
      expect(mockBuildGraph.buildGraph).toHaveBeenCalled();
      expect(mockBuildGraph.buildGraphAsync).not.toHaveBeenCalled();
    });

    it('should handle async graph building errors', async () => {
      const mockError = new FileOperationError('buildGraph', '/test/file.tsx', new Error('Parse error'));
      mockBuildGraph.buildGraphAsync.mockResolvedValue({
        graph: mockGraph,
        errors: [mockError]
      });

      const result = await globalContext.initContextAsync({
        useAsync: true,
        onError: jest.fn()
      });
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe(mockError);
    });

    it('should provide progress updates', async () => {
      const onProgress = jest.fn();
      
      mockBuildGraph.buildGraphAsync.mockImplementation(async (root, blacklist, options) => {
        options.onProgress?.(50, 100, '50%');
        options.onProgress?.(100, 100, '100%');
        return { graph: mockGraph, errors: [] };
      });

      await globalContext.initContextAsync({
        useAsync: true,
        onProgress
      });
      
      expect(onProgress).toHaveBeenCalledWith(50, 100, '50%');
      expect(onProgress).toHaveBeenCalledWith(100, 100, '100%');
    });

    it('should fallback to sync on async failure', async () => {
      mockBuildGraph.buildGraphAsync.mockRejectedValue(new Error('Async failed'));
      
      const result = await globalContext.initContextAsync({
        useAsync: true
      });
      
      expect(mockBuildGraph.buildGraph).toHaveBeenCalled();
      expect(result.errors).toHaveLength(1);
    });

    it('should handle both async and sync failures', async () => {
      mockBuildGraph.buildGraphAsync.mockRejectedValue(new Error('Async failed'));
      mockBuildGraph.buildGraph.mockImplementation(() => {
        throw new Error('Sync failed');
      });
      
      const result = await globalContext.initContextAsync({
        useAsync: true
      });
      
      expect(result.errors).toHaveLength(2);
    });

    it('should handle batched processing with progress', async () => {
      const onProgress = jest.fn();
      
      mockBuildGraph.buildGraphAsyncBatched.mockImplementation(async (root, blacklist, options) => {
        // Simulate batch progress
        options.onProgress?.(25, 100, 1);
        options.onProgress?.(50, 100, 2);
        options.onProgress?.(100, 100, 4);
        return { graph: mockGraph, errors: [] };
      });

      await globalContext.initContextAsync({
        useAsync: true,
        useBatched: true,
        onProgress
      });
      
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenLastCalledWith(100, 100, 'Batch 4 - 100%');
    });

    it('should report graph statistics', async () => {
      const mockGraphWithStats = {
        ...mockGraph,
        imports: Array(50).fill(null).map((_, i) => ({ 
          source: `package-${i}`, 
          specifiers: ['Component'], 
          filePath: `/test/file-${i}.tsx` 
        })),
        jsx: Array(100).fill(null).map((_, i) => ({ 
          name: `Component${i}`, 
          props: {}, 
          filePath: `/test/file-${i}.tsx` 
        }))
      };

      mockBuildGraph.buildGraphAsync.mockResolvedValue({
        graph: mockGraphWithStats,
        errors: []
      });

      await globalContext.initContextAsync({ useAsync: true });
      
      const context = globalContext.getContext();
      expect(context.graph?.imports).toHaveLength(50);
      expect(context.graph?.jsx).toHaveLength(100);
    });

    it('should handle memory constraints', async () => {
      const memoryLimitMB = 256;
      
      await globalContext.initContextAsync({
        useAsync: true,
        useBatched: true,
        memoryLimitMB
      });
      
      expect(mockBuildGraph.buildGraphAsyncBatched).toHaveBeenCalledWith(
        mockRootPath,
        mockBlacklist,
        expect.objectContaining({
          memoryLimitMB
        })
      );
    });
  });

  describe('getContext', () => {
    it('should return current context state', () => {
      const context = globalContext.getContext();
      
      expect(context).toHaveProperty('ROOT_PATH');
      expect(context).toHaveProperty('BLACKLIST');
      expect(context).toHaveProperty('PACKAGES');
      expect(context).toHaveProperty('report');
      expect(context).toHaveProperty('runArgs');
    });

    it('should return same instance on multiple calls', () => {
      const context1 = globalContext.getContext();
      const context2 = globalContext.getContext();
      
      expect(context1).toBe(context2);
    });

    it('should reflect state changes', async () => {
      await globalContext.initContext();
      
      const context = globalContext.getContext();
      expect(context.ROOT_PATH).toBe(mockRootPath);
      expect(context.graph).toEqual(mockGraph);
    });
  });

  describe('logger exports', () => {
    it('should export logger functions', () => {
      expect(globalContext.logger).toBeDefined();
      expect(globalContext.lSuccess).toBeDefined();
      expect(globalContext.lError).toBeDefined();
      expect(globalContext.lInfo).toBeDefined();
      expect(globalContext.lDbug).toBeDefined();
      expect(globalContext.lWarning).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle invalid blacklist format', async () => {
      mockValidation.getSecureContext.mockImplementation(() => {
        throw new Error('Invalid blacklist');
      });
      mockCliConfig.argv = { ...mockArgv, blacklist: 'invalid,,format,' };

      await globalContext.initContext();
      
      const context = globalContext.getContext();
      expect(context.BLACKLIST).toEqual(['invalid', 'format']);
    });

    it('should handle graph building failure gracefully', async () => {
      mockBuildGraph.buildGraph.mockImplementation(() => {
        throw new Error('Graph building failed');
      });

      // Should not throw, but context should still be initialized
      await expect(globalContext.initContext()).resolves.not.toThrow();
    });
  });

  describe('configuration validation', () => {
    it('should validate root path exists', async () => {
      await globalContext.initContext();
      
      expect(mockValidation.getSecureContext).toHaveBeenCalled();
    });

    it('should sanitize blacklist entries', async () => {
      mockValidation.getSecureContext.mockImplementation(() => {
        throw new Error('Fallback to manual parsing');
      });
      mockCliConfig.argv = { 
        ...mockArgv, 
        blacklist: 'node_modules, , dist,, build, ' 
      };

      await globalContext.initContext();
      
      const context = globalContext.getContext();
      expect(context.BLACKLIST).toEqual(['node_modules', 'dist', 'build']);
    });
  });

  describe('backup integration', () => {
    it('should configure backup with quiet mode', async () => {
      mockCliConfig.argv = { ...mockArgv, quiet: true };

      await globalContext.initContext();
      
      expect(mockBackupManager.initializeBackupManager).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          showProgress: false
        })
      );
    });

    it('should handle backup directory creation', async () => {
      const backupPath = path.join(mockRootPath, '.migr8-backups');

      await globalContext.initContext();
      
      expect(mockBackupManager.initializeBackupManager).toHaveBeenCalledWith(
        backupPath,
        expect.any(Object)
      );
    });
  });
});
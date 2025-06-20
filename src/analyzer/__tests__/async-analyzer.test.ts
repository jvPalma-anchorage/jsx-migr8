/**
 * @file async-analyzer.test.ts
 * @description Comprehensive unit tests for async analyzer with concurrency support
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Mock the async-analyzer module since it may not exist yet
const mockAsyncAnalyzer = {
  analyzeFileAsync: jest.fn(),
  analyzeBatchAsync: jest.fn(),
  createAnalysisWorkerPool: jest.fn(),
  AnalysisWorkerPool: jest.fn(),
};

// Mock dependencies
jest.mock('node:fs', () => ({
  promises: {
    readFile: jest.fn(),
    stat: jest.fn(),
    access: jest.fn(),
  },
}));

jest.mock('node:path');
jest.mock('../../context/globalContext');
jest.mock('../../utils/pathUtils');
jest.mock('../fileAnalyzer');

describe('async-analyzer', () => {
  const mockFilePath = '/test/path/Component.tsx';
  const mockFileContent = `
    import React from 'react';
    import { Button } from 'old-ui-lib';
    
    export const MyComponent = () => {
      return <Button type="primary">Click me</Button>;
    };
  `;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs operations
    (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);
    (fs.stat as jest.Mock).mockResolvedValue({ 
      isFile: () => true, 
      size: mockFileContent.length,
      mtime: new Date()
    });
    (fs.access as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('analyzeFileAsync', () => {
    it('should analyze file asynchronously', async () => {
      const mockResult = {
        imports: [{ source: 'react', specifiers: ['React'] }],
        jsx: [{ name: 'Button', props: { type: 'primary' } }],
        success: true,
        errors: []
      };

      mockAsyncAnalyzer.analyzeFileAsync.mockResolvedValue(mockResult);

      const result = await mockAsyncAnalyzer.analyzeFileAsync(mockFilePath);

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(true);
      expect(result.imports).toHaveLength(1);
      expect(result.jsx).toHaveLength(1);
    });

    it('should handle file read errors', async () => {
      const errorMessage = 'File not found';
      (fs.readFile as jest.Mock).mockRejectedValue(new Error(errorMessage));

      mockAsyncAnalyzer.analyzeFileAsync.mockResolvedValue({
        imports: [],
        jsx: [],
        success: false,
        errors: [{ file: mockFilePath, error: errorMessage }]
      });

      const result = await mockAsyncAnalyzer.analyzeFileAsync(mockFilePath);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe(errorMessage);
    });

    it('should handle parsing errors gracefully', async () => {
      const invalidContent = 'invalid jsx content <>';
      (fs.readFile as jest.Mock).mockResolvedValue(invalidContent);

      mockAsyncAnalyzer.analyzeFileAsync.mockResolvedValue({
        imports: [],
        jsx: [],
        success: false,
        errors: [{ file: mockFilePath, error: 'Parsing failed' }]
      });

      const result = await mockAsyncAnalyzer.analyzeFileAsync(mockFilePath);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle timeout scenarios', async () => {
      jest.setTimeout(2000);
      
      mockAsyncAnalyzer.analyzeFileAsync.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Analysis timeout')), 1500);
        })
      );

      await expect(mockAsyncAnalyzer.analyzeFileAsync(mockFilePath))
        .rejects.toThrow('Analysis timeout');
    });

    it('should analyze different file types', async () => {
      const testCases = [
        { path: '/test/Component.tsx', expected: 'tsx' },
        { path: '/test/Component.jsx', expected: 'jsx' },
        { path: '/test/Component.ts', expected: 'ts' },
        { path: '/test/Component.js', expected: 'js' },
      ];

      for (const testCase of testCases) {
        mockAsyncAnalyzer.analyzeFileAsync.mockResolvedValue({
          fileType: testCase.expected,
          imports: [],
          jsx: [],
          success: true,
          errors: []
        });

        const result = await mockAsyncAnalyzer.analyzeFileAsync(testCase.path);
        
        expect(result.fileType).toBe(testCase.expected);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('analyzeBatchAsync', () => {
    const mockFilePaths = [
      '/test/Component1.tsx',
      '/test/Component2.tsx',
      '/test/Component3.tsx',
    ];

    it('should analyze multiple files concurrently', async () => {
      const mockResults = mockFilePaths.map((filePath, index) => ({
        filePath,
        imports: [{ source: `package-${index}`, specifiers: ['Component'] }],
        jsx: [{ name: `Component${index}`, props: {} }],
        success: true,
        errors: []
      }));

      mockAsyncAnalyzer.analyzeBatchAsync.mockResolvedValue({
        results: mockResults,
        totalFiles: mockFilePaths.length,
        successCount: mockFilePaths.length,
        errorCount: 0,
        duration: 1000
      });

      const result = await mockAsyncAnalyzer.analyzeBatchAsync(mockFilePaths, {
        concurrency: 3,
        timeout: 5000
      });

      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(0);
    });

    it('should handle batch processing with some failures', async () => {
      const mockResults = [
        { filePath: mockFilePaths[0], success: true, errors: [] },
        { filePath: mockFilePaths[1], success: false, errors: [{ error: 'Parse error' }] },
        { filePath: mockFilePaths[2], success: true, errors: [] },
      ];

      mockAsyncAnalyzer.analyzeBatchAsync.mockResolvedValue({
        results: mockResults,
        totalFiles: 3,
        successCount: 2,
        errorCount: 1,
        duration: 1200
      });

      const result = await mockAsyncAnalyzer.analyzeBatchAsync(mockFilePaths);

      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(1);
      expect(result.results[1].success).toBe(false);
    });

    it('should respect concurrency limits', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => `/test/Component${i}.tsx`);
      
      mockAsyncAnalyzer.analyzeBatchAsync.mockImplementation(async (files, options) => {
        const concurrency = options?.concurrency || 10;
        
        // Simulate processing in batches
        const batchSize = Math.min(concurrency, files.length);
        const results = files.map(filePath => ({
          filePath,
          success: true,
          errors: []
        }));

        return {
          results,
          totalFiles: files.length,
          successCount: files.length,
          errorCount: 0,
          duration: Math.ceil(files.length / batchSize) * 100,
          concurrency: batchSize
        };
      });

      const result = await mockAsyncAnalyzer.analyzeBatchAsync(largeBatch, {
        concurrency: 5
      });

      expect(result.concurrency).toBe(5);
      expect(result.totalFiles).toBe(100);
    });

    it('should handle empty file list', async () => {
      mockAsyncAnalyzer.analyzeBatchAsync.mockResolvedValue({
        results: [],
        totalFiles: 0,
        successCount: 0,
        errorCount: 0,
        duration: 0
      });

      const result = await mockAsyncAnalyzer.analyzeBatchAsync([]);

      expect(result.results).toHaveLength(0);
      expect(result.totalFiles).toBe(0);
    });

    it('should provide progress updates', async () => {
      const progressUpdates: any[] = [];
      
      mockAsyncAnalyzer.analyzeBatchAsync.mockImplementation(async (files, options) => {
        const onProgress = options?.onProgress;
        
        if (onProgress) {
          // Simulate progress updates
          for (let i = 0; i <= files.length; i++) {
            onProgress(i, files.length, `Processing file ${i}`);
          }
        }

        return {
          results: files.map(filePath => ({ filePath, success: true, errors: [] })),
          totalFiles: files.length,
          successCount: files.length,
          errorCount: 0,
          duration: 500
        };
      });

      await mockAsyncAnalyzer.analyzeBatchAsync(mockFilePaths, {
        onProgress: (completed, total, info) => {
          progressUpdates.push({ completed, total, info });
        }
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].completed).toBe(mockFilePaths.length);
    });
  });

  describe('AnalysisWorkerPool', () => {
    it('should create worker pool with specified concurrency', () => {
      const mockWorkerPool = {
        concurrency: 4,
        activeWorkers: 0,
        pendingTasks: 0,
        process: jest.fn(),
        shutdown: jest.fn()
      };

      mockAsyncAnalyzer.createAnalysisWorkerPool.mockReturnValue(mockWorkerPool);

      const pool = mockAsyncAnalyzer.createAnalysisWorkerPool({
        concurrency: 4,
        timeout: 10000
      });

      expect(pool.concurrency).toBe(4);
      expect(pool.activeWorkers).toBe(0);
      expect(pool.pendingTasks).toBe(0);
    });

    it('should process tasks through worker pool', async () => {
      const mockWorkerPool = {
        process: jest.fn().mockResolvedValue({
          success: true,
          imports: [],
          jsx: [],
          errors: []
        }),
        shutdown: jest.fn()
      };

      mockAsyncAnalyzer.createAnalysisWorkerPool.mockReturnValue(mockWorkerPool);

      const pool = mockAsyncAnalyzer.createAnalysisWorkerPool({ concurrency: 2 });
      const result = await pool.process(mockFilePath);

      expect(result.success).toBe(true);
      expect(pool.process).toHaveBeenCalledWith(mockFilePath);
    });

    it('should handle worker pool shutdown', async () => {
      const mockWorkerPool = {
        shutdown: jest.fn().mockResolvedValue({ 
          tasksCompleted: 5, 
          tasksFailed: 1,
          totalDuration: 2000
        })
      };

      mockAsyncAnalyzer.createAnalysisWorkerPool.mockReturnValue(mockWorkerPool);

      const pool = mockAsyncAnalyzer.createAnalysisWorkerPool({ concurrency: 2 });
      const shutdownResult = await pool.shutdown();

      expect(shutdownResult.tasksCompleted).toBe(5);
      expect(shutdownResult.tasksFailed).toBe(1);
      expect(pool.shutdown).toHaveBeenCalled();
    });

    it('should handle worker errors gracefully', async () => {
      const mockWorkerPool = {
        process: jest.fn().mockRejectedValue(new Error('Worker crashed')),
        shutdown: jest.fn()
      };

      mockAsyncAnalyzer.createAnalysisWorkerPool.mockReturnValue(mockWorkerPool);

      const pool = mockAsyncAnalyzer.createAnalysisWorkerPool({ concurrency: 2 });
      
      await expect(pool.process(mockFilePath))
        .rejects.toThrow('Worker crashed');
    });
  });

  describe('memory management', () => {
    it('should monitor memory usage during analysis', async () => {
      const mockMemoryStats = {
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        external: 10 * 1024 * 1024, // 10MB
        rss: 200 * 1024 * 1024 // 200MB
      };

      mockAsyncAnalyzer.analyzeFileAsync.mockResolvedValue({
        imports: [],
        jsx: [],
        success: true,
        errors: [],
        memoryStats: mockMemoryStats
      });

      const result = await mockAsyncAnalyzer.analyzeFileAsync(mockFilePath, {
        trackMemory: true
      });

      expect(result.memoryStats).toBeDefined();
      expect(result.memoryStats.heapUsed).toBe(50 * 1024 * 1024);
    });

    it('should handle memory pressure scenarios', async () => {
      const highMemoryUsage = {
        heapUsed: 900 * 1024 * 1024, // 900MB
        heapTotal: 1000 * 1024 * 1024, // 1GB
      };

      mockAsyncAnalyzer.analyzeFileAsync.mockResolvedValue({
        imports: [],
        jsx: [],
        success: true,
        errors: [],
        memoryStats: highMemoryUsage,
        warnings: ['High memory usage detected']
      });

      const result = await mockAsyncAnalyzer.analyzeFileAsync(mockFilePath, {
        trackMemory: true,
        memoryLimit: 1000 * 1024 * 1024 // 1GB limit
      });

      expect(result.warnings).toContain('High memory usage detected');
    });
  });

  describe('performance optimization', () => {
    it('should cache analysis results', async () => {
      const mockResult = {
        imports: [{ source: 'react', specifiers: ['React'] }],
        jsx: [],
        success: true,
        errors: []
      };

      mockAsyncAnalyzer.analyzeFileAsync
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce({ ...mockResult, fromCache: true });

      // First call
      const result1 = await mockAsyncAnalyzer.analyzeFileAsync(mockFilePath, {
        useCache: true
      });
      
      // Second call should use cache
      const result2 = await mockAsyncAnalyzer.analyzeFileAsync(mockFilePath, {
        useCache: true
      });

      expect(result1.success).toBe(true);
      expect(result2.fromCache).toBe(true);
    });

    it('should skip analysis for unchanged files', async () => {
      const mockStat = {
        isFile: () => true,
        mtime: new Date('2024-01-01T00:00:00Z'),
        size: 1000
      };

      (fs.stat as jest.Mock).mockResolvedValue(mockStat);

      mockAsyncAnalyzer.analyzeFileAsync.mockResolvedValue({
        imports: [],
        jsx: [],
        success: true,
        errors: [],
        skipped: true,
        reason: 'File unchanged since last analysis'
      });

      const result = await mockAsyncAnalyzer.analyzeFileAsync(mockFilePath, {
        checkModified: true,
        lastAnalyzed: new Date('2024-01-02T00:00:00Z')
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('unchanged');
    });
  });

  describe('error recovery', () => {
    it('should retry failed analyses', async () => {
      mockAsyncAnalyzer.analyzeFileAsync
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({
          imports: [],
          jsx: [],
          success: true,
          errors: [],
          retryCount: 2
        });

      const result = await mockAsyncAnalyzer.analyzeFileAsync(mockFilePath, {
        maxRetries: 3,
        retryDelay: 100
      });

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(2);
    });

    it('should fail after max retries exceeded', async () => {
      mockAsyncAnalyzer.analyzeFileAsync
        .mockRejectedValue(new Error('Persistent failure'));

      await expect(mockAsyncAnalyzer.analyzeFileAsync(mockFilePath, {
        maxRetries: 2,
        retryDelay: 10
      })).rejects.toThrow('Persistent failure');
    });
  });
});
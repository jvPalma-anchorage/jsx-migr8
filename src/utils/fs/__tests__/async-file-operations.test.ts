/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { promises as fs } from 'node:fs';
import {
  readFileAsync,
  writeFileAsync,
  copyFileAsync,
  deleteFileAsync,
  ensureDirAsync,
  globAsync,
  processFilesBatch,
  processFilesParallel,
  processFilesConcurrent,
  createBatchProcessor,
  createConcurrentProcessor,
  TaskQueue,
  ProgressTracker,
} from '../async-file-operations';
import { FileOperationError } from '../error-handling';

// Mock dependencies
jest.mock('node:fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    copyFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
  },
}));

jest.mock('fast-glob', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../error-handling', () => ({
  FileOperationError: jest.fn().mockImplementation((operation, filePath, originalError) => {
    const error = new Error(`${operation} failed for ${filePath}: ${originalError.message}`);
    error.name = 'FileOperationError';
    error.operation = operation;
    error.filePath = filePath;
    error.originalError = originalError;
    return error;
  }),
}));

describe('async-file-operations', () => {
  let mockFs: jest.Mocked<typeof fs>;
  let mockGlob: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs = fs as jest.Mocked<typeof fs>;
    const fg = require('fast-glob');
    mockGlob = fg.default;
  });

  describe('basic async file operations', () => {
    describe('readFileAsync', () => {
      it('should read file successfully', async () => {
        const filePath = '/test/file.txt';
        const content = 'file content';
        
        mockFs.readFile.mockResolvedValue(content as any);

        const result = await readFileAsync(filePath);

        expect(result).toBe(content);
        expect(mockFs.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
      });

      it('should read file with custom encoding', async () => {
        const filePath = '/test/binary.bin';
        const content = Buffer.from('binary content');
        
        mockFs.readFile.mockResolvedValue(content);

        const result = await readFileAsync(filePath, 'binary');

        expect(result).toBe(content);
        expect(mockFs.readFile).toHaveBeenCalledWith(filePath, 'binary');
      });

      it('should throw FileOperationError on failure', async () => {
        const filePath = '/test/nonexistent.txt';
        const error = new Error('ENOENT: no such file or directory');
        
        mockFs.readFile.mockRejectedValue(error);

        await expect(readFileAsync(filePath)).rejects.toThrow('readFile failed for');
      });
    });

    describe('writeFileAsync', () => {
      it('should write file successfully', async () => {
        const filePath = '/test/output.txt';
        const content = 'new content';
        
        mockFs.writeFile.mockResolvedValue(undefined as any);

        await writeFileAsync(filePath, content);

        expect(mockFs.writeFile).toHaveBeenCalledWith(filePath, content, 'utf-8');
      });

      it('should write file with custom encoding', async () => {
        const filePath = '/test/binary.bin';
        const content = Buffer.from('binary data');
        
        mockFs.writeFile.mockResolvedValue(undefined as any);

        await writeFileAsync(filePath, content, 'binary');

        expect(mockFs.writeFile).toHaveBeenCalledWith(filePath, content, 'binary');
      });

      it('should throw FileOperationError on failure', async () => {
        const filePath = '/readonly/file.txt';
        const content = 'content';
        const error = new Error('EACCES: permission denied');
        
        mockFs.writeFile.mockRejectedValue(error);

        await expect(writeFileAsync(filePath, content)).rejects.toThrow('writeFile failed for');
      });
    });

    describe('copyFileAsync', () => {
      it('should copy file successfully', async () => {
        const source = '/test/source.txt';
        const dest = '/test/dest.txt';
        
        mockFs.copyFile.mockResolvedValue(undefined as any);

        await copyFileAsync(source, dest);

        expect(mockFs.copyFile).toHaveBeenCalledWith(source, dest);
      });

      it('should throw FileOperationError on failure', async () => {
        const source = '/test/nonexistent.txt';
        const dest = '/test/dest.txt';
        const error = new Error('ENOENT: no such file or directory');
        
        mockFs.copyFile.mockRejectedValue(error);

        await expect(copyFileAsync(source, dest)).rejects.toThrow('copyFile failed for');
      });
    });

    describe('deleteFileAsync', () => {
      it('should delete file successfully', async () => {
        const filePath = '/test/file.txt';
        
        mockFs.unlink.mockResolvedValue(undefined as any);

        await deleteFileAsync(filePath);

        expect(mockFs.unlink).toHaveBeenCalledWith(filePath);
      });

      it('should throw FileOperationError on failure', async () => {
        const filePath = '/test/protected.txt';
        const error = new Error('EACCES: permission denied');
        
        mockFs.unlink.mockRejectedValue(error);

        await expect(deleteFileAsync(filePath)).rejects.toThrow('deleteFile failed for');
      });
    });

    describe('ensureDirAsync', () => {
      it('should create directory successfully', async () => {
        const dirPath = '/test/new-dir';
        
        mockFs.mkdir.mockResolvedValue(undefined as any);

        await ensureDirAsync(dirPath);

        expect(mockFs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
      });

      it('should throw FileOperationError on failure', async () => {
        const dirPath = '/readonly/new-dir';
        const error = new Error('EACCES: permission denied');
        
        mockFs.mkdir.mockRejectedValue(error);

        await expect(ensureDirAsync(dirPath)).rejects.toThrow('ensureDir failed for');
      });
    });

    describe('globAsync', () => {
      it('should find files matching pattern', async () => {
        const pattern = '**/*.ts';
        const files = ['/test/file1.ts', '/test/file2.ts'];
        
        mockGlob.mockResolvedValue(files);

        const result = await globAsync(pattern);

        expect(result).toEqual(files);
        expect(mockGlob).toHaveBeenCalledWith(pattern, {});
      });

      it('should pass options to glob', async () => {
        const pattern = '*.js';
        const options = { cwd: '/test', ignore: ['node_modules'] };
        const files = ['/test/file.js'];
        
        mockGlob.mockResolvedValue(files);

        const result = await globAsync(pattern, options);

        expect(result).toEqual(files);
        expect(mockGlob).toHaveBeenCalledWith(pattern, options);
      });

      it('should throw FileOperationError on failure', async () => {
        const pattern = 'invalid[pattern';
        const error = new Error('Invalid glob pattern');
        
        mockGlob.mockRejectedValue(error);

        await expect(globAsync(pattern)).rejects.toThrow('glob failed for');
      });
    });
  });

  describe('batch processing', () => {
    describe('processFilesBatch', () => {
      it('should process files in batches', async () => {
        const files = ['/test/file1.txt', '/test/file2.txt', '/test/file3.txt'];
        const processor = jest.fn().mockImplementation(async (file) => `processed-${file}`);
        
        const results = await processFilesBatch(files, processor, { batchSize: 2 });

        expect(results).toEqual([
          'processed-/test/file1.txt',
          'processed-/test/file2.txt',
          'processed-/test/file3.txt',
        ]);
        expect(processor).toHaveBeenCalledTimes(3);
      });

      it('should handle empty file list', async () => {
        const files: string[] = [];
        const processor = jest.fn();
        
        const results = await processFilesBatch(files, processor);

        expect(results).toEqual([]);
        expect(processor).not.toHaveBeenCalled();
      });

      it('should handle processor errors gracefully', async () => {
        const files = ['/test/file1.txt', '/test/file2.txt'];
        const processor = jest.fn()
          .mockResolvedValueOnce('success')
          .mockRejectedValueOnce(new Error('Processing failed'));
        
        const results = await processFilesBatch(files, processor, { continueOnError: true });

        expect(results).toHaveLength(2);
        expect(results[0]).toBe('success');
        expect(results[1]).toBeInstanceOf(Error);
      });

      it('should stop on first error when continueOnError is false', async () => {
        const files = ['/test/file1.txt', '/test/file2.txt', '/test/file3.txt'];
        const processor = jest.fn()
          .mockResolvedValueOnce('success')
          .mockRejectedValueOnce(new Error('Processing failed'));
        
        await expect(processFilesBatch(files, processor, { continueOnError: false }))
          .rejects.toThrow('Processing failed');
        
        expect(processor).toHaveBeenCalledTimes(2);
      });

      it('should call progress callback', async () => {
        const files = ['/test/file1.txt', '/test/file2.txt'];
        const processor = jest.fn().mockImplementation(async (file) => `processed-${file}`);
        const onProgress = jest.fn();
        
        await processFilesBatch(files, processor, { onProgress });

        expect(onProgress).toHaveBeenCalledWith(1, 2);
        expect(onProgress).toHaveBeenCalledWith(2, 2);
      });
    });

    describe('processFilesParallel', () => {
      it('should process files in parallel', async () => {
        const files = ['/test/file1.txt', '/test/file2.txt', '/test/file3.txt'];
        const processor = jest.fn().mockImplementation(async (file) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return `processed-${file}`;
        });
        
        const start = Date.now();
        const results = await processFilesParallel(files, processor);
        const duration = Date.now() - start;

        expect(results).toHaveLength(3);
        expect(processor).toHaveBeenCalledTimes(3);
        // Should be faster than sequential processing
        expect(duration).toBeLessThan(30); // 3 files * 10ms would be 30ms sequentially
      });

      it('should limit concurrency', async () => {
        const files = Array.from({ length: 10 }, (_, i) => `/test/file${i}.txt`);
        let concurrentCount = 0;
        let maxConcurrent = 0;
        
        const processor = jest.fn().mockImplementation(async (file) => {
          concurrentCount++;
          maxConcurrent = Math.max(maxConcurrent, concurrentCount);
          await new Promise(resolve => setTimeout(resolve, 10));
          concurrentCount--;
          return `processed-${file}`;
        });
        
        await processFilesParallel(files, processor, { concurrency: 3 });

        expect(maxConcurrent).toBeLessThanOrEqual(3);
        expect(processor).toHaveBeenCalledTimes(10);
      });

      it('should handle errors in parallel processing', async () => {
        const files = ['/test/file1.txt', '/test/file2.txt', '/test/file3.txt'];
        const processor = jest.fn()
          .mockResolvedValueOnce('success1')
          .mockRejectedValueOnce(new Error('Failed'))
          .mockResolvedValueOnce('success3');
        
        const results = await processFilesParallel(files, processor, { continueOnError: true });

        expect(results).toHaveLength(3);
        expect(results[0]).toBe('success1');
        expect(results[1]).toBeInstanceOf(Error);
        expect(results[2]).toBe('success3');
      });
    });

    describe('processFilesConcurrent', () => {
      it('should process files with controlled concurrency', async () => {
        const files = Array.from({ length: 5 }, (_, i) => `/test/file${i}.txt`);
        const processor = jest.fn().mockImplementation(async (file) => `processed-${file}`);
        
        const results = await processFilesConcurrent(files, processor, { maxConcurrency: 2 });

        expect(results).toHaveLength(5);
        expect(processor).toHaveBeenCalledTimes(5);
      });

      it('should respect batch size and concurrency limits', async () => {
        const files = Array.from({ length: 10 }, (_, i) => `/test/file${i}.txt`);
        const processor = jest.fn().mockImplementation(async (file) => `processed-${file}`);
        
        const results = await processFilesConcurrent(files, processor, {
          maxConcurrency: 3,
          batchSize: 4,
        });

        expect(results).toHaveLength(10);
        expect(processor).toHaveBeenCalledTimes(10);
      });
    });
  });

  describe('TaskQueue', () => {
    it('should process tasks in order', async () => {
      const queue = new TaskQueue(2);
      const results: number[] = [];
      
      const task1 = queue.add(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        results.push(1);
        return 1;
      });
      
      const task2 = queue.add(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(2);
        return 2;
      });
      
      const task3 = queue.add(async () => {
        results.push(3);
        return 3;
      });

      const [result1, result2, result3] = await Promise.all([task1, task2, task3]);

      expect([result1, result2, result3]).toEqual([1, 2, 3]);
      expect(results).toEqual([2, 1, 3]); // Task 2 finishes first due to shorter delay
    });

    it('should respect concurrency limit', async () => {
      const queue = new TaskQueue(2);
      let runningTasks = 0;
      let maxConcurrent = 0;
      
      const createTask = (id: number) => queue.add(async () => {
        runningTasks++;
        maxConcurrent = Math.max(maxConcurrent, runningTasks);
        await new Promise(resolve => setTimeout(resolve, 50));
        runningTasks--;
        return id;
      });

      const tasks = Array.from({ length: 5 }, (_, i) => createTask(i));
      await Promise.all(tasks);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should handle task failures', async () => {
      const queue = new TaskQueue(2);
      
      const successTask = queue.add(async () => 'success');
      const failTask = queue.add(async () => {
        throw new Error('Task failed');
      });

      const successResult = await successTask;
      await expect(failTask).rejects.toThrow('Task failed');

      expect(successResult).toBe('success');
    });

    it('should provide queue statistics', async () => {
      const queue = new TaskQueue(1);
      
      expect(queue.size()).toBe(0);
      expect(queue.pending()).toBe(0);
      expect(queue.running()).toBe(0);

      const task1 = queue.add(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 1;
      });
      
      const task2 = queue.add(async () => 2);

      expect(queue.size()).toBe(2);
      expect(queue.pending()).toBe(1);
      expect(queue.running()).toBe(1);

      await Promise.all([task1, task2]);

      expect(queue.size()).toBe(0);
      expect(queue.pending()).toBe(0);
      expect(queue.running()).toBe(0);
    });

    it('should handle empty queue', async () => {
      const queue = new TaskQueue(2);
      
      expect(queue.size()).toBe(0);
      expect(queue.pending()).toBe(0);
      expect(queue.running()).toBe(0);
    });
  });

  describe('ProgressTracker', () => {
    it('should track progress correctly', () => {
      const onProgress = jest.fn();
      const tracker = new ProgressTracker(10, onProgress);

      expect(tracker.getProgress()).toEqual({
        completed: 0,
        total: 10,
        percentage: 0,
        remaining: 10,
      });

      tracker.increment();
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        completed: 1,
        total: 10,
        percentage: 10,
        remaining: 9,
      }));

      tracker.increment(3);
      expect(tracker.getProgress().completed).toBe(4);
      expect(tracker.getProgress().percentage).toBe(40);
    });

    it('should handle completion', () => {
      const onProgress = jest.fn();
      const tracker = new ProgressTracker(3, onProgress);

      tracker.increment(3);

      expect(tracker.getProgress().completed).toBe(3);
      expect(tracker.getProgress().percentage).toBe(100);
      expect(tracker.isComplete()).toBe(true);
    });

    it('should handle over-completion gracefully', () => {
      const onProgress = jest.fn();
      const tracker = new ProgressTracker(3, onProgress);

      tracker.increment(5);

      expect(tracker.getProgress().completed).toBe(3); // Capped at total
      expect(tracker.getProgress().percentage).toBe(100);
    });

    it('should work without progress callback', () => {
      const tracker = new ProgressTracker(5);

      expect(() => tracker.increment()).not.toThrow();
      expect(tracker.getProgress().completed).toBe(1);
    });

    it('should reset progress', () => {
      const tracker = new ProgressTracker(5);
      
      tracker.increment(3);
      expect(tracker.getProgress().completed).toBe(3);

      tracker.reset();
      expect(tracker.getProgress().completed).toBe(0);
      expect(tracker.getProgress().percentage).toBe(0);
    });

    it('should update total', () => {
      const tracker = new ProgressTracker(5);
      
      tracker.increment(2);
      tracker.setTotal(10);

      expect(tracker.getProgress().total).toBe(10);
      expect(tracker.getProgress().percentage).toBe(20);
    });
  });

  describe('batch and concurrent processors', () => {
    describe('createBatchProcessor', () => {
      it('should create batch processor with default options', () => {
        const processor = createBatchProcessor();
        
        expect(processor).toBeDefined();
        expect(typeof processor.process).toBe('function');
        expect(typeof processor.getStats).toBe('function');
      });

      it('should process files in batches with custom options', async () => {
        const processor = createBatchProcessor({ batchSize: 2, concurrency: 1 });
        const files = ['/test/file1.txt', '/test/file2.txt', '/test/file3.txt'];
        const taskFn = jest.fn().mockImplementation(async (file) => `processed-${file}`);
        
        const results = await processor.process(files, taskFn);

        expect(results).toHaveLength(3);
        expect(taskFn).toHaveBeenCalledTimes(3);
      });

      it('should provide processing statistics', async () => {
        const processor = createBatchProcessor();
        const files = ['/test/file1.txt', '/test/file2.txt'];
        const taskFn = jest.fn().mockImplementation(async (file) => `processed-${file}`);
        
        await processor.process(files, taskFn);
        const stats = processor.getStats();

        expect(stats).toMatchObject({
          totalProcessed: 2,
          totalErrors: 0,
          averageTime: expect.any(Number),
          totalTime: expect.any(Number),
        });
      });

      it('should track errors in statistics', async () => {
        const processor = createBatchProcessor({ continueOnError: true });
        const files = ['/test/file1.txt', '/test/file2.txt'];
        const taskFn = jest.fn()
          .mockResolvedValueOnce('success')
          .mockRejectedValueOnce(new Error('failed'));
        
        await processor.process(files, taskFn);
        const stats = processor.getStats();

        expect(stats.totalProcessed).toBe(2);
        expect(stats.totalErrors).toBe(1);
      });
    });

    describe('createConcurrentProcessor', () => {
      it('should create concurrent processor with default options', () => {
        const processor = createConcurrentProcessor();
        
        expect(processor).toBeDefined();
        expect(typeof processor.process).toBe('function');
        expect(typeof processor.getStats).toBe('function');
      });

      it('should process files concurrently', async () => {
        const processor = createConcurrentProcessor({ maxConcurrency: 2 });
        const files = ['/test/file1.txt', '/test/file2.txt', '/test/file3.txt'];
        const taskFn = jest.fn().mockImplementation(async (file) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return `processed-${file}`;
        });
        
        const start = Date.now();
        const results = await processor.process(files, taskFn);
        const duration = Date.now() - start;

        expect(results).toHaveLength(3);
        expect(taskFn).toHaveBeenCalledTimes(3);
        // Should be faster than sequential
        expect(duration).toBeLessThan(25); // 3 * 10ms with concurrency should be less than 25ms
      });

      it('should provide detailed statistics', async () => {
        const processor = createConcurrentProcessor();
        const files = ['/test/file1.txt', '/test/file2.txt'];
        const taskFn = jest.fn().mockImplementation(async (file) => `processed-${file}`);
        
        await processor.process(files, taskFn);
        const stats = processor.getStats();

        expect(stats).toMatchObject({
          totalProcessed: 2,
          totalErrors: 0,
          averageTime: expect.any(Number),
          totalTime: expect.any(Number),
          peakConcurrency: expect.any(Number),
        });
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle very large file lists', async () => {
      const files = Array.from({ length: 1000 }, (_, i) => `/test/file${i}.txt`);
      const processor = jest.fn().mockImplementation(async (file) => `processed-${file}`);
      
      const results = await processFilesBatch(files, processor, { batchSize: 50 });

      expect(results).toHaveLength(1000);
      expect(processor).toHaveBeenCalledTimes(1000);
    });

    it('should handle memory pressure gracefully', async () => {
      const files = Array.from({ length: 100 }, (_, i) => `/test/file${i}.txt`);
      const processor = jest.fn().mockImplementation(async (file) => {
        // Simulate memory-intensive operation
        const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB buffer
        await new Promise(resolve => setTimeout(resolve, 1));
        return `processed-${file}`;
      });
      
      // Should not throw memory errors with small batch sizes
      await expect(processFilesBatch(files, processor, { batchSize: 5 }))
        .resolves.toHaveLength(100);
    });

    it('should handle concurrent access to shared resources', async () => {
      let sharedCounter = 0;
      const files = Array.from({ length: 50 }, (_, i) => `/test/file${i}.txt`);
      
      const processor = jest.fn().mockImplementation(async (file) => {
        const current = sharedCounter;
        await new Promise(resolve => setTimeout(resolve, 1));
        sharedCounter = current + 1;
        return file;
      });
      
      await processFilesParallel(files, processor, { concurrency: 10 });

      // Due to race conditions, the final count might be less than 50
      // This test ensures the system doesn't crash with concurrent access
      expect(sharedCounter).toBeGreaterThan(0);
      expect(sharedCounter).toBeLessThanOrEqual(50);
    });

    it('should handle task queue overflow', async () => {
      const queue = new TaskQueue(2);
      
      // Add many tasks quickly
      const tasks = Array.from({ length: 100 }, (_, i) => 
        queue.add(async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return i;
        })
      );

      const results = await Promise.all(tasks);

      expect(results).toHaveLength(100);
      expect(results).toEqual(Array.from({ length: 100 }, (_, i) => i));
    });

    it('should handle zero concurrency gracefully', async () => {
      const files = ['/test/file1.txt'];
      const processor = jest.fn().mockResolvedValue('success');
      
      // Should handle edge case of zero concurrency
      const results = await processFilesParallel(files, processor, { concurrency: 0 });

      expect(results).toHaveLength(1);
      expect(results[0]).toBe('success');
    });

    it('should handle very high concurrency values', async () => {
      const files = Array.from({ length: 10 }, (_, i) => `/test/file${i}.txt`);
      const processor = jest.fn().mockImplementation(async (file) => `processed-${file}`);
      
      // Very high concurrency should be handled gracefully
      const results = await processFilesParallel(files, processor, { concurrency: 1000 });

      expect(results).toHaveLength(10);
      expect(processor).toHaveBeenCalledTimes(10);
    });
  });
});
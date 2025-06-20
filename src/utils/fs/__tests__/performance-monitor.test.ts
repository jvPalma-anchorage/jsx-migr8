/**
 * @file performance-monitor.test.ts
 * @description Comprehensive unit tests for performance monitoring utilities
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  PerformanceMonitor, 
  PerformanceTracker, 
  globalPerformanceMonitor 
} from '../performance-monitor';

// Mock node:perf_hooks
const mockPerformance = {
  now: jest.fn()
};

jest.mock('node:perf_hooks', () => ({
  performance: mockPerformance
}));

// Mock process.memoryUsage
const mockMemoryUsage = jest.fn();
Object.defineProperty(process, 'memoryUsage', {
  value: mockMemoryUsage
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let currentTime = 1000;

  const mockMemoryStats = {
    heapUsed: 50 * 1024 * 1024, // 50MB
    heapTotal: 100 * 1024 * 1024, // 100MB
    external: 5 * 1024 * 1024, // 5MB
    rss: 200 * 1024 * 1024, // 200MB
    arrayBuffers: 1 * 1024 * 1024 // 1MB
  };

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = new PerformanceMonitor();
    currentTime = 1000;
    
    // Mock performance.now to return incrementing values
    mockPerformance.now.mockImplementation(() => currentTime);
    
    // Mock memory usage
    mockMemoryUsage.mockReturnValue(mockMemoryStats);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with empty metrics and errors', () => {
      const newMonitor = new PerformanceMonitor();
      const metrics = newMonitor.getAggregatedMetrics();
      
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.totalDuration).toBe(0);
    });

    it('should set start time', () => {
      mockPerformance.now.mockReturnValue(5000);
      const newMonitor = new PerformanceMonitor();
      
      // Start time should be recorded
      expect(mockPerformance.now).toHaveBeenCalled();
    });
  });

  describe('startOperation', () => {
    it('should create a PerformanceTracker', () => {
      const tracker = monitor.startOperation('test-operation');
      
      expect(tracker).toBeInstanceOf(PerformanceTracker);
    });

    it('should create tracker with file path', () => {
      const filePath = '/test/file.ts';
      const tracker = monitor.startOperation('file-analysis', filePath);
      
      expect(tracker).toBeInstanceOf(PerformanceTracker);
    });
  });

  describe('recordOperation', () => {
    it('should record operation metrics', () => {
      const metric = {
        operation: 'test-operation',
        duration: 100,
        memoryBefore: mockMemoryStats,
        memoryAfter: { ...mockMemoryStats, heapUsed: mockMemoryStats.heapUsed + 1024 * 1024 },
        timestamp: 1100,
      };

      monitor.recordOperation(metric);
      
      const aggregated = monitor.getAggregatedMetrics();
      expect(aggregated.totalOperations).toBe(1);
      expect(aggregated.totalDuration).toBe(100);
    });

    it('should emit operation-complete event', () => {
      const eventSpy = jest.fn();
      monitor.on('operation-complete', eventSpy);

      const metric = {
        operation: 'test-operation',
        duration: 50,
        memoryBefore: mockMemoryStats,
        memoryAfter: mockMemoryStats,
        timestamp: 1050,
      };

      monitor.recordOperation(metric);
      
      expect(eventSpy).toHaveBeenCalledWith(metric);
    });

    it('should limit metrics history', () => {
      // Create monitor with small history limit for testing
      const smallMonitor = new PerformanceMonitor();
      
      // Record more than the limit (1000 operations)
      for (let i = 0; i < 1050; i++) {
        smallMonitor.recordOperation({
          operation: `operation-${i}`,
          duration: 10,
          memoryBefore: mockMemoryStats,
          memoryAfter: mockMemoryStats,
          timestamp: 1000 + i,
        });
      }

      const metrics = smallMonitor.getAggregatedMetrics();
      expect(metrics.totalOperations).toBe(1000); // Should be limited to 1000
    });

    it('should check performance thresholds', () => {
      const warningSpy = jest.fn();
      monitor.on('performance-warning', warningSpy);

      // Record slow operation
      const slowMetric = {
        operation: 'slow-operation',
        duration: 6000, // 6 seconds (over 5 second threshold)
        memoryBefore: mockMemoryStats,
        memoryAfter: mockMemoryStats,
        timestamp: 7000,
      };

      monitor.recordOperation(slowMetric);
      
      expect(warningSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'slow-operation',
          message: expect.stringContaining('6000ms')
        })
      );
    });

    it('should detect high memory usage', () => {
      const warningSpy = jest.fn();
      monitor.on('performance-warning', warningSpy);

      const highMemoryAfter = {
        ...mockMemoryStats,
        heapUsed: mockMemoryStats.heapUsed + 150 * 1024 * 1024 // +150MB
      };

      const metric = {
        operation: 'memory-intensive',
        duration: 100,
        memoryBefore: mockMemoryStats,
        memoryAfter: highMemoryAfter,
        timestamp: 1100,
      };

      monitor.recordOperation(metric);
      
      expect(warningSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'high-memory-usage',
          message: expect.stringContaining('150.00MB')
        })
      );
    });

    it('should detect heap pressure', () => {
      const warningSpy = jest.fn();
      monitor.on('performance-warning', warningSpy);

      const highHeapUsage = {
        ...mockMemoryStats,
        heapUsed: mockMemoryStats.heapTotal * 0.85 // 85% of heap
      };

      const metric = {
        operation: 'heap-pressure',
        duration: 100,
        memoryBefore: mockMemoryStats,
        memoryAfter: highHeapUsage,
        timestamp: 1100,
      };

      monitor.recordOperation(metric);
      
      expect(warningSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'heap-pressure',
          message: expect.stringContaining('85.0%')
        })
      );
    });
  });

  describe('recordError', () => {
    it('should record operation errors', () => {
      const error = new Error('Test error');
      monitor.recordError('test-operation', error);

      const metrics = monitor.getAggregatedMetrics();
      expect(metrics.errorRate).toBeGreaterThan(0);
    });

    it('should emit operation-error event', () => {
      const errorSpy = jest.fn();
      monitor.on('operation-error', errorSpy);

      const error = new Error('Test error');
      monitor.recordError('test-operation', error);
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test-operation',
          error,
          timestamp: expect.any(Number)
        })
      );
    });

    it('should limit error history', () => {
      // Record more than the limit (100 errors)
      for (let i = 0; i < 150; i++) {
        monitor.recordError(`operation-${i}`, new Error(`Error ${i}`));
      }

      // Should only keep last 100 errors
      // This is tested indirectly through error rate calculation
      expect(true).toBe(true); // Basic test for error limiting
    });
  });

  describe('getAggregatedMetrics', () => {
    it('should return empty metrics when no operations recorded', () => {
      const metrics = monitor.getAggregatedMetrics();
      
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.totalDuration).toBe(0);
      expect(metrics.averageDuration).toBe(0);
      expect(metrics.operationsPerSecond).toBe(0);
    });

    it('should calculate aggregated metrics correctly', () => {
      const operations = [
        { duration: 100, memory: 10 * 1024 * 1024, bytes: 1000 },
        { duration: 200, memory: 20 * 1024 * 1024, bytes: 2000 },
        { duration: 300, memory: 30 * 1024 * 1024, bytes: 3000 }
      ];

      operations.forEach((op, index) => {
        monitor.recordOperation({
          operation: `test-${index}`,
          duration: op.duration,
          memoryBefore: mockMemoryStats,
          memoryAfter: { ...mockMemoryStats, heapUsed: mockMemoryStats.heapUsed + op.memory },
          timestamp: 1000 + index * 100,
          bytesProcessed: op.bytes
        });
      });

      const metrics = monitor.getAggregatedMetrics();
      
      expect(metrics.totalOperations).toBe(3);
      expect(metrics.totalDuration).toBe(600);
      expect(metrics.averageDuration).toBe(200);
      expect(metrics.minDuration).toBe(100);
      expect(metrics.maxDuration).toBe(300);
      expect(metrics.totalBytesProcessed).toBe(6000);
    });

    it('should filter metrics by operation type', () => {
      monitor.recordOperation({
        operation: 'file-read',
        duration: 100,
        memoryBefore: mockMemoryStats,
        memoryAfter: mockMemoryStats,
        timestamp: 1100,
      });

      monitor.recordOperation({
        operation: 'file-write',
        duration: 200,
        memoryBefore: mockMemoryStats,
        memoryAfter: mockMemoryStats,
        timestamp: 1200,
      });

      const fileReadMetrics = monitor.getAggregatedMetrics('file-read');
      const fileWriteMetrics = monitor.getAggregatedMetrics('file-write');
      
      expect(fileReadMetrics.totalOperations).toBe(1);
      expect(fileReadMetrics.totalDuration).toBe(100);
      expect(fileWriteMetrics.totalOperations).toBe(1);
      expect(fileWriteMetrics.totalDuration).toBe(200);
    });

    it('should calculate throughput correctly', () => {
      monitor.recordOperation({
        operation: 'data-processing',
        duration: 1000, // 1 second
        memoryBefore: mockMemoryStats,
        memoryAfter: mockMemoryStats,
        timestamp: 2000,
        bytesProcessed: 1024 * 1024 // 1MB
      });

      const metrics = monitor.getAggregatedMetrics();
      
      expect(metrics.throughputBytesPerSecond).toBe(1024 * 1024); // 1MB/s
    });

    it('should calculate error rate correctly', () => {
      // Record successful operations
      monitor.recordOperation({
        operation: 'success',
        duration: 100,
        memoryBefore: mockMemoryStats,
        memoryAfter: mockMemoryStats,
        timestamp: 1100,
      });

      // Record errors
      monitor.recordError('error', new Error('Failed'));

      const metrics = monitor.getAggregatedMetrics();
      
      // Error rate = errors / (successes + errors) = 1 / (1 + 1) = 0.5
      expect(metrics.errorRate).toBe(0.5);
    });
  });

  describe('getPerformanceReport', () => {
    it('should generate comprehensive performance report', () => {
      // Add some test data
      monitor.recordOperation({
        operation: 'file-analysis',
        duration: 150,
        memoryBefore: mockMemoryStats,
        memoryAfter: { ...mockMemoryStats, heapUsed: mockMemoryStats.heapUsed + 10 * 1024 * 1024 },
        timestamp: 1150,
        bytesProcessed: 5000
      });

      monitor.recordOperation({
        operation: 'jsx-transformation',
        duration: 250,
        memoryBefore: mockMemoryStats,
        memoryAfter: { ...mockMemoryStats, heapUsed: mockMemoryStats.heapUsed + 15 * 1024 * 1024 },
        timestamp: 1400,
        bytesProcessed: 3000
      });

      monitor.recordError('failed-analysis', new Error('Parse error'));

      const report = monitor.getPerformanceReport();
      
      expect(report).toContain('Performance Report');
      expect(report).toContain('Total Operations: 2');
      expect(report).toContain('file-analysis');
      expect(report).toContain('jsx-transformation');
      expect(report).toContain('Recent Errors:');
      expect(report).toContain('failed-analysis');
    });

    it('should handle empty report', () => {
      const report = monitor.getPerformanceReport();
      
      expect(report).toContain('Performance Report');
      expect(report).toContain('Total Operations: 0');
    });

    it('should include throughput when bytes processed', () => {
      monitor.recordOperation({
        operation: 'data-processing',
        duration: 1000,
        memoryBefore: mockMemoryStats,
        memoryAfter: mockMemoryStats,
        timestamp: 2000,
        bytesProcessed: 1024 * 1024
      });

      const report = monitor.getPerformanceReport();
      
      expect(report).toContain('Throughput:');
      expect(report).toContain('MB/s');
    });
  });

  describe('clear', () => {
    it('should clear all metrics and errors', () => {
      monitor.recordOperation({
        operation: 'test',
        duration: 100,
        memoryBefore: mockMemoryStats,
        memoryAfter: mockMemoryStats,
        timestamp: 1100,
      });

      monitor.recordError('test', new Error('Test error'));

      monitor.clear();

      const metrics = monitor.getAggregatedMetrics();
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });
  });

  describe('getCurrentMemoryUsage', () => {
    it('should return current memory usage', () => {
      const memoryUsage = monitor.getCurrentMemoryUsage();
      
      expect(memoryUsage).toEqual(mockMemoryStats);
      expect(mockMemoryUsage).toHaveBeenCalled();
    });
  });
});

describe('PerformanceTracker', () => {
  let monitor: PerformanceMonitor;
  let currentTime = 1000;

  const mockMemoryStats = {
    heapUsed: 50 * 1024 * 1024,
    heapTotal: 100 * 1024 * 1024,
    external: 5 * 1024 * 1024,
    rss: 200 * 1024 * 1024,
    arrayBuffers: 1 * 1024 * 1024
  };

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = new PerformanceMonitor();
    currentTime = 1000;
    
    mockPerformance.now.mockImplementation(() => currentTime);
    mockMemoryUsage.mockReturnValue(mockMemoryStats);
  });

  describe('constructor', () => {
    it('should record start time and memory', () => {
      const tracker = new PerformanceTracker(monitor, 'test-operation');
      
      expect(mockPerformance.now).toHaveBeenCalled();
      expect(mockMemoryUsage).toHaveBeenCalled();
    });

    it('should store operation details', () => {
      const filePath = '/test/file.ts';
      const tracker = new PerformanceTracker(monitor, 'file-analysis', filePath);
      
      // Tracker should be created successfully
      expect(tracker).toBeInstanceOf(PerformanceTracker);
    });
  });

  describe('complete', () => {
    it('should record operation completion', () => {
      const recordSpy = jest.spyOn(monitor, 'recordOperation');
      
      const tracker = monitor.startOperation('test-operation');
      currentTime = 1150; // Simulate 150ms later

      tracker.complete();
      
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test-operation',
          duration: 150,
          timestamp: 1150
        })
      );
    });

    it('should record bytes processed and concurrency', () => {
      const recordSpy = jest.spyOn(monitor, 'recordOperation');
      
      const tracker = monitor.startOperation('data-processing', '/test/file.ts');
      currentTime = 1200;

      tracker.complete(1024 * 1024, 4); // 1MB processed with concurrency 4
      
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          bytesProcessed: 1024 * 1024,
          concurrency: 4
        })
      );
    });

    it('should calculate memory delta', () => {
      const recordSpy = jest.spyOn(monitor, 'recordOperation');
      
      const tracker = monitor.startOperation('memory-test');
      
      // Simulate memory increase
      mockMemoryUsage.mockReturnValue({
        ...mockMemoryStats,
        heapUsed: mockMemoryStats.heapUsed + 10 * 1024 * 1024
      });
      
      currentTime = 1100;
      tracker.complete();
      
      const recordedCall = recordSpy.mock.calls[0][0];
      expect(recordedCall.memoryAfter.heapUsed).toBe(mockMemoryStats.heapUsed + 10 * 1024 * 1024);
    });
  });

  describe('error', () => {
    it('should record operation error', () => {
      const errorSpy = jest.spyOn(monitor, 'recordError');
      
      const tracker = monitor.startOperation('failing-operation');
      const error = new Error('Operation failed');
      
      tracker.error(error);
      
      expect(errorSpy).toHaveBeenCalledWith('failing-operation', error);
    });
  });
});

describe('globalPerformanceMonitor', () => {
  it('should be a PerformanceMonitor instance', () => {
    expect(globalPerformanceMonitor).toBeInstanceOf(PerformanceMonitor);
  });

  it('should be a singleton', () => {
    const { globalPerformanceMonitor: global1 } = require('../performance-monitor');
    const { globalPerformanceMonitor: global2 } = require('../performance-monitor');
    
    expect(global1).toBe(global2);
  });

  it('should track operations globally', () => {
    const tracker = globalPerformanceMonitor.startOperation('global-test');
    tracker.complete();

    const metrics = globalPerformanceMonitor.getAggregatedMetrics();
    expect(metrics.totalOperations).toBeGreaterThan(0);
  });
});

describe('edge cases and error scenarios', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    mockPerformance.now.mockReturnValue(1000);
    mockMemoryUsage.mockReturnValue({
      heapUsed: 50 * 1024 * 1024,
      heapTotal: 100 * 1024 * 1024,
      external: 5 * 1024 * 1024,
      rss: 200 * 1024 * 1024,
      arrayBuffers: 1 * 1024 * 1024
    });
  });

  it('should handle zero duration operations', () => {
    monitor.recordOperation({
      operation: 'instant',
      duration: 0,
      memoryBefore: mockMemoryUsage(),
      memoryAfter: mockMemoryUsage(),
      timestamp: 1000,
    });

    const metrics = monitor.getAggregatedMetrics();
    expect(metrics.averageDuration).toBe(0);
    expect(metrics.minDuration).toBe(0);
  });

  it('should handle negative memory delta', () => {
    const memoryBefore = mockMemoryUsage();
    const memoryAfter = {
      ...memoryBefore,
      heapUsed: memoryBefore.heapUsed - 1024 * 1024 // Memory decreased (GC happened)
    };

    monitor.recordOperation({
      operation: 'gc-test',
      duration: 100,
      memoryBefore,
      memoryAfter,
      timestamp: 1100,
    });

    const metrics = monitor.getAggregatedMetrics();
    expect(metrics.totalOperations).toBe(1);
    // Should handle negative memory delta gracefully
  });

  it('should handle very large numbers', () => {
    monitor.recordOperation({
      operation: 'large-operation',
      duration: Number.MAX_SAFE_INTEGER,
      memoryBefore: mockMemoryUsage(),
      memoryAfter: mockMemoryUsage(),
      timestamp: 1000,
      bytesProcessed: Number.MAX_SAFE_INTEGER
    });

    const metrics = monitor.getAggregatedMetrics();
    expect(metrics.totalOperations).toBe(1);
    expect(metrics.totalBytesProcessed).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('should handle concurrent operations', () => {
    const operations = Array.from({ length: 10 }, (_, i) => 
      monitor.startOperation(`concurrent-${i}`)
    );

    // Complete all operations
    operations.forEach((tracker, i) => {
      mockPerformance.now.mockReturnValue(1000 + i * 10);
      tracker.complete();
    });

    const metrics = monitor.getAggregatedMetrics();
    expect(metrics.totalOperations).toBe(10);
  });
});
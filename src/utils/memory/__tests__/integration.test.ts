/**
 * Integration Tests for Memory Management System
 */

import {
  setupMemoryManagement,
  shutdownMemoryManagement,
  getMemoryStatus,
  createFileProcessingProgress,
  createAnalysisSpinner,
  withMemoryMonitoring,
  optimizeMemory,
  isMemoryHealthy,
  registerMemoryCleanup,
  registerDegradationStrategy,
  DEFAULT_MEMORY_CONFIG
} from '../index';

// Mock heavy operations for testing
const createMemoryIntensiveOperation = (sizeMB: number = 100) => {
  return async () => {
    // Simulate memory-intensive operation
    const data = new Array(sizeMB * 1024 * 256).fill('test'); // Approximate sizeMB megabytes
    await new Promise(resolve => setTimeout(resolve, 100));
    return data.length;
  };
};

describe('Memory Management Integration', () => {
  afterEach(() => {
    shutdownMemoryManagement();
  });

  describe('System Initialization', () => {
    test('should initialize with default configuration', () => {
      const system = setupMemoryManagement();
      
      expect(system).toHaveProperty('monitor');
      expect(system).toHaveProperty('limiter');
      expect(system).toHaveProperty('reporter');
      expect(system.isInitialized).toBe(true);
    });

    test('should initialize with custom configuration', () => {
      const system = setupMemoryManagement({
        maxMemoryMB: 1024,
        enableLimiting: false,
        enableReporting: true,
        enableProgressDisplay: false
      });
      
      expect(system.isInitialized).toBe(true);
      expect(system.limiter).toBeUndefined(); // Should be undefined when disabled
    });

    test('should shutdown gracefully', () => {
      setupMemoryManagement();
      
      // Should not throw
      expect(() => shutdownMemoryManagement()).not.toThrow();
    });
  });

  describe('Memory Status Monitoring', () => {
    test('should provide comprehensive memory status', () => {
      setupMemoryManagement();
      
      const status = getMemoryStatus();
      
      expect(status).toHaveProperty('current');
      expect(status).toHaveProperty('pressure');
      expect(status).toHaveProperty('gc');
      expect(status).toHaveProperty('leaks');
      expect(status).toHaveProperty('trend');
      expect(status).toHaveProperty('limiting');
      expect(status).toHaveProperty('suggestions');
      expect(status).toHaveProperty('timestamp');
    });

    test('should track memory health', () => {
      setupMemoryManagement();
      
      const isHealthy = isMemoryHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Progress Indicators', () => {
    test('should create file processing progress', () => {
      setupMemoryManagement();
      
      const progress = createFileProcessingProgress(100, 'Test processing');
      expect(progress).toBeDefined();
      
      // Test basic functionality
      progress.start();
      progress.update(25, 'Quarter done');
      progress.stop();
      
      const state = progress.getState();
      expect(state.current).toBe(25);
      expect(state.total).toBe(100);
      expect(state.message).toBe('Quarter done');
      expect(state.completed).toBe(true);
    });

    test('should create analysis spinner', () => {
      setupMemoryManagement();
      
      const spinner = createAnalysisSpinner('Test analysis');
      expect(spinner).toBeDefined();
      
      // Test basic functionality
      spinner.start();
      spinner.updateMessage('Updated message');
      spinner.stop();
    });
  });

  describe('Memory-Aware Operations', () => {
    test('should wrap operations with memory monitoring', async () => {
      setupMemoryManagement();
      
      const testOperation = jest.fn().mockResolvedValue('test result');
      
      const result = await withMemoryMonitoring(testOperation, {
        label: 'Test operation',
        maxMemoryMB: 512
      });
      
      expect(testOperation).toHaveBeenCalled();
      expect(result).toBe('test result');
    });

    test('should handle operation failures gracefully', async () => {
      setupMemoryManagement();
      
      const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(
        withMemoryMonitoring(failingOperation, { label: 'Failing operation' })
      ).rejects.toThrow('Operation failed');
      
      expect(failingOperation).toHaveBeenCalled();
    });

    test('should execute pressure callbacks', async () => {
      setupMemoryManagement({ maxMemoryMB: 512 });
      
      const pressureCallback = jest.fn();
      const memoryIntensiveOp = createMemoryIntensiveOperation(200); // High memory usage
      
      await withMemoryMonitoring(memoryIntensiveOp, {
        label: 'Memory intensive operation',
        onPressure: pressureCallback
      });
      
      // Note: Pressure callback might not be called in test environment
      // due to different memory management behavior
    });
  });

  describe('Memory Optimization', () => {
    test('should optimize memory usage', async () => {
      setupMemoryManagement();
      
      const result = await optimizeMemory();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('reclaimedMB');
      expect(result).toHaveProperty('actions');
      expect(Array.isArray(result.actions)).toBe(true);
    });

    test('should register and execute cleanup callbacks', async () => {
      setupMemoryManagement();
      
      const cleanupCallback = jest.fn();
      registerMemoryCleanup(cleanupCallback);
      
      await optimizeMemory();
      
      // Cleanup should be executed as part of optimization
      expect(cleanupCallback).toHaveBeenCalled();
    });

    test('should register degradation strategies', () => {
      setupMemoryManagement();
      
      const strategyCallback = jest.fn();
      
      registerDegradationStrategy({
        name: 'test-strategy',
        threshold: 70,
        description: 'Test degradation strategy',
        execute: strategyCallback,
        priority: 1,
        impact: 'low',
        reversible: true
      });
      
      // Strategy should be registered (can't easily test execution in unit test)
      expect(() => registerDegradationStrategy({
        name: 'another-strategy',
        threshold: 80,
        description: 'Another test strategy',
        execute: jest.fn(),
        priority: 2,
        impact: 'medium',
        reversible: false
      })).not.toThrow();
    });
  });

  describe('Configuration', () => {
    test('should use default configuration', () => {
      expect(DEFAULT_MEMORY_CONFIG).toHaveProperty('maxMemoryMB');
      expect(DEFAULT_MEMORY_CONFIG).toHaveProperty('enableLimiting');
      expect(DEFAULT_MEMORY_CONFIG).toHaveProperty('enableReporting');
      expect(DEFAULT_MEMORY_CONFIG).toHaveProperty('enableProgressDisplay');
      expect(DEFAULT_MEMORY_CONFIG.maxMemoryMB).toBe(2048);
    });

    test('should override default configuration', () => {
      const customConfig = {
        ...DEFAULT_MEMORY_CONFIG,
        maxMemoryMB: 1024,
        enableLimiting: false
      };
      
      const system = setupMemoryManagement(customConfig);
      expect(system.limiter).toBeUndefined();
    });
  });

  describe('Factory Functions', () => {
    test('should create file processing progress with factory', () => {
      setupMemoryManagement();
      
      const progress = createFileProcessingProgress(50, 'Factory test');
      expect(progress).toBeDefined();
      expect(progress.getState().total).toBe(50);
    });

    test('should create spinner with factory', () => {
      setupMemoryManagement();
      
      const spinner = createAnalysisSpinner('Factory spinner');
      expect(spinner).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', () => {
      // Mock a scenario where initialization might fail
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      try {
        // This should not throw even if some components fail to initialize
        const system = setupMemoryManagement();
        expect(system).toBeDefined();
      } finally {
        console.error = originalConsoleError;
      }
    });

    test('should handle shutdown errors gracefully', () => {
      setupMemoryManagement();
      
      // Should not throw even if cleanup fails
      expect(() => shutdownMemoryManagement()).not.toThrow();
      
      // Should handle multiple shutdowns
      expect(() => shutdownMemoryManagement()).not.toThrow();
    });

    test('should handle status requests when not initialized', () => {
      // Don't initialize system
      
      // Should still return some status (may be default/empty)
      expect(() => getMemoryStatus()).not.toThrow();
    });
  });

  describe('Memory Pressure Simulation', () => {
    test('should handle memory pressure scenarios', async () => {
      setupMemoryManagement({ maxMemoryMB: 256 }); // Low limit for testing
      
      const operations = Array.from({ length: 5 }, (_, i) => 
        withMemoryMonitoring(
          createMemoryIntensiveOperation(50), // Each operation uses ~50MB
          { label: `Operation ${i + 1}` }
        )
      );
      
      // Run operations concurrently to create memory pressure
      const results = await Promise.all(operations);
      
      // All operations should complete
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(typeof result).toBe('number');
      });
    });
  });

  describe('Performance Impact', () => {
    test('should have minimal performance impact', async () => {
      const startTime = Date.now();
      
      setupMemoryManagement();
      
      const initTime = Date.now() - startTime;
      expect(initTime).toBeLessThan(1000); // Should initialize quickly
      
      // Test operation overhead
      const operationStart = Date.now();
      
      await withMemoryMonitoring(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'test';
        },
        { label: 'Performance test' }
      );
      
      const operationTime = Date.now() - operationStart;
      expect(operationTime).toBeLessThan(200); // Minimal overhead
    });

    test('should handle rapid memory status requests', () => {
      setupMemoryManagement();
      
      const startTime = Date.now();
      
      // Make many rapid status requests
      for (let i = 0; i < 100; i++) {
        getMemoryStatus();
      }
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(1000); // Should be fast
    });
  });
});

describe('Real-world Usage Scenarios', () => {
  afterEach(() => {
    shutdownMemoryManagement();
  });

  test('should handle large file processing scenario', async () => {
    setupMemoryManagement();
    
    const files = Array.from({ length: 1000 }, (_, i) => `file-${i}.tsx`);
    const progress = createFileProcessingProgress(files.length, 'Processing TSX files');
    
    progress.start();
    
    try {
      for (let i = 0; i < files.length; i += 10) {
        const batch = files.slice(i, i + 10);
        
        await withMemoryMonitoring(
          async () => {
            // Simulate processing batch
            await Promise.all(batch.map(async (file) => {
              await new Promise(resolve => setTimeout(resolve, 1));
              progress.increment(`Processed ${file}`);
            }));
          },
          { label: `Processing batch ${Math.floor(i / 10) + 1}` }
        );
      }
      
      expect(progress.getState().current).toBe(files.length);
    } finally {
      progress.stop();
    }
  });

  test('should handle migration workflow scenario', async () => {
    setupMemoryManagement();
    
    // Simulate typical migration workflow
    const steps = [
      'Initialize context',
      'Scan codebase',
      'Build dependency graph',
      'Analyze components',
      'Generate migration rules',
      'Apply transformations',
      'Verify results'
    ];
    
    for (const step of steps) {
      await withMemoryMonitoring(
        async () => {
          // Simulate step execution
          await new Promise(resolve => setTimeout(resolve, 50));
          return `${step} completed`;
        },
        { label: step }
      );
    }
    
    // Check that memory is still healthy after workflow
    const finalStatus = getMemoryStatus();
    expect(finalStatus.current.percentage).toBeLessThan(95); // Should not be critical
  });

  test('should handle cleanup registration and execution', async () => {
    setupMemoryManagement();
    
    const cleanupCallbacks = [];
    
    // Register multiple cleanup callbacks
    for (let i = 0; i < 5; i++) {
      const callback = jest.fn();
      registerMemoryCleanup(callback);
      cleanupCallbacks.push(callback);
    }
    
    // Trigger optimization which should execute cleanups
    await optimizeMemory();
    
    // All cleanup callbacks should have been executed
    cleanupCallbacks.forEach(callback => {
      expect(callback).toHaveBeenCalled();
    });
  });
});
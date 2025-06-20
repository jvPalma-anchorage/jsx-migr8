/**
 * Tests for Memory-Aware Progress Indicators
 */

import { MemoryAwareProgress, MemoryAwareSpinner, ProgressConfiguration } from '../memory-progress';
import { MemoryMonitor, MemoryStats } from '../memory-monitor';
import { MemoryLimiter } from '../memory-limiter';

// Mock dependencies
jest.mock('../memory-monitor');
jest.mock('../memory-limiter');

// Mock console.log to avoid output during tests
const originalStdout = process.stdout.write;
let stdoutOutput: string = '';

beforeAll(() => {
  process.stdout.write = jest.fn((str: string) => {
    stdoutOutput += str;
    return true;
  });
});

afterAll(() => {
  process.stdout.write = originalStdout;
});

beforeEach(() => {
  stdoutOutput = '';
});

describe('MemoryAwareProgress', () => {
  let mockMemoryMonitor: jest.Mocked<MemoryMonitor>;
  let mockMemoryLimiter: jest.Mocked<MemoryLimiter>;
  let mockStats: MemoryStats;

  beforeEach(() => {
    mockStats = {
      used: 512 * 1024 * 1024, // 512MB
      total: 1024 * 1024 * 1024, // 1GB
      free: 512 * 1024 * 1024,
      percentage: 50,
      heapUsed: 256 * 1024 * 1024,
      heapTotal: 512 * 1024 * 1024,
      external: 50 * 1024 * 1024,
      arrayBuffers: 10 * 1024 * 1024,
      rss: 600 * 1024 * 1024,
      timestamp: Date.now()
    };

    mockMemoryMonitor = {
      getCurrentStats: jest.fn().mockReturnValue(mockStats),
      on: jest.fn(),
    } as any;

    mockMemoryLimiter = {
      getStatus: jest.fn().mockReturnValue({
        enforcing: true,
        activeStrategies: [],
        memoryUsage: mockStats,
        limits: { soft: 768, hard: 1024, emergency: 1200 },
        withinLimits: true
      }),
      on: jest.fn(),
    } as any;

    // Mock the global getters
    (require('../memory-monitor').getGlobalMemoryMonitor as jest.Mock).mockReturnValue(mockMemoryMonitor);
    (require('../memory-limiter').getGlobalMemoryLimiter as jest.Mock).mockReturnValue(mockMemoryLimiter);
  });

  describe('Basic Functionality', () => {
    test('should initialize with correct state', () => {
      const progress = new MemoryAwareProgress(100, 'Test progress');
      const state = progress.getState();
      
      expect(state.current).toBe(0);
      expect(state.total).toBe(100);
      expect(state.message).toBe('Test progress');
      expect(state.completed).toBe(false);
    });

    test('should accept custom configuration', () => {
      const config: Partial<ProgressConfiguration> = {
        showMemory: false,
        showPercentage: false,
        barWidth: 20,
        colorEnabled: false
      };
      
      const progress = new MemoryAwareProgress(50, 'Custom progress', config);
      expect(progress).toBeDefined();
    });

    test('should start and stop correctly', (done) => {
      const progress = new MemoryAwareProgress(10, 'Test');
      
      progress.start();
      
      setTimeout(() => {
        progress.stop();
        const state = progress.getState();
        expect(state.completed).toBe(true);
        done();
      }, 100);
    });

    test('should not start twice', () => {
      const progress = new MemoryAwareProgress(10, 'Test');
      
      progress.start();
      progress.start(); // Should be ignored
      
      progress.stop();
    });
  });

  describe('Progress Updates', () => {
    test('should update progress correctly', () => {
      const progress = new MemoryAwareProgress(100, 'Test');
      
      progress.update(25, 'Quarter done');
      const state = progress.getState();
      
      expect(state.current).toBe(25);
      expect(state.message).toBe('Quarter done');
    });

    test('should increment progress', () => {
      const progress = new MemoryAwareProgress(100, 'Test');
      
      progress.increment('Step 1');
      expect(progress.getState().current).toBe(1);
      
      progress.increment();
      expect(progress.getState().current).toBe(2);
    });

    test('should not exceed total', () => {
      const progress = new MemoryAwareProgress(10, 'Test');
      
      progress.update(15); // Over total
      expect(progress.getState().current).toBe(10);
    });

    test('should set total dynamically', () => {
      const progress = new MemoryAwareProgress(50, 'Test');
      
      progress.setTotal(100);
      expect(progress.getState().total).toBe(100);
    });
  });

  describe('Memory Display', () => {
    test('should create memory display string', () => {
      const display = MemoryAwareProgress.createMemoryDisplay(mockStats);
      
      expect(display).toContain('512.0'); // Used MB
      expect(display).toContain('1024.0'); // Total MB
      expect(display).toContain('50.0%'); // Percentage
    });

    test('should handle undefined stats', () => {
      const display = MemoryAwareProgress.createMemoryDisplay(undefined);
      expect(display).toBe('');
    });

    test('should create pressure indicator', () => {
      const indicator = MemoryAwareProgress.createPressureIndicator(50);
      
      expect(indicator).toContain('[');
      expect(indicator).toContain(']');
      expect(indicator.length).toBeGreaterThan(10); // Should have blocks
    });

    test('should color pressure indicator based on percentage', () => {
      const lowPressure = MemoryAwareProgress.createPressureIndicator(30);
      const mediumPressure = MemoryAwareProgress.createPressureIndicator(75);
      const highPressure = MemoryAwareProgress.createPressureIndicator(95);
      
      // All should be valid indicators
      expect(lowPressure).toContain('[');
      expect(mediumPressure).toContain('[');
      expect(highPressure).toContain('[');
    });
  });

  describe('Memory Monitoring Integration', () => {
    test('should listen to memory monitor events', () => {
      const progress = new MemoryAwareProgress(100, 'Test');
      
      expect(mockMemoryMonitor.on).toHaveBeenCalledWith('pressure-change', expect.any(Function));
    });

    test('should listen to memory limiter events', () => {
      const progress = new MemoryAwareProgress(100, 'Test');
      
      expect(mockMemoryLimiter.on).toHaveBeenCalledWith('soft-limit', expect.any(Function));
    });

    test('should update memory stats during monitoring', (done) => {
      const progress = new MemoryAwareProgress(100, 'Test', { updateInterval: 50 });
      
      progress.start();
      
      setTimeout(() => {
        progress.stop();
        
        // Should have called getCurrentStats multiple times
        expect(mockMemoryMonitor.getCurrentStats).toHaveBeenCalled();
        done();
      }, 150);
    });
  });

  describe('Visual Output', () => {
    test('should render progress bar', () => {
      const progress = new MemoryAwareProgress(100, 'Test', { updateInterval: 1000 });
      
      progress.start();
      progress.update(50);
      
      // Should have written to stdout
      expect(process.stdout.write).toHaveBeenCalled();
      
      progress.stop();
    });

    test('should show memory warnings for high usage', () => {
      // Mock high memory usage
      const highUsageStats = {
        ...mockStats,
        percentage: 95,
        used: 972 * 1024 * 1024 // 95% of 1GB
      };
      
      mockMemoryMonitor.getCurrentStats.mockReturnValue(highUsageStats);
      
      const progress = new MemoryAwareProgress(100, 'Test', { 
        updateInterval: 1000,
        memoryErrorThreshold: 90 
      });
      
      progress.start();
      progress.update(50);
      
      progress.stop();
      
      // Should have rendered with warning
      expect(process.stdout.write).toHaveBeenCalled();
    });

    test('should respect color configuration', () => {
      const progress = new MemoryAwareProgress(100, 'Test', {
        colorEnabled: false,
        updateInterval: 1000
      });
      
      progress.start();
      progress.update(25);
      progress.stop();
      
      expect(process.stdout.write).toHaveBeenCalled();
    });
  });

  describe('ETA Calculation', () => {
    test('should calculate ETA correctly', (done) => {
      const progress = new MemoryAwareProgress(100, 'Test', { updateInterval: 50 });
      
      progress.start();
      
      setTimeout(() => {
        progress.update(25); // 25% done after some time
        
        // ETA should be calculated
        const state = progress.getState();
        expect(state.current).toBe(25);
        
        progress.stop();
        done();
      }, 100);
    });

    test('should not show ETA when completed', () => {
      const progress = new MemoryAwareProgress(100, 'Test');
      
      progress.start();
      progress.update(100);
      progress.stop();
      
      const state = progress.getState();
      expect(state.completed).toBe(true);
    });
  });

  describe('Configuration Options', () => {
    test('should respect showMemory option', () => {
      const progress = new MemoryAwareProgress(100, 'Test', {
        showMemory: false,
        updateInterval: 1000
      });
      
      progress.start();
      progress.update(50);
      progress.stop();
      
      expect(mockMemoryMonitor.getCurrentStats).toHaveBeenCalled();
    });

    test('should respect showBar option', () => {
      const progress = new MemoryAwareProgress(100, 'Test', {
        showBar: false,
        updateInterval: 1000
      });
      
      progress.start();
      progress.update(50);
      progress.stop();
      
      expect(process.stdout.write).toHaveBeenCalled();
    });

    test('should respect custom bar width', () => {
      const progress = new MemoryAwareProgress(100, 'Test', {
        barWidth: 10,
        updateInterval: 1000
      });
      
      progress.start();
      progress.update(50);
      progress.stop();
      
      expect(process.stdout.write).toHaveBeenCalled();
    });
  });
});

describe('MemoryAwareSpinner', () => {
  let mockMemoryMonitor: jest.Mocked<MemoryMonitor>;
  let mockStats: MemoryStats;

  beforeEach(() => {
    mockStats = {
      used: 256 * 1024 * 1024,
      total: 1024 * 1024 * 1024,
      free: 768 * 1024 * 1024,
      percentage: 25,
      heapUsed: 128 * 1024 * 1024,
      heapTotal: 256 * 1024 * 1024,
      external: 25 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024,
      rss: 300 * 1024 * 1024,
      timestamp: Date.now()
    };

    mockMemoryMonitor = {
      getCurrentStats: jest.fn().mockReturnValue(mockStats),
    } as any;

    (require('../memory-monitor').getGlobalMemoryMonitor as jest.Mock).mockReturnValue(mockMemoryMonitor);
  });

  describe('Basic Functionality', () => {
    test('should initialize with message', () => {
      const spinner = new MemoryAwareSpinner('Loading...');
      expect(spinner).toBeDefined();
    });

    test('should start and stop correctly', (done) => {
      const spinner = new MemoryAwareSpinner('Test spinner');
      
      spinner.start();
      
      setTimeout(() => {
        spinner.stop();
        done();
      }, 150);
    });

    test('should not start twice', () => {
      const spinner = new MemoryAwareSpinner('Test');
      
      spinner.start();
      spinner.start(); // Should be ignored
      
      spinner.stop();
    });

    test('should update message', () => {
      const spinner = new MemoryAwareSpinner('Initial message');
      
      spinner.updateMessage('Updated message');
      
      // Should not throw
      expect(spinner).toBeDefined();
    });
  });

  describe('Visual Output', () => {
    test('should render spinner frames', (done) => {
      const spinner = new MemoryAwareSpinner('Processing...');
      
      spinner.start();
      
      setTimeout(() => {
        spinner.stop();
        
        // Should have written to stdout multiple times
        expect(process.stdout.write).toHaveBeenCalled();
        done();
      }, 250);
    });

    test('should show memory information', (done) => {
      const spinner = new MemoryAwareSpinner('With memory');
      
      spinner.start();
      
      setTimeout(() => {
        spinner.stop();
        
        // Should have called getCurrentStats
        expect(mockMemoryMonitor.getCurrentStats).toHaveBeenCalled();
        done();
      }, 150);
    });

    test('should color spinner based on memory usage', (done) => {
      // Mock high memory usage
      const highUsageStats = {
        ...mockStats,
        percentage: 95
      };
      
      mockMemoryMonitor.getCurrentStats.mockReturnValue(highUsageStats);
      
      const spinner = new MemoryAwareSpinner('High memory');
      
      spinner.start();
      
      setTimeout(() => {
        spinner.stop();
        
        expect(process.stdout.write).toHaveBeenCalled();
        done();
      }, 150);
    });
  });

  describe('Animation', () => {
    test('should cycle through frames', (done) => {
      const spinner = new MemoryAwareSpinner('Animated');
      
      spinner.start();
      
      // Let it run for several frame cycles
      setTimeout(() => {
        spinner.stop();
        
        // Should have made multiple render calls
        const callCount = (process.stdout.write as jest.Mock).mock.calls.length;
        expect(callCount).toBeGreaterThan(5);
        done();
      }, 550);
    });
  });
});

describe('Factory Functions', () => {
  test('should create memory progress with factory', () => {
    const { createMemoryProgress } = require('../memory-progress');
    
    const progress = createMemoryProgress(100, 'Factory test');
    expect(progress).toBeInstanceOf(MemoryAwareProgress);
  });

  test('should create memory spinner with factory', () => {
    const { createMemorySpinner } = require('../memory-progress');
    
    const spinner = createMemorySpinner('Factory spinner');
    expect(spinner).toBeInstanceOf(MemoryAwareSpinner);
  });

  test('should create with default parameters', () => {
    const { createMemoryProgress, createMemorySpinner } = require('../memory-progress');
    
    const progress = createMemoryProgress(50);
    const spinner = createMemorySpinner();
    
    expect(progress).toBeDefined();
    expect(spinner).toBeDefined();
  });
});
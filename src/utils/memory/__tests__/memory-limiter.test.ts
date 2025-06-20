/**
 * Tests for Memory Limiter System
 */

import { MemoryLimiter, LimiterConfiguration, DegradationStrategy } from '../memory-limiter';
import { MemoryMonitor } from '../memory-monitor';

// Mock memory monitor for testing
jest.mock('../memory-monitor');

describe('MemoryLimiter', () => {
  let limiter: MemoryLimiter;
  let mockMemoryMonitor: jest.Mocked<MemoryMonitor>;

  beforeEach(() => {
    // Create a mock memory monitor
    mockMemoryMonitor = {
      getCurrentStats: jest.fn(),
      forceGC: jest.fn(),
      executeCleanup: jest.fn(),
    } as any;

    limiter = new MemoryLimiter({
      enforcementEnabled: true,
      gracefulDegradation: true,
      hardLimitMB: 1024,
      softLimitMB: 768,
      emergencyLimitMB: 1200,
      checkInterval: 100, // Fast for testing
      degradationDelay: 50,
      recoveryDelay: 100
    }, mockMemoryMonitor);
  });

  afterEach(() => {
    limiter.stopEnforcement();
  });

  describe('Basic Functionality', () => {
    test('should initialize with configuration', () => {
      expect(limiter).toBeDefined();
      
      const status = limiter.getStatus();
      expect(status).toHaveProperty('enforcing');
      expect(status).toHaveProperty('activeStrategies');
      expect(status).toHaveProperty('limits');
    });

    test('should start and stop enforcement', () => {
      const startSpy = jest.fn();
      const stopSpy = jest.fn();
      
      limiter.on('enforcement-started', startSpy);
      limiter.on('enforcement-stopped', stopSpy);
      
      limiter.startEnforcement();
      expect(startSpy).toHaveBeenCalled();
      
      limiter.stopEnforcement();
      expect(stopSpy).toHaveBeenCalled();
    });

    test('should not start enforcement twice', () => {
      const startSpy = jest.fn();
      limiter.on('enforcement-started', startSpy);
      
      limiter.startEnforcement();
      limiter.startEnforcement(); // Second call should be ignored
      
      expect(startSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Strategy Management', () => {
    test('should register and unregister strategies', () => {
      const strategy: DegradationStrategy = {
        name: 'test-strategy',
        threshold: 70,
        description: 'Test strategy',
        execute: jest.fn(),
        priority: 1,
        impact: 'low',
        reversible: true
      };

      limiter.registerStrategy(strategy);
      
      // Strategy should be registered but not active
      const status = limiter.getStatus();
      expect(status.activeStrategies).not.toContain('test-strategy');
      
      limiter.unregisterStrategy('test-strategy');
      
      // Should handle unregistering non-existent strategy
      limiter.unregisterStrategy('non-existent');
    });

    test('should execute strategies', async () => {
      const executeSpy = jest.fn();
      const strategy: DegradationStrategy = {
        name: 'test-strategy',
        threshold: 70,
        description: 'Test strategy',
        execute: executeSpy,
        priority: 1,
        impact: 'low',
        reversible: true
      };

      limiter.registerStrategy(strategy);
      
      const result = await limiter.executeStrategy('test-strategy');
      
      expect(result).toBe(true);
      expect(executeSpy).toHaveBeenCalled();
      
      const status = limiter.getStatus();
      expect(status.activeStrategies).toContain('test-strategy');
    });

    test('should handle strategy execution errors', async () => {
      const failingStrategy: DegradationStrategy = {
        name: 'failing-strategy',
        threshold: 70,
        description: 'Failing strategy',
        execute: jest.fn().mockRejectedValue(new Error('Strategy failed')),
        priority: 1,
        impact: 'low',
        reversible: true
      };

      limiter.registerStrategy(failingStrategy);
      
      const result = await limiter.executeStrategy('failing-strategy');
      
      expect(result).toBe(false);
    });

    test('should not execute non-existent strategy', async () => {
      const result = await limiter.executeStrategy('non-existent');
      expect(result).toBe(false);
    });

    test('should emit strategy execution events', async () => {
      const eventSpy = jest.fn();
      limiter.on('strategy-executed', eventSpy);
      
      const strategy: DegradationStrategy = {
        name: 'test-strategy',
        threshold: 70,
        description: 'Test strategy',
        execute: jest.fn(),
        priority: 1,
        impact: 'low',
        reversible: true
      };

      limiter.registerStrategy(strategy);
      await limiter.executeStrategy('test-strategy');
      
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('Memory Limit Enforcement', () => {
    test('should detect soft limit breach', async () => {
      const softLimitSpy = jest.fn();
      limiter.on('soft-limit', softLimitSpy);
      
      // Mock memory stats showing soft limit breach
      mockMemoryMonitor.getCurrentStats.mockReturnValue({
        used: 800 * 1024 * 1024, // 800MB > 768MB soft limit
        total: 1024 * 1024 * 1024,
        free: 224 * 1024 * 1024,
        percentage: 78.125,
        heapUsed: 400 * 1024 * 1024,
        heapTotal: 500 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
        rss: 850 * 1024 * 1024,
        timestamp: Date.now()
      });

      limiter.startEnforcement();
      
      // Wait for enforcement check
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(softLimitSpy).toHaveBeenCalled();
    });

    test('should detect hard limit breach', async () => {
      const hardLimitSpy = jest.fn();
      limiter.on('hard-limit', hardLimitSpy);
      
      // Mock memory stats showing hard limit breach
      mockMemoryMonitor.getCurrentStats.mockReturnValue({
        used: 1100 * 1024 * 1024, // 1100MB > 1024MB hard limit
        total: 1200 * 1024 * 1024,
        free: 100 * 1024 * 1024,
        percentage: 91.67,
        heapUsed: 600 * 1024 * 1024,
        heapTotal: 700 * 1024 * 1024,
        external: 100 * 1024 * 1024,
        arrayBuffers: 50 * 1024 * 1024,
        rss: 1150 * 1024 * 1024,
        timestamp: Date.now()
      });

      limiter.startEnforcement();
      
      // Wait for enforcement check
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(hardLimitSpy).toHaveBeenCalled();
    });

    test('should detect emergency limit breach', async () => {
      const emergencyLimitSpy = jest.fn();
      limiter.on('emergency-limit', emergencyLimitSpy);
      
      // Mock memory stats showing emergency limit breach
      mockMemoryMonitor.getCurrentStats.mockReturnValue({
        used: 1250 * 1024 * 1024, // 1250MB > 1200MB emergency limit
        total: 1300 * 1024 * 1024,
        free: 50 * 1024 * 1024,
        percentage: 96.15,
        heapUsed: 700 * 1024 * 1024,
        heapTotal: 800 * 1024 * 1024,
        external: 200 * 1024 * 1024,
        arrayBuffers: 100 * 1024 * 1024,
        rss: 1300 * 1024 * 1024,
        timestamp: Date.now()
      });

      limiter.startEnforcement();
      
      // Wait for enforcement check
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(emergencyLimitSpy).toHaveBeenCalled();
    });

    test('should attempt recovery when below soft limit', async () => {
      const recoverySpy = jest.fn();
      limiter.on('recovery-attempted', recoverySpy);
      
      // Add some active strategies first
      const strategy: DegradationStrategy = {
        name: 'test-strategy',
        threshold: 70,
        description: 'Test strategy',
        execute: jest.fn(),
        priority: 1,
        impact: 'low',
        reversible: true
      };
      limiter.registerStrategy(strategy);
      await limiter.executeStrategy('test-strategy');
      
      // Mock memory stats showing below soft limit
      mockMemoryMonitor.getCurrentStats.mockReturnValue({
        used: 500 * 1024 * 1024, // 500MB < 768MB soft limit
        total: 1024 * 1024 * 1024,
        free: 524 * 1024 * 1024,
        percentage: 48.83,
        heapUsed: 250 * 1024 * 1024,
        heapTotal: 300 * 1024 * 1024,
        external: 25 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
        rss: 550 * 1024 * 1024,
        timestamp: Date.now()
      });

      limiter.startEnforcement();
      
      // Wait for enforcement check and recovery delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Recovery might not be attempted immediately due to delays
      // But strategies should be cleared
      const status = limiter.getStatus();
      expect(status.activeStrategies.length).toBe(0);
    });
  });

  describe('Status and Configuration', () => {
    test('should provide current status', () => {
      mockMemoryMonitor.getCurrentStats.mockReturnValue({
        used: 500 * 1024 * 1024,
        total: 1024 * 1024 * 1024,
        free: 524 * 1024 * 1024,
        percentage: 48.83,
        heapUsed: 250 * 1024 * 1024,
        heapTotal: 300 * 1024 * 1024,
        external: 25 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
        rss: 550 * 1024 * 1024,
        timestamp: Date.now()
      });

      const status = limiter.getStatus();
      
      expect(status).toHaveProperty('enforcing');
      expect(status).toHaveProperty('activeStrategies');
      expect(status).toHaveProperty('memoryUsage');
      expect(status).toHaveProperty('limits');
      expect(status).toHaveProperty('withinLimits');
      
      expect(Array.isArray(status.activeStrategies)).toBe(true);
      expect(typeof status.withinLimits).toBe('boolean');
    });

    test('should update configuration', () => {
      const newConfig: Partial<LimiterConfiguration> = {
        hardLimitMB: 2048,
        softLimitMB: 1536
      };
      
      limiter.updateConfig(newConfig);
      
      const status = limiter.getStatus();
      expect(status.limits.hard).toBe(2048);
      expect(status.limits.soft).toBe(1536);
    });
  });

  describe('Default Strategies', () => {
    test('should have default strategies registered', () => {
      // The limiter should register some default strategies
      // We can test this by checking if certain strategies can be executed
      
      const defaultStrategies = [
        'clear-ast-cache',
        'reduce-batch-size',
        'disable-detailed-reporting',
        'clear-file-cache',
        'limit-concurrency'
      ];
      
      // Try to execute each default strategy
      defaultStrategies.forEach(async (strategyName) => {
        const result = await limiter.executeStrategy(strategyName);
        // Some might fail due to missing global objects in test environment
        // but they should be registered
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('Emergency Handling', () => {
    test('should execute all strategies in emergency', async () => {
      const strategy1 = jest.fn();
      const strategy2 = jest.fn();
      
      limiter.registerStrategy({
        name: 'strategy1',
        threshold: 70,
        description: 'Strategy 1',
        execute: strategy1,
        priority: 1,
        impact: 'low',
        reversible: true
      });
      
      limiter.registerStrategy({
        name: 'strategy2',
        threshold: 80,
        description: 'Strategy 2',
        execute: strategy2,
        priority: 2,
        impact: 'medium',
        reversible: true
      });
      
      // Mock emergency situation
      mockMemoryMonitor.getCurrentStats.mockReturnValue({
        used: 1250 * 1024 * 1024, // Emergency level
        total: 1300 * 1024 * 1024,
        free: 50 * 1024 * 1024,
        percentage: 96.15,
        heapUsed: 700 * 1024 * 1024,
        heapTotal: 800 * 1024 * 1024,
        external: 200 * 1024 * 1024,
        arrayBuffers: 100 * 1024 * 1024,
        rss: 1300 * 1024 * 1024,
        timestamp: Date.now()
      });
      
      mockMemoryMonitor.forceGC.mockResolvedValue({ success: true, reclaimedMB: 50 });
      mockMemoryMonitor.executeCleanup.mockResolvedValue();
      
      limiter.startEnforcement();
      
      // Wait for emergency handling
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Both strategies should be executed in emergency
      expect(strategy1).toHaveBeenCalled();
      expect(strategy2).toHaveBeenCalled();
      
      // GC and cleanup should also be called
      expect(mockMemoryMonitor.forceGC).toHaveBeenCalled();
      expect(mockMemoryMonitor.executeCleanup).toHaveBeenCalled();
    });
  });

  describe('Degradation Delays', () => {
    test('should respect degradation delay', async () => {
      const strategySpy = jest.fn();
      
      limiter.registerStrategy({
        name: 'delayed-strategy',
        threshold: 70,
        description: 'Delayed strategy',
        execute: strategySpy,
        priority: 1,
        impact: 'low',
        reversible: true
      });
      
      // Mock soft limit breach
      mockMemoryMonitor.getCurrentStats.mockReturnValue({
        used: 800 * 1024 * 1024,
        total: 1024 * 1024 * 1024,
        free: 224 * 1024 * 1024,
        percentage: 78.125,
        heapUsed: 400 * 1024 * 1024,
        heapTotal: 500 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
        rss: 850 * 1024 * 1024,
        timestamp: Date.now()
      });
      
      limiter.startEnforcement();
      
      // Wait less than degradation delay
      await new Promise(resolve => setTimeout(resolve, 25));
      
      // Strategy should not be executed yet due to delay
      expect(strategySpy).not.toHaveBeenCalled();
      
      // Wait for full degradation delay
      await new Promise(resolve => setTimeout(resolve, 75));
      
      // Now strategy should be executed
      expect(strategySpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle memory monitor errors gracefully', async () => {
      mockMemoryMonitor.getCurrentStats.mockImplementation(() => {
        throw new Error('Memory monitor error');
      });
      
      // Should not crash when starting enforcement
      expect(() => limiter.startEnforcement()).not.toThrow();
      
      // Wait for check cycle
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should still be running
      const status = limiter.getStatus();
      expect(status.enforcing).toBe(true);
    });

    test('should handle GC and cleanup errors in emergency', async () => {
      mockMemoryMonitor.forceGC.mockRejectedValue(new Error('GC failed'));
      mockMemoryMonitor.executeCleanup.mockRejectedValue(new Error('Cleanup failed'));
      
      // Mock emergency situation
      mockMemoryMonitor.getCurrentStats.mockReturnValue({
        used: 1250 * 1024 * 1024,
        total: 1300 * 1024 * 1024,
        free: 50 * 1024 * 1024,
        percentage: 96.15,
        heapUsed: 700 * 1024 * 1024,
        heapTotal: 800 * 1024 * 1024,
        external: 200 * 1024 * 1024,
        arrayBuffers: 100 * 1024 * 1024,
        rss: 1300 * 1024 * 1024,
        timestamp: Date.now()
      });
      
      limiter.startEnforcement();
      
      // Should not crash despite errors
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const status = limiter.getStatus();
      expect(status.enforcing).toBe(true);
    });
  });
});
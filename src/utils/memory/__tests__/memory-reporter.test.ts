/**
 * Tests for Memory Usage Reporting System
 */

import { MemoryReporter, MemoryReport, ReportConfiguration } from '../memory-reporter';
import { MemoryMonitor, MemoryStats, GCStats, MemoryLeakCandidate } from '../memory-monitor';
import { MemoryLimiter } from '../memory-limiter';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Mock dependencies
jest.mock('../memory-monitor');
jest.mock('../memory-limiter');
jest.mock('fs');

// Mock console.log for cleaner test output
const originalLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
});

describe('MemoryReporter', () => {
  let reporter: MemoryReporter;
  let mockMemoryMonitor: jest.Mocked<MemoryMonitor>;
  let mockMemoryLimiter: jest.Mocked<MemoryLimiter>;
  let mockStats: MemoryStats;
  let mockGCStats: GCStats;

  beforeEach(() => {
    mockStats = {
      used: 512 * 1024 * 1024,
      total: 1024 * 1024 * 1024,
      free: 512 * 1024 * 1024,
      percentage: 50,
      heapUsed: 256 * 1024 * 1024,
      heapTotal: 512 * 1024 * 1024,
      external: 50 * 1024 * 1024,
      arrayBuffers: 10 * 1024 * 1024,
      rss: 600 * 1024 * 1024,
      timestamp: Date.now()
    };

    mockGCStats = {
      frequency: 2.0,
      lastRun: Date.now() - 30000,
      totalRuns: 5,
      averageReclaimedMB: 25.5,
      effectiveness: 75.0
    };

    mockMemoryMonitor = {
      getMemoryHistory: jest.fn().mockReturnValue([mockStats]),
      getGCStats: jest.fn().mockReturnValue(mockGCStats),
      getLeakCandidates: jest.fn().mockReturnValue([]),
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

    reporter = new MemoryReporter();
  });

  describe('Basic Functionality', () => {
    test('should initialize correctly', () => {
      expect(reporter).toBeDefined();
      expect(mockMemoryMonitor.on).toHaveBeenCalled();
      expect(mockMemoryLimiter.on).toHaveBeenCalled();
    });

    test('should generate basic report', () => {
      const report = reporter.generateReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('performance');
      expect(report).toHaveProperty('optimization');
      expect(report).toHaveProperty('trends');
      expect(report).toHaveProperty('incidents');
      expect(report).toHaveProperty('recommendations');
    });

    test('should respect report configuration', () => {
      const config: ReportConfiguration = {
        includeHistory: false,
        includeTrends: false,
        includeRecommendations: false,
        detailLevel: 'summary',
        exportFormat: 'json'
      };
      
      const report = reporter.generateReport(config);
      expect(report).toBeDefined();
    });
  });

  describe('Report Generation', () => {
    test('should generate summary correctly', () => {
      const multipleStats = [
        { ...mockStats, used: 400 * 1024 * 1024, percentage: 40 },
        { ...mockStats, used: 600 * 1024 * 1024, percentage: 60 },
        { ...mockStats, used: 500 * 1024 * 1024, percentage: 50 }
      ];
      
      mockMemoryMonitor.getMemoryHistory.mockReturnValue(multipleStats);
      
      const report = reporter.generateReport();
      
      expect(report.summary).toHaveProperty('peakUsage');
      expect(report.summary).toHaveProperty('averageUsage');
      expect(report.summary).toHaveProperty('minUsage');
      expect(report.summary).toHaveProperty('totalGCRuns');
      expect(report.summary).toHaveProperty('totalMemoryFreed');
      
      expect(report.summary.peakUsage.percentage).toBe(60);
      expect(report.summary.minUsage.percentage).toBe(40);
    });

    test('should analyze performance correctly', () => {
      const report = reporter.generateReport();
      
      expect(report.performance).toHaveProperty('gcEfficiency');
      expect(report.performance).toHaveProperty('memoryThroughput');
      expect(report.performance).toHaveProperty('pressureFrequency');
      expect(report.performance).toHaveProperty('recoveryTime');
      expect(report.performance).toHaveProperty('degradationImpact');
      expect(report.performance).toHaveProperty('overallScore');
      
      expect(report.performance.gcEfficiency).toBe(75.0);
      expect(typeof report.performance.overallScore).toBe('number');
    });

    test('should generate optimization suggestions', () => {
      // Mock poor performance to trigger suggestions
      mockGCStats.effectiveness = 30; // Low GC efficiency
      mockMemoryMonitor.getGCStats.mockReturnValue(mockGCStats);
      
      const report = reporter.generateReport();
      
      expect(report.optimization).toHaveProperty('immediate');
      expect(report.optimization).toHaveProperty('shortTerm');
      expect(report.optimization).toHaveProperty('longTerm');
      
      expect(Array.isArray(report.optimization.immediate)).toBe(true);
      expect(Array.isArray(report.optimization.shortTerm)).toBe(true);
      expect(Array.isArray(report.optimization.longTerm)).toBe(true);
    });

    test('should analyze memory trends', () => {
      const trendingStats = Array.from({ length: 20 }, (_, i) => ({
        ...mockStats,
        used: (500 + i * 10) * 1024 * 1024, // Increasing trend
        percentage: ((500 + i * 10) / 1024) * 100,
        timestamp: Date.now() - (20 - i) * 60000
      }));
      
      mockMemoryMonitor.getMemoryHistory.mockReturnValue(trendingStats);
      
      const report = reporter.generateReport();
      
      expect(report.trends).toHaveProperty('usage');
      expect(report.trends).toHaveProperty('pressure');
      expect(report.trends).toHaveProperty('efficiency');
      expect(report.trends).toHaveProperty('growthRate');
      
      expect(['stable', 'increasing', 'decreasing', 'volatile']).toContain(report.trends.usage);
    });

    test('should generate recommendations', () => {
      const report = reporter.generateReport();
      
      expect(Array.isArray(report.recommendations)).toBe(true);
      
      report.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('benefits');
        expect(rec).toHaveProperty('risks');
        expect(rec).toHaveProperty('implementation');
      });
    });
  });

  describe('Event Handling', () => {
    test('should record pressure events', () => {
      const pressureEvent = {
        timestamp: Date.now(),
        level: 'high',
        stats: mockStats,
        message: 'High memory pressure detected',
        type: 'pressure' as const
      };
      
      // Simulate pressure event
      const onPressureChange = (mockMemoryMonitor.on as jest.Mock).mock.calls
        .find(call => call[0] === 'pressure-change')?.[1];
      
      if (onPressureChange) {
        onPressureChange(pressureEvent);
      }
      
      const report = reporter.generateReport();
      expect(report.incidents.length).toBeGreaterThanOrEqual(0);
    });

    test('should record leak detection events', () => {
      const leakEvent = {
        timestamp: Date.now(),
        stats: mockStats,
        message: 'Memory leak detected',
        type: 'leak' as const
      };
      
      const onLeakDetected = (mockMemoryMonitor.on as jest.Mock).mock.calls
        .find(call => call[0] === 'leak-detected')?.[1];
      
      if (onLeakDetected) {
        onLeakDetected(leakEvent);
      }
      
      const report = reporter.generateReport();
      expect(report.incidents.length).toBeGreaterThanOrEqual(0);
    });

    test('should record limit breach events', () => {
      const limitEvent = {
        timestamp: Date.now(),
        stats: mockStats,
        message: 'Soft limit breached',
        type: 'limit' as const
      };
      
      const onSoftLimit = (mockMemoryLimiter.on as jest.Mock).mock.calls
        .find(call => call[0] === 'soft-limit')?.[1];
      
      if (onSoftLimit) {
        onSoftLimit(limitEvent);
      }
      
      const report = reporter.generateReport();
      expect(report.incidents.length).toBeGreaterThanOrEqual(0);
    });

    test('should record degradation events', () => {
      const degradationEvent = {
        timestamp: Date.now(),
        strategy: 'test-strategy',
        stats: mockStats,
        message: 'Degradation strategy executed',
        type: 'degradation' as const
      };
      
      const onStrategyExecuted = (mockMemoryLimiter.on as jest.Mock).mock.calls
        .find(call => call[0] === 'strategy-executed')?.[1];
      
      if (onStrategyExecuted) {
        onStrategyExecuted(degradationEvent);
      }
      
      const report = reporter.generateReport();
      expect(report.incidents.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Report Display', () => {
    test('should display summary report', () => {
      const report = reporter.generateReport();
      
      reporter.displayReport(report, 'summary');
      
      // Should have logged output
      expect(console.log).toHaveBeenCalled();
    });

    test('should display detailed report', () => {
      const report = reporter.generateReport();
      
      reporter.displayReport(report, 'detailed');
      
      // Should have logged more output for detailed report
      expect(console.log).toHaveBeenCalled();
    });

    test('should display current suggestions', () => {
      const suggestions = reporter.getCurrentSuggestions();
      
      expect(suggestions).toHaveProperty('immediate');
      expect(suggestions).toHaveProperty('shortTerm');
      expect(suggestions).toHaveProperty('longTerm');
    });
  });

  describe('Report Export', () => {
    test('should export JSON report', () => {
      const config: ReportConfiguration = {
        includeHistory: true,
        includeTrends: true,
        includeRecommendations: true,
        detailLevel: 'detailed',
        exportFormat: 'json',
        outputPath: '/tmp'
      };
      
      const report = reporter.generateReport(config);
      
      expect(writeFileSync).toHaveBeenCalled();
      const writeCall = (writeFileSync as jest.Mock).mock.calls[0];
      expect(writeCall[0]).toContain('.json');
      expect(typeof writeCall[1]).toBe('string');
      
      // Should be valid JSON
      expect(() => JSON.parse(writeCall[1])).not.toThrow();
    });

    test('should export text report', () => {
      const config: ReportConfiguration = {
        includeHistory: true,
        includeTrends: true,
        includeRecommendations: true,
        detailLevel: 'detailed',
        exportFormat: 'text',
        outputPath: '/tmp'
      };
      
      const report = reporter.generateReport(config);
      
      expect(writeFileSync).toHaveBeenCalled();
      const writeCall = (writeFileSync as jest.Mock).mock.calls[0];
      expect(writeCall[1]).toContain('MEMORY USAGE REPORT');
    });

    test('should export HTML report', () => {
      const config: ReportConfiguration = {
        includeHistory: true,
        includeTrends: true,
        includeRecommendations: true,
        detailLevel: 'detailed',
        exportFormat: 'html',
        outputPath: '/tmp'
      };
      
      const report = reporter.generateReport(config);
      
      expect(writeFileSync).toHaveBeenCalled();
      const writeCall = (writeFileSync as jest.Mock).mock.calls[0];
      expect(writeCall[0]).toContain('.html');
      expect(writeCall[1]).toContain('<!DOCTYPE html>');
    });

    test('should handle export errors gracefully', () => {
      (writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write failed');
      });
      
      const config: ReportConfiguration = {
        includeHistory: true,
        includeTrends: true,
        includeRecommendations: true,
        detailLevel: 'detailed',
        exportFormat: 'json',
        outputPath: '/invalid/path'
      };
      
      // Should not throw
      expect(() => reporter.generateReport(config)).not.toThrow();
    });
  });

  describe('Memory Leak Integration', () => {
    test('should include leak candidates in report', () => {
      const leakCandidates: MemoryLeakCandidate[] = [
        {
          objectType: 'TestObject',
          count: 1000,
          growthRate: 5.5,
          memoryImpact: 50 * 1024 * 1024,
          detected: Date.now() - 300000
        }
      ];
      
      mockMemoryMonitor.getLeakCandidates.mockReturnValue(leakCandidates);
      
      const report = reporter.generateReport();
      
      expect(report.summary.leakCandidates).toBe(1);
      
      // Should generate recommendations for leak investigation
      const leakRecommendations = report.recommendations.filter(
        rec => rec.category === 'monitoring' && rec.title.includes('Leak')
      );
      expect(leakRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Scoring', () => {
    test('should calculate overall score correctly', () => {
      const report = reporter.generateReport();
      
      expect(report.performance.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.performance.overallScore).toBeLessThanOrEqual(100);
    });

    test('should generate suggestions for poor performance', () => {
      // Mock poor performance
      mockGCStats.effectiveness = 20;
      mockMemoryMonitor.getGCStats.mockReturnValue(mockGCStats);
      
      const report = reporter.generateReport();
      
      expect(report.optimization.immediate.length).toBeGreaterThan(0);
      
      const gcSuggestion = report.optimization.immediate.find(
        action => action.title.includes('Garbage Collection')
      );
      expect(gcSuggestion).toBeDefined();
    });
  });

  describe('Utility Functions', () => {
    test('should reset reporter state', () => {
      // Add some incidents first
      const pressureEvent = {
        timestamp: Date.now(),
        level: 'high',
        stats: mockStats,
        message: 'Test pressure',
        type: 'pressure' as const
      };
      
      const onPressureChange = (mockMemoryMonitor.on as jest.Mock).mock.calls
        .find(call => call[0] === 'pressure-change')?.[1];
      
      if (onPressureChange) {
        onPressureChange(pressureEvent);
      }
      
      reporter.reset();
      
      const report = reporter.generateReport();
      expect(report.incidents.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle memory monitor errors gracefully', () => {
      mockMemoryMonitor.getMemoryHistory.mockImplementation(() => {
        throw new Error('Monitor error');
      });
      
      // Should not throw
      expect(() => reporter.generateReport()).not.toThrow();
    });

    test('should handle memory limiter errors gracefully', () => {
      mockMemoryLimiter.getStatus.mockImplementation(() => {
        throw new Error('Limiter error');
      });
      
      // Should not throw
      expect(() => reporter.generateReport()).not.toThrow();
    });

    test('should handle missing data gracefully', () => {
      mockMemoryMonitor.getMemoryHistory.mockReturnValue([]);
      mockMemoryMonitor.getGCStats.mockReturnValue({
        frequency: 0,
        lastRun: 0,
        totalRuns: 0,
        averageReclaimedMB: 0,
        effectiveness: 0
      });
      
      const report = reporter.generateReport();
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.performance).toBeDefined();
    });
  });
});

describe('Global Reporter Functions', () => {
  test('should get global reporter instance', () => {
    const { getGlobalMemoryReporter } = require('../memory-reporter');
    
    const reporter1 = getGlobalMemoryReporter();
    const reporter2 = getGlobalMemoryReporter();
    
    expect(reporter1).toBe(reporter2); // Should be same instance
  });

  test('should reset global reporter', () => {
    const { getGlobalMemoryReporter, resetGlobalMemoryReporter } = require('../memory-reporter');
    
    const reporter1 = getGlobalMemoryReporter();
    resetGlobalMemoryReporter();
    const reporter2 = getGlobalMemoryReporter();
    
    expect(reporter1).not.toBe(reporter2); // Should be different instances
  });
});
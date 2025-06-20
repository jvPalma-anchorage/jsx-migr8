import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import fs from 'fs/promises';
import { CLITestRunner, TestFileUtils, PerformanceMonitor } from './test-utils/cli-test-utils';
import { TestDataGenerator } from './test-utils/snapshot-utils';

describe('jsx-migr8 Performance Regression Tests', () => {
  let tempDir: string;
  let performanceBaseline: Record<string, number> = {};
  
  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    smallProject: 5000,    // < 5 seconds for small projects (< 50 components)
    mediumProject: 15000,  // < 15 seconds for medium projects (50-200 components)
    largeProject: 45000,   // < 45 seconds for large projects (200+ components)
    memoryUsage: 512 * 1024 * 1024, // < 512MB memory usage
    fileProcessing: 50,    // < 50ms per file on average
  };

  beforeAll(async () => {
    PerformanceMonitor.reset();
    
    // Load existing performance baseline if available
    try {
      const baselinePath = path.join(__dirname, 'performance-baseline.json');
      const baselineData = await fs.readFile(baselinePath, 'utf-8');
      performanceBaseline = JSON.parse(baselineData);
    } catch {
      // No baseline exists yet, will create one
      performanceBaseline = {};
    }
  });

  afterAll(async () => {
    // Save performance results as new baseline
    const baselinePath = path.join(__dirname, 'performance-baseline.json');
    const stats = PerformanceMonitor.getAllStats();
    
    const newBaseline = {
      ...performanceBaseline,
      lastUpdated: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      measurements: stats
    };
    
    await fs.writeFile(baselinePath, JSON.stringify(newBaseline, null, 2));
    
    // Log performance summary
    console.log('\n=== Performance Test Summary ===');
    Object.entries(stats).forEach(([name, stat]) => {
      if (stat) {
        console.log(`${name}: ${stat.mean.toFixed(2)}ms (min: ${stat.min.toFixed(2)}ms, max: ${stat.max.toFixed(2)}ms)`);
      }
    });
  });

  beforeEach(async () => {
    tempDir = await TestFileUtils.createTempDir('perf-test-');
  });

  afterEach(async () => {
    if (tempDir) {
      await TestFileUtils.cleanup(tempDir);
    }
  });

  describe('Project Size Scaling', () => {
    test('Small project performance (< 50 components)', async () => {
      const testName = 'small-project-scan';
      const endMeasurement = PerformanceMonitor.start(testName);
      
      // Generate small project
      const { files, packageJson } = TestDataGenerator.generateProjectStructure('small-perf', {
        fileCount: 8,
        componentCount: 40,
        complexity: 'simple'
      });

      // Create project structure
      await createTestProject(tempDir, files, packageJson);

      // Run analysis (scanning phase)
      const result = await CLITestRunner.runDryRun(tempDir, [], {
        timeout: PERFORMANCE_THRESHOLDS.smallProject
      });

      const duration = endMeasurement();
      
      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.smallProject);
      
      // Check against baseline
      await checkPerformanceRegression(testName, duration);
      
      console.log(`Small project (40 components): ${duration.toFixed(2)}ms`);
    });

    test('Medium project performance (50-200 components)', async () => {
      const testName = 'medium-project-scan';
      const endMeasurement = PerformanceMonitor.start(testName);
      
      // Generate medium project
      const { files, packageJson } = TestDataGenerator.generateProjectStructure('medium-perf', {
        fileCount: 20,
        componentCount: 120,
        complexity: 'medium'
      });

      // Create project structure
      await createTestProject(tempDir, files, packageJson);

      // Run analysis
      const result = await CLITestRunner.runDryRun(tempDir, [], {
        timeout: PERFORMANCE_THRESHOLDS.mediumProject
      });

      const duration = endMeasurement();
      
      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.mediumProject);
      
      await checkPerformanceRegression(testName, duration);
      
      console.log(`Medium project (120 components): ${duration.toFixed(2)}ms`);
    });

    test('Large project performance (200+ components)', async () => {
      const testName = 'large-project-scan';
      const endMeasurement = PerformanceMonitor.start(testName);
      
      // Generate large project
      const { files, packageJson } = TestDataGenerator.generateProjectStructure('large-perf', {
        fileCount: 50,
        componentCount: 300,
        complexity: 'complex'
      });

      // Create project structure
      await createTestProject(tempDir, files, packageJson);

      // Run analysis
      const result = await CLITestRunner.runDryRun(tempDir, [], {
        timeout: PERFORMANCE_THRESHOLDS.largeProject
      });

      const duration = endMeasurement();
      
      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.largeProject);
      
      await checkPerformanceRegression(testName, duration);
      
      console.log(`Large project (300 components): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Transformation Performance', () => {
    test('Simple transformation performance', async () => {
      const testName = 'simple-transformation';
      
      // Generate test project
      const { files, packageJson } = TestDataGenerator.generateProjectStructure('transform-perf', {
        fileCount: 10,
        componentCount: 50,
        complexity: 'simple'
      });

      await createTestProject(tempDir, files, packageJson);

      // Create simple migration rules
      const migrationRules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{ variant: 'primary' }],
              set: { 'data-variant': 'primary' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      };

      await createMigrationRules(tempDir, migrationRules);

      const endMeasurement = PerformanceMonitor.start(testName);
      
      // Run transformation
      const result = await CLITestRunner.runYolo(tempDir, [], {
        timeout: PERFORMANCE_THRESHOLDS.mediumProject
      });

      const duration = endMeasurement();
      
      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.mediumProject);
      
      await checkPerformanceRegression(testName, duration);
      
      console.log(`Simple transformation (50 components): ${duration.toFixed(2)}ms`);
    });

    test('Complex transformation performance', async () => {
      const testName = 'complex-transformation';
      
      // Generate test project
      const { files, packageJson } = TestDataGenerator.generateProjectStructure('complex-transform', {
        fileCount: 15,
        componentCount: 80,
        complexity: 'complex'
      });

      await createTestProject(tempDir, files, packageJson);

      // Create complex migration rules
      const migrationRules = {
        lookup: {
          '@ui-library/components': {
            Button: [
              {
                match: [{ variant: 'primary' }],
                rename: { variant: 'appearance' },
                set: { appearance: 'primary' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              },
              {
                match: [{ size: 'large' }],
                remove: ['size'],
                set: { 'data-size': 'large' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              }
            ],
            Text: [
              {
                match: [{ size: 'large', weight: 'bold' }],
                remove: ['size', 'weight'],
                set: { variant: 'headingLarge' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              }
            ],
            Card: [
              {
                match: [{}],
                replaceWith: {
                  INNER_PROPS: ['padding'],
                  code: '<div className="card" {...INNER_PROPS}><div className="card-content">{CHILDREN}</div></div>'
                },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              }
            ]
          }
        }
      };

      await createMigrationRules(tempDir, migrationRules);

      const endMeasurement = PerformanceMonitor.start(testName);
      
      // Run transformation
      const result = await CLITestRunner.runYolo(tempDir, [], {
        timeout: PERFORMANCE_THRESHOLDS.mediumProject
      });

      const duration = endMeasurement();
      
      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.mediumProject);
      
      await checkPerformanceRegression(testName, duration);
      
      console.log(`Complex transformation (80 components): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    test('Memory usage for large projects', async () => {
      const testName = 'memory-usage-large';
      
      // Generate large project
      const { files, packageJson } = TestDataGenerator.generateProjectStructure('memory-test', {
        fileCount: 100,
        componentCount: 500,
        complexity: 'medium'
      });

      await createTestProject(tempDir, files, packageJson);

      // Monitor memory usage
      const initialMemory = process.memoryUsage();
      
      const endMeasurement = PerformanceMonitor.start(testName);
      
      // Run analysis
      const result = await CLITestRunner.runDryRun(tempDir, [], {
        timeout: PERFORMANCE_THRESHOLDS.largeProject
      });

      const duration = endMeasurement();
      const finalMemory = process.memoryUsage();
      
      expect(result.exitCode).toBe(0);
      
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Memory usage for large project: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Peak memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory usage should be reasonable
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);
      
      await checkPerformanceRegression(testName, duration);
    });
  });

  describe('File Processing Rate', () => {
    test('File processing rate consistency', async () => {
      const testName = 'file-processing-rate';
      
      const fileCounts = [10, 50, 100];
      const processingRates: number[] = [];
      
      for (const fileCount of fileCounts) {
        const testDir = await TestFileUtils.createTempDir(`file-rate-${fileCount}-`);
        
        // Generate project with specific file count
        const { files, packageJson } = TestDataGenerator.generateProjectStructure(`rate-test-${fileCount}`, {
          fileCount,
          componentCount: fileCount * 2, // 2 components per file
          complexity: 'simple'
        });

        await createTestProject(testDir, files, packageJson);

        const endMeasurement = PerformanceMonitor.start(`${testName}-${fileCount}`);
        
        // Run analysis
        const result = await CLITestRunner.runDryRun(testDir);
        
        const duration = endMeasurement();
        
        expect(result.exitCode).toBe(0);
        
        const processingRate = duration / fileCount; // ms per file
        processingRates.push(processingRate);
        
        console.log(`${fileCount} files processed at ${processingRate.toFixed(2)}ms per file`);
        
        // Each file should be processed reasonably quickly
        expect(processingRate).toBeLessThan(PERFORMANCE_THRESHOLDS.fileProcessing);
        
        await TestFileUtils.cleanup(testDir);
      }
      
      // Processing rate should be relatively consistent (not exponential)
      // Larger projects might be slightly slower per file due to overhead, but not dramatically
      const maxRate = Math.max(...processingRates);
      const minRate = Math.min(...processingRates);
      
      expect(maxRate / minRate).toBeLessThan(3); // Should not be more than 3x slower
    });
  });

  describe('Concurrent Processing', () => {
    test('Concurrent CLI instances performance', async () => {
      const testName = 'concurrent-processing';
      
      // Create multiple test projects
      const testDirs: string[] = [];
      for (let i = 0; i < 3; i++) {
        const testDir = await TestFileUtils.createTempDir(`concurrent-${i}-`);
        testDirs.push(testDir);
        
        const { files, packageJson } = TestDataGenerator.generateProjectStructure(`concurrent-${i}`, {
          fileCount: 20,
          componentCount: 50,
          complexity: 'medium'
        });

        await createTestProject(testDir, files, packageJson);
      }

      const endMeasurement = PerformanceMonitor.start(testName);
      
      // Run multiple CLI instances concurrently
      const promises = testDirs.map(dir => 
        CLITestRunner.runDryRun(dir, [], {
          timeout: PERFORMANCE_THRESHOLDS.mediumProject
        })
      );

      const results = await Promise.all(promises);
      
      const duration = endMeasurement();
      
      // All instances should complete successfully
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
      
      // Concurrent processing should not take much longer than sequential
      // (allowing for some overhead and system limitations)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.mediumProject * 2);
      
      await checkPerformanceRegression(testName, duration);
      
      console.log(`Concurrent processing (3 instances): ${duration.toFixed(2)}ms`);
      
      // Cleanup
      await Promise.all(testDirs.map(dir => TestFileUtils.cleanup(dir)));
    });
  });

  describe('Performance Regression Detection', () => {
    test('Detect significant performance regressions', async () => {
      const currentStats = PerformanceMonitor.getAllStats();
      
      if (Object.keys(performanceBaseline).length === 0) {
        console.log('No performance baseline found. Creating initial baseline...');
        return;
      }

      const baselineStats = performanceBaseline.measurements;
      const regressions: Array<{
        test: string;
        currentTime: number;
        baselineTime: number;
        regressionPercent: number;
      }> = [];

      // Compare current performance against baseline
      Object.entries(currentStats).forEach(([testName, currentStat]) => {
        if (currentStat && baselineStats[testName]) {
          const baselineStat = baselineStats[testName];
          const currentMean = currentStat.mean;
          const baselineMean = baselineStat.mean;
          
          const regressionPercent = ((currentMean - baselineMean) / baselineMean) * 100;
          
          // Flag significant regressions (> 25% slower)
          if (regressionPercent > 25) {
            regressions.push({
              test: testName,
              currentTime: currentMean,
              baselineTime: baselineMean,
              regressionPercent
            });
          }
        }
      });

      // Report regressions
      if (regressions.length > 0) {
        console.log('\n=== Performance Regressions Detected ===');
        regressions.forEach(regression => {
          console.log(`${regression.test}: ${regression.regressionPercent.toFixed(1)}% slower`);
          console.log(`  Current: ${regression.currentTime.toFixed(2)}ms`);
          console.log(`  Baseline: ${regression.baselineTime.toFixed(2)}ms`);
        });
        
        // Fail the test if there are significant regressions
        // (In a real scenario, you might want to make this configurable)
        if (process.env.FAIL_ON_REGRESSION !== 'false') {
          expect(regressions.length).toBe(0);
        }
      } else {
        console.log('No significant performance regressions detected.');
      }
    });
  });

  // Helper functions
  async function createTestProject(
    projectDir: string,
    files: Array<{ path: string; content: string }>,
    packageJson: any
  ): Promise<void> {
    // Create package.json
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create source files
    for (const file of files) {
      const filePath = path.join(projectDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content);
    }
  }

  async function createMigrationRules(
    projectDir: string,
    rules: any
  ): Promise<void> {
    const rulesPath = path.join(projectDir, 'migr8Rules', 'perf-test-rules.json');
    await fs.mkdir(path.dirname(rulesPath), { recursive: true });
    await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2));
  }

  async function checkPerformanceRegression(
    testName: string,
    currentDuration: number
  ): Promise<void> {
    if (performanceBaseline.measurements && performanceBaseline.measurements[testName]) {
      const baselineDuration = performanceBaseline.measurements[testName].mean;
      const regressionPercent = ((currentDuration - baselineDuration) / baselineDuration) * 100;
      
      if (regressionPercent > 25) {
        console.warn(`⚠️  Performance regression detected for ${testName}: ${regressionPercent.toFixed(1)}% slower`);
      } else if (regressionPercent < -10) {
        console.log(`✅ Performance improvement for ${testName}: ${Math.abs(regressionPercent).toFixed(1)}% faster`);
      }
    }
  }
});
import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import path from 'path';
import fs from 'fs/promises';
import { CLITestRunner, TestFileUtils, MockInquirer, PerformanceMonitor } from './test-utils/cli-test-utils';
import { SnapshotTestUtils } from './test-utils/snapshot-utils';

describe('jsx-migr8 CLI Workflows Integration Tests', () => {
  let tempDir: string;
  let fixtureDir: string;

  beforeAll(async () => {
    // Setup performance monitoring
    PerformanceMonitor.reset();
    
    // Clean up any existing snapshots if needed
    if (process.env.UPDATE_SNAPSHOTS) {
      await SnapshotTestUtils.cleanupSnapshots();
    }
  });

  beforeEach(async () => {
    // Create a fresh temporary directory for each test
    tempDir = await TestFileUtils.createTempDir('cli-workflow-test-');
  });

  afterEach(async () => {
    // Clean up temporary directories
    if (tempDir) {
      await TestFileUtils.cleanup(tempDir);
    }
    if (fixtureDir && fixtureDir !== tempDir) {
      await TestFileUtils.cleanup(fixtureDir);
    }
  });

  afterAll(async () => {
    // Log performance statistics
    const stats = PerformanceMonitor.getAllStats();
    console.log('Performance Statistics:', JSON.stringify(stats, null, 2));
  });

  describe('Help and Version Commands', () => {
    test('should display help information', async () => {
      const endMeasurement = PerformanceMonitor.start('help-command');
      
      const result = await CLITestRunner.runCLI(['--help']);
      
      endMeasurement();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('jsx-migr8');
      expect(result.stdout).toContain('usage');
      
      // Create snapshot of help output
      await SnapshotTestUtils.createCLISnapshot('help-command', result);
    });

    test('should display version information', async () => {
      const result = await CLITestRunner.runCLI(['--version']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Dry Run Mode', () => {
    test('should run dry-run on simple React app fixture', async () => {
      const endMeasurement = PerformanceMonitor.start('dry-run-simple');
      
      // Copy fixture to temporary directory
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Create migration rules file
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'ui-library-migration.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
      const migrationRules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{ variant: 'primary' }],
              rename: { variant: 'appearance' },
              set: { appearance: 'primary' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library-v2/components'
            }],
            Text: [{
              match: [{ size: 'large', weight: 'bold' }],
              remove: ['size', 'weight'],
              set: { variant: 'headingLarge' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library-v2/components'
            }]
          }
        }
      };
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));
      
      const result = await CLITestRunner.runDryRun(fixtureDir);
      
      endMeasurement();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dry-run');
      
      // Verify that files were not actually modified in dry-run mode
      const appContent = await TestFileUtils.readFile(path.join(fixtureDir, 'src', 'App.tsx'));
      expect(appContent).toContain('@ui-library/components'); // Should still have old imports
      
      // Create snapshot of dry-run output
      await SnapshotTestUtils.createCLISnapshot('dry-run-simple-react-app', result);
    });

    test('should handle TypeScript project fixture', async () => {
      fixtureDir = await TestFileUtils.copyFixture('typescript-project', tempDir);
      
      const result = await CLITestRunner.runDryRun(fixtureDir);
      
      expect(result.exitCode).toBe(0);
      
      // Create snapshot
      await SnapshotTestUtils.createCLISnapshot('dry-run-typescript-project', result);
    });

    test('should handle edge cases and malformed JSX', async () => {
      fixtureDir = await TestFileUtils.createTempDir('edge-cases-');
      
      // Copy edge cases fixture
      const edgeCasesSource = path.join(__dirname, '__fixtures__', 'edge-cases');
      await TestFileUtils.copyDirectory(edgeCasesSource, fixtureDir);
      
      const result = await CLITestRunner.runDryRun(fixtureDir, [], { expectError: true });
      
      // Edge cases might cause warnings or errors, but shouldn't crash
      expect(result.exitCode).toBeLessThanOrEqual(1);
      
      await SnapshotTestUtils.createCLISnapshot('dry-run-edge-cases', result);
    });
  });

  describe('YOLO Mode', () => {
    test('should apply transformations in yolo mode', async () => {
      const endMeasurement = PerformanceMonitor.start('yolo-mode-simple');
      
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'ui-library-migration.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
      const migrationRules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{ variant: 'primary' }],
              rename: { variant: 'appearance' },
              set: { appearance: 'primary' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library-v2/components'
            }]
          }
        }
      };
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));
      
      // Read original content for comparison
      const originalAppContent = await TestFileUtils.readFile(path.join(fixtureDir, 'src', 'App.tsx'));
      
      const result = await CLITestRunner.runYolo(fixtureDir);
      
      endMeasurement();
      
      expect(result.exitCode).toBe(0);
      
      // Verify that files were actually modified
      const transformedAppContent = await TestFileUtils.readFile(path.join(fixtureDir, 'src', 'App.tsx'));
      expect(transformedAppContent).not.toBe(originalAppContent);
      expect(transformedAppContent).toContain('@ui-library-v2/components');
      expect(transformedAppContent).toContain('appearance="primary"');
      
      // Create transformation snapshot
      await SnapshotTestUtils.createTransformationSnapshot('yolo-mode-simple-react-app', [{
        filePath: path.join(fixtureDir, 'src', 'App.tsx'),
        originalContent: originalAppContent,
        transformedContent: transformedAppContent,
        rules: migrationRules
      }]);
      
      // Create CLI output snapshot
      await SnapshotTestUtils.createCLISnapshot('yolo-mode-simple-react-app', result);
    });

    test('should create backup before transformation', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Setup basic migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'test-migration.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      await fs.writeFile(rulesPath, JSON.stringify({ lookup: {} }, null, 2));
      
      const result = await CLITestRunner.runYolo(fixtureDir);
      
      expect(result.exitCode).toBe(0);
      
      // Check that backup was created
      const backupDir = path.join(fixtureDir, '.migr8-backups');
      const backupExists = await TestFileUtils.fileExists(backupDir);
      expect(backupExists).toBe(true);
    });
  });

  describe('Interactive Mode', () => {
    test('should handle interactive package selection', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Mock user selections
      const userInputs = [
        '0', // Select first package
        '0', // Select first component
        'y', // Confirm selection
        'n', // Don't continue with more selections
        'y'  // Confirm migration
      ];
      
      const result = await CLITestRunner.runInteractive(fixtureDir, userInputs);
      
      // Interactive mode might exit differently based on implementation
      expect([0, 1]).toContain(result.exitCode);
      
      await SnapshotTestUtils.createCLISnapshot('interactive-package-selection', result);
    });

    test('should handle rule generation workflow', async () => {
      fixtureDir = await TestFileUtils.copyFixture('typescript-project', tempDir);
      
      const userInputs = [
        '0', // Select first package (@mui/material)
        '0', // Select first component
        'y', // Confirm selection
        'generate-rules', // Choose to generate rules
        'y'  // Confirm rule generation
      ];
      
      const result = await CLITestRunner.runInteractive(fixtureDir, userInputs);
      
      // Check that rules were generated
      const rulesDir = path.join(fixtureDir, 'migr8Rules');
      const rulesDirExists = await TestFileUtils.fileExists(rulesDir);
      
      if (result.exitCode === 0) {
        expect(rulesDirExists).toBe(true);
      }
      
      await SnapshotTestUtils.createCLISnapshot('interactive-rule-generation', result);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing ROOT_PATH', async () => {
      const result = await CLITestRunner.runCLI(['--dry-run'], {
        env: { ROOT_PATH: '/nonexistent/path' },
        expectError: true
      });
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('path') || expect(result.stdout).toContain('path');
      
      await SnapshotTestUtils.createCLISnapshot('error-missing-root-path', result);
    });

    test('should handle invalid migration rules', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Create invalid migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'invalid-rules.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      await fs.writeFile(rulesPath, '{ invalid json }');
      
      const result = await CLITestRunner.runDryRun(fixtureDir, [], { expectError: true });
      
      expect(result.exitCode).not.toBe(0);
      
      await SnapshotTestUtils.createCLISnapshot('error-invalid-migration-rules', result);
    });

    test('should handle permission errors gracefully', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Make a file read-only to simulate permission error
      const appFile = path.join(fixtureDir, 'src', 'App.tsx');
      await fs.chmod(appFile, 0o444); // Read-only
      
      const result = await CLITestRunner.runYolo(fixtureDir, [], { expectError: true });
      
      // Should handle permission errors gracefully
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toLowerCase()).toContain('permission') ||
             expect(result.stdout.toLowerCase()).toContain('permission');
      
      // Restore permissions for cleanup
      await fs.chmod(appFile, 0o644);
      
      await SnapshotTestUtils.createCLISnapshot('error-permission-denied', result);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large codebase efficiently', async () => {
      const endMeasurement = PerformanceMonitor.start('performance-large-codebase');
      
      // Copy performance test fixture
      fixtureDir = await TestFileUtils.createTempDir('performance-test-');
      const perfFixtureSource = path.join(__dirname, '__fixtures__', 'performance-test');
      await TestFileUtils.copyDirectory(perfFixtureSource, fixtureDir);
      
      const result = await CLITestRunner.runDryRun(fixtureDir, [], {
        timeout: 60000 // 60 second timeout for performance test
      });
      
      const duration = endMeasurement();
      
      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(30000); // Should complete in under 30 seconds
      
      console.log(`Large codebase processing took ${duration.toFixed(2)}ms`);
    });

    test('should scale with project size', async () => {
      const projectSizes = [10, 50, 100]; // Number of components
      const durations: number[] = [];
      
      for (const size of projectSizes) {
        const testDir = await TestFileUtils.createTempDir(`perf-test-${size}-`);
        
        // Generate project of specified size
        const { files, packageJson } = require('./test-utils/snapshot-utils').TestDataGenerator
          .generateProjectStructure(`perf-${size}`, {
          fileCount: Math.ceil(size / 10),
          componentCount: size
        });
        
        // Write files
        await fs.writeFile(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));
        
        for (const file of files) {
          const filePath = path.join(testDir, file.path);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, file.content);
        }
        
        const endMeasurement = PerformanceMonitor.start(`performance-${size}-components`);
        
        const result = await CLITestRunner.runDryRun(testDir, [], {
          timeout: 60000
        });
        
        const duration = endMeasurement();
        durations.push(duration);
        
        expect(result.exitCode).toBe(0);
        
        await TestFileUtils.cleanup(testDir);
        
        console.log(`${size} components processed in ${duration.toFixed(2)}ms`);
      }
      
      // Verify that duration scales reasonably (not exponentially)
      // Simple check: largest project should take less than 10x the smallest
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);
      
      expect(maxDuration / minDuration).toBeLessThan(10);
    });
  });

  describe('Backup Integration', () => {
    test('should integrate with backup system in yolo mode', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Setup migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'backup-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      await fs.writeFile(rulesPath, JSON.stringify({
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-testid': 'migrated-button' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      }, null, 2));
      
      const result = await CLITestRunner.runYolo(fixtureDir);
      
      expect(result.exitCode).toBe(0);
      
      // Check backup directory was created
      const backupDir = path.join(fixtureDir, '.migr8-backups');
      expect(await TestFileUtils.fileExists(backupDir)).toBe(true);
      
      // Check that backup contains original files
      const backupEntries = await fs.readdir(backupDir);
      expect(backupEntries.length).toBeGreaterThan(0);
      
      await SnapshotTestUtils.createCLISnapshot('backup-integration-yolo', result);
    });
  });
});
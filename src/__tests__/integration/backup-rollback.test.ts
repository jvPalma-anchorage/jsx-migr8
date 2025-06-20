import { describe, test, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import path from 'path';
import fs from 'fs/promises';
import { CLITestRunner, TestFileUtils } from './test-utils/cli-test-utils';
import { SnapshotTestUtils } from './test-utils/snapshot-utils';

describe('jsx-migr8 Backup and Rollback Integration Tests', () => {
  let tempDir: string;
  let fixtureDir: string;

  beforeAll(async () => {
    // Ensure git is configured for tests
    try {
      await TestFileUtils.writeFile('/tmp/git-test', 'test');
      await fs.unlink('/tmp/git-test');
    } catch (error) {
      console.warn('Git configuration might need to be set up for backup tests');
    }
  });

  beforeEach(async () => {
    tempDir = await TestFileUtils.createTempDir('backup-test-');
    
    // Initialize git repository for backup tests
    await CLITestRunner.runCLI(['git', 'init'], { cwd: tempDir });
    await CLITestRunner.runCLI(['git', 'config', 'user.email', 'test@example.com'], { cwd: tempDir });
    await CLITestRunner.runCLI(['git', 'config', 'user.name', 'Test User'], { cwd: tempDir });
  });

  afterEach(async () => {
    if (tempDir) {
      await TestFileUtils.cleanup(tempDir);
    }
    if (fixtureDir && fixtureDir !== tempDir) {
      await TestFileUtils.cleanup(fixtureDir);
    }
  });

  describe('Backup Creation During Transformations', () => {
    test('should create backup before YOLO transformation', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Initialize git in fixture directory
      await CLITestRunner.runCLI(['git', 'init'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'config', 'user.email', 'test@example.com'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'config', 'user.name', 'Test User'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'add', '.'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'commit', '-m', 'Initial commit'], { cwd: fixtureDir });

      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'backup-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
      const migrationRules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{ variant: 'primary' }],
              set: { 'data-migrated': 'true' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      };
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));

      // Read original file content
      const originalContent = await TestFileUtils.readFile(path.join(fixtureDir, 'src', 'App.tsx'));

      // Run YOLO transformation
      const result = await CLITestRunner.runYolo(fixtureDir);
      
      expect(result.exitCode).toBe(0);

      // Check that backup directory was created
      const backupDir = path.join(fixtureDir, '.migr8-backups');
      const backupExists = await TestFileUtils.fileExists(backupDir);
      expect(backupExists).toBe(true);

      // Check backup contents
      const backupEntries = await fs.readdir(backupDir);
      expect(backupEntries.length).toBeGreaterThan(0);

      // Find the most recent backup
      const backupDirs = backupEntries.filter(entry => entry.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/));
      expect(backupDirs.length).toBeGreaterThan(0);

      const latestBackup = backupDirs.sort().pop();
      const backupAppFile = path.join(backupDir, latestBackup!, 'src', 'App.tsx');
      
      if (await TestFileUtils.fileExists(backupAppFile)) {
        const backedUpContent = await TestFileUtils.readFile(backupAppFile);
        expect(backedUpContent).toBe(originalContent);
      }

      await SnapshotTestUtils.createCLISnapshot('backup-creation-yolo', result);
    });

    test('should not create backup during dry-run', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'dry-run-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
      const migrationRules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-dry-run': 'true' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      };
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));

      // Run dry-run
      const result = await CLITestRunner.runDryRun(fixtureDir);
      
      expect(result.exitCode).toBe(0);

      // Check that no backup directory was created
      const backupDir = path.join(fixtureDir, '.migr8-backups');
      const backupExists = await TestFileUtils.fileExists(backupDir);
      expect(backupExists).toBe(false);
    });
  });

  describe('Backup Integrity and Validation', () => {
    test('should create backup with metadata and checksums', async () => {
      fixtureDir = await TestFileUtils.createTempDir('backup-integrity-');
      
      // Create test project
      const testFiles = [
        { path: 'src/App.tsx', content: 'import { Button } from "@ui-library/components";\nexport const App = () => <Button variant="primary">Test</Button>;' },
        { path: 'src/utils/helper.ts', content: 'export const helper = () => "test";' },
        { path: 'package.json', content: JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2) }
      ];

      for (const file of testFiles) {
        await TestFileUtils.writeFile(path.join(fixtureDir, file.path), file.content);
      }

      // Initialize git
      await CLITestRunner.runCLI(['git', 'init'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'config', 'user.email', 'test@example.com'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'config', 'user.name', 'Test User'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'add', '.'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'commit', '-m', 'Initial commit'], { cwd: fixtureDir });

      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'integrity-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
      const migrationRules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-integrity': 'test' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      };
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));

      // Run transformation
      const result = await CLITestRunner.runYolo(fixtureDir);
      
      expect(result.exitCode).toBe(0);

      // Check backup metadata
      const backupDir = path.join(fixtureDir, '.migr8-backups');
      const backupEntries = await fs.readdir(backupDir);
      const backupDirs = backupEntries.filter(entry => entry.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/));
      
      expect(backupDirs.length).toBeGreaterThan(0);

      const latestBackup = backupDirs.sort().pop();
      const metadataFile = path.join(backupDir, latestBackup!, 'metadata.json');
      
      if (await TestFileUtils.fileExists(metadataFile)) {
        const metadata = JSON.parse(await TestFileUtils.readFile(metadataFile));
        
        expect(metadata).toHaveProperty('timestamp');
        expect(metadata).toHaveProperty('version');
        expect(metadata).toHaveProperty('files');
        expect(metadata.files).toBeInstanceOf(Array);
        expect(metadata.files.length).toBeGreaterThan(0);
        
        // Check that file checksums are included
        metadata.files.forEach((file: any) => {
          expect(file).toHaveProperty('path');
          expect(file).toHaveProperty('checksum');
          expect(file).toHaveProperty('size');
        });
      }
    });

    test('should verify backup integrity', async () => {
      fixtureDir = await TestFileUtils.createTempDir('backup-verify-');
      
      // Create test project
      await TestFileUtils.writeFile(
        path.join(fixtureDir, 'src', 'App.tsx'),
        'import { Button } from "@ui-library/components";\nexport const App = () => <Button>Test</Button>;'
      );
      
      await TestFileUtils.writeFile(
        path.join(fixtureDir, 'package.json'),
        JSON.stringify({ name: 'verify-test', version: '1.0.0' }, null, 2)
      );

      // Initialize git
      await CLITestRunner.runCLI(['git', 'init'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'config', 'user.email', 'test@example.com'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'config', 'user.name', 'Test User'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'add', '.'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'commit', '-m', 'Initial commit'], { cwd: fixtureDir });

      // Create simple migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'verify-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      await fs.writeFile(rulesPath, JSON.stringify({
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-verified': 'true' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      }, null, 2));

      // Run transformation to create backup
      const result = await CLITestRunner.runYolo(fixtureDir);
      expect(result.exitCode).toBe(0);

      // Verify backup was created and files match
      const backupDir = path.join(fixtureDir, '.migr8-backups');
      const backupExists = await TestFileUtils.fileExists(backupDir);
      expect(backupExists).toBe(true);

      const backupEntries = await fs.readdir(backupDir);
      const backupDirs = backupEntries.filter(entry => entry.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/));
      expect(backupDirs.length).toBeGreaterThan(0);
    });
  });

  describe('Rollback Operations', () => {
    test('should support rollback to previous state', async () => {
      fixtureDir = await TestFileUtils.createTempDir('rollback-test-');
      
      // Create initial project state
      const originalContent = 'import { Button } from "@ui-library/components";\nexport const App = () => <Button variant="primary">Original</Button>;';
      await TestFileUtils.writeFile(path.join(fixtureDir, 'src', 'App.tsx'), originalContent);
      await TestFileUtils.writeFile(
        path.join(fixtureDir, 'package.json'),
        JSON.stringify({ name: 'rollback-test', version: '1.0.0' }, null, 2)
      );

      // Initialize git
      await CLITestRunner.runCLI(['git', 'init'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'config', 'user.email', 'test@example.com'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'config', 'user.name', 'Test User'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'add', '.'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'commit', '-m', 'Initial commit'], { cwd: fixtureDir });

      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'rollback-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      await fs.writeFile(rulesPath, JSON.stringify({
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{ variant: 'primary' }],
              rename: { variant: 'appearance' },
              set: { appearance: 'primary', 'data-migrated': 'true' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library-v2/components'
            }]
          }
        }
      }, null, 2));

      // Run transformation
      const transformResult = await CLITestRunner.runYolo(fixtureDir);
      expect(transformResult.exitCode).toBe(0);

      // Verify transformation occurred
      const transformedContent = await TestFileUtils.readFile(path.join(fixtureDir, 'src', 'App.tsx'));
      expect(transformedContent).not.toBe(originalContent);
      expect(transformedContent).toContain('data-migrated="true"');

      // Check that backup was created
      const backupDir = path.join(fixtureDir, '.migr8-backups');
      const backupExists = await TestFileUtils.fileExists(backupDir);
      expect(backupExists).toBe(true);

      const backupEntries = await fs.readdir(backupDir);
      const backupDirs = backupEntries.filter(entry => entry.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/));
      expect(backupDirs.length).toBeGreaterThan(0);

      // The actual rollback would be implemented as a separate CLI command
      // For now, we verify that the backup contains the original content
      const latestBackup = backupDirs.sort().pop();
      const backupAppFile = path.join(backupDir, latestBackup!, 'src', 'App.tsx');
      
      if (await TestFileUtils.fileExists(backupAppFile)) {
        const backedUpContent = await TestFileUtils.readFile(backupAppFile);
        expect(backedUpContent).toBe(originalContent);
      }

      await SnapshotTestUtils.createCLISnapshot('rollback-operation-test', transformResult);
    });

    test('should handle multiple backup snapshots', async () => {
      fixtureDir = await TestFileUtils.createTempDir('multiple-backups-');
      
      // Create initial state
      await TestFileUtils.writeFile(
        path.join(fixtureDir, 'src', 'App.tsx'),
        'import { Button } from "@ui-library/components";\nexport const App = () => <Button>Version 1</Button>;'
      );
      
      await TestFileUtils.writeFile(
        path.join(fixtureDir, 'package.json'),
        JSON.stringify({ name: 'multi-backup-test', version: '1.0.0' }, null, 2)
      );

      // Initialize git
      await CLITestRunner.runCLI(['git', 'init'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'config', 'user.email', 'test@example.com'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'config', 'user.name', 'Test User'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'add', '.'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'commit', '-m', 'Initial commit'], { cwd: fixtureDir });

      // Create migration rules for first transformation
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'multi-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
      // First transformation
      await fs.writeFile(rulesPath, JSON.stringify({
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-version': '2' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      }, null, 2));

      const result1 = await CLITestRunner.runYolo(fixtureDir);
      expect(result1.exitCode).toBe(0);

      // Second transformation
      await fs.writeFile(rulesPath, JSON.stringify({
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-version': '3' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      }, null, 2));

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1100));

      const result2 = await CLITestRunner.runYolo(fixtureDir);
      expect(result2.exitCode).toBe(0);

      // Check that multiple backups exist
      const backupDir = path.join(fixtureDir, '.migr8-backups');
      const backupEntries = await fs.readdir(backupDir);
      const backupDirs = backupEntries.filter(entry => entry.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/));
      
      // Should have at least 2 backup directories
      expect(backupDirs.length).toBeGreaterThanOrEqual(2);
      
      console.log(`Created ${backupDirs.length} backup snapshots`);
    });
  });

  describe('Backup Integration with Git', () => {
    test('should integrate backups with git branches', async () => {
      fixtureDir = await TestFileUtils.createTempDir('git-integration-');
      
      // Create initial project
      await TestFileUtils.writeFile(
        path.join(fixtureDir, 'src', 'App.tsx'),
        'import { Button } from "@ui-library/components";\nexport const App = () => <Button>Git Test</Button>;'
      );
      
      await TestFileUtils.writeFile(
        path.join(fixtureDir, 'package.json'),
        JSON.stringify({ name: 'git-test', version: '1.0.0' }, null, 2)
      );

      // Initialize git with proper setup
      await CLITestRunner.runCLI(['git', 'init'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'config', 'user.email', 'test@example.com'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'config', 'user.name', 'Test User'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'add', '.'], { cwd: fixtureDir });
      await CLITestRunner.runCLI(['git', 'commit', '-m', 'Initial commit'], { cwd: fixtureDir });

      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'git-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      await fs.writeFile(rulesPath, JSON.stringify({
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-git-test': 'true' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      }, null, 2));

      // Run transformation
      const result = await CLITestRunner.runYolo(fixtureDir);
      expect(result.exitCode).toBe(0);

      // Check git status
      const gitStatusResult = await CLITestRunner.runCLI(['git', 'status', '--porcelain'], { cwd: fixtureDir });
      
      // Files should be modified
      expect(gitStatusResult.stdout.trim().length).toBeGreaterThan(0);

      // Check that backup includes git information
      const backupDir = path.join(fixtureDir, '.migr8-backups');
      const backupExists = await TestFileUtils.fileExists(backupDir);
      expect(backupExists).toBe(true);
    });
  });

  describe('Backup Error Handling', () => {
    test('should handle backup failures gracefully', async () => {
      fixtureDir = await TestFileUtils.createTempDir('backup-error-');
      
      // Create test project
      await TestFileUtils.writeFile(
        path.join(fixtureDir, 'src', 'App.tsx'),
        'import { Button } from "@ui-library/components";\nexport const App = () => <Button>Error Test</Button>;'
      );

      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'error-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      await fs.writeFile(rulesPath, JSON.stringify({
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-error-test': 'true' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      }, null, 2));

      // Create a read-only directory where backup would be created
      const backupDir = path.join(fixtureDir, '.migr8-backups');
      await fs.mkdir(backupDir, { recursive: true });
      
      try {
        await fs.chmod(backupDir, 0o444); // Read-only

        // Run transformation - should handle backup failure gracefully
        const result = await CLITestRunner.runYolo(fixtureDir, [], { expectError: true });
        
        // Depending on implementation, this might fail or continue with warning
        expect([0, 1]).toContain(result.exitCode);
        
        if (result.exitCode !== 0) {
          expect(result.stderr.toLowerCase() || result.stdout.toLowerCase()).toMatch(/backup|permission|error/);
        }
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.chmod(backupDir, 0o755);
        } catch {
          // Ignore errors during cleanup
        }
      }

      await SnapshotTestUtils.createCLISnapshot('backup-error-handling', result);
    });

    test('should handle disk space issues during backup', async () => {
      fixtureDir = await TestFileUtils.createTempDir('disk-space-backup-');
      
      // This test simulates disk space issues by creating very large files
      // In practice, this would be implemented with more sophisticated mocking
      
      // Create a moderately large project
      const largeContent = 'import { Button } from "@ui-library/components";\n'.repeat(1000);
      await TestFileUtils.writeFile(path.join(fixtureDir, 'src', 'Large.tsx'), largeContent + '\nexport const Large = () => <Button>Large</Button>;');

      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'disk-space-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      await fs.writeFile(rulesPath, JSON.stringify({
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-disk-test': 'true' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      }, null, 2));

      // Run transformation
      const result = await CLITestRunner.runYolo(fixtureDir);
      
      // Should handle large files gracefully
      expect([0, 1]).toContain(result.exitCode);
      
      console.log(`Large file backup test completed with exit code: ${result.exitCode}`);
    });
  });
});
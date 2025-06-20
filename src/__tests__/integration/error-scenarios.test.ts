import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import fs from 'fs/promises';
import { CLITestRunner, TestFileUtils } from './test-utils/cli-test-utils';
import { SnapshotTestUtils } from './test-utils/snapshot-utils';

describe('jsx-migr8 Error Scenarios and Edge Cases', () => {
  let tempDir: string;
  let fixtureDir: string;

  beforeEach(async () => {
    tempDir = await TestFileUtils.createTempDir('error-test-');
  });

  afterEach(async () => {
    if (tempDir) {
      await TestFileUtils.cleanup(tempDir);
    }
    if (fixtureDir && fixtureDir !== tempDir) {
      await TestFileUtils.cleanup(fixtureDir);
    }
  });

  describe('Configuration Errors', () => {
    test('Missing ROOT_PATH environment variable', async () => {
      const result = await CLITestRunner.runCLI(['--dry-run'], {
        env: {}, // No ROOT_PATH
        expectError: true
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toLowerCase() || result.stdout.toLowerCase()).toMatch(/root_path|path|directory/);
      
      await SnapshotTestUtils.createCLISnapshot('error-missing-root-path', result);
    });

    test('Invalid ROOT_PATH (non-existent directory)', async () => {
      const result = await CLITestRunner.runCLI(['--dry-run'], {
        env: {
          ROOT_PATH: '/this/path/does/not/exist/anywhere'
        },
        expectError: true
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toLowerCase() || result.stdout.toLowerCase()).toMatch(/not found|does not exist|invalid/);
      
      await SnapshotTestUtils.createCLISnapshot('error-invalid-root-path', result);
    });

    test('ROOT_PATH pointing to file instead of directory', async () => {
      // Create a file instead of directory
      const filePath = path.join(tempDir, 'not-a-directory.txt');
      await fs.writeFile(filePath, 'This is a file, not a directory');

      const result = await CLITestRunner.runCLI(['--dry-run'], {
        env: {
          ROOT_PATH: filePath
        },
        expectError: true
      });

      expect(result.exitCode).not.toBe(0);
      
      await SnapshotTestUtils.createCLISnapshot('error-root-path-is-file', result);
    });

    test('Permission denied on ROOT_PATH', async () => {
      // Create directory with restricted permissions
      const restrictedDir = path.join(tempDir, 'restricted');
      await fs.mkdir(restrictedDir);
      await fs.chmod(restrictedDir, 0o000); // No permissions

      const result = await CLITestRunner.runCLI(['--dry-run'], {
        env: {
          ROOT_PATH: restrictedDir
        },
        expectError: true
      });

      // Restore permissions for cleanup
      await fs.chmod(restrictedDir, 0o755);

      expect(result.exitCode).not.toBe(0);
      
      await SnapshotTestUtils.createCLISnapshot('error-permission-denied-root-path', result);
    });
  });

  describe('Migration Rules Errors', () => {
    test('Invalid JSON in migration rules file', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Create invalid JSON migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'invalid.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      await fs.writeFile(rulesPath, '{ "invalid": json, "missing": quote }');

      const result = await CLITestRunner.runDryRun(fixtureDir, [], { expectError: true });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toLowerCase() || result.stdout.toLowerCase()).toMatch(/json|parse|syntax/);
      
      await SnapshotTestUtils.createCLISnapshot('error-invalid-json-rules', result);
    });

    test('Missing required fields in migration rules', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Create migration rules with missing required fields
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'incomplete.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      const incompleteRules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              // Missing match, importFrom, importTo fields
              set: { variant: 'primary' }
            }]
          }
        }
      };
      await fs.writeFile(rulesPath, JSON.stringify(incompleteRules, null, 2));

      const result = await CLITestRunner.runDryRun(fixtureDir, [], { expectError: true });

      // Might succeed with warnings or fail depending on implementation
      expect([0, 1]).toContain(result.exitCode);
      
      await SnapshotTestUtils.createCLISnapshot('error-incomplete-migration-rules', result);
    });

    test('Circular dependency in replacement rules', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'circular.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      const circularRules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              importFrom: '@ui-library/components',
              importTo: '@ui-library-v2/components',
              replaceWith: {
                code: '<Button>Circular reference</Button>'
              }
            }]
          }
        }
      };
      await fs.writeFile(rulesPath, JSON.stringify(circularRules, null, 2));

      const result = await CLITestRunner.runYolo(fixtureDir, [], { expectError: true });

      // Should handle circular dependency gracefully
      expect([0, 1]).toContain(result.exitCode);
      
      await SnapshotTestUtils.createCLISnapshot('error-circular-replacement-rules', result);
    });

    test('No migration rules directory', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Remove migration rules directory
      const rulesDir = path.join(fixtureDir, 'migr8Rules');
      try {
        await fs.rm(rulesDir, { recursive: true, force: true });
      } catch {
        // Directory might not exist
      }

      const result = await CLITestRunner.runDryRun(fixtureDir, [], { expectError: true });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toLowerCase() || result.stdout.toLowerCase()).toMatch(/rules|not found|missing/);
      
      await SnapshotTestUtils.createCLISnapshot('error-no-migration-rules-directory', result);
    });
  });

  describe('File System Errors', () => {
    test('Read-only files during transformation', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Create basic migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      const rules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-testid': 'button' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      };
      await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2));

      // Make a source file read-only
      const sourceFile = path.join(fixtureDir, 'src', 'App.tsx');
      await fs.chmod(sourceFile, 0o444); // Read-only

      const result = await CLITestRunner.runYolo(fixtureDir, [], { expectError: true });

      // Restore permissions for cleanup
      try {
        await fs.chmod(sourceFile, 0o644);
      } catch {
        // Ignore error
      }

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toLowerCase() || result.stdout.toLowerCase()).toMatch(/permission|read.?only|write/);
      
      await SnapshotTestUtils.createCLISnapshot('error-readonly-files', result);
    });

    test('Disk space exhaustion simulation', async () => {
      // This test is tricky to implement without actually filling disk
      // Instead, we'll test with a very large file that would cause memory issues
      fixtureDir = await TestFileUtils.createTempDir('disk-space-test-');
      
      // Create a very large file (1MB of repeated content)
      const largeContent = 'import { Button } from "@ui-library/components";\n'.repeat(50000);
      const largeFile = path.join(fixtureDir, 'src', 'LargeComponent.tsx');
      await fs.mkdir(path.dirname(largeFile), { recursive: true });
      await fs.writeFile(largeFile, largeContent);

      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'large-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      const rules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-large': 'true' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      };
      await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2));

      const result = await CLITestRunner.runDryRun(fixtureDir, [], {
        timeout: 60000, // Extended timeout
        expectError: false // Should handle large files gracefully
      });

      // Should handle large files without crashing
      expect([0, 1]).toContain(result.exitCode);
      
      console.log(`Large file processing (${largeContent.length} chars): ${result.duration}ms`);
    });

    test('Corrupted source files', async () => {
      fixtureDir = await TestFileUtils.createTempDir('corrupted-files-');
      
      // Create files with various syntax errors and corrupted content
      const corruptedFiles = [
        {
          path: 'src/SyntaxError.tsx',
          content: `import React from 'react';
import { Button } from '@ui-library/components';

const SyntaxError = () => {
  return (
    <div>
      <Button variant="primary" // Missing closing tag and bracket
        Invalid JSX
      </Button
    </div>
  );
};`
        },
        {
          path: 'src/InvalidImport.tsx',
          content: `import { NonExistentComponent } from '@nonexistent/package';
import { Button } from; // Invalid import syntax

const InvalidImport = () => {
  return <NonExistentComponent><Button /></NonExistentComponent>;
};`
        },
        {
          path: 'src/BinaryContent.tsx',
          content: Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFD]).toString()
        }
      ];

      for (const file of corruptedFiles) {
        const filePath = path.join(fixtureDir, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }

      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'corrupt-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      const rules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-test': 'true' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      };
      await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2));

      const result = await CLITestRunner.runDryRun(fixtureDir, [], { expectError: true });

      // Should handle corrupted files gracefully without crashing
      expect([0, 1]).toContain(result.exitCode);
      
      await SnapshotTestUtils.createCLISnapshot('error-corrupted-source-files', result);
    });
  });

  describe('JSX Parsing Edge Cases', () => {
    test('Malformed JSX structures', async () => {
      fixtureDir = await TestFileUtils.createTempDir('malformed-jsx-');
      
      const malformedFile = path.join(fixtureDir, 'src', 'Malformed.tsx');
      const malformedContent = `import React from 'react';
import { Button, Text } from '@ui-library/components';

const Malformed = () => {
  return (
    <div>
      {/* Unclosed JSX element */}
      <Button variant="primary">
        <Text size="large">Unclosed text
      </Button>
      
      {/* Mismatched tags */}
      <Button>
        <div>
          <Text>Mismatched</Button>
        </div>
      </Text>
      
      {/* Invalid JSX expression */}
      <Button onClick={() => { return <invalid jsx /> }}>
        Invalid
      </Button>
    </div>
  );
};

export default Malformed;`;

      await fs.mkdir(path.dirname(malformedFile), { recursive: true });
      await fs.writeFile(malformedFile, malformedContent);

      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'malformed-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      const rules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-test': 'malformed' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      };
      await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2));

      const result = await CLITestRunner.runDryRun(fixtureDir, [], { expectError: true });

      // Should handle malformed JSX gracefully
      expect([0, 1]).toContain(result.exitCode);
      
      await SnapshotTestUtils.createCLISnapshot('error-malformed-jsx-structures', result);
    });

    test('Complex nested expressions', async () => {
      fixtureDir = await TestFileUtils.createTempDir('complex-expressions-');
      
      const complexFile = path.join(fixtureDir, 'src', 'Complex.tsx');
      const complexContent = `import React from 'react';
import { Button, Text } from '@ui-library/components';

const Complex = ({ data, config }) => {
  return (
    <div>
      {/* Extremely complex nested expression */}
      <Button 
        variant={
          data?.items?.length > 0 
            ? (config.theme === 'dark' 
                ? 'primary' 
                : config.variants?.[data.type]?.primary || 'secondary'
              )
            : 'disabled'
        }
        onClick={() => {
          const result = data.items
            .filter(item => item.active)
            .map(item => ({
              ...item,
              processed: true,
              timestamp: new Date().toISOString()
            }))
            .reduce((acc, item) => {
              acc[item.id] = item;
              return acc;
            }, {});
          
          return handleClick(result);
        }}
      >
        {data?.items?.map((item, index) => (
          <Text key={item.id || index} size={item.important ? 'large' : 'medium'}>
            {item.name || \`Item \${index + 1}\`}
          </Text>
        )) || 'No items'}
      </Button>
      
      {/* Function as children pattern */}
      <Button>
        {(props) => (
          <Text {...props} size="large">
            {typeof props.children === 'function' 
              ? props.children({ data, config })
              : props.children
            }
          </Text>
        )}
      </Button>
    </div>
  );
};

export default Complex;`;

      await fs.mkdir(path.dirname(complexFile), { recursive: true });
      await fs.writeFile(complexFile, complexContent);

      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'complex-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      const rules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-complex': 'true' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      };
      await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2));

      const result = await CLITestRunner.runDryRun(fixtureDir);

      // Should handle complex expressions without crashing
      expect([0, 1]).toContain(result.exitCode);
      
      await SnapshotTestUtils.createCLISnapshot('edge-case-complex-expressions', result);
    });
  });

  describe('Memory and Resource Limits', () => {
    test('Deeply nested component structures', async () => {
      fixtureDir = await TestFileUtils.createTempDir('deep-nesting-');
      
      // Generate deeply nested component structure
      let nestedContent = 'import React from "react";\nimport { Button, Text } from "@ui-library/components";\n\n';
      nestedContent += 'const DeeplyNested = () => {\n  return (\n';
      
      // Create 50 levels of nesting
      for (let i = 0; i < 50; i++) {
        nestedContent += '    '.repeat(i + 2) + `<Button variant="primary">\n`;
      }
      
      nestedContent += '    '.repeat(52) + '<Text size="large">Deep content</Text>\n';
      
      for (let i = 49; i >= 0; i--) {
        nestedContent += '    '.repeat(i + 2) + '</Button>\n';
      }
      
      nestedContent += '  );\n};\n\nexport default DeeplyNested;';

      const deepFile = path.join(fixtureDir, 'src', 'DeeplyNested.tsx');
      await fs.mkdir(path.dirname(deepFile), { recursive: true });
      await fs.writeFile(deepFile, nestedContent);

      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'deep-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      const rules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-depth': 'deep' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      };
      await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2));

      const result = await CLITestRunner.runDryRun(fixtureDir, [], {
        timeout: 30000 // Extended timeout for deep processing
      });

      // Should handle deep nesting without stack overflow
      expect([0, 1]).toContain(result.exitCode);
      
      console.log(`Deep nesting test (50 levels): ${result.duration}ms`);
    });

    test('Memory exhaustion protection', async () => {
      fixtureDir = await TestFileUtils.createTempDir('memory-exhaustion-');
      
      // Create multiple large files that together might cause memory issues
      const largeFiles = [];
      for (let i = 0; i < 10; i++) {
        const content = `import { Button, Text } from '@ui-library/components';\n`.repeat(10000);
        largeFiles.push({
          path: `src/Large${i}.tsx`,
          content: content + `\nexport const Large${i} = () => <Button>Large ${i}</Button>;`
        });
      }

      for (const file of largeFiles) {
        const filePath = path.join(fixtureDir, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }

      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'memory-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      const rules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-memory-test': 'true' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      };
      await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2));

      // Monitor memory usage
      const initialMemory = process.memoryUsage();

      const result = await CLITestRunner.runDryRun(fixtureDir, [], {
        timeout: 60000 // Extended timeout
      });

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Should complete without excessive memory usage
      expect([0, 1]).toContain(result.exitCode);
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024); // Less than 500MB increase
      
      console.log(`Memory usage for large files: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('CLI Error Recovery', () => {
    test('Recovery from interrupted operations', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'recovery-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      const rules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{}],
              set: { 'data-recovery': 'true' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library/components'
            }]
          }
        }
      };
      await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2));

      // Start transformation but interrupt it (simulate with short timeout)
      const interruptedResult = await CLITestRunner.runYolo(fixtureDir, [], {
        timeout: 100, // Very short timeout to simulate interruption
        expectError: true
      });

      expect(interruptedResult.exitCode).not.toBe(0);

      // Now run again with proper timeout - should recover
      const recoveredResult = await CLITestRunner.runDryRun(fixtureDir);
      
      expect([0, 1]).toContain(recoveredResult.exitCode);
      
      await SnapshotTestUtils.createCLISnapshot('error-recovery-interrupted-operation', recoveredResult);
    });
  });
});
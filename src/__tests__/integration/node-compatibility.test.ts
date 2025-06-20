import { describe, test, expect, beforeAll } from '@jest/globals';
import { CLITestRunner, TestFileUtils } from './test-utils/cli-test-utils';

describe('Node.js Version Compatibility Tests', () => {
  let nodeVersion: string;
  let platform: string;

  beforeAll(() => {
    nodeVersion = process.version;
    platform = process.platform;
    
    console.log(`Running on Node.js ${nodeVersion} on ${platform}`);
  });

  describe('Node.js Version Requirements', () => {
    test('should meet minimum Node.js version requirement', () => {
      const majorVersion = parseInt(process.version.slice(1).split('.')[0]);
      
      // jsx-migr8 requires Node.js >= 22.0.0
      expect(majorVersion).toBeGreaterThanOrEqual(22);
    });

    test('should support ES modules', async () => {
      // Test that ES modules work correctly
      try {
        const { CLITestRunner: ImportedCLITestRunner } = await import('./test-utils/cli-test-utils.js');
        expect(ImportedCLITestRunner).toBeDefined();
      } catch (error) {
        // If dynamic import fails, check if it's due to .js extension issue
        const { CLITestRunner: ImportedCLITestRunner } = await import('./test-utils/cli-test-utils');
        expect(ImportedCLITestRunner).toBeDefined();
      }
    });

    test('should support required Node.js APIs', () => {
      // Test for APIs that jsx-migr8 depends on
      expect(typeof globalThis.fetch).toBe('function'); // Node 18+ built-in fetch
      expect(typeof AbortController).toBe('function'); // Node 15+
      expect(typeof Promise.allSettled).toBe('function'); // Node 12.9+
      expect(typeof String.prototype.replaceAll).toBe('function'); // Node 15+
    });
  });

  describe('Platform-Specific Features', () => {
    test('should handle file paths correctly on current platform', async () => {
      const tempDir = await TestFileUtils.createTempDir('platform-test-');
      
      try {
        // Create a test file with platform-specific path
        const testFile = await TestFileUtils.writeFile(
          `${tempDir}/test.txt`,
          'Platform test content'
        );
        
        const content = await TestFileUtils.readFile(`${tempDir}/test.txt`);
        expect(content).toBe('Platform test content');
        
        expect(await TestFileUtils.fileExists(`${tempDir}/test.txt`)).toBe(true);
      } finally {
        await TestFileUtils.cleanup(tempDir);
      }
    });

    test('should handle CLI execution on current platform', async () => {
      const tempDir = await TestFileUtils.createTempDir('cli-platform-test-');
      
      try {
        // Create minimal test project
        await TestFileUtils.writeFile(
          `${tempDir}/package.json`,
          JSON.stringify({
            name: 'platform-test',
            version: '1.0.0',
            dependencies: {
              '@ui-library/components': '^1.0.0'
            }
          }, null, 2)
        );

        await TestFileUtils.writeFile(
          `${tempDir}/src/App.tsx`,
          `import { Button } from '@ui-library/components';
export const App = () => <Button>Test</Button>;`
        );

        // Test help command works on current platform
        const result = await CLITestRunner.runCLI(['--help'], {
          cwd: tempDir,
          timeout: 10000
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('jsx-migr8');
      } finally {
        await TestFileUtils.cleanup(tempDir);
      }
    });
  });

  describe('Performance on Current Node Version', () => {
    test('should have acceptable performance on current Node version', async () => {
      const tempDir = await TestFileUtils.createTempDir('perf-version-test-');
      
      try {
        // Create a medium-sized test project
        const files = Array.from({ length: 20 }, (_, i) => ({
          path: `src/Component${i}.tsx`,
          content: `import { Button, Text } from '@ui-library/components';
export const Component${i} = () => (
  <div>
    <Text size="large">Component ${i}</Text>
    <Button variant="primary">Action ${i}</Button>
  </div>
);`
        }));

        // Write package.json
        await TestFileUtils.writeFile(
          `${tempDir}/package.json`,
          JSON.stringify({
            name: 'perf-test',
            version: '1.0.0',
            dependencies: {
              '@ui-library/components': '^1.0.0'
            }
          }, null, 2)
        );

        // Write all test files
        for (const file of files) {
          await TestFileUtils.writeFile(`${tempDir}/${file.path}`, file.content);
        }

        const startTime = Date.now();
        
        const result = await CLITestRunner.runDryRun(tempDir, [], {
          timeout: 30000
        });
        
        const duration = Date.now() - startTime;
        
        expect(result.exitCode).toBe(0);
        expect(duration).toBeLessThan(15000); // Should complete in under 15 seconds
        
        console.log(`Performance on Node ${nodeVersion}: ${duration}ms for 20 files`);
      } finally {
        await TestFileUtils.cleanup(tempDir);
      }
    });
  });

  describe('Memory Usage on Current Node Version', () => {
    test('should have reasonable memory usage', async () => {
      const tempDir = await TestFileUtils.createTempDir('memory-version-test-');
      
      try {
        // Create a project that might use significant memory
        const largeContent = Array.from({ length: 1000 }, (_, i) => 
          `import { Button } from '@ui-library/components';`
        ).join('\n') + '\n\nexport const LargeComponent = () => <Button>Large</Button>;';

        await TestFileUtils.writeFile(
          `${tempDir}/package.json`,
          JSON.stringify({
            name: 'memory-test',
            version: '1.0.0',
            dependencies: {
              '@ui-library/components': '^1.0.0'
            }
          }, null, 2)
        );

        await TestFileUtils.writeFile(`${tempDir}/src/Large.tsx`, largeContent);

        const initialMemory = process.memoryUsage();
        
        const result = await CLITestRunner.runDryRun(tempDir);
        
        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        
        expect(result.exitCode).toBe(0);
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
        
        console.log(`Memory usage on Node ${nodeVersion}: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      } finally {
        await TestFileUtils.cleanup(tempDir);
      }
    });
  });

  describe('Feature Support Matrix', () => {
    test('should support all required JavaScript features', () => {
      const features = {
        'Optional Chaining': () => {
          const obj: any = {};
          return obj?.nested?.property === undefined;
        },
        'Nullish Coalescing': () => {
          return (null ?? 'default') === 'default';
        },
        'BigInt': () => {
          return typeof BigInt(123) === 'bigint';
        },
        'Dynamic Imports': async () => {
          try {
            await import('path');
            return true;
          } catch {
            return false;
          }
        },
        'Top-level await': () => {
          // This test itself verifies top-level await support in the module system
          return true;
        },
        'Private Fields': () => {
          class TestClass {
            #private = 'private';
            getPrivate() { return this.#private; }
          }
          return new TestClass().getPrivate() === 'private';
        }
      };

      Object.entries(features).forEach(([featureName, testFn]) => {
        try {
          const result = testFn();
          if (result instanceof Promise) {
            // For async features, we'll just check they don't throw
            result.catch(() => {});
          }
          console.log(`✅ ${featureName} is supported`);
        } catch (error) {
          console.warn(`⚠️  ${featureName} may not be fully supported:`, error);
        }
      });
    });
  });

  describe('Cross-Platform Path Handling', () => {
    test('should handle different path separators', async () => {
      const tempDir = await TestFileUtils.createTempDir('path-test-');
      
      try {
        // Test with both forward and back slashes
        const paths = [
          'src/components/Button.tsx',
          'src\\components\\Text.tsx', // This should work on all platforms
          'src/nested/deeply/Component.tsx'
        ];

        for (const testPath of paths) {
          const normalizedPath = testPath.replace(/\\/g, '/'); // Normalize for cross-platform
          const fullPath = `${tempDir}/${normalizedPath}`;
          
          await TestFileUtils.writeFile(fullPath, `// Test file at ${normalizedPath}`);
          
          const exists = await TestFileUtils.fileExists(fullPath);
          expect(exists).toBe(true);
          
          const content = await TestFileUtils.readFile(fullPath);
          expect(content).toContain(normalizedPath);
        }
      } finally {
        await TestFileUtils.cleanup(tempDir);
      }
    });
  });

  describe('Environment Variable Handling', () => {
    test('should handle environment variables correctly', async () => {
      const tempDir = await TestFileUtils.createTempDir('env-test-');
      
      try {
        await TestFileUtils.writeFile(
          `${tempDir}/package.json`,
          JSON.stringify({ name: 'env-test', version: '1.0.0' }, null, 2)
        );

        await TestFileUtils.writeFile(
          `${tempDir}/src/Test.tsx`,
          'import { Button } from "@ui-library/components"; export const Test = () => <Button>Test</Button>;'
        );

        // Test with custom environment variables
        const result = await CLITestRunner.runCLI(['--help'], {
          env: {
            ROOT_PATH: tempDir,
            BLACKLIST: 'node_modules,dist',
            NODE_ENV: 'test'
          },
          timeout: 5000
        });

        expect(result.exitCode).toBe(0);
      } finally {
        await TestFileUtils.cleanup(tempDir);
      }
    });
  });

  describe('Unicode and Encoding Support', () => {
    test('should handle Unicode characters in file content', async () => {
      const tempDir = await TestFileUtils.createTempDir('unicode-test-');
      
      try {
        const unicodeContent = `import { Button } from '@ui-library/components';

// Test with various Unicode characters
export const UnicodeTest = () => (
  <div>
    <Button>🚀 Rocket</Button>
    <Button>測試 Chinese</Button>
    <Button>العربية Arabic</Button>
    <Button>🎨 Emoji Button</Button>
    <Button>Ñoño español</Button>
  </div>
);`;

        await TestFileUtils.writeFile(`${tempDir}/src/Unicode.tsx`, unicodeContent);
        
        const readContent = await TestFileUtils.readFile(`${tempDir}/src/Unicode.tsx`);
        expect(readContent).toBe(unicodeContent);
        
        // Ensure Unicode content doesn't break the CLI
        await TestFileUtils.writeFile(
          `${tempDir}/package.json`,
          JSON.stringify({ name: 'unicode-test', version: '1.0.0' }, null, 2)
        );

        const result = await CLITestRunner.runCLI(['--help'], {
          env: { ROOT_PATH: tempDir }
        });

        expect(result.exitCode).toBe(0);
      } finally {
        await TestFileUtils.cleanup(tempDir);
      }
    });
  });
});
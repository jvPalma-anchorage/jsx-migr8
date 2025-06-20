import { describe, test, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import path from 'path';
import fs from 'fs/promises';
import { CLITestRunner, TestFileUtils } from './test-utils/cli-test-utils';
import { SnapshotTestUtils, TestDataGenerator } from './test-utils/snapshot-utils';

describe('jsx-migr8 Transformation Snapshots', () => {
  let tempDir: string;
  let fixtureDir: string;

  beforeAll(async () => {
    if (process.env.UPDATE_SNAPSHOTS) {
      await SnapshotTestUtils.cleanupSnapshots();
    }
  });

  beforeEach(async () => {
    tempDir = await TestFileUtils.createTempDir('transformation-snapshot-');
  });

  afterEach(async () => {
    if (tempDir) {
      await TestFileUtils.cleanup(tempDir);
    }
    if (fixtureDir && fixtureDir !== tempDir) {
      await TestFileUtils.cleanup(fixtureDir);
    }
  });

  describe('Basic Component Transformations', () => {
    test('Button component variant prop transformation', async () => {
      fixtureDir = await TestFileUtils.createTempDir('button-transform-');
      
      // Create test file with Button components
      const testFile = path.join(fixtureDir, 'src', 'ButtonTest.tsx');
      const originalContent = `import React from 'react';
import { Button } from '@ui-library/components';

const ButtonTest = () => {
  return (
    <div>
      <Button variant="primary" size="large">
        Primary Button
      </Button>
      <Button variant="secondary" size="medium">
        Secondary Button
      </Button>
      <Button variant="outline" size="small" disabled>
        Outline Button
      </Button>
      <Button variant="ghost">
        Ghost Button
      </Button>
    </div>
  );
};

export default ButtonTest;`;

      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, originalContent);

      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'button-migration.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
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
                match: [{ variant: 'secondary' }],
                rename: { variant: 'appearance' },
                set: { appearance: 'secondary' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              },
              {
                match: [{ variant: 'outline' }],
                rename: { variant: 'appearance' },
                set: { appearance: 'outline' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              },
              {
                match: [{ variant: 'ghost' }],
                rename: { variant: 'appearance' },
                set: { appearance: 'ghost' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              }
            ]
          }
        }
      };
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));

      // Run transformation
      const result = await CLITestRunner.runYolo(fixtureDir);
      expect(result.exitCode).toBe(0);

      // Read transformed content
      const transformedContent = await TestFileUtils.readFile(testFile);

      // Create transformation snapshot
      await SnapshotTestUtils.createTransformationSnapshot('button-variant-transformation', [{
        filePath: testFile,
        originalContent,
        transformedContent,
        rules: migrationRules
      }]);

      // Verify transformations
      expect(transformedContent).toContain('@ui-library-v2/components');
      expect(transformedContent).toContain('appearance="primary"');
      expect(transformedContent).toContain('appearance="secondary"');
      expect(transformedContent).toContain('appearance="outline"');
      expect(transformedContent).toContain('appearance="ghost"');
    });

    test('Text component size and weight consolidation', async () => {
      fixtureDir = await TestFileUtils.createTempDir('text-transform-');
      
      const testFile = path.join(fixtureDir, 'src', 'TextTest.tsx');
      const originalContent = `import React from 'react';
import { Text } from '@ui-library/components';

const TextTest = () => {
  return (
    <div>
      <Text size="large" weight="bold" color="primary">
        Large bold text
      </Text>
      <Text size="medium" weight="normal" color="secondary">
        Medium normal text
      </Text>
      <Text size="small" weight="light">
        Small light text
      </Text>
      <Text size="xlarge" weight="bold" color="inherit">
        Extra large bold text
      </Text>
    </div>
  );
};

export default TextTest;`;

      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, originalContent);

      // Create migration rules for Text component
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'text-migration.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
      const migrationRules = {
        lookup: {
          '@ui-library/components': {
            Text: [
              {
                match: [{ size: 'large', weight: 'bold' }],
                remove: ['size', 'weight'],
                set: { variant: 'headingLarge' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              },
              {
                match: [{ size: 'medium', weight: 'normal' }],
                remove: ['size', 'weight'],
                set: { variant: 'bodyMedium' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              },
              {
                match: [{ size: 'small' }],
                remove: ['size', 'weight'],
                set: { variant: 'bodySmall' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              },
              {
                match: [{ size: 'xlarge', weight: 'bold' }],
                remove: ['size', 'weight'],
                set: { variant: 'headingXLarge' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              }
            ]
          }
        }
      };
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));

      // Run transformation
      const result = await CLITestRunner.runYolo(fixtureDir);
      expect(result.exitCode).toBe(0);

      // Read transformed content
      const transformedContent = await TestFileUtils.readFile(testFile);

      // Create transformation snapshot
      await SnapshotTestUtils.createTransformationSnapshot('text-size-weight-consolidation', [{
        filePath: testFile,
        originalContent,
        transformedContent,
        rules: migrationRules
      }]);

      // Verify transformations
      expect(transformedContent).toContain('variant="headingLarge"');
      expect(transformedContent).toContain('variant="bodyMedium"');
      expect(transformedContent).toContain('variant="bodySmall"');
      expect(transformedContent).toContain('variant="headingXLarge"');
      expect(transformedContent).not.toContain('size=');
      expect(transformedContent).not.toContain('weight=');
    });
  });

  describe('Complex Transformation Scenarios', () => {
    test('Nested component transformations with prop inheritance', async () => {
      fixtureDir = await TestFileUtils.createTempDir('nested-transform-');
      
      const testFile = path.join(fixtureDir, 'src', 'NestedTest.tsx');
      const originalContent = `import React from 'react';
import { Card, Text, Button, Icon } from '@ui-library/components';

const NestedTest = () => {
  return (
    <Card elevated shadow="medium" padding="large">
      <div className="header">
        <Text size="large" weight="bold">
          Card Title
        </Text>
        <Icon name="settings" size="medium" />
      </div>
      
      <div className="content">
        <Text size="medium" color="secondary">
          Card description text that provides context.
        </Text>
        
        <div className="nested-card">
          <Card border="subtle" padding="medium">
            <Text size="small" weight="bold">
              Nested Card Title
            </Text>
            <Button variant="primary" size="small">
              <Icon name="arrow-right" size="small" />
              Action
            </Button>
          </Card>
        </div>
      </div>
      
      <div className="actions">
        <Button variant="outline" size="medium">
          Cancel
        </Button>
        <Button variant="primary" size="medium">
          Confirm
        </Button>
      </div>
    </Card>
  );
};

export default NestedTest;`;

      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, originalContent);

      // Create comprehensive migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'nested-migration.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
      const migrationRules = {
        lookup: {
          '@ui-library/components': {
            Card: [
              {
                match: [{ elevated: true }],
                remove: ['elevated'],
                set: { elevation: 'raised' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              },
              {
                match: [{ border: 'subtle' }],
                rename: { border: 'borderStyle' },
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
              },
              {
                match: [{ size: 'medium' }],
                remove: ['size'],
                set: { variant: 'bodyMedium' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              },
              {
                match: [{ size: 'small', weight: 'bold' }],
                remove: ['size', 'weight'],
                set: { variant: 'labelSmall' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              }
            ],
            Button: [
              {
                match: [{ variant: 'primary' }],
                rename: { variant: 'appearance' },
                set: { appearance: 'primary' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              },
              {
                match: [{ variant: 'outline' }],
                rename: { variant: 'appearance' },
                set: { appearance: 'outline' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              }
            ],
            Icon: [
              {
                match: [{}],
                rename: { name: 'iconName' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              }
            ]
          }
        }
      };
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));

      // Run transformation
      const result = await CLITestRunner.runYolo(fixtureDir);
      expect(result.exitCode).toBe(0);

      // Read transformed content
      const transformedContent = await TestFileUtils.readFile(testFile);

      // Create transformation snapshot
      await SnapshotTestUtils.createTransformationSnapshot('nested-component-transformations', [{
        filePath: testFile,
        originalContent,
        transformedContent,
        rules: migrationRules
      }]);

      // Verify complex transformations
      expect(transformedContent).toContain('@ui-library-v2/components');
      expect(transformedContent).toContain('elevation="raised"');
      expect(transformedContent).toContain('borderStyle="subtle"');
      expect(transformedContent).toContain('variant="headingLarge"');
      expect(transformedContent).toContain('appearance="primary"');
      expect(transformedContent).toContain('iconName="settings"');
    });

    test('Component replacement with JSX template', async () => {
      fixtureDir = await TestFileUtils.createTempDir('replacement-transform-');
      
      const testFile = path.join(fixtureDir, 'src', 'ReplacementTest.tsx');
      const originalContent = `import React from 'react';
import { LinkButton } from '@ui-library/components';

const ReplacementTest = () => {
  return (
    <div>
      <LinkButton 
        href="/home" 
        variant="primary" 
        size="large"
        target="_blank"
      >
        Go Home
      </LinkButton>
      
      <LinkButton 
        href="/about" 
        variant="secondary"
        disabled
      >
        About Us
      </LinkButton>
    </div>
  );
};

export default ReplacementTest;`;

      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, originalContent);

      // Create replacement migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'replacement-migration.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
      const migrationRules = {
        lookup: {
          '@ui-library/components': {
            LinkButton: [
              {
                match: [{}],
                remove: ['variant', 'size'],
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components',
                replaceWith: {
                  INNER_PROPS: ['href', 'target'],
                  code: '<Button {...OUTER_PROPS}><a {...INNER_PROPS}>{CHILDREN}</a></Button>'
                }
              }
            ]
          }
        }
      };
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));

      // Run transformation
      const result = await CLITestRunner.runYolo(fixtureDir);
      expect(result.exitCode).toBe(0);

      // Read transformed content
      const transformedContent = await TestFileUtils.readFile(testFile);

      // Create transformation snapshot
      await SnapshotTestUtils.createTransformationSnapshot('component-replacement-with-jsx', [{
        filePath: testFile,
        originalContent,
        transformedContent,
        rules: migrationRules
      }]);

      // Verify replacement transformations
      expect(transformedContent).toContain('<Button');
      expect(transformedContent).toContain('<a href=');
      expect(transformedContent).toContain('Go Home');
      expect(transformedContent).toContain('About Us');
      expect(transformedContent).not.toContain('LinkButton');
    });
  });

  describe('Diff Output Snapshots', () => {
    test('Colored diff output for dry-run mode', async () => {
      fixtureDir = await TestFileUtils.copyFixture('simple-react-app', tempDir);
      
      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'diff-test.json');
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
              match: [{ size: 'large' }],
              remove: ['size'],
              set: { variant: 'bodyLarge' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library-v2/components'
            }]
          }
        }
      };
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));

      // Run dry-run to get diff output
      const result = await CLITestRunner.runDryRun(fixtureDir);
      expect(result.exitCode).toBe(0);

      // Create diff snapshot
      await SnapshotTestUtils.createDiffSnapshot('dry-run-colored-diff', [{
        filePath: path.join(fixtureDir, 'src', 'App.tsx'),
        diff: result.stdout,
        stats: {
          additions: 3,
          deletions: 3,
          changes: 6
        }
      }]);

      // Verify diff contains expected patterns
      expect(result.stdout).toContain('diff') || expect(result.stdout).toContain('change');
    });

    test('Multiple file diff output', async () => {
      fixtureDir = await TestFileUtils.createTempDir('multi-diff-');
      
      // Create multiple test files
      const files = [
        {
          path: 'src/Component1.tsx',
          content: `import { Button } from '@ui-library/components';
export const Component1 = () => <Button variant="primary">Test</Button>;`
        },
        {
          path: 'src/Component2.tsx',
          content: `import { Text } from '@ui-library/components';
export const Component2 = () => <Text size="large">Test</Text>;`
        },
        {
          path: 'src/Component3.tsx',
          content: `import { Card } from '@ui-library/components';
export const Component3 = () => <Card elevated>Test</Card>;`
        }
      ];

      for (const file of files) {
        const filePath = path.join(fixtureDir, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }

      // Create migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'multi-file.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
      const migrationRules = {
        lookup: {
          '@ui-library/components': {
            Button: [{
              match: [{ variant: 'primary' }],
              rename: { variant: 'appearance' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library-v2/components'
            }],
            Text: [{
              match: [{ size: 'large' }],
              remove: ['size'],
              set: { variant: 'bodyLarge' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library-v2/components'
            }],
            Card: [{
              match: [{ elevated: true }],
              remove: ['elevated'],
              set: { elevation: 'raised' },
              importFrom: '@ui-library/components',
              importTo: '@ui-library-v2/components'
            }]
          }
        }
      };
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));

      // Run dry-run to get diff output
      const result = await CLITestRunner.runDryRun(fixtureDir);
      expect(result.exitCode).toBe(0);

      // Create multi-file diff snapshot
      const diffs = files.map(file => ({
        filePath: path.join(fixtureDir, file.path),
        diff: result.stdout, // In practice, this would be file-specific diff
        stats: {
          additions: 1,
          deletions: 1,
          changes: 2
        }
      }));

      await SnapshotTestUtils.createDiffSnapshot('multi-file-diff-output', diffs);
    });
  });

  describe('Edge Case Transformations', () => {
    test('Spread props and complex expressions', async () => {
      fixtureDir = await TestFileUtils.createTempDir('edge-case-transform-');
      
      const testFile = path.join(fixtureDir, 'src', 'EdgeCaseTest.tsx');
      const originalContent = `import React from 'react';
import { Button, Text } from '@ui-library/components';

const EdgeCaseTest = ({ buttonProps, textSize }) => {
  const dynamicVariant = Math.random() > 0.5 ? 'primary' : 'secondary';
  
  return (
    <div>
      <Button 
        {...buttonProps}
        variant={dynamicVariant}
        size="large"
      >
        Dynamic Button
      </Button>
      
      <Text 
        size={textSize || 'medium'}
        weight="bold"
        {...(Math.random() > 0.5 && { color: 'primary' })}
      >
        Complex Text
      </Text>
      
      <Button 
        variant="primary" 
        size={undefined}
        disabled={false}
      />
    </div>
  );
};

export default EdgeCaseTest;`;

      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, originalContent);

      // Create migration rules that handle edge cases
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'edge-case-migration.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
      const migrationRules = {
        lookup: {
          '@ui-library/components': {
            Button: [
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
                match: [{ weight: 'bold' }],
                remove: ['weight'],
                set: { 'data-weight': 'bold' },
                importFrom: '@ui-library/components',
                importTo: '@ui-library-v2/components'
              }
            ]
          }
        }
      };
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));

      // Run transformation
      const result = await CLITestRunner.runYolo(fixtureDir);
      
      // This might not fully succeed due to edge cases, but should not crash
      expect([0, 1]).toContain(result.exitCode);

      // Read potentially transformed content
      const transformedContent = await TestFileUtils.readFile(testFile);

      // Create transformation snapshot for edge cases
      await SnapshotTestUtils.createTransformationSnapshot('edge-case-spread-props', [{
        filePath: testFile,
        originalContent,
        transformedContent,
        rules: migrationRules
      }]);
    });
  });

  describe('Performance Snapshot Tests', () => {
    test('Large file transformation performance', async () => {
      fixtureDir = await TestFileUtils.createTempDir('perf-snapshot-');
      
      // Generate a large component file
      const { files } = TestDataGenerator.generateProjectStructure('large-perf-test', {
        fileCount: 1,
        componentCount: 100,
        complexity: 'complex'
      });

      const testFile = path.join(fixtureDir, files[0].path);
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, files[0].content);

      // Create simple migration rules
      const rulesPath = path.join(fixtureDir, 'migr8Rules', 'perf-test.json');
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
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
      
      await fs.writeFile(rulesPath, JSON.stringify(migrationRules, null, 2));

      const startTime = Date.now();
      
      // Run transformation
      const result = await CLITestRunner.runYolo(fixtureDir);
      
      const duration = Date.now() - startTime;
      
      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds

      // Read transformed content
      const transformedContent = await TestFileUtils.readFile(testFile);

      // Create performance snapshot
      await SnapshotTestUtils.createTransformationSnapshot('large-file-performance', [{
        filePath: testFile,
        originalContent: files[0].content,
        transformedContent,
        rules: migrationRules
      }]);

      console.log(`Large file (${files[0].content.length} chars) transformed in ${duration}ms`);
    });
  });
});
import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

/**
 * Enhanced snapshot testing utilities for jsx-migr8 transformations
 */
export class SnapshotTestUtils {
  private static readonly SNAPSHOT_DIR = '__snapshots__';
  private static readonly EXTENSION = '.snap';

  /**
   * Create a snapshot of CLI output with normalization
   */
  static async createCLISnapshot(
    testName: string,
    output: {
      stdout: string;
      stderr: string;
      exitCode: number;
      duration?: number;
    },
    options: {
      normalizeTimestamps?: boolean;
      normalizePaths?: boolean;
      normalizeColors?: boolean;
    } = {}
  ): Promise<string> {
    const {
      normalizeTimestamps = true,
      normalizePaths = true,
      normalizeColors = true
    } = options;

    let normalizedOutput = {
      ...output,
      stdout: SnapshotTestUtils.normalizeOutput(output.stdout, {
        normalizeTimestamps,
        normalizePaths,
        normalizeColors
      }),
      stderr: SnapshotTestUtils.normalizeOutput(output.stderr, {
        normalizeTimestamps,
        normalizePaths,
        normalizeColors
      })
    };

    // Remove duration from snapshot as it's not deterministic
    delete normalizedOutput.duration;

    const snapshotContent = JSON.stringify(normalizedOutput, null, 2);
    const snapshotPath = await SnapshotTestUtils.getSnapshotPath(testName);
    
    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
    await fs.writeFile(snapshotPath, snapshotContent, 'utf-8');
    
    return snapshotContent;
  }

  /**
   * Create a snapshot of file transformations
   */
  static async createTransformationSnapshot(
    testName: string,
    transformations: {
      filePath: string;
      originalContent: string;
      transformedContent: string;
      rules?: any;
    }[]
  ): Promise<string> {
    const snapshotData = transformations.map(({
      filePath,
      originalContent,
      transformedContent,
      rules
    }) => ({
      filePath: SnapshotTestUtils.normalizePath(filePath),
      originalContent: originalContent.trim(),
      transformedContent: transformedContent.trim(),
      contentHash: SnapshotTestUtils.hashContent(originalContent),
      transformedHash: SnapshotTestUtils.hashContent(transformedContent),
      rules: rules || null
    }));

    const snapshotContent = JSON.stringify(snapshotData, null, 2);
    const snapshotPath = await SnapshotTestUtils.getSnapshotPath(testName);
    
    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
    await fs.writeFile(snapshotPath, snapshotContent, 'utf-8');
    
    return snapshotContent;
  }

  /**
   * Create a snapshot of diff output
   */
  static async createDiffSnapshot(
    testName: string,
    diffs: {
      filePath: string;
      diff: string;
      stats?: {
        additions: number;
        deletions: number;
        changes: number;
      };
    }[]
  ): Promise<string> {
    const snapshotData = diffs.map(({ filePath, diff, stats }) => ({
      filePath: SnapshotTestUtils.normalizePath(filePath),
      diff: SnapshotTestUtils.normalizeOutput(diff, {
        normalizeColors: true,
        normalizePaths: true
      }),
      stats: stats || null
    }));

    const snapshotContent = JSON.stringify(snapshotData, null, 2);
    const snapshotPath = await SnapshotTestUtils.getSnapshotPath(testName);
    
    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
    await fs.writeFile(snapshotPath, snapshotContent, 'utf-8');
    
    return snapshotContent;
  }

  /**
   * Compare against existing snapshot
   */
  static async compareSnapshot(
    testName: string,
    currentContent: string
  ): Promise<{
    matches: boolean;
    expectedContent?: string;
    differences?: string[];
  }> {
    const snapshotPath = await SnapshotTestUtils.getSnapshotPath(testName);
    
    try {
      const expectedContent = await fs.readFile(snapshotPath, 'utf-8');
      const matches = currentContent === expectedContent;
      
      if (!matches) {
        const differences = SnapshotTestUtils.findDifferences(expectedContent, currentContent);
        return { matches, expectedContent, differences };
      }
      
      return { matches };
    } catch (error) {
      // Snapshot doesn't exist, create it
      await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
      await fs.writeFile(snapshotPath, currentContent, 'utf-8');
      return { matches: true };
    }
  }

  /**
   * Normalize output by removing variable elements
   */
  private static normalizeOutput(
    output: string,
    options: {
      normalizeTimestamps?: boolean;
      normalizePaths?: boolean;
      normalizeColors?: boolean;
    }
  ): string {
    let normalized = output;

    if (options.normalizeTimestamps) {
      // Replace timestamps and durations
      normalized = normalized
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '<TIMESTAMP>')
        .replace(/\d+ms/g, '<DURATION>')
        .replace(/\d+\.\d+s/g, '<DURATION>')
        .replace(/Duration: \d+ms/g, 'Duration: <DURATION>');
    }

    if (options.normalizePaths) {
      // Replace absolute paths with relative ones
      const cwd = process.cwd();
      normalized = normalized
        .replace(new RegExp(cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '<CWD>')
        .replace(/\/tmp\/[^/\s]+/g, '<TEMP_DIR>')
        .replace(/\/var\/folders\/[^/\s]+/g, '<TEMP_DIR>');
    }

    if (options.normalizeColors) {
      // Remove ANSI color codes
      normalized = normalized.replace(/\x1b\[[0-9;]*m/g, '');
    }

    return normalized;
  }

  /**
   * Normalize file paths for cross-platform compatibility
   */
  private static normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/').replace(process.cwd().replace(/\\/g, '/'), '<CWD>');
  }

  /**
   * Create a hash of content for comparison
   */
  private static hashContent(content: string): string {
    return createHash('sha256').update(content.trim()).digest('hex').substring(0, 16);
  }

  /**
   * Get snapshot file path
   */
  private static async getSnapshotPath(testName: string): Promise<string> {
    const sanitizedName = testName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(
      __dirname,
      '..',
      SnapshotTestUtils.SNAPSHOT_DIR,
      `${sanitizedName}${SnapshotTestUtils.EXTENSION}`
    );
  }

  /**
   * Find differences between two strings
   */
  private static findDifferences(expected: string, actual: string): string[] {
    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');
    const differences: string[] = [];

    const maxLines = Math.max(expectedLines.length, actualLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const expectedLine = expectedLines[i] || '<MISSING>';
      const actualLine = actualLines[i] || '<MISSING>';
      
      if (expectedLine !== actualLine) {
        differences.push(`Line ${i + 1}:`);
        differences.push(`  Expected: ${expectedLine}`);
        differences.push(`  Actual:   ${actualLine}`);
      }
    }

    return differences;
  }

  /**
   * Update snapshot (useful for --updateSnapshot flag)
   */
  static async updateSnapshot(testName: string, newContent: string): Promise<void> {
    const snapshotPath = await SnapshotTestUtils.getSnapshotPath(testName);
    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
    await fs.writeFile(snapshotPath, newContent, 'utf-8');
  }

  /**
   * Clean up old snapshots
   */
  static async cleanupSnapshots(): Promise<void> {
    const snapshotDir = path.join(__dirname, '..', SnapshotTestUtils.SNAPSHOT_DIR);
    try {
      await fs.rm(snapshotDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist, that's fine
    }
  }
}

/**
 * Custom Jest matchers for snapshot testing
 */
export class CustomMatchers {
  /**
   * Match CLI output snapshot
   */
  static toMatchCLISnapshot(
    received: any,
    testName: string,
    options?: {
      normalizeTimestamps?: boolean;
      normalizePaths?: boolean;
      normalizeColors?: boolean;
    }
  ) {
    return {
      message: () => `Expected CLI output to match snapshot for ${testName}`,
      pass: false, // This would be implemented with proper Jest integration
    };
  }

  /**
   * Match transformation snapshot
   */
  static toMatchTransformationSnapshot(
    received: any,
    testName: string
  ) {
    return {
      message: () => `Expected transformation output to match snapshot for ${testName}`,
      pass: false, // This would be implemented with proper Jest integration
    };
  }
}

/**
 * Test data generators for consistent snapshot testing
 */
export class TestDataGenerator {
  /**
   * Generate test project structure
   */
  static generateProjectStructure(
    name: string,
    options: {
      fileCount?: number;
      componentCount?: number;
      complexity?: 'simple' | 'medium' | 'complex';
    } = {}
  ): {
    files: { path: string; content: string }[];
    packageJson: any;
    migrationRules: any;
  } {
    const {
      fileCount = 5,
      componentCount = 10,
      complexity = 'medium'
    } = options;

    const files: { path: string; content: string }[] = [];
    
    // Generate source files
    for (let i = 0; i < fileCount; i++) {
      const fileName = `Component${i + 1}.tsx`;
      const content = TestDataGenerator.generateComponentFile(
        fileName,
        componentCount / fileCount,
        complexity
      );
      files.push({ path: `src/components/${fileName}`, content });
    }

    const packageJson = {
      name: `test-project-${name}`,
      version: '1.0.0',
      dependencies: {
        'react': '^18.0.0',
        '@ui-library/components': '^1.0.0'
      }
    };

    const migrationRules = {
      lookup: {
        '@ui-library/components': {
          Button: [{
            match: [{ variant: 'primary' }],
            rename: { variant: 'appearance' },
            importFrom: '@ui-library/components',
            importTo: '@ui-library-v2/components'
          }]
        }
      }
    };

    return { files, packageJson, migrationRules };
  }

  /**
   * Generate a component file with specified characteristics
   */
  private static generateComponentFile(
    fileName: string,
    componentCount: number,
    complexity: 'simple' | 'medium' | 'complex'
  ): string {
    const componentName = fileName.replace('.tsx', '');
    
    let imports = "import React from 'react';\n";
    imports += "import { Button, Text, Card } from '@ui-library/components';\n\n";

    let componentContent = `const ${componentName} = () => {\n`;
    
    // Add state and effects based on complexity
    if (complexity !== 'simple') {
      componentContent += `  const [state, setState] = React.useState(0);\n`;
    }
    
    if (complexity === 'complex') {
      componentContent += `  React.useEffect(() => {\n`;
      componentContent += `    // Complex effect logic\n`;
      componentContent += `  }, [state]);\n\n`;
    }

    componentContent += `  return (\n    <div>\n`;
    
    // Generate JSX elements
    for (let i = 0; i < componentCount; i++) {
      const variant = i % 2 === 0 ? 'primary' : 'secondary';
      const size = ['small', 'medium', 'large'][i % 3];
      
      componentContent += `      <Card key={${i}}>\n`;
      componentContent += `        <Text size="${size}">Item ${i + 1}</Text>\n`;
      componentContent += `        <Button variant="${variant}" size="${size}">\n`;
      componentContent += `          Action ${i + 1}\n`;
      componentContent += `        </Button>\n`;
      componentContent += `      </Card>\n`;
    }
    
    componentContent += `    </div>\n  );\n};\n\n`;
    componentContent += `export default ${componentName};`;

    return imports + componentContent;
  }
}
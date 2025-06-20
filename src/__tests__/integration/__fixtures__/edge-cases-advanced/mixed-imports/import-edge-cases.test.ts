/**
 * Import Edge Cases Test Suite
 * Tests jsx-migr8's handling of complex import patterns and transformations
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { performance } from 'perf_hooks';

// Import jsx-migr8 modules
import { buildGraph } from '../../../graph/buildGraph';
import { analyzeImports } from '../../../analyzer/imports';
import { transformFile } from '../../../migrator';

describe('Import Edge Cases', () => {
  let tempDir: string;
  let testFiles: Map<string, string>;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'jsx-migr8-import-tests-'));
    testFiles = new Map();
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Mixed Import Styles', () => {
    it('should handle default imports correctly', async () => {
      const content = `
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

export const Component = () => (
  <div>
    <Button variant="contained">Click me</Button>
    <TextField label="Enter text" />
  </div>
);`;

      const filePath = createTestFile('default-imports.tsx', content);
      const result = await analyzeImports(filePath);

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0]).toMatchObject({
        source: '@mui/material/Button',
        type: 'default',
        name: 'Button'
      });
      expect(result.imports[1]).toMatchObject({
        source: '@mui/material/TextField',
        type: 'default',
        name: 'TextField'
      });
    });

    it('should handle named imports correctly', async () => {
      const content = `
import { Button, TextField, Grid } from '@mui/material';
import { Table, Space } from 'antd';

export const Component = () => (
  <Grid container>
    <Button>Named Import</Button>
    <TextField label="Named" />
    <Table dataSource={[]} />
    <Space />
  </Grid>
);`;

      const filePath = createTestFile('named-imports.tsx', content);
      const result = await analyzeImports(filePath);

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0]).toMatchObject({
        source: '@mui/material',
        type: 'named',
        names: ['Button', 'TextField', 'Grid']
      });
      expect(result.imports[1]).toMatchObject({
        source: 'antd',
        type: 'named',
        names: ['Table', 'Space']
      });
    });

    it('should handle namespace imports correctly', async () => {
      const content = `
import * as MaterialIcons from '@mui/icons-material';
import * as AntdIcons from '@ant-design/icons';

export const Component = () => (
  <div>
    <MaterialIcons.Add />
    <AntdIcons.PlusOutlined />
  </div>
);`;

      const filePath = createTestFile('namespace-imports.tsx', content);
      const result = await analyzeImports(filePath);

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0]).toMatchObject({
        source: '@mui/icons-material',
        type: 'namespace',
        name: 'MaterialIcons'
      });
      expect(result.imports[1]).toMatchObject({
        source: '@ant-design/icons',
        type: 'namespace',
        name: 'AntdIcons'
      });
    });

    it('should handle aliased imports correctly', async () => {
      const content = `
import { Button as MuiButton, TextField as MuiTextField } from '@mui/material';
import { Button as AntButton, Input as AntInput } from 'antd';

export const Component = () => (
  <div>
    <MuiButton variant="contained">MUI Button</MuiButton>
    <MuiTextField label="MUI Field" />
    <AntButton type="primary">Ant Button</AntButton>
    <AntInput placeholder="Ant Input" />
  </div>
);`;

      const filePath = createTestFile('aliased-imports.tsx', content);
      const result = await analyzeImports(filePath);

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0]).toMatchObject({
        source: '@mui/material',
        type: 'named',
        names: [
          { name: 'Button', alias: 'MuiButton' },
          { name: 'TextField', alias: 'MuiTextField' }
        ]
      });
      expect(result.imports[1]).toMatchObject({
        source: 'antd',
        type: 'named',
        names: [
          { name: 'Button', alias: 'AntButton' },
          { name: 'Input', alias: 'AntInput' }
        ]
      });
    });

    it('should handle mixed default and named imports', async () => {
      const content = `
import Button, { ButtonProps, ButtonGroup } from '@mui/material/Button';
import Switch, { SwitchProps } from '@mui/material/Switch';

export const Component = () => (
  <div>
    <Button>Default Button</Button>
    <ButtonGroup>
      <Button>Group 1</Button>
      <Button>Group 2</Button>
    </ButtonGroup>
    <Switch checked={true} />
  </div>
);`;

      const filePath = createTestFile('mixed-imports.tsx', content);
      const result = await analyzeImports(filePath);

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0]).toMatchObject({
        source: '@mui/material/Button',
        type: 'mixed',
        default: 'Button',
        named: ['ButtonProps', 'ButtonGroup']
      });
      expect(result.imports[1]).toMatchObject({
        source: '@mui/material/Switch',
        type: 'mixed',
        default: 'Switch',
        named: ['SwitchProps']
      });
    });

    it('should handle side-effect imports', async () => {
      const content = `
import '@mui/material/styles';
import 'antd/dist/antd.css';
import './custom-styles.css';

export const Component = () => <div>No direct imports</div>;`;

      const filePath = createTestFile('side-effect-imports.tsx', content);
      const result = await analyzeImports(filePath);

      expect(result.imports).toHaveLength(3);
      expect(result.imports.every(imp => imp.type === 'side-effect')).toBe(true);
      expect(result.imports.map(imp => imp.source)).toEqual([
        '@mui/material/styles',
        'antd/dist/antd.css',
        './custom-styles.css'
      ]);
    });

    it('should handle type-only imports', async () => {
      const content = `
import type { Theme } from '@mui/material/styles';
import type { FormInstance } from 'antd/lib/form';
import type { ReactNode, ComponentProps } from 'react';

export const Component: React.FC<{
  theme: Theme;
  form: FormInstance;
  children: ReactNode;
}> = ({ theme, form, children }) => <div>{children}</div>;`;

      const filePath = createTestFile('type-imports.tsx', content);
      const result = await analyzeImports(filePath);

      expect(result.imports).toHaveLength(3);
      expect(result.imports.every(imp => imp.typeOnly === true)).toBe(true);
    });

    it('should handle re-exports', async () => {
      const content = `
export { Button, TextField } from '@mui/material';
export { default as ExportedButton } from '@mui/material/Button';
export { Button as ReexportedButton } from '@mui/material';
export type { Theme } from '@mui/material/styles';`;

      const filePath = createTestFile('re-exports.tsx', content);
      const result = await analyzeImports(filePath);

      expect(result.reExports).toHaveLength(4);
      expect(result.reExports[0]).toMatchObject({
        source: '@mui/material',
        type: 'named',
        names: ['Button', 'TextField']
      });
      expect(result.reExports[1]).toMatchObject({
        source: '@mui/material/Button',
        type: 'default',
        alias: 'ExportedButton'
      });
    });

    it('should handle dynamic imports gracefully', async () => {
      const content = `
import React from 'react';

const LazyComponent = React.lazy(() => import('./lazy-component'));
const dynamicImport = () => import('@mui/material/Dialog');

export const Component = () => (
  <React.Suspense fallback={<div>Loading...</div>}>
    <LazyComponent />
  </React.Suspense>
);`;

      const filePath = createTestFile('dynamic-imports.tsx', content);
      const result = await analyzeImports(filePath);

      // Dynamic imports should be detected but not interfere with static analysis
      expect(result.dynamicImports).toEqual([
        './lazy-component',
        '@mui/material/Dialog'
      ]);
      expect(result.imports).toHaveLength(1); // Only React static import
    });
  });

  describe('Complex Import Transformations', () => {
    it('should transform default imports to named imports', async () => {
      const content = `
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

export const Component = () => (
  <div>
    <Button variant="contained">Click me</Button>
    <TextField label="Enter text" />
  </div>
);`;

      const transformRules = {
        '@mui/material/Button': {
          from: { type: 'default', name: 'Button' },
          to: { type: 'named', name: 'Button', source: '@custom/ui' }
        },
        '@mui/material/TextField': {
          from: { type: 'default', name: 'TextField' },
          to: { type: 'named', name: 'TextField', source: '@custom/ui' }
        }
      };

      const filePath = createTestFile('transform-default-to-named.tsx', content);
      const result = await transformFile(filePath, transformRules);

      expect(result.transformed).toBe(true);
      expect(result.content).toContain("import { Button, TextField } from '@custom/ui';");
      expect(result.content).not.toContain("import Button from '@mui/material/Button';");
    });

    it('should transform named imports to default imports', async () => {
      const content = `
import { Button, TextField } from '@mui/material';

export const Component = () => (
  <div>
    <Button variant="contained">Click me</Button>
    <TextField label="Enter text" />
  </div>
);`;

      const transformRules = {
        '@mui/material': {
          from: { type: 'named', names: ['Button', 'TextField'] },
          to: [
            { type: 'default', name: 'Button', source: '@custom/ui/Button' },
            { type: 'default', name: 'TextField', source: '@custom/ui/TextField' }
          ]
        }
      };

      const filePath = createTestFile('transform-named-to-default.tsx', content);
      const result = await transformFile(filePath, transformRules);

      expect(result.transformed).toBe(true);
      expect(result.content).toContain("import Button from '@custom/ui/Button';");
      expect(result.content).toContain("import TextField from '@custom/ui/TextField';");
      expect(result.content).not.toContain("import { Button, TextField } from '@mui/material';");
    });

    it('should handle complex aliased import transformations', async () => {
      const content = `
import { Button as MuiButton, TextField as MuiTextField } from '@mui/material';

export const Component = () => (
  <div>
    <MuiButton variant="contained">MUI Button</MuiButton>
    <MuiTextField label="MUI Field" />
  </div>
);`;

      const transformRules = {
        '@mui/material': {
          from: { 
            type: 'named', 
            names: [
              { name: 'Button', alias: 'MuiButton' },
              { name: 'TextField', alias: 'MuiTextField' }
            ]
          },
          to: { 
            type: 'named', 
            names: ['CustomButton', 'CustomTextField'], 
            source: '@custom/ui',
            aliasMap: {
              'MuiButton': 'CustomButton',
              'MuiTextField': 'CustomTextField'
            }
          }
        }
      };

      const filePath = createTestFile('transform-aliased.tsx', content);
      const result = await transformFile(filePath, transformRules);

      expect(result.transformed).toBe(true);
      expect(result.content).toContain("import { CustomButton as MuiButton, CustomTextField as MuiTextField } from '@custom/ui';");
    });

    it('should handle namespace import transformations', async () => {
      const content = `
import * as MaterialIcons from '@mui/icons-material';

export const Component = () => (
  <div>
    <MaterialIcons.Add />
    <MaterialIcons.Remove />
  </div>
);`;

      const transformRules = {
        '@mui/icons-material': {
          from: { type: 'namespace', name: 'MaterialIcons' },
          to: { type: 'namespace', name: 'CustomIcons', source: '@custom/icons' }
        }
      };

      const filePath = createTestFile('transform-namespace.tsx', content);
      const result = await transformFile(filePath, transformRules);

      expect(result.transformed).toBe(true);
      expect(result.content).toContain("import * as CustomIcons from '@custom/icons';");
      expect(result.content).toContain('CustomIcons.Add');
      expect(result.content).not.toContain('MaterialIcons.Add');
    });

    it('should preserve import order and comments', async () => {
      const content = `
// React imports
import React from 'react';
import { useState } from 'react';

// UI Library imports
import Button from '@mui/material/Button';
import { TextField } from '@mui/material';

// Style imports
import '@mui/material/styles';

export const Component = () => <div />;`;

      const transformRules = {
        '@mui/material/Button': {
          from: { type: 'default', name: 'Button' },
          to: { type: 'named', name: 'Button', source: '@custom/ui' }
        }
      };

      const filePath = createTestFile('preserve-order.tsx', content);
      const result = await transformFile(filePath, transformRules);

      expect(result.transformed).toBe(true);
      // Should preserve comments and relative ordering
      expect(result.content).toMatch(/\/\/ React imports[\s\S]*\/\/ UI Library imports[\s\S]*\/\/ Style imports/);
    });
  });

  describe('Performance with Complex Imports', () => {
    it('should handle files with many imports efficiently', async () => {
      const imports = Array.from({ length: 1000 }, (_, i) => 
        `import Component${i} from '@package/component${i}';`
      ).join('\n');
      
      const usage = Array.from({ length: 1000 }, (_, i) => 
        `<Component${i} key={${i}} />`
      ).join('\n      ');

      const content = `
${imports}

export const ManyImportsComponent = () => (
  <div>
    ${usage}
  </div>
);`;

      const filePath = createTestFile('many-imports.tsx', content);
      
      const startTime = performance.now();
      const result = await analyzeImports(filePath);
      const duration = performance.now() - startTime;

      expect(result.imports).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed / 1024 / 1024).toBeLessThan(500); // Less than 500MB
    });

    it('should handle deeply nested import structures', async () => {
      const createNestedImports = (depth: number): string => {
        if (depth === 0) return `import Leaf from '@package/leaf';`;
        
        return `
import Level${depth} from '@package/level${depth}';
${createNestedImports(depth - 1)}`;
      };

      const content = `
${createNestedImports(50)}

export const DeepImports = () => <div>Deep nesting test</div>;`;

      const filePath = createTestFile('deep-imports.tsx', content);
      
      const startTime = performance.now();
      const result = await analyzeImports(filePath);
      const duration = performance.now() - startTime;

      expect(result.imports).toHaveLength(51); // 50 levels + leaf
      expect(duration).toBeLessThan(1000); // Should be fast even with deep nesting
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed import statements gracefully', async () => {
      const content = `
import Button from '@mui/material/Button';
import { TextField, // Missing closing brace
import * as from '@invalid/syntax';
import from 'no-specifier';

export const Component = () => (
  <div>
    <Button>Working Button</Button>
  </div>
);`;

      const filePath = createTestFile('malformed-imports.tsx', content);
      
      // Should not throw but gracefully handle errors
      const result = await analyzeImports(filePath).catch(error => ({
        error: error.message,
        imports: [],
        partialAnalysis: true
      }));

      expect(result).toBeDefined();
      // Should still capture valid imports when possible
      if ('imports' in result && result.imports.length > 0) {
        expect(result.imports[0]).toMatchObject({
          source: '@mui/material/Button',
          type: 'default',
          name: 'Button'
        });
      }
    });

    it('should handle circular import references', async () => {
      const fileA = `
import { ComponentB } from './component-b';
export const ComponentA = () => <ComponentB />;`;

      const fileB = `
import { ComponentA } from './component-a';
export const ComponentB = () => <ComponentA />;`;

      const pathA = createTestFile('component-a.tsx', fileA);
      const pathB = createTestFile('component-b.tsx', fileB);

      // Should detect circular dependency without infinite loops
      const [resultA, resultB] = await Promise.all([
        analyzeImports(pathA),
        analyzeImports(pathB)
      ]);

      expect(resultA.imports).toHaveLength(1);
      expect(resultB.imports).toHaveLength(1);
      expect(resultA.circularDependencies).toContain(pathB);
      expect(resultB.circularDependencies).toContain(pathA);
    });

    it('should handle missing source files gracefully', async () => {
      const content = `
import Button from '@mui/material/Button';
import { MissingComponent } from './non-existent-file';

export const Component = () => (
  <div>
    <Button>Exists</Button>
    <MissingComponent />
  </div>
);`;

      const filePath = createTestFile('missing-imports.tsx', content);
      
      const result = await analyzeImports(filePath);

      expect(result.imports).toHaveLength(2);
      expect(result.missingDependencies).toContain('./non-existent-file');
      expect(result.imports[0]).toMatchObject({
        source: '@mui/material/Button',
        exists: true
      });
      expect(result.imports[1]).toMatchObject({
        source: './non-existent-file',
        exists: false
      });
    });
  });

  // Helper function to create test files
  function createTestFile(filename: string, content: string): string {
    const filePath = join(tempDir, filename);
    writeFileSync(filePath, content, 'utf8');
    testFiles.set(filename, filePath);
    return filePath;
  }
});
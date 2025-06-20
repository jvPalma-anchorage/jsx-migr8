/**
 * Complex Circular Dependencies Test Suite
 * Tests jsx-migr8's ability to detect and handle various circular dependency patterns
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';

// Import jsx-migr8 modules
import { buildGraph } from '../../../graph/buildGraph';
import { detectCircularDependencies } from '../../../analyzer/circular-detector';

describe('Complex Circular Dependencies', () => {
  let tempDir: string;
  let testProjectPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'jsx-migr8-circular-tests-'));
    testProjectPath = join(tempDir, 'test-project');
    mkdirSync(testProjectPath, { recursive: true });
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic Circular Dependencies', () => {
    it('should detect simple A->B->A circular dependency', async () => {
      createFile('component-a.tsx', `
import React from 'react';
import { ComponentB } from './component-b';
import { Button } from '@mui/material';

export const ComponentA: React.FC = () => (
  <div>
    <Button>Component A</Button>
    <ComponentB />
  </div>
);`);

      createFile('component-b.tsx', `
import React from 'react';
import { ComponentA } from './component-a';
import { TextField } from '@mui/material';

export const ComponentB: React.FC = () => (
  <div>
    <TextField label="Component B" />
    <ComponentA />
  </div>
);`);

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);

      expect(circularDeps).toHaveLength(1);
      expect(circularDeps[0].cycle).toEqual([
        join(testProjectPath, 'component-a.tsx'),
        join(testProjectPath, 'component-b.tsx'),
        join(testProjectPath, 'component-a.tsx')
      ]);
      expect(circularDeps[0].type).toBe('direct');
    });

    it('should detect A->B->C->A circular dependency', async () => {
      createFile('component-a.tsx', `
import React from 'react';
import { ComponentB } from './component-b';
export const ComponentA = () => <ComponentB />;`);

      createFile('component-b.tsx', `
import React from 'react';
import { ComponentC } from './component-c';
export const ComponentB = () => <ComponentC />;`);

      createFile('component-c.tsx', `
import React from 'react';
import { ComponentA } from './component-a';
export const ComponentC = () => <ComponentA />;`);

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);

      expect(circularDeps).toHaveLength(1);
      expect(circularDeps[0].cycle).toHaveLength(4); // A->B->C->A
      expect(circularDeps[0].type).toBe('indirect');
    });
  });

  describe('Complex Circular Patterns', () => {
    it('should detect multiple overlapping circular dependencies', async () => {
      // A->B->A (circle 1)
      // B->C->B (circle 2)  
      // A->C->A (circle 3)
      createFile('component-a.tsx', `
import React from 'react';
import { ComponentB } from './component-b';
import { ComponentC } from './component-c';
export const ComponentA = () => (
  <div>
    <ComponentB />
    <ComponentC />
  </div>
);`);

      createFile('component-b.tsx', `
import React from 'react';
import { ComponentA } from './component-a';
import { ComponentC } from './component-c';
export const ComponentB = () => (
  <div>
    <ComponentA />
    <ComponentC />
  </div>
);`);

      createFile('component-c.tsx', `
import React from 'react';
import { ComponentA } from './component-a';
import { ComponentB } from './component-b';
export const ComponentC = () => (
  <div>
    <ComponentA />
    <ComponentB />
  </div>
);`);

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);

      expect(circularDeps.length).toBeGreaterThanOrEqual(3);
      expect(circularDeps.some(cycle => cycle.cycle.includes('component-a.tsx') && cycle.cycle.includes('component-b.tsx'))).toBe(true);
      expect(circularDeps.some(cycle => cycle.cycle.includes('component-b.tsx') && cycle.cycle.includes('component-c.tsx'))).toBe(true);
      expect(circularDeps.some(cycle => cycle.cycle.includes('component-a.tsx') && cycle.cycle.includes('component-c.tsx'))).toBe(true);
    });

    it('should detect circular dependencies through re-exports', async () => {
      createFile('components/index.ts', `
export { ComponentA } from './component-a';
export { ComponentB } from './component-b';`);

      createFile('components/component-a.tsx', `
import React from 'react';
import { ComponentB } from './index';
export const ComponentA = () => <ComponentB />;`);

      createFile('components/component-b.tsx', `
import React from 'react';
import { ComponentA } from './index';
export const ComponentB = () => <ComponentA />;`);

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);

      expect(circularDeps.length).toBeGreaterThanOrEqual(1);
      expect(circularDeps[0].type).toBe('through-reexport');
    });

    it('should detect self-referencing components', async () => {
      createFile('recursive-component.tsx', `
import React from 'react';
import { RecursiveComponent } from './recursive-component';

export const RecursiveComponent: React.FC<{ depth: number }> = ({ depth }) => {
  if (depth === 0) return <div>Base case</div>;
  
  return (
    <div>
      Level {depth}
      <RecursiveComponent depth={depth - 1} />
    </div>
  );
};`);

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);

      expect(circularDeps).toHaveLength(1);
      expect(circularDeps[0].type).toBe('self-reference');
      expect(circularDeps[0].cycle).toHaveLength(2); // self -> self
    });

    it('should detect circular dependencies with default and named imports mix', async () => {
      createFile('mixed-exports-a.tsx', `
import React from 'react';
import ComponentB, { HelperB } from './mixed-exports-b';

export const ComponentA = () => <ComponentB helper={HelperB} />;
export default ComponentA;`);

      createFile('mixed-exports-b.tsx', `
import React from 'react';
import ComponentA, { HelperA } from './mixed-exports-a';

export const ComponentB = ({ helper }: any) => <ComponentA helper={HelperA} />;
export const HelperB = () => 'helper-b';
export default ComponentB;`);

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);

      expect(circularDeps).toHaveLength(1);
      expect(circularDeps[0].importTypes).toContainEqual('default');
      expect(circularDeps[0].importTypes).toContainEqual('named');
    });

    it('should detect circular dependencies through type imports', async () => {
      createFile('types-a.tsx', `
import React from 'react';
import type { BProps } from './types-b';
import { ComponentB } from './types-b';

export interface AProps {
  b?: BProps;
}

export const ComponentA: React.FC<AProps> = (props) => <ComponentB {...props.b} />;`);

      createFile('types-b.tsx', `
import React from 'react';
import type { AProps } from './types-a';
import { ComponentA } from './types-a';

export interface BProps {
  a?: AProps;
}

export const ComponentB: React.FC<BProps> = (props) => <ComponentA {...props.a} />;`);

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);

      expect(circularDeps).toHaveLength(1);
      expect(circularDeps[0].hasTypeImports).toBe(true);
      expect(circularDeps[0].hasValueImports).toBe(true);
    });

    it('should detect complex multi-level circular dependencies', async () => {
      // Create a more complex dependency graph: A->B->C->D->E->A
      const components = ['A', 'B', 'C', 'D', 'E'];
      
      components.forEach((comp, index) => {
        const nextComp = components[(index + 1) % components.length];
        createFile(`component-${comp.toLowerCase()}.tsx`, `
import React from 'react';
import { Component${nextComp} } from './component-${nextComp.toLowerCase()}';

export const Component${comp}: React.FC = () => (
  <div>
    <h1>Component ${comp}</h1>
    <Component${nextComp} />
  </div>
);`);
      });

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);

      expect(circularDeps).toHaveLength(1);
      expect(circularDeps[0].cycle).toHaveLength(6); // A->B->C->D->E->A
      expect(circularDeps[0].type).toBe('deep-indirect');
    });

    it('should handle circular dependencies with conditional imports', async () => {
      createFile('conditional-a.tsx', `
import React from 'react';

let ComponentB: any;
if (process.env.NODE_ENV === 'development') {
  ComponentB = require('./conditional-b').ComponentB;
}

export const ComponentA = () => (
  <div>
    {ComponentB && <ComponentB />}
  </div>
);`);

      createFile('conditional-b.tsx', `
import React from 'react';

let ComponentA: any;
if (process.env.NODE_ENV === 'development') {
  ComponentA = require('./conditional-a').ComponentA;
}

export const ComponentB = () => (
  <div>
    {ComponentA && <ComponentA />}
  </div>
);`);

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);

      // Should detect even conditional/dynamic circular dependencies
      expect(circularDeps).toHaveLength(1);
      expect(circularDeps[0].type).toBe('conditional');
    });
  });

  describe('Circular Dependency Resolution', () => {
    it('should suggest solutions for circular dependencies', async () => {
      createFile('resolvable-a.tsx', `
import React from 'react';
import { ComponentB } from './resolvable-b';
import { SharedType } from './shared-types';

export const ComponentA: React.FC<{ data: SharedType }> = ({ data }) => (
  <div>
    <ComponentB data={data} />
  </div>
);`);

      createFile('resolvable-b.tsx', `
import React from 'react';
import { ComponentA } from './resolvable-a';
import { SharedType } from './shared-types';

export const ComponentB: React.FC<{ data: SharedType }> = ({ data }) => (
  <div>
    <ComponentA data={data} />
  </div>
);`);

      createFile('shared-types.ts', `
export interface SharedType {
  id: string;
  name: string;
}`);

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);

      expect(circularDeps).toHaveLength(1);
      expect(circularDeps[0].resolutionSuggestions).toContain('extract-common-interface');
      expect(circularDeps[0].resolutionSuggestions).toContain('use-composition');
      expect(circularDeps[0].sharedDependencies).toContain('shared-types.ts');
    });

    it('should identify breaking vs non-breaking circular dependencies', async () => {
      // Non-breaking: type-only circular dependency
      createFile('type-only-a.tsx', `
import React from 'react';
import type { BProps } from './type-only-b';

export interface AProps {
  b?: BProps;
}

export const ComponentA: React.FC<AProps> = () => <div>A</div>;`);

      createFile('type-only-b.tsx', `
import React from 'react';
import type { AProps } from './type-only-a';

export interface BProps {
  a?: AProps;
}

export const ComponentB: React.FC<BProps> = () => <div>B</div>;`);

      // Breaking: value circular dependency
      createFile('value-a.tsx', `
import React from 'react';
import { ComponentB } from './value-b';

export const ComponentA = () => <ComponentB />;`);

      createFile('value-b.tsx', `
import React from 'react';
import { ComponentA } from './value-a';

export const ComponentB = () => <ComponentA />;`);

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);

      const typeOnlyCycle = circularDeps.find(cycle => cycle.breaking === false);
      const valueCycle = circularDeps.find(cycle => cycle.breaking === true);

      expect(typeOnlyCycle).toBeDefined();
      expect(valueCycle).toBeDefined();
      expect(typeOnlyCycle?.resolutionComplexity).toBe('low');
      expect(valueCycle?.resolutionComplexity).toBe('high');
    });
  });

  describe('Performance with Circular Dependencies', () => {
    it('should detect circular dependencies efficiently in large graphs', async () => {
      // Create a large graph with some circular dependencies
      const nodeCount = 1000;
      const circularNodeCount = 10;

      // Create regular nodes
      for (let i = 0; i < nodeCount - circularNodeCount; i++) {
        createFile(`regular-${i}.tsx`, `
import React from 'react';
export const Regular${i} = () => <div>Regular ${i}</div>;`);
      }

      // Create circular nodes
      for (let i = 0; i < circularNodeCount; i++) {
        const nextIndex = (i + 1) % circularNodeCount;
        createFile(`circular-${i}.tsx`, `
import React from 'react';
import { Circular${nextIndex} } from './circular-${nextIndex}';
export const Circular${i} = () => <Circular${nextIndex} />;`);
      }

      const startTime = performance.now();
      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);
      const duration = performance.now() - startTime;

      expect(circularDeps.length).toBeGreaterThanOrEqual(1);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed / 1024 / 1024).toBeLessThan(1000); // Less than 1GB
    });

    it('should handle deeply nested circular dependencies', async () => {
      // Create a chain that eventually loops back
      const chainLength = 100;
      
      for (let i = 0; i < chainLength; i++) {
        const nextIndex = i === chainLength - 1 ? 0 : i + 1; // Last one points back to first
        createFile(`chain-${i}.tsx`, `
import React from 'react';
import { Chain${nextIndex} } from './chain-${nextIndex}';
export const Chain${i} = () => <Chain${nextIndex} />;`);
      }

      const startTime = performance.now();
      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);
      const duration = performance.now() - startTime;

      expect(circularDeps).toHaveLength(1);
      expect(circularDeps[0].cycle).toHaveLength(chainLength + 1);
      expect(duration).toBeLessThan(5000); // Should handle deep cycles efficiently
    });
  });

  describe('Migration with Circular Dependencies', () => {
    it('should refuse to migrate files with unresolved circular dependencies', async () => {
      createFile('migrate-a.tsx', `
import React from 'react';
import { ComponentB } from './migrate-b';
import { Button } from '@mui/material';

export const ComponentA = () => (
  <div>
    <Button>A</Button>
    <ComponentB />
  </div>
);`);

      createFile('migrate-b.tsx', `
import React from 'react';
import { ComponentA } from './migrate-a';
import { Button } from '@mui/material';

export const ComponentB = () => (
  <div>
    <Button>B</Button>
    <ComponentA />
  </div>
);`);

      const migrationRules = {
        '@mui/material': {
          Button: { to: '@custom/ui', component: 'CustomButton' }
        }
      };

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);

      expect(circularDeps).toHaveLength(1);
      
      // Should refuse migration or warn about circular dependencies
      const migrationResult = await attemptMigration(testProjectPath, migrationRules);
      
      expect(migrationResult.blocked).toBe(true);
      expect(migrationResult.reason).toContain('circular dependency');
      expect(migrationResult.affectedFiles).toContain('migrate-a.tsx');
      expect(migrationResult.affectedFiles).toContain('migrate-b.tsx');
    });

    it('should suggest resolution strategies before migration', async () => {
      createFile('strategy-a.tsx', `
import React from 'react';
import { ComponentB } from './strategy-b';

export const ComponentA = () => <ComponentB />;`);

      createFile('strategy-b.tsx', `
import React from 'react';
import { ComponentA } from './strategy-a';

export const ComponentB = () => <ComponentA />;`);

      const graph = await buildGraph(testProjectPath);
      const circularDeps = detectCircularDependencies(graph);
      const strategies = generateResolutionStrategies(circularDeps[0]);

      expect(strategies).toContain({
        strategy: 'lazy-loading',
        description: 'Use React.lazy() to break circular dependency',
        complexity: 'medium',
        automated: true
      });

      expect(strategies).toContain({
        strategy: 'composition-pattern',
        description: 'Extract shared logic to common component',
        complexity: 'high',
        automated: false
      });
    });
  });

  // Helper functions
  function createFile(path: string, content: string): void {
    const fullPath = join(testProjectPath, path);
    const dir = join(fullPath, '..');
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content, 'utf8');
  }

  async function attemptMigration(projectPath: string, rules: any): Promise<any> {
    // Mock migration attempt that checks for circular dependencies
    const graph = await buildGraph(projectPath);
    const circularDeps = detectCircularDependencies(graph);

    if (circularDeps.length > 0) {
      return {
        blocked: true,
        reason: `Migration blocked due to ${circularDeps.length} circular dependency(ies)`,
        affectedFiles: circularDeps.flatMap(cycle => 
          cycle.cycle.map(file => file.split('/').pop())
        )
      };
    }

    return { blocked: false };
  }

  function generateResolutionStrategies(circularDep: any): any[] {
    return [
      {
        strategy: 'lazy-loading',
        description: 'Use React.lazy() to break circular dependency',
        complexity: 'medium',
        automated: true
      },
      {
        strategy: 'composition-pattern',
        description: 'Extract shared logic to common component',
        complexity: 'high',
        automated: false
      },
      {
        strategy: 'dependency-injection',
        description: 'Use dependency injection pattern',
        complexity: 'high',
        automated: false
      }
    ];
  }
});
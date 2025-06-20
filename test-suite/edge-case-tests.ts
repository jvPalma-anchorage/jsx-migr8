#!/usr/bin/env tsx

/**
 * Edge case and error scenario tests for jsx-migr8
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, chmodSync } from 'fs';
import { join, resolve } from 'path';
import fetch from 'node-fetch';
import { spawn } from 'child_process';

const API_URL = 'http://localhost:3001';
const TEST_DIR = resolve('./test-suite/edge-cases');

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

interface EdgeCaseTest {
  name: string;
  setup?: () => void;
  test: () => Promise<void>;
  cleanup?: () => void;
  expectError?: boolean;
}

const edgeCaseTests: EdgeCaseTest[] = [
  {
    name: 'Empty project directory',
    setup: () => {
      mkdirSync(join(TEST_DIR, 'empty-project'), { recursive: true });
    },
    test: async () => {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: join(TEST_DIR, 'empty-project') })
      });
      
      if (!response.ok) {
        throw new Error('Should handle empty directories');
      }
      
      const data = await response.json();
      const projectId = data.projectId;
      
      // Try to analyze empty project
      const analyzeResponse = await fetch(`${API_URL}/api/projects/${projectId}/analyze`, {
        method: 'POST'
      });
      
      if (!analyzeResponse.ok) {
        throw new Error('Should analyze empty projects without error');
      }
      
      const analysis = await analyzeResponse.json();
      if (analysis.components.length !== 0) {
        throw new Error('Empty project should have no components');
      }
    }
  },
  
  {
    name: 'Project with no JSX files',
    setup: () => {
      const dir = join(TEST_DIR, 'no-jsx');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.js'), 'console.log("Hello");');
      writeFileSync(join(dir, 'utils.ts'), 'export const add = (a, b) => a + b;');
    },
    test: async () => {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: join(TEST_DIR, 'no-jsx') })
      });
      
      const data = await response.json();
      const analyzeResponse = await fetch(`${API_URL}/api/projects/${data.projectId}/analyze`, {
        method: 'POST'
      });
      
      const analysis = await analyzeResponse.json();
      if (analysis.components.length !== 0) {
        throw new Error('Project with no JSX should have no components');
      }
    }
  },
  
  {
    name: 'Malformed JSX file',
    setup: () => {
      const dir = join(TEST_DIR, 'malformed-jsx');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'BadComponent.jsx'), `
        import React from 'react';
        
        export const BadComponent = () => {
          return <div>
            <span>Unclosed tag
          </div>
        };
      `);
    },
    test: async () => {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: join(TEST_DIR, 'malformed-jsx') })
      });
      
      const data = await response.json();
      const analyzeResponse = await fetch(`${API_URL}/api/projects/${data.projectId}/analyze`, {
        method: 'POST'
      });
      
      // Should handle parse errors gracefully
      if (!analyzeResponse.ok) {
        const error = await analyzeResponse.text();
        if (!error.includes('parse') && !error.includes('syntax')) {
          throw new Error('Should report parse errors clearly');
        }
      }
    }
  },
  
  {
    name: 'Circular dependencies',
    setup: () => {
      const dir = join(TEST_DIR, 'circular-deps');
      mkdirSync(dir, { recursive: true });
      
      writeFileSync(join(dir, 'ComponentA.jsx'), `
        import React from 'react';
        import { ComponentB } from './ComponentB';
        
        export const ComponentA = () => <div><ComponentB /></div>;
      `);
      
      writeFileSync(join(dir, 'ComponentB.jsx'), `
        import React from 'react';
        import { ComponentA } from './ComponentA';
        
        export const ComponentB = () => <div><ComponentA /></div>;
      `);
    },
    test: async () => {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: join(TEST_DIR, 'circular-deps') })
      });
      
      const data = await response.json();
      const analyzeResponse = await fetch(`${API_URL}/api/projects/${data.projectId}/analyze`, {
        method: 'POST'
      });
      
      // Should handle circular dependencies without infinite loop
      if (!analyzeResponse.ok) {
        throw new Error('Should handle circular dependencies');
      }
      
      const analysis = await analyzeResponse.json();
      if (analysis.components.length < 2) {
        throw new Error('Should detect both components despite circular dependency');
      }
    }
  },
  
  {
    name: 'No read permissions',
    setup: () => {
      const dir = join(TEST_DIR, 'no-read-perms');
      mkdirSync(dir, { recursive: true });
      const file = join(dir, 'Component.jsx');
      writeFileSync(file, 'export const Component = () => <div>Test</div>;');
      chmodSync(file, 0o000); // Remove all permissions
    },
    test: async () => {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: join(TEST_DIR, 'no-read-perms') })
      });
      
      const data = await response.json();
      const analyzeResponse = await fetch(`${API_URL}/api/projects/${data.projectId}/analyze`, {
        method: 'POST'
      });
      
      // Should handle permission errors gracefully
      if (analyzeResponse.ok) {
        const analysis = await analyzeResponse.json();
        // Should skip unreadable files
      }
    },
    cleanup: () => {
      // Restore permissions for cleanup
      const file = join(TEST_DIR, 'no-read-perms/Component.jsx');
      if (existsSync(file)) {
        chmodSync(file, 0o644);
      }
    }
  },
  
  {
    name: 'Very large component file',
    setup: () => {
      const dir = join(TEST_DIR, 'large-file');
      mkdirSync(dir, { recursive: true });
      
      // Generate a large component with many props
      let content = `import React from 'react';\n\nexport const LargeComponent = ({\n`;
      for (let i = 0; i < 1000; i++) {
        content += `  prop${i},\n`;
      }
      content += `}) => {\n  return (\n    <div>\n`;
      for (let i = 0; i < 1000; i++) {
        content += `      <span>{prop${i}}</span>\n`;
      }
      content += `    </div>\n  );\n};\n`;
      
      writeFileSync(join(dir, 'LargeComponent.jsx'), content);
    },
    test: async () => {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: join(TEST_DIR, 'large-file') })
      });
      
      const data = await response.json();
      const analyzeResponse = await fetch(`${API_URL}/api/projects/${data.projectId}/analyze`, {
        method: 'POST'
      });
      
      if (!analyzeResponse.ok) {
        throw new Error('Should handle large files');
      }
      
      const analysis = await analyzeResponse.json();
      if (analysis.components.length !== 1) {
        throw new Error('Should parse large component');
      }
    }
  },
  
  {
    name: 'Special characters in filenames',
    setup: () => {
      const dir = join(TEST_DIR, 'special-chars');
      mkdirSync(dir, { recursive: true });
      
      // Create files with special characters (safe ones for filesystem)
      const files = [
        'Component-With-Dashes.jsx',
        'Component_With_Underscores.jsx',
        'Component.With.Dots.jsx',
        'Component@Special.jsx'
      ];
      
      files.forEach(filename => {
        writeFileSync(join(dir, filename), `
          import React from 'react';
          export const Component = () => <div>Test</div>;
        `);
      });
    },
    test: async () => {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: join(TEST_DIR, 'special-chars') })
      });
      
      const data = await response.json();
      const analyzeResponse = await fetch(`${API_URL}/api/projects/${data.projectId}/analyze`, {
        method: 'POST'
      });
      
      if (!analyzeResponse.ok) {
        throw new Error('Should handle special characters in filenames');
      }
      
      const analysis = await analyzeResponse.json();
      if (analysis.files.length < 4) {
        throw new Error('Should process all files with special characters');
      }
    }
  },
  
  {
    name: 'Deeply nested project structure',
    setup: () => {
      const baseDir = join(TEST_DIR, 'deep-nesting');
      let currentDir = baseDir;
      
      // Create deeply nested structure
      for (let i = 0; i < 10; i++) {
        currentDir = join(currentDir, `level${i}`);
        mkdirSync(currentDir, { recursive: true });
        
        writeFileSync(join(currentDir, `Component${i}.jsx`), `
          import React from 'react';
          export const Component${i} = () => <div>Level ${i}</div>;
        `);
      }
    },
    test: async () => {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: join(TEST_DIR, 'deep-nesting') })
      });
      
      const data = await response.json();
      const analyzeResponse = await fetch(`${API_URL}/api/projects/${data.projectId}/analyze`, {
        method: 'POST'
      });
      
      if (!analyzeResponse.ok) {
        throw new Error('Should handle deeply nested structures');
      }
      
      const analysis = await analyzeResponse.json();
      if (analysis.components.length < 10) {
        throw new Error('Should find all components in nested structure');
      }
    }
  },
  
  {
    name: 'Invalid migration rules',
    test: async () => {
      // First create a project
      const projResponse = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: '/tmp/test-' + Date.now() })
      });
      
      const { projectId } = await projResponse.json();
      
      // Test various invalid rules
      const invalidRules = [
        { name: '', pattern: 'Button' }, // Empty name
        { name: 'Test', pattern: '' }, // Empty pattern
        { name: 'Test', pattern: 'Button', transformations: [] }, // Empty transformations
        { name: 'Test', pattern: 'Button', transformations: [{ type: 'invalid-type' }] }, // Invalid transformation type
      ];
      
      for (const rule of invalidRules) {
        const response = await fetch(`${API_URL}/api/projects/${projectId}/rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rule)
        });
        
        if (response.ok) {
          throw new Error(`Should reject invalid rule: ${JSON.stringify(rule)}`);
        }
      }
    }
  },
  
  {
    name: 'Concurrent project operations',
    test: async () => {
      // Create a project
      const projResponse = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: '/tmp/concurrent-' + Date.now() })
      });
      
      const { projectId } = await projResponse.json();
      
      // Send multiple operations concurrently
      const operations = [
        fetch(`${API_URL}/api/projects/${projectId}/analyze`, { method: 'POST' }),
        fetch(`${API_URL}/api/projects/${projectId}/analyze`, { method: 'POST' }),
        fetch(`${API_URL}/api/projects/${projectId}/rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Rule',
            pattern: 'Button',
            transformations: [{ type: 'rename-prop', from: 'onClick', to: 'onPress' }]
          })
        })
      ];
      
      const results = await Promise.allSettled(operations);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      if (successful === 0) {
        throw new Error('All concurrent operations failed');
      }
    }
  }
];

// Main test runner
async function runEdgeCaseTests() {
  log('\n=== JSX-MIGR8 EDGE CASE TESTS ===\n', colors.yellow);
  
  // Ensure API is running
  try {
    const health = await fetch(`${API_URL}/health`);
    if (!health.ok) {
      throw new Error('API server not running');
    }
  } catch (error) {
    log('ERROR: API server must be running. Start it with: yarn api:dev', colors.red);
    process.exit(1);
  }
  
  // Clean up test directory
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
  
  let passed = 0;
  let failed = 0;
  
  for (const test of edgeCaseTests) {
    try {
      log(`\nRunning: ${test.name}`, colors.blue);
      
      // Setup
      if (test.setup) {
        test.setup();
      }
      
      // Run test
      await test.test();
      
      passed++;
      log(`✓ ${test.name}`, colors.green);
    } catch (error) {
      failed++;
      log(`✗ ${test.name}`, colors.red);
      log(`  Error: ${error.message}`, colors.red);
    } finally {
      // Cleanup
      if (test.cleanup) {
        test.cleanup();
      }
    }
  }
  
  // Final cleanup
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  
  // Summary
  log('\n=== TEST SUMMARY ===', colors.yellow);
  log(`Total: ${edgeCaseTests.length}`, colors.blue);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, colors.red);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runEdgeCaseTests().catch(console.error);
#!/usr/bin/env tsx

/**
 * Comprehensive test suite for jsx-migr8
 * Tests the complete workflow including API, WebSocket, and analysis
 */

import { spawn, ChildProcess } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import fetch from 'node-fetch';
import WebSocket from 'ws';

// Test configuration
const TEST_CONFIG = {
  apiPort: 3001,
  apiUrl: 'http://localhost:3001',
  wsUrl: 'ws://localhost:3001',
  testProjectPath: resolve('./test-suite/test-project'),
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

// Test result tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const testResults: TestResult[] = [];

// Helper functions
function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logError(message: string) {
  console.error(`${colors.red}✗ ${message}${colors.reset}`);
}

function logSuccess(message: string) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logInfo(message: string) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}${title}${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
}

// Process management
let apiProcess: ChildProcess | null = null;
let webProcess: ChildProcess | null = null;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForPort(port: number, maxAttempts: number = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Port not ready yet
    }
    await sleep(1000);
  }
  return false;
}

async function startApiServer(): Promise<void> {
  logInfo('Starting API server...');
  
  return new Promise((resolve, reject) => {
    apiProcess = spawn('yarn', ['workspace', '@jsx-migr8/api', 'start:dev'], {
      env: { ...process.env, PORT: String(TEST_CONFIG.apiPort) },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    apiProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('API server listening')) {
        logSuccess('API server started');
        resolve();
      }
      log(`${colors.gray}[API] ${output.trim()}${colors.reset}`);
    });

    apiProcess.stderr?.on('data', (data) => {
      log(`${colors.red}[API ERROR] ${data.toString().trim()}${colors.reset}`);
    });

    apiProcess.on('error', (error) => {
      reject(new Error(`Failed to start API server: ${error.message}`));
    });

    // Timeout
    setTimeout(() => {
      reject(new Error('API server startup timeout'));
    }, TEST_CONFIG.timeout);
  });
}

async function stopServers(): Promise<void> {
  logInfo('Stopping servers...');
  
  if (apiProcess) {
    apiProcess.kill('SIGTERM');
    apiProcess = null;
  }
  
  if (webProcess) {
    webProcess.kill('SIGTERM');
    webProcess = null;
  }
  
  await sleep(2000); // Give processes time to clean up
}

// Test project setup
function createTestProject(): void {
  logInfo('Creating test project...');
  
  // Clean up if exists
  if (existsSync(TEST_CONFIG.testProjectPath)) {
    rmSync(TEST_CONFIG.testProjectPath, { recursive: true, force: true });
  }
  
  // Create directory structure
  mkdirSync(TEST_CONFIG.testProjectPath, { recursive: true });
  mkdirSync(join(TEST_CONFIG.testProjectPath, 'src/components'), { recursive: true });
  mkdirSync(join(TEST_CONFIG.testProjectPath, 'src/pages'), { recursive: true });
  
  // Create test files
  const testFiles = {
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        react: '^18.0.0',
        'react-dom': '^18.0.0'
      }
    }, null, 2),
    
    'src/components/Button.jsx': `import React from 'react';

export const Button = ({ onClick, children, variant = 'primary', disabled = false }) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={\`btn btn-\${variant}\`}
    >
      {children}
    </button>
  );
};`,
    
    'src/components/Card.jsx': `import React from 'react';

export const Card = ({ title, children, footer }) => {
  return (
    <div className="card">
      {title && <h3 className="card-title">{title}</h3>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};`,
    
    'src/pages/HomePage.jsx': `import React from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export const HomePage = () => {
  return (
    <div>
      <h1>Welcome</h1>
      <Card title="Test Card">
        <p>This is a test</p>
        <Button onClick={() => console.log('clicked')}>
          Click me
        </Button>
      </Card>
      <Button variant="secondary" disabled>
        Disabled Button
      </Button>
    </div>
  );
};`,
    
    'src/App.jsx': `import React from 'react';
import { HomePage } from './pages/HomePage';

function App() {
  return (
    <div className="app">
      <HomePage />
    </div>
  );
}

export default App;`
  };
  
  // Write files
  for (const [path, content] of Object.entries(testFiles)) {
    const fullPath = join(TEST_CONFIG.testProjectPath, path);
    writeFileSync(fullPath, content);
  }
  
  logSuccess('Test project created');
}

// Test functions
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, passed: true, duration });
    logSuccess(`${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    testResults.push({ name, passed: false, error: errorMessage, duration });
    logError(`${name} - ${errorMessage} (${duration}ms)`);
  }
}

async function testHealthEndpoint(): Promise<void> {
  const response = await fetch(`${TEST_CONFIG.apiUrl}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  const data = await response.json();
  if (data.status !== 'ok') {
    throw new Error(`Unexpected health status: ${data.status}`);
  }
}

async function testCreateProject(): Promise<string> {
  const response = await fetch(`${TEST_CONFIG.apiUrl}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rootPath: TEST_CONFIG.testProjectPath
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create project: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  if (!data.projectId) {
    throw new Error('No projectId returned');
  }
  
  return data.projectId;
}

async function testAnalyzeProject(projectId: string): Promise<void> {
  const response = await fetch(`${TEST_CONFIG.apiUrl}/api/projects/${projectId}/analyze`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to analyze project: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  if (!data.components || !Array.isArray(data.components)) {
    throw new Error('Invalid analysis response');
  }
  
  // Verify we found the expected components
  const componentNames = data.components.map((c: any) => c.name);
  const expectedComponents = ['Button', 'Card'];
  
  for (const expected of expectedComponents) {
    if (!componentNames.includes(expected)) {
      throw new Error(`Expected component ${expected} not found in analysis`);
    }
  }
}

async function testWebSocketConnection(projectId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${TEST_CONFIG.wsUrl}/ws/${projectId}`);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket connection timeout'));
    }, 10000);
    
    ws.on('open', () => {
      logInfo('WebSocket connected');
      ws.send(JSON.stringify({ type: 'ping' }));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        logInfo(`WebSocket message: ${message.type}`);
        
        if (message.type === 'pong') {
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      } catch (error) {
        reject(new Error(`Invalid WebSocket message: ${error}`));
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`WebSocket error: ${error.message}`));
    });
  });
}

async function testMigrationRules(projectId: string): Promise<void> {
  // Create a migration rule
  const rule = {
    name: 'Update Button Props',
    pattern: 'Button',
    transformations: [
      {
        type: 'rename-prop',
        from: 'variant',
        to: 'appearance'
      }
    ]
  };
  
  const response = await fetch(`${TEST_CONFIG.apiUrl}/api/projects/${projectId}/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create rule: ${response.status} - ${error}`);
  }
  
  // Verify rule was created
  const rulesResponse = await fetch(`${TEST_CONFIG.apiUrl}/api/projects/${projectId}/rules`);
  if (!rulesResponse.ok) {
    throw new Error('Failed to fetch rules');
  }
  
  const rules = await rulesResponse.json();
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new Error('No rules found after creation');
  }
}

async function testDryRun(projectId: string): Promise<void> {
  const response = await fetch(`${TEST_CONFIG.apiUrl}/api/projects/${projectId}/migrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dryRun: true })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to run dry-run: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  if (!result.changes || !Array.isArray(result.changes)) {
    throw new Error('Invalid dry-run response');
  }
  
  // Verify we have changes
  if (result.changes.length === 0) {
    throw new Error('No changes detected in dry-run');
  }
}

async function testInvalidPaths(): Promise<void> {
  // Test with non-existent path
  const response = await fetch(`${TEST_CONFIG.apiUrl}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rootPath: '/non/existent/path'
    })
  });
  
  if (response.ok) {
    throw new Error('Expected error for non-existent path');
  }
  
  // Test with invalid path format
  const response2 = await fetch(`${TEST_CONFIG.apiUrl}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rootPath: 'relative/path'
    })
  });
  
  if (response2.ok) {
    throw new Error('Expected error for relative path');
  }
}

async function testConcurrentRequests(projectId: string): Promise<void> {
  const promises = [];
  
  // Send multiple analyze requests concurrently
  for (let i = 0; i < 5; i++) {
    promises.push(
      fetch(`${TEST_CONFIG.apiUrl}/api/projects/${projectId}/analyze`, {
        method: 'POST'
      })
    );
  }
  
  const results = await Promise.allSettled(promises);
  const successful = results.filter(r => r.status === 'fulfilled').length;
  
  if (successful === 0) {
    throw new Error('All concurrent requests failed');
  }
  
  logInfo(`${successful}/5 concurrent requests succeeded`);
}

// Main test runner
async function runAllTests(): Promise<void> {
  logSection('JSX-MIGR8 COMPREHENSIVE TEST SUITE');
  
  try {
    // Setup
    logSection('SETUP');
    createTestProject();
    await startApiServer();
    await sleep(2000); // Give server time to fully initialize
    
    // Run tests
    logSection('RUNNING TESTS');
    
    await runTest('Health endpoint', testHealthEndpoint);
    
    const projectId = await (async () => {
      let id: string = '';
      await runTest('Create project', async () => {
        id = await testCreateProject();
      });
      return id;
    })();
    
    if (projectId) {
      await runTest('Analyze project', () => testAnalyzeProject(projectId));
      await runTest('WebSocket connection', () => testWebSocketConnection(projectId));
      await runTest('Migration rules', () => testMigrationRules(projectId));
      await runTest('Dry run', () => testDryRun(projectId));
      await runTest('Concurrent requests', () => testConcurrentRequests(projectId));
    }
    
    await runTest('Invalid paths', testInvalidPaths);
    
  } catch (error) {
    logError(`Test suite failed: ${error}`);
  } finally {
    // Cleanup
    logSection('CLEANUP');
    await stopServers();
    
    // Clean up test project
    if (existsSync(TEST_CONFIG.testProjectPath)) {
      rmSync(TEST_CONFIG.testProjectPath, { recursive: true, force: true });
    }
    
    // Report results
    logSection('TEST RESULTS');
    
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    const total = testResults.length;
    const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`\nTotal: ${total} | ${colors.green}Passed: ${passed}${colors.reset} | ${colors.red}Failed: ${failed}${colors.reset}`);
    console.log(`Total duration: ${totalDuration}ms\n`);
    
    if (failed > 0) {
      console.log(`${colors.red}Failed tests:${colors.reset}`);
      testResults.filter(r => !r.passed).forEach(r => {
        console.log(`  ${colors.red}✗ ${r.name}${colors.reset}`);
        if (r.error) {
          console.log(`    ${colors.gray}${r.error}${colors.reset}`);
        }
      });
      process.exit(1);
    } else {
      logSuccess('\nAll tests passed! 🎉');
      process.exit(0);
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\nInterrupted, cleaning up...');
  await stopServers();
  process.exit(1);
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await stopServers();
  process.exit(1);
});

// Run tests
runAllTests().catch(console.error);
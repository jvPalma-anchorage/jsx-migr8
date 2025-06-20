#!/usr/bin/env tsx

/**
 * Demo script showing the complete jsx-migr8 workflow
 */

import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';
import WebSocket from 'ws';

const API_URL = 'http://localhost:3001';
const DEMO_PROJECT_PATH = join(process.cwd(), 'test-suite/demo-project');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createDemoProject() {
  log('\n📁 Creating demo project...', colors.cyan);
  
  if (existsSync(DEMO_PROJECT_PATH)) {
    rmSync(DEMO_PROJECT_PATH, { recursive: true, force: true });
  }
  
  mkdirSync(join(DEMO_PROJECT_PATH, 'src/components'), { recursive: true });
  mkdirSync(join(DEMO_PROJECT_PATH, 'src/pages'), { recursive: true });
  
  // Create demo files
  writeFileSync(join(DEMO_PROJECT_PATH, 'package.json'), JSON.stringify({
    name: 'demo-project',
    version: '1.0.0',
    dependencies: {
      'react': '^18.0.0',
      '@material-ui/core': '^4.12.0'
    }
  }, null, 2));
  
  writeFileSync(join(DEMO_PROJECT_PATH, 'src/components/Button.jsx'), `
import React from 'react';
import { Button as MuiButton } from '@material-ui/core';

export const Button = ({ onClick, children, color = 'primary', variant = 'contained' }) => {
  return (
    <MuiButton 
      onClick={onClick}
      color={color}
      variant={variant}
    >
      {children}
    </MuiButton>
  );
};
  `);
  
  writeFileSync(join(DEMO_PROJECT_PATH, 'src/pages/Dashboard.jsx'), `
import React from 'react';
import { Button } from '../components/Button';
import { Card, Typography } from '@material-ui/core';

export const Dashboard = () => {
  const handleClick = () => {
    console.log('Button clicked!');
  };

  return (
    <Card>
      <Typography variant="h4">Dashboard</Typography>
      <Button onClick={handleClick} color="secondary">
        Click Me
      </Button>
      <Button variant="outlined">
        Another Button
      </Button>
    </Card>
  );
};
  `);
  
  log('✅ Demo project created', colors.green);
}

async function runDemo() {
  log('\n🚀 JSX-Migr8 Workflow Demo', colors.magenta);
  log('=' .repeat(50), colors.magenta);
  
  try {
    // Step 1: Create demo project
    await createDemoProject();
    await sleep(1000);
    
    // Step 2: Check API health
    log('\n🏥 Checking API health...', colors.cyan);
    const healthResponse = await fetch(`${API_URL}/health`);
    const health = await healthResponse.json();
    log(`✅ API Status: ${health.status}`, colors.green);
    await sleep(500);
    
    // Step 3: Create project
    log('\n📋 Creating project in jsx-migr8...', colors.cyan);
    const createResponse = await fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: DEMO_PROJECT_PATH,
        name: 'Demo Project'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create project: ${await createResponse.text()}`);
    }
    
    const createResult = await createResponse.json();
    const projectId = createResult.data.id;
    log(`✅ Project created with ID: ${projectId}`, colors.green);
    await sleep(500);
    
    // Step 4: Connect WebSocket
    log('\n🔌 Connecting WebSocket...', colors.cyan);
    const ws = new WebSocket(`ws://localhost:3001/ws/${projectId}`);
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        log('✅ WebSocket connected', colors.green);
        resolve(undefined);
      });
      ws.on('error', reject);
    });
    
    // Listen for messages
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'progress') {
        const progress = message.data;
        log(`📊 Progress: ${progress.completed}/${progress.total} - ${progress.current}`, colors.yellow);
      } else if (message.type === 'log') {
        log(`📝 ${message.data}`, colors.blue);
      }
    });
    
    await sleep(500);
    
    // Step 5: Analyze project
    log('\n🔍 Analyzing project...', colors.cyan);
    const analyzeResponse = await fetch(`${API_URL}/api/projects/${projectId}/analyze`, {
      method: 'POST'
    });
    
    if (!analyzeResponse.ok) {
      throw new Error('Failed to analyze project');
    }
    
    const analysis = await analyzeResponse.json();
    log(`✅ Analysis complete!`, colors.green);
    log(`   Files analyzed: ${analysis.data.filesAnalyzed}`, colors.blue);
    log(`   Components found: ${analysis.data.componentsFound}`, colors.blue);
    
    if (analysis.data.components) {
      log('\n📦 Components:', colors.cyan);
      analysis.data.components.forEach((comp: any) => {
        log(`   - ${comp.name} (${comp.usageCount} usages)`, colors.blue);
        if (comp.props && comp.props.length > 0) {
          comp.props.forEach((prop: any) => {
            log(`     • ${prop.name}: ${prop.type}`, colors.yellow);
          });
        }
      });
    }
    
    await sleep(1000);
    
    // Step 6: Create migration rule
    log('\n📜 Creating migration rule...', colors.cyan);
    const ruleResponse = await fetch(`${API_URL}/api/projects/${projectId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Update Button Props',
        pattern: 'Button',
        transformations: [
          {
            type: 'rename-prop',
            from: 'color',
            to: 'appearance'
          },
          {
            type: 'rename-prop',
            from: 'variant',
            to: 'style'
          }
        ]
      })
    });
    
    if (ruleResponse.ok) {
      log('✅ Migration rule created', colors.green);
    }
    
    await sleep(500);
    
    // Step 7: Run dry-run migration
    log('\n🧪 Running dry-run migration...', colors.cyan);
    const migrationResponse = await fetch(`${API_URL}/api/projects/${projectId}/migrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleId: 'demo-rule',
        dryRun: true
      })
    });
    
    if (migrationResponse.ok) {
      log('✅ Migration dry-run started', colors.green);
      
      // Wait for completion
      await sleep(3000);
    }
    
    // Close WebSocket
    ws.close();
    
    log('\n✨ Demo completed successfully!', colors.green);
    log('\nThe demo showed:', colors.cyan);
    log('1. Creating a project with React components', colors.blue);
    log('2. Analyzing the codebase to find components', colors.blue);
    log('3. Real-time updates via WebSocket', colors.blue);
    log('4. Creating migration rules', colors.blue);
    log('5. Running a dry-run migration', colors.blue);
    
  } catch (error) {
    log(`\n❌ Error: ${error}`, colors.reset);
  } finally {
    // Cleanup
    if (existsSync(DEMO_PROJECT_PATH)) {
      rmSync(DEMO_PROJECT_PATH, { recursive: true, force: true });
    }
  }
}

// Check if API is running
async function checkAPI() {
  try {
    await fetch(`${API_URL}/health`);
    return true;
  } catch {
    return false;
  }
}

// Main
(async () => {
  if (!await checkAPI()) {
    log('❌ API server is not running!', colors.reset);
    log('Please start it with: yarn api:dev', colors.yellow);
    process.exit(1);
  }
  
  await runDemo();
})();
#!/usr/bin/env tsx

/**
 * CLI Workflows Test
 */

import { execSync } from 'child_process';

interface WorkflowTest {
  name: string;
  command: string;
  timeout: number;
  expectedOutputs: string[];
}

async function testCLIWorkflows() {
  console.log('🧪 Testing CLI workflows...');
  
  const tests: WorkflowTest[] = [
    {
      name: 'Help Command',
      command: 'yarn start --help',
      timeout: 5000,
      expectedOutputs: ['Options:', '--help', '--version']
    },
    {
      name: 'Version Command', 
      command: 'yarn start --version',
      timeout: 5000,
      expectedOutputs: ['1.0.0']
    },
    {
      name: 'Backup List',
      command: 'yarn start --listBackups',
      timeout: 15000,
      expectedOutputs: ['backup', 'Found', 'No backups']
    },
    {
      name: 'Optimized Mode Check',
      command: 'timeout 5 yarn start --optimized --info --quiet --root /data/data/com.termux/files/home/jsx-migr8/test-react-project',
      timeout: 10000,
      expectedOutputs: ['optimized', 'Scanning', 'Found', 'Graph']
    }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    console.log(`\\n🔍 Testing: ${test.name}...`);
    
    try {
      const startTime = Date.now();
      const result = execSync(test.command, {
        encoding: 'utf8',
        timeout: test.timeout,
        cwd: '/data/data/com.termux/files/home/jsx-migr8',
        input: 'q\\n' // Quick quit for interactive commands
      });
      
      const duration = Date.now() - startTime;
      
      // Check if any expected output is present
      const hasExpectedOutput = test.expectedOutputs.some(expected => 
        result.toLowerCase().includes(expected.toLowerCase())
      );
      
      if (hasExpectedOutput) {
        console.log(`✅ ${test.name} - PASSED (${duration}ms)`);
        console.log(`   Output contains expected content`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - FAILED (${duration}ms)`);
        console.log(`   Expected one of: ${test.expectedOutputs.join(', ')}`);
        console.log(`   Output snippet: ${result.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`❌ ${test.name} - FAILED`);
      console.log(`   Error: ${error instanceof Error ? error.message.substring(0, 100) : 'Unknown error'}...`);
    }
  }
  
  const successRate = (passed / total * 100).toFixed(1);
  
  console.log(`\\n📊 CLI Workflow Test Results:`);
  console.log(`   Passed: ${passed}/${total} (${successRate}%)`);
  
  return passed >= Math.ceil(total * 0.75); // 75% success rate required
}

testCLIWorkflows().then(success => {
  console.log(`\\n🎯 CLI workflows test: ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
});
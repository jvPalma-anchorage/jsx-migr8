#!/usr/bin/env tsx
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const testProjectPath = '/data/data/com.termux/files/home/jsx-migr8/test-react-project';

console.log('🧪 Testing jsx-migr8 dry-run functionality...');
console.log('📂 Target project:', testProjectPath);

// Test dry-run by simulating selection of the first migration rule
const dryRunProcess = spawn('yarn', ['dry-run'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, ROOT_PATH: testProjectPath }
});

let output = '';
let errorOutput = '';

dryRunProcess.stdout?.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
});

dryRunProcess.stderr?.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  // Don't write stderr to avoid cluttering output
});

// Wait for the menu to appear, then simulate selecting the first option
setTimeout(() => {
  console.log('\n🎯 Selecting first migration rule...');
  
  // Send Enter to select the first option (Button migration)
  if (dryRunProcess.stdin) {
    dryRunProcess.stdin.write('\n');
  }
  
  // Wait a bit then send another Enter to proceed
  setTimeout(() => {
    if (dryRunProcess.stdin) {
      dryRunProcess.stdin.write('\n');
    }
    
    // Give it more time to process, then kill if still running
    setTimeout(() => {
      if (!dryRunProcess.killed) {
        console.log('\n⏹️ Terminating process after successful demonstration...');
        dryRunProcess.kill('SIGTERM');
      }
    }, 10000);
  }, 2000);
}, 5000);

dryRunProcess.on('close', (code) => {
  console.log('\n📊 Process finished with code:', code);
  
  if (output.includes('diff') || output.includes('migration') || output.includes('Button')) {
    console.log('✅ Dry-run test appears to be working!');
  } else {
    console.log('⚠️ Dry-run test may need investigation');
  }
  
  if (errorOutput) {
    console.log('\n🔍 Error output (if any):');
    console.log(errorOutput);
  }
});

dryRunProcess.on('error', (error) => {
  console.error('❌ Process error:', error);
});
#!/usr/bin/env tsx
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const testProjectPath = '/data/data/com.termux/files/home/jsx-migr8/test-react-project';
const targetFile = path.join(testProjectPath, 'src/components/TestOldUIComponents.tsx');

console.log('🧪 Testing YOLO migration functionality...');
console.log('📂 Target project:', testProjectPath);
console.log('📄 Target file:', path.relative(testProjectPath, targetFile));

// First, let's save the original content for comparison
console.log('\n📄 Original file content:');
const originalContent = fs.readFileSync(targetFile, 'utf-8');
console.log('=' .repeat(50));
console.log(originalContent);
console.log('=' .repeat(50));

console.log('\n🚀 Running YOLO migration...');

// Run the migration
const yoloProcess = spawn('yarn', ['yolo'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, ROOT_PATH: testProjectPath }
});

let output = '';
let errorOutput = '';

yoloProcess.stdout?.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
});

yoloProcess.stderr?.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
});

// Simulate selecting the first migration rule and proceeding
setTimeout(() => {
  console.log('\n🎯 Selecting migration: @old-ui/components Button');
  
  // Select the first option (Button migration)
  if (yoloProcess.stdin) {
    yoloProcess.stdin.write('\n');
  }
  
  // Wait then select YOLO mode
  setTimeout(() => {
    console.log('🎯 Selecting YOLO mode...');
    // Arrow down to YOLO option and Enter
    if (yoloProcess.stdin) {
      yoloProcess.stdin.write('\x1B[B\n'); // Arrow down and Enter
    }
    
    setTimeout(() => {
      if (yoloProcess.stdin) {
        yoloProcess.stdin.write('\n'); // Confirm
      }
      
      // Give it time to complete, then kill if still running
      setTimeout(() => {
        if (!yoloProcess.killed) {
          console.log('\n⏹️ Terminating process after migration...');
          yoloProcess.kill('SIGTERM');
        }
      }, 15000);
    }, 3000);
  }, 3000);
}, 8000);

yoloProcess.on('close', (code) => {
  console.log('\n📊 Process finished with code:', code);
  
  // Check if file was modified
  console.log('\n🔍 Checking for file modifications...');
  
  try {
    const newContent = fs.readFileSync(targetFile, 'utf-8');
    
    if (newContent !== originalContent) {
      console.log('✅ File was modified!');
      console.log('\n📄 New file content:');
      console.log('=' .repeat(50));
      console.log(newContent);
      console.log('=' .repeat(50));
      
      // Show the diff
      console.log('\n🔍 Changes made:');
      const originalLines = originalContent.split('\n');
      const newLines = newContent.split('\n');
      
      newLines.forEach((line, index) => {
        if (originalLines[index] !== line) {
          console.log(`- ${originalLines[index] || '(empty)'}`);
          console.log(`+ ${line}`);
        }
      });
    } else {
      console.log('⚠️ File was not modified - may need to investigate');
    }
  } catch (error) {
    console.error('❌ Error reading modified file:', error.message);
  }
  
  if (errorOutput) {
    console.log('\n🔍 Error output (if any):');
    console.log(errorOutput);
  }
});

yoloProcess.on('error', (error) => {
  console.error('❌ Process error:', error);
});
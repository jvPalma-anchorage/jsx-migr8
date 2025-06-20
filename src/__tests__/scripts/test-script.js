#!/usr/bin/env node

// Script to test jsx-migr8 workflow programmatically
import { spawn } from 'child_process';

const testWorkflow = async () => {
  console.log("Testing jsx-migr8 workflow...");
  
  // Test 1: Start jsx-migr8 and select "Inspect components"
  console.log("\n1. Testing 'Inspect components' option...");
  
  const child = spawn('yarn', ['start'], {
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true
  });
  
  // Send key press for first option (Inspect components) and exit
  setTimeout(() => {
    child.stdin.write('\n'); // Select first option
    setTimeout(() => {
      child.stdin.write('q\n'); // Quit if there's a submenu
      setTimeout(() => {
        child.stdin.write('\x03'); // Ctrl+C to exit
      }, 2000);
    }, 3000);
  }, 5000);
  
  child.on('exit', (code) => {
    console.log(`Process exited with code: ${code}`);
  });
};

testWorkflow().catch(console.error);
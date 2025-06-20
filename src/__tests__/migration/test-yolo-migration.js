#!/usr/bin/env node

// Test script for YOLO migration
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const testYOLOMigration = () => {
  return new Promise((resolve, reject) => {
    console.log("Starting YOLO migration test...");
    
    const child = spawn('yarn', ['yolo', '--quiet'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let output = '';
    let stage = 'waiting';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log('OUTPUT:', text);

      if (text.includes('type \'yes\' to continue')) {
        console.log('Sending confirmation: yes');
        child.stdin.write('yes\n');
        stage = 'confirmed';
      } else if (text.includes('Pick an Migr8') && stage === 'confirmed') {
        console.log('Selecting first migration option...');
        child.stdin.write('\n'); // Select first option
        stage = 'selected';
      } else if (text.includes('migration completed') || text.includes('🎉')) {
        console.log('Migration appears to be complete!');
        stage = 'completed';
        child.stdin.write('\n'); // Exit or continue
      }
    });

    child.stderr.on('data', (data) => {
      console.log('STDERR:', data.toString());
    });

    child.on('exit', (code) => {
      console.log(`YOLO migration process exited with code: ${code}`);
      resolve({ code, output });
    });

    // Timeout after 60 seconds
    setTimeout(60000).then(() => {
      console.log('Test timed out, killing process...');
      child.kill('SIGTERM');
      resolve({ code: -1, output: 'TIMEOUT', stage });
    });
  });
};

testYOLOMigration()
  .then(result => {
    console.log('YOLO migration test result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('YOLO migration test failed:', error);
    process.exit(1);
  });
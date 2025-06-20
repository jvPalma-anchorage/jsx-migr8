#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI escape codes for terminal control
const KEY_CODES = {
  UP: '\x1B[A',
  DOWN: '\x1B[B',
  ENTER: '\r',
  SPACE: ' ',
  ESC: '\x1B',
  CTRL_C: '\x03'
};

// Utility to add delay between actions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility to log with timestamp
const log = (message, data = '') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data);
};

// Main test function
async function testCLIInteraction() {
  log('Starting jsx-migr8 CLI test...');
  
  // Create output log file
  const outputLog = fs.createWriteStream(path.join(__dirname, 'test-cli-output.log'));
  
  // Spawn the CLI process
  const cli = spawn('yarn', ['start'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  let outputBuffer = '';
  let currentMenu = 'main';
  
  // Handle CLI output
  cli.stdout.on('data', (data) => {
    const output = data.toString();
    outputBuffer += output;
    outputLog.write(output);
    
    // Print output to console for visibility
    process.stdout.write(output);
    
    // Detect which menu we're in based on output patterns
    if (output.includes('What would you like to do?')) {
      currentMenu = 'main';
    } else if (output.includes('Select a package to inspect')) {
      currentMenu = 'package_selection';
    } else if (output.includes('Select components to inspect')) {
      currentMenu = 'component_selection';
    }
  });

  cli.stderr.on('data', (data) => {
    const error = data.toString();
    outputLog.write(`[STDERR] ${error}`);
    console.error('CLI Error:', error);
  });

  // Handle CLI exit
  cli.on('close', (code) => {
    log(`CLI exited with code ${code}`);
    outputLog.end();
    
    // Analyze captured output
    analyzeOutput(outputBuffer);
  });

  // Error handling
  cli.on('error', (err) => {
    log('Failed to start CLI:', err);
    process.exit(1);
  });

  try {
    // Wait for initial menu to load
    await delay(2000);
    log('Main menu loaded, selecting "Inspect components"');

    // Step 1: Navigate to "Inspect components" (assuming it's the 3rd option)
    cli.stdin.write(KEY_CODES.DOWN); // Move to second option
    await delay(500);
    cli.stdin.write(KEY_CODES.DOWN); // Move to third option
    await delay(500);
    cli.stdin.write(KEY_CODES.ENTER); // Select "Inspect components"
    await delay(2000);

    // Step 2: Wait for package list and select first package
    log('Waiting for package selection menu...');
    await delay(2000);
    
    // Select first package (already highlighted)
    log('Selecting first package');
    cli.stdin.write(KEY_CODES.ENTER);
    await delay(2000);

    // Step 3: Component selection - select a few components
    log('In component selection menu, selecting components...');
    
    // Toggle first component
    cli.stdin.write(KEY_CODES.SPACE);
    await delay(500);
    
    // Move down and toggle second component
    cli.stdin.write(KEY_CODES.DOWN);
    await delay(500);
    cli.stdin.write(KEY_CODES.SPACE);
    await delay(500);
    
    // Move down and toggle third component
    cli.stdin.write(KEY_CODES.DOWN);
    await delay(500);
    cli.stdin.write(KEY_CODES.SPACE);
    await delay(500);
    
    // Confirm selection
    log('Confirming component selection');
    cli.stdin.write(KEY_CODES.ENTER);
    await delay(3000);

    // Step 4: Wait for inspection results
    log('Waiting for inspection results...');
    await delay(5000);

    // Exit the CLI
    log('Sending exit signal');
    cli.stdin.write(KEY_CODES.CTRL_C);
    
  } catch (error) {
    log('Error during interaction:', error);
    cli.kill();
  }
}

// Analyze the captured output
function analyzeOutput(output) {
  log('\n=== Output Analysis ===');
  
  const checks = [
    {
      name: 'Main menu displayed',
      pattern: /What would you like to do\?/,
      found: false
    },
    {
      name: 'Inspect components option available',
      pattern: /Inspect components/,
      found: false
    },
    {
      name: 'Package selection menu displayed',
      pattern: /Select a package to inspect/,
      found: false
    },
    {
      name: 'Component selection menu displayed',
      pattern: /Select components to inspect/,
      found: false
    },
    {
      name: 'Components listed',
      pattern: /\[\s*\]/,  // Checkbox pattern
      found: false
    },
    {
      name: 'Inspection results shown',
      pattern: /(Props?|Usage|Component)/i,
      found: false
    }
  ];

  // Check each pattern
  checks.forEach(check => {
    check.found = check.pattern.test(output);
    log(`${check.name}: ${check.found ? '✓' : '✗'}`);
  });

  // Summary
  const passed = checks.filter(c => c.found).length;
  const total = checks.length;
  
  log(`\nTest Summary: ${passed}/${total} checks passed`);
  
  if (passed === total) {
    log('✓ All tests passed! The "Inspect components" functionality appears to be working correctly.');
  } else {
    log('✗ Some tests failed. Check the test-cli-output.log file for details.');
  }
  
  // Save analysis results
  const analysisPath = path.join(__dirname, 'test-cli-analysis.json');
  fs.writeFileSync(analysisPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    checks: checks,
    summary: {
      passed: passed,
      total: total,
      success: passed === total
    }
  }, null, 2));
  
  log(`Analysis saved to: ${analysisPath}`);
}

// Alternative approach using pty for better terminal emulation
async function testWithPty() {
  try {
    const pty = require('node-pty');
    log('Using node-pty for better terminal emulation...');
    
    const ptyProcess = pty.spawn('yarn', ['start'], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: __dirname,
      env: process.env
    });

    let output = '';
    
    ptyProcess.on('data', (data) => {
      output += data;
      process.stdout.write(data);
    });

    // Similar interaction logic as above...
    
  } catch (error) {
    log('node-pty not available, falling back to standard approach');
    return false;
  }
}

// Run the test
async function main() {
  log('=== JSX-Migr8 CLI Interaction Test ===');
  log('This script will simulate user interaction with the CLI');
  log('Output will be captured to test-cli-output.log');
  log('');
  
  // Check if we should use pty
  const usePty = process.argv.includes('--pty');
  
  if (usePty) {
    const ptySuccess = await testWithPty();
    if (!ptySuccess) {
      await testCLIInteraction();
    }
  } else {
    await testCLIInteraction();
  }
}

// Handle script termination
process.on('SIGINT', () => {
  log('\nTest interrupted by user');
  process.exit(0);
});

// Run the main function
main().catch(error => {
  log('Fatal error:', error);
  process.exit(1);
});
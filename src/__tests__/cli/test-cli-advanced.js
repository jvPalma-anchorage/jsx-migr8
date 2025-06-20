#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Test scenarios
const TEST_SCENARIOS = {
  inspectComponents: {
    name: 'Inspect Components Flow',
    steps: [
      { action: 'wait', duration: 2000, description: 'Wait for main menu' },
      { action: 'key', key: 'DOWN', repeat: 2, description: 'Navigate to Inspect components' },
      { action: 'key', key: 'ENTER', description: 'Select Inspect components' },
      { action: 'wait', duration: 2000, description: 'Wait for package list' },
      { action: 'key', key: 'ENTER', description: 'Select first package' },
      { action: 'wait', duration: 2000, description: 'Wait for component list' },
      { action: 'key', key: 'SPACE', description: 'Toggle first component' },
      { action: 'key', key: 'DOWN', description: 'Move to next component' },
      { action: 'key', key: 'SPACE', description: 'Toggle second component' },
      { action: 'key', key: 'ENTER', description: 'Confirm selection' },
      { action: 'wait', duration: 5000, description: 'Wait for results' },
      { action: 'key', key: 'CTRL_C', description: 'Exit' }
    ]
  },
  quickNavigation: {
    name: 'Quick Navigation Test',
    steps: [
      { action: 'wait', duration: 2000, description: 'Wait for main menu' },
      { action: 'key', key: 'DOWN', repeat: 4, description: 'Navigate through all options' },
      { action: 'key', key: 'UP', repeat: 4, description: 'Navigate back up' },
      { action: 'key', key: 'CTRL_C', description: 'Exit' }
    ]
  }
};

// Enhanced key codes with more options
const KEY_CODES = {
  UP: '\x1B[A',
  DOWN: '\x1B[B',
  RIGHT: '\x1B[C',
  LEFT: '\x1B[D',
  ENTER: '\r',
  SPACE: ' ',
  ESC: '\x1B',
  CTRL_C: '\x03',
  TAB: '\t',
  BACKSPACE: '\x7F'
};

class CLITester {
  constructor(scenario) {
    this.scenario = scenario;
    this.outputBuffer = '';
    this.logStream = null;
    this.cli = null;
    this.startTime = Date.now();
    this.stepResults = [];
  }

  log(message, data = '') {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const logMessage = `[${elapsed}s] ${message}`;
    console.log(logMessage, data);
    
    if (this.logStream) {
      this.logStream.write(`${logMessage} ${data}\n`);
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async executeStep(step, index) {
    this.log(`Step ${index + 1}: ${step.description}`);
    
    const stepStart = Date.now();
    let success = true;
    let error = null;

    try {
      switch (step.action) {
        case 'wait':
          await this.delay(step.duration);
          break;
          
        case 'key':
          const repeat = step.repeat || 1;
          for (let i = 0; i < repeat; i++) {
            this.cli.stdin.write(KEY_CODES[step.key]);
            if (repeat > 1) await this.delay(200);
          }
          break;
          
        case 'text':
          this.cli.stdin.write(step.text);
          break;
          
        case 'check':
          success = await this.checkOutput(step.pattern, step.timeout || 5000);
          if (!success) {
            error = `Pattern not found: ${step.pattern}`;
          }
          break;
      }
    } catch (err) {
      success = false;
      error = err.message;
    }

    const duration = Date.now() - stepStart;
    this.stepResults.push({
      step: index + 1,
      description: step.description,
      success,
      error,
      duration
    });

    if (!success) {
      throw new Error(`Step ${index + 1} failed: ${error}`);
    }
  }

  async checkOutput(pattern, timeout) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const checkStart = Date.now();
    
    while (Date.now() - checkStart < timeout) {
      if (regex.test(this.outputBuffer)) {
        return true;
      }
      await this.delay(100);
    }
    
    return false;
  }

  async run() {
    this.log(`Starting test: ${this.scenario.name}`);
    
    // Create log file
    const logFileName = `test-${this.scenario.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.log`;
    this.logStream = fs.createWriteStream(path.join(__dirname, 'test-logs', logFileName));
    
    // Ensure test-logs directory exists
    const logsDir = path.join(__dirname, 'test-logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }

    return new Promise((resolve, reject) => {
      // Spawn the CLI
      this.cli = spawn('yarn', ['start'], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '1', NODE_ENV: 'test' }
      });

      // Handle output
      this.cli.stdout.on('data', (data) => {
        const output = data.toString();
        this.outputBuffer += output;
        this.logStream.write(output);
        process.stdout.write(output);
      });

      this.cli.stderr.on('data', (data) => {
        const error = data.toString();
        this.logStream.write(`[STDERR] ${error}`);
        console.error(error);
      });

      // Handle exit
      this.cli.on('close', (code) => {
        this.log(`CLI exited with code ${code}`);
        this.logStream.end();
        resolve(this.generateReport());
      });

      this.cli.on('error', (err) => {
        this.log('Failed to start CLI:', err);
        reject(err);
      });

      // Execute test steps
      this.executeSteps()
        .catch(err => {
          this.log('Test failed:', err.message);
          this.cli.kill();
        });
    });
  }

  async executeSteps() {
    for (let i = 0; i < this.scenario.steps.length; i++) {
      await this.executeStep(this.scenario.steps[i], i);
    }
  }

  generateReport() {
    const totalSteps = this.stepResults.length;
    const successfulSteps = this.stepResults.filter(r => r.success).length;
    const totalDuration = Date.now() - this.startTime;

    const report = {
      scenario: this.scenario.name,
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      steps: {
        total: totalSteps,
        successful: successfulSteps,
        failed: totalSteps - successfulSteps
      },
      results: this.stepResults,
      outputAnalysis: this.analyzeOutput()
    };

    // Save report
    const reportPath = path.join(__dirname, 'test-logs', `report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  analyzeOutput() {
    const analysis = {
      menuDetected: /What would you like to do\?/.test(this.outputBuffer),
      inspectOptionFound: /Inspect components/.test(this.outputBuffer),
      packageListFound: /Select a package to inspect/.test(this.outputBuffer),
      componentListFound: /Select components to inspect/.test(this.outputBuffer),
      checkboxesFound: /\[\s*\]/.test(this.outputBuffer),
      errorMessages: this.extractErrors(),
      totalLines: this.outputBuffer.split('\n').length
    };

    return analysis;
  }

  extractErrors() {
    const errorPatterns = [
      /Error:/gi,
      /Failed/gi,
      /Exception/gi,
      /Cannot/gi,
      /Unable/gi
    ];

    const errors = [];
    errorPatterns.forEach(pattern => {
      const matches = this.outputBuffer.match(pattern);
      if (matches) {
        errors.push(...matches);
      }
    });

    return [...new Set(errors)];
  }
}

// Interactive test runner
async function runInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n=== JSX-Migr8 CLI Test Runner ===\n');
  console.log('Available test scenarios:');
  
  const scenarios = Object.keys(TEST_SCENARIOS);
  scenarios.forEach((key, index) => {
    console.log(`${index + 1}. ${TEST_SCENARIOS[key].name}`);
  });
  
  console.log(`${scenarios.length + 1}. Run all tests`);
  console.log('0. Exit\n');

  return new Promise((resolve) => {
    rl.question('Select a test to run: ', async (answer) => {
      rl.close();
      
      const choice = parseInt(answer);
      
      if (choice === 0) {
        console.log('Exiting...');
        resolve();
        return;
      }
      
      if (choice === scenarios.length + 1) {
        // Run all tests
        for (const key of scenarios) {
          const tester = new CLITester(TEST_SCENARIOS[key]);
          const report = await tester.run();
          displayReport(report);
          await new Promise(r => setTimeout(r, 2000));
        }
      } else if (choice > 0 && choice <= scenarios.length) {
        // Run selected test
        const scenarioKey = scenarios[choice - 1];
        const tester = new CLITester(TEST_SCENARIOS[scenarioKey]);
        const report = await tester.run();
        displayReport(report);
      } else {
        console.log('Invalid choice');
      }
      
      resolve();
    });
  });
}

function displayReport(report) {
  console.log('\n=== Test Report ===');
  console.log(`Scenario: ${report.scenario}`);
  console.log(`Duration: ${(report.duration / 1000).toFixed(2)}s`);
  console.log(`Steps: ${report.steps.successful}/${report.steps.total} successful`);
  
  if (report.steps.failed > 0) {
    console.log('\nFailed steps:');
    report.results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - Step ${r.step}: ${r.description}`);
        console.log(`    Error: ${r.error}`);
      });
  }
  
  console.log('\nOutput Analysis:');
  Object.entries(report.outputAnalysis).forEach(([key, value]) => {
    if (key !== 'errorMessages') {
      console.log(`  ${key}: ${value ? '✓' : '✗'}`);
    }
  });
  
  if (report.outputAnalysis.errorMessages.length > 0) {
    console.log(`  Errors found: ${report.outputAnalysis.errorMessages.join(', ')}`);
  }
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node test-cli-advanced.js [options]');
    console.log('Options:');
    console.log('  --scenario <name>  Run specific scenario');
    console.log('  --all              Run all scenarios');
    console.log('  --interactive      Interactive mode (default)');
    console.log('  --help             Show this help');
    return;
  }
  
  if (args.includes('--all')) {
    for (const key of Object.keys(TEST_SCENARIOS)) {
      const tester = new CLITester(TEST_SCENARIOS[key]);
      const report = await tester.run();
      displayReport(report);
      await new Promise(r => setTimeout(r, 2000));
    }
  } else if (args.includes('--scenario')) {
    const index = args.indexOf('--scenario');
    const scenarioName = args[index + 1];
    const scenario = TEST_SCENARIOS[scenarioName];
    
    if (!scenario) {
      console.error(`Unknown scenario: ${scenarioName}`);
      console.log('Available scenarios:', Object.keys(TEST_SCENARIOS).join(', '));
      return;
    }
    
    const tester = new CLITester(scenario);
    const report = await tester.run();
    displayReport(report);
  } else {
    await runInteractive();
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
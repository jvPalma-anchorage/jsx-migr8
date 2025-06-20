#!/usr/bin/env tsx

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

/**
 * Comprehensive integration test runner for jsx-migr8
 * 
 * This script runs all integration tests in a specific order and provides
 * detailed reporting on test results, performance metrics, and coverage.
 */

interface TestSuite {
  name: string;
  file: string;
  description: string;
  timeout?: number;
  required?: boolean; // If false, failure won't fail the entire suite
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Node.js Compatibility',
    file: 'node-compatibility.test.ts',
    description: 'Tests Node.js version requirements and platform compatibility',
    timeout: 30000,
    required: true
  },
  {
    name: 'CLI Workflows',
    file: 'cli-workflows.test.ts',
    description: 'End-to-end CLI workflow testing with mocked inputs',
    timeout: 60000,
    required: true
  },
  {
    name: 'Transformation Snapshots',
    file: 'transformation-snapshots.test.ts',
    description: 'Snapshot testing for transformation outputs and diffs',
    timeout: 45000,
    required: true
  },
  {
    name: 'Performance Regression',
    file: 'performance-regression.test.ts',
    description: 'Performance benchmarks and regression detection',
    timeout: 120000,
    required: false // Performance tests might be flaky in CI
  },
  {
    name: 'Error Scenarios',
    file: 'error-scenarios.test.ts',
    description: 'Comprehensive error handling and edge case testing',
    timeout: 45000,
    required: true
  },
  {
    name: 'Backup & Rollback',
    file: 'backup-rollback.test.ts',
    description: 'Backup system and rollback operation integration',
    timeout: 60000,
    required: true
  }
];

interface TestResult {
  suite: TestSuite;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

async function runTestSuite(suite: TestSuite): Promise<TestResult> {
  const startTime = Date.now();
  
  console.log(`\n🧪 Running ${suite.name}...`);
  console.log(`   ${suite.description}`);
  
  return new Promise((resolve) => {
    const jestArgs = [
      '--testPathPattern',
      suite.file,
      '--verbose',
      '--no-cache',
      '--detectOpenHandles',
      '--forceExit'
    ];

    if (suite.timeout) {
      jestArgs.push('--testTimeout', suite.timeout.toString());
    }

    const child = spawn('npx', ['jest', ...jestArgs], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CI: 'true'
      }
    });

    let output = '';
    let error = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    child.stderr?.on('data', (data) => {
      error += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (exitCode) => {
      const duration = Date.now() - startTime;
      const passed = exitCode === 0;
      
      if (passed) {
        console.log(`✅ ${suite.name} passed (${duration}ms)`);
      } else {
        console.log(`❌ ${suite.name} failed (${duration}ms)`);
      }
      
      resolve({
        suite,
        passed,
        duration,
        output,
        error: error || undefined
      });
    });

    child.on('error', (err) => {
      const duration = Date.now() - startTime;
      console.log(`💥 ${suite.name} crashed (${duration}ms)`);
      
      resolve({
        suite,
        passed: false,
        duration,
        output,
        error: err.message
      });
    });
  });
}

async function generateReport(results: TestResult[]): Promise<void> {
  const reportPath = path.join(process.cwd(), 'integration-test-report.json');
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  const report = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      duration: totalDuration,
      successRate: ((passedTests / totalTests) * 100).toFixed(2) + '%'
    },
    results: results.map(r => ({
      name: r.suite.name,
      file: r.suite.file,
      passed: r.passed,
      duration: r.duration,
      required: r.suite.required,
      error: r.error
    }))
  };
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📊 Integration Test Summary');
  console.log('============================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${report.summary.successRate}`);
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Report saved to: ${reportPath}`);
  
  // Performance summary
  const performanceResults = results.find(r => r.suite.name === 'Performance Regression');
  if (performanceResults && performanceResults.passed) {
    console.log('\n⚡ Performance Results Available');
    const baselinePath = path.join(process.cwd(), 'src', '__tests__', 'integration', 'performance-baseline.json');
    try {
      const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf-8'));
      if (baseline.measurements) {
        console.log('   Performance baseline updated with latest measurements');
      }
    } catch {
      console.log('   Performance baseline created');
    }
  }
  
  // Failed test details
  const failedRequired = results.filter(r => !r.passed && r.suite.required);
  if (failedRequired.length > 0) {
    console.log('\n❌ Critical Test Failures:');
    failedRequired.forEach(r => {
      console.log(`   - ${r.suite.name}: ${r.error || 'Test failures detected'}`);
    });
  }
  
  const failedOptional = results.filter(r => !r.passed && !r.suite.required);
  if (failedOptional.length > 0) {
    console.log('\n⚠️  Optional Test Failures:');
    failedOptional.forEach(r => {
      console.log(`   - ${r.suite.name}: ${r.error || 'Test failures detected'}`);
    });
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting jsx-migr8 Integration Test Suite');
  console.log(`Node.js: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Working Directory: ${process.cwd()}`);
  
  const startTime = Date.now();
  const results: TestResult[] = [];
  
  // Run test suites sequentially to avoid resource conflicts
  for (const suite of TEST_SUITES) {
    const result = await runTestSuite(suite);
    results.push(result);
    
    // If a required test fails, we might want to continue or stop
    // For now, we continue to gather all results
  }
  
  const totalDuration = Date.now() - startTime;
  
  console.log(`\n🏁 All integration tests completed in ${(totalDuration / 1000).toFixed(2)}s`);
  
  await generateReport(results);
  
  // Determine exit code
  const requiredFailures = results.filter(r => !r.passed && r.suite.required);
  if (requiredFailures.length > 0) {
    console.log('\n💥 Integration test suite failed due to required test failures');
    process.exit(1);
  } else {
    console.log('\n✅ Integration test suite completed successfully');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Integration test suite interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Integration test suite terminated');
  process.exit(143);
});

// Run the test suite
main().catch((error) => {
  console.error('\n💥 Integration test runner crashed:', error);
  process.exit(1);
});
#!/usr/bin/env tsx

/**
 * Quick Functionality Test for jsx-migr8
 * 
 * This script tests core functionality efficiently to verify everything works
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  duration: number;
  output?: string;
}

class QuickFunctionalityTest {
  private results: TestResult[] = [];
  private testProjectPath = '/data/data/com.termux/files/home/jsx-migr8/test-projects/test-react-project';

  async runAllTests(): Promise<void> {
    console.log('🚀 Quick jsx-migr8 Functionality Tests\n');
    
    await this.testCLIHelp();
    await this.testCLIVersion();
    await this.testBackupList();
    await this.testGraphBuilding();
    await this.testDryRun();
    await this.testOptimizedMode();

    this.generateReport();
  }

  private async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`🧪 Testing: ${name}...`);
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        name,
        success: true,
        duration,
        output: result?.output ? result.output.substring(0, 200) : undefined
      };
      
      console.log(`✅ ${name} - PASSED (${duration}ms)`);
      this.results.push(testResult);
      return testResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
      
      console.log(`❌ ${name} - FAILED (${duration}ms)`);
      console.log(`   Error: ${testResult.error?.substring(0, 100)}...`);
      this.results.push(testResult);
      return testResult;
    }
  }

  private async testCLIHelp(): Promise<void> {
    await this.runTest('CLI Help Command', async () => {
      const result = execSync('yarn start --help', {
        encoding: 'utf8',
        timeout: 5000,
        cwd: '/data/data/com.termux/files/home/jsx-migr8'
      });

      if (!result.includes('Options:') || !result.includes('--help')) {
        throw new Error('CLI help not working properly');
      }

      return { output: result };
    });
  }

  private async testCLIVersion(): Promise<void> {
    await this.runTest('CLI Version Command', async () => {
      const result = execSync('yarn start --version', {
        encoding: 'utf8',
        timeout: 5000,
        cwd: '/data/data/com.termux/files/home/jsx-migr8'
      });

      if (!result.includes('1.0.0')) {
        throw new Error('Version output not working properly');
      }

      return { output: result };
    });
  }

  private async testBackupList(): Promise<void> {
    await this.runTest('Backup System', async () => {
      const result = execSync('yarn start --listBackups', {
        encoding: 'utf8',
        timeout: 10000,
        cwd: '/data/data/com.termux/files/home/jsx-migr8'
      });

      // Should not crash and should show backup info or "No backups"
      const hasBackupOutput = result.includes('backup') || result.includes('No backups') || result.includes('Found');
      
      if (!hasBackupOutput) {
        throw new Error('Backup system not responding properly');
      }

      return { output: result };
    });
  }

  private async testGraphBuilding(): Promise<void> {
    await this.runTest('Graph Building', async () => {
      // Quick graph test with timeout to avoid hanging
      const result = execSync(`timeout 15 yarn start --root "${this.testProjectPath}" --info --quiet`, {
        encoding: 'utf8',
        timeout: 20000,
        cwd: '/data/data/com.termux/files/home/jsx-migr8',
        input: 'q\\n' // Quit quickly
      });

      // Should build graph and scan files
      const hasGraphOutput = result.includes('Scanning') || result.includes('Found') || result.includes('Graph') || result.includes('files');
      
      if (!hasGraphOutput) {
        throw new Error('Graph building not working properly');
      }

      return { output: result };
    });
  }

  private async testDryRun(): Promise<void> {
    await this.runTest('Dry-run Mode', async () => {
      const result = execSync(`timeout 10 yarn dry-run --root "${this.testProjectPath}" --quiet`, {
        encoding: 'utf8',
        timeout: 15000,
        cwd: '/data/data/com.termux/files/home/jsx-migr8'
      });

      // Should indicate dry-run mode
      const hasDryRunOutput = result.includes('dry') || result.includes('preview') || result.includes('scan') || result.includes('Found');
      
      if (!hasDryRunOutput) {
        throw new Error('Dry-run mode not working properly');
      }

      return { output: result };
    });
  }

  private async testOptimizedMode(): Promise<void> {
    await this.runTest('Optimized Mode', async () => {
      const result = execSync(`timeout 10 yarn start --root "${this.testProjectPath}" --optimized --info --quiet`, {
        encoding: 'utf8',
        timeout: 15000,
        cwd: '/data/data/com.termux/files/home/jsx-migr8',
        input: 'q\\n' // Quit quickly
      });

      // Should use optimized mode without crashing
      const hasOptimizedOutput = result.includes('optimized') || result.includes('performance') || result.includes('memory') || result.includes('Found') || result.includes('Scanning');
      
      if (!hasOptimizedOutput) {
        throw new Error('Optimized mode not working properly');
      }

      return { output: result };
    });
  }

  private generateReport(): void {
    console.log('\\n' + '='.repeat(60));
    console.log('📊 QUICK jsx-migr8 FUNCTIONALITY TEST REPORT');
    console.log('='.repeat(60));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`\\n📈 Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${successRate}%`);

    console.log(`\\n🧪 Test Details:`);
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.name} (${result.duration}ms)`);
      if (!result.success && result.error) {
        console.log(`      Error: ${result.error.substring(0, 100)}...`);
      }
    });

    const functionalityScore = Math.round((passedTests / totalTests) * 10);
    
    console.log(`\\n🎯 Functionality Assessment:`);
    console.log(`   Functionality Score: ${functionalityScore}/10`);

    if (functionalityScore >= 8) {
      console.log(`\\n🏆 jsx-migr8 CORE FUNCTIONALITY IS WORKING!`);
      console.log(`   ✅ Basic systems operational`);
      console.log(`   ✅ CLI interface responsive`);
      console.log(`   ✅ Ready for detailed testing`);
    } else if (functionalityScore >= 6) {
      console.log(`\\n✨ jsx-migr8 is MOSTLY FUNCTIONAL`);
      console.log(`   ⚠️  Some features may need attention`);
    } else {
      console.log(`\\n⚠️  jsx-migr8 needs MORE WORK`);
      console.log(`   ❌ Critical functionality issues`);
    }

    console.log('\\n' + '='.repeat(60));
  }
}

// Run the test
async function main() {
  const tester = new QuickFunctionalityTest();
  await tester.runAllTests();
}

main().catch(console.error);
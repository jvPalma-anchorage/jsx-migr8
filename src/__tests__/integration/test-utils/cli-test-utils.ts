import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { spawn, SpawnOptions } from 'child_process';
import { promisify } from 'util';

export interface CLITestOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  input?: string[];
  expectError?: boolean;
}

export interface CLITestResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

/**
 * Utility class for testing CLI workflows with mocked user inputs
 */
export class CLITestRunner {
  private static readonly DEFAULT_TIMEOUT = 30000;
  private static readonly CLI_ENTRY_POINT = 'src/cli/index.ts';

  /**
   * Execute jsx-migr8 CLI with simulated user inputs
   */
  static async runCLI(
    args: string[] = [],
    options: CLITestOptions = {}
  ): Promise<CLITestResult> {
    const {
      cwd = process.cwd(),
      timeout = CLITestRunner.DEFAULT_TIMEOUT,
      env = {},
      input = [],
      expectError = false
    } = options;

    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const childEnv = {
        ...process.env,
        ...env,
        NODE_ENV: 'test',
        // Disable interactive prompts for testing
        CI: '1',
        NON_INTERACTIVE: '1'
      };

      const spawnOptions: SpawnOptions = {
        cwd,
        env: childEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      };

      const child = spawn('tsx', [CLITestRunner.CLI_ENTRY_POINT, ...args], spawnOptions);
      
      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout;

      // Set up timeout
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`CLI test timed out after ${timeout}ms`));
        }, timeout);
      }

      // Collect output
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      child.on('close', (exitCode) => {
        if (timeoutId) clearTimeout(timeoutId);
        
        const duration = Date.now() - startTime;
        const result: CLITestResult = {
          exitCode: exitCode ?? -1,
          stdout,
          stderr,
          duration
        };

        if (!expectError && exitCode !== 0) {
          reject(new Error(`CLI exited with code ${exitCode}:\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`));
        } else {
          resolve(result);
        }
      });

      child.on('error', (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      });

      // Send input to the CLI
      if (input.length > 0) {
        input.forEach((line, index) => {
          setTimeout(() => {
            child.stdin?.write(line + '\n');
          }, index * 100); // Stagger inputs to simulate user typing
        });
        
        // Close stdin after all inputs
        setTimeout(() => {
          child.stdin?.end();
        }, input.length * 100 + 500);
      } else {
        child.stdin?.end();
      }
    });
  }

  /**
   * Run dry-run mode with specific fixture
   */
  static async runDryRun(fixturePath: string, additionalArgs: string[] = []): Promise<CLITestResult> {
    const env = {
      ROOT_PATH: fixturePath,
      BLACKLIST: 'node_modules,dist,build'
    };

    return CLITestRunner.runCLI(['--dry-run', ...additionalArgs], { env });
  }

  /**
   * Run yolo mode with specific fixture
   */
  static async runYolo(fixturePath: string, additionalArgs: string[] = []): Promise<CLITestResult> {
    const env = {
      ROOT_PATH: fixturePath,
      BLACKLIST: 'node_modules,dist,build'
    };

    return CLITestRunner.runCLI(['--yolo', ...additionalArgs], { env });
  }

  /**
   * Run interactive mode with simulated user inputs
   */
  static async runInteractive(
    fixturePath: string,
    userInputs: string[],
    additionalArgs: string[] = []
  ): Promise<CLITestResult> {
    const env = {
      ROOT_PATH: fixturePath,
      BLACKLIST: 'node_modules,dist,build'
    };

    return CLITestRunner.runCLI(additionalArgs, {
      env,
      input: userInputs
    });
  }
}

/**
 * Utility functions for file system operations in tests
 */
export class TestFileUtils {
  /**
   * Create a temporary directory for test fixtures
   */
  static async createTempDir(prefix: string = 'jsx-migr8-test-'): Promise<string> {
    const tmpDir = await fs.mkdtemp(path.join(__dirname, '..', 'tmp', prefix));
    return tmpDir;
  }

  /**
   * Copy fixture directory to temporary location
   */
  static async copyFixture(fixtureName: string, destDir?: string): Promise<string> {
    const fixtureDir = path.join(__dirname, '..', '__fixtures__', fixtureName);
    const targetDir = destDir || await TestFileUtils.createTempDir(`${fixtureName}-`);
    
    await TestFileUtils.copyDirectory(fixtureDir, targetDir);
    return targetDir;
  }

  /**
   * Recursively copy directory
   */
  static async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await TestFileUtils.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Clean up temporary directories
   */
  static async cleanup(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors during cleanup
      console.warn(`Failed to cleanup ${dir}:`, error);
    }
  }

  /**
   * Read file content as string
   */
  static async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Write file content
   */
  static async writeFile(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Check if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Mock user input for inquirer prompts
 */
export class MockInquirer {
  private static originalInquirer: any;
  private static mockResponses: Record<string, any> = {};

  /**
   * Setup mocked inquirer responses
   */
  static setup(responses: Record<string, any>): void {
    MockInquirer.mockResponses = responses;
    
    // Mock inquirer prompt
    jest.doMock('@inquirer/prompts', () => ({
      select: jest.fn().mockImplementation(async (options: any) => {
        const key = options.message || options.name;
        const response = MockInquirer.mockResponses[key];
        if (response !== undefined) {
          return response;
        }
        throw new Error(`No mock response configured for prompt: ${key}`);
      }),
      confirm: jest.fn().mockImplementation(async (options: any) => {
        const key = options.message || options.name;
        const response = MockInquirer.mockResponses[key];
        if (response !== undefined) {
          return response;
        }
        return false; // Default to false for safety
      }),
      input: jest.fn().mockImplementation(async (options: any) => {
        const key = options.message || options.name;
        const response = MockInquirer.mockResponses[key];
        if (response !== undefined) {
          return response;
        }
        return options.default || '';
      }),
      checkbox: jest.fn().mockImplementation(async (options: any) => {
        const key = options.message || options.name;
        const response = MockInquirer.mockResponses[key];
        if (response !== undefined) {
          return response;
        }
        return [];
      })
    }));
  }

  /**
   * Reset mocked inquirer
   */
  static reset(): void {
    MockInquirer.mockResponses = {};
    jest.clearAllMocks();
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static measurements: Record<string, number[]> = {};

  /**
   * Start measuring performance for a named operation
   */
  static start(name: string): () => number {
    const startTime = process.hrtime.bigint();
    
    return () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      
      if (!PerformanceMonitor.measurements[name]) {
        PerformanceMonitor.measurements[name] = [];
      }
      PerformanceMonitor.measurements[name].push(duration);
      
      return duration;
    };
  }

  /**
   * Get performance statistics for a named operation
   */
  static getStats(name: string): {
    count: number;
    min: number;
    max: number;
    mean: number;
    median: number;
  } | null {
    const measurements = PerformanceMonitor.measurements[name];
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = measurements.length;
    const min = sorted[0];
    const max = sorted[count - 1];
    const mean = measurements.reduce((sum, val) => sum + val, 0) / count;
    const median = count % 2 === 0 
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];

    return { count, min, max, mean, median };
  }

  /**
   * Reset all performance measurements
   */
  static reset(): void {
    PerformanceMonitor.measurements = {};
  }

  /**
   * Get all measurements
   */
  static getAllStats(): Record<string, ReturnType<typeof PerformanceMonitor.getStats>> {
    const result: Record<string, ReturnType<typeof PerformanceMonitor.getStats>> = {};
    
    for (const name of Object.keys(PerformanceMonitor.measurements)) {
      result[name] = PerformanceMonitor.getStats(name);
    }
    
    return result;
  }
}
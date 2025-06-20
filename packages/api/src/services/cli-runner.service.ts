import { spawn } from 'child_process';
import * as path from 'path';
import { ILoggerService } from '../../../../src/di/types';

export interface CLIRunnerOptions {
  rootPath: string;
  blacklist?: string[];
  dryRun?: boolean;
  changeCode?: boolean;
  onProgress?: (message: string) => void;
  onError?: (error: string) => void;
  onComplete?: (stats: { filesModified: number; filesSkipped: number; errors: string[] }) => void;
}

export class CLIRunnerService {
  constructor(private logger: ILoggerService) {}

  async runAnalysis(options: CLIRunnerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      const cliPath = path.join(__dirname, '../../../../src/cli/index.ts');
      const args = [
        'tsx',
        cliPath,
        'analyze',
        '--root', options.rootPath,
      ];

      if (options.blacklist && options.blacklist.length > 0) {
        args.push('--blacklist', options.blacklist.join(','));
      }

      this.logger.debug(`Running CLI command: ${args.join(' ')}`);

      const child = spawn('npx', args, {
        cwd: options.rootPath,
        env: { ...process.env, NODE_ENV: 'production' },
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        const message = data.toString();
        output += message;
        options.onProgress?.(message);
      });

      child.stderr.on('data', (data) => {
        const message = data.toString();
        errorOutput += message;
        options.onError?.(message);
      });

      child.on('close', (code) => {
        if (code === 0) {
          // Parse the output to extract analysis results
          try {
            // The CLI outputs JSON results, try to parse them
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              resolve(result);
            } else {
              resolve({ output, success: true });
            }
          } catch (error) {
            resolve({ output, success: true });
          }
        } else {
          reject(new Error(`CLI process exited with code ${code}: ${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runMigration(options: CLIRunnerOptions): Promise<{ filesModified: number; filesSkipped: number; errors: string[] }> {
    return new Promise((resolve, reject) => {
      const cliPath = path.join(__dirname, '../../../../src/cli/index.ts');
      const args = [
        'tsx',
        cliPath,
        'migrate',
        '--root', options.rootPath,
      ];

      if (options.blacklist && options.blacklist.length > 0) {
        args.push('--blacklist', options.blacklist.join(','));
      }

      if (options.dryRun) {
        args.push('--dryRun');
      }

      if (options.changeCode) {
        args.push('--changeCode');
      }

      // Skip backup for API operations
      args.push('--skipBackup');

      this.logger.debug(`Running CLI command: ${args.join(' ')}`);

      const child = spawn('npx', args, {
        cwd: options.rootPath,
        env: { ...process.env, NODE_ENV: 'production' },
      });

      let filesModified = 0;
      let filesSkipped = 0;
      const errors: string[] = [];

      child.stdout.on('data', (data) => {
        const message = data.toString();
        
        // Parse progress messages
        if (message.includes('Modified:')) {
          filesModified++;
          options.onProgress?.(message.trim());
        } else if (message.includes('Skipped:')) {
          filesSkipped++;
          options.onProgress?.(message.trim());
        } else if (message.includes('Error:')) {
          errors.push(message.trim());
          options.onError?.(message.trim());
        } else {
          options.onProgress?.(message.trim());
        }
      });

      child.stderr.on('data', (data) => {
        const message = data.toString();
        errors.push(message);
        options.onError?.(message);
      });

      child.on('close', (code) => {
        const stats = { filesModified, filesSkipped, errors };
        
        if (code === 0) {
          options.onComplete?.(stats);
          resolve(stats);
        } else {
          stats.errors.push(`CLI process exited with code ${code}`);
          options.onComplete?.(stats);
          resolve(stats); // Still resolve with stats even on error
        }
      });

      child.on('error', (error) => {
        const stats = { filesModified: 0, filesSkipped: 0, errors: [error.message] };
        options.onComplete?.(stats);
        reject(error);
      });
    });
  }
}
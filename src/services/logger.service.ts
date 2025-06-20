/**
 * Logger service implementation
 */

import chalk from 'chalk';
import { ILoggerService, IConfigurationService } from '../di/types';

export class LoggerService implements ILoggerService {
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor(private configService: IConfigurationService) {
    this.logLevel = this.configService.getLogLevel();
  }

  async initialize(): Promise<void> {
    // Any initialization logic
  }

  async dispose(): Promise<void> {
    // Cleanup if needed
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(chalk.blue('ℹ'), message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(chalk.yellow('⚠'), message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red('✖'), message, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(chalk.gray('🐛'), message, ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green('✓'), message, ...args);
    }
  }

  // Additional logging methods for jsx-migr8 specific use cases
  migration(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.cyan('🔄'), message, ...args);
    }
  }

  analysis(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.magenta('🔍'), message, ...args);
    }
  }

  backup(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.blue('📦'), message, ...args);
    }
  }

  performance(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray('⚡'), message, ...args);
    }
  }

  // Progress logging
  progress(current: number, total: number, message?: string): void {
    if (this.shouldLog('info')) {
      const percentage = Math.round((current / total) * 100);
      const progressBar = this.createProgressBar(percentage);
      const progressMessage = message ? ` - ${message}` : '';
      console.log(chalk.cyan(`${progressBar} ${percentage}% (${current}/${total})${progressMessage}`));
    }
  }

  // Table logging for structured data
  table(data: Array<Record<string, any>>, options?: { headers?: string[]; maxWidth?: number }): void {
    if (!this.shouldLog('info') || data.length === 0) {
      return;
    }

    const headers = options?.headers || Object.keys(data[0]);
    const maxWidth = options?.maxWidth || 100;

    // Calculate column widths
    const columnWidths = headers.map(header => {
      const maxContentWidth = Math.max(
        header.length,
        ...data.map(row => String(row[header] || '').length)
      );
      return Math.min(maxContentWidth, Math.floor(maxWidth / headers.length));
    });

    // Print header
    const headerRow = headers.map((header, i) => 
      header.padEnd(columnWidths[i]).substring(0, columnWidths[i])
    ).join(' | ');
    console.log(chalk.bold(headerRow));
    console.log(headers.map((_, i) => '-'.repeat(columnWidths[i])).join('-|-'));

    // Print rows
    data.forEach(row => {
      const dataRow = headers.map((header, i) => {
        const value = String(row[header] || '');
        return value.padEnd(columnWidths[i]).substring(0, columnWidths[i]);
      }).join(' | ');
      console.log(dataRow);
    });
  }

  // Grouped logging for hierarchical data
  group(label: string, callback: () => void): void {
    if (this.shouldLog('info')) {
      console.group(chalk.bold(label));
      try {
        callback();
      } finally {
        console.groupEnd();
      }
    }
  }

  // Timing utilities
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(label);
    }
  }

  // File operation logging
  fileOperation(operation: string, filePath: string, success: boolean, details?: string): void {
    const icon = success ? '✓' : '✖';
    const color = success ? chalk.green : chalk.red;
    const message = `${operation} ${filePath}`;
    const fullMessage = details ? `${message} (${details})` : message;
    
    if (success && this.shouldLog('debug')) {
      console.log(color(icon), fullMessage);
    } else if (!success && this.shouldLog('error')) {
      console.error(color(icon), fullMessage);
    }
  }

  // Migration-specific logging
  migrationStart(componentName: string, fileCount: number): void {
    this.migration(`Starting migration for ${componentName} (${fileCount} files)`);
  }

  migrationComplete(componentName: string, succeeded: number, failed: number): void {
    if (failed === 0) {
      this.success(`Migration completed for ${componentName} (${succeeded} files)`);
    } else {
      this.warn(`Migration completed for ${componentName} (${succeeded} succeeded, ${failed} failed)`);
    }
  }

  analysisStart(rootPath: string): void {
    this.analysis(`Starting analysis of ${rootPath}`);
  }

  analysisComplete(importCount: number, jsxCount: number, fileCount: number): void {
    this.success(`Analysis completed: ${importCount} imports, ${jsxCount} JSX elements in ${fileCount} files`);
  }

  // Utility methods
  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private createProgressBar(percentage: number, width: number = 20): string {
    const filledWidth = Math.round((percentage / 100) * width);
    const emptyWidth = width - filledWidth;
    
    const filled = '█'.repeat(filledWidth);
    const empty = '░'.repeat(emptyWidth);
    
    return chalk.cyan(`[${filled}${empty}]`);
  }

  // Context-aware logging with metadata
  withContext(context: Record<string, any>) {
    return {
      info: (message: string, ...args: any[]) => {
        this.info(`[${this.formatContext(context)}] ${message}`, ...args);
      },
      warn: (message: string, ...args: any[]) => {
        this.warn(`[${this.formatContext(context)}] ${message}`, ...args);
      },
      error: (message: string, ...args: any[]) => {
        this.error(`[${this.formatContext(context)}] ${message}`, ...args);
      },
      debug: (message: string, ...args: any[]) => {
        this.debug(`[${this.formatContext(context)}] ${message}`, ...args);
      },
      success: (message: string, ...args: any[]) => {
        this.success(`[${this.formatContext(context)}] ${message}`, ...args);
      },
    };
  }

  private formatContext(context: Record<string, any>): string {
    return Object.entries(context)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
  }

  // Conditional logging based on environment
  devOnly(callback: () => void): void {
    if (this.configService.isDevelopment()) {
      callback();
    }
  }

  prodOnly(callback: () => void): void {
    if (this.configService.isProduction()) {
      callback();
    }
  }

  // JSON logging for structured output
  json(data: any, label?: string): void {
    if (this.shouldLog('debug')) {
      const jsonString = JSON.stringify(data, null, 2);
      if (label) {
        console.log(chalk.gray(`${label}:`));
      }
      console.log(chalk.gray(jsonString));
    }
  }

  // Memory usage logging
  memory(): void {
    if (this.shouldLog('debug')) {
      const usage = process.memoryUsage();
      const formatBytes = (bytes: number) => {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
      };

      this.debug('Memory usage:', {
        rss: formatBytes(usage.rss),
        heapTotal: formatBytes(usage.heapTotal),
        heapUsed: formatBytes(usage.heapUsed),
        external: formatBytes(usage.external),
      });
    }
  }
}
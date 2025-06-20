/**
 * Configuration service implementation
 */

import path from 'node:path';
import { IConfigurationService } from '../di/types';
import { argv } from '../cli/config';

export class ConfigurationService implements IConfigurationService {
  private _rootPath: string;
  private _blacklist: string[];
  private _packages: string[];

  constructor() {
    // Initialize configuration from environment and CLI args
    this._rootPath = this.calculateRootPath();
    this._blacklist = this.parseBlacklist();
    this._packages = [];
  }

  async initialize(): Promise<void> {
    // Any async initialization logic can go here
    // For now, all initialization is synchronous
  }

  async dispose(): Promise<void> {
    // Cleanup if needed
  }

  getRootPath(): string {
    return this._rootPath;
  }

  getBlacklist(): string[] {
    return [...this._blacklist]; // Return copy to prevent mutation
  }

  getPackages(): string[] {
    return [...this._packages]; // Return copy to prevent mutation
  }

  setPackages(packages: string[]): void {
    this._packages = [...packages];
  }

  getRunArgs(): typeof argv {
    return argv;
  }

  getMigr8RulesDir(): string {
    return './migr8Rules';
  }

  getQueueDir(): string {
    return './queue';
  }

  getBackupDir(): string {
    return path.join(this._rootPath, '.migr8-backups');
  }

  isDebugMode(): boolean {
    return Boolean(argv.debug);
  }

  isQuietMode(): boolean {
    return Boolean(argv.quiet);
  }

  isDryRunMode(): boolean {
    return Boolean(argv.dryRun);
  }

  isYoloMode(): boolean {
    return Boolean(argv.yolo);
  }

  shouldSkipBackup(): boolean {
    return Boolean(argv.skipBackup);
  }

  getConcurrency(): number {
    return argv.concurrency || this.getDefaultConcurrency();
  }

  getBatchSize(): number {
    return argv.batchSize || 100;
  }

  getMemoryLimitMB(): number {
    return argv.memoryLimitMB || 512;
  }

  private calculateRootPath(): string {
    return path.resolve(argv.root || process.cwd());
  }

  private parseBlacklist(): string[] {
    const blacklistStr = (argv.blacklist as string) ?? '';
    return blacklistStr.split(',').filter(item => item.trim().length > 0);
  }

  private getDefaultConcurrency(): number {
    // Calculate reasonable default based on CPU cores
    const cpuCores = require('os').cpus().length;
    return Math.max(2, Math.min(cpuCores * 2, 8));
  }

  // Environment-specific getters
  getEnvironment(): 'development' | 'production' | 'test' {
    const env = process.env.NODE_ENV || 'development';
    return env as 'development' | 'production' | 'test';
  }

  isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  isProduction(): boolean {
    return this.getEnvironment() === 'production';
  }

  isTest(): boolean {
    return this.getEnvironment() === 'test';
  }

  // File pattern configurations
  getIncludePatterns(): string[] {
    return ['**/*.{js,jsx,ts,tsx}'];
  }

  getIgnorePatterns(): string[] {
    return this._blacklist.map(item => `**/${item}/**`);
  }

  // Logging configuration
  getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
    if (this.isDebugMode()) return 'debug';
    if (this.isQuietMode()) return 'error';
    return 'info';
  }

  // Backup configuration
  getBackupConfig() {
    return {
      gitIntegration: true,
      autoCleanup: true,
      verifyAfterBackup: true,
      showProgress: !this.isQuietMode(),
      retentionDays: 30,
      maxBackups: 50,
    };
  }

  // Migration configuration
  getMigrationConfig() {
    return {
      createBackup: !this.shouldSkipBackup(),
      dryRun: this.isDryRunMode(),
      yolo: this.isYoloMode(),
      showDiffs: true,
      preserveFormatting: true,
    };
  }

  // Performance configuration
  getPerformanceConfig() {
    return {
      concurrency: this.getConcurrency(),
      batchSize: this.getBatchSize(),
      memoryLimitMB: this.getMemoryLimitMB(),
      enableGC: true,
      gcInterval: 1000, // Force GC every 1000 operations
    };
  }

  // Validation
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate root path
    if (!this._rootPath) {
      errors.push('Root path is required');
    }

    // Validate concurrency
    const concurrency = this.getConcurrency();
    if (concurrency < 1 || concurrency > 32) {
      errors.push('Concurrency must be between 1 and 32');
    }

    // Validate batch size
    const batchSize = this.getBatchSize();
    if (batchSize < 1 || batchSize > 1000) {
      errors.push('Batch size must be between 1 and 1000');
    }

    // Validate memory limit
    const memoryLimit = this.getMemoryLimitMB();
    if (memoryLimit < 64 || memoryLimit > 8192) {
      errors.push('Memory limit must be between 64MB and 8GB');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Debug information
  getDebugInfo(): Record<string, any> {
    return {
      rootPath: this._rootPath,
      blacklist: this._blacklist,
      packages: this._packages,
      environment: this.getEnvironment(),
      runArgs: argv,
      performance: this.getPerformanceConfig(),
      backup: this.getBackupConfig(),
      migration: this.getMigrationConfig(),
    };
  }
}
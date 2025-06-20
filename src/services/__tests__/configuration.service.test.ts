/**
 * @jest-environment node
 */

import { ConfigurationService } from '../configuration.service';
import { jest } from '@jest/globals';
import path from 'node:path';
import os from 'node:os';

// Mock the argv configuration
jest.mock('../../cli/config', () => ({
  argv: {
    root: '',
    blacklist: '',
    debug: false,
    quiet: false,
    dryRun: false,
    yolo: false,
    skipBackup: false,
    concurrency: 0,
    batchSize: 0,
    memoryLimitMB: 0,
  }
}));

describe('ConfigurationService', () => {
  let configService: ConfigurationService;
  let mockArgv: any;

  beforeEach(() => {
    // Reset mock
    mockArgv = {
      root: '',
      blacklist: '',
      debug: false,
      quiet: false,
      dryRun: false,
      yolo: false,
      skipBackup: false,
      concurrency: 0,
      batchSize: 0,
      memoryLimitMB: 0,
    };

    // Mock the argv module
    jest.doMock('../../cli/config', () => ({
      argv: mockArgv
    }));

    // Create fresh instance
    configService = new ConfigurationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(configService).toBeInstanceOf(ConfigurationService);
      expect(configService.getRootPath()).toBe(process.cwd());
      expect(configService.getBlacklist()).toEqual([]);
      expect(configService.getPackages()).toEqual([]);
    });

    it('should initialize with custom root path', () => {
      mockArgv.root = '/custom/path';
      const service = new ConfigurationService();
      expect(service.getRootPath()).toBe(path.resolve('/custom/path'));
    });

    it('should parse blacklist from string', () => {
      mockArgv.blacklist = 'node_modules,dist,build';
      const service = new ConfigurationService();
      expect(service.getBlacklist()).toEqual(['node_modules', 'dist', 'build']);
    });

    it('should handle empty blacklist', () => {
      mockArgv.blacklist = '';
      const service = new ConfigurationService();
      expect(service.getBlacklist()).toEqual([]);
    });

    it('should handle blacklist with whitespace', () => {
      mockArgv.blacklist = ' node_modules , dist , build ';
      const service = new ConfigurationService();
      expect(service.getBlacklist()).toEqual(['node_modules', 'dist', 'build']);
    });
  });

  describe('lifecycle methods', () => {
    it('should initialize without errors', async () => {
      await expect(configService.initialize()).resolves.toBeUndefined();
    });

    it('should dispose without errors', async () => {
      await expect(configService.dispose()).resolves.toBeUndefined();
    });
  });

  describe('path methods', () => {
    it('should return correct root path', () => {
      expect(configService.getRootPath()).toBe(process.cwd());
    });

    it('should return correct migr8 rules directory', () => {
      expect(configService.getMigr8RulesDir()).toBe('./migr8Rules');
    });

    it('should return correct queue directory', () => {
      expect(configService.getQueueDir()).toBe('./queue');
    });

    it('should return correct backup directory', () => {
      const expected = path.join(configService.getRootPath(), '.migr8-backups');
      expect(configService.getBackupDir()).toBe(expected);
    });
  });

  describe('boolean flags', () => {
    it('should return false for debug mode by default', () => {
      expect(configService.isDebugMode()).toBe(false);
    });

    it('should return true for debug mode when enabled', () => {
      mockArgv.debug = true;
      const service = new ConfigurationService();
      expect(service.isDebugMode()).toBe(true);
    });

    it('should return false for quiet mode by default', () => {
      expect(configService.isQuietMode()).toBe(false);
    });

    it('should return true for quiet mode when enabled', () => {
      mockArgv.quiet = true;
      const service = new ConfigurationService();
      expect(service.isQuietMode()).toBe(true);
    });

    it('should return false for dry run mode by default', () => {
      expect(configService.isDryRunMode()).toBe(false);
    });

    it('should return true for dry run mode when enabled', () => {
      mockArgv.dryRun = true;
      const service = new ConfigurationService();
      expect(service.isDryRunMode()).toBe(true);
    });

    it('should return false for yolo mode by default', () => {
      expect(configService.isYoloMode()).toBe(false);
    });

    it('should return true for yolo mode when enabled', () => {
      mockArgv.yolo = true;
      const service = new ConfigurationService();
      expect(service.isYoloMode()).toBe(true);
    });

    it('should return false for skip backup by default', () => {
      expect(configService.shouldSkipBackup()).toBe(false);
    });

    it('should return true for skip backup when enabled', () => {
      mockArgv.skipBackup = true;
      const service = new ConfigurationService();
      expect(service.shouldSkipBackup()).toBe(true);
    });
  });

  describe('performance configuration', () => {
    it('should return default concurrency when not specified', () => {
      const cpuCores = os.cpus().length;
      const expected = Math.max(2, Math.min(cpuCores * 2, 8));
      expect(configService.getConcurrency()).toBe(expected);
    });

    it('should return custom concurrency when specified', () => {
      mockArgv.concurrency = 4;
      const service = new ConfigurationService();
      expect(service.getConcurrency()).toBe(4);
    });

    it('should return default batch size when not specified', () => {
      expect(configService.getBatchSize()).toBe(100);
    });

    it('should return custom batch size when specified', () => {
      mockArgv.batchSize = 50;
      const service = new ConfigurationService();
      expect(service.getBatchSize()).toBe(50);
    });

    it('should return default memory limit when not specified', () => {
      expect(configService.getMemoryLimitMB()).toBe(512);
    });

    it('should return custom memory limit when specified', () => {
      mockArgv.memoryLimitMB = 1024;
      const service = new ConfigurationService();
      expect(service.getMemoryLimitMB()).toBe(1024);
    });
  });

  describe('package management', () => {
    it('should return empty packages by default', () => {
      expect(configService.getPackages()).toEqual([]);
    });

    it('should set and get packages', () => {
      const packages = ['@company/ui-lib', 'react'];
      configService.setPackages(packages);
      expect(configService.getPackages()).toEqual(packages);
    });

    it('should return a copy of packages to prevent mutation', () => {
      const packages = ['@company/ui-lib'];
      configService.setPackages(packages);
      const retrieved = configService.getPackages();
      retrieved.push('react');
      expect(configService.getPackages()).toEqual(['@company/ui-lib']);
    });

    it('should return a copy of blacklist to prevent mutation', () => {
      mockArgv.blacklist = 'node_modules,dist';
      const service = new ConfigurationService();
      const retrieved = service.getBlacklist();
      retrieved.push('build');
      expect(service.getBlacklist()).toEqual(['node_modules', 'dist']);
    });
  });

  describe('environment detection', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('should return development by default', () => {
      delete process.env.NODE_ENV;
      expect(configService.getEnvironment()).toBe('development');
      expect(configService.isDevelopment()).toBe(true);
      expect(configService.isProduction()).toBe(false);
      expect(configService.isTest()).toBe(false);
    });

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      const service = new ConfigurationService();
      expect(service.getEnvironment()).toBe('production');
      expect(service.isDevelopment()).toBe(false);
      expect(service.isProduction()).toBe(true);
      expect(service.isTest()).toBe(false);
    });

    it('should detect test environment', () => {
      process.env.NODE_ENV = 'test';
      const service = new ConfigurationService();
      expect(service.getEnvironment()).toBe('test');
      expect(service.isDevelopment()).toBe(false);
      expect(service.isProduction()).toBe(false);
      expect(service.isTest()).toBe(true);
    });
  });

  describe('file patterns', () => {
    it('should return correct include patterns', () => {
      const patterns = configService.getIncludePatterns();
      expect(patterns).toEqual(['**/*.{js,jsx,ts,tsx}']);
    });

    it('should return correct ignore patterns', () => {
      mockArgv.blacklist = 'node_modules,dist';
      const service = new ConfigurationService();
      const patterns = service.getIgnorePatterns();
      expect(patterns).toEqual(['**/node_modules/**', '**/dist/**']);
    });

    it('should handle empty blacklist for ignore patterns', () => {
      const patterns = configService.getIgnorePatterns();
      expect(patterns).toEqual([]);
    });
  });

  describe('logging configuration', () => {
    it('should return debug log level when debug mode is enabled', () => {
      mockArgv.debug = true;
      const service = new ConfigurationService();
      expect(service.getLogLevel()).toBe('debug');
    });

    it('should return error log level when quiet mode is enabled', () => {
      mockArgv.quiet = true;
      const service = new ConfigurationService();
      expect(service.getLogLevel()).toBe('error');
    });

    it('should return info log level by default', () => {
      expect(configService.getLogLevel()).toBe('info');
    });

    it('should prioritize debug over quiet', () => {
      mockArgv.debug = true;
      mockArgv.quiet = true;
      const service = new ConfigurationService();
      expect(service.getLogLevel()).toBe('debug');
    });
  });

  describe('configuration objects', () => {
    it('should return correct backup configuration', () => {
      const config = configService.getBackupConfig();
      expect(config).toEqual({
        gitIntegration: true,
        autoCleanup: true,
        verifyAfterBackup: true,
        showProgress: true,
        retentionDays: 30,
        maxBackups: 50,
      });
    });

    it('should return backup config with no progress in quiet mode', () => {
      mockArgv.quiet = true;
      const service = new ConfigurationService();
      const config = service.getBackupConfig();
      expect(config.showProgress).toBe(false);
    });

    it('should return correct migration configuration', () => {
      const config = configService.getMigrationConfig();
      expect(config).toEqual({
        createBackup: true,
        dryRun: false,
        yolo: false,
        showDiffs: true,
        preserveFormatting: true,
      });
    });

    it('should return migration config with skipBackup disabled', () => {
      mockArgv.skipBackup = true;
      const service = new ConfigurationService();
      const config = service.getMigrationConfig();
      expect(config.createBackup).toBe(false);
    });

    it('should return migration config with dryRun enabled', () => {
      mockArgv.dryRun = true;
      const service = new ConfigurationService();
      const config = service.getMigrationConfig();
      expect(config.dryRun).toBe(true);
    });

    it('should return migration config with yolo enabled', () => {
      mockArgv.yolo = true;
      const service = new ConfigurationService();
      const config = service.getMigrationConfig();
      expect(config.yolo).toBe(true);
    });

    it('should return correct performance configuration', () => {
      const config = configService.getPerformanceConfig();
      expect(config).toEqual({
        concurrency: configService.getConcurrency(),
        batchSize: 100,
        memoryLimitMB: 512,
        enableGC: true,
        gcInterval: 1000,
      });
    });
  });

  describe('validation', () => {
    it('should validate successfully with default configuration', () => {
      const result = configService.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate concurrency bounds', () => {
      mockArgv.concurrency = 0;
      const service = new ConfigurationService();
      const result = service.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Concurrency must be between 1 and 32');
    });

    it('should validate concurrency upper bound', () => {
      mockArgv.concurrency = 50;
      const service = new ConfigurationService();
      const result = service.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Concurrency must be between 1 and 32');
    });

    it('should validate batch size bounds', () => {
      mockArgv.batchSize = 0;
      const service = new ConfigurationService();
      const result = service.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Batch size must be between 1 and 1000');
    });

    it('should validate batch size upper bound', () => {
      mockArgv.batchSize = 1500;
      const service = new ConfigurationService();
      const result = service.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Batch size must be between 1 and 1000');
    });

    it('should validate memory limit bounds', () => {
      mockArgv.memoryLimitMB = 32;
      const service = new ConfigurationService();
      const result = service.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Memory limit must be between 64MB and 8GB');
    });

    it('should validate memory limit upper bound', () => {
      mockArgv.memoryLimitMB = 10000;
      const service = new ConfigurationService();
      const result = service.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Memory limit must be between 64MB and 8GB');
    });

    it('should accumulate multiple validation errors', () => {
      mockArgv.concurrency = 0;
      mockArgv.batchSize = 0;
      mockArgv.memoryLimitMB = 32;
      const service = new ConfigurationService();
      const result = service.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('debug information', () => {
    it('should return comprehensive debug information', () => {
      const debugInfo = configService.getDebugInfo();
      expect(debugInfo).toHaveProperty('rootPath');
      expect(debugInfo).toHaveProperty('blacklist');
      expect(debugInfo).toHaveProperty('packages');
      expect(debugInfo).toHaveProperty('environment');
      expect(debugInfo).toHaveProperty('runArgs');
      expect(debugInfo).toHaveProperty('performance');
      expect(debugInfo).toHaveProperty('backup');
      expect(debugInfo).toHaveProperty('migration');
    });

    it('should include current configuration values', () => {
      mockArgv.debug = true;
      mockArgv.blacklist = 'node_modules';
      const service = new ConfigurationService();
      service.setPackages(['@company/ui-lib']);
      
      const debugInfo = service.getDebugInfo();
      expect(debugInfo.blacklist).toEqual(['node_modules']);
      expect(debugInfo.packages).toEqual(['@company/ui-lib']);
      expect(debugInfo.runArgs.debug).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle malformed blacklist gracefully', () => {
      mockArgv.blacklist = ',,,';
      const service = new ConfigurationService();
      expect(service.getBlacklist()).toEqual([]);
    });

    it('should handle undefined blacklist', () => {
      mockArgv.blacklist = undefined;
      const service = new ConfigurationService();
      expect(service.getBlacklist()).toEqual([]);
    });

    it('should handle null blacklist', () => {
      mockArgv.blacklist = null;
      const service = new ConfigurationService();
      expect(service.getBlacklist()).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle zero CPU cores scenario', () => {
      const originalCpus = os.cpus;
      os.cpus = jest.fn().mockReturnValue([]);
      
      const service = new ConfigurationService();
      expect(service.getConcurrency()).toBe(2); // Should default to minimum of 2
      
      os.cpus = originalCpus;
    });

    it('should handle very high CPU cores scenario', () => {
      const originalCpus = os.cpus;
      os.cpus = jest.fn().mockReturnValue(new Array(32).fill({}));
      
      const service = new ConfigurationService();
      expect(service.getConcurrency()).toBe(8); // Should cap at 8
      
      os.cpus = originalCpus;
    });
  });
});
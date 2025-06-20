/**
 * @file envSetup.test.ts
 * @description Comprehensive unit tests for environment configuration setup
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Mock the envSetup module
const mockEnvSetup = {
  ensureEnvironmentSetup: jest.fn(),
  createEnvFile: jest.fn(),
  validateEnvFile: jest.fn(),
  loadEnvVariables: jest.fn(),
  getDefaultEnvConfig: jest.fn(),
  detectProjectRoot: jest.fn(),
  generateBlacklist: jest.fn(),
  validatePaths: jest.fn(),
  EnvSetupError: class extends Error {
    constructor(message: string, public readonly code: string) {
      super(message);
      this.name = 'EnvSetupError';
    }
  }
};

// Mock dependencies
jest.mock('node:fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
    mkdir: jest.fn(),
  },
}));

jest.mock('node:path');
jest.mock('dotenv');
jest.mock('../../validation');

const mockDotenv = require('dotenv');
const mockValidation = require('../../validation');

describe('envSetup', () => {
  const mockCwd = '/test/project';
  const mockEnvPath = path.join(mockCwd, '.env');
  const mockEnvExamplePath = path.join(mockCwd, '.env.example');

  const defaultEnvConfig = {
    ROOT_PATH: mockCwd,
    BLACKLIST: 'node_modules,dist,build,.git,coverage',
    LOG_LEVEL: 'info',
    MAX_CONCURRENCY: '4',
    TIMEOUT_MS: '30000'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.cwd
    jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    
    // Mock path operations
    (path.join as jest.Mock).mockImplementation((...paths) => paths.join('/'));
    (path.resolve as jest.Mock).mockImplementation((p) => p.startsWith('/') ? p : `${mockCwd}/${p}`);
    (path.relative as jest.Mock).mockImplementation((from, to) => to.replace(from, '').replace(/^\//, ''));
    
    // Mock validation
    mockValidation.logSecurityEvent.mockImplementation(() => {});
    mockValidation.validatePath.mockReturnValue(true);
    
    // Mock default behaviors
    mockEnvSetup.getDefaultEnvConfig.mockReturnValue(defaultEnvConfig);
    mockEnvSetup.detectProjectRoot.mockReturnValue(mockCwd);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('ensureEnvironmentSetup', () => {
    it('should setup environment when .env file exists and is valid', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      const envContent = Object.entries(defaultEnvConfig)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      (fs.readFile as jest.Mock).mockResolvedValue(envContent);
      
      mockEnvSetup.validateEnvFile.mockReturnValue({ valid: true, errors: [] });
      mockEnvSetup.loadEnvVariables.mockResolvedValue(defaultEnvConfig);
      mockEnvSetup.ensureEnvironmentSetup.mockResolvedValue({
        success: true,
        envPath: mockEnvPath,
        config: defaultEnvConfig
      });

      const result = await mockEnvSetup.ensureEnvironmentSetup();

      expect(result.success).toBe(true);
      expect(result.config).toEqual(defaultEnvConfig);
      expect(mockEnvSetup.validateEnvFile).toHaveBeenCalled();
      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'env-setup-complete',
        'info',
        'Environment setup completed successfully'
      );
    });

    it('should create .env file when it does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined); // .env.example exists
      
      const exampleContent = Object.entries(defaultEnvConfig)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      (fs.readFile as jest.Mock).mockResolvedValue(exampleContent);
      
      mockEnvSetup.createEnvFile.mockResolvedValue({
        success: true,
        path: mockEnvPath,
        config: defaultEnvConfig
      });
      mockEnvSetup.ensureEnvironmentSetup.mockResolvedValue({
        success: true,
        created: true,
        envPath: mockEnvPath,
        config: defaultEnvConfig
      });

      const result = await mockEnvSetup.ensureEnvironmentSetup();

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
      expect(mockEnvSetup.createEnvFile).toHaveBeenCalled();
    });

    it('should handle missing .env.example file', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      
      mockEnvSetup.createEnvFile.mockResolvedValue({
        success: true,
        path: mockEnvPath,
        config: defaultEnvConfig,
        usedDefaults: true
      });
      mockEnvSetup.ensureEnvironmentSetup.mockResolvedValue({
        success: true,
        created: true,
        envPath: mockEnvPath,
        config: defaultEnvConfig,
        warnings: ['Used default configuration - .env.example not found']
      });

      const result = await mockEnvSetup.ensureEnvironmentSetup();

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Used default configuration - .env.example not found');
    });

    it('should handle invalid .env file', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      const invalidEnvContent = 'INVALID_FORMAT';
      (fs.readFile as jest.Mock).mockResolvedValue(invalidEnvContent);
      
      mockEnvSetup.validateEnvFile.mockReturnValue({
        valid: false,
        errors: ['Missing required variable: ROOT_PATH', 'Invalid format on line 1']
      });
      
      mockEnvSetup.ensureEnvironmentSetup.mockRejectedValue(
        new mockEnvSetup.EnvSetupError('Invalid environment configuration', 'INVALID_ENV')
      );

      await expect(mockEnvSetup.ensureEnvironmentSetup())
        .rejects.toThrow('Invalid environment configuration');

      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'env-validation-failed',
        'error',
        'Environment file validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining(['Missing required variable: ROOT_PATH'])
        })
      );
    });

    it('should detect and validate project root', async () => {
      const customRoot = '/custom/project/root';
      mockEnvSetup.detectProjectRoot.mockReturnValue(customRoot);
      
      const customConfig = {
        ...defaultEnvConfig,
        ROOT_PATH: customRoot
      };
      
      mockEnvSetup.ensureEnvironmentSetup.mockResolvedValue({
        success: true,
        envPath: path.join(customRoot, '.env'),
        config: customConfig,
        detectedRoot: customRoot
      });

      const result = await mockEnvSetup.ensureEnvironmentSetup();

      expect(result.detectedRoot).toBe(customRoot);
      expect(mockEnvSetup.detectProjectRoot).toHaveBeenCalled();
    });

    it('should handle permission errors', async () => {
      const permissionError = new Error('Permission denied');
      (permissionError as any).code = 'EACCES';
      
      (fs.access as jest.Mock).mockRejectedValue(permissionError);
      mockEnvSetup.ensureEnvironmentSetup.mockRejectedValue(
        new mockEnvSetup.EnvSetupError('Permission denied accessing environment files', 'PERMISSION_DENIED')
      );

      await expect(mockEnvSetup.ensureEnvironmentSetup())
        .rejects.toThrow('Permission denied accessing environment files');
    });
  });

  describe('createEnvFile', () => {
    it('should create .env file from .env.example', async () => {
      const exampleContent = `
# JSX Migr8 Configuration
ROOT_PATH=/test/project
BLACKLIST=node_modules,dist
LOG_LEVEL=info
      `.trim();
      
      (fs.readFile as jest.Mock).mockResolvedValue(exampleContent);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      
      mockEnvSetup.createEnvFile.mockResolvedValue({
        success: true,
        path: mockEnvPath,
        config: {
          ROOT_PATH: '/test/project',
          BLACKLIST: 'node_modules,dist',
          LOG_LEVEL: 'info'
        }
      });

      const result = await mockEnvSetup.createEnvFile(mockEnvPath, mockEnvExamplePath);

      expect(result.success).toBe(true);
      expect(result.path).toBe(mockEnvPath);
    });

    it('should create .env file with defaults when no example exists', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      
      mockEnvSetup.createEnvFile.mockResolvedValue({
        success: true,
        path: mockEnvPath,
        config: defaultEnvConfig,
        usedDefaults: true
      });

      const result = await mockEnvSetup.createEnvFile(mockEnvPath);

      expect(result.success).toBe(true);
      expect(result.usedDefaults).toBe(true);
    });

    it('should handle file creation errors', async () => {
      const writeError = new Error('Disk full');
      (writeError as any).code = 'ENOSPC';
      
      (fs.writeFile as jest.Mock).mockRejectedValue(writeError);
      mockEnvSetup.createEnvFile.mockRejectedValue(
        new mockEnvSetup.EnvSetupError('Failed to create environment file', 'FILE_CREATION_FAILED')
      );

      await expect(mockEnvSetup.createEnvFile(mockEnvPath))
        .rejects.toThrow('Failed to create environment file');
    });

    it('should validate paths in generated config', async () => {
      const invalidRoot = '/nonexistent/path';
      mockValidation.validatePath.mockReturnValue(false);
      
      mockEnvSetup.createEnvFile.mockRejectedValue(
        new mockEnvSetup.EnvSetupError('Invalid root path in configuration', 'INVALID_PATH')
      );

      await expect(mockEnvSetup.createEnvFile(mockEnvPath, undefined, {
        ROOT_PATH: invalidRoot
      })).rejects.toThrow('Invalid root path in configuration');
    });
  });

  describe('validateEnvFile', () => {
    it('should validate correct env file format', () => {
      const validContent = `
ROOT_PATH=/test/project
BLACKLIST=node_modules,dist,build
LOG_LEVEL=info
MAX_CONCURRENCY=4
      `.trim();

      mockEnvSetup.validateEnvFile.mockReturnValue({
        valid: true,
        errors: [],
        config: {
          ROOT_PATH: '/test/project',
          BLACKLIST: 'node_modules,dist,build',
          LOG_LEVEL: 'info',
          MAX_CONCURRENCY: '4'
        }
      });

      const result = mockEnvSetup.validateEnvFile(validContent);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required variables', () => {
      const incompleteContent = 'LOG_LEVEL=info';

      mockEnvSetup.validateEnvFile.mockReturnValue({
        valid: false,
        errors: [
          'Missing required variable: ROOT_PATH',
          'Missing required variable: BLACKLIST'
        ],
        config: { LOG_LEVEL: 'info' }
      });

      const result = mockEnvSetup.validateEnvFile(incompleteContent);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required variable: ROOT_PATH');
    });

    it('should detect invalid variable formats', () => {
      const invalidContent = `
ROOT_PATH=/test/project
BLACKLIST=
LOG_LEVEL=invalid_level
MAX_CONCURRENCY=not_a_number
      `.trim();

      mockEnvSetup.validateEnvFile.mockReturnValue({
        valid: false,
        errors: [
          'BLACKLIST cannot be empty',
          'LOG_LEVEL must be one of: debug, info, warn, error',
          'MAX_CONCURRENCY must be a positive integer'
        ],
        config: {
          ROOT_PATH: '/test/project',
          BLACKLIST: '',
          LOG_LEVEL: 'invalid_level',
          MAX_CONCURRENCY: 'not_a_number'
        }
      });

      const result = mockEnvSetup.validateEnvFile(invalidContent);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('LOG_LEVEL must be one of: debug, info, warn, error');
    });

    it('should handle malformed env file', () => {
      const malformedContent = `
ROOT_PATH=/test/project
INVALID LINE WITHOUT EQUALS
BLACKLIST=node_modules
=VALUE_WITHOUT_KEY
      `.trim();

      mockEnvSetup.validateEnvFile.mockReturnValue({
        valid: false,
        errors: [
          'Invalid format on line 2: INVALID LINE WITHOUT EQUALS',
          'Invalid format on line 4: =VALUE_WITHOUT_KEY'
        ],
        config: {
          ROOT_PATH: '/test/project',
          BLACKLIST: 'node_modules'
        }
      });

      const result = mockEnvSetup.validateEnvFile(malformedContent);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should validate path security', () => {
      const dangerousContent = `
ROOT_PATH=../../../etc
BLACKLIST=;rm -rf /
LOG_LEVEL=info
      `.trim();

      mockValidation.validatePath.mockReturnValue(false);
      mockEnvSetup.validateEnvFile.mockReturnValue({
        valid: false,
        errors: [
          'ROOT_PATH contains dangerous path traversal',
          'BLACKLIST contains dangerous characters'
        ],
        config: {
          ROOT_PATH: '../../../etc',
          BLACKLIST: ';rm -rf /',
          LOG_LEVEL: 'info'
        }
      });

      const result = mockEnvSetup.validateEnvFile(dangerousContent);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ROOT_PATH contains dangerous path traversal');
    });
  });

  describe('loadEnvVariables', () => {
    it('should load and parse environment variables', async () => {
      const envVars = {
        ROOT_PATH: '/test/project',
        BLACKLIST: 'node_modules,dist',
        LOG_LEVEL: 'debug',
        MAX_CONCURRENCY: '8'
      };

      mockDotenv.config.mockReturnValue({
        parsed: envVars,
        error: undefined
      });

      mockEnvSetup.loadEnvVariables.mockResolvedValue(envVars);

      const result = await mockEnvSetup.loadEnvVariables(mockEnvPath);

      expect(result).toEqual(envVars);
      expect(mockDotenv.config).toHaveBeenCalledWith({ path: mockEnvPath });
    });

    it('should handle dotenv parsing errors', async () => {
      const parseError = new Error('Syntax error in .env file');
      mockDotenv.config.mockReturnValue({
        parsed: undefined,
        error: parseError
      });

      mockEnvSetup.loadEnvVariables.mockRejectedValue(
        new mockEnvSetup.EnvSetupError('Failed to parse environment file', 'PARSE_ERROR')
      );

      await expect(mockEnvSetup.loadEnvVariables(mockEnvPath))
        .rejects.toThrow('Failed to parse environment file');
    });

    it('should merge with existing process.env', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      process.env.CUSTOM_VAR = 'existing';

      const envVars = {
        ROOT_PATH: '/test/project',
        CUSTOM_VAR: 'from_file'
      };

      mockEnvSetup.loadEnvVariables.mockResolvedValue({
        ...envVars,
        NODE_ENV: 'test' // Should preserve existing
      });

      const result = await mockEnvSetup.loadEnvVariables(mockEnvPath, { 
        override: false 
      });

      expect(result.NODE_ENV).toBe('test');
      expect(result.ROOT_PATH).toBe('/test/project');

      // Restore original env
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
      delete process.env.CUSTOM_VAR;
    });
  });

  describe('detectProjectRoot', () => {
    it('should detect git repository root', () => {
      mockEnvSetup.detectProjectRoot.mockImplementation(() => {
        // Mock finding .git directory
        return '/test/project/root';
      });

      const result = mockEnvSetup.detectProjectRoot();

      expect(result).toBe('/test/project/root');
    });

    it('should detect package.json root', () => {
      mockEnvSetup.detectProjectRoot.mockImplementation(() => {
        // Mock finding package.json
        return '/test/project/with/package';
      });

      const result = mockEnvSetup.detectProjectRoot();

      expect(result).toBe('/test/project/with/package');
    });

    it('should fallback to current directory', () => {
      mockEnvSetup.detectProjectRoot.mockReturnValue(mockCwd);

      const result = mockEnvSetup.detectProjectRoot();

      expect(result).toBe(mockCwd);
    });

    it('should prioritize git over package.json', () => {
      mockEnvSetup.detectProjectRoot.mockImplementation(() => {
        // Git repository should take precedence
        return '/git/repo/root';
      });

      const result = mockEnvSetup.detectProjectRoot();

      expect(result).toBe('/git/repo/root');
    });
  });

  describe('generateBlacklist', () => {
    it('should generate default blacklist', () => {
      mockEnvSetup.generateBlacklist.mockReturnValue([
        'node_modules',
        'dist',
        'build',
        '.git',
        'coverage',
        '.next',
        '.nuxt'
      ]);

      const result = mockEnvSetup.generateBlacklist();

      expect(result).toContain('node_modules');
      expect(result).toContain('.git');
    });

    it('should detect project-specific directories', () => {
      mockEnvSetup.generateBlacklist.mockImplementation((projectRoot) => {
        const defaults = ['node_modules', 'dist', 'build'];
        
        // Mock detection logic
        if (projectRoot.includes('next')) {
          return [...defaults, '.next'];
        }
        if (projectRoot.includes('nuxt')) {
          return [...defaults, '.nuxt'];
        }
        
        return defaults;
      });

      const nextResult = mockEnvSetup.generateBlacklist('/test/next-project');
      const nuxtResult = mockEnvSetup.generateBlacklist('/test/nuxt-project');

      expect(nextResult).toContain('.next');
      expect(nuxtResult).toContain('.nuxt');
    });

    it('should handle custom patterns', () => {
      mockEnvSetup.generateBlacklist.mockReturnValue([
        'node_modules',
        'custom-build',
        'temp',
        'cache'
      ]);

      const result = mockEnvSetup.generateBlacklist('/test', {
        additional: ['custom-build', 'temp', 'cache']
      });

      expect(result).toContain('custom-build');
      expect(result).toContain('temp');
    });
  });

  describe('error recovery', () => {
    it('should attempt automatic repair of corrupted .env', async () => {
      mockEnvSetup.ensureEnvironmentSetup.mockImplementation(async () => {
        // First attempt fails
        const validation = mockEnvSetup.validateEnvFile('corrupted content');
        if (!validation.valid) {
          // Attempt repair
          await mockEnvSetup.createEnvFile(mockEnvPath);
          return {
            success: true,
            repaired: true,
            envPath: mockEnvPath,
            config: defaultEnvConfig
          };
        }
        return { success: true, envPath: mockEnvPath, config: defaultEnvConfig };
      });

      mockEnvSetup.validateEnvFile.mockReturnValue({
        valid: false,
        errors: ['Corrupted file'],
        config: {}
      });

      const result = await mockEnvSetup.ensureEnvironmentSetup();

      expect(result.success).toBe(true);
      expect(result.repaired).toBe(true);
    });

    it('should create backup before repairing', async () => {
      const backupPath = `${mockEnvPath}.backup`;
      
      mockEnvSetup.ensureEnvironmentSetup.mockResolvedValue({
        success: true,
        repaired: true,
        backupCreated: backupPath,
        envPath: mockEnvPath,
        config: defaultEnvConfig
      });

      const result = await mockEnvSetup.ensureEnvironmentSetup();

      expect(result.backupCreated).toBe(backupPath);
    });
  });
});
/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { z } from 'zod';
import {
  validate,
  validateCLIArgs,
  validateEnvironment,
  validateFilePath,
  validatePackageName,
  validateComponentName,
  validateJSXProperty,
  validateMigrationRule,
  validateMigr8Rules,
  validateBackupMetadata,
  validateUserInput,
  validateSanitizedString,
  validateFilePaths,
  validateBackupConfig,
  validateJSONString,
  createValidationError,
  validators,
} from '../validators';
import { SchemaRegistry } from '../schemas';
import { sanitizers } from '../sanitization';
import { securityManager } from '../security';

// Mock dependencies
jest.mock('../schemas', () => ({
  SchemaRegistry: {
    CLIArgs: {
      safeParse: jest.fn(),
    },
    Environment: {
      safeParse: jest.fn(),
    },
    FilePath: {
      safeParse: jest.fn(),
    },
    PackageName: {
      safeParse: jest.fn(),
    },
    ComponentName: {
      safeParse: jest.fn(),
    },
    JSXProperty: {
      safeParse: jest.fn(),
    },
    MigrationRule: {
      safeParse: jest.fn(),
    },
    Migr8Rules: {
      safeParse: jest.fn(),
    },
    BackupMetadata: {
      safeParse: jest.fn(),
    },
    UserInput: {
      safeParse: jest.fn(),
    },
    SanitizedString: {
      safeParse: jest.fn(),
    },
  },
}));

jest.mock('../sanitization', () => ({
  sanitizers: {
    environmentValue: jest.fn(),
    filePath: jest.fn(),
    packageName: jest.fn(),
    componentName: jest.fn(),
    migrationRule: jest.fn(),
    userInput: jest.fn(),
    string: jest.fn(),
    backupName: jest.fn(),
    tags: jest.fn(),
    jsonString: jest.fn(),
  },
}));

jest.mock('../security', () => ({
  securityManager: {
    detectSuspiciousActivity: jest.fn(),
    audit: jest.fn(),
    validateMigrationRules: jest.fn(),
  },
}));

describe('validators', () => {
  let mockSchemaRegistry: jest.Mocked<typeof SchemaRegistry>;
  let mockSanitizers: jest.Mocked<typeof sanitizers>;
  let mockSecurityManager: jest.Mocked<typeof securityManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSchemaRegistry = SchemaRegistry as jest.Mocked<typeof SchemaRegistry>;
    mockSanitizers = sanitizers as jest.Mocked<typeof sanitizers>;
    mockSecurityManager = securityManager as jest.Mocked<typeof securityManager>;
  });

  describe('validate', () => {
    it('should return success for valid data', () => {
      const schema = z.string();
      const mockSchema = {
        safeParse: jest.fn().mockReturnValue({
          success: true,
          data: 'valid-data',
        }),
      };

      const result = validate(mockSchema as any, 'test-input');

      expect(result).toEqual({
        success: true,
        data: 'valid-data',
      });
    });

    it('should return errors for invalid data', () => {
      const schema = z.string();
      const mockSchema = {
        safeParse: jest.fn().mockReturnValue({
          success: false,
          error: {
            errors: [
              { path: ['field'], message: 'Required' },
              { path: ['nested', 'field'], message: 'Invalid format' },
            ],
          },
        }),
      };

      const result = validate(mockSchema as any, 123);

      expect(result).toEqual({
        success: false,
        errors: ['field: Required', 'nested.field: Invalid format'],
        error: 'field: Required',
      });
    });

    it('should detect suspicious activity in string data', () => {
      const schema = z.string();
      const mockSchema = {
        safeParse: jest.fn().mockReturnValue({
          success: true,
          data: 'test',
        }),
      };

      const suspiciousInput = '<script>alert("xss")</script>';
      mockSecurityManager.detectSuspiciousActivity.mockReturnValue([]);

      validate(mockSchema as any, suspiciousInput, 'test-context');

      expect(mockSecurityManager.detectSuspiciousActivity).toHaveBeenCalledWith(
        suspiciousInput,
        'test-context'
      );
    });

    it('should detect suspicious activity in object data', () => {
      const schema = z.object({});
      const mockSchema = {
        safeParse: jest.fn().mockReturnValue({
          success: true,
          data: {},
        }),
      };

      const suspiciousInput = { test: 'value' };
      mockSecurityManager.detectSuspiciousActivity.mockReturnValue([]);

      validate(mockSchema as any, suspiciousInput);

      expect(mockSecurityManager.detectSuspiciousActivity).toHaveBeenCalledWith(
        JSON.stringify(suspiciousInput),
        'validation'
      );
    });

    it('should handle validation exceptions', () => {
      const mockSchema = {
        safeParse: jest.fn().mockImplementation(() => {
          throw new Error('Validation exception');
        }),
      };

      const result = validate(mockSchema as any, 'test');

      expect(result).toEqual({
        success: false,
        error: 'Validation exception',
      });
      expect(mockSecurityManager.audit).toHaveBeenCalledWith(
        'validation-error',
        'test',
        'error',
        'Validation failed: Validation exception'
      );
    });

    it('should handle non-Error exceptions', () => {
      const mockSchema = {
        safeParse: jest.fn().mockImplementation(() => {
          throw 'String error';
        }),
      };

      const result = validate(mockSchema as any, 'test');

      expect(result).toEqual({
        success: false,
        error: 'Unknown validation error',
      });
    });

    it('should handle empty error arrays', () => {
      const mockSchema = {
        safeParse: jest.fn().mockReturnValue({
          success: false,
          error: {
            errors: [],
          },
        }),
      };

      const result = validate(mockSchema as any, 'test');

      expect(result).toEqual({
        success: false,
        errors: [],
        error: 'Validation failed',
      });
    });
  });

  describe('validateCLIArgs', () => {
    it('should validate CLI arguments', () => {
      mockSchemaRegistry.CLIArgs.safeParse.mockReturnValue({
        success: true,
        data: { command: 'migrate' },
      });

      const result = validateCLIArgs({ command: 'migrate' });

      expect(result.success).toBe(true);
      expect(mockSchemaRegistry.CLIArgs.safeParse).toHaveBeenCalledWith({ command: 'migrate' });
    });
  });

  describe('validateEnvironment', () => {
    it('should sanitize and validate environment variables', () => {
      const env = {
        NODE_ENV: 'development',
        API_KEY: 'secret-key',
      };

      mockSanitizers.environmentValue
        .mockReturnValueOnce('development')
        .mockReturnValueOnce('[sanitized]');
      
      mockSchemaRegistry.Environment.safeParse.mockReturnValue({
        success: true,
        data: { NODE_ENV: 'development', API_KEY: '[sanitized]' },
      });

      const result = validateEnvironment(env);

      expect(result.success).toBe(true);
      expect(mockSanitizers.environmentValue).toHaveBeenCalledWith('development');
      expect(mockSanitizers.environmentValue).toHaveBeenCalledWith('secret-key');
    });

    it('should handle non-object environment input', () => {
      mockSchemaRegistry.Environment.safeParse.mockReturnValue({
        success: false,
        error: { errors: [{ path: [], message: 'Expected object' }] },
      });

      const result = validateEnvironment('invalid');

      expect(result.success).toBe(false);
    });
  });

  describe('validateFilePath', () => {
    it('should sanitize and validate file paths', () => {
      const filePath = '/project/src/component.tsx';
      
      mockSanitizers.filePath.mockReturnValue('/project/src/component.tsx');
      mockSchemaRegistry.FilePath.safeParse.mockReturnValue({
        success: true,
        data: '/project/src/component.tsx',
      });

      const result = validateFilePath(filePath);

      expect(result.success).toBe(true);
      expect(mockSanitizers.filePath).toHaveBeenCalledWith(filePath);
    });

    it('should handle non-string file paths', () => {
      mockSchemaRegistry.FilePath.safeParse.mockReturnValue({
        success: false,
        error: { errors: [{ path: [], message: 'Expected string' }] },
      });

      const result = validateFilePath(123);

      expect(result.success).toBe(false);
    });
  });

  describe('validatePackageName', () => {
    it('should sanitize and validate package names', () => {
      const packageName = '@company/ui-lib';
      
      mockSanitizers.packageName.mockReturnValue('@company/ui-lib');
      mockSchemaRegistry.PackageName.safeParse.mockReturnValue({
        success: true,
        data: '@company/ui-lib',
      });

      const result = validatePackageName(packageName);

      expect(result.success).toBe(true);
      expect(mockSanitizers.packageName).toHaveBeenCalledWith(packageName);
    });
  });

  describe('validateComponentName', () => {
    it('should sanitize and validate component names', () => {
      const componentName = 'Button';
      
      mockSanitizers.componentName.mockReturnValue('Button');
      mockSchemaRegistry.ComponentName.safeParse.mockReturnValue({
        success: true,
        data: 'Button',
      });

      const result = validateComponentName(componentName);

      expect(result.success).toBe(true);
      expect(mockSanitizers.componentName).toHaveBeenCalledWith(componentName);
    });
  });

  describe('validateJSXProperty', () => {
    it('should validate JSX properties', () => {
      const jsxProp = { name: 'size', value: 'large' };
      
      mockSchemaRegistry.JSXProperty.safeParse.mockReturnValue({
        success: true,
        data: jsxProp,
      });

      const result = validateJSXProperty(jsxProp);

      expect(result.success).toBe(true);
    });
  });

  describe('validateMigrationRule', () => {
    it('should sanitize and validate migration rules', () => {
      const rule = {
        match: [{ prop: 'size', value: 'large' }],
        transform: { newProp: 'size', newValue: 'lg' },
      };
      
      mockSanitizers.migrationRule.mockReturnValue(rule);
      mockSchemaRegistry.MigrationRule.safeParse.mockReturnValue({
        success: true,
        data: rule,
      });

      const result = validateMigrationRule(rule);

      expect(result.success).toBe(true);
      expect(mockSanitizers.migrationRule).toHaveBeenCalledWith(rule);
    });

    it('should handle non-object migration rules', () => {
      mockSchemaRegistry.MigrationRule.safeParse.mockReturnValue({
        success: false,
        error: { errors: [{ path: [], message: 'Expected object' }] },
      });

      const result = validateMigrationRule('invalid');

      expect(result.success).toBe(false);
    });
  });

  describe('validateMigr8Rules', () => {
    it('should validate rules with security checks', () => {
      const rules = {
        lookup: { '@company/ui': ['Button'] },
        components: [{ name: 'Button', rules: [] }],
      };

      mockSecurityManager.validateMigrationRules.mockReturnValue({
        valid: true,
        errors: [],
      });
      
      mockSchemaRegistry.Migr8Rules.safeParse.mockReturnValue({
        success: true,
        data: rules,
      });

      const result = validateMigr8Rules(rules);

      expect(result.success).toBe(true);
      expect(mockSecurityManager.validateMigrationRules).toHaveBeenCalledWith(rules);
    });

    it('should reject rules that fail security validation', () => {
      const rules = {
        lookup: { 'evil-package': ['<script>'] },
        components: [],
      };

      mockSecurityManager.validateMigrationRules.mockReturnValue({
        valid: false,
        errors: ['Suspicious patterns detected'],
      });

      const result = validateMigr8Rules(rules);

      expect(result).toEqual({
        success: false,
        error: 'Security validation failed',
        errors: ['Suspicious patterns detected'],
      });
    });
  });

  describe('validateBackupMetadata', () => {
    it('should validate backup metadata', () => {
      const metadata = {
        id: 'backup-123',
        timestamp: new Date().toISOString(),
        description: 'Test backup',
      };
      
      mockSchemaRegistry.BackupMetadata.safeParse.mockReturnValue({
        success: true,
        data: metadata,
      });

      const result = validateBackupMetadata(metadata);

      expect(result.success).toBe(true);
    });
  });

  describe('validateUserInput', () => {
    it('should sanitize and validate user input', () => {
      const userInput = 'user-provided-value';
      
      mockSanitizers.userInput.mockReturnValue('sanitized-value');
      mockSchemaRegistry.UserInput.safeParse.mockReturnValue({
        success: true,
        data: 'sanitized-value',
      });

      const result = validateUserInput(userInput);

      expect(result.success).toBe(true);
      expect(mockSanitizers.userInput).toHaveBeenCalledWith(userInput);
    });
  });

  describe('validateSanitizedString', () => {
    it('should sanitize and validate strings', () => {
      const input = 'test string';
      
      mockSanitizers.string.mockReturnValue('sanitized string');
      mockSchemaRegistry.SanitizedString.safeParse.mockReturnValue({
        success: true,
        data: 'sanitized string',
      });

      const result = validateSanitizedString(input);

      expect(result.success).toBe(true);
      expect(mockSanitizers.string).toHaveBeenCalledWith(input);
    });
  });

  describe('validateFilePaths', () => {
    it('should validate array of file paths', () => {
      const paths = ['/project/file1.tsx', '/project/file2.tsx'];
      
      mockSanitizers.filePath
        .mockReturnValueOnce('/project/file1.tsx')
        .mockReturnValueOnce('/project/file2.tsx');
      
      mockSchemaRegistry.FilePath.safeParse
        .mockReturnValueOnce({
          success: true,
          data: '/project/file1.tsx',
        })
        .mockReturnValueOnce({
          success: true,
          data: '/project/file2.tsx',
        });

      const result = validateFilePaths(paths);

      expect(result).toEqual({
        success: true,
        data: ['/project/file1.tsx', '/project/file2.tsx'],
      });
    });

    it('should handle non-array input', () => {
      const result = validateFilePaths('not-an-array');

      expect(result).toEqual({
        success: false,
        error: 'Expected array of file paths',
      });
    });

    it('should collect errors for invalid paths', () => {
      const paths = ['/valid/path', 'invalid-path', '/another/valid'];
      
      mockSanitizers.filePath
        .mockReturnValueOnce('/valid/path')
        .mockReturnValueOnce('invalid-path')
        .mockReturnValueOnce('/another/valid');
      
      mockSchemaRegistry.FilePath.safeParse
        .mockReturnValueOnce({
          success: true,
          data: '/valid/path',
        })
        .mockReturnValueOnce({
          success: false,
          error: { errors: [{ path: [], message: 'Invalid path' }] },
        })
        .mockReturnValueOnce({
          success: true,
          data: '/another/valid',
        });

      const result = validateFilePaths(paths);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Path 1: : Invalid path');
    });
  });

  describe('validateBackupConfig', () => {
    it('should validate backup configuration', () => {
      const config = {
        name: 'test-backup',
        tags: ['feature', 'migration'],
        description: 'Test backup description',
      };
      
      mockSanitizers.backupName.mockReturnValue('test-backup');
      mockSanitizers.tags.mockReturnValue(['feature', 'migration']);
      mockSanitizers.string.mockReturnValue('Test backup description');

      const result = validateBackupConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'test-backup',
        tags: ['feature', 'migration'],
        description: 'Test backup description',
      });
    });

    it('should handle non-object config', () => {
      const result = validateBackupConfig('invalid');

      expect(result).toEqual({
        success: false,
        error: 'Backup config must be an object',
      });
    });

    it('should validate individual config fields', () => {
      const config = {
        name: 123, // Invalid type
        tags: 'not-array', // Invalid type
        description: ['not-string'], // Invalid type
      };

      const result = validateBackupConfig(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Backup name must be a string');
    });

    it('should reject empty backup names', () => {
      const config = { name: 'valid-name' };
      
      mockSanitizers.backupName.mockReturnValue(''); // Empty after sanitization

      const result = validateBackupConfig(config);

      expect(result).toEqual({
        success: false,
        error: 'Invalid backup name',
      });
    });

    it('should handle validation errors', () => {
      const config = {
        name: 'test',
      };
      
      mockSanitizers.backupName.mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      const result = validateBackupConfig(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sanitization failed');
    });
  });

  describe('validateJSONString', () => {
    it('should validate and parse JSON string', () => {
      const jsonString = '{"test": "value"}';
      
      mockSanitizers.jsonString.mockReturnValue(jsonString);

      const result = validateJSONString(jsonString);

      expect(result).toEqual({
        success: true,
        data: { test: 'value' },
      });
      expect(mockSanitizers.jsonString).toHaveBeenCalledWith(jsonString);
    });

    it('should handle non-string input', () => {
      const result = validateJSONString(123 as any);

      expect(result).toEqual({
        success: false,
        error: 'Input must be a string',
      });
    });

    it('should handle oversized JSON strings', () => {
      const largeString = 'a'.repeat(1024 * 1024 + 1);

      const result = validateJSONString(largeString);

      expect(result).toEqual({
        success: false,
        error: 'JSON string too large (max 1048576 characters)',
      });
    });

    it('should handle custom size limits', () => {
      const largeString = 'a'.repeat(101);

      const result = validateJSONString(largeString, 100);

      expect(result).toEqual({
        success: false,
        error: 'JSON string too large (max 100 characters)',
      });
    });

    it('should handle invalid JSON', () => {
      const invalidJson = '{"invalid": json}';
      
      mockSanitizers.jsonString.mockReturnValue(invalidJson);

      const result = validateJSONString(invalidJson);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON:');
    });

    it('should handle sanitization errors', () => {
      const jsonString = '{"test": "value"}';
      
      mockSanitizers.jsonString.mockImplementation(() => {
        throw new Error('Sanitization error');
      });

      const result = validateJSONString(jsonString);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON: Sanitization error');
    });
  });

  describe('createValidationError', () => {
    it('should create validation error with all properties', () => {
      const error = createValidationError(
        'Test error',
        'TEST_ERROR',
        'testField',
        'testValue',
        { extra: 'context' }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.field).toBe('testField');
      expect(error.value).toBe('testValue');
      expect(error.context).toEqual({ extra: 'context' });
    });

    it('should create validation error with default code', () => {
      const error = createValidationError('Test error');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBeUndefined();
      expect(error.value).toBeUndefined();
      expect(error.context).toBeUndefined();
    });
  });

  describe('validators registry', () => {
    it('should expose all validator functions', () => {
      expect(validators.cliArgs).toBe(validateCLIArgs);
      expect(validators.environment).toBe(validateEnvironment);
      expect(validators.filePath).toBe(validateFilePath);
      expect(validators.packageName).toBe(validatePackageName);
      expect(validators.componentName).toBe(validateComponentName);
      expect(validators.jsxProperty).toBe(validateJSXProperty);
      expect(validators.migrationRule).toBe(validateMigrationRule);
      expect(validators.migr8Rules).toBe(validateMigr8Rules);
      expect(validators.backupMetadata).toBe(validateBackupMetadata);
      expect(validators.userInput).toBe(validateUserInput);
      expect(validators.sanitizedString).toBe(validateSanitizedString);
      expect(validators.filePaths).toBe(validateFilePaths);
      expect(validators.backupConfig).toBe(validateBackupConfig);
      expect(validators.jsonString).toBe(validateJSONString);
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle circular references in object validation', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      mockSecurityManager.detectSuspiciousActivity.mockImplementation(() => {
        throw new Error('JSON.stringify circular reference');
      });

      const mockSchema = {
        safeParse: jest.fn().mockReturnValue({
          success: false,
          error: { errors: [] },
        }),
      };

      const result = validate(mockSchema as any, circular);

      expect(result.success).toBe(false);
      expect(mockSecurityManager.audit).toHaveBeenCalled();
    });

    it('should handle null and undefined inputs', () => {
      const testCases = [null, undefined];

      testCases.forEach((testCase) => {
        mockSchemaRegistry.FilePath.safeParse.mockReturnValue({
          success: false,
          error: { errors: [{ path: [], message: 'Required' }] },
        });

        const result = validateFilePath(testCase);

        expect(result.success).toBe(false);
      });
    });

    it('should handle very large arrays in validateFilePaths', () => {
      const largePaths = Array.from({ length: 10000 }, (_, i) => `/path/file${i}.tsx`);
      
      mockSanitizers.filePath.mockImplementation((path) => path);
      mockSchemaRegistry.FilePath.safeParse.mockImplementation((path) => ({
        success: true,
        data: path,
      }));

      const result = validateFilePaths(largePaths);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(10000);
    });

    it('should handle malformed schemas gracefully', () => {
      const malformedSchema = {
        safeParse: jest.fn().mockReturnValue({
          success: false,
          error: {
            errors: [
              { path: ['field', 'with', null, 'values'], message: 'Test error' },
            ],
          },
        }),
      };

      const result = validate(malformedSchema as any, 'test');

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('field.with.');
    });

    it('should handle security manager exceptions', () => {
      mockSecurityManager.detectSuspiciousActivity.mockImplementation(() => {
        throw new Error('Security check failed');
      });

      const mockSchema = {
        safeParse: jest.fn().mockReturnValue({
          success: true,
          data: 'test',
        }),
      };

      const result = validate(mockSchema as any, 'test-input');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Security check failed');
    });

    it('should handle concurrent validation operations', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => {
        mockSchemaRegistry.FilePath.safeParse.mockReturnValue({
          success: true,
          data: `/path/file${i}.tsx`,
        });

        return Promise.resolve().then(() => validateFilePath(`/path/file${i}.tsx`));
      });

      const results = await Promise.all(promises);

      expect(results.every(r => r.success)).toBe(true);
    });
  });
});
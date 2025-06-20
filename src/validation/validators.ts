/**
 * Validation functions using Zod schemas
 */

import { z } from 'zod';
import { ValidationResult, ValidationError } from './types';
import { SchemaRegistry } from './schemas';
import { sanitizers } from './sanitization';
import { securityManager } from './security';

/**
 * Generic validator function
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): ValidationResult<T> {
  try {
    // Check for suspicious patterns first
    if (typeof data === 'string') {
      securityManager.detectSuspiciousActivity(data, context || 'validation');
    } else if (typeof data === 'object' && data !== null) {
      const dataStr = JSON.stringify(data);
      securityManager.detectSuspiciousActivity(dataStr, context || 'validation');
    }

    const result = schema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return {
        success: false,
        errors,
        error: errors[0] || 'Validation failed',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation error';
    securityManager.audit('validation-error', data, 'error', `Validation failed: ${message}`);
    
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Validate and sanitize CLI arguments
 */
export function validateCLIArgs(args: unknown): ValidationResult<z.infer<typeof SchemaRegistry.CLIArgs>> {
  return validate(SchemaRegistry.CLIArgs, args, 'cli-args');
}

/**
 * Validate environment variables
 */
export function validateEnvironment(env: unknown): ValidationResult<z.infer<typeof SchemaRegistry.Environment>> {
  // Sanitize environment values first
  if (typeof env === 'object' && env !== null) {
    const sanitizedEnv: any = {};
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'string') {
        sanitizedEnv[key] = sanitizers.environmentValue(value);
      } else {
        sanitizedEnv[key] = value;
      }
    }
    return validate(SchemaRegistry.Environment, sanitizedEnv, 'environment');
  }
  
  return validate(SchemaRegistry.Environment, env, 'environment');
}

/**
 * Validate file path
 */
export function validateFilePath(path: unknown): ValidationResult<z.infer<typeof SchemaRegistry.FilePath>> {
  // Sanitize file path first
  if (typeof path === 'string') {
    const sanitized = sanitizers.filePath(path);
    return validate(SchemaRegistry.FilePath, sanitized, 'file-path');
  }
  
  return validate(SchemaRegistry.FilePath, path, 'file-path');
}

/**
 * Validate package name
 */
export function validatePackageName(name: unknown): ValidationResult<z.infer<typeof SchemaRegistry.PackageName>> {
  // Sanitize package name first
  if (typeof name === 'string') {
    const sanitized = sanitizers.packageName(name);
    return validate(SchemaRegistry.PackageName, sanitized, 'package-name');
  }
  
  return validate(SchemaRegistry.PackageName, name, 'package-name');
}

/**
 * Validate component name
 */
export function validateComponentName(name: unknown): ValidationResult<z.infer<typeof SchemaRegistry.ComponentName>> {
  // Sanitize component name first
  if (typeof name === 'string') {
    const sanitized = sanitizers.componentName(name);
    return validate(SchemaRegistry.ComponentName, sanitized, 'component-name');
  }
  
  return validate(SchemaRegistry.ComponentName, name, 'component-name');
}

/**
 * Validate JSX property
 */
export function validateJSXProperty(prop: unknown): ValidationResult<z.infer<typeof SchemaRegistry.JSXProperty>> {
  return validate(SchemaRegistry.JSXProperty, prop, 'jsx-property');
}

/**
 * Validate migration rule
 */
export function validateMigrationRule(rule: unknown): ValidationResult<z.infer<typeof SchemaRegistry.MigrationRule>> {
  // Sanitize migration rule first
  if (typeof rule === 'object' && rule !== null) {
    const sanitized = sanitizers.migrationRule(rule);
    return validate(SchemaRegistry.MigrationRule, sanitized, 'migration-rule');
  }
  
  return validate(SchemaRegistry.MigrationRule, rule, 'migration-rule');
}

/**
 * Validate complete migr8 rules file
 */
export function validateMigr8Rules(rules: unknown): ValidationResult<z.infer<typeof SchemaRegistry.Migr8Rules>> {
  // Additional security validation
  const securityResult = securityManager.validateMigrationRules(rules);
  if (!securityResult.valid) {
    return {
      success: false,
      error: 'Security validation failed',
      errors: securityResult.errors,
    };
  }

  return validate(SchemaRegistry.Migr8Rules, rules, 'migr8-rules');
}

/**
 * Validate backup metadata
 */
export function validateBackupMetadata(metadata: unknown): ValidationResult<z.infer<typeof SchemaRegistry.BackupMetadata>> {
  return validate(SchemaRegistry.BackupMetadata, metadata, 'backup-metadata');
}

/**
 * Validate user input from interactive prompts
 */
export function validateUserInput(input: unknown): ValidationResult<z.infer<typeof SchemaRegistry.UserInput>> {
  // Sanitize user input first
  if (typeof input === 'string') {
    const sanitized = sanitizers.userInput(input);
    return validate(SchemaRegistry.UserInput, sanitized, 'user-input');
  }
  
  return validate(SchemaRegistry.UserInput, input, 'user-input');
}

/**
 * Validate and sanitize string input
 */
export function validateSanitizedString(input: unknown): ValidationResult<z.infer<typeof SchemaRegistry.SanitizedString>> {
  // Sanitize string first
  if (typeof input === 'string') {
    const sanitized = sanitizers.string(input);
    return validate(SchemaRegistry.SanitizedString, sanitized, 'sanitized-string');
  }
  
  return validate(SchemaRegistry.SanitizedString, input, 'sanitized-string');
}

/**
 * Validate array of file paths
 */
export function validateFilePaths(paths: unknown): ValidationResult<string[]> {
  if (!Array.isArray(paths)) {
    return {
      success: false,
      error: 'Expected array of file paths',
    };
  }

  const validatedPaths: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < paths.length; i++) {
    const pathResult = validateFilePath(paths[i]);
    if (pathResult.success && pathResult.data) {
      validatedPaths.push(pathResult.data);
    } else {
      errors.push(`Path ${i}: ${pathResult.error}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      error: `Validation failed for ${errors.length} paths`,
    };
  }

  return {
    success: true,
    data: validatedPaths,
  };
}

/**
 * Validate backup configuration
 */
export function validateBackupConfig(config: unknown): ValidationResult<{
  name?: string;
  tags?: string[];
  description?: string;
}> {
  try {
    if (typeof config !== 'object' || config === null) {
      return { success: false, error: 'Backup config must be an object' };
    }

    const validatedConfig: any = {};
    const configObj = config as any;

    // Validate name
    if (configObj.name !== undefined) {
      if (typeof configObj.name === 'string') {
        validatedConfig.name = sanitizers.backupName(configObj.name);
        if (validatedConfig.name.length === 0) {
          return { success: false, error: 'Invalid backup name' };
        }
      } else {
        return { success: false, error: 'Backup name must be a string' };
      }
    }

    // Validate tags
    if (configObj.tags !== undefined) {
      if (Array.isArray(configObj.tags)) {
        validatedConfig.tags = sanitizers.tags(configObj.tags);
      } else {
        return { success: false, error: 'Backup tags must be an array' };
      }
    }

    // Validate description
    if (configObj.description !== undefined) {
      if (typeof configObj.description === 'string') {
        validatedConfig.description = sanitizers.string(configObj.description, { maxLength: 500 });
      } else {
        return { success: false, error: 'Backup description must be a string' };
      }
    }

    return {
      success: true,
      data: validatedConfig,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Create validation error
 */
export function createValidationError(
  message: string,
  code: string = 'VALIDATION_ERROR',
  field?: string,
  value?: unknown,
  context?: Record<string, unknown>
): ValidationError {
  const error = new Error(message) as ValidationError;
  error.name = 'ValidationError';
  error.code = code;
  error.field = field;
  error.value = value;
  error.context = context;
  return error;
}

/**
 * Validate JSON string safely
 */
export function validateJSONString(input: string, maxSize: number = 1024 * 1024): ValidationResult<any> {
  try {
    if (typeof input !== 'string') {
      return { success: false, error: 'Input must be a string' };
    }

    if (input.length > maxSize) {
      return { success: false, error: `JSON string too large (max ${maxSize} characters)` };
    }

    // Sanitize JSON string first
    const sanitized = sanitizers.jsonString(input);
    
    // Parse JSON
    const parsed = JSON.parse(sanitized);
    
    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validator registry for easy access
 */
export const validators = {
  cliArgs: validateCLIArgs,
  environment: validateEnvironment,
  filePath: validateFilePath,
  packageName: validatePackageName,
  componentName: validateComponentName,
  jsxProperty: validateJSXProperty,
  migrationRule: validateMigrationRule,
  migr8Rules: validateMigr8Rules,
  backupMetadata: validateBackupMetadata,
  userInput: validateUserInput,
  sanitizedString: validateSanitizedString,
  filePaths: validateFilePaths,
  backupConfig: validateBackupConfig,
  jsonString: validateJSONString,
} as const;
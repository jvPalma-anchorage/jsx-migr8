/**
 * Zod schemas for comprehensive input validation
 */

import { z } from 'zod';
import path from 'node:path';

// Common validation patterns
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const SAFE_DIRNAME_REGEX = /^[a-zA-Z0-9._/-]+$/;
const PACKAGE_NAME_REGEX = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const COMPONENT_NAME_REGEX = /^[A-Z][a-zA-Z0-9_]*$/;
const JSX_PROP_NAME_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$-]*$/;

// Security patterns - things to detect and block
const SUSPICIOUS_PATTERNS = [
  /\.\.\//g,           // Path traversal
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /javascript:/gi,      // JavaScript URLs
  /data:.*base64/gi,   // Base64 data URLs
  /\$\{.*\}/g,         // Template literals
  /eval\s*\(/gi,       // eval() calls
  /Function\s*\(/gi,   // Function constructor
  /require\s*\(/gi,    // require() calls in untrusted input
  /import\s*\(/gi,     // dynamic imports in untrusted input
  /process\./gi,       // process object access
  /__proto__/gi,       // prototype pollution
  /constructor/gi,     // constructor access
];

// Custom refinement functions
const isValidPath = (value: string) => {
  try {
    const normalized = path.normalize(value);
    return !normalized.includes('..') && !normalized.startsWith('/');
  } catch {
    return false;
  }
};

const isValidAbsolutePath = (value: string) => {
  try {
    return path.isAbsolute(value) && !value.includes('..');
  } catch {
    return false;
  }
};

const containsSuspiciousPatterns = (value: string) => {
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(value));
};

// CLI Arguments Schema
export const CLIArgsSchema = z.object({
  root: z.string()
    .optional()
    .refine(val => !val || isValidAbsolutePath(val), 'Invalid root path')
    .refine(val => !val || !containsSuspiciousPatterns(val), 'Suspicious patterns detected in root path'),
  
  blacklist: z.string()
    .optional()
    .refine(val => !val || !containsSuspiciousPatterns(val), 'Suspicious patterns detected in blacklist')
    .transform(val => val ? val.split(',').map(s => s.trim()).filter(s => s.length > 0) : []),
  
  interactive: z.boolean().default(false),
  showProps: z.boolean().default(false),
  yolo: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  
  report: z.string()
    .optional()
    .refine(val => !val || isValidPath(val), 'Invalid report path')
    .refine(val => !val || !containsSuspiciousPatterns(val), 'Suspicious patterns detected in report path'),
  
  info: z.boolean().default(false),
  debug: z.boolean().default(false),
  backup: z.boolean().default(false),
  
  rollback: z.string()
    .optional()
    .refine(val => !val || /^[a-zA-Z0-9-_]+$/.test(val), 'Invalid backup ID format'),
  
  listBackups: z.boolean().default(false),
  
  verifyBackup: z.string()
    .optional()
    .refine(val => !val || /^[a-zA-Z0-9-_]+$/.test(val), 'Invalid backup ID format'),
  
  cleanupBackups: z.boolean().default(false),
  skipBackup: z.boolean().default(false),
  
  backupName: z.string()
    .max(100, 'Backup name too long')
    .optional()
    .refine(val => !val || SAFE_FILENAME_REGEX.test(val), 'Invalid backup name format'),
  
  backupTags: z.string()
    .optional()
    .refine(val => !val || !containsSuspiciousPatterns(val), 'Suspicious patterns detected in backup tags')
    .transform(val => val ? val.split(',').map(s => s.trim()).filter(s => s.length > 0) : []),
  
  forceRollback: z.boolean().default(false),
});

// Environment Variables Schema
export const EnvironmentSchema = z.object({
  ROOT_PATH: z.string()
    .optional()
    .refine(val => !val || isValidAbsolutePath(val), 'Invalid ROOT_PATH')
    .refine(val => !val || !containsSuspiciousPatterns(val), 'Suspicious patterns detected in ROOT_PATH'),
  
  BLACKLIST: z.string()
    .optional()
    .refine(val => !val || !containsSuspiciousPatterns(val), 'Suspicious patterns detected in BLACKLIST'),
  
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  DEBUG: z.string().optional(),
  
  MIGR8_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  MIGR8_MAX_FILE_SIZE: z.string()
    .optional()
    .refine(val => !val || /^\d+[KMGT]?B?$/i.test(val), 'Invalid file size format'),
  
  MIGR8_BACKUP_RETENTION_DAYS: z.string()
    .optional()
    .refine(val => !val || /^\d+$/.test(val), 'Invalid retention days format')
    .transform(val => val ? parseInt(val, 10) : undefined),
});

// File Path Schema
export const FilePathSchema = z.string()
  .min(1, 'File path cannot be empty')
  .max(4096, 'File path too long')
  .refine(val => !containsSuspiciousPatterns(val), 'Suspicious patterns detected in file path')
  .refine(val => {
    try {
      const normalized = path.normalize(val);
      return !normalized.includes('..') || path.isAbsolute(normalized);
    } catch {
      return false;
    }
  }, 'Invalid file path format');

// Package Name Schema
export const PackageNameSchema = z.string()
  .min(1, 'Package name cannot be empty')
  .max(214, 'Package name too long')
  .refine(val => PACKAGE_NAME_REGEX.test(val), 'Invalid package name format')
  .refine(val => !containsSuspiciousPatterns(val), 'Suspicious patterns detected in package name');

// Component Name Schema
export const ComponentNameSchema = z.string()
  .min(1, 'Component name cannot be empty')
  .max(100, 'Component name too long')
  .refine(val => COMPONENT_NAME_REGEX.test(val), 'Invalid component name format')
  .refine(val => !containsSuspiciousPatterns(val), 'Suspicious patterns detected in component name');

// JSX Property Schema
export const JSXPropertySchema = z.object({
  name: z.string()
    .refine(val => JSX_PROP_NAME_REGEX.test(val), 'Invalid property name format')
    .refine(val => !containsSuspiciousPatterns(val), 'Suspicious patterns detected in property name'),
  
  value: z.string()
    .max(10000, 'Property value too long')
    .refine(val => !containsSuspiciousPatterns(val), 'Suspicious patterns detected in property value'),
});

// Migration Rule Schema
export const MigrationRuleSchema = z.object({
  order: z.number().int().min(1),
  
  match: z.array(
    z.record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
  ).default([]),
  
  remove: z.array(z.string()).default([]),
  
  rename: z.record(z.string(), z.string()).default({}),
  
  set: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).default({}),
  
  replaceWith: z.object({
    INNER_PROPS: z.array(z.string()).optional(),
    code: z.string()
      .max(50000, 'Replacement code too long')
      .refine(val => !containsSuspiciousPatterns(val), 'Suspicious patterns detected in replacement code'),
  }).optional(),
});

// Migr8 Rules File Schema
export const Migr8RulesSchema = z.object({
  lookup: z.object({
    rootPath: z.string()
      .refine(val => isValidAbsolutePath(val), 'Invalid root path')
      .refine(val => !containsSuspiciousPatterns(val), 'Suspicious patterns detected in root path'),
    
    packages: z.array(PackageNameSchema),
    components: z.array(ComponentNameSchema),
  }),
  
  migr8rules: z.array(
    z.object({
      package: PackageNameSchema,
      importType: z.enum(['named', 'default']),
      component: ComponentNameSchema,
      
      importTo: z.object({
        importStm: PackageNameSchema,
        importType: z.enum(['named', 'default']),
        component: ComponentNameSchema,
      }),
      
      rules: z.array(MigrationRuleSchema),
    })
  ),
});

// Backup Metadata Schema
export const BackupMetadataSchema = z.object({
  id: z.string()
    .min(1, 'Backup ID cannot be empty')
    .refine(val => /^[a-zA-Z0-9-_]+$/.test(val), 'Invalid backup ID format'),
  
  name: z.string()
    .max(100, 'Backup name too long')
    .refine(val => SAFE_FILENAME_REGEX.test(val), 'Invalid backup name format'),
  
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
  
  tags: z.array(z.string()).default([]),
  
  createdAt: z.date(),
  
  migration: z.object({
    componentName: ComponentNameSchema,
    sourcePackage: PackageNameSchema,
    targetPackage: PackageNameSchema,
  }),
  
  stats: z.object({
    totalFiles: z.number().int().min(0),
    totalSize: z.number().int().min(0),
  }),
  
  integrityValid: z.boolean(),
});

// User Input Schema (for interactive prompts)
export const UserInputSchema = z.string()
  .max(1000, 'Input too long')
  .refine(val => !containsSuspiciousPatterns(val), 'Suspicious patterns detected in input');

// Sanitized String Schema
export const SanitizedStringSchema = z.string()
  .transform(val => val.trim())
  .refine(val => val.length > 0, 'Cannot be empty after sanitization')
  .refine(val => !containsSuspiciousPatterns(val), 'Suspicious patterns detected');

// Export types
export type CLIArgs = z.infer<typeof CLIArgsSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
export type FilePath = z.infer<typeof FilePathSchema>;
export type PackageName = z.infer<typeof PackageNameSchema>;
export type ComponentName = z.infer<typeof ComponentNameSchema>;
export type JSXProperty = z.infer<typeof JSXPropertySchema>;
export type MigrationRule = z.infer<typeof MigrationRuleSchema>;
export type Migr8Rules = z.infer<typeof Migr8RulesSchema>;
export type BackupMetadata = z.infer<typeof BackupMetadataSchema>;
export type UserInput = z.infer<typeof UserInputSchema>;
export type SanitizedString = z.infer<typeof SanitizedStringSchema>;

// Schema registry for dynamic validation
export const SchemaRegistry = {
  CLIArgs: CLIArgsSchema,
  Environment: EnvironmentSchema,
  FilePath: FilePathSchema,
  PackageName: PackageNameSchema,
  ComponentName: ComponentNameSchema,
  JSXProperty: JSXPropertySchema,
  MigrationRule: MigrationRuleSchema,
  Migr8Rules: Migr8RulesSchema,
  BackupMetadata: BackupMetadataSchema,
  UserInput: UserInputSchema,
  SanitizedString: SanitizedStringSchema,
} as const;
/**
 * Input sanitization utilities
 */

import { SanitizationOptions } from './types';
import { securityManager } from './security';

// Default sanitization options
const DEFAULT_SANITIZATION_OPTIONS: Required<SanitizationOptions> = {
  preserveWhitespace: false,
  maxLength: 10000,
  allowHtml: false,
  stripScripts: true,
  normalizeUnicode: true,
};

/**
 * Sanitize string input to prevent XSS and other attacks
 */
export function sanitizeString(input: string, options: SanitizationOptions = {}): string {
  const opts = { ...DEFAULT_SANITIZATION_OPTIONS, ...options };
  
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  let sanitized = input;

  // Check for suspicious patterns first
  securityManager.detectSuspiciousActivity(sanitized, 'string-sanitization');

  // Truncate if too long
  if (sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
  }

  // Normalize Unicode if requested
  if (opts.normalizeUnicode) {
    sanitized = sanitized.normalize('NFC');
  }

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Strip scripts if requested
  if (opts.stripScripts) {
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  }

  // Handle HTML
  if (!opts.allowHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // Handle whitespace
  if (!opts.preserveWhitespace) {
    sanitized = sanitized.trim();
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  return sanitized;
}

/**
 * Sanitize file path to prevent path traversal
 */
export function sanitizeFilePath(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('File path must be a string');
  }

  let sanitized = input;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove or replace dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '');

  // Normalize path separators
  sanitized = sanitized.replace(/\\/g, '/');

  // Remove multiple consecutive slashes
  sanitized = sanitized.replace(/\/+/g, '/');

  // Remove leading and trailing whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize package name for npm/yarn
 */
export function sanitizePackageName(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Package name must be a string');
  }

  let sanitized = input.trim().toLowerCase();

  // Remove invalid characters for npm package names
  sanitized = sanitized.replace(/[^a-z0-9._@/-]/g, '');

  // Ensure proper scoped package format
  if (sanitized.startsWith('@')) {
    const parts = sanitized.split('/');
    if (parts.length === 2) {
      sanitized = `@${parts[0].substring(1)}/${parts[1]}`;
    }
  }

  return sanitized;
}

/**
 * Sanitize component name for React/JSX
 */
export function sanitizeComponentName(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Component name must be a string');
  }

  let sanitized = input.trim();

  // Remove invalid characters (keep only letters, numbers, underscores)
  sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '');

  // Ensure it starts with uppercase letter
  if (sanitized.length > 0 && /^[a-z]/.test(sanitized)) {
    sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  }

  return sanitized;
}

/**
 * Sanitize JSX property name
 */
export function sanitizePropertyName(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Property name must be a string');
  }

  let sanitized = input.trim();

  // Remove invalid characters for JSX props
  sanitized = sanitized.replace(/[^a-zA-Z0-9_$-]/g, '');

  // Ensure it starts with valid character
  if (sanitized.length > 0 && /^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }

  return sanitized;
}

/**
 * Sanitize user input from interactive prompts
 */
export function sanitizeUserInput(input: string, options: SanitizationOptions = {}): string {
  // First apply general string sanitization
  let sanitized = sanitizeString(input, options);

  // Additional sanitization for user input
  // Remove potential command injection patterns
  sanitized = sanitized.replace(/[;&|`$(){}[\]\\]/g, '');

  // Remove potential escape sequences
  sanitized = sanitized.replace(/\x1b\[[0-9;]*m/g, '');

  return sanitized;
}

/**
 * Sanitize environment variable value
 */
export function sanitizeEnvironmentValue(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove potential command injection
  sanitized = sanitized.replace(/[;&|`$()]/g, '');

  return sanitized;
}

/**
 * Sanitize JSON string for safe parsing
 */
export function sanitizeJsonString(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('JSON input must be a string');
  }

  let sanitized = input.trim();

  // Check for suspicious patterns before processing
  securityManager.detectSuspiciousActivity(sanitized, 'json-sanitization');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove potentially dangerous patterns that could cause prototype pollution
  sanitized = sanitized.replace(/"__proto__"\s*:/g, '"__proto_removed__":');
  sanitized = sanitized.replace(/"constructor"\s*:/g, '"constructor_removed__":');

  return sanitized;
}

/**
 * Sanitize backup name
 */
export function sanitizeBackupName(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Backup name must be a string');
  }

  let sanitized = input.trim();

  // Remove invalid characters for file names
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');

  // Replace spaces with underscores
  sanitized = sanitized.replace(/\s+/g, '_');

  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  return sanitized;
}

/**
 * Sanitize tags array
 */
export function sanitizeTags(input: string[]): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map(tag => {
      if (typeof tag !== 'string') return '';
      
      let sanitized = tag.trim();
      
      // Remove invalid characters
      sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');
      
      // Limit length
      if (sanitized.length > 50) {
        sanitized = sanitized.substring(0, 50);
      }
      
      return sanitized;
    })
    .filter(tag => tag.length > 0)
    .slice(0, 10); // Limit number of tags
}

/**
 * Sanitize migration rule object
 */
export function sanitizeMigrationRule(rule: any): any {
  if (!rule || typeof rule !== 'object') {
    return {};
  }

  const sanitized: any = {};

  // Sanitize order
  if (typeof rule.order === 'number' && rule.order > 0) {
    sanitized.order = Math.floor(rule.order);
  }

  // Sanitize match array
  if (Array.isArray(rule.match)) {
    sanitized.match = rule.match.map((match: any) => {
      if (typeof match === 'object' && match !== null) {
        const sanitizedMatch: any = {};
        for (const [key, value] of Object.entries(match)) {
          const sanitizedKey = sanitizePropertyName(key);
          if (sanitizedKey && typeof value === 'string') {
            sanitizedMatch[sanitizedKey] = sanitizeString(value as string);
          } else if (sanitizedKey && (typeof value === 'boolean' || typeof value === 'number')) {
            sanitizedMatch[sanitizedKey] = value;
          }
        }
        return sanitizedMatch;
      }
      return {};
    });
  }

  // Sanitize remove array
  if (Array.isArray(rule.remove)) {
    sanitized.remove = rule.remove
      .map((prop: any) => typeof prop === 'string' ? sanitizePropertyName(prop) : '')
      .filter((prop: string) => prop.length > 0);
  }

  // Sanitize rename object
  if (typeof rule.rename === 'object' && rule.rename !== null) {
    sanitized.rename = {};
    for (const [key, value] of Object.entries(rule.rename)) {
      const sanitizedKey = sanitizePropertyName(key);
      const sanitizedValue = typeof value === 'string' ? sanitizePropertyName(value) : '';
      if (sanitizedKey && sanitizedValue) {
        sanitized.rename[sanitizedKey] = sanitizedValue;
      }
    }
  }

  // Sanitize set object
  if (typeof rule.set === 'object' && rule.set !== null) {
    sanitized.set = {};
    for (const [key, value] of Object.entries(rule.set)) {
      const sanitizedKey = sanitizePropertyName(key);
      if (sanitizedKey && typeof value === 'string') {
        sanitized.set[sanitizedKey] = sanitizeString(value as string);
      } else if (sanitizedKey && (typeof value === 'boolean' || typeof value === 'number')) {
        sanitized.set[sanitizedKey] = value;
      }
    }
  }

  // Sanitize replaceWith object
  if (typeof rule.replaceWith === 'object' && rule.replaceWith !== null) {
    sanitized.replaceWith = {};
    
    if (Array.isArray(rule.replaceWith.INNER_PROPS)) {
      sanitized.replaceWith.INNER_PROPS = rule.replaceWith.INNER_PROPS
        .map((prop: any) => typeof prop === 'string' ? sanitizePropertyName(prop) : '')
        .filter((prop: string) => prop.length > 0);
    }
    
    if (typeof rule.replaceWith.code === 'string') {
      // Sanitize JSX code but preserve structure
      let code = rule.replaceWith.code;
      
      // Check for suspicious patterns
      securityManager.detectSuspiciousActivity(code, 'jsx-code-sanitization');
      
      // Remove null bytes
      code = code.replace(/\0/g, '');
      
      // Limit length
      if (code.length > 50000) {
        code = code.substring(0, 50000);
      }
      
      sanitized.replaceWith.code = code;
    }
  }

  return sanitized;
}

/**
 * Sanitization registry for different input types
 */
export const sanitizers = {
  string: sanitizeString,
  filePath: sanitizeFilePath,
  packageName: sanitizePackageName,
  componentName: sanitizeComponentName,
  propertyName: sanitizePropertyName,
  userInput: sanitizeUserInput,
  environmentValue: sanitizeEnvironmentValue,
  jsonString: sanitizeJsonString,
  backupName: sanitizeBackupName,
  tags: sanitizeTags,
  migrationRule: sanitizeMigrationRule,
} as const;
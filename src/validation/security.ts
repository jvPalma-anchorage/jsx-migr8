/**
 * Security utilities and path traversal protection
 */

import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { SecurityAudit, SecurityContext, PathValidationOptions, SecurityConfig, SuspiciousActivity } from './types';
import { securityLogger } from './logger';

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxInputLength: 10000,
  maxPathDepth: 10,
  allowedOrigins: ['localhost', '127.0.0.1'],
  rateLimits: {
    fileOperations: { windowMs: 60000, maxRequests: 100 },
    migrationRules: { windowMs: 300000, maxRequests: 50 },
    backupOperations: { windowMs: 60000, maxRequests: 20 },
  },
  auditLevel: 'detailed',
  blockSuspiciousPatterns: true,
};

// Suspicious activity patterns
const SUSPICIOUS_ACTIVITIES: SuspiciousActivity[] = [
  {
    pattern: '\\.\\.\\/|\\.\\\\',
    description: 'Path traversal attempt',
    severity: 'high',
    action: 'block'
  },
  {
    pattern: '<script[^>]*>.*?</script>',
    description: 'Script injection attempt',
    severity: 'critical',
    action: 'block'
  },
  {
    pattern: 'javascript:|data:.*base64',
    description: 'Dangerous URL scheme',
    severity: 'high',
    action: 'block'
  },
  {
    pattern: 'eval\\s*\\(|Function\\s*\\(',
    description: 'Code execution attempt',
    severity: 'critical',
    action: 'block'
  },
  {
    pattern: '__proto__|constructor\\.|prototype\\.',
    description: 'Prototype pollution attempt',
    severity: 'high',
    action: 'block'
  },
  {
    pattern: 'process\\.|require\\s*\\(|import\\s*\\(',
    description: 'System access attempt',
    severity: 'high',
    action: 'warn'
  },
  {
    pattern: '\\$\\{.*\\}|`.*\\$\\{.*\\}.*`',
    description: 'Template literal injection',
    severity: 'medium',
    action: 'warn'
  },
  {
    pattern: '(rm|del|format|fdisk)\\s+(-rf?|/[a-z])',
    description: 'Destructive command pattern',
    severity: 'critical',
    action: 'block'
  }
];

// Rate limiting storage (in-memory for CLI tool)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Security utility class for comprehensive protection
 */
export class SecurityManager {
  private config: SecurityConfig;
  private auditLog: SecurityAudit[] = [];

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Validate and sanitize file paths to prevent path traversal attacks
   */
  validatePath(inputPath: string, options: PathValidationOptions = {}): { valid: boolean; sanitized?: string; error?: string } {
    const opts = {
      allowAbsolute: true,
      allowRelative: false,
      allowTraversal: false,
      maxDepth: this.config.maxPathDepth,
      ...options
    };

    try {
      // Check for null bytes and other dangerous characters
      if (inputPath.includes('\0') || inputPath.includes('\x00')) {
        this.audit('path-validation', inputPath, 'critical', 'Null byte detected in path');
        return { valid: false, error: 'Invalid characters in path' };
      }

      // Normalize the path
      let normalizedPath = path.normalize(inputPath);

      // Check for path traversal
      if (!opts.allowTraversal && normalizedPath.includes('..')) {
        this.audit('path-validation', inputPath, 'warning', 'Path traversal attempt detected');
        return { valid: false, error: 'Path traversal not allowed' };
      }

      // Check absolute vs relative path restrictions
      const isAbsolute = path.isAbsolute(normalizedPath);
      if (isAbsolute && !opts.allowAbsolute) {
        return { valid: false, error: 'Absolute paths not allowed' };
      }
      if (!isAbsolute && !opts.allowRelative) {
        return { valid: false, error: 'Relative paths not allowed' };
      }

      // Check path depth
      const pathParts = normalizedPath.split(path.sep).filter(part => part !== '');
      if (pathParts.length > opts.maxDepth) {
        return { valid: false, error: `Path too deep (max ${opts.maxDepth} levels)` };
      }

      // Check against blocked paths
      if (opts.blockedPaths && opts.blockedPaths.some(blocked => normalizedPath.includes(blocked))) {
        this.audit('path-validation', inputPath, 'warning', 'Blocked path accessed');
        return { valid: false, error: 'Path not allowed' };
      }

      // Check file extensions if specified
      if (opts.allowedExtensions && opts.allowedExtensions.length > 0) {
        const ext = path.extname(normalizedPath).toLowerCase();
        if (!opts.allowedExtensions.includes(ext)) {
          return { valid: false, error: `File extension ${ext} not allowed` };
        }
      }

      // If we have a base directory, ensure the path is within it
      if (opts.baseDir) {
        const resolvedBase = path.resolve(opts.baseDir);
        const resolvedPath = path.resolve(isAbsolute ? normalizedPath : path.join(opts.baseDir, normalizedPath));
        
        if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
          this.audit('path-validation', inputPath, 'warning', 'Path outside base directory');
          return { valid: false, error: 'Path outside allowed directory' };
        }

        normalizedPath = resolvedPath;
      }

      return { valid: true, sanitized: normalizedPath };
    } catch (error) {
      this.audit('path-validation', inputPath, 'error', `Path validation error: ${error}`);
      return { valid: false, error: 'Invalid path format' };
    }
  }

  /**
   * Check input for suspicious patterns
   */
  detectSuspiciousActivity(input: string, context?: string): SuspiciousActivity[] {
    const detectedActivities: SuspiciousActivity[] = [];

    for (const activity of SUSPICIOUS_ACTIVITIES) {
      const regex = new RegExp(activity.pattern, 'gi');
      if (regex.test(input)) {
        detectedActivities.push(activity);
        
        this.audit(
          'suspicious-activity',
          { input: this.sanitizeForLog(input), context },
          activity.severity === 'critical' ? 'critical' : 'warning',
          `Suspicious activity detected: ${activity.description}`
        );

        if (activity.action === 'block' && this.config.blockSuspiciousPatterns) {
          throw new Error(`Security violation: ${activity.description}`);
        }
      }
    }

    return detectedActivities;
  }

  /**
   * Rate limiting for operations
   */
  checkRateLimit(operation: string, identifier: string = 'default'): { allowed: boolean; remaining?: number; resetTime?: number } {
    const config = this.config.rateLimits[operation];
    if (!config) return { allowed: true };

    const key = `${operation}:${identifier}`;
    const now = Date.now();
    const stored = rateLimitStore.get(key);

    if (!stored || now > stored.resetTime) {
      // Reset or initialize
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
    }

    if (stored.count >= config.maxRequests) {
      this.audit('rate-limit', { operation, identifier }, 'warning', 'Rate limit exceeded');
      return { allowed: false, remaining: 0, resetTime: stored.resetTime };
    }

    stored.count++;
    return { 
      allowed: true, 
      remaining: config.maxRequests - stored.count, 
      resetTime: stored.resetTime 
    };
  }

  /**
   * Secure file operations wrapper
   */
  async secureFileOperation<T>(
    operation: string,
    filePath: string,
    callback: (safePath: string) => Promise<T>,
    options: PathValidationOptions = {}
  ): Promise<T> {
    // Validate path
    const pathResult = this.validatePath(filePath, options);
    if (!pathResult.valid) {
      throw new Error(`Invalid file path: ${pathResult.error}`);
    }

    // Check rate limit
    const rateLimit = this.checkRateLimit('fileOperations');
    if (!rateLimit.allowed) {
      throw new Error('Rate limit exceeded for file operations');
    }

    // Check for suspicious patterns
    this.detectSuspiciousActivity(filePath, operation);

    try {
      this.audit('file-operation', { operation, path: this.sanitizeForLog(filePath) }, 'info', `File operation: ${operation}`);
      return await callback(pathResult.sanitized!);
    } catch (error) {
      this.audit('file-operation', { operation, path: this.sanitizeForLog(filePath), error }, 'error', `File operation failed: ${operation}`);
      throw error;
    }
  }

  /**
   * Validate migration rules for security
   */
  validateMigrationRules(rules: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      if (!rules || typeof rules !== 'object') {
        errors.push('Migration rules must be an object');
        return { valid: false, errors };
      }

      const rulesStr = JSON.stringify(rules);
      
      // Check for suspicious patterns in the entire rules object
      const suspiciousActivities = this.detectSuspiciousActivity(rulesStr, 'migration-rules');
      
      if (suspiciousActivities.some(a => a.action === 'block')) {
        errors.push('Migration rules contain suspicious patterns');
      }

      // Check rate limit for rule validation
      const rateLimit = this.checkRateLimit('migrationRules');
      if (!rateLimit.allowed) {
        errors.push('Rate limit exceeded for migration rule validation');
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      this.audit('rule-validation', rules, 'error', `Rule validation error: ${error}`);
      errors.push('Failed to validate migration rules');
      return { valid: false, errors };
    }
  }

  /**
   * Create security audit entry
   */
  audit(
    operation: string,
    input: unknown,
    severity: SecurityAudit['severity'],
    message: string,
    context?: SecurityContext
  ): void {
    const audit: SecurityAudit = {
      timestamp: new Date(),
      operation,
      input: this.sanitizeForLog(input),
      severity,
      message,
      details: context ? { ...context } : undefined,
    };

    this.auditLog.push(audit);
    
    // Log to security logger
    securityLogger[severity](message, {
      operation,
      input: audit.input,
      details: audit.details,
    });

    // Keep audit log size manageable
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-500);
    }
  }

  /**
   * Get security audit log
   */
  getAuditLog(): SecurityAudit[] {
    return [...this.auditLog];
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): { totalAudits: number; severityCounts: Record<string, number>; recentActivities: SecurityAudit[] } {
    const severityCounts = this.auditLog.reduce((counts, audit) => {
      counts[audit.severity] = (counts[audit.severity] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const recentActivities = this.auditLog
      .filter(audit => Date.now() - audit.timestamp.getTime() < 60000) // Last minute
      .slice(-10);

    return {
      totalAudits: this.auditLog.length,
      severityCounts,
      recentActivities,
    };
  }

  /**
   * Generate secure hash for integrity checking
   */
  generateHash(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random ID
   */
  generateSecureId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  private sanitizeForLog(data: unknown): unknown {
    if (typeof data === 'string') {
      // Truncate long strings and remove potentially sensitive patterns
      let sanitized = data.length > 200 ? data.substring(0, 200) + '...' : data;
      
      // Remove potential passwords, tokens, keys
      sanitized = sanitized.replace(/password['":\s]*['"'][^'"]*['"']/gi, 'password:"[REDACTED]"');
      sanitized = sanitized.replace(/token['":\s]*['"'][^'"]*['"']/gi, 'token:"[REDACTED]"');
      sanitized = sanitized.replace(/key['":\s]*['"'][^'"]*['"']/gi, 'key:"[REDACTED]"');
      sanitized = sanitized.replace(/secret['":\s]*['"'][^'"]*['"']/gi, 'secret:"[REDACTED]"');
      
      return sanitized;
    }

    if (typeof data === 'object' && data !== null) {
      try {
        const obj = { ...data };
        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
        for (const field of sensitiveFields) {
          if (field in obj) {
            (obj as any)[field] = '[REDACTED]';
          }
        }
        return obj;
      } catch {
        return '[OBJECT - Cannot serialize]';
      }
    }

    return data;
  }

  /**
   * Clear audit log (for testing or cleanup)
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }
}

// Global security manager instance
export const securityManager = new SecurityManager();

// Convenience functions
export const validatePath = (path: string, options?: PathValidationOptions) => 
  securityManager.validatePath(path, options);

export const detectSuspiciousActivity = (input: string, context?: string) => 
  securityManager.detectSuspiciousActivity(input, context);

export const secureFileOperation = <T>(
  operation: string,
  filePath: string,
  callback: (safePath: string) => Promise<T>,
  options?: PathValidationOptions
) => securityManager.secureFileOperation(operation, filePath, callback, options);

export const validateMigrationRules = (rules: unknown) => 
  securityManager.validateMigrationRules(rules);

export const checkRateLimit = (operation: string, identifier?: string) => 
  securityManager.checkRateLimit(operation, identifier);

export const generateSecureHash = (data: string | Buffer) => 
  securityManager.generateHash(data);

export const generateSecureId = () => 
  securityManager.generateSecureId();
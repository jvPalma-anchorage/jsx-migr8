/**
 * Types for validation and security system
 */

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  warnings?: string[];
}

export interface SecurityAudit {
  timestamp: Date;
  operation: string;
  input: unknown;
  userId?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: Record<string, unknown>;
}

export interface SecurityContext {
  userId?: string;
  sessionId?: string;
  operation: string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}

export interface PathValidationOptions {
  allowAbsolute?: boolean;
  allowRelative?: boolean;  
  allowTraversal?: boolean;
  baseDir?: string;
  maxDepth?: number;
  allowedExtensions?: string[];
  blockedPaths?: string[];
}

export interface SanitizationOptions {
  preserveWhitespace?: boolean;
  maxLength?: number;
  allowHtml?: boolean;
  stripScripts?: boolean;
  normalizeUnicode?: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export interface SecurityConfig {
  maxInputLength: number;
  maxPathDepth: number;
  allowedOrigins: string[];
  rateLimits: Record<string, RateLimitConfig>;
  auditLevel: 'none' | 'basic' | 'detailed' | 'full';
  blockSuspiciousPatterns: boolean;
}

export interface ValidationError extends Error {
  code: string;
  field?: string;
  value?: unknown;
  context?: Record<string, unknown>;
}

export interface SuspiciousActivity {
  pattern: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'warn' | 'block' | 'terminate';
}
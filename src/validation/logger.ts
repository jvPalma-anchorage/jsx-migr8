/**
 * Security-focused logging utilities
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { SecurityAudit } from './types';

/**
 * Security logger interface
 */
interface SecurityLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  critical(message: string, meta?: Record<string, unknown>): void;
  audit(audit: SecurityAudit): void;
}

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'critical';
  message: string;
  meta?: Record<string, unknown>;
  pid: number;
  service: string;
}

/**
 * Security audit log entry
 */
interface AuditLogEntry extends LogEntry {
  audit: SecurityAudit;
}

/**
 * File-based security logger implementation
 */
class FileSecurityLogger implements SecurityLogger {
  private logPath: string;
  private auditPath: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private maxAuditSize: number = 50 * 1024 * 1024; // 50MB

  constructor(logDir: string = '.logs') {
    this.logPath = path.join(logDir, 'security.log');
    this.auditPath = path.join(logDir, 'audit.log');
    this.ensureLogDirectory(logDir);
  }

  private async ensureLogDirectory(logDir: string): Promise<void> {
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      // Fallback to console logging if we can't create log directory
      console.warn('Failed to create log directory:', error);
    }
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    meta?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      pid: process.pid,
      service: 'jsx-migr8',
    };
  }

  private async writeLog(entry: LogEntry | AuditLogEntry, isAudit: boolean = false): Promise<void> {
    const logPath = isAudit ? this.auditPath : this.logPath;
    const maxSize = isAudit ? this.maxAuditSize : this.maxLogSize;

    try {
      // Check log file size and rotate if necessary
      try {
        const stats = await fs.stat(logPath);
        if (stats.size > maxSize) {
          await this.rotateLog(logPath);
        }
      } catch {
        // File doesn't exist yet, that's okay
      }

      // Write log entry
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(logPath, logLine);
    } catch (error) {
      // Fallback to console logging
      console.error('Failed to write to log file:', error);
      this.consoleLog(entry);
    }
  }

  private async rotateLog(logPath: string): Promise<void> {
    try {
      const backupPath = `${logPath}.${Date.now()}.bak`;
      await fs.rename(logPath, backupPath);
      
      // Keep only the last 5 backup files
      const logDir = path.dirname(logPath);
      const logName = path.basename(logPath);
      const files = await fs.readdir(logDir);
      
      const backupFiles = files
        .filter(file => file.startsWith(`${logName}.`) && file.endsWith('.bak'))
        .sort()
        .reverse();
      
      // Remove old backup files (keep only 5)
      for (let i = 5; i < backupFiles.length; i++) {
        try {
          await fs.unlink(path.join(logDir, backupFiles[i]));
        } catch {
          // Ignore errors when cleaning up old files
        }
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private consoleLog(entry: LogEntry | AuditLogEntry): void {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase();
    const message = entry.message;
    
    let logMessage = `[${timestamp}] ${level}: ${message}`;
    
    if (entry.meta) {
      logMessage += ` ${JSON.stringify(entry.meta)}`;
    }

    switch (entry.level) {
      case 'error':
      case 'critical':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    const entry = this.createLogEntry('info', message, meta);
    this.writeLog(entry);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    const entry = this.createLogEntry('warn', message, meta);
    this.writeLog(entry);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    const entry = this.createLogEntry('error', message, meta);
    this.writeLog(entry);
  }

  critical(message: string, meta?: Record<string, unknown>): void {
    const entry = this.createLogEntry('critical', message, meta);
    this.writeLog(entry);
    
    // Also log to console immediately for critical issues
    this.consoleLog(entry);
  }

  audit(audit: SecurityAudit): void {
    const entry: AuditLogEntry = {
      ...this.createLogEntry(audit.severity, audit.message),
      audit,
    };
    
    this.writeLog(entry, true);
    
    // Log critical audits to console as well
    if (audit.severity === 'critical') {
      this.consoleLog(entry);
    }
  }
}

/**
 * Console-based security logger (fallback)
 */
class ConsoleSecurityLogger implements SecurityLogger {
  private createLogMessage(level: string, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] SECURITY-${level.toUpperCase()}: ${message}`;
    
    if (meta) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.log(this.createLogMessage('info', message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(this.createLogMessage('warn', message, meta));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(this.createLogMessage('error', message, meta));
  }

  critical(message: string, meta?: Record<string, unknown>): void {
    console.error(this.createLogMessage('critical', message, meta));
  }

  audit(audit: SecurityAudit): void {
    const level = audit.severity === 'critical' ? 'error' : 'warn';
    const meta = {
      operation: audit.operation,
      input: audit.input,
      details: audit.details,
    };
    
    const logMessage = this.createLogMessage(audit.severity, audit.message, meta);
    
    if (level === 'error') {
      console.error(logMessage);
    } else {
      console.warn(logMessage);
    }
  }
}

/**
 * Create security logger instance
 */
function createSecurityLogger(): SecurityLogger {
  // Try to use file logger, fall back to console logger
  if (process.env.NODE_ENV === 'test' || process.env.MIGR8_LOG_TO_CONSOLE === 'true') {
    return new ConsoleSecurityLogger();
  }
  
  return new FileSecurityLogger();
}

// Global security logger instance
export const securityLogger = createSecurityLogger();

/**
 * Log security event with structured data
 */
export function logSecurityEvent(
  operation: string,
  severity: SecurityAudit['severity'],
  message: string,
  details?: Record<string, unknown>
): void {
  const audit: SecurityAudit = {
    timestamp: new Date(),
    operation,
    input: details?.input,
    severity,
    message,
    details,
  };
  
  securityLogger.audit(audit);
}

/**
 * Log suspicious activity
 */
export function logSuspiciousActivity(
  input: unknown,
  pattern: string,
  description: string,
  context?: string
): void {
  logSecurityEvent(
    'suspicious-activity',
    'warning',
    `Suspicious activity detected: ${description}`,
    {
      input: typeof input === 'string' ? input.substring(0, 200) : input,
      pattern,
      context,
    }
  );
}

/**
 * Log validation failure
 */
export function logValidationFailure(
  input: unknown,
  schema: string,
  errors: string[],
  context?: string
): void {
  logSecurityEvent(
    'validation-failure',
    'warn',
    `Validation failed for ${schema}`,
    {
      input: typeof input === 'string' ? input.substring(0, 200) : input,
      schema,
      errors,
      context,
    }
  );
}

/**
 * Log file operation
 */
export function logFileOperation(
  operation: string,
  filePath: string,
  success: boolean,
  error?: string
): void {
  logSecurityEvent(
    'file-operation',
    success ? 'info' : 'error',
    `File operation ${operation}: ${success ? 'success' : 'failed'}`,
    {
      operation,
      filePath: filePath.substring(0, 200), // Truncate long paths
      success,
      error,
    }
  );
}

/**
 * Log migration operation
 */
export function logMigrationOperation(
  operation: string,
  component: string,
  packageFrom: string,
  packageTo: string,
  success: boolean,
  filesAffected?: number
): void {
  logSecurityEvent(
    'migration-operation',
    success ? 'info' : 'error',
    `Migration ${operation}: ${success ? 'success' : 'failed'}`,
    {
      operation,
      component,
      packageFrom,
      packageTo,
      success,
      filesAffected,
    }
  );
}

/**
 * Log backup operation
 */
export function logBackupOperation(
  operation: string,
  backupId: string,
  success: boolean,
  filesCount?: number,
  size?: number
): void {
  logSecurityEvent(
    'backup-operation',
    success ? 'info' : 'error',
    `Backup ${operation}: ${success ? 'success' : 'failed'}`,
    {
      operation,
      backupId,
      success,
      filesCount,
      size,
    }
  );
}

/**
 * Get recent security logs (for debugging/monitoring)
 */
export async function getRecentSecurityLogs(
  count: number = 100,
  logType: 'security' | 'audit' = 'security'
): Promise<LogEntry[]> {
  try {
    const logPath = logType === 'security' ? '.logs/security.log' : '.logs/audit.log';
    const content = await fs.readFile(logPath, 'utf-8');
    const lines = content.trim().split('\n');
    
    const logs: LogEntry[] = [];
    
    // Parse the last N lines
    const startIndex = Math.max(0, lines.length - count);
    for (let i = startIndex; i < lines.length; i++) {
      try {
        const log = JSON.parse(lines[i]);
        logs.push(log);
      } catch {
        // Skip invalid JSON lines
      }
    }
    
    return logs;
  } catch {
    // Return empty array if we can't read logs
    return [];
  }
}
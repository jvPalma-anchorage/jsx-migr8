/**
 * Secure configuration and context initialization with validation
 */

import { config } from 'dotenv';
import { getArgv } from '../cli/config';
import { validators } from './validators';
import { securityManager } from './security';
import { logSecurityEvent, logValidationFailure } from './logger';
import type { CLIArgs, Environment } from './schemas';
import { 
  validateRootPath, 
  validateBlacklist, 
  PathValidationError, 
  formatPathError,
  expandHomePath,
  isPathSafeForScanning
} from '../utils/path-validation';

// Load environment variables
config();

/**
 * Validate and secure CLI arguments
 */
export function getSecureCLIArgs(): CLIArgs {
  try {
    // Get fresh CLI arguments
    const originalArgv = getArgv();
    
    
    // Validate CLI arguments
    const result = validators.cliArgs(originalArgv);
    
    if (!result.success) {
      logValidationFailure(originalArgv, 'CLIArgs', result.errors || [result.error || 'Unknown error']);
      
      // Throw error for critical validation failures
      throw new Error(`Invalid CLI arguments: ${result.error}`);
    }

    logSecurityEvent(
      'cli-args-validation',
      'info',
      'CLI arguments validated successfully',
      { argsCount: Object.keys(result.data || {}).length }
    );

    return result.data!;
  } catch (error) {
    logSecurityEvent(
      'cli-args-validation',
      'error',
      'Failed to validate CLI arguments',
      { error: error instanceof Error ? error.message : String(error) }
    );
    
    // Return safe defaults if validation fails
    return {
      interactive: false,
      showProps: false,
      yolo: false,
      dryRun: false,
      info: false,
      debug: false,
      backup: false,
      listBackups: false,
      cleanupBackups: false,
      skipBackup: false,
      forceRollback: false,
      blacklist: [],
      backupTags: [],
    };
  }
}

/**
 * Validate and secure environment variables
 */
export function getSecureEnvironment(): Environment {
  try {
    // Extract relevant environment variables
    const envVars = {
      ROOT_PATH: process.env.ROOT_PATH,
      BLACKLIST: process.env.BLACKLIST,
      NODE_ENV: process.env.NODE_ENV,
      DEBUG: process.env.DEBUG,
      MIGR8_LOG_LEVEL: process.env.MIGR8_LOG_LEVEL,
      MIGR8_MAX_FILE_SIZE: process.env.MIGR8_MAX_FILE_SIZE,
      MIGR8_BACKUP_RETENTION_DAYS: process.env.MIGR8_BACKUP_RETENTION_DAYS,
    };

    // Validate environment variables
    const result = validators.environment(envVars);
    
    if (!result.success) {
      logValidationFailure(envVars, 'Environment', result.errors || [result.error || 'Unknown error']);
      
      // Log but don't throw for environment validation failures - use defaults
      logSecurityEvent(
        'environment-validation',
        'warn',
        'Environment validation failed, using defaults',
        { errors: result.errors }
      );
    }

    const validatedEnv = result.data || {
      NODE_ENV: 'development',
      MIGR8_LOG_LEVEL: 'info',
    };

    logSecurityEvent(
      'environment-validation',
      'info',
      'Environment variables processed',
      { validated: result.success }
    );

    return validatedEnv;
  } catch (error) {
    logSecurityEvent(
      'environment-validation',
      'error',
      'Failed to validate environment variables',
      { error: error instanceof Error ? error.message : String(error) }
    );
    
    // Return safe defaults
    return {
      NODE_ENV: 'development',
      MIGR8_LOG_LEVEL: 'info',
    };
  }
}

/**
 * Get secure root path with comprehensive validation
 */
export function getSecureRootPath(args: CLIArgs, env: Environment): string {
  try {
    // Determine root path from args or env
    let rootPath = args.root || env.ROOT_PATH || process.cwd();
    
    // Expand home directory if needed
    rootPath = expandHomePath(rootPath);
    
    // Check if path is safe for scanning
    if (!isPathSafeForScanning(rootPath)) {
      throw new PathValidationError(
        'INVALID_PATH' as any,
        rootPath,
        'Root path is not safe for scanning (system directory detected)',
        [
          'Choose a project directory instead of a system directory',
          'Use a directory like ~/projects or /home/user/workspace',
          'Avoid scanning system directories like /etc, /sys, or C:\\Windows'
        ]
      );
    }
    
    // Validate the path with comprehensive checks
    const pathValidation = validateRootPath(rootPath);
    
    if (!pathValidation.valid) {
      // Log the formatted error for better user experience
      console.error(formatPathError(pathValidation.error!));
      
      throw new Error(`Root path validation failed: ${pathValidation.error!.message}`);
    }

    logSecurityEvent(
      'root-path-validation',
      'info',
      'Root path validated successfully',
      { 
        rootPath: pathValidation.resolvedPath!.substring(0, 100),
        permissions: pathValidation.metadata?.permissions
      }
    );

    return pathValidation.resolvedPath!;
  } catch (error) {
    if (error instanceof PathValidationError) {
      // Re-throw path validation errors with formatted message
      console.error(formatPathError(error));
      throw error;
    }
    
    logSecurityEvent(
      'root-path-validation',
      'error',
      'Failed to validate root path',
      { error: error instanceof Error ? error.message : String(error) }
    );
    
    // Only fallback to cwd if it's a safe path
    const fallbackPath = process.cwd();
    if (isPathSafeForScanning(fallbackPath)) {
      console.warn(`Warning: Using current directory as fallback: ${fallbackPath}`);
      return fallbackPath;
    } else {
      throw new Error('No safe root path available. Please specify a valid project directory.');
    }
  }
}

/**
 * Get secure blacklist with comprehensive validation
 */
export function getSecureBlacklist(args: CLIArgs, env: Environment, rootPath?: string): string[] {
  try {
    // Get blacklist from args or env
    let blacklist: string[] = [];
    
    if (args.blacklist && args.blacklist.length > 0) {
      blacklist = args.blacklist;
    } else if (env.BLACKLIST) {
      blacklist = env.BLACKLIST.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    // Validate blacklist entries comprehensively
    const blacklistValidation = validateBlacklist(blacklist, rootPath);
    
    if (!blacklistValidation.valid) {
      console.warn('⚠️ Blacklist validation issues found:');
      blacklistValidation.invalidEntries.forEach(invalid => {
        console.warn(`   • "${invalid.entry}": ${invalid.reason}`);
      });
      
      if (blacklistValidation.suggestions.length > 0) {
        console.info('\n💡 Suggestions:');
        blacklistValidation.suggestions.forEach(suggestion => {
          console.info(`   • ${suggestion}`);
        });
      }
    }

    // Show suggested additions if any
    if (blacklistValidation.suggestedAdditions.length > 0) {
      console.info(`\n📁 Consider adding these directories to your blacklist: ${blacklistValidation.suggestedAdditions.join(', ')}`);
    }

    // Use validated entries, fallback to defaults if empty
    let finalBlacklist = blacklistValidation.validEntries;
    
    if (finalBlacklist.length === 0) {
      console.warn('⚠️ No valid blacklist entries found, using defaults');
      finalBlacklist = [
        'node_modules',
        '.git',
        'dist',
        'build',
        'out',
        '.cache',
        'coverage',
        '.nyc_output'
      ];
    }

    logSecurityEvent(
      'blacklist-validation',
      'info',
      'Blacklist validation completed',
      { 
        validEntries: finalBlacklist.length,
        invalidEntries: blacklistValidation.invalidEntries.length,
        suggestions: blacklistValidation.suggestions.length
      }
    );

    return finalBlacklist;
  } catch (error) {
    logSecurityEvent(
      'blacklist-validation',
      'error',
      'Failed to validate blacklist, using defaults',
      { error: error instanceof Error ? error.message : String(error) }
    );
    
    console.warn(`⚠️ Blacklist validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.warn('Using default blacklist entries');
    
    // Return safe defaults
    return ['node_modules', '.git', 'dist', 'build', 'out'];
  }
}

/**
 * Secure context initialization
 */
export interface SecureContext {
  rootPath: string;
  blacklist: string[];
  args: CLIArgs;
  env: Environment;
}

/**
 * Initialize secure context with full validation
 */
export function initSecureContext(): SecureContext {
  try {
    logSecurityEvent('context-init', 'info', 'Initializing secure context');

    // Validate CLI arguments
    const args = getSecureCLIArgs();
    
    // Validate environment
    const env = getSecureEnvironment();
    
    // Get secure root path
    const rootPath = getSecureRootPath(args, env);
    
    // Get secure blacklist (pass rootPath for better validation)
    const blacklist = getSecureBlacklist(args, env, rootPath);

    const context: SecureContext = {
      rootPath,
      blacklist,
      args,
      env,
    };

    // Audit the context initialization
    securityManager.audit(
      'context-init',
      { rootPath: rootPath.substring(0, 100), blacklistCount: blacklist.length },
      'info',
      'Secure context initialized successfully'
    );

    return context;
  } catch (error) {
    logSecurityEvent(
      'context-init',
      'error',
      'Failed to initialize secure context',
      { error: error instanceof Error ? error.message : String(error) }
    );
    
    // Return minimal safe context
    return {
      rootPath: process.cwd(),
      blacklist: ['node_modules', '.git'],
      args: {
        interactive: false,
        showProps: false,
        yolo: false,
        dryRun: false,
        info: false,
        debug: false,
        backup: false,
        listBackups: false,
        cleanupBackups: false,
        skipBackup: false,
        forceRollback: false,
        blacklist: [],
        backupTags: [],
      },
      env: {
        NODE_ENV: 'development',
        MIGR8_LOG_LEVEL: 'info',
      },
    };
  }
}

/**
 * Validate file path for secure operations
 */
export function validateSecureFilePath(filePath: string, baseDir?: string): string {
  const pathValidation = securityManager.validatePath(filePath, {
    allowAbsolute: true,
    allowRelative: true,
    allowTraversal: false,
    baseDir,
    maxDepth: 20,
    allowedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt'],
  });

  if (!pathValidation.valid) {
    throw new Error(`Invalid file path: ${pathValidation.error}`);
  }

  return pathValidation.sanitized!;
}

/**
 * Validate migration rules file path
 */
export function validateMigrationRulesPath(filePath: string): string {
  const pathValidation = securityManager.validatePath(filePath, {
    allowAbsolute: true,
    allowRelative: true,
    allowTraversal: false,
    maxDepth: 10,
    allowedExtensions: ['.json'],
    blockedPaths: ['node_modules', '.git', 'system32', 'windows', 'etc'],
  });

  if (!pathValidation.valid) {
    throw new Error(`Invalid migration rules file path: ${pathValidation.error}`);
  }

  return pathValidation.sanitized!;
}

/**
 * Validate backup path
 */
export function validateBackupPath(filePath: string, baseDir: string): string {
  const pathValidation = securityManager.validatePath(filePath, {
    allowAbsolute: false,
    allowRelative: true,
    allowTraversal: false,
    baseDir,
    maxDepth: 5,
    blockedPaths: ['..', '.git', 'node_modules'],
  });

  if (!pathValidation.valid) {
    throw new Error(`Invalid backup path: ${pathValidation.error}`);
  }

  return pathValidation.sanitized!;
}

// Export the secure context as a singleton
let _secureContext: SecureContext | null = null;

export function getSecureContext(): SecureContext {
  if (!_secureContext) {
    _secureContext = initSecureContext();
  }
  return _secureContext;
}

export function resetSecureContext(): void {
  _secureContext = null;
}
/**
 * Comprehensive path validation and error handling utilities for jsx-migr8
 * Provides robust validation for root paths, blacklist directories, and file system operations
 */

import { existsSync, statSync, accessSync, constants, readdirSync } from "node:fs";
import { resolve, dirname, join, relative, isAbsolute, sep } from "node:path";
import { homedir, platform } from "node:os";
import chalk from "chalk";
import { logSecurityEvent } from "../validation";

/**
 * Path validation error types
 */
export enum PathErrorType {
  NOT_FOUND = "NOT_FOUND",
  NOT_DIRECTORY = "NOT_DIRECTORY", 
  NO_READ_PERMISSION = "NO_READ_PERMISSION",
  NO_WRITE_PERMISSION = "NO_WRITE_PERMISSION",
  INVALID_PATH = "INVALID_PATH",
  PATH_TOO_DEEP = "PATH_TOO_DEEP",
  BLACKLIST_INVALID = "BLACKLIST_INVALID",
  UNSAFE_TRAVERSAL = "UNSAFE_TRAVERSAL",
}

/**
 * Path validation error class
 */
export class PathValidationError extends Error {
  constructor(
    public readonly type: PathErrorType,
    public readonly path: string,
    message: string,
    public readonly suggestions: string[] = [],
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "PathValidationError";
    
    // Log security event for path validation failures
    logSecurityEvent(
      'path-validation-error',
      'error',
      `Path validation failed: ${type}`,
      { 
        path: path.substring(0, 100), 
        errorType: type,
        suggestions: suggestions.length
      }
    );
  }
}

/**
 * Path validation options
 */
export interface PathValidationOptions {
  /** Allow relative paths */
  allowRelative?: boolean;
  /** Check read permissions */
  checkRead?: boolean;
  /** Check write permissions */
  checkWrite?: boolean;
  /** Maximum allowed path depth */
  maxDepth?: number;
  /** Custom base directory for relative path resolution */
  baseDir?: string;
  /** Whether to resolve symlinks */
  resolveSymlinks?: boolean;
}

/**
 * Path validation result
 */
export interface PathValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Resolved absolute path if valid */
  resolvedPath?: string;
  /** Validation error if invalid */
  error?: PathValidationError;
  /** Additional metadata */
  metadata?: {
    isSymlink: boolean;
    size?: number;
    permissions: {
      read: boolean;
      write: boolean;
      execute: boolean;
    };
  };
}

/**
 * Blacklist validation result
 */
export interface BlacklistValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validated blacklist entries */
  validEntries: string[];
  /** Invalid entries with reasons */
  invalidEntries: Array<{ entry: string; reason: string }>;
  /** Suggestions for improvement */
  suggestions: string[];
  /** Detected directories that should be blacklisted */
  suggestedAdditions: string[];
}

/**
 * Validate a single path with comprehensive checks
 */
export function validatePath(
  inputPath: string,
  options: PathValidationOptions = {}
): PathValidationResult {
  const {
    allowRelative = false,
    checkRead = true,
    checkWrite = false,
    maxDepth = 50,
    baseDir = process.cwd(),
    resolveSymlinks = true,
  } = options;

  try {
    // Basic path validation
    if (!inputPath || typeof inputPath !== "string") {
      return {
        valid: false,
        error: new PathValidationError(
          PathErrorType.INVALID_PATH,
          inputPath || "",
          "Path must be a non-empty string",
          ["Provide a valid file or directory path"]
        ),
      };
    }

    // Trim and normalize path
    const trimmedPath = inputPath.trim();
    if (trimmedPath.length === 0) {
      return {
        valid: false,
        error: new PathValidationError(
          PathErrorType.INVALID_PATH,
          inputPath,
          "Path cannot be empty",
          ["Provide a valid file or directory path"]
        ),
      };
    }

    // Check for path traversal attempts
    if (trimmedPath.includes("..") && !allowRelative) {
      return {
        valid: false,
        error: new PathValidationError(
          PathErrorType.UNSAFE_TRAVERSAL,
          trimmedPath,
          "Path traversal detected in path",
          [
            "Use absolute paths only",
            "Remove '..' from the path",
            "Specify the full path without relative components"
          ]
        ),
      };
    }

    // Resolve the path
    let resolvedPath: string;
    if (isAbsolute(trimmedPath)) {
      resolvedPath = resolve(trimmedPath);
    } else if (allowRelative) {
      resolvedPath = resolve(baseDir, trimmedPath);
    } else {
      return {
        valid: false,
        error: new PathValidationError(
          PathErrorType.INVALID_PATH,
          trimmedPath,
          "Relative paths are not allowed",
          [
            "Use an absolute path instead",
            `Convert to absolute: ${resolve(baseDir, trimmedPath)}`,
            "Specify the full path from the root directory"
          ]
        ),
      };
    }

    // Check path depth
    const pathDepth = resolvedPath.split(sep).length;
    if (pathDepth > maxDepth) {
      return {
        valid: false,
        error: new PathValidationError(
          PathErrorType.PATH_TOO_DEEP,
          resolvedPath,
          `Path is too deep (${pathDepth} levels, max ${maxDepth})`,
          [
            "Use a shorter path",
            "Move the project to a directory closer to the root",
            `Consider increasing maxDepth if needed (current: ${maxDepth})`
          ]
        ),
      };
    }

    // Check if path exists
    if (!existsSync(resolvedPath)) {
      const parentDir = dirname(resolvedPath);
      const suggestions = ["Check the path spelling"];
      
      if (existsSync(parentDir)) {
        suggestions.push(`Parent directory exists: ${parentDir}`);
        suggestions.push("Check if the directory name is correct");
      } else {
        suggestions.push("Create the missing directories first");
        suggestions.push(`mkdir -p "${resolvedPath}"`);
      }

      return {
        valid: false,
        error: new PathValidationError(
          PathErrorType.NOT_FOUND,
          resolvedPath,
          `Path does not exist: ${resolvedPath}`,
          suggestions
        ),
      };
    }

    // Get path stats
    const stats = statSync(resolvedPath);
    
    // Check if it's a directory (for most jsx-migr8 use cases)
    if (!stats.isDirectory() && !stats.isFile()) {
      return {
        valid: false,
        error: new PathValidationError(
          PathErrorType.NOT_DIRECTORY,
          resolvedPath,
          `Path is not a file or directory: ${resolvedPath}`,
          [
            "Ensure the path points to a valid file or directory",
            "Check for symbolic links or special files"
          ]
        ),
      };
    }

    // Check permissions
    const permissions = {
      read: false,
      write: false,
      execute: false,
    };

    try {
      if (checkRead) {
        accessSync(resolvedPath, constants.R_OK);
        permissions.read = true;
      }
    } catch {
      return {
        valid: false,
        error: new PathValidationError(
          PathErrorType.NO_READ_PERMISSION,
          resolvedPath,
          `No read permission for path: ${resolvedPath}`,
          [
            `chmod +r "${resolvedPath}"`,
            "Check file/directory ownership",
            "Run with appropriate permissions",
            platform() === "win32" ? "Check Windows ACL permissions" : "Check UNIX permissions"
          ]
        ),
      };
    }

    try {
      if (checkWrite) {
        accessSync(resolvedPath, constants.W_OK);
        permissions.write = true;
      }
    } catch {
      return {
        valid: false,
        error: new PathValidationError(
          PathErrorType.NO_WRITE_PERMISSION,
          resolvedPath,
          `No write permission for path: ${resolvedPath}`,
          [
            `chmod +w "${resolvedPath}"`,
            "Check file/directory ownership", 
            "Run with appropriate permissions",
            platform() === "win32" ? "Check Windows ACL permissions" : "Check UNIX permissions"
          ]
        ),
      };
    }

    try {
      accessSync(resolvedPath, constants.X_OK);
      permissions.execute = true;
    } catch {
      // Execute permission is not always required
    }

    // Build metadata
    const metadata = {
      isSymlink: stats.isSymbolicLink(),
      size: stats.isFile() ? stats.size : undefined,
      permissions,
    };

    logSecurityEvent(
      'path-validation-success',
      'info',
      'Path validation successful',
      { 
        path: resolvedPath.substring(0, 100),
        isDirectory: stats.isDirectory(),
        permissions: Object.keys(permissions).filter(p => permissions[p as keyof typeof permissions])
      }
    );

    return {
      valid: true,
      resolvedPath,
      metadata,
    };
  } catch (error) {
    return {
      valid: false,
      error: new PathValidationError(
        PathErrorType.INVALID_PATH,
        inputPath,
        `Path validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        [
          "Check if the path is accessible",
          "Verify file system permissions",
          "Ensure the path is correctly formatted"
        ],
        error instanceof Error ? error : undefined
      ),
    };
  }
}

/**
 * Validate root path specifically for jsx-migr8 operations
 */
export function validateRootPath(rootPath: string): PathValidationResult {
  const result = validatePath(rootPath, {
    allowRelative: false,
    checkRead: true,
    checkWrite: false, // Don't require write to scan
    maxDepth: 50,
    resolveSymlinks: true,
  });

  if (!result.valid) {
    return result;
  }

  // Additional checks for root paths
  try {
    const stats = statSync(result.resolvedPath!);
    
    if (!stats.isDirectory()) {
      return {
        valid: false,
        error: new PathValidationError(
          PathErrorType.NOT_DIRECTORY,
          result.resolvedPath!,
          "Root path must be a directory",
          [
            "Specify a directory path instead of a file",
            "Use the parent directory if you meant to specify a directory"
          ]
        ),
      };
    }

    // Try to read directory contents to ensure it's accessible
    readdirSync(result.resolvedPath!, { withFileTypes: true });
    
    logSecurityEvent(
      'root-path-validation-success',
      'info',
      'Root path validation successful',
      { rootPath: result.resolvedPath!.substring(0, 100) }
    );

    return result;
  } catch (error) {
    return {
      valid: false,
      error: new PathValidationError(
        PathErrorType.NO_READ_PERMISSION,
        result.resolvedPath!,
        `Cannot access root directory: ${error instanceof Error ? error.message : "Unknown error"}`,
        [
          "Check directory permissions",
          "Ensure the directory is not empty or corrupted",
          "Try running with elevated permissions if needed"
        ],
        error instanceof Error ? error : undefined
      ),
    };
  }
}

/**
 * Validate blacklist entries
 */
export function validateBlacklist(
  blacklist: string[],
  rootPath?: string
): BlacklistValidationResult {
  const validEntries: string[] = [];
  const invalidEntries: Array<{ entry: string; reason: string }> = [];
  const suggestions: string[] = [];
  const suggestedAdditions: string[] = [];

  // Common directories that should typically be blacklisted
  const commonBlacklistPatterns = [
    "node_modules",
    ".git",
    ".svn",
    ".hg", 
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    "coverage",
    ".nyc_output",
    ".cache",
    "tmp",
    "temp",
    "logs",
    ".DS_Store",
    "Thumbs.db",
    "storybook-static",
  ];

  // Validate each blacklist entry
  for (const entry of blacklist) {
    if (!entry || typeof entry !== "string") {
      invalidEntries.push({
        entry: String(entry),
        reason: "Entry must be a non-empty string"
      });
      continue;
    }

    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      invalidEntries.push({
        entry,
        reason: "Entry cannot be empty"
      });
      continue;
    }

    // Check for suspicious patterns
    if (trimmed.includes("..")) {
      invalidEntries.push({
        entry: trimmed,
        reason: "Path traversal patterns are not allowed"
      });
      continue;
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*\0]/;
    if (invalidChars.test(trimmed)) {
      invalidEntries.push({
        entry: trimmed,
        reason: "Contains invalid characters"
      });
      continue;
    }

    // Check length
    if (trimmed.length > 255) {
      invalidEntries.push({
        entry: trimmed.substring(0, 50) + "...",
        reason: "Entry too long (max 255 characters)"
      });
      continue;
    }

    validEntries.push(trimmed);
  }

  // If root path provided, check for common directories that should be blacklisted
  if (rootPath) {
    try {
      const rootResult = validateRootPath(rootPath);
      if (rootResult.valid && rootResult.resolvedPath) {
        const entries = readdirSync(rootResult.resolvedPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const dirName = entry.name;
            
            // Check if this common directory should be blacklisted but isn't
            if (commonBlacklistPatterns.includes(dirName) && !validEntries.includes(dirName)) {
              suggestedAdditions.push(dirName);
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors when scanning for suggestions
    }
  }

  // Generate suggestions
  if (validEntries.length === 0 && invalidEntries.length > 0) {
    suggestions.push("Add at least one valid blacklist entry");
    suggestions.push("Common entries: node_modules, .git, dist, build");
  }

  if (suggestedAdditions.length > 0) {
    suggestions.push(`Consider adding these directories: ${suggestedAdditions.slice(0, 3).join(", ")}`);
  }

  if (!validEntries.includes("node_modules")) {
    suggestions.push("Consider adding 'node_modules' to improve scan performance");
  }

  // Remove duplicates from valid entries
  const uniqueValidEntries = Array.from(new Set(validEntries));

  logSecurityEvent(
    'blacklist-validation',
    'info',
    'Blacklist validation completed',
    { 
      validEntries: uniqueValidEntries.length,
      invalidEntries: invalidEntries.length,
      suggestions: suggestions.length
    }
  );

  return {
    valid: invalidEntries.length === 0,
    validEntries: uniqueValidEntries,
    invalidEntries,
    suggestions,
    suggestedAdditions,
  };
}

/**
 * Validate file system permissions for a directory
 */
export function validateFileSystemPermissions(dirPath: string): {
  canRead: boolean;
  canWrite: boolean;
  canExecute: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let canRead = false;
  let canWrite = false;
  let canExecute = false;

  try {
    // Test read permission
    try {
      accessSync(dirPath, constants.R_OK);
      canRead = true;
    } catch {
      errors.push("No read permission");
      suggestions.push(`chmod +r "${dirPath}"`);
    }

    // Test write permission  
    try {
      accessSync(dirPath, constants.W_OK);
      canWrite = true;
    } catch {
      errors.push("No write permission");
      suggestions.push(`chmod +w "${dirPath}"`);
    }

    // Test execute permission
    try {
      accessSync(dirPath, constants.X_OK);
      canExecute = true;
    } catch {
      errors.push("No execute permission");
      suggestions.push(`chmod +x "${dirPath}"`);
    }

    // Additional platform-specific suggestions
    if (errors.length > 0) {
      if (platform() === "win32") {
        suggestions.push("Check Windows file/folder permissions");
        suggestions.push("Run as Administrator if needed");
      } else {
        suggestions.push("Check file ownership with 'ls -la'");
        suggestions.push("Use 'sudo' if administrative access is needed");
      }
    }
  } catch (error) {
    errors.push(`Permission check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    suggestions.push("Verify the directory exists and is accessible");
  }

  return {
    canRead,
    canWrite,
    canExecute,
    errors,
    suggestions,
  };
}

/**
 * Generate user-friendly error messages with actionable suggestions
 */
export function formatPathError(error: PathValidationError): string {
  const lines: string[] = [];
  
  lines.push(chalk.red(`❌ ${error.message}`));
  lines.push(chalk.gray(`   Path: ${error.path}`));
  
  if (error.suggestions.length > 0) {
    lines.push(chalk.yellow("\n💡 Suggestions:"));
    error.suggestions.forEach(suggestion => {
      lines.push(chalk.gray(`   • ${suggestion}`));
    });
  }

  if (error.cause) {
    lines.push(chalk.gray(`\n🔍 Details: ${error.cause.message}`));
  }

  return lines.join("\n");
}

/**
 * Check if a path is safe for jsx-migr8 operations
 */
export function isPathSafeForScanning(path: string): boolean {
  // Basic safety checks
  const dangerous = [
    "/etc",
    "/sys", 
    "/proc",
    "/dev",
    "C:\\Windows",
    "C:\\System32",
    "/System",
    "/Library/System",
  ];

  const normalizedPath = resolve(path).toLowerCase();
  
  return !dangerous.some(dangerPath => 
    normalizedPath.startsWith(dangerPath.toLowerCase())
  );
}

/**
 * Expand user home directory in paths
 */
export function expandHomePath(inputPath: string): string {
  if (inputPath.startsWith("~/")) {
    return join(homedir(), inputPath.slice(2));
  }
  return inputPath;
}

/**
 * Get relative path with safety checks
 */
export function getSafeRelativePath(from: string, to: string): string {
  try {
    const relativePath = relative(from, to);
    
    // Ensure the relative path doesn't traverse outside the base
    if (relativePath.startsWith("..")) {
      throw new Error("Path traverses outside base directory");
    }
    
    return relativePath;
  } catch (error) {
    throw new PathValidationError(
      PathErrorType.UNSAFE_TRAVERSAL,
      to,
      `Cannot create safe relative path: ${error instanceof Error ? error.message : "Unknown error"}`,
      [
        "Ensure the target path is within the base directory",
        "Use absolute paths if needed"
      ]
    );
  }
}
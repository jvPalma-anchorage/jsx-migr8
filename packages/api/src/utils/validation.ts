import * as fs from 'fs';
import * as path from 'path';

export interface PathValidationResult {
  valid: boolean;
  error?: string;
  suggestions?: string[];
}

export function validateProjectPath(projectPath: string): PathValidationResult {
  // Check if path is provided
  if (!projectPath || typeof projectPath !== 'string') {
    return {
      valid: false,
      error: 'Project path is required',
      suggestions: ['Provide a valid absolute path to your project directory']
    };
  }

  // Check if path is absolute
  if (!path.isAbsolute(projectPath)) {
    return {
      valid: false,
      error: 'Project path must be absolute',
      suggestions: [
        `Convert to absolute path: ${path.resolve(projectPath)}`,
        'Use full path starting with /'
      ]
    };
  }

  // Check if directory exists
  try {
    const stats = fs.statSync(projectPath);
    if (!stats.isDirectory()) {
      return {
        valid: false,
        error: 'Path exists but is not a directory',
        suggestions: ['Ensure the path points to a directory, not a file']
      };
    }
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return {
        valid: false,
        error: 'Directory does not exist',
        suggestions: [
          'Create the directory first',
          'Check for typos in the path',
          'Ensure you have permission to access the parent directory'
        ]
      };
    }
    return {
      valid: false,
      error: `Cannot access directory: ${(error as Error).message}`,
      suggestions: ['Check file system permissions', 'Ensure the path is accessible']
    };
  }

  // Check read permissions
  try {
    fs.accessSync(projectPath, fs.constants.R_OK);
  } catch (error) {
    return {
      valid: false,
      error: 'No read permission for directory',
      suggestions: [
        'Check directory permissions',
        'Run with appropriate user privileges',
        `Try: chmod +r "${projectPath}"`
      ]
    };
  }

  // Check if it's a likely code project
  const hasPackageJson = fs.existsSync(path.join(projectPath, 'package.json'));
  const hasSrcDir = fs.existsSync(path.join(projectPath, 'src'));
  const hasGitDir = fs.existsSync(path.join(projectPath, '.git'));
  
  if (!hasPackageJson && !hasSrcDir && !hasGitDir) {
    return {
      valid: true,
      suggestions: [
        'Warning: Directory does not appear to be a typical JavaScript/TypeScript project',
        'No package.json, src directory, or .git directory found',
        'Analysis may not find any components'
      ]
    };
  }

  return { valid: true };
}

export function validateMigrationRules(rules: any): PathValidationResult {
  if (!rules || typeof rules !== 'object') {
    return {
      valid: false,
      error: 'Migration rules must be an object'
    };
  }

  if (!rules.lookup || typeof rules.lookup !== 'object') {
    return {
      valid: false,
      error: 'Migration rules must have a lookup object'
    };
  }

  if (!rules.migr8rules || !Array.isArray(rules.migr8rules)) {
    return {
      valid: false,
      error: 'Migration rules must have a migr8rules array'
    };
  }

  return { valid: true };
}
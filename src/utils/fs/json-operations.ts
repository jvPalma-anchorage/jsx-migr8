/**
 * JSON file operations utilities
 * Functions for reading and writing JSON files
 */
import { readFileSync, promises } from "node:fs";
import { readFileAsync, writeFileAsync } from "./async-file-operations";
import { FileOperationError } from "./error-handling";
import { 
  securityManager, 
  validators, 
  sanitizers, 
  logSecurityEvent,
  validateSecureFilePath,
  validateMigrationRulesPath
} from "../../validation";

/**
 * Read and parse JSON file synchronously with security validation
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON object or undefined if failed
 */
export const getJsonFile = <T>(filePath: string): T | undefined => {
  try {
    // Validate the file path first
    const pathValidation = securityManager.validatePath(filePath, {
      allowAbsolute: true,
      allowRelative: true,
      allowTraversal: false,
      allowedExtensions: ['.json'],
      maxDepth: 20
    });

    if (!pathValidation.valid) {
      logSecurityEvent(
        'json-path-validation',
        'warn',
        `Invalid JSON file path: ${pathValidation.error}`,
        { filePath, error: pathValidation.error }
      );
      return undefined;
    }

    const safePath = pathValidation.sanitized!;

    // Check rate limit
    const rateLimit = securityManager.checkRateLimit('fileOperations');
    if (!rateLimit.allowed) {
      logSecurityEvent(
        'json-rate-limit',
        'warn',
        'Rate limit exceeded for JSON file operations',
        { filePath: safePath }
      );
      return undefined;
    }

    // Check for suspicious patterns in path
    securityManager.detectSuspiciousActivity(filePath, 'json-file-read');

    const content = readFileSync(safePath, "utf8");
    
    // Sanitize JSON content before parsing
    const sanitizedContent = sanitizers.jsonString(content);
    
    // Validate JSON structure
    const validationResult = validators.jsonString(sanitizedContent);
    if (!validationResult.success) {
      logSecurityEvent(
        'json-validation',
        'warn',
        `Invalid JSON format in file: ${safePath}`,
        { error: validationResult.error, filePath: safePath }
      );
      return undefined;
    }

    const parsed = validationResult.data as T;
    
    logSecurityEvent(
      'json-read',
      'info',
      'JSON file read successfully',
      { filePath: safePath, size: content.length }
    );
    
    return parsed;
  } catch (error: any) {
    // Provide more specific error context
    if (error.code === 'ENOENT') {
      console.warn(`JSON file not found: ${filePath}`);
    } else if (error instanceof SyntaxError) {
      console.warn(`Invalid JSON format in file: ${filePath} - ${error.message}`);
    } else if (error.code === 'EACCES') {
      console.warn(`Permission denied reading JSON file: ${filePath}`);
    } else {
      console.warn(`Failed to read JSON file ${filePath}:`, error.message || error);
    }
    
    logSecurityEvent(
      'json-read-error',
      'error',
      'Failed to read JSON file',
      { filePath, error: error.message || error }
    );
    
    return undefined;
  }
};

/**
 * Read and parse JSON file asynchronously with security validation
 * @param filePath - Path to the JSON file
 * @returns Promise resolving to parsed JSON object or undefined if failed
 */
export async function getJsonFileAsync<T>(
  filePath: string,
): Promise<T | undefined> {
  return securityManager.secureFileOperation(
    'readJSONAsync',
    filePath,
    async (safePath) => {
      try {
        const content = await readFileAsync(safePath);
        
        // Sanitize JSON content before parsing
        const sanitizedContent = sanitizers.jsonString(content);
        
        // Validate JSON structure
        const validationResult = validators.jsonString(sanitizedContent);
        if (!validationResult.success) {
          logSecurityEvent(
            'json-validation-async',
            'warn',
            `Invalid JSON format in file: ${safePath}`,
            { error: validationResult.error, filePath: safePath }
          );
          return undefined;
        }

        const parsed = validationResult.data as T;
        
        logSecurityEvent(
          'json-read-async',
          'info',
          'JSON file read successfully (async)',
          { filePath: safePath, size: content.length }
        );
        
        return parsed;
      } catch (error: any) {
        if (error instanceof FileOperationError) {
          // Enhanced error already provided by readFileAsync
          console.warn(`JSON file operation failed: ${error.message}`);
        } else if (error instanceof SyntaxError) {
          console.warn(`Invalid JSON format in file: ${safePath} - ${error.message}`);
        } else {
          console.warn(`Failed to read JSON file ${safePath}:`, error.message || error);
        }
        
        logSecurityEvent(
          'json-read-error-async',
          'error',
          'Failed to read JSON file (async)',
          { filePath: safePath, error: error.message || error }
        );
        
        return undefined;
      }
    },
    {
      allowAbsolute: true,
      allowRelative: true,
      allowTraversal: false,
      allowedExtensions: ['.json'],
      maxDepth: 20
    }
  ).catch((error) => {
    console.warn(`Security validation failed for JSON file ${filePath}:`, error.message);
    return undefined;
  });
}

/**
 * Write JSON data to file asynchronously with security validation
 * @param filePath - Path where JSON file will be written
 * @param data - Data to serialize and write
 * @param pretty - Whether to format JSON with indentation (default: true)
 * @throws {FileOperationError} When file writing fails
 * @throws {TypeError} When data cannot be serialized to JSON
 */
export async function writeJsonFileAsync<T>(
  filePath: string,
  data: T,
  pretty = true,
): Promise<void> {
  return securityManager.secureFileOperation(
    'writeJSON',
    filePath,
    async (safePath) => {
      try {
        // Check for suspicious patterns in the data
        const dataStr = JSON.stringify(data);
        securityManager.detectSuspiciousActivity(dataStr, 'json-write-data');
        
        // Sanitize the data if it contains migration rules
        let sanitizedData = data;
        if (typeof data === 'object' && data !== null && 'migr8rules' in data) {
          // This looks like a migration rules file - validate it
          const rulesValidation = validators.migr8Rules(data);
          if (!rulesValidation.success) {
            logSecurityEvent(
              'json-write-validation',
              'error',
              'Invalid migration rules data',
              { filePath: safePath, errors: rulesValidation.errors }
            );
            throw new Error(`Invalid migration rules: ${rulesValidation.error}`);
          }
          sanitizedData = rulesValidation.data as T;
        }
        
        const content = pretty ? JSON.stringify(sanitizedData, null, 2) : JSON.stringify(sanitizedData);
        
        await writeFileAsync(safePath, content);
        
        logSecurityEvent(
          'json-write',
          'info',
          'JSON file written successfully',
          { filePath: safePath, size: content.length }
        );
      } catch (error: any) {
        if (error instanceof FileOperationError) {
          throw error; // Re-throw enhanced file operation errors
        }
        if (error instanceof TypeError && error.message.includes('circular')) {
          throw new Error(`Cannot serialize data to JSON for ${safePath}: Circular reference detected`);
        }
        if (error.name === 'TypeError' || error instanceof TypeError) {
          throw new Error(`Cannot serialize data to JSON for ${safePath}: ${error.message}`);
        }
        
        logSecurityEvent(
          'json-write-error',
          'error',
          'Failed to write JSON file',
          { filePath: safePath, error: error.message || error }
        );
        
        throw new FileOperationError(
          "writeJSON",
          safePath,
          error
        );
      }
    },
    {
      allowAbsolute: true,
      allowRelative: true,
      allowTraversal: false,
      allowedExtensions: ['.json'],
      maxDepth: 20
    }
  );
}

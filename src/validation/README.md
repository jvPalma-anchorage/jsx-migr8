# Validation & Security API Reference

This directory contains the comprehensive validation and security system for jsx-migr8. This system provides input validation, sanitization, security monitoring, and protection against various attack vectors.

## Quick Start

```typescript
import { 
  validators, 
  sanitizers, 
  securityManager,
  getSecureContext 
} from './validation';

// Validate user input
const result = validators.userInput(userInput);
if (!result.success) {
  console.error('Invalid input:', result.error);
  return;
}

// Sanitize component name
const safeName = sanitizers.componentName(rawName);

// Secure file operation
await securityManager.secureFileOperation(
  'readConfig',
  filePath,
  async (safePath) => {
    return await fs.readFile(safePath, 'utf8');
  }
);
```

## Core Modules

### schemas.ts
Zod schemas for all input validation:
- `CLIArgsSchema` - Command line arguments
- `EnvironmentSchema` - Environment variables  
- `Migr8RulesSchema` - Migration rule files
- `BackupMetadataSchema` - Backup metadata
- `UserInputSchema` - Interactive user input

### security.ts
Central security manager and utilities:
- `SecurityManager` class - Main security orchestrator
- `validatePath()` - Path traversal protection
- `detectSuspiciousActivity()` - Pattern-based threat detection
- `secureFileOperation()` - Protected file operations
- `checkRateLimit()` - Request rate limiting

### sanitization.ts
Input sanitization functions:
- `sanitizeString()` - General string sanitization
- `sanitizeComponentName()` - React component names
- `sanitizePackageName()` - npm package names
- `sanitizeFilePath()` - File system paths
- `sanitizeMigrationRule()` - Migration rule objects

### validators.ts
Validation functions using Zod schemas:
- `validateCLIArgs()` - CLI argument validation
- `validateMigr8Rules()` - Migration rule validation
- `validateUserInput()` - User input validation
- `validateFilePath()` - File path validation

### logger.ts
Security-focused logging system:
- `SecurityLogger` interface - Structured security logging
- `logSecurityEvent()` - Log security events
- `logSuspiciousActivity()` - Log potential threats
- `getRecentSecurityLogs()` - Retrieve audit logs

### secure-config.ts
Secure configuration initialization:
- `getSecureContext()` - Initialize validated configuration
- `validateSecureFilePath()` - Validate file paths
- `validateMigrationRulesPath()` - Validate rule file paths

### types.ts
TypeScript interfaces and types:
- `ValidationResult<T>` - Generic validation result
- `SecurityAudit` - Security audit log entry
- `PathValidationOptions` - Path validation configuration
- `SecurityConfig` - Security system configuration

## API Examples

### Input Validation

```typescript
// Validate component name
const componentResult = validators.componentName("MyComponent");
if (componentResult.success) {
  console.log("Valid component:", componentResult.data);
}

// Validate package name
const packageResult = validators.packageName("@scope/package");
if (!packageResult.success) {
  console.error("Invalid package:", packageResult.error);
}

// Validate migration rules
const rulesResult = validators.migr8Rules(migrationRulesObject);
if (rulesResult.success) {
  console.log("Rules validated successfully");
}
```

### Input Sanitization

```typescript
// Sanitize user input
const safeInput = sanitizers.userInput(rawUserInput);

// Sanitize file path
const safePath = sanitizers.filePath(userProvidedPath);

// Sanitize backup name
const safeBackupName = sanitizers.backupName(userBackupName);

// Sanitize migration rule
const safeRule = sanitizers.migrationRule(rawRule);
```

### Security Operations

```typescript
// Check for suspicious patterns
try {
  securityManager.detectSuspiciousActivity(input, 'user-input');
  console.log("Input is safe");
} catch (error) {
  console.error("Suspicious activity detected:", error.message);
}

// Validate file path
const pathResult = securityManager.validatePath(filePath, {
  allowAbsolute: true,
  allowRelative: false,
  allowTraversal: false,
  maxDepth: 10
});

if (!pathResult.valid) {
  console.error("Invalid path:", pathResult.error);
}

// Check rate limit
const rateLimit = securityManager.checkRateLimit('fileOperations');
if (!rateLimit.allowed) {
  console.warn("Rate limit exceeded");
}
```

### Secure File Operations

```typescript
// Secure file reading
const content = await securityManager.secureFileOperation(
  'readConfig',
  configPath,
  async (safePath) => {
    return await fs.readFile(safePath, 'utf8');
  },
  {
    allowedExtensions: ['.json', '.yaml'],
    maxDepth: 5
  }
);

// Secure file writing
await securityManager.secureFileOperation(
  'writeConfig',
  outputPath,
  async (safePath) => {
    await fs.writeFile(safePath, JSON.stringify(data, null, 2));
  }
);
```

### Security Monitoring

```typescript
// Log security event
logSecurityEvent(
  'file-operation',
  'info',
  'Configuration file read successfully',
  { filePath: safePath, size: content.length }
);

// Get security statistics
const stats = securityManager.getSecurityStats();
console.log(`Total audits: ${stats.totalAudits}`);
console.log(`Error count: ${stats.severityCounts.error || 0}`);

// Get audit log
const auditLog = securityManager.getAuditLog();
const recentErrors = auditLog.filter(entry => 
  entry.severity === 'error' && 
  Date.now() - entry.timestamp.getTime() < 60000 // Last minute
);
```

### Secure Context

```typescript
// Get validated configuration
const secureContext = getSecureContext();
console.log("Root path:", secureContext.rootPath);
console.log("Blacklist:", secureContext.blacklist);

// Validate file path within context
const validatedPath = validateSecureFilePath(
  userPath,
  secureContext.rootPath
);
```

## Configuration Options

### Security Manager Configuration

```typescript
const securityConfig = {
  maxInputLength: 10000,
  maxPathDepth: 10,
  allowedOrigins: ['localhost', '127.0.0.1'],
  rateLimits: {
    fileOperations: { windowMs: 60000, maxRequests: 100 },
    migrationRules: { windowMs: 300000, maxRequests: 50 },
    backupOperations: { windowMs: 60000, maxRequests: 20 }
  },
  auditLevel: 'detailed',
  blockSuspiciousPatterns: true
};

const securityManager = new SecurityManager(securityConfig);
```

### Path Validation Options

```typescript
const pathOptions = {
  allowAbsolute: true,        // Allow absolute paths
  allowRelative: false,       // Allow relative paths
  allowTraversal: false,      // Allow .. in paths
  baseDir: '/safe/directory', // Base directory for relative paths
  maxDepth: 10,              // Maximum path depth
  allowedExtensions: ['.js', '.json'], // Allowed file extensions
  blockedPaths: ['node_modules', '.git'] // Blocked path components
};
```

### Sanitization Options

```typescript
const sanitizationOptions = {
  preserveWhitespace: false,  // Keep whitespace as-is
  maxLength: 1000,           // Maximum input length
  allowHtml: false,          // Allow HTML tags
  stripScripts: true,        // Remove script tags
  normalizeUnicode: true     // Normalize Unicode characters
};
```

## Error Handling

### Validation Errors

```typescript
const result = validators.userInput(input);
if (!result.success) {
  console.error('Validation failed:', result.error);
  if (result.errors) {
    result.errors.forEach(err => console.error('  -', err));
  }
}
```

### Security Exceptions

```typescript
try {
  securityManager.detectSuspiciousActivity(input);
} catch (error) {
  if (error.message.includes('Security violation')) {
    // Handle security violation
    logSecurityEvent('security-violation', 'critical', error.message);
  }
}
```

### Rate Limiting

```typescript
const rateLimit = securityManager.checkRateLimit('operation');
if (!rateLimit.allowed) {
  console.warn(`Rate limit exceeded. Try again in ${rateLimit.resetTime - Date.now()}ms`);
}
```

## Best Practices

1. **Always Validate**: Use validators for all external inputs
2. **Sanitize Early**: Sanitize inputs as early as possible
3. **Log Security Events**: Use security logging for audit trails
4. **Handle Errors Gracefully**: Don't expose sensitive information
5. **Use Secure Wrappers**: Prefer secure file operations
6. **Monitor Rate Limits**: Implement proper rate limiting
7. **Regular Security Audits**: Review security logs regularly

## Testing

The validation system includes comprehensive tests:

```bash
# Run all validation tests
npm test src/validation/

# Run security integration tests
npm test src/validation/__tests__/security-integration.test.ts
```

## Performance Considerations

- Validation adds ~1-5ms overhead per operation
- Rate limiting uses in-memory storage (resets on restart)
- Security logging is asynchronous to minimize impact
- Path validation is cached for repeated operations
- Large inputs (>1MB) may have noticeable validation overhead

## Security Features

- **Path Traversal Protection**: Prevents access outside allowed directories
- **Code Injection Prevention**: Blocks dangerous code patterns
- **XSS Protection**: Sanitizes HTML and script content
- **Prototype Pollution Prevention**: Removes dangerous object properties
- **Rate Limiting**: Prevents abuse through excessive requests
- **Audit Logging**: Comprehensive security event logging
- **Input Sanitization**: Removes or escapes dangerous characters
- **File Access Control**: Restricts file operations to safe paths

For more details, see the [Security Guide](../../SECURITY.md).
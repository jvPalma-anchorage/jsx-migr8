# Security Guide for jsx-migr8

This document outlines the comprehensive security measures implemented in jsx-migr8 to protect against various attack vectors and ensure safe operation when processing migration rules and user inputs.

## Table of Contents

- [Overview](#overview)
- [Security Architecture](#security-architecture)
- [Input Validation](#input-validation)
- [Path Security](#path-security)
- [File Operations Security](#file-operations-security)
- [Interactive Prompt Security](#interactive-prompt-security)
- [Migration Rules Security](#migration-rules-security)
- [Backup Security](#backup-security)
- [Security Monitoring](#security-monitoring)
- [Rate Limiting](#rate-limiting)
- [Best Practices](#best-practices)
- [Security Testing](#security-testing)
- [Reporting Security Issues](#reporting-security-issues)

## Overview

jsx-migr8 implements a multi-layered security approach to protect against:

- **Path Traversal Attacks**: Preventing access to files outside the project directory
- **Code Injection**: Blocking malicious code in migration rules and user inputs
- **XSS Attacks**: Sanitizing inputs that could be used in web contexts
- **Prototype Pollution**: Preventing manipulation of JavaScript object prototypes
- **Command Injection**: Blocking attempts to execute system commands
- **File System Attacks**: Protecting against unauthorized file access
- **Rate Limiting Bypass**: Preventing abuse through excessive requests

## Security Architecture

### Core Components

1. **Validation System** (`src/validation/`)
   - Zod schema-based validation for all inputs
   - Input sanitization utilities
   - Security pattern detection
   - Audit logging system

2. **Security Manager** (`src/validation/security.ts`)
   - Centralized security operations
   - Path validation and sanitization
   - Rate limiting enforcement
   - Suspicious activity detection

3. **Secure Prompts** (`src/cli/secure-prompts.ts`)
   - Enhanced interactive prompts with validation
   - Input sanitization for CLI interactions
   - Confirmation flows for destructive operations

4. **Secure File Operations** (`src/utils/fs/json-operations.ts`)
   - Protected file reading and writing
   - JSON validation and sanitization
   - Path validation for all file operations

## Input Validation

### Schema-Based Validation

All external inputs are validated using Zod schemas:

```typescript
// CLI Arguments
const CLIArgsSchema = z.object({
  root: z.string().optional().refine(val => !val || isValidAbsolutePath(val)),
  blacklist: z.string().optional().refine(val => !val || !containsSuspiciousPatterns(val))
  // ... other fields
});

// Migration Rules
const MigrationRuleSchema = z.object({
  order: z.number().int().min(1),
  match: z.array(z.record(z.string(), z.union([z.string(), z.boolean(), z.number()]))),
  remove: z.array(z.string()),
  // ... other fields
});
```

### Suspicious Pattern Detection

The system automatically detects and blocks dangerous patterns:

```typescript
const SUSPICIOUS_PATTERNS = [
  /\.\.\//g,           // Path traversal
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /javascript:/gi,      // JavaScript URLs
  /eval\s*\(/gi,       // eval() calls
  /Function\s*\(/gi,   // Function constructor
  /__proto__/gi,       // Prototype pollution
  // ... more patterns
];
```

### Input Sanitization

All inputs are sanitized before processing:

- **Component Names**: Alphanumeric characters only, must start with uppercase
- **Package Names**: Valid npm package name format
- **File Paths**: Normalized, no traversal sequences
- **User Input**: HTML entities encoded, control characters removed
- **JSON Content**: Prototype pollution patterns removed

## Path Security

### Path Traversal Prevention

```typescript
// Validates paths to prevent directory traversal
const pathValidation = securityManager.validatePath(inputPath, {
  allowAbsolute: true,
  allowRelative: false,
  allowTraversal: false,
  maxDepth: 10,
  allowedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  blockedPaths: ['node_modules', '.git', 'system32']
});
```

### Safe Path Operations

- All file paths are normalized and validated
- Relative paths are resolved against a secure base directory
- Symbolic links are resolved and validated
- Path depth is limited to prevent deeply nested attacks

## File Operations Security

### Secure JSON Operations

```typescript
// Secure JSON file reading with validation
export const getJsonFile = <T>(filePath: string): T | undefined => {
  // 1. Validate file path
  const pathValidation = securityManager.validatePath(filePath, options);
  
  // 2. Check rate limits
  const rateLimit = securityManager.checkRateLimit('fileOperations');
  
  // 3. Detect suspicious patterns
  securityManager.detectSuspiciousActivity(filePath, 'json-file-read');
  
  // 4. Read and sanitize content
  const content = readFileSync(safePath, "utf8");
  const sanitizedContent = sanitizers.jsonString(content);
  
  // 5. Validate JSON structure
  const validationResult = validators.jsonString(sanitizedContent);
  
  return validationResult.data;
};
```

### File Size Limits

- JSON files limited to 1MB by default
- Migration rule files limited to 50KB
- Backup metadata limited to 10KB
- User input limited to 1000 characters

## Interactive Prompt Security

### Secure Input Collection

```typescript
// Enhanced input prompts with validation
const userInput = await secureInput({
  message: "Enter component name:",
  maxLength: 100,
  sanitize: true,
  validate: (value: string) => {
    const result = validators.componentName(value);
    return result.success ? true : result.error;
  }
});
```

### Confirmation Flows

Critical operations require explicit confirmation:

```typescript
const confirmed = await secureConfirmationInput(
  "This will MODIFY your files - type 'yes' to continue:"
);
```

## Migration Rules Security

### Rule Validation

Migration rules undergo comprehensive validation:

1. **Schema Validation**: Structure and type checking
2. **Content Sanitization**: Removal of dangerous patterns
3. **Code Analysis**: JSX code inspection for malicious content
4. **Size Limits**: Preventing oversized rule files

### Safe JSX Code Generation

```typescript
// JSX code is sanitized before use
const sanitizedCode = sanitizers.migrationRule(rule);
securityManager.detectSuspiciousActivity(sanitizedCode.replaceWith?.code, 'jsx-code');
```

### Rule Application Security

- Rules are applied in a sandboxed environment
- AST modifications are validated before code generation
- Original files are backed up before modification
- Rollback capabilities for failed migrations

## Backup Security

### Backup Integrity

- SHA-256 checksums for all backup files
- Metadata validation and signing
- Integrity verification before restoration
- Secure backup storage with access controls

### Backup Path Security

```typescript
// Backup paths are restricted to designated directories
const backupPath = validateBackupPath(filePath, baseBackupDir);
```

## Security Monitoring

### Audit Logging

All security events are logged with detailed context:

```typescript
logSecurityEvent(
  'file-operation',
  'info',
  'File read operation completed',
  { 
    filePath: sanitizedPath,
    size: fileSize,
    checksum: fileChecksum
  }
);
```

### Security Statistics

- Total security audits
- Event severity breakdown
- Recent suspicious activities
- Rate limiting statistics

### Event Categories

- **File Operations**: All file read/write operations
- **Path Validation**: Path security checks
- **Input Validation**: User input validation events
- **Migration Operations**: Rule application and code modification
- **Backup Operations**: Backup and restore activities

## Rate Limiting

### Operation-Based Limits

Different operations have specific rate limits:

- **File Operations**: 100 requests per minute
- **Migration Rules**: 50 requests per 5 minutes
- **Backup Operations**: 20 requests per minute

### Implementation

```typescript
const rateLimit = securityManager.checkRateLimit('fileOperations');
if (!rateLimit.allowed) {
  throw new Error('Rate limit exceeded');
}
```

## Best Practices

### For Users

1. **Keep jsx-migr8 Updated**: Always use the latest version
2. **Review Migration Rules**: Inspect rules before applying them
3. **Use Dry-Run Mode**: Preview changes before applying
4. **Backup Your Code**: Always create backups before migrations
5. **Limit Rule Sources**: Only use trusted migration rule sources
6. **Monitor Logs**: Check security logs for suspicious activities

### For Developers

1. **Validate All Inputs**: Never trust external data
2. **Use Secure APIs**: Always use the provided secure wrappers
3. **Follow Schema Definitions**: Use Zod schemas for validation
4. **Log Security Events**: Record all security-relevant operations
5. **Test Security Features**: Include security tests in your test suite
6. **Handle Errors Gracefully**: Don't expose sensitive information in errors

### For Rule Authors

1. **Minimize Code Complexity**: Keep JSX replacement code simple
2. **Avoid Dynamic Code**: Don't use eval(), Function(), or similar
3. **Test Thoroughly**: Validate rules with various inputs
4. **Document Intent**: Clearly document what your rules do
5. **Use Safe Patterns**: Follow established patterns for rule structure

## Security Testing

### Automated Tests

The security system includes comprehensive test coverage:

```bash
# Run security integration tests
npm test src/validation/__tests__/security-integration.test.ts

# Run all validation tests
npm test src/validation/
```

### Manual Testing

1. **Path Traversal Tests**: Try various path manipulation attempts
2. **Input Injection Tests**: Test with malicious input patterns
3. **Rate Limiting Tests**: Verify rate limits are enforced
4. **File Operation Tests**: Test file access restrictions
5. **Migration Rule Tests**: Validate rule sanitization

### Security Checklist

- [ ] All external inputs are validated
- [ ] File paths are sanitized and restricted
- [ ] Migration rules are validated and sanitized
- [ ] Rate limits are configured and enforced
- [ ] Security events are logged appropriately
- [ ] Backup integrity is maintained
- [ ] Error messages don't leak sensitive information
- [ ] All security tests pass

## Configuration

### Environment Variables

```bash
# Security configuration
MIGR8_LOG_LEVEL=info
MIGR8_MAX_FILE_SIZE=1MB
MIGR8_BACKUP_RETENTION_DAYS=30
NODE_ENV=production
```

### Security Settings

```typescript
const securityConfig = {
  maxInputLength: 10000,
  maxPathDepth: 10,
  allowedOrigins: ['localhost'],
  rateLimits: {
    fileOperations: { windowMs: 60000, maxRequests: 100 },
    migrationRules: { windowMs: 300000, maxRequests: 50 }
  },
  auditLevel: 'detailed',
  blockSuspiciousPatterns: true
};
```

## Reporting Security Issues

### Responsible Disclosure

If you discover a security vulnerability:

1. **Do Not** create a public issue
2. Email security concerns to [security@jsx-migr8.dev] (if available)
3. Include detailed reproduction steps
4. Allow reasonable time for fixing before disclosure
5. Work with maintainers on coordinated disclosure

### Security Response

- Security issues are prioritized and addressed quickly
- Fixes are released as patch versions
- Security advisories are published when appropriate
- Credits are given to responsible researchers

### Emergency Contacts

For critical security issues requiring immediate attention:

- Create a private security advisory on GitHub
- Contact maintainers directly through secure channels
- Use encrypted communication when sharing sensitive details

## Security Updates

### Staying Informed

- Watch the repository for security releases
- Subscribe to security advisories
- Monitor the changelog for security-related changes
- Follow best practices for dependency management

### Update Process

1. **Review Release Notes**: Check for security-related changes
2. **Test in Development**: Validate updates don't break your workflows
3. **Update Dependencies**: Keep all dependencies current
4. **Monitor for Issues**: Watch for any security warnings post-update

---

For more information about jsx-migr8's security features, see:

- [Validation API Documentation](src/validation/README.md)
- [Security Testing Guide](src/validation/__tests__/README.md)
- [Contributing Security Guidelines](CONTRIBUTING.md#security)

Last Updated: 2024-12-19
Version: 2.0+
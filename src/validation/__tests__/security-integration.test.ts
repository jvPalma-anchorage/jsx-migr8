/**
 * Integration tests for the validation and security system
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  securityManager, 
  validators, 
  sanitizers,
  getSecureContext,
  validateSecureFilePath 
} from '../index';
import { getJsonFile, writeJsonFileAsync } from '../../utils/fs/json-operations';
import { secureInput, secureSelect, secureComponentNameInput } from '../../cli/secure-prompts';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('Security Integration Tests', () => {
  let testDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(process.cwd(), 'test-temp', Math.random().toString(36));
    await fs.mkdir(testDir, { recursive: true });
    
    // Backup original environment
    originalEnv = { ...process.env };
    
    // Clear security audit log for clean tests
    securityManager.clearAuditLog();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    
    // Restore environment
    process.env = originalEnv;
  });

  describe('JSON File Operations Security', () => {
    test('should reject malicious JSON content', () => {
      const maliciousJson = {
        __proto__: { isAdmin: true },
        constructor: { name: 'Object' },
        migr8rules: [
          {
            match: [{ "eval('malicious code')": true }],
            replaceWith: {
              code: '<script>alert("xss")</script>'
            }
          }
        ]
      };

      const result = validators.migr8Rules(maliciousJson);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Suspicious patterns detected');
    });

    test('should sanitize JSON file paths', () => {
      const maliciousPath = '../../../etc/passwd';
      const result = getJsonFile(maliciousPath);
      
      expect(result).toBeUndefined();
      
      const auditLog = securityManager.getAuditLog();
      const pathViolations = auditLog.filter(entry => 
        entry.operation === 'json-path-validation' && 
        entry.severity === 'warn'
      );
      
      expect(pathViolations.length).toBeGreaterThan(0);
    });

    test('should validate migration rules structure', async () => {
      const validMigrationRules = {
        lookup: {
          rootPath: testDir,
          packages: ['@valid/package'],
          components: ['ValidComponent']
        },
        migr8rules: [
          {
            package: '@valid/package',
            importType: 'named' as const,
            component: 'ValidComponent',
            importTo: {
              importStm: '@target/package',
              importType: 'named' as const,
              component: 'NewComponent'
            },
            rules: [
              {
                order: 1,
                match: [{ prop: 'value' }],
                remove: ['oldProp'],
                rename: { old: 'new' },
                set: { newProp: 'value' }
              }
            ]
          }
        ]
      };

      const testFile = path.join(testDir, 'valid-rules.json');
      await writeJsonFileAsync(testFile, validMigrationRules);
      
      const loadedRules = getJsonFile(testFile);
      expect(loadedRules).toBeDefined();
      expect(loadedRules).toEqual(validMigrationRules);
    });

    test('should block oversized JSON files', () => {
      const oversizedContent = 'x'.repeat(2000000); // 2MB string
      const result = validators.jsonString(oversizedContent);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('too large');
    });
  });

  describe('Path Validation Security', () => {
    test('should prevent path traversal attacks', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        '/etc/shadow',
        'C:\\Windows\\System32\\config\\SAM',
        './../../sensitive.txt',
        'file://../../etc/hosts',
        'package/../../../root/.ssh/id_rsa'
      ];

      for (const maliciousPath of maliciousPaths) {
        const validation = securityManager.validatePath(maliciousPath, {
          allowTraversal: false,
          allowAbsolute: false
        });
        
        expect(validation.valid).toBe(false);
        expect(validation.error).toBeDefined();
      }
    });

    test('should allow safe relative paths', () => {
      const safePaths = [
        'safe-file.json',
        'folder/safe-file.json',
        './relative/path.txt',
        'src/components/Component.tsx'
      ];

      for (const safePath of safePaths) {
        const validation = securityManager.validatePath(safePath, {
          allowRelative: true,
          allowTraversal: false,
          baseDir: testDir
        });
        
        expect(validation.valid).toBe(true);
        expect(validation.sanitized).toBeDefined();
      }
    });

    test('should enforce file extension restrictions', () => {
      const testCases = [
        { path: 'safe.json', allowed: ['.json'], shouldPass: true },
        { path: 'unsafe.exe', allowed: ['.json'], shouldPass: false },
        { path: 'script.js', allowed: ['.js', '.ts'], shouldPass: true },
        { path: 'config.txt', allowed: ['.json'], shouldPass: false }
      ];

      for (const testCase of testCases) {
        const validation = securityManager.validatePath(testCase.path, {
          allowedExtensions: testCase.allowed
        });
        
        expect(validation.valid).toBe(testCase.shouldPass);
      }
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize component names', () => {
      const testCases = [
        { input: 'ValidComponent', expected: 'ValidComponent' },
        { input: 'invalid-name!@#', expected: 'invalidname' },
        { input: '123StartWithNumber', expected: '_123StartWithNumber' },
        { input: 'with spaces', expected: 'withspaces' },
        { input: 'under_score_ok', expected: 'under_score_ok' }
      ];

      for (const testCase of testCases) {
        const sanitized = sanitizers.componentName(testCase.input);
        expect(sanitized).toBe(testCase.expected);
      }
    });

    test('should sanitize package names', () => {
      const testCases = [
        { input: '@scope/package', expected: '@scope/package' },
        { input: 'UPPERCASE', expected: 'uppercase' },
        { input: 'invalid@chars!', expected: 'invalidchars' },
        { input: 'with spaces', expected: 'withspaces' },
        { input: '@scoped/package-name', expected: '@scoped/package-name' }
      ];

      for (const testCase of testCases) {
        const sanitized = sanitizers.packageName(testCase.input);
        expect(sanitized).toBe(testCase.expected);
      }
    });

    test('should detect suspicious patterns', () => {
      const suspiciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        'eval("malicious code")',
        'require("child_process")',
        'process.exit()',
        '__proto__.isAdmin = true',
        'constructor.prototype.hack = true',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='
      ];

      for (const suspiciousInput of suspiciousInputs) {
        expect(() => {
          securityManager.detectSuspiciousActivity(suspiciousInput, 'test');
        }).toThrow(/Security violation/);
      }
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', () => {
      // First request should be allowed
      const result1 = securityManager.checkRateLimit('fileOperations', 'test-user');
      expect(result1.allowed).toBe(true);

      // Simulate many rapid requests
      for (let i = 0; i < 100; i++) {
        securityManager.checkRateLimit('fileOperations', 'test-user');
      }

      // Should now be rate limited
      const result2 = securityManager.checkRateLimit('fileOperations', 'test-user');
      expect(result2.allowed).toBe(false);
    });

    test('should have separate rate limits per operation', () => {
      // Max out file operations
      for (let i = 0; i < 100; i++) {
        securityManager.checkRateLimit('fileOperations', 'test-user');
      }

      // File operations should be blocked
      expect(securityManager.checkRateLimit('fileOperations', 'test-user').allowed).toBe(false);

      // But migration rules should still be allowed
      expect(securityManager.checkRateLimit('migrationRules', 'test-user').allowed).toBe(true);
    });
  });

  describe('Security Audit Log', () => {
    test('should log security events', () => {
      securityManager.audit(
        'test-operation',
        { testData: 'value' },
        'info',
        'Test security event'
      );

      const auditLog = securityManager.getAuditLog();
      const testEvent = auditLog.find(entry => entry.operation === 'test-operation');
      
      expect(testEvent).toBeDefined();
      expect(testEvent?.message).toBe('Test security event');
      expect(testEvent?.severity).toBe('info');
    });

    test('should provide security statistics', () => {
      // Generate some audit events
      securityManager.audit('test1', {}, 'info', 'Info event');
      securityManager.audit('test2', {}, 'warn', 'Warning event');
      securityManager.audit('test3', {}, 'error', 'Error event');

      const stats = securityManager.getSecurityStats();
      
      expect(stats.totalAudits).toBeGreaterThanOrEqual(3);
      expect(stats.severityCounts.info).toBeGreaterThanOrEqual(1);
      expect(stats.severityCounts.warn).toBeGreaterThanOrEqual(1);
      expect(stats.severityCounts.error).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Secure Context Integration', () => {
    test('should initialize secure context with validation', () => {
      process.env.ROOT_PATH = testDir;
      process.env.BLACKLIST = 'node_modules,.git,dist';

      const context = getSecureContext();
      
      expect(context.rootPath).toBeDefined();
      expect(context.blacklist).toContain('node_modules');
      expect(context.blacklist).toContain('.git');
      expect(context.blacklist).toContain('dist');
    });

    test('should handle invalid environment gracefully', () => {
      process.env.ROOT_PATH = '../../../invalid/path';
      process.env.BLACKLIST = '../../malicious';

      // Should not throw, but use safe defaults
      expect(() => getSecureContext()).not.toThrow();
      
      const context = getSecureContext();
      expect(context.rootPath).toBeDefined();
      expect(context.blacklist).toBeDefined();
    });
  });

  describe('Migration Rules Validation', () => {
    test('should validate complete migration rule structure', () => {
      const validRule = {
        order: 1,
        match: [{ type: 'button', variant: 'primary' }],
        remove: ['oldProp'],
        rename: { oldName: 'newName' },
        set: { newProp: 'value' },
        replaceWith: {
          INNER_PROPS: ['href', 'target'],
          code: '<NewButton {...OUTER_PROPS}><a {...INNER_PROPS}>{CHILDREN}</a></NewButton>'
        }
      };

      const result = validators.migrationRule(validRule);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should reject malicious migration rules', () => {
      const maliciousRule = {
        order: 1,
        match: [{ "eval('hack')": true }],
        replaceWith: {
          code: '<script>document.location="http://evil.com"</script>'
        }
      };

      const result = validators.migrationRule(maliciousRule);
      expect(result.success).toBe(false);
    });
  });

  describe('Backup Security Integration', () => {
    test('should validate backup metadata', () => {
      const validMetadata = {
        id: 'backup-123',
        name: 'test-backup',
        description: 'Test backup for validation',
        tags: ['auto', 'test'],
        createdAt: new Date(),
        migration: {
          componentName: 'TestComponent',
          sourcePackage: '@old/package',
          targetPackage: '@new/package'
        },
        stats: {
          totalFiles: 10,
          totalSize: 1024
        },
        integrityValid: true
      };

      const result = validators.backupMetadata(validMetadata);
      expect(result.success).toBe(true);
    });

    test('should sanitize backup names', () => {
      const unsafeNames = [
        'backup with spaces',
        'backup/with/slashes',
        'backup<with>brackets',
        'backup:with:colons',
        'backup|with|pipes'
      ];

      for (const unsafeName of unsafeNames) {
        const sanitized = sanitizers.backupName(unsafeName);
        expect(sanitized).not.toContain(' ');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('<');
        expect(sanitized).not.toContain('>');
        expect(sanitized).not.toContain(':');
        expect(sanitized).not.toContain('|');
      }
    });
  });
});
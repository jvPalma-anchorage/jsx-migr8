/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  SecurityManager,
  securityManager,
  validatePath,
  detectSuspiciousActivity,
  secureFileOperation,
  validateMigrationRules,
  checkRateLimit,
  generateSecureHash,
  generateSecureId,
  DEFAULT_SECURITY_CONFIG,
} from '../security';
import { securityLogger } from '../logger';

// Mock dependencies
jest.mock('node:path');
jest.mock('node:crypto');
jest.mock('node:fs/promises');
jest.mock('../logger', () => ({
  securityLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    critical: jest.fn(),
  },
}));

describe('security', () => {
  let mockPath: jest.Mocked<typeof path>;
  let mockCrypto: jest.Mocked<typeof crypto>;
  let mockSecurityLogger: jest.Mocked<typeof securityLogger>;
  let securityManagerInstance: SecurityManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPath = path as jest.Mocked<typeof path>;
    mockCrypto = crypto as jest.Mocked<typeof crypto>;
    mockSecurityLogger = securityLogger as jest.Mocked<typeof securityLogger>;
    
    // Reset rate limiting between tests
    const rateLimitStore = (SecurityManager as any).rateLimitStore;
    if (rateLimitStore) {
      rateLimitStore.clear();
    }
    
    securityManagerInstance = new SecurityManager();
    securityManagerInstance.clearAuditLog();
  });

  describe('SecurityManager', () => {
    describe('constructor', () => {
      it('should initialize with default config', () => {
        const manager = new SecurityManager();
        expect(manager).toBeInstanceOf(SecurityManager);
      });

      it('should merge custom config with defaults', () => {
        const customConfig = {
          maxInputLength: 5000,
          blockSuspiciousPatterns: false,
        };
        
        const manager = new SecurityManager(customConfig);
        expect(manager).toBeInstanceOf(SecurityManager);
      });
    });

    describe('validatePath', () => {
      beforeEach(() => {
        mockPath.normalize.mockImplementation((p) => p);
        mockPath.isAbsolute.mockImplementation((p) => p.startsWith('/'));
        mockPath.sep = '/';
        mockPath.extname.mockImplementation((p) => {
          const parts = p.split('.');
          return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
        });
        mockPath.resolve.mockImplementation((...args) => args.join('/').replace(/\/+/g, '/'));
        mockPath.join.mockImplementation((...args) => args.join('/').replace(/\/+/g, '/'));
      });

      it('should validate safe absolute paths', () => {
        const result = securityManagerInstance.validatePath('/project/src/component.tsx');

        expect(result).toEqual({
          valid: true,
          sanitized: '/project/src/component.tsx',
        });
      });

      it('should detect null bytes in paths', () => {
        const result = securityManagerInstance.validatePath('/project/src/file\0.tsx');

        expect(result).toEqual({
          valid: false,
          error: 'Invalid characters in path',
        });
      });

      it('should detect path traversal attempts', () => {
        const result = securityManagerInstance.validatePath('/project/../../../etc/passwd');

        expect(result).toEqual({
          valid: false,
          error: 'Path traversal not allowed',
        });
      });

      it('should enforce absolute path restrictions', () => {
        const result = securityManagerInstance.validatePath('/absolute/path', {
          allowAbsolute: false,
        });

        expect(result).toEqual({
          valid: false,
          error: 'Absolute paths not allowed',
        });
      });

      it('should enforce relative path restrictions', () => {
        const result = securityManagerInstance.validatePath('relative/path', {
          allowRelative: false,
        });

        expect(result).toEqual({
          valid: false,
          error: 'Relative paths not allowed',
        });
      });

      it('should enforce path depth limits', () => {
        const deepPath = Array.from({ length: 15 }, (_, i) => `dir${i}`).join('/');
        
        const result = securityManagerInstance.validatePath(deepPath, {
          maxDepth: 10,
        });

        expect(result).toEqual({
          valid: false,
          error: 'Path too deep (max 10 levels)',
        });
      });

      it('should check against blocked paths', () => {
        const result = securityManagerInstance.validatePath('/project/node_modules/package', {
          blockedPaths: ['node_modules', '.git'],
        });

        expect(result).toEqual({
          valid: false,
          error: 'Path not allowed',
        });
      });

      it('should validate file extensions', () => {
        const result = securityManagerInstance.validatePath('/project/script.sh', {
          allowedExtensions: ['.tsx', '.ts', '.js', '.jsx'],
        });

        expect(result).toEqual({
          valid: false,
          error: 'File extension .sh not allowed',
        });
      });

      it('should enforce base directory restrictions', () => {
        mockPath.resolve
          .mockReturnValueOnce('/allowed/base')
          .mockReturnValueOnce('/outside/path');

        const result = securityManagerInstance.validatePath('../../../outside/path', {
          baseDir: '/allowed/base',
        });

        expect(result).toEqual({
          valid: false,
          error: 'Path outside allowed directory',
        });
      });

      it('should handle path validation errors', () => {
        mockPath.normalize.mockImplementation(() => {
          throw new Error('Path normalization failed');
        });

        const result = securityManagerInstance.validatePath('/invalid/path');

        expect(result).toEqual({
          valid: false,
          error: 'Invalid path format',
        });
      });

      it('should allow paths within base directory', () => {
        mockPath.resolve
          .mockReturnValueOnce('/project/base')
          .mockReturnValueOnce('/project/base/src/component.tsx');

        const result = securityManagerInstance.validatePath('src/component.tsx', {
          baseDir: '/project/base',
        });

        expect(result).toEqual({
          valid: true,
          sanitized: '/project/base/src/component.tsx',
        });
      });

      it('should allow exact match with base directory', () => {
        mockPath.resolve
          .mockReturnValueOnce('/project/base')
          .mockReturnValueOnce('/project/base');

        const result = securityManagerInstance.validatePath('.', {
          baseDir: '/project/base',
        });

        expect(result).toEqual({
          valid: true,
          sanitized: '/project/base',
        });
      });
    });

    describe('detectSuspiciousActivity', () => {
      it('should detect script injection attempts', () => {
        const maliciousInput = '<script>alert("xss")</script>';

        const activities = securityManagerInstance.detectSuspiciousActivity(maliciousInput);

        expect(activities).toHaveLength(1);
        expect(activities[0]).toMatchObject({
          description: 'Script injection attempt',
          severity: 'critical',
          action: 'block',
        });
      });

      it('should detect path traversal attempts', () => {
        const maliciousInput = '../../../etc/passwd';

        const activities = securityManagerInstance.detectSuspiciousActivity(maliciousInput);

        expect(activities).toHaveLength(1);
        expect(activities[0]).toMatchObject({
          description: 'Path traversal attempt',
          severity: 'high',
          action: 'block',
        });
      });

      it('should detect code execution attempts', () => {
        const maliciousInput = 'eval("malicious code")';

        const activities = securityManagerInstance.detectSuspiciousActivity(maliciousInput);

        expect(activities).toHaveLength(1);
        expect(activities[0]).toMatchObject({
          description: 'Code execution attempt',
          severity: 'critical',
          action: 'block',
        });
      });

      it('should detect prototype pollution attempts', () => {
        const maliciousInput = '__proto__.admin = true';

        const activities = securityManagerInstance.detectSuspiciousActivity(maliciousInput);

        expect(activities).toHaveLength(1);
        expect(activities[0]).toMatchObject({
          description: 'Prototype pollution attempt',
          severity: 'high',
          action: 'block',
        });
      });

      it('should detect dangerous URL schemes', () => {
        const maliciousInput = 'javascript:alert("xss")';

        const activities = securityManagerInstance.detectSuspiciousActivity(maliciousInput);

        expect(activities).toHaveLength(1);
        expect(activities[0]).toMatchObject({
          description: 'Dangerous URL scheme',
          severity: 'high',
          action: 'block',
        });
      });

      it('should detect template literal injection', () => {
        const maliciousInput = '`${process.env.SECRET}`';

        const activities = securityManagerInstance.detectSuspiciousActivity(maliciousInput);

        expect(activities).toHaveLength(1);
        expect(activities[0]).toMatchObject({
          description: 'Template literal injection',
          severity: 'medium',
          action: 'warn',
        });
      });

      it('should detect destructive command patterns', () => {
        const maliciousInput = 'rm -rf /';

        const activities = securityManagerInstance.detectSuspiciousActivity(maliciousInput);

        expect(activities).toHaveLength(1);
        expect(activities[0]).toMatchObject({
          description: 'Destructive command pattern',
          severity: 'critical',
          action: 'block',
        });
      });

      it('should throw error for blocked patterns when configured', () => {
        const manager = new SecurityManager({ blockSuspiciousPatterns: true });
        const maliciousInput = '<script>alert("xss")</script>';

        expect(() => {
          manager.detectSuspiciousActivity(maliciousInput);
        }).toThrow('Security violation: Script injection attempt');
      });

      it('should not throw error when blocking is disabled', () => {
        const manager = new SecurityManager({ blockSuspiciousPatterns: false });
        const maliciousInput = '<script>alert("xss")</script>';

        expect(() => {
          manager.detectSuspiciousActivity(maliciousInput);
        }).not.toThrow();
      });

      it('should return empty array for safe input', () => {
        const safeInput = 'const component = () => <div>Hello World</div>';

        const activities = securityManagerInstance.detectSuspiciousActivity(safeInput);

        expect(activities).toHaveLength(0);
      });
    });

    describe('checkRateLimit', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should allow operations within rate limit', () => {
        const result = securityManagerInstance.checkRateLimit('fileOperations', 'user1');

        expect(result).toMatchObject({
          allowed: true,
          remaining: expect.any(Number),
          resetTime: expect.any(Number),
        });
      });

      it('should track requests per operation and identifier', () => {
        // First request
        const result1 = securityManagerInstance.checkRateLimit('fileOperations', 'user1');
        expect(result1.allowed).toBe(true);
        expect(result1.remaining).toBe(99); // Default limit is 100

        // Second request
        const result2 = securityManagerInstance.checkRateLimit('fileOperations', 'user1');
        expect(result2.allowed).toBe(true);
        expect(result2.remaining).toBe(98);
      });

      it('should block requests when rate limit is exceeded', () => {
        const manager = new SecurityManager({
          rateLimits: {
            fileOperations: { windowMs: 60000, maxRequests: 2 },
          },
        });

        // First two requests should be allowed
        expect(manager.checkRateLimit('fileOperations', 'user1').allowed).toBe(true);
        expect(manager.checkRateLimit('fileOperations', 'user1').allowed).toBe(true);

        // Third request should be blocked
        const result = manager.checkRateLimit('fileOperations', 'user1');
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });

      it('should reset rate limit after window expires', () => {
        const manager = new SecurityManager({
          rateLimits: {
            fileOperations: { windowMs: 1000, maxRequests: 1 },
          },
        });

        // First request
        expect(manager.checkRateLimit('fileOperations', 'user1').allowed).toBe(true);

        // Second request should be blocked
        expect(manager.checkRateLimit('fileOperations', 'user1').allowed).toBe(false);

        // Advance time past window
        jest.advanceTimersByTime(1001);

        // Should be allowed again
        expect(manager.checkRateLimit('fileOperations', 'user1').allowed).toBe(true);
      });

      it('should return allowed true for unknown operations', () => {
        const result = securityManagerInstance.checkRateLimit('unknownOperation', 'user1');

        expect(result).toEqual({ allowed: true });
      });

      it('should handle different identifiers separately', () => {
        const manager = new SecurityManager({
          rateLimits: {
            fileOperations: { windowMs: 60000, maxRequests: 1 },
          },
        });

        // Each user should have their own limit
        expect(manager.checkRateLimit('fileOperations', 'user1').allowed).toBe(true);
        expect(manager.checkRateLimit('fileOperations', 'user2').allowed).toBe(true);

        // But second request for each user should be blocked
        expect(manager.checkRateLimit('fileOperations', 'user1').allowed).toBe(false);
        expect(manager.checkRateLimit('fileOperations', 'user2').allowed).toBe(false);
      });
    });

    describe('secureFileOperation', () => {
      it('should execute callback with validated path', async () => {
        const mockCallback = jest.fn().mockResolvedValue('success');
        const filePath = '/project/src/component.tsx';

        mockPath.normalize.mockReturnValue(filePath);
        mockPath.isAbsolute.mockReturnValue(true);

        const result = await securityManagerInstance.secureFileOperation(
          'read',
          filePath,
          mockCallback
        );

        expect(result).toBe('success');
        expect(mockCallback).toHaveBeenCalledWith(filePath);
      });

      it('should reject invalid file paths', async () => {
        const mockCallback = jest.fn();
        const invalidPath = '../../../etc/passwd';

        mockPath.normalize.mockReturnValue(invalidPath);

        await expect(
          securityManagerInstance.secureFileOperation('read', invalidPath, mockCallback)
        ).rejects.toThrow('Invalid file path: Path traversal not allowed');

        expect(mockCallback).not.toHaveBeenCalled();
      });

      it('should respect rate limits', async () => {
        const manager = new SecurityManager({
          rateLimits: {
            fileOperations: { windowMs: 60000, maxRequests: 1 },
          },
        });

        const mockCallback = jest.fn().mockResolvedValue('success');
        const filePath = '/project/src/component.tsx';

        mockPath.normalize.mockReturnValue(filePath);
        mockPath.isAbsolute.mockReturnValue(true);

        // First operation should succeed
        await expect(
          manager.secureFileOperation('read', filePath, mockCallback)
        ).resolves.toBe('success');

        // Second operation should be rate limited
        await expect(
          manager.secureFileOperation('read', filePath, mockCallback)
        ).rejects.toThrow('Rate limit exceeded for file operations');
      });

      it('should handle callback errors', async () => {
        const mockCallback = jest.fn().mockRejectedValue(new Error('File operation failed'));
        const filePath = '/project/src/component.tsx';

        mockPath.normalize.mockReturnValue(filePath);
        mockPath.isAbsolute.mockReturnValue(true);

        await expect(
          securityManagerInstance.secureFileOperation('read', filePath, mockCallback)
        ).rejects.toThrow('File operation failed');
      });
    });

    describe('validateMigrationRules', () => {
      it('should validate safe migration rules', () => {
        const rules = {
          lookup: { '@company/ui': ['Button'] },
          components: [
            {
              name: 'Button',
              rules: [
                { match: [{ prop: 'size', value: 'large' }] },
              ],
            },
          ],
        };

        const result = securityManagerInstance.validateMigrationRules(rules);

        expect(result).toEqual({
          valid: true,
          errors: [],
        });
      });

      it('should reject rules with suspicious patterns', () => {
        const manager = new SecurityManager({ blockSuspiciousPatterns: false });
        const maliciousRules = {
          lookup: { 'evil-package': ['<script>alert("xss")</script>'] },
          components: [],
        };

        const result = manager.validateMigrationRules(maliciousRules);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Migration rules contain suspicious patterns');
      });

      it('should handle non-object rules', () => {
        const result = securityManagerInstance.validateMigrationRules('invalid');

        expect(result).toEqual({
          valid: false,
          errors: ['Migration rules must be an object'],
        });
      });

      it('should handle null rules', () => {
        const result = securityManagerInstance.validateMigrationRules(null);

        expect(result).toEqual({
          valid: false,
          errors: ['Migration rules must be an object'],
        });
      });

      it('should respect rate limits for rule validation', () => {
        const manager = new SecurityManager({
          rateLimits: {
            migrationRules: { windowMs: 60000, maxRequests: 1 },
          },
        });

        const rules = { lookup: {}, components: [] };

        // First validation should succeed
        expect(manager.validateMigrationRules(rules).valid).toBe(true);

        // Second validation should be rate limited
        const result = manager.validateMigrationRules(rules);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Rate limit exceeded for migration rule validation');
      });

      it('should handle validation errors', () => {
        const invalidRules = {
          toString: () => {
            throw new Error('Serialization error');
          },
        };

        const result = securityManagerInstance.validateMigrationRules(invalidRules);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Failed to validate migration rules');
      });
    });

    describe('audit', () => {
      it('should create audit entries', () => {
        securityManagerInstance.audit(
          'test-operation',
          'test-input',
          'info',
          'Test message',
          { extra: 'context' }
        );

        const auditLog = securityManagerInstance.getAuditLog();
        expect(auditLog).toHaveLength(1);
        expect(auditLog[0]).toMatchObject({
          operation: 'test-operation',
          input: 'test-input',
          severity: 'info',
          message: 'Test message',
          details: { extra: 'context' },
        });
      });

      it('should log to security logger', () => {
        securityManagerInstance.audit('test-operation', 'test-input', 'warning', 'Test warning');

        expect(mockSecurityLogger.warning).toHaveBeenCalledWith('Test warning', {
          operation: 'test-operation',
          input: 'test-input',
          details: undefined,
        });
      });

      it('should sanitize sensitive data in audit logs', () => {
        const sensitiveData = {
          username: 'user',
          password: 'secret123',
          token: 'abc123',
        };

        securityManagerInstance.audit('login', sensitiveData, 'info', 'User login');

        const auditLog = securityManagerInstance.getAuditLog();
        const auditEntry = auditLog[0];

        expect(auditEntry.input).toMatchObject({
          username: 'user',
          password: '[REDACTED]',
          token: '[REDACTED]',
        });
      });

      it('should maintain audit log size limit', () => {
        // Add more than 1000 entries
        for (let i = 0; i < 1200; i++) {
          securityManagerInstance.audit('test', `input-${i}`, 'info', `Message ${i}`);
        }

        const auditLog = securityManagerInstance.getAuditLog();
        expect(auditLog.length).toBe(500); // Should be trimmed to 500
      });
    });

    describe('getSecurityStats', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should return security statistics', () => {
        securityManagerInstance.audit('test1', 'input1', 'info', 'Message 1');
        securityManagerInstance.audit('test2', 'input2', 'warning', 'Message 2');
        securityManagerInstance.audit('test3', 'input3', 'error', 'Message 3');

        const stats = securityManagerInstance.getSecurityStats();

        expect(stats).toMatchObject({
          totalAudits: 3,
          severityCounts: {
            info: 1,
            warning: 1,
            error: 1,
          },
        });
      });

      it('should filter recent activities', () => {
        // Add old activity
        securityManagerInstance.audit('old', 'input', 'info', 'Old message');

        // Advance time
        jest.advanceTimersByTime(120000); // 2 minutes

        // Add recent activity
        securityManagerInstance.audit('recent', 'input', 'info', 'Recent message');

        const stats = securityManagerInstance.getSecurityStats();

        expect(stats.recentActivities).toHaveLength(1);
        expect(stats.recentActivities[0].operation).toBe('recent');
      });
    });

    describe('utility methods', () => {
      beforeEach(() => {
        const mockHash = {
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue('abcd1234'),
        };
        mockCrypto.createHash.mockReturnValue(mockHash as any);
        mockCrypto.randomBytes.mockReturnValue(Buffer.from('1234567890abcdef', 'hex'));
      });

      it('should generate secure hash', () => {
        const hash = securityManagerInstance.generateHash('test data');

        expect(hash).toBe('abcd1234');
        expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
      });

      it('should generate secure ID', () => {
        const id = securityManagerInstance.generateSecureId();

        expect(id).toBe('3132333435363738393061626364656');
        expect(mockCrypto.randomBytes).toHaveBeenCalledWith(16);
      });

      it('should sanitize long strings', () => {
        const longString = 'a'.repeat(300);
        
        securityManagerInstance.audit('test', longString, 'info', 'Test');
        
        const auditLog = securityManagerInstance.getAuditLog();
        expect((auditLog[0].input as string).length).toBeLessThanOrEqual(203); // 200 + '...'
      });

      it('should sanitize password patterns in strings', () => {
        const sensitiveString = 'password:"secret123" token:"abc123" key:"def456"';
        
        securityManagerInstance.audit('test', sensitiveString, 'info', 'Test');
        
        const auditLog = securityManagerInstance.getAuditLog();
        expect(auditLog[0].input).toContain('[REDACTED]');
      });

      it('should handle unserializable objects', () => {
        const circular: any = { name: 'test' };
        circular.self = circular;
        
        securityManagerInstance.audit('test', circular, 'info', 'Test');
        
        const auditLog = securityManagerInstance.getAuditLog();
        expect(auditLog[0].input).toBe('[OBJECT - Cannot serialize]');
      });
    });
  });

  describe('convenience functions', () => {
    beforeEach(() => {
      mockPath.normalize.mockImplementation((p) => p);
      mockPath.isAbsolute.mockImplementation((p) => p.startsWith('/'));
    });

    it('should provide validatePath convenience function', () => {
      const result = validatePath('/test/path');
      expect(result.valid).toBe(true);
    });

    it('should provide detectSuspiciousActivity convenience function', () => {
      const activities = detectSuspiciousActivity('<script>test</script>');
      expect(activities).toHaveLength(1);
    });

    it('should provide secureFileOperation convenience function', async () => {
      const mockCallback = jest.fn().mockResolvedValue('result');
      
      const result = await secureFileOperation('read', '/test/path', mockCallback);
      
      expect(result).toBe('result');
    });

    it('should provide validateMigrationRules convenience function', () => {
      const result = validateMigrationRules({ lookup: {}, components: [] });
      expect(result.valid).toBe(true);
    });

    it('should provide checkRateLimit convenience function', () => {
      const result = checkRateLimit('testOperation');
      expect(result.allowed).toBe(true);
    });

    it('should provide generateSecureHash convenience function', () => {
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash123'),
      };
      mockCrypto.createHash.mockReturnValue(mockHash as any);

      const hash = generateSecureHash('test');
      expect(hash).toBe('hash123');
    });

    it('should provide generateSecureId convenience function', () => {
      mockCrypto.randomBytes.mockReturnValue(Buffer.from('randomdata123456', 'hex'));

      const id = generateSecureId();
      expect(typeof id).toBe('string');
    });
  });

  describe('DEFAULT_SECURITY_CONFIG', () => {
    it('should have reasonable default values', () => {
      expect(DEFAULT_SECURITY_CONFIG).toMatchObject({
        maxInputLength: 10000,
        maxPathDepth: 10,
        allowedOrigins: ['localhost', '127.0.0.1'],
        auditLevel: 'detailed',
        blockSuspiciousPatterns: true,
      });

      expect(DEFAULT_SECURITY_CONFIG.rateLimits).toHaveProperty('fileOperations');
      expect(DEFAULT_SECURITY_CONFIG.rateLimits).toHaveProperty('migrationRules');
      expect(DEFAULT_SECURITY_CONFIG.rateLimits).toHaveProperty('backupOperations');
    });
  });

  describe('edge cases and error scenarios', () => {
    beforeEach(() => {
      mockPath.normalize.mockImplementation((p) => p);
      mockPath.isAbsolute.mockImplementation((p) => p.startsWith('/'));
      mockPath.sep = '/';
    });

    it('should handle path normalization throwing errors', () => {
      mockPath.normalize.mockImplementation(() => {
        throw new Error('Normalization failed');
      });

      const result = securityManagerInstance.validatePath('/test/path');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid path format');
    });

    it('should handle very long paths', () => {
      const veryLongPath = '/' + 'a'.repeat(10000);
      
      const result = securityManagerInstance.validatePath(veryLongPath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Path too deep');
    });

    it('should handle concurrent rate limit checks', async () => {
      const manager = new SecurityManager({
        rateLimits: {
          fileOperations: { windowMs: 60000, maxRequests: 10 },
        },
      });

      const promises = Array.from({ length: 20 }, () => 
        Promise.resolve().then(() => manager.checkRateLimit('fileOperations', 'user1'))
      );

      const results = await Promise.all(promises);
      const allowedCount = results.filter(r => r.allowed).length;
      const blockedCount = results.filter(r => !r.allowed).length;

      expect(allowedCount).toBe(10);
      expect(blockedCount).toBe(10);
    });

    it('should handle malformed rate limit configuration', () => {
      const manager = new SecurityManager({
        rateLimits: {} as any,
      });

      const result = manager.checkRateLimit('nonExistentOperation', 'user1');

      expect(result).toEqual({ allowed: true });
    });

    it('should handle null byte variations', () => {
      const testCases = [
        '/path/with\x00null',
        '/path/with\0null',
        '/path/with%00null',
      ];

      testCases.forEach((testPath) => {
        if (testPath.includes('\0') || testPath.includes('\x00')) {
          const result = securityManagerInstance.validatePath(testPath);
          expect(result.valid).toBe(false);
        }
      });
    });

    it('should handle extremely deep object nesting in audit', () => {
      const deepObject: any = {};
      let current = deepObject;
      
      // Create deeply nested object
      for (let i = 0; i < 1000; i++) {
        current.nested = {};
        current = current.nested;
      }

      expect(() => {
        securityManagerInstance.audit('test', deepObject, 'info', 'Deep object test');
      }).not.toThrow();

      const auditLog = securityManagerInstance.getAuditLog();
      expect(auditLog).toHaveLength(1);
    });

    it('should handle suspicious pattern detection with very long input', () => {
      const longInput = '<script>' + 'a'.repeat(100000) + '</script>';

      expect(() => {
        securityManagerInstance.detectSuspiciousActivity(longInput);
      }).not.toThrow();
    });

    it('should handle case-insensitive suspicious pattern detection', () => {
      const testCases = [
        '<SCRIPT>alert("test")</SCRIPT>',
        '<Script>alert("test")</Script>',
        'EVAL("malicious code")',
        'Eval("malicious code")',
      ];

      testCases.forEach((testCase) => {
        const activities = securityManagerInstance.detectSuspiciousActivity(testCase);
        expect(activities.length).toBeGreaterThan(0);
      });
    });
  });
});
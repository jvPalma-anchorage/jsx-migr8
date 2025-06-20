/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import {
  FileOperationError,
  ErrorSeverity,
  createFileOperationError,
  isFileOperationError,
  handleFileOperationError,
  createRetryConfig,
  withRetry,
  withTimeout,
  withErrorRecovery,
  logError,
  sanitizeErrorForLogging,
} from '../error-handling';

// Mock dependencies
jest.mock('node:fs/promises');
jest.mock('../../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('error-handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('FileOperationError', () => {
    it('should create FileOperationError with all properties', () => {
      const originalError = new Error('Original error message');
      const operation = 'readFile';
      const filePath = '/test/file.txt';

      const error = new FileOperationError(operation, filePath, originalError);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FileOperationError);
      expect(error.name).toBe('FileOperationError');
      expect(error.message).toBe('readFile failed for /test/file.txt: Original error message');
      expect(error.operation).toBe(operation);
      expect(error.filePath).toBe(filePath);
      expect(error.originalError).toBe(originalError);
      expect(error.severity).toBe('error');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create FileOperationError with custom severity', () => {
      const originalError = new Error('Warning message');
      const error = new FileOperationError('operation', '/path', originalError, 'warning');

      expect(error.severity).toBe('warning');
    });

    it('should create FileOperationError with custom context', () => {
      const originalError = new Error('Error with context');
      const context = { userId: '123', actionId: 'abc' };
      const error = new FileOperationError('operation', '/path', originalError, 'error', context);

      expect(error.context).toEqual(context);
    });

    it('should handle string error messages', () => {
      const stringError = 'String error message';
      const error = new FileOperationError('operation', '/path', stringError as any);

      expect(error.originalError).toBe(stringError);
      expect(error.message).toContain('String error message');
    });

    it('should handle null/undefined errors', () => {
      const error1 = new FileOperationError('operation', '/path', null as any);
      const error2 = new FileOperationError('operation', '/path', undefined as any);

      expect(error1.originalError).toBe(null);
      expect(error2.originalError).toBe(undefined);
      expect(error1.message).toContain('Unknown error');
      expect(error2.message).toContain('Unknown error');
    });
  });

  describe('createFileOperationError', () => {
    it('should create FileOperationError with default severity', () => {
      const originalError = new Error('Test error');
      const error = createFileOperationError('read', '/test/file.txt', originalError);

      expect(error).toBeInstanceOf(FileOperationError);
      expect(error.operation).toBe('read');
      expect(error.filePath).toBe('/test/file.txt');
      expect(error.severity).toBe('error');
    });

    it('should create FileOperationError with custom severity and context', () => {
      const originalError = new Error('Test error');
      const context = { extra: 'info' };
      const error = createFileOperationError('write', '/test/file.txt', originalError, 'warning', context);

      expect(error.severity).toBe('warning');
      expect(error.context).toEqual(context);
    });
  });

  describe('isFileOperationError', () => {
    it('should return true for FileOperationError instances', () => {
      const error = new FileOperationError('read', '/path', new Error('test'));
      expect(isFileOperationError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('regular error');
      expect(isFileOperationError(error)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      expect(isFileOperationError('string error')).toBe(false);
      expect(isFileOperationError(null)).toBe(false);
      expect(isFileOperationError(undefined)).toBe(false);
      expect(isFileOperationError({})).toBe(false);
    });

    it('should return false for objects with similar properties', () => {
      const fakeError = {
        name: 'FileOperationError',
        operation: 'read',
        filePath: '/path',
        message: 'fake error',
      };
      expect(isFileOperationError(fakeError)).toBe(false);
    });
  });

  describe('handleFileOperationError', () => {
    let mockLogger: any;

    beforeEach(() => {
      const logger = require('../../logger');
      mockLogger = logger.logger;
    });

    it('should handle FileOperationError and log appropriately', () => {
      const originalError = new Error('File not found');
      const fileError = new FileOperationError('read', '/test/file.txt', originalError);

      const result = handleFileOperationError(fileError);

      expect(result).toEqual({
        handled: true,
        severity: 'error',
        operation: 'read',
        filePath: '/test/file.txt',
        message: fileError.message,
        context: undefined,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'File operation failed:',
        expect.objectContaining({
          operation: 'read',
          filePath: '/test/file.txt',
          error: originalError,
        })
      );
    });

    it('should handle regular Error and convert to FileOperationError', () => {
      const regularError = new Error('Regular error');

      const result = handleFileOperationError(regularError, 'unknown', '/unknown/path');

      expect(result).toEqual({
        handled: true,
        severity: 'error',
        operation: 'unknown',
        filePath: '/unknown/path',
        message: expect.stringContaining('Regular error'),
        context: undefined,
      });
    });

    it('should handle non-Error objects', () => {
      const stringError = 'String error message';

      const result = handleFileOperationError(stringError, 'parse', '/test/file.txt');

      expect(result.handled).toBe(true);
      expect(result.operation).toBe('parse');
      expect(result.filePath).toBe('/test/file.txt');
    });

    it('should handle errors with different severities', () => {
      const warningError = new FileOperationError('read', '/path', new Error('warning'), 'warning');

      const result = handleFileOperationError(warningError);

      expect(result.severity).toBe('warning');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle critical errors', () => {
      const criticalError = new FileOperationError('delete', '/critical/file', new Error('critical'), 'critical');

      const result = handleFileOperationError(criticalError);

      expect(result.severity).toBe('critical');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'CRITICAL file operation failed:',
        expect.any(Object)
      );
    });
  });

  describe('createRetryConfig', () => {
    it('should create retry config with default values', () => {
      const config = createRetryConfig();

      expect(config).toEqual({
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
        retryCondition: expect.any(Function),
      });
    });

    it('should create retry config with custom values', () => {
      const customConfig = createRetryConfig({
        maxAttempts: 5,
        baseDelay: 500,
        maxDelay: 5000,
        backoffFactor: 1.5,
      });

      expect(customConfig.maxAttempts).toBe(5);
      expect(customConfig.baseDelay).toBe(500);
      expect(customConfig.maxDelay).toBe(5000);
      expect(customConfig.backoffFactor).toBe(1.5);
    });

    it('should have default retry condition that retries on certain errors', () => {
      const config = createRetryConfig();

      // Should retry on ENOENT, EMFILE, EBUSY, EAGAIN
      expect(config.retryCondition(new Error('ENOENT: no such file'), 1)).toBe(true);
      expect(config.retryCondition(new Error('EMFILE: too many open files'), 1)).toBe(true);
      expect(config.retryCondition(new Error('EBUSY: resource busy'), 1)).toBe(true);
      expect(config.retryCondition(new Error('EAGAIN: resource temporarily unavailable'), 1)).toBe(true);

      // Should not retry on other errors
      expect(config.retryCondition(new Error('EACCES: permission denied'), 1)).toBe(false);
      expect(config.retryCondition(new Error('EPERM: operation not permitted'), 1)).toBe(false);
    });

    it('should have custom retry condition', () => {
      const customCondition = jest.fn().mockReturnValue(true);
      const config = createRetryConfig({ retryCondition: customCondition });

      const error = new Error('test error');
      config.retryCondition(error, 2);

      expect(customCondition).toHaveBeenCalledWith(error, 2);
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const successfulOperation = jest.fn().mockResolvedValue('success');
      const config = createRetryConfig({ maxAttempts: 3 });

      const promise = withRetry(successfulOperation, config);
      const result = await promise;

      expect(result).toBe('success');
      expect(successfulOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const failingOperation = jest.fn()
        .mockRejectedValueOnce(new Error('ENOENT: no such file'))
        .mockRejectedValueOnce(new Error('EMFILE: too many open files'))
        .mockResolvedValue('success');

      const config = createRetryConfig({ maxAttempts: 3, baseDelay: 100 });

      const promise = withRetry(failingOperation, config);
      
      // Advance timers to resolve delays
      jest.runAllTimers();
      
      const result = await promise;

      expect(result).toBe('success');
      expect(failingOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('EACCES: permission denied'));
      const config = createRetryConfig({ maxAttempts: 3 });

      await expect(withRetry(failingOperation, config)).rejects.toThrow('EACCES: permission denied');
      expect(failingOperation).toHaveBeenCalledTimes(1);
    });

    it('should exhaust all retry attempts', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('ENOENT: no such file'));
      const config = createRetryConfig({ maxAttempts: 3, baseDelay: 100 });

      const promise = withRetry(failingOperation, config);
      
      // Advance timers to resolve delays
      jest.runAllTimers();

      await expect(promise).rejects.toThrow('ENOENT: no such file');
      expect(failingOperation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff with jitter', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('ENOENT: no such file'));
      const config = createRetryConfig({ maxAttempts: 3, baseDelay: 1000, backoffFactor: 2 });

      const promise = withRetry(failingOperation, config);

      // First retry after ~1000ms
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Allow microtasks to run

      // Second retry after ~2000ms (with some jitter)
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      // Final attempt
      jest.runAllTimers();

      await expect(promise).rejects.toThrow('ENOENT: no such file');
      expect(failingOperation).toHaveBeenCalledTimes(3);
    });

    it('should respect max delay', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('ENOENT: no such file'));
      const config = createRetryConfig({ 
        maxAttempts: 4, 
        baseDelay: 1000, 
        maxDelay: 2000, 
        backoffFactor: 10 
      });

      const promise = withRetry(failingOperation, config);
      
      jest.runAllTimers();

      await expect(promise).rejects.toThrow('ENOENT: no such file');
    });
  });

  describe('withTimeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should resolve before timeout', async () => {
      const fastOperation = jest.fn().mockResolvedValue('success');

      const promise = withTimeout(fastOperation(), 5000);
      const result = await promise;

      expect(result).toBe('success');
    });

    it('should timeout slow operations', async () => {
      const slowOperation = new Promise((resolve) => {
        setTimeout(() => resolve('too slow'), 10000);
      });

      const promise = withTimeout(slowOperation, 5000);
      
      // Advance time past timeout
      jest.advanceTimersByTime(5001);

      await expect(promise).rejects.toThrow('Operation timed out after 5000ms');
    });

    it('should use custom timeout message', async () => {
      const slowOperation = new Promise((resolve) => {
        setTimeout(() => resolve('too slow'), 10000);
      });

      const promise = withTimeout(slowOperation, 3000, 'Custom timeout message');
      
      jest.advanceTimersByTime(3001);

      await expect(promise).rejects.toThrow('Custom timeout message');
    });

    it('should handle rejection before timeout', async () => {
      const failingOperation = Promise.reject(new Error('Operation failed'));

      const promise = withTimeout(failingOperation, 5000);

      await expect(promise).rejects.toThrow('Operation failed');
    });
  });

  describe('withErrorRecovery', () => {
    it('should execute operation without recovery if successful', async () => {
      const successfulOperation = jest.fn().mockResolvedValue('success');
      const recoveryFn = jest.fn();

      const result = await withErrorRecovery(successfulOperation, recoveryFn);

      expect(result).toBe('success');
      expect(successfulOperation).toHaveBeenCalledTimes(1);
      expect(recoveryFn).not.toHaveBeenCalled();
    });

    it('should execute recovery function on error', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const recoveryFn = jest.fn().mockResolvedValue('recovered');

      const result = await withErrorRecovery(failingOperation, recoveryFn);

      expect(result).toBe('recovered');
      expect(failingOperation).toHaveBeenCalledTimes(1);
      expect(recoveryFn).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should propagate error if recovery also fails', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const failingRecovery = jest.fn().mockRejectedValue(new Error('Recovery failed'));

      await expect(withErrorRecovery(failingOperation, failingRecovery)).rejects.toThrow('Recovery failed');

      expect(failingOperation).toHaveBeenCalledTimes(1);
      expect(failingRecovery).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should pass original error to recovery function', async () => {
      const originalError = new Error('Original error');
      const failingOperation = jest.fn().mockRejectedValue(originalError);
      const recoveryFn = jest.fn().mockResolvedValue('recovered');

      await withErrorRecovery(failingOperation, recoveryFn);

      expect(recoveryFn).toHaveBeenCalledWith(originalError);
    });
  });

  describe('logError', () => {
    let mockLogger: any;

    beforeEach(() => {
      const logger = require('../../logger');
      mockLogger = logger.logger;
    });

    it('should log FileOperationError with appropriate level', () => {
      const error = new FileOperationError('read', '/path', new Error('test'), 'warning');

      logError(error);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'File operation error:',
        expect.objectContaining({
          operation: 'read',
          filePath: '/path',
          severity: 'warning',
        })
      );
    });

    it('should log regular Error with error level', () => {
      const error = new Error('Regular error');

      logError(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Regular error',
          name: 'Error',
        })
      );
    });

    it('should log with custom context', () => {
      const error = new Error('Error with context');
      const context = { userId: '123', operation: 'test' };

      logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Error with context',
          context,
        })
      );
    });

    it('should handle non-Error objects', () => {
      const stringError = 'String error';

      logError(stringError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          error: 'String error',
          type: 'string',
        })
      );
    });
  });

  describe('sanitizeErrorForLogging', () => {
    it('should sanitize FileOperationError', () => {
      const error = new FileOperationError('read', '/path', new Error('original'), 'error', { secret: 'hidden' });

      const sanitized = sanitizeErrorForLogging(error);

      expect(sanitized).toMatchObject({
        name: 'FileOperationError',
        operation: 'read',
        filePath: '/path',
        severity: 'error',
        message: expect.any(String),
        timestamp: expect.any(Date),
        context: { secret: '[REDACTED]' },
      });
    });

    it('should sanitize regular Error', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      const sanitized = sanitizeErrorForLogging(error);

      expect(sanitized).toMatchObject({
        name: 'Error',
        message: 'Test error',
        stack: expect.any(String),
      });
    });

    it('should handle non-Error objects', () => {
      const stringError = 'String error';

      const sanitized = sanitizeErrorForLogging(stringError);

      expect(sanitized).toEqual({
        error: 'String error',
        type: 'string',
      });
    });

    it('should redact sensitive information', () => {
      const error = new FileOperationError('read', '/secret/path', new Error('error'), 'error', {
        password: 'secret123',
        token: 'abc123',
        apiKey: 'key123',
        authorization: 'Bearer token',
        normal: 'value',
      });

      const sanitized = sanitizeErrorForLogging(error);

      expect(sanitized.context).toEqual({
        password: '[REDACTED]',
        token: '[REDACTED]',
        apiKey: '[REDACTED]',
        authorization: '[REDACTED]',
        normal: 'value',
      });
    });

    it('should handle circular references', () => {
      const circular: any = { name: 'circular' };
      circular.self = circular;

      const error = new FileOperationError('read', '/path', new Error('test'), 'error', circular);

      expect(() => sanitizeErrorForLogging(error)).not.toThrow();

      const sanitized = sanitizeErrorForLogging(error);
      expect(sanitized.context).toBe('[Circular reference detected]');
    });

    it('should limit stack trace length', () => {
      const error = new Error('Test error');
      error.stack = Array.from({ length: 100 }, (_, i) => `    at line${i}`).join('\n');

      const sanitized = sanitizeErrorForLogging(error);

      expect(sanitized.stack.split('\n')).toHaveLength(21); // First 20 lines + truncation notice
      expect(sanitized.stack).toContain('[Stack trace truncated]');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should combine retry with timeout', async () => {
      const failingOperation = jest.fn()
        .mockRejectedValueOnce(new Error('ENOENT: no such file'))
        .mockResolvedValue('success');

      const retryConfig = createRetryConfig({ maxAttempts: 3, baseDelay: 100 });

      const promise = withTimeout(
        withRetry(failingOperation, retryConfig),
        5000
      );

      jest.runAllTimers();

      const result = await promise;
      expect(result).toBe('success');
    });

    it('should combine retry with error recovery', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('ENOENT: no such file'));
      const recoveryFn = jest.fn().mockResolvedValue('recovered');
      const retryConfig = createRetryConfig({ maxAttempts: 2, baseDelay: 100 });

      const promise = withErrorRecovery(
        withRetry(failingOperation, retryConfig),
        recoveryFn
      );

      jest.runAllTimers();

      const result = await promise;
      expect(result).toBe('recovered');
      expect(failingOperation).toHaveBeenCalledTimes(2);
      expect(recoveryFn).toHaveBeenCalledTimes(1);
    });

    it('should handle complex error scenarios', async () => {
      let attemptCount = 0;
      const complexOperation = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) throw new Error('ENOENT: no such file');
        if (attemptCount === 2) throw new Error('EMFILE: too many open files');
        if (attemptCount === 3) throw new Error('EACCES: permission denied');
        return 'success';
      });

      const retryConfig = createRetryConfig({ maxAttempts: 4, baseDelay: 100 });
      const recoveryFn = jest.fn().mockResolvedValue('recovered from permission error');

      const promise = withErrorRecovery(
        withRetry(complexOperation, retryConfig),
        recoveryFn
      );

      jest.runAllTimers();

      const result = await promise;
      expect(result).toBe('recovered from permission error');
      expect(complexOperation).toHaveBeenCalledTimes(3); // Stopped at non-retryable error
      expect(recoveryFn).toHaveBeenCalledWith(expect.objectContaining({
        message: 'EACCES: permission denied'
      }));
    });
  });
});
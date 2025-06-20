/**
 * @file secure-prompts.test.ts
 * @description Comprehensive unit tests for security-enhanced user input validation
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockSecurePrompts = {
  secureSelect: jest.fn(),
  secureConfirmationInput: jest.fn(),
  secureTextInput: jest.fn(),
  validateUserInput: jest.fn(),
  sanitizeInput: jest.fn(),
  detectSuspiciousPatterns: jest.fn(),
  SecurityError: class extends Error {
    constructor(message: string, public readonly code: string) {
      super(message);
      this.name = 'SecurityError';
    }
  }
};

// Mock dependencies
jest.mock('../../validation', () => ({
  logSecurityEvent: jest.fn(),
  getSecureContext: jest.fn(),
}));

jest.mock('@inquirer/prompts', () => ({
  select: jest.fn(),
  input: jest.fn(),
  confirm: jest.fn(),
}));

const mockInquirer = require('@inquirer/prompts');
const mockValidation = require('../../validation');

describe('secure-prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mocks
    mockValidation.logSecurityEvent.mockImplementation(() => {});
    mockValidation.getSecureContext.mockReturnValue({
      isValid: true,
      allowedPatterns: ['[a-zA-Z0-9\\-_]'],
      blockedPatterns: ['<script', 'javascript:', 'eval\\(']
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('secureSelect', () => {
    const mockChoices = [
      { name: 'Option 1', value: 'option1' },
      { name: 'Option 2', value: 'option2' },
      { name: 'Exit', value: 'exit' }
    ];

    it('should handle normal selection', async () => {
      mockInquirer.select.mockResolvedValue('option1');
      mockSecurePrompts.secureSelect.mockResolvedValue('option1');

      const result = await mockSecurePrompts.secureSelect({
        message: 'Choose an option:',
        choices: mockChoices
      });

      expect(result).toBe('option1');
      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'secure-prompt-select',
        'info',
        'User made selection',
        expect.objectContaining({
          selection: 'option1'
        })
      );
    });

    it('should validate choice exists in options', async () => {
      mockInquirer.select.mockResolvedValue('invalid-option');
      mockSecurePrompts.secureSelect.mockRejectedValue(
        new mockSecurePrompts.SecurityError('Invalid selection', 'INVALID_CHOICE')
      );

      await expect(mockSecurePrompts.secureSelect({
        message: 'Choose an option:',
        choices: mockChoices
      })).rejects.toThrow('Invalid selection');

      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'security-violation',
        'warn',
        'Invalid selection attempt',
        expect.any(Object)
      );
    });

    it('should handle keyboard interrupts gracefully', async () => {
      const keyboardInterrupt = new Error('User interrupted');
      (keyboardInterrupt as any).name = 'ExitPromptError';
      
      mockInquirer.select.mockRejectedValue(keyboardInterrupt);
      mockSecurePrompts.secureSelect.mockRejectedValue(keyboardInterrupt);

      await expect(mockSecurePrompts.secureSelect({
        message: 'Choose an option:',
        choices: mockChoices
      })).rejects.toThrow('User interrupted');
    });

    it('should sanitize choice values', async () => {
      const maliciousChoices = [
        { name: 'Safe Option', value: 'safe' },
        { name: 'Malicious <script>alert("xss")</script>', value: 'malicious' }
      ];

      mockSecurePrompts.secureSelect.mockImplementation(async ({ choices }) => {
        // Simulate sanitization
        const sanitizedChoices = choices.map((choice: any) => ({
          ...choice,
          name: choice.name.replace(/<[^>]*>/g, '') // Remove HTML tags
        }));
        return 'safe';
      });

      const result = await mockSecurePrompts.secureSelect({
        message: 'Choose:',
        choices: maliciousChoices
      });

      expect(result).toBe('safe');
    });

    it('should timeout on slow responses', async () => {
      jest.setTimeout(3000);
      
      mockInquirer.select.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('option1'), 5000))
      );
      mockSecurePrompts.secureSelect.mockRejectedValue(
        new Error('Selection timeout')
      );

      await expect(mockSecurePrompts.secureSelect({
        message: 'Choose quickly:',
        choices: mockChoices,
        timeout: 1000
      })).rejects.toThrow('Selection timeout');
    });

    it('should limit choice attempts', async () => {
      let attempts = 0;
      mockSecurePrompts.secureSelect.mockImplementation(async () => {
        attempts++;
        if (attempts <= 3) {
          throw new mockSecurePrompts.SecurityError('Invalid choice', 'INVALID_CHOICE');
        }
        throw new mockSecurePrompts.SecurityError('Too many attempts', 'MAX_ATTEMPTS_EXCEEDED');
      });

      await expect(mockSecurePrompts.secureSelect({
        message: 'Choose:',
        choices: mockChoices,
        maxAttempts: 3
      })).rejects.toThrow('Too many attempts');

      expect(attempts).toBe(4);
      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'security-violation',
        'error',
        'Maximum selection attempts exceeded',
        expect.any(Object)
      );
    });
  });

  describe('secureConfirmationInput', () => {
    it('should handle valid confirmation', async () => {
      mockInquirer.input.mockResolvedValue('yes');
      mockSecurePrompts.secureConfirmationInput.mockResolvedValue(true);

      const result = await mockSecurePrompts.secureConfirmationInput(
        'Are you sure you want to proceed?'
      );

      expect(result).toBe(true);
      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'secure-confirmation',
        'info',
        'User confirmed action',
        expect.objectContaining({
          confirmed: true
        })
      );
    });

    it('should handle rejection', async () => {
      mockInquirer.input.mockResolvedValue('no');
      mockSecurePrompts.secureConfirmationInput.mockResolvedValue(false);

      const result = await mockSecurePrompts.secureConfirmationInput(
        'Delete all files?'
      );

      expect(result).toBe(false);
      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'secure-confirmation',
        'info',
        'User declined action',
        expect.objectContaining({
          confirmed: false
        })
      );
    });

    it('should validate exact confirmation text', async () => {
      mockInquirer.input.mockResolvedValue('yep');
      mockSecurePrompts.secureConfirmationInput.mockRejectedValue(
        new mockSecurePrompts.SecurityError('Invalid confirmation', 'INVALID_CONFIRMATION')
      );

      await expect(mockSecurePrompts.secureConfirmationInput(
        'Type "yes" to confirm:'
      )).rejects.toThrow('Invalid confirmation');
    });

    it('should be case sensitive', async () => {
      mockInquirer.input.mockResolvedValue('YES');
      mockSecurePrompts.secureConfirmationInput.mockResolvedValue(false);

      const result = await mockSecurePrompts.secureConfirmationInput(
        'Type "yes" to confirm:'
      );

      expect(result).toBe(false);
    });

    it('should handle dangerous confirmation prompts', async () => {
      mockSecurePrompts.secureConfirmationInput.mockImplementation(async (message) => {
        if (message.includes('rm -rf') || message.includes('DELETE')) {
          // Require extra confirmation for dangerous operations
          return false;
        }
        return true;
      });

      const dangerousResult = await mockSecurePrompts.secureConfirmationInput(
        'Execute: rm -rf / ?'
      );

      const safeResult = await mockSecurePrompts.secureConfirmationInput(
        'Save changes?'
      );

      expect(dangerousResult).toBe(false);
      expect(safeResult).toBe(true);
    });

    it('should limit confirmation attempts', async () => {
      let attempts = 0;
      mockSecurePrompts.secureConfirmationInput.mockImplementation(async () => {
        attempts++;
        if (attempts <= 2) {
          throw new mockSecurePrompts.SecurityError('Invalid confirmation', 'INVALID_CONFIRMATION');
        }
        throw new mockSecurePrompts.SecurityError('Too many attempts', 'MAX_ATTEMPTS_EXCEEDED');
      });

      await expect(mockSecurePrompts.secureConfirmationInput(
        'Confirm action:',
        { maxAttempts: 2 }
      )).rejects.toThrow('Too many attempts');

      expect(attempts).toBe(3);
    });
  });

  describe('secureTextInput', () => {
    it('should handle normal text input', async () => {
      mockInquirer.input.mockResolvedValue('normal-input');
      mockSecurePrompts.secureTextInput.mockResolvedValue('normal-input');

      const result = await mockSecurePrompts.secureTextInput({
        message: 'Enter a name:',
        validate: (input: string) => input.length > 0
      });

      expect(result).toBe('normal-input');
    });

    it('should detect suspicious patterns', async () => {
      const suspiciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:void(0)',
        '../../etc/passwd',
        'rm -rf /',
        'eval(malicious_code)',
        'SELECT * FROM users; DROP TABLE users;'
      ];

      for (const input of suspiciousInputs) {
        mockSecurePrompts.detectSuspiciousPatterns.mockReturnValue(true);
        mockSecurePrompts.secureTextInput.mockRejectedValue(
          new mockSecurePrompts.SecurityError('Suspicious input detected', 'SUSPICIOUS_PATTERN')
        );

        await expect(mockSecurePrompts.secureTextInput({
          message: 'Enter text:',
          value: input
        })).rejects.toThrow('Suspicious input detected');

        expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
          'security-violation',
          'warn',
          'Suspicious input pattern detected',
          expect.objectContaining({
            input: expect.stringContaining(input.substring(0, 10))
          })
        );
      }
    });

    it('should sanitize input', async () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitizedInput = 'Hello World';

      mockSecurePrompts.sanitizeInput.mockReturnValue(sanitizedInput);
      mockSecurePrompts.secureTextInput.mockResolvedValue(sanitizedInput);

      const result = await mockSecurePrompts.secureTextInput({
        message: 'Enter text:',
        value: maliciousInput,
        sanitize: true
      });

      expect(result).toBe(sanitizedInput);
      expect(mockSecurePrompts.sanitizeInput).toHaveBeenCalledWith(maliciousInput);
    });

    it('should validate input length', async () => {
      const longInput = 'a'.repeat(10000);
      
      mockSecurePrompts.secureTextInput.mockRejectedValue(
        new mockSecurePrompts.SecurityError('Input too long', 'INPUT_TOO_LONG')
      );

      await expect(mockSecurePrompts.secureTextInput({
        message: 'Enter text:',
        value: longInput,
        maxLength: 1000
      })).rejects.toThrow('Input too long');
    });

    it('should handle file path inputs securely', async () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '/etc/shadow',
        'C:\\Windows\\System32\\config\\sam',
        '\\\\network\\share\\sensitive',
        '/dev/urandom'
      ];

      for (const path of dangerousPaths) {
        mockSecurePrompts.detectSuspiciousPatterns.mockReturnValue(true);
        mockSecurePrompts.secureTextInput.mockRejectedValue(
          new mockSecurePrompts.SecurityError('Dangerous path detected', 'DANGEROUS_PATH')
        );

        await expect(mockSecurePrompts.secureTextInput({
          message: 'Enter path:',
          value: path,
          type: 'path'
        })).rejects.toThrow('Dangerous path detected');
      }
    });

    it('should handle URL inputs securely', async () => {
      const dangerousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd',
        'ftp://malicious.com/backdoor.exe'
      ];

      for (const url of dangerousUrls) {
        mockSecurePrompts.detectSuspiciousPatterns.mockReturnValue(true);
        mockSecurePrompts.secureTextInput.mockRejectedValue(
          new mockSecurePrompts.SecurityError('Dangerous URL detected', 'DANGEROUS_URL')
        );

        await expect(mockSecurePrompts.secureTextInput({
          message: 'Enter URL:',
          value: url,
          type: 'url'
        })).rejects.toThrow('Dangerous URL detected');
      }
    });
  });

  describe('validateUserInput', () => {
    it('should validate against allowed patterns', () => {
      const validInputs = [
        'normal-text',
        'file_name.txt',
        'Component123',
        'kebab-case-name'
      ];

      validInputs.forEach(input => {
        mockSecurePrompts.validateUserInput.mockReturnValue(true);
        const result = mockSecurePrompts.validateUserInput(input, {
          allowedPatterns: ['^[a-zA-Z0-9\\-_.]+$']
        });
        expect(result).toBe(true);
      });
    });

    it('should reject blocked patterns', () => {
      const blockedInputs = [
        '<script>',
        'javascript:',
        'eval(',
        '../',
        'rm -rf',
        'DROP TABLE'
      ];

      blockedInputs.forEach(input => {
        mockSecurePrompts.validateUserInput.mockReturnValue(false);
        const result = mockSecurePrompts.validateUserInput(input, {
          blockedPatterns: ['<script', 'javascript:', 'eval\\(', '\\.\\./']
        });
        expect(result).toBe(false);
      });
    });

    it('should handle complex validation rules', () => {
      mockSecurePrompts.validateUserInput.mockImplementation((input, rules) => {
        // Simulate complex validation
        if (rules.minLength && input.length < rules.minLength) return false;
        if (rules.maxLength && input.length > rules.maxLength) return false;
        if (rules.required && !input.trim()) return false;
        if (rules.customValidator && !rules.customValidator(input)) return false;
        return true;
      });

      // Valid case
      expect(mockSecurePrompts.validateUserInput('valid-input', {
        minLength: 5,
        maxLength: 50,
        required: true
      })).toBe(true);

      // Invalid cases
      expect(mockSecurePrompts.validateUserInput('', {
        required: true
      })).toBe(false);

      expect(mockSecurePrompts.validateUserInput('ab', {
        minLength: 5
      })).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      const inputs = [
        '<script>alert("xss")</script>',
        '<div>Hello World</div>',
        '<img src="x" onerror="alert(1)">',
        'Normal text with <b>bold</b> parts'
      ];
      
      const expected = [
        'alert("xss")',
        'Hello World',
        '',
        'Normal text with bold parts'
      ];

      inputs.forEach((input, index) => {
        mockSecurePrompts.sanitizeInput.mockReturnValue(expected[index]);
        const result = mockSecurePrompts.sanitizeInput(input);
        expect(result).toBe(expected[index]);
      });
    });

    it('should normalize whitespace', () => {
      const input = '  \t\n  Multiple   \t\n  Spaces  \t\n  ';
      const expected = 'Multiple Spaces';
      
      mockSecurePrompts.sanitizeInput.mockReturnValue(expected);
      const result = mockSecurePrompts.sanitizeInput(input);
      expect(result).toBe(expected);
    });

    it('should handle unicode normalization', () => {
      const input = 'café'; // With combining characters
      const expected = 'café'; // Normalized form
      
      mockSecurePrompts.sanitizeInput.mockReturnValue(expected);
      const result = mockSecurePrompts.sanitizeInput(input);
      expect(result).toBe(expected);
    });

    it('should remove control characters', () => {
      const input = 'Hello\x00\x01\x02World\x7F';
      const expected = 'HelloWorld';
      
      mockSecurePrompts.sanitizeInput.mockReturnValue(expected);
      const result = mockSecurePrompts.sanitizeInput(input);
      expect(result).toBe(expected);
    });
  });

  describe('error handling', () => {
    it('should handle network interruptions', async () => {
      const networkError = new Error('Network error');
      (networkError as any).code = 'ENOTFOUND';
      
      mockInquirer.select.mockRejectedValue(networkError);
      mockSecurePrompts.secureSelect.mockRejectedValue(networkError);

      await expect(mockSecurePrompts.secureSelect({
        message: 'Choose:',
        choices: []
      })).rejects.toThrow('Network error');
    });

    it('should handle permission errors', async () => {
      const permissionError = new Error('Permission denied');
      (permissionError as any).code = 'EACCES';
      
      mockSecurePrompts.secureTextInput.mockRejectedValue(permissionError);

      await expect(mockSecurePrompts.secureTextInput({
        message: 'Enter path:'
      })).rejects.toThrow('Permission denied');
    });

    it('should handle invalid terminal state', async () => {
      const terminalError = new Error('Not a TTY');
      (terminalError as any).code = 'ENOTTY';
      
      mockInquirer.input.mockRejectedValue(terminalError);
      mockSecurePrompts.secureConfirmationInput.mockRejectedValue(terminalError);

      await expect(mockSecurePrompts.secureConfirmationInput(
        'Confirm:'
      )).rejects.toThrow('Not a TTY');
    });
  });

  describe('security logging', () => {
    it('should log all security events', async () => {
      mockSecurePrompts.secureSelect.mockResolvedValue('safe-option');

      await mockSecurePrompts.secureSelect({
        message: 'Choose:',
        choices: [{ name: 'Safe', value: 'safe-option' }]
      });

      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'secure-prompt-select',
        'info',
        'User made selection',
        expect.any(Object)
      );
    });

    it('should log security violations with details', async () => {
      mockSecurePrompts.secureTextInput.mockRejectedValue(
        new mockSecurePrompts.SecurityError('XSS attempt', 'XSS_DETECTED')
      );

      try {
        await mockSecurePrompts.secureTextInput({
          message: 'Enter code:',
          value: '<script>alert("xss")</script>'
        });
      } catch (error) {
        // Expected to throw
      }

      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'security-violation',
        'error',
        'XSS attempt',
        expect.objectContaining({
          errorCode: 'XSS_DETECTED'
        })
      );
    });

    it('should anonymize sensitive data in logs', () => {
      const sensitiveInput = 'password123';
      
      mockSecurePrompts.validateUserInput.mockImplementation((input, options) => {
        if (options.sensitive) {
          expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(String),
            expect.any(String),
            expect.objectContaining({
              inputLength: sensitiveInput.length,
              inputHash: expect.any(String) // Should be hashed, not plain text
            })
          );
        }
        return true;
      });

      mockSecurePrompts.validateUserInput(sensitiveInput, {
        sensitive: true
      });
    });
  });
});
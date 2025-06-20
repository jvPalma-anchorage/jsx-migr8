/**
 * @file fileAnalyzer.test.ts
 * @description Comprehensive unit tests for file analysis orchestrator
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { analyzeFile } from '../fileAnalyzer';
import * as globalContext from '../../context/globalContext';
import * as pathUtils from '../../utils/pathUtils';
import * as importsAnalyzer from '../imports';
import * as jsxUsageAnalyzer from '../jsxUsage';
import { FileOperationError } from '../../utils/fs-utils';

// Mock dependencies
jest.mock('../../context/globalContext');
jest.mock('../../utils/pathUtils');
jest.mock('../imports');
jest.mock('../jsxUsage');
jest.mock('recast', () => ({
  types: {},
  visit: jest.fn(),
}));

const mockRecast = require('recast');

describe('fileAnalyzer', () => {
  const mockAbsPath = '/test/path/Component.tsx';
  const mockAst = {
    type: 'Program',
    body: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock global context functions
    (globalContext.lWarning as jest.Mock) = jest.fn();
    (globalContext.lError as jest.Mock) = jest.fn();
    
    // Mock path utils
    (pathUtils.getFileCode as jest.Mock) = jest.fn().mockReturnValue([mockAst]);
    
    // Mock analyzers
    (importsAnalyzer.analyzeImportDeclaration as jest.Mock) = jest.fn();
    (jsxUsageAnalyzer.analyzeJSXElement as jest.Mock) = jest.fn();
    
    // Mock recast visit function
    mockRecast.visit.mockImplementation((ast: any, visitor: any) => {
      // Simulate visiting import declaration
      if (visitor.visitImportDeclaration) {
        const mockPath = {
          node: { type: 'ImportDeclaration' },
        };
        const mockThis = {
          traverse: jest.fn(),
        };
        visitor.visitImportDeclaration.call(mockThis, mockPath);
      }
      
      // Simulate visiting JSX element
      if (visitor.visitJSXElement) {
        const mockPath = {
          node: { type: 'JSXElement' },
        };
        const mockThis = {
          traverse: jest.fn(),
        };
        visitor.visitJSXElement.call(mockThis, mockPath);
      }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('analyzeFile', () => {
    it('should successfully analyze a file with imports and JSX', () => {
      const result = analyzeFile(mockAbsPath);

      expect(result).toBe(true);
      expect(pathUtils.getFileCode).toHaveBeenCalledWith(mockAbsPath);
      expect(mockRecast.visit).toHaveBeenCalledWith(mockAst, expect.any(Object));
      expect(importsAnalyzer.analyzeImportDeclaration).toHaveBeenCalled();
      expect(jsxUsageAnalyzer.analyzeJSXElement).toHaveBeenCalled();
    });

    it('should handle import analysis errors gracefully', () => {
      const errorMessage = 'Import analysis failed';
      (importsAnalyzer.analyzeImportDeclaration as jest.Mock).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = analyzeFile(mockAbsPath);

      expect(result).toBe(true);
      expect(globalContext.lWarning).toHaveBeenCalledWith(
        `Failed to analyze import in ${mockAbsPath}:`,
        expect.any(Error)
      );
    });

    it('should handle JSX analysis errors gracefully', () => {
      const errorMessage = 'JSX analysis failed';
      (jsxUsageAnalyzer.analyzeJSXElement as jest.Mock).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = analyzeFile(mockAbsPath);

      expect(result).toBe(true);
      expect(globalContext.lWarning).toHaveBeenCalledWith(
        `Failed to analyze JSX element in ${mockAbsPath}:`,
        expect.any(Error)
      );
    });

    it('should handle FileOperationError and return false', () => {
      const errorMessage = 'File not found';
      (pathUtils.getFileCode as jest.Mock).mockImplementation(() => {
        throw new FileOperationError('getFileCode', mockAbsPath, new Error(errorMessage));
      });

      const result = analyzeFile(mockAbsPath);

      expect(result).toBe(false);
      expect(globalContext.lError).toHaveBeenCalledWith(
        `File analysis failed for ${mockAbsPath}: ${errorMessage}`
      );
    });

    it('should handle unexpected errors and return false', () => {
      const errorMessage = 'Unexpected error';
      (pathUtils.getFileCode as jest.Mock).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = analyzeFile(mockAbsPath);

      expect(result).toBe(false);
      expect(globalContext.lError).toHaveBeenCalledWith(
        `Unexpected error analyzing ${mockAbsPath}:`,
        expect.any(Error)
      );
    });

    it('should handle empty AST correctly', () => {
      const emptyAst = { type: 'Program', body: [] };
      (pathUtils.getFileCode as jest.Mock).mockReturnValue([emptyAst]);
      
      // Mock visit to not call any visitors
      mockRecast.visit.mockImplementation((ast: any, visitor: any) => {
        // Do nothing - empty file
      });

      const result = analyzeFile(mockAbsPath);

      expect(result).toBe(true);
      expect(pathUtils.getFileCode).toHaveBeenCalledWith(mockAbsPath);
      expect(mockRecast.visit).toHaveBeenCalledWith(emptyAst, expect.any(Object));
    });

    it('should call traverse method on visitor context', () => {
      const mockTraverse = jest.fn();
      
      mockRecast.visit.mockImplementation((ast: any, visitor: any) => {
        const mockPath = {
          node: { type: 'ImportDeclaration' },
        };
        const mockThis = {
          traverse: mockTraverse,
        };
        
        if (visitor.visitImportDeclaration) {
          visitor.visitImportDeclaration.call(mockThis, mockPath);
        }
      });

      analyzeFile(mockAbsPath);

      expect(mockTraverse).toHaveBeenCalled();
    });

    it('should handle analyzer functions returning null', () => {
      (importsAnalyzer.analyzeImportDeclaration as jest.Mock).mockReturnValue(null);
      (jsxUsageAnalyzer.analyzeJSXElement as jest.Mock).mockReturnValue(null);

      const result = analyzeFile(mockAbsPath);

      expect(result).toBe(true);
      expect(importsAnalyzer.analyzeImportDeclaration).toHaveBeenCalled();
      expect(jsxUsageAnalyzer.analyzeJSXElement).toHaveBeenCalled();
    });

    it('should handle complex file with multiple imports and JSX elements', () => {
      let visitImportCount = 0;
      let visitJSXCount = 0;

      mockRecast.visit.mockImplementation((ast: any, visitor: any) => {
        // Simulate multiple imports
        if (visitor.visitImportDeclaration) {
          for (let i = 0; i < 3; i++) {
            visitImportCount++;
            const mockPath = {
              node: { type: 'ImportDeclaration', source: { value: `package-${i}` } },
            };
            const mockThis = { traverse: jest.fn() };
            visitor.visitImportDeclaration.call(mockThis, mockPath);
          }
        }
        
        // Simulate multiple JSX elements
        if (visitor.visitJSXElement) {
          for (let i = 0; i < 5; i++) {
            visitJSXCount++;
            const mockPath = {
              node: { type: 'JSXElement', openingElement: { name: { name: `Component${i}` } } },
            };
            const mockThis = { traverse: jest.fn() };
            visitor.visitJSXElement.call(mockThis, mockPath);
          }
        }
      });

      const result = analyzeFile(mockAbsPath);

      expect(result).toBe(true);
      expect(importsAnalyzer.analyzeImportDeclaration).toHaveBeenCalledTimes(3);
      expect(jsxUsageAnalyzer.analyzeJSXElement).toHaveBeenCalledTimes(5);
    });

    it('should handle AST parsing errors', () => {
      (pathUtils.getFileCode as jest.Mock).mockImplementation(() => {
        throw new SyntaxError('Invalid syntax');
      });

      const result = analyzeFile(mockAbsPath);

      expect(result).toBe(false);
      expect(globalContext.lError).toHaveBeenCalledWith(
        `Unexpected error analyzing ${mockAbsPath}:`,
        expect.any(SyntaxError)
      );
    });

    it('should handle visitor initialization errors', () => {
      mockRecast.visit.mockImplementation(() => {
        throw new Error('Visitor initialization failed');
      });

      const result = analyzeFile(mockAbsPath);

      expect(result).toBe(false);
      expect(globalContext.lError).toHaveBeenCalledWith(
        `Unexpected error analyzing ${mockAbsPath}:`,
        expect.any(Error)
      );
    });
  });

  describe('error scenarios', () => {
    it('should handle null/undefined AST', () => {
      (pathUtils.getFileCode as jest.Mock).mockReturnValue([null]);

      const result = analyzeFile(mockAbsPath);

      expect(result).toBe(false);
      expect(globalContext.lError).toHaveBeenCalled();
    });

    it('should handle empty file path', () => {
      const result = analyzeFile('');

      expect(result).toBe(false);
      expect(globalContext.lError).toHaveBeenCalled();
    });

    it('should handle invalid file path', () => {
      (pathUtils.getFileCode as jest.Mock).mockImplementation(() => {
        throw new FileOperationError('getFileCode', 'invalid-path', new Error('Path not found'));
      });

      const result = analyzeFile('invalid-path');

      expect(result).toBe(false);
      expect(globalContext.lError).toHaveBeenCalledWith(
        'File analysis failed for invalid-path: Path not found'
      );
    });
  });

  describe('performance', () => {
    it('should complete analysis within reasonable time for large files', () => {
      const startTime = Date.now();
      
      // Simulate large file with many nodes
      mockRecast.visit.mockImplementation((ast: any, visitor: any) => {
        // Simulate processing 1000 nodes
        for (let i = 0; i < 1000; i++) {
          if (visitor.visitImportDeclaration && i < 100) {
            const mockPath = { node: { type: 'ImportDeclaration' } };
            const mockThis = { traverse: jest.fn() };
            visitor.visitImportDeclaration.call(mockThis, mockPath);
          }
          if (visitor.visitJSXElement && i >= 100) {
            const mockPath = { node: { type: 'JSXElement' } };
            const mockThis = { traverse: jest.fn() };
            visitor.visitJSXElement.call(mockThis, mockPath);
          }
        }
      });

      const result = analyzeFile(mockAbsPath);
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
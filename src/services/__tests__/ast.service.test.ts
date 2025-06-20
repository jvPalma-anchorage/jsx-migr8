/**
 * @jest-environment node
 */

import { ASTService } from '../ast.service';
import { IFileService, ILoggerService } from '../../di/types';
import { jest } from '@jest/globals';
import { types as T, parse, print, visit } from 'recast';

// Mock dependencies
const mockFileService: jest.Mocked<IFileService> = {
  initialize: jest.fn(),
  dispose: jest.fn(),
  readFile: jest.fn(),
  readFileSync: jest.fn(),
  writeFile: jest.fn(),
  fileExists: jest.fn(),
  deleteFile: jest.fn(),
  ensureDir: jest.fn(),
  glob: jest.fn(),
  getFileStats: jest.fn(),
} as any;

const mockLoggerService: jest.Mocked<ILoggerService> = {
  initialize: jest.fn(),
  dispose: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  success: jest.fn(),
} as any;

// Mock recast
jest.mock('recast', () => ({
  parse: jest.fn(),
  print: jest.fn(),
  visit: jest.fn(),
  types: {
    ASTNode: {},
  },
}));

// Mock ast-types for builders
jest.mock('ast-types', () => ({
  builders: {
    importDeclaration: jest.fn(),
    importDefaultSpecifier: jest.fn(),
    importNamespaceSpecifier: jest.fn(),
    importSpecifier: jest.fn(),
    identifier: jest.fn(),
    literal: jest.fn(),
    jsxElement: jest.fn(),
    jsxOpeningElement: jest.fn(),
    jsxClosingElement: jest.fn(),
    jsxIdentifier: jest.fn(),
    jsxAttribute: jest.fn(),
    jsxExpressionContainer: jest.fn(),
  },
}));

describe('ASTService', () => {
  let astService: ASTService;
  let mockParse: jest.MockedFunction<typeof parse>;
  let mockPrint: jest.MockedFunction<typeof print>;
  let mockVisit: jest.MockedFunction<typeof visit>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked functions
    mockParse = parse as jest.MockedFunction<typeof parse>;
    mockPrint = print as jest.MockedFunction<typeof print>;
    mockVisit = visit as jest.MockedFunction<typeof visit>;
    
    // Create service instance
    astService = new ASTService(mockFileService, mockLoggerService);
  });

  describe('lifecycle methods', () => {
    it('should initialize without errors', async () => {
      await expect(astService.initialize()).resolves.toBeUndefined();
    });

    it('should dispose without errors', async () => {
      await expect(astService.dispose()).resolves.toBeUndefined();
    });
  });

  describe('parseFile', () => {
    it('should parse file successfully', async () => {
      const filePath = '/test/component.tsx';
      const code = 'const test = "hello";';
      const mockAST = { type: 'Program', body: [] };
      
      mockFileService.readFile.mockResolvedValue(code);
      mockParse.mockReturnValue(mockAST as any);

      const result = await astService.parseFile(filePath);

      expect(result).toEqual({ ast: mockAST, code });
      expect(mockFileService.readFile).toHaveBeenCalledWith(filePath);
      expect(mockParse).toHaveBeenCalledWith(code, expect.objectContaining({
        parser: expect.any(Object),
        tolerant: true,
        range: true,
        loc: true,
        tokens: true,
        comments: true,
      }));
    });

    it('should handle file read errors', async () => {
      const filePath = '/test/nonexistent.tsx';
      const error = new Error('File not found');
      
      mockFileService.readFile.mockRejectedValue(error);

      await expect(astService.parseFile(filePath)).rejects.toThrow(
        `Failed to parse file ${filePath}: ${error.message}`
      );
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        `Failed to parse file ${filePath}:`,
        error
      );
    });

    it('should handle parsing errors', async () => {
      const filePath = '/test/invalid.tsx';
      const code = 'invalid syntax {';
      const parseError = new Error('Unexpected token');
      
      mockFileService.readFile.mockResolvedValue(code);
      mockParse.mockImplementation(() => { throw parseError; });

      await expect(astService.parseFile(filePath)).rejects.toThrow(
        `Failed to parse file ${filePath}: ${parseError.message}`
      );
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        `Failed to parse file ${filePath}:`,
        parseError
      );
    });
  });

  describe('parseFileSync', () => {
    it('should parse file synchronously', () => {
      const filePath = '/test/component.tsx';
      const code = 'const test = "hello";';
      const mockAST = { type: 'Program', body: [] };
      
      mockFileService.readFileSync.mockReturnValue(code);
      mockParse.mockReturnValue(mockAST as any);

      const result = astService.parseFileSync(filePath);

      expect(result).toEqual({ ast: mockAST, code });
      expect(mockFileService.readFileSync).toHaveBeenCalledWith(filePath);
    });

    it('should handle sync parsing errors', () => {
      const filePath = '/test/invalid.tsx';
      const code = 'invalid syntax {';
      const parseError = new Error('Unexpected token');
      
      mockFileService.readFileSync.mockReturnValue(code);
      mockParse.mockImplementation(() => { throw parseError; });

      expect(() => astService.parseFileSync(filePath)).toThrow(
        `Failed to parse file ${filePath}: ${parseError.message}`
      );
    });
  });

  describe('parseCode', () => {
    it('should parse code string successfully', () => {
      const code = 'const greeting = "Hello, World!";';
      const mockAST = { type: 'Program', body: [] };
      
      mockParse.mockReturnValue(mockAST as any);

      const result = astService.parseCode(code);

      expect(result).toBe(mockAST);
      expect(mockParse).toHaveBeenCalledWith(code, expect.objectContaining({
        parser: expect.any(Object),
        tolerant: true,
        range: true,
        loc: true,
        tokens: true,
        comments: true,
      }));
    });

    it('should parse code with file path for better error context', () => {
      const code = 'const test = 42;';
      const filePath = '/test/utils.ts';
      const mockAST = { type: 'Program', body: [] };
      
      mockParse.mockReturnValue(mockAST as any);

      const result = astService.parseCode(code, filePath);

      expect(result).toBe(mockAST);
    });

    it('should handle parsing errors with file path context', () => {
      const code = 'invalid syntax {';
      const filePath = '/test/broken.ts';
      const parseError = new Error('Unexpected token');
      
      mockParse.mockImplementation(() => { throw parseError; });

      expect(() => astService.parseCode(code, filePath)).toThrow(
        `Failed to parse code in ${filePath}: ${parseError.message}`
      );
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        `Failed to parse code in ${filePath}:`,
        parseError
      );
    });

    it('should handle parsing errors without file path context', () => {
      const code = 'invalid syntax {';
      const parseError = new Error('Unexpected token');
      
      mockParse.mockImplementation(() => { throw parseError; });

      expect(() => astService.parseCode(code)).toThrow(
        `Failed to parse code: ${parseError.message}`
      );
    });
  });

  describe('printAST', () => {
    it('should print AST with default options', () => {
      const mockAST = { type: 'Program', body: [] };
      const expectedCode = 'const test = 42;';
      
      mockPrint.mockReturnValue({ code: expectedCode } as any);

      const result = astService.printAST(mockAST as any);

      expect(result).toBe(expectedCode);
      expect(mockPrint).toHaveBeenCalledWith(mockAST, {
        tabWidth: 2,
        quote: 'single',
        trailingComma: true,
        arrayBracketSpacing: false,
        objectCurlySpacing: true,
        reuseParsers: true,
      });
    });

    it('should print AST with custom options', () => {
      const mockAST = { type: 'Program', body: [] };
      const expectedCode = 'const test = 42;';
      const options = { tabWidth: 4, quote: 'double' as const };
      
      mockPrint.mockReturnValue({ code: expectedCode } as any);

      const result = astService.printAST(mockAST as any, options);

      expect(result).toBe(expectedCode);
      expect(mockPrint).toHaveBeenCalledWith(mockAST, {
        tabWidth: 4,
        quote: 'double',
        trailingComma: true,
        arrayBracketSpacing: false,
        objectCurlySpacing: true,
        reuseParsers: true,
      });
    });

    it('should handle print errors', () => {
      const mockAST = { type: 'Invalid' };
      const printError = new Error('Invalid AST structure');
      
      mockPrint.mockImplementation(() => { throw printError; });

      expect(() => astService.printAST(mockAST as any)).toThrow(
        `Failed to print AST: ${printError.message}`
      );
      expect(mockLoggerService.error).toHaveBeenCalledWith('Failed to print AST:', printError);
    });
  });

  describe('visitAST', () => {
    it('should visit AST with visitors', () => {
      const mockAST = { type: 'Program', body: [] };
      const visitors = {
        visitImportDeclaration: jest.fn(),
        visitJSXElement: jest.fn(),
      };

      astService.visitAST(mockAST as any, visitors);

      expect(mockVisit).toHaveBeenCalledWith(mockAST, visitors);
    });

    it('should handle visit errors', () => {
      const mockAST = { type: 'Program', body: [] };
      const visitors = {};
      const visitError = new Error('Invalid visitor');
      
      mockVisit.mockImplementation(() => { throw visitError; });

      expect(() => astService.visitAST(mockAST as any, visitors)).toThrow(
        `Failed to visit AST: ${visitError.message}`
      );
      expect(mockLoggerService.error).toHaveBeenCalledWith('Failed to visit AST:', visitError);
    });
  });

  describe('createVisitor', () => {
    it('should create visitor configuration', () => {
      const config = {
        visitImportDeclaration: jest.fn(),
        visitJSXElement: jest.fn(),
        visitCallExpression: jest.fn(),
      };

      const result = astService.createVisitor(config);

      expect(result).toBe(config);
    });

    it('should handle custom visitor methods', () => {
      const config = {
        visitCustomNode: jest.fn(),
        customMethod: 'not a function',
      };

      const result = astService.createVisitor(config);

      expect(result).toEqual(config);
    });
  });

  describe('extractImports', () => {
    it('should extract import declarations from AST', () => {
      const mockAST = { type: 'Program', body: [] };
      const mockImportNode = {
        source: { value: '@company/ui-lib' },
        specifiers: [
          {
            type: 'ImportDefaultSpecifier',
            local: { name: 'Button' },
          },
          {
            type: 'ImportSpecifier',
            imported: { name: 'Icon' },
            local: { name: 'Icon' },
          },
          {
            type: 'ImportNamespaceSpecifier',
            local: { name: 'Utils' },
          },
        ],
      };

      // Mock the visit function to call our visitor
      mockVisit.mockImplementation((ast, visitors) => {
        if (visitors.visitImportDeclaration) {
          const mockPath = { node: mockImportNode };
          visitors.visitImportDeclaration(mockPath);
        }
      });

      const result = astService.extractImports(mockAST as any);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: '@company/ui-lib',
        specifiers: [
          { type: 'default', local: 'Button' },
          { type: 'named', imported: 'Icon', local: 'Icon' },
          { type: 'namespace', local: 'Utils' },
        ],
      });
    });

    it('should handle imports with unknown specifier types', () => {
      const mockAST = { type: 'Program', body: [] };
      const mockImportNode = {
        source: { value: 'unknown-lib' },
        specifiers: [
          {
            type: 'UnknownSpecifier',
            local: { name: 'Unknown' },
          },
        ],
      };

      mockVisit.mockImplementation((ast, visitors) => {
        if (visitors.visitImportDeclaration) {
          const mockPath = { node: mockImportNode };
          visitors.visitImportDeclaration(mockPath);
        }
      });

      const result = astService.extractImports(mockAST as any);

      expect(result[0].specifiers[0]).toMatchObject({
        type: 'unknown',
        local: 'Unknown',
      });
    });

    it('should handle imports without specifiers', () => {
      const mockAST = { type: 'Program', body: [] };
      const mockImportNode = {
        source: { value: 'side-effect-import' },
        specifiers: null,
      };

      mockVisit.mockImplementation((ast, visitors) => {
        if (visitors.visitImportDeclaration) {
          const mockPath = { node: mockImportNode };
          visitors.visitImportDeclaration(mockPath);
        }
      });

      const result = astService.extractImports(mockAST as any);

      expect(result[0]).toMatchObject({
        source: 'side-effect-import',
        specifiers: [],
      });
    });
  });

  describe('extractJSXElements', () => {
    it('should extract JSX elements from AST', () => {
      const mockAST = { type: 'Program', body: [] };
      const mockJSXNode = {
        openingElement: {
          name: { type: 'JSXIdentifier', name: 'Button' },
          attributes: [
            {
              type: 'JSXAttribute',
              name: { name: 'disabled' },
              value: null, // Boolean attribute
            },
            {
              type: 'JSXAttribute',
              name: { name: 'size' },
              value: { type: 'Literal', value: 'large' },
            },
            {
              type: 'JSXAttribute',
              name: { name: 'onClick' },
              value: {
                type: 'JSXExpressionContainer',
                expression: { type: 'Identifier', name: 'handleClick' },
              },
            },
          ],
        },
        children: [{ type: 'Literal', value: 'Click me' }],
      };

      mockVisit.mockImplementation((ast, visitors) => {
        if (visitors.visitJSXElement) {
          const mockPath = { node: mockJSXNode };
          visitors.visitJSXElement(mockPath);
        }
      });

      const result = astService.extractJSXElements(mockAST as any);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'Button',
        props: {
          disabled: true,
          size: 'large',
          onClick: { type: 'Identifier', name: 'handleClick' },
        },
        children: [{ type: 'Literal', value: 'Click me' }],
      });
    });

    it('should handle JSX elements without attributes', () => {
      const mockAST = { type: 'Program', body: [] };
      const mockJSXNode = {
        openingElement: {
          name: { type: 'JSXIdentifier', name: 'div' },
          attributes: null,
        },
        children: [],
      };

      mockVisit.mockImplementation((ast, visitors) => {
        if (visitors.visitJSXElement) {
          const mockPath = { node: mockJSXNode };
          visitors.visitJSXElement(mockPath);
        }
      });

      const result = astService.extractJSXElements(mockAST as any);

      expect(result[0]).toMatchObject({
        name: 'div',
        props: {},
        children: [],
      });
    });

    it('should skip non-JSXIdentifier elements', () => {
      const mockAST = { type: 'Program', body: [] };
      const mockJSXNode = {
        openingElement: {
          name: { type: 'JSXMemberExpression', object: { name: 'React' }, property: { name: 'Fragment' } },
          attributes: [],
        },
        children: [],
      };

      mockVisit.mockImplementation((ast, visitors) => {
        if (visitors.visitJSXElement) {
          const mockPath = { node: mockJSXNode };
          visitors.visitJSXElement(mockPath);
        }
      });

      const result = astService.extractJSXElements(mockAST as any);

      expect(result).toHaveLength(0);
    });
  });

  describe('cloneNode', () => {
    it('should clone AST node successfully', () => {
      const node = { type: 'Identifier', name: 'test', value: 42 };

      const result = astService.cloneNode(node);

      expect(result).toEqual(node);
      expect(result).not.toBe(node); // Different reference
    });

    it('should handle circular references gracefully', () => {
      const circular: any = { type: 'Node', name: 'test' };
      circular.self = circular;

      const result = astService.cloneNode(circular);

      expect(result).toBe(circular); // Should return original on error
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'Failed to clone AST node, returning original:',
        expect.any(Error)
      );
    });
  });

  describe('transformAST', () => {
    it('should apply multiple transformers to AST', () => {
      const mockAST = { type: 'Program', body: [] };
      const transformer1 = {
        name: 'addComments',
        visitor: { visitProgram: jest.fn() },
      };
      const transformer2 = {
        name: 'addImports',
        visitor: { visitImportDeclaration: jest.fn() },
      };

      // Mock cloneNode to return a copy
      jest.spyOn(astService, 'cloneNode').mockReturnValue({ ...mockAST });

      const result = astService.transformAST(mockAST as any, [transformer1, transformer2]);

      expect(mockVisit).toHaveBeenCalledTimes(2);
      expect(mockLoggerService.debug).toHaveBeenCalledWith('Applied transformer: addComments');
      expect(mockLoggerService.debug).toHaveBeenCalledWith('Applied transformer: addImports');
    });

    it('should handle transformer errors', () => {
      const mockAST = { type: 'Program', body: [] };
      const failingTransformer = {
        name: 'failing',
        visitor: { visitProgram: jest.fn() },
      };
      const transformError = new Error('Transform failed');

      jest.spyOn(astService, 'cloneNode').mockReturnValue({ ...mockAST });
      mockVisit.mockImplementation(() => { throw transformError; });

      expect(() => astService.transformAST(mockAST as any, [failingTransformer])).toThrow(transformError);
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Failed to apply transformer failing:',
        transformError
      );
    });
  });

  describe('validateAST', () => {
    it('should validate correct AST structure', () => {
      const mockAST = { type: 'Program', body: [] };
      
      mockPrint.mockReturnValue({ code: 'valid code' } as any);
      mockVisit.mockImplementation((ast, visitors) => {
        if (visitors.visitProgram) {
          visitors.visitProgram();
        }
      });

      const result = astService.validateAST(mockAST as any);

      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('should detect invalid AST structure during printing', () => {
      const mockAST = { type: 'Invalid' };
      const printError = new Error('Invalid AST');
      
      mockPrint.mockImplementation(() => { throw printError; });

      const result = astService.validateAST(mockAST as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`Invalid AST structure: ${printError.message}`);
    });

    it('should detect missing Program node', () => {
      const mockAST = { type: 'Expression' };
      
      mockPrint.mockReturnValue({ code: 'valid code' } as any);
      mockVisit.mockImplementation(() => {
        // Don't call visitProgram to simulate missing Program node
      });

      const result = astService.validateAST(mockAST as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('AST does not contain a valid Program node');
    });

    it('should handle validation errors during visit', () => {
      const mockAST = { type: 'Program', body: [] };
      const visitError = new Error('Visit failed');
      
      mockPrint.mockReturnValue({ code: 'valid code' } as any);
      mockVisit.mockImplementation(() => { throw visitError; });

      const result = astService.validateAST(mockAST as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`AST validation failed: ${visitError.message}`);
    });
  });

  describe('parser selection', () => {
    it('should use TypeScript parser for .ts files', () => {
      const code = 'const test: string = "hello";';
      const filePath = '/test/file.ts';
      
      mockParse.mockReturnValue({ type: 'Program', body: [] } as any);

      astService.parseCode(code, filePath);

      expect(mockParse).toHaveBeenCalledWith(
        code,
        expect.objectContaining({
          parser: expect.any(Object),
        })
      );
    });

    it('should use TypeScript parser for .tsx files', () => {
      const code = 'const Component = () => <div>Hello</div>;';
      const filePath = '/test/component.tsx';
      
      mockParse.mockReturnValue({ type: 'Program', body: [] } as any);

      astService.parseCode(code, filePath);

      expect(mockParse).toHaveBeenCalledWith(
        code,
        expect.objectContaining({
          parser: expect.any(Object),
        })
      );
    });

    it('should default to TypeScript parser for unknown extensions', () => {
      const code = 'const test = "hello";';
      const filePath = '/test/file.unknown';
      
      mockParse.mockReturnValue({ type: 'Program', body: [] } as any);

      astService.parseCode(code, filePath);

      expect(mockParse).toHaveBeenCalledWith(
        code,
        expect.objectContaining({
          parser: expect.any(Object),
        })
      );
    });
  });

  describe('AST node creation utilities', () => {
    let mockBuilders: any;

    beforeEach(() => {
      const astTypes = require('ast-types');
      mockBuilders = astTypes.builders;
      
      // Mock all builder functions
      Object.keys(mockBuilders).forEach(key => {
        mockBuilders[key].mockReturnValue({ type: key, mocked: true });
      });
    });

    describe('createImportDeclaration', () => {
      it('should create import declaration with mixed specifiers', () => {
        const source = '@company/ui-lib';
        const specifiers = [
          { type: 'default' as const, local: 'Button' },
          { type: 'named' as const, imported: 'Icon', local: 'Icon' },
          { type: 'namespace' as const, local: 'Utils' },
        ];

        const result = astService.createImportDeclaration(source, specifiers);

        expect(mockBuilders.importDefaultSpecifier).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'identifier', mocked: true })
        );
        expect(mockBuilders.importSpecifier).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'identifier', mocked: true }),
          expect.objectContaining({ type: 'identifier', mocked: true })
        );
        expect(mockBuilders.importNamespaceSpecifier).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'identifier', mocked: true })
        );
        expect(mockBuilders.importDeclaration).toHaveBeenCalled();
      });

      it('should handle named imports with different local names', () => {
        const source = 'react';
        const specifiers = [
          { type: 'named' as const, imported: 'Component', local: 'ReactComponent' },
        ];

        astService.createImportDeclaration(source, specifiers);

        expect(mockBuilders.importSpecifier).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'identifier', mocked: true }), // imported
          expect.objectContaining({ type: 'identifier', mocked: true })  // local
        );
      });

      it('should throw error for unknown import specifier type', () => {
        const source = 'test-lib';
        const specifiers = [
          { type: 'unknown' as any, local: 'Unknown' },
        ];

        expect(() => astService.createImportDeclaration(source, specifiers)).toThrow(
          'Unknown import specifier type: unknown'
        );
      });
    });

    describe('createJSXElement', () => {
      it('should create JSX element with props and children', () => {
        const name = 'Button';
        const props = {
          size: 'large',
          disabled: true,
          onClick: { type: 'Identifier', name: 'handleClick' },
        };
        const children = [{ type: 'Literal', value: 'Click me' }];

        const result = astService.createJSXElement(name, props, children);

        expect(mockBuilders.jsxAttribute).toHaveBeenCalledTimes(3);
        expect(mockBuilders.jsxOpeningElement).toHaveBeenCalled();
        expect(mockBuilders.jsxClosingElement).toHaveBeenCalled();
        expect(mockBuilders.jsxElement).toHaveBeenCalled();
      });

      it('should create self-closing JSX element without children', () => {
        const name = 'input';
        const props = { type: 'text', placeholder: 'Enter text' };

        const result = astService.createJSXElement(name, props);

        expect(mockBuilders.jsxOpeningElement).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          true // self-closing
        );
        expect(mockBuilders.jsxClosingElement).not.toHaveBeenCalled();
      });

      it('should handle boolean props correctly', () => {
        const name = 'input';
        const props = { disabled: true, hidden: false };

        astService.createJSXElement(name, props);

        // Boolean true should create attribute with null value
        // Boolean false should create expression container
        expect(mockBuilders.jsxAttribute).toHaveBeenCalledWith(
          expect.anything(),
          null // Boolean true attribute
        );
        expect(mockBuilders.jsxExpressionContainer).toHaveBeenCalled();
      });

      it('should handle string props as literals', () => {
        const name = 'div';
        const props = { className: 'container', id: 'main' };

        astService.createJSXElement(name, props);

        expect(mockBuilders.literal).toHaveBeenCalledWith('container');
        expect(mockBuilders.literal).toHaveBeenCalledWith('main');
      });

      it('should handle complex expression props', () => {
        const name = 'Component';
        const props = {
          data: { type: 'ArrayExpression', elements: [] },
          callback: { type: 'ArrowFunctionExpression' },
        };

        astService.createJSXElement(name, props);

        expect(mockBuilders.jsxExpressionContainer).toHaveBeenCalledWith(
          { type: 'ArrayExpression', elements: [] }
        );
        expect(mockBuilders.jsxExpressionContainer).toHaveBeenCalledWith(
          { type: 'ArrowFunctionExpression' }
        );
      });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle non-Error objects in parsing', () => {
      const code = 'invalid';
      mockParse.mockImplementation(() => { throw 'string error'; });

      expect(() => astService.parseCode(code)).toThrow('Failed to parse code: string error');
    });

    it('should handle undefined local names in import extraction', () => {
      const mockAST = { type: 'Program', body: [] };
      const mockImportNode = {
        source: { value: 'test-lib' },
        specifiers: [
          {
            type: 'ImportDefaultSpecifier',
            local: undefined, // Missing local
          },
        ],
      };

      mockVisit.mockImplementation((ast, visitors) => {
        if (visitors.visitImportDeclaration) {
          const mockPath = { node: mockImportNode };
          visitors.visitImportDeclaration(mockPath);
        }
      });

      const result = astService.extractImports(mockAST as any);

      expect(result[0].specifiers[0]).toMatchObject({
        type: 'unknown',
        local: 'unknown',
      });
    });

    it('should handle missing JSX attribute values', () => {
      const mockAST = { type: 'Program', body: [] };
      const mockJSXNode = {
        openingElement: {
          name: { type: 'JSXIdentifier', name: 'input' },
          attributes: [
            {
              type: 'JSXAttribute',
              name: { name: 'required' },
              value: undefined, // Missing value
            },
          ],
        },
        children: [],
      };

      mockVisit.mockImplementation((ast, visitors) => {
        if (visitors.visitJSXElement) {
          const mockPath = { node: mockJSXNode };
          visitors.visitJSXElement(mockPath);
        }
      });

      const result = astService.extractJSXElements(mockAST as any);

      expect(result[0].props.required).toBe(true);
    });
  });
});
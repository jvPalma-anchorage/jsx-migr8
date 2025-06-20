/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { print } from 'recast';
import { getImportDetails, checkIfJsxInImportsReport, analyzeImportDeclaration } from '../imports';
import { getContext, lWarning } from '../../context/globalContext';
import { getSpecifierLocalName, getSpecifierImportedName, isImportSpecifier } from '../../types/ast';
import type { ImportPath, ImportDetails, ImportSpecifierDetails } from '../../types';

// Mock dependencies
jest.mock('recast', () => ({
  print: jest.fn(),
}));

jest.mock('../../context/globalContext', () => ({
  getContext: jest.fn(),
  lWarning: jest.fn(),
}));

jest.mock('../../types/ast', () => ({
  getSpecifierLocalName: jest.fn(),
  getSpecifierImportedName: jest.fn(),
  isImportSpecifier: jest.fn(),
}));

describe('imports (enhanced)', () => {
  let mockGetContext: jest.MockedFunction<typeof getContext>;
  let mockPrint: jest.MockedFunction<typeof print>;
  let mockLWarning: jest.MockedFunction<typeof lWarning>;
  let mockGetSpecifierLocalName: jest.MockedFunction<typeof getSpecifierLocalName>;
  let mockGetSpecifierImportedName: jest.MockedFunction<typeof getSpecifierImportedName>;
  let mockIsImportSpecifier: jest.MockedFunction<typeof isImportSpecifier>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetContext = getContext as jest.MockedFunction<typeof getContext>;
    mockPrint = print as jest.MockedFunction<typeof print>;
    mockLWarning = lWarning as jest.MockedFunction<typeof lWarning>;
    mockGetSpecifierLocalName = getSpecifierLocalName as jest.MockedFunction<typeof getSpecifierLocalName>;
    mockGetSpecifierImportedName = getSpecifierImportedName as jest.MockedFunction<typeof getSpecifierImportedName>;
    mockIsImportSpecifier = isImportSpecifier as jest.MockedFunction<typeof isImportSpecifier>;
  });

  describe('getImportDetails', () => {
    it('should return null for packages not in PACKAGES list', () => {
      const mockPath: ImportPath = {
        node: {
          source: { value: 'unknown-package' },
          specifiers: [],
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib', 'react'],
        TARGET_COMPONENT: 'Button',
      } as any);

      const result = getImportDetails(mockPath, '/test/file.tsx');

      expect(result).toBeNull();
    });

    it('should return ImportDetails for valid package with target component', () => {
      const mockSpecifier = {
        type: 'ImportDefaultSpecifier',
        local: { name: 'Button' },
      };
      
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [mockSpecifier],
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        TARGET_COMPONENT: 'Button',
      } as any);

      mockGetSpecifierLocalName.mockReturnValue('Button');
      mockPrint.mockReturnValue({ code: 'import Button from "@company/ui-lib";' } as any);

      const result = getImportDetails(mockPath, '/test/file.tsx');

      expect(result).not.toBeNull();
      expect(result!.packageName).toBe('@company/ui-lib');
      expect(result!.specifiers).toHaveLength(1);
      expect(result!.specifiers[0]).toMatchObject({
        filePath: '/test/file.tsx',
        type: 'ImportDefaultSpecifier',
        importType: 'default',
        localName: 'Button',
        importedName: 'default',
      });
    });

    it('should handle named import specifiers', () => {
      const mockSpecifier = {
        type: 'ImportSpecifier',
        local: { name: 'Button' },
        imported: { name: 'Button' },
      };
      
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [mockSpecifier],
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        TARGET_COMPONENT: 'Button',
      } as any);

      mockGetSpecifierLocalName.mockReturnValue('Button');
      mockGetSpecifierImportedName.mockReturnValue('Button');
      mockIsImportSpecifier.mockReturnValue(true);
      mockPrint.mockReturnValue({ code: 'import { Button } from "@company/ui-lib";' } as any);

      const result = getImportDetails(mockPath, '/test/file.tsx');

      expect(result!.specifiers[0]).toMatchObject({
        type: 'ImportSpecifier',
        importType: 'named',
        localName: 'Button',
        importedName: 'Button',
      });
    });

    it('should handle namespace import specifiers', () => {
      const mockSpecifier = {
        type: 'ImportNamespaceSpecifier',
        local: { name: 'Button' },
      };
      
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [mockSpecifier],
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        TARGET_COMPONENT: 'Button',
      } as any);

      mockGetSpecifierLocalName.mockReturnValue('Button');
      mockPrint.mockReturnValue({ code: 'import * as Button from "@company/ui-lib";' } as any);

      const result = getImportDetails(mockPath, '/test/file.tsx');

      expect(result!.specifiers[0]).toMatchObject({
        type: 'ImportNamespaceSpecifier',
        importType: undefined, // namespace imports don't have importType
        localName: 'Button',
        importedName: undefined,
      });
    });

    it('should skip non-target components', () => {
      const mockSpecifier = {
        type: 'ImportDefaultSpecifier',
        local: { name: 'Icon' },
      };
      
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [mockSpecifier],
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        TARGET_COMPONENT: 'Button',
      } as any);

      mockGetSpecifierLocalName.mockReturnValue('Icon');

      const result = getImportDetails(mockPath, '/test/file.tsx');

      expect(result!.specifiers).toHaveLength(0);
    });

    it('should handle unknown import types gracefully', () => {
      const mockSpecifier = {
        type: 'UnknownImportType',
        local: { name: 'Button' },
      };
      
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [mockSpecifier],
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        TARGET_COMPONENT: 'Button',
      } as any);

      mockGetSpecifierLocalName.mockReturnValue('Button');
      mockPrint.mockReturnValue({ code: 'import Button from "@company/ui-lib";' } as any);

      const result = getImportDetails(mockPath, '/test/file.tsx');

      expect(result!.specifiers[0]).toMatchObject({
        type: 'UnknownImportType',
        importType: undefined,
        localName: 'Button',
      });
      expect(mockLWarning).toHaveBeenCalledWith(
        'Import type unhandled in /test/file.tsx:',
        'UnknownImportType'
      );
    });

    it('should handle print errors gracefully', () => {
      const mockSpecifier = {
        type: 'ImportDefaultSpecifier',
        local: { name: 'Button' },
      };
      
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [mockSpecifier],
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        TARGET_COMPONENT: 'Button',
      } as any);

      mockGetSpecifierLocalName.mockReturnValue('Button');
      mockPrint.mockImplementation(() => {
        throw new Error('Print failed');
      });

      const result = getImportDetails(mockPath, '/test/file.tsx');

      expect(result!.specifiers).toHaveLength(0);
      expect(mockLWarning).toHaveBeenCalledWith(
        'Failed to process import specifier in /test/file.tsx:',
        expect.any(Error)
      );
    });

    it('should handle missing specifiers', () => {
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: null,
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        TARGET_COMPONENT: 'Button',
      } as any);

      const result = getImportDetails(mockPath, '/test/file.tsx');

      expect(result!.specifiers).toEqual([]);
    });

    it('should handle missing local names', () => {
      const mockSpecifier = {
        type: 'ImportDefaultSpecifier',
        local: { name: 'Button' },
      };
      
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [mockSpecifier],
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        TARGET_COMPONENT: 'Button',
      } as any);

      mockGetSpecifierLocalName.mockReturnValue(null); // Missing local name

      const result = getImportDetails(mockPath, '/test/file.tsx');

      expect(result!.specifiers).toHaveLength(0);
    });

    it('should handle complex import formatting', () => {
      const mockSpecifier = {
        type: 'ImportSpecifier',
        local: { name: 'Button' },
        imported: { name: 'Button' },
      };
      
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [mockSpecifier],
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        TARGET_COMPONENT: 'Button',
      } as any);

      mockGetSpecifierLocalName.mockReturnValue('Button');
      mockGetSpecifierImportedName.mockReturnValue('Button');
      mockIsImportSpecifier.mockReturnValue(true);
      mockPrint.mockReturnValue({ 
        code: 'import {\n  Button,\n  Icon\n} from "@company/ui-lib";' 
      } as any);

      const result = getImportDetails(mockPath, '/test/file.tsx');

      expect(result!.specifiers[0].importStm).toBe('import { Button, Icon } from "@company/ui-lib";');
    });

    it('should handle errors in getImportDetails', () => {
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [],
        },
      } as any;

      mockGetContext.mockImplementation(() => {
        throw new Error('Context error');
      });

      const result = getImportDetails(mockPath, '/test/file.tsx');

      expect(result).toBeNull();
      expect(mockLWarning).toHaveBeenCalledWith(
        'Failed to get import details for /test/file.tsx:',
        expect.any(Error)
      );
    });
  });

  describe('checkIfJsxInImportsReport', () => {
    it('should find JSX import in report for same file', () => {
      const jsxFilePath = '/test/component.tsx';
      const mockImportSpecifier: ImportSpecifierDetails = {
        filePath: jsxFilePath,
        type: 'ImportDefaultSpecifier',
        importType: 'default',
        importStm: 'import Button from "@company/ui-lib";',
        localName: 'Button',
        importedName: 'default',
        astImportPath: {} as any,
      };

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        report: {
          '@company/ui-lib': {
            _imports: [mockImportSpecifier],
          },
        },
      } as any);

      const result = checkIfJsxInImportsReport(jsxFilePath);

      expect(result).toEqual(['@company/ui-lib', mockImportSpecifier]);
    });

    it('should return undefined when no import found', () => {
      const jsxFilePath = '/test/component.tsx';

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        report: {
          '@company/ui-lib': {
            _imports: [],
          },
        },
      } as any);

      const result = checkIfJsxInImportsReport(jsxFilePath);

      expect(result).toBeUndefined();
    });

    it('should skip imports from different files', () => {
      const jsxFilePath = '/test/component.tsx';
      const mockImportSpecifier: ImportSpecifierDetails = {
        filePath: '/other/file.tsx', // Different file
        type: 'ImportDefaultSpecifier',
        importType: 'default',
        importStm: 'import Button from "@company/ui-lib";',
        localName: 'Button',
        importedName: 'default',
        astImportPath: {} as any,
      };

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        report: {
          '@company/ui-lib': {
            _imports: [mockImportSpecifier],
          },
        },
      } as any);

      const result = checkIfJsxInImportsReport(jsxFilePath);

      expect(result).toBeUndefined();
    });

    it('should return first match when multiple packages match', () => {
      const jsxFilePath = '/test/component.tsx';
      const mockImportSpecifier1: ImportSpecifierDetails = {
        filePath: jsxFilePath,
        type: 'ImportDefaultSpecifier',
        importType: 'default',
        importStm: 'import Button from "@company/ui-lib";',
        localName: 'Button',
        importedName: 'default',
        astImportPath: {} as any,
      };
      const mockImportSpecifier2: ImportSpecifierDetails = {
        filePath: jsxFilePath,
        type: 'ImportSpecifier',
        importType: 'named',
        importStm: 'import { Icon } from "@other/lib";',
        localName: 'Icon',
        importedName: 'Icon',
        astImportPath: {} as any,
      };

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib', '@other/lib'],
        report: {
          '@company/ui-lib': {
            _imports: [mockImportSpecifier1],
          },
          '@other/lib': {
            _imports: [mockImportSpecifier2],
          },
        },
      } as any);

      const result = checkIfJsxInImportsReport(jsxFilePath);

      expect(result).toEqual(['@company/ui-lib', mockImportSpecifier1]);
    });

    it('should handle missing _imports property', () => {
      const jsxFilePath = '/test/component.tsx';

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        report: {
          '@company/ui-lib': {
            // Missing _imports
          },
        },
      } as any);

      const result = checkIfJsxInImportsReport(jsxFilePath);

      expect(result).toBeUndefined();
    });

    it('should handle empty packages list', () => {
      const jsxFilePath = '/test/component.tsx';

      mockGetContext.mockReturnValue({
        PACKAGES: [],
        report: {},
      } as any);

      const result = checkIfJsxInImportsReport(jsxFilePath);

      expect(result).toBeUndefined();
    });
  });

  describe('analyzeImportDeclaration', () => {
    it('should analyze and add import to report', () => {
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [{
            type: 'ImportDefaultSpecifier',
            local: { name: 'Button' },
          }],
        },
      } as any;

      const mockImportDetails: ImportDetails = {
        node: mockPath.node,
        packageName: '@company/ui-lib',
        specifiers: [{
          filePath: '/test/file.tsx',
          type: 'ImportDefaultSpecifier',
          importType: 'default',
          importStm: 'import Button from "@company/ui-lib";',
          localName: 'Button',
          importedName: 'default',
          astImportPath: mockPath,
        }],
      };

      const mockReport = {
        '@company/ui-lib': {
          _imports: [],
        },
      };

      mockGetContext.mockReturnValue({
        report: mockReport,
      } as any);

      // Mock getImportDetails to return our mock data
      const originalGetImportDetails = require('../imports').getImportDetails;
      jest.spyOn(require('../imports'), 'getImportDetails').mockReturnValue(mockImportDetails);

      analyzeImportDeclaration(mockPath, '/test/file.tsx');

      expect(mockReport['@company/ui-lib']._imports).toContain(mockImportDetails.specifiers[0]);

      // Restore original function
      jest.spyOn(require('../imports'), 'getImportDetails').mockImplementation(originalGetImportDetails);
    });

    it('should create _imports array if it does not exist', () => {
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [{
            type: 'ImportDefaultSpecifier',
            local: { name: 'Button' },
          }],
        },
      } as any;

      const mockImportDetails: ImportDetails = {
        node: mockPath.node,
        packageName: '@company/ui-lib',
        specifiers: [{
          filePath: '/test/file.tsx',
          type: 'ImportDefaultSpecifier',
          importType: 'default',
          importStm: 'import Button from "@company/ui-lib";',
          localName: 'Button',
          importedName: 'default',
          astImportPath: mockPath,
        }],
      };

      const mockReport = {
        '@company/ui-lib': {
          // No _imports property
        },
      };

      mockGetContext.mockReturnValue({
        report: mockReport,
      } as any);

      const originalGetImportDetails = require('../imports').getImportDetails;
      jest.spyOn(require('../imports'), 'getImportDetails').mockReturnValue(mockImportDetails);

      analyzeImportDeclaration(mockPath, '/test/file.tsx');

      expect(mockReport['@company/ui-lib']._imports).toEqual([mockImportDetails.specifiers[0]]);

      jest.spyOn(require('../imports'), 'getImportDetails').mockImplementation(originalGetImportDetails);
    });

    it('should handle null import details gracefully', () => {
      const mockPath: ImportPath = {
        node: {
          source: { value: 'unknown-package' },
          specifiers: [],
        },
      } as any;

      const mockReport = {};

      mockGetContext.mockReturnValue({
        report: mockReport,
      } as any);

      const originalGetImportDetails = require('../imports').getImportDetails;
      jest.spyOn(require('../imports'), 'getImportDetails').mockReturnValue(null);

      analyzeImportDeclaration(mockPath, '/test/file.tsx');

      // Should not throw error or modify report
      expect(Object.keys(mockReport)).toHaveLength(0);

      jest.spyOn(require('../imports'), 'getImportDetails').mockImplementation(originalGetImportDetails);
    });

    it('should handle errors when adding to report', () => {
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [{
            type: 'ImportDefaultSpecifier',
            local: { name: 'Button' },
          }],
        },
      } as any;

      const mockImportDetails: ImportDetails = {
        node: mockPath.node,
        packageName: '@company/ui-lib',
        specifiers: [{
          filePath: '/test/file.tsx',
          type: 'ImportDefaultSpecifier',
          importType: 'default',
          importStm: 'import Button from "@company/ui-lib";',
          localName: 'Button',
          importedName: 'default',
          astImportPath: mockPath,
        }],
      };

      // Create a mock report that throws when accessed
      const mockReport = {
        '@company/ui-lib': {
          get _imports() {
            throw new Error('Report access error');
          },
        },
      };

      mockGetContext.mockReturnValue({
        report: mockReport,
      } as any);

      const originalGetImportDetails = require('../imports').getImportDetails;
      jest.spyOn(require('../imports'), 'getImportDetails').mockReturnValue(mockImportDetails);

      analyzeImportDeclaration(mockPath, '/test/file.tsx');

      expect(mockLWarning).toHaveBeenCalledWith(
        'Failed to add import specifier to report for /test/file.tsx:',
        expect.any(Error)
      );

      jest.spyOn(require('../imports'), 'getImportDetails').mockImplementation(originalGetImportDetails);
    });

    it('should handle errors in analyzeImportDeclaration', () => {
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [],
        },
      } as any;

      mockGetContext.mockImplementation(() => {
        throw new Error('Context error');
      });

      analyzeImportDeclaration(mockPath, '/test/file.tsx');

      expect(mockLWarning).toHaveBeenCalledWith(
        'Failed to analyze import declaration in /test/file.tsx:',
        expect.any(Error)
      );
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle malformed import nodes', () => {
      const mockPath: ImportPath = {
        node: {
          source: null, // Malformed
          specifiers: [],
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        TARGET_COMPONENT: 'Button',
      } as any);

      expect(() => getImportDetails(mockPath, '/test/file.tsx')).not.toThrow();
    });

    it('should handle circular dependencies in report', () => {
      const jsxFilePath = '/test/component.tsx';
      const circularReport: any = {
        '@company/ui-lib': {
          _imports: [],
        },
      };
      circularReport['@company/ui-lib'].self = circularReport;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        report: circularReport,
      } as any);

      expect(() => checkIfJsxInImportsReport(jsxFilePath)).not.toThrow();
    });

    it('should handle extremely long package names', () => {
      const longPackageName = '@' + 'a'.repeat(1000) + '/ui-lib';
      const mockPath: ImportPath = {
        node: {
          source: { value: longPackageName },
          specifiers: [],
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: [longPackageName],
        TARGET_COMPONENT: 'Button',
      } as any);

      const result = getImportDetails(mockPath, '/test/file.tsx');

      expect(result!.packageName).toBe(longPackageName);
    });

    it('should handle unicode characters in import paths', () => {
      const unicodePath = '/test/файл.tsx';
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [],
        },
      } as any;

      mockGetContext.mockReturnValue({
        PACKAGES: ['@company/ui-lib'],
        TARGET_COMPONENT: 'Button',
      } as any);

      expect(() => getImportDetails(mockPath, unicodePath)).not.toThrow();
    });

    it('should handle concurrent access to report object', () => {
      const mockPath: ImportPath = {
        node: {
          source: { value: '@company/ui-lib' },
          specifiers: [{
            type: 'ImportDefaultSpecifier',
            local: { name: 'Button' },
          }],
        },
      } as any;

      const mockReport = {
        '@company/ui-lib': {
          _imports: [],
        },
      };

      mockGetContext.mockReturnValue({
        report: mockReport,
      } as any);

      const mockImportDetails: ImportDetails = {
        node: mockPath.node,
        packageName: '@company/ui-lib',
        specifiers: [{
          filePath: '/test/file.tsx',
          type: 'ImportDefaultSpecifier',
          importType: 'default',
          importStm: 'import Button from "@company/ui-lib";',
          localName: 'Button',
          importedName: 'default',
          astImportPath: mockPath,
        }],
      };

      const originalGetImportDetails = require('../imports').getImportDetails;
      jest.spyOn(require('../imports'), 'getImportDetails').mockReturnValue(mockImportDetails);

      // Simulate concurrent calls
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve().then(() => analyzeImportDeclaration(mockPath, '/test/file.tsx'))
      );

      Promise.all(promises).then(() => {
        expect(mockReport['@company/ui-lib']._imports.length).toBeGreaterThan(0);
      });

      jest.spyOn(require('../imports'), 'getImportDetails').mockImplementation(originalGetImportDetails);
    });
  });
});
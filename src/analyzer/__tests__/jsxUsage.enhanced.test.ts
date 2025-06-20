/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import path from 'node:path';
import { analyzeJSXElementWithMigration, analyzeJSXElement } from '../jsxUsage';
import { getContext, lWarning } from '../../context/globalContext';
import { getPropValue } from '../../utils/props';
import { ImportUsage } from '../../graph/types';
import type { ComponentUsage, JSXPath } from '../../types';

// Mock dependencies
jest.mock('node:path');
jest.mock('../../context/globalContext', () => ({
  getContext: jest.fn(),
  lWarning: jest.fn(),
}));
jest.mock('../../utils/props', () => ({
  getPropValue: jest.fn(),
}));

describe('jsxUsage (enhanced)', () => {
  let mockGetContext: jest.MockedFunction<typeof getContext>;
  let mockLWarning: jest.MockedFunction<typeof lWarning>;
  let mockGetPropValue: jest.MockedFunction<typeof getPropValue>;
  let mockPathRelative: jest.SpiedFunction<typeof path.relative>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetContext = getContext as jest.MockedFunction<typeof getContext>;
    mockLWarning = lWarning as jest.MockedFunction<typeof lWarning>;
    mockGetPropValue = getPropValue as jest.MockedFunction<typeof getPropValue>;
    mockPathRelative = jest.spyOn(path, 'relative');
  });

  describe('analyzeJSXElementWithMigration', () => {
    it('should analyze JSX element with simple props', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Button' },
            attributes: [
              {
                type: 'JSXAttribute',
                name: { name: 'size' },
                value: { type: 'Literal', value: 'large' },
              },
              {
                type: 'JSXAttribute',
                name: { name: 'disabled' },
                value: null, // Boolean attribute
              },
            ],
          },
          loc: {
            start: { line: 10, column: 4 },
          },
        },
      } as any;

      const fileAbsPath = '/project/src/components/Button.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Button',
        {
          packageName: '@company/ui',
          componentName: 'Button',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(['size', 'disabled']),
        },
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'Button',
        report: {},
      } as any);

      mockPathRelative.mockReturnValue('src/components/Button.tsx');
      mockGetPropValue.mockReturnValueOnce('large').mockReturnValueOnce('true');

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result).toMatchObject({
        id: 'src/components/Button.tsx:10:4',
        props: {
          size: 'large',
          disabled: 'true',
        },
        compUsage: {
          name: 'Button',
          fileAbsPath,
          local: undefined, // Same as imported name
          props: {
            size: 'large',
            disabled: 'true',
          },
          originalProps: {
            size: 'large',
            disabled: 'true',
          },
        },
      });
    });

    it('should return null for non-JSXIdentifier elements', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXMemberExpression', object: { name: 'React' }, property: { name: 'Fragment' } },
            attributes: [],
          },
        },
      } as any;

      const fileAbsPath = '/project/src/App.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        'react',
        'Fragment',
        {
          packageName: 'react',
          componentName: 'Fragment',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(),
        },
      ];

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result).toBeNull();
    });

    it('should return null for non-target components', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Icon' },
            attributes: [],
          },
        },
      } as any;

      const fileAbsPath = '/project/src/components/Button.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Button', // Target is Button, but element is Icon
        {
          packageName: '@company/ui',
          componentName: 'Button',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(),
        },
      ];

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result).toBeNull();
    });

    it('should handle JSX expression container props', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Button' },
            attributes: [
              {
                type: 'JSXAttribute',
                name: { name: 'onClick' },
                value: {
                  type: 'JSXExpressionContainer',
                  expression: { type: 'Identifier', name: 'handleClick' },
                },
              },
              {
                type: 'JSXAttribute',
                name: { name: 'style' },
                value: {
                  type: 'JSXExpressionContainer',
                  expression: { type: 'ObjectExpression', properties: [] },
                },
              },
            ],
          },
          loc: {
            start: { line: 15, column: 6 },
          },
        },
      } as any;

      const fileAbsPath = '/project/src/App.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Button',
        {
          packageName: '@company/ui',
          componentName: 'Button',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(['onClick', 'style']),
        },
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'Button',
        report: {},
      } as any);

      mockPathRelative.mockReturnValue('src/App.tsx');
      mockGetPropValue
        .mockReturnValueOnce('handleClick')
        .mockReturnValueOnce('{ color: "blue" }');

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result!.props).toEqual({
        onClick: 'handleClick',
        style: '{ color: "blue" }',
      });
    });

    it('should handle boolean props without values', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Button' },
            attributes: [
              {
                type: 'JSXAttribute',
                name: { name: 'disabled' },
                value: null,
              },
              {
                type: 'JSXAttribute',
                name: { name: 'loading' },
                value: null,
              },
            ],
          },
          loc: {
            start: { line: 20, column: 8 },
          },
        },
      } as any;

      const fileAbsPath = '/project/src/components/Form.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Button',
        {
          packageName: '@company/ui',
          componentName: 'Button',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(['disabled', 'loading']),
        },
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'Button',
        report: {},
      } as any);

      mockPathRelative.mockReturnValue('src/components/Form.tsx');

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result!.props).toEqual({
        disabled: 'true',
        loading: 'true',
      });
    });

    it('should handle components with local names different from imported names', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'MyButton' },
            attributes: [],
          },
          loc: {
            start: { line: 5, column: 2 },
          },
        },
      } as any;

      const fileAbsPath = '/project/src/components/Custom.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'MyButton',
        {
          packageName: '@company/ui',
          componentName: 'Button',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(),
        },
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'MyButton',
        report: {},
      } as any);

      mockPathRelative.mockReturnValue('src/components/Custom.tsx');

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result!.compUsage).toMatchObject({
        name: 'MyButton',
        local: 'MyButton', // Different from imported name
      });
    });

    it('should handle unknown JSX attribute types', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Button' },
            attributes: [
              {
                type: 'UnknownAttributeType',
                name: { name: 'unknown' },
                value: { type: 'Literal', value: 'value' },
              },
            ],
          },
          loc: {
            start: { line: 25, column: 10 },
          },
        },
      } as any;

      const fileAbsPath = '/project/src/Unknown.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Button',
        {
          packageName: '@company/ui',
          componentName: 'Button',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(),
        },
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'Button',
        report: {},
      } as any);

      mockPathRelative.mockReturnValue('src/Unknown.tsx');

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result).not.toBeNull();
      expect(mockLWarning).toHaveBeenCalledWith(
        'JSX Prop type unhandled in /project/src/Unknown.tsx:',
        'UnknownAttributeType'
      );
    });

    it('should handle errors when getting prop values', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Button' },
            attributes: [
              {
                type: 'JSXAttribute',
                name: { name: 'complex' },
                value: { type: 'Literal', value: 'test' },
              },
            ],
          },
          loc: {
            start: { line: 30, column: 12 },
          },
        },
      } as any;

      const fileAbsPath = '/project/src/Error.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Button',
        {
          packageName: '@company/ui',
          componentName: 'Button',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(['complex']),
        },
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'Button',
        report: {},
      } as any);

      mockPathRelative.mockReturnValue('src/Error.tsx');
      mockGetPropValue.mockImplementation(() => {
        throw new Error('Failed to get prop value');
      });

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result!.props).toEqual({}); // Should not include the failed prop
      expect(mockLWarning).toHaveBeenCalledWith(
        'Failed to get prop value for complex in /project/src/Error.tsx:',
        expect.any(Error)
      );
    });

    it('should handle errors when processing JSX attributes', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Button' },
            attributes: null, // This might cause an error
          },
          loc: {
            start: { line: 35, column: 14 },
          },
        },
      } as any;

      const fileAbsPath = '/project/src/AttributeError.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Button',
        {
          packageName: '@company/ui',
          componentName: 'Button',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(),
        },
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'Button',
        report: {},
      } as any);

      mockPathRelative.mockReturnValue('src/AttributeError.tsx');

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result).not.toBeNull();
      expect(result!.props).toEqual({});
    });

    it('should handle errors when creating JSX usage info', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Button' },
            attributes: [],
          },
          loc: null, // Missing location info
        },
      } as any;

      const fileAbsPath = '/project/src/LocationError.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Button',
        {
          packageName: '@company/ui',
          componentName: 'Button',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(),
        },
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'Button',
        report: {},
      } as any);

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result).toBeNull();
      expect(mockLWarning).toHaveBeenCalledWith(
        'Failed to create JSX usage info for /project/src/LocationError.tsx:',
        expect.any(Error)
      );
    });

    it('should handle complex prop scenarios', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Button' },
            attributes: [
              {
                type: 'JSXAttribute',
                name: { name: 'data-testid' },
                value: { type: 'Literal', value: 'submit-button' },
              },
              {
                type: 'JSXAttribute',
                name: { name: 'aria-label' },
                value: { type: 'Literal', value: 'Submit form' },
              },
              {
                type: 'JSXAttribute',
                name: { name: 'onClick' },
                value: {
                  type: 'JSXExpressionContainer',
                  expression: {
                    type: 'ArrowFunctionExpression',
                    params: [],
                    body: { type: 'CallExpression' },
                  },
                },
              },
            ],
          },
          loc: {
            start: { line: 40, column: 16 },
          },
        },
      } as any;

      const fileAbsPath = '/project/src/components/ComplexButton.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Button',
        {
          packageName: '@company/ui',
          componentName: 'Button',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(['data-testid', 'aria-label', 'onClick']),
        },
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'Button',
        report: {},
      } as any);

      mockPathRelative.mockReturnValue('src/components/ComplexButton.tsx');
      mockGetPropValue
        .mockReturnValueOnce('submit-button')
        .mockReturnValueOnce('Submit form')
        .mockReturnValueOnce('() => handleSubmit()');

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result!.props).toEqual({
        'data-testid': 'submit-button',
        'aria-label': 'Submit form',
        'onClick': '() => handleSubmit()',
      });
    });
  });

  describe('analyzeJSXElement', () => {
    it('should analyze JSX element for graph building', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Button' },
            attributes: [],
          },
        },
      } as any;

      const fileAbsPath = '/project/src/components/Button.tsx';

      const result = analyzeJSXElement(mockJSXPath, fileAbsPath);

      expect(result).toEqual({
        localName: 'Button',
        fileAbsPath,
        jsxPath: mockJSXPath,
      });
    });

    it('should return null for non-JSXIdentifier elements', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXMemberExpression', object: { name: 'React' }, property: { name: 'Fragment' } },
            attributes: [],
          },
        },
      } as any;

      const fileAbsPath = '/project/src/App.tsx';

      const result = analyzeJSXElement(mockJSXPath, fileAbsPath);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: null, // This will cause an error
          },
        },
      } as any;

      const fileAbsPath = '/project/src/Error.tsx';

      const result = analyzeJSXElement(mockJSXPath, fileAbsPath);

      expect(result).toBeNull();
      expect(mockLWarning).toHaveBeenCalledWith(
        'Failed to analyze JSX element in /project/src/Error.tsx:',
        expect.any(Error)
      );
    });

    it('should handle various JSX element types', () => {
      const testCases = [
        { name: 'div', expected: 'div' },
        { name: 'Button', expected: 'Button' },
        { name: 'CustomComponent', expected: 'CustomComponent' },
        { name: 'MyNamespace.Component', type: 'JSXMemberExpression', expected: null },
      ];

      testCases.forEach(({ name, type = 'JSXIdentifier', expected }) => {
        const mockJSXPath: JSXPath = {
          node: {
            openingElement: {
              name: type === 'JSXIdentifier' 
                ? { type: 'JSXIdentifier', name }
                : { type: 'JSXMemberExpression', object: { name: 'MyNamespace' }, property: { name: 'Component' } },
              attributes: [],
            },
          },
        } as any;

        const result = analyzeJSXElement(mockJSXPath, '/test/file.tsx');

        if (expected) {
          expect(result!.localName).toBe(expected);
        } else {
          expect(result).toBeNull();
        }
      });
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle extremely complex JSX structures', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Button' },
            attributes: Array.from({ length: 50 }, (_, i) => ({
              type: 'JSXAttribute',
              name: { name: `prop${i}` },
              value: { type: 'Literal', value: `value${i}` },
            })),
          },
          loc: {
            start: { line: 1, column: 1 },
          },
        },
      } as any;

      const fileAbsPath = '/project/src/ComplexComponent.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Button',
        {
          packageName: '@company/ui',
          componentName: 'Button',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(Array.from({ length: 50 }, (_, i) => `prop${i}`)),
        },
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'Button',
        report: {},
      } as any);

      mockPathRelative.mockReturnValue('src/ComplexComponent.tsx');
      mockGetPropValue.mockImplementation((value) => `processed-${value.value}`);

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result).not.toBeNull();
      expect(Object.keys(result!.props)).toHaveLength(50);
    });

    it('should handle JSX elements with nested expression containers', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Button' },
            attributes: [
              {
                type: 'JSXAttribute',
                name: { name: 'complex' },
                value: {
                  type: 'JSXExpressionContainer',
                  expression: {
                    type: 'JSXExpressionContainer',
                    expression: { type: 'Literal', value: 'nested' },
                  },
                },
              },
            ],
          },
          loc: {
            start: { line: 1, column: 1 },
          },
        },
      } as any;

      const fileAbsPath = '/project/src/NestedComponent.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Button',
        {
          packageName: '@company/ui',
          componentName: 'Button',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(['complex']),
        },
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'Button',
        report: {},
      } as any);

      mockPathRelative.mockReturnValue('src/NestedComponent.tsx');
      mockGetPropValue.mockReturnValue('nested-value');

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result!.props.complex).toBe('nested-value');
    });

    it('should handle Unicode characters in component names and props', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Ｂｕｔｔｏｎ' }, // Full-width characters
            attributes: [
              {
                type: 'JSXAttribute',
                name: { name: 'тест' }, // Cyrillic
                value: { type: 'Literal', value: '测试' }, // Chinese
              },
            ],
          },
          loc: {
            start: { line: 1, column: 1 },
          },
        },
      } as any;

      const fileAbsPath = '/project/src/Unicode.tsx';
      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Ｂｕｔｔｏｎ',
        {
          packageName: '@company/ui',
          componentName: 'Ｂｕｔｔｏｎ',
          importPath: fileAbsPath,
          usageCount: 1,
          props: new Set(['тест']),
        },
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'Ｂｕｔｔｏｎ',
        report: {},
      } as any);

      mockPathRelative.mockReturnValue('src/Unicode.tsx');
      mockGetPropValue.mockReturnValue('测试');

      const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

      expect(result!.compUsage.name).toBe('Ｂｕｔｔｏｎ');
      expect(result!.props['тест']).toBe('测试');
    });

    it('should handle circular references in component usage', () => {
      const mockJSXPath: JSXPath = {
        node: {
          openingElement: {
            name: { type: 'JSXIdentifier', name: 'Button' },
            attributes: [],
          },
          loc: {
            start: { line: 1, column: 1 },
          },
        },
      } as any;

      const fileAbsPath = '/project/src/Circular.tsx';
      const circularUsage: any = {
        packageName: '@company/ui',
        componentName: 'Button',
        importPath: fileAbsPath,
        usageCount: 1,
        props: new Set(),
      };
      circularUsage.self = circularUsage;

      const isMigrating: [string, string, ImportUsage] = [
        '@company/ui',
        'Button',
        circularUsage,
      ];

      mockGetContext.mockReturnValue({
        ROOT_PATH: '/project',
        TARGET_COMPONENT: 'Button',
        report: {},
      } as any);

      mockPathRelative.mockReturnValue('src/Circular.tsx');

      expect(() => 
        analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating)
      ).not.toThrow();
    });

    it('should handle missing or malformed location information', () => {
      const testCases = [
        { loc: null },
        { loc: { start: null } },
        { loc: { start: { line: null, column: 5 } } },
        { loc: { start: { line: 10, column: null } } },
        { loc: { start: {} } },
      ];

      testCases.forEach((testCase, index) => {
        const mockJSXPath: JSXPath = {
          node: {
            openingElement: {
              name: { type: 'JSXIdentifier', name: 'Button' },
              attributes: [],
            },
            loc: testCase.loc,
          },
        } as any;

        const fileAbsPath = `/project/src/Location${index}.tsx`;
        const isMigrating: [string, string, ImportUsage] = [
          '@company/ui',
          'Button',
          {
            packageName: '@company/ui',
            componentName: 'Button',
            importPath: fileAbsPath,
            usageCount: 1,
            props: new Set(),
          },
        ];

        mockGetContext.mockReturnValue({
          ROOT_PATH: '/project',
          TARGET_COMPONENT: 'Button',
          report: {},
        } as any);

        const result = analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating);

        // Should handle gracefully, either returning result or null
        if (result) {
          expect(typeof result.id).toBe('string');
        }
      });
    });

    it('should handle concurrent analysis operations', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => {
        const mockJSXPath: JSXPath = {
          node: {
            openingElement: {
              name: { type: 'JSXIdentifier', name: 'Button' },
              attributes: [],
            },
            loc: {
              start: { line: i, column: 1 },
            },
          },
        } as any;

        const fileAbsPath = `/project/src/Concurrent${i}.tsx`;
        const isMigrating: [string, string, ImportUsage] = [
          '@company/ui',
          'Button',
          {
            packageName: '@company/ui',
            componentName: 'Button',
            importPath: fileAbsPath,
            usageCount: 1,
            props: new Set(),
          },
        ];

        mockGetContext.mockReturnValue({
          ROOT_PATH: '/project',
          TARGET_COMPONENT: 'Button',
          report: {},
        } as any);

        mockPathRelative.mockReturnValue(`src/Concurrent${i}.tsx`);

        return Promise.resolve().then(() => 
          analyzeJSXElementWithMigration(mockJSXPath, fileAbsPath, isMigrating)
        );
      });

      const results = await Promise.all(promises);

      expect(results.filter(r => r !== null)).toHaveLength(100);
    });
  });
});
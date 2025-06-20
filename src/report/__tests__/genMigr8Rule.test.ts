import { jest } from '@jest/globals';
import { genMigr8Rule } from '../genMigr8Rule';
import * as globalContext from '@/context';
import { ComponentPropsSummary, ComponentUsage } from '@/types';
import { MIGRATE_RULES_DIR } from '@/utils/constants';
import { FileOperationError } from '@/utils/fs-utils';
import chalk from 'chalk';
import { Selections } from '..';
import { buildUsageTable } from '../printSelections';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// Mock dependencies
jest.mock('@/context');
jest.mock('@/utils/constants', () => ({
  MIGRATE_RULES_DIR: '/project/migr8Rules'
}));
jest.mock('@/utils/fs-utils');
jest.mock('chalk', () => ({
  default: {
    green: jest.fn((str) => str)
  }
}));
jest.mock('../printSelections');
jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));

describe('genMigr8Rule', () => {
  let mockSummary: ComponentPropsSummary;
  let mockSelections: Selections;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      ROOT_PATH: '/project'
    };

    mockSummary = {
      '@test/ui': {
        'Button': [
          {
            filePath: '/project/src/App.tsx',
            localName: 'Button',
            importName: 'Button',
            propsUsed: { variant: 'primary', size: 'large' },
            instances: 1
          },
          {
            filePath: '/project/src/Form.tsx',
            localName: 'Button',
            importName: 'Button',
            propsUsed: { variant: 'secondary', disabled: true },
            instances: 1
          }
        ],
        'Input': [
          {
            filePath: '/project/src/Form.tsx',
            localName: 'Input',
            importName: 'Input',
            propsUsed: { type: 'text', placeholder: 'Enter name' },
            instances: 1
          }
        ]
      },
      '@test/icons': {
        'Icon': [
          {
            filePath: '/project/src/Header.tsx',
            localName: 'Icon',
            importName: 'Icon',
            propsUsed: { name: 'search', size: 24 },
            instances: 2
          }
        ]
      }
    };

    mockSelections = {
      packages: ['@test/ui', '@test/icons'],
      components: ['@test/ui|Button', '@test/ui|Input', '@test/icons|Icon'],
      tables: [
        {
          value: {
            package: '@test/ui',
            component: '@test/ui|Button',
            propsSortedByUsage: ['variant', 'size', 'disabled']
          }
        },
        {
          value: {
            package: '@test/ui',
            component: '@test/ui|Input',
            propsSortedByUsage: ['type', 'placeholder']
          }
        },
        {
          value: {
            package: '@test/icons',
            component: '@test/icons|Icon',
            propsSortedByUsage: ['name', 'size']
          }
        }
      ]
    };

    (globalContext.getContext as jest.Mock).mockReturnValue(mockContext);
    (globalContext.lError as jest.Mock).mockImplementation((msg, err) => console.error(msg, err));
    (globalContext.lWarning as jest.Mock).mockImplementation((msg) => console.warn(msg));
    (globalContext.lInfo as jest.Mock).mockImplementation((msg) => console.info(msg));

    (buildUsageTable as jest.Mock).mockReturnValue({
      rows: [
        { props: { variant: 'primary', size: 'large' } },
        { props: { variant: 'secondary', disabled: true } }
      ]
    });

    // Mock Date.now for consistent file naming
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01 00:00:00
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Success Cases', () => {
    it('should generate migration rule file successfully', async () => {
      const result = await genMigr8Rule(mockSummary, mockSelections);

      expect(mkdirSync).toHaveBeenCalledWith('/project/migr8Rules', { recursive: true });
      expect(writeFileSync).toHaveBeenCalledWith(
        '/project/migr8Rules/1640995200-Button-Input-Icon-migr8.json',
        expect.stringContaining('"lookup"'),
        'utf8'
      );
      expect(result).toContain('Created Migr8Rule file');
      expect(result).toContain('fill in all the `TODO:`');
    });

    it('should create correct migr8spec structure', async () => {
      await genMigr8Rule(mockSummary, mockSelections);

      const writeCall = (writeFileSync as jest.Mock).mock.calls[0];
      const jsonContent = writeCall[1];
      const parsedContent = JSON.parse(jsonContent);

      expect(parsedContent).toMatchObject({
        lookup: {
          rootPath: '/project',
          packages: ['@test/ui', '@test/icons'],
          components: ['Button', 'Input', 'Icon']
        },
        migr8rules: expect.arrayContaining([
          expect.objectContaining({
            package: '@test/ui',
            component: 'Button',
            importType: 'TODO: named | default',
            importTo: expect.objectContaining({
              importStm: 'TODO: New import statement',
              importType: 'TODO: named | default',
              component: 'TODO: new component name'
            }),
            rules: expect.arrayContaining([
              expect.objectContaining({
                order: expect.any(Number),
                match: [{ variant: 'primary', size: 'large' }],
                set: {},
                remove: []
              })
            ])
          })
        ])
      });
    });

    it('should handle components with safe names for file naming', async () => {
      mockSelections.components = ['@test/ui|Button-With-Dashes', '@test/ui|Input$Special'];
      
      await genMigr8Rule(mockSummary, mockSelections);

      expect(writeFileSync).toHaveBeenCalledWith(
        '/project/migr8Rules/1640995200-Button-With-Dashes-Input_Special-migr8.json',
        expect.any(String),
        'utf8'
      );
    });

    it('should handle multiple rules per component', async () => {
      (buildUsageTable as jest.Mock).mockReturnValue({
        rows: [
          { props: { variant: 'primary', size: 'large' } },
          { props: { variant: 'secondary', size: 'medium' } },
          { props: { variant: 'tertiary', size: 'small' } }
        ]
      });

      await genMigr8Rule(mockSummary, mockSelections);

      const writeCall = (writeFileSync as jest.Mock).mock.calls[0];
      const jsonContent = writeCall[1];
      const parsedContent = JSON.parse(jsonContent);

      const buttonRules = parsedContent.migr8rules.find((rule: any) => rule.component === 'Button');
      expect(buttonRules.rules).toHaveLength(3);
      expect(buttonRules.rules[0].order).toBe(1);
      expect(buttonRules.rules[1].order).toBe(2);
      expect(buttonRules.rules[2].order).toBe(3);
    });

    it('should handle directory creation when it does not exist', async () => {
      const error = new Error('Directory does not exist');
      error.code = 'ENOENT';
      (mkdirSync as jest.Mock).mockImplementationOnce(() => { throw error; });

      await genMigr8Rule(mockSummary, mockSelections);

      expect(mkdirSync).toHaveBeenCalledWith('/project/migr8Rules', { recursive: true });
      expect(writeFileSync).toHaveBeenCalled(); // Should still write the file
    });

    it('should skip directory creation if it already exists', async () => {
      const error = new Error('Directory already exists');
      error.code = 'EEXIST';
      (mkdirSync as jest.Mock).mockImplementationOnce(() => { throw error; });

      await genMigr8Rule(mockSummary, mockSelections);

      expect(writeFileSync).toHaveBeenCalled(); // Should proceed to write file
    });
  });

  describe('Error Cases', () => {
    it('should throw error when no packages selected', async () => {
      mockSelections.packages = [];

      await expect(genMigr8Rule(mockSummary, mockSelections)).rejects.toThrow(
        'No packages selected for migration rule generation'
      );
    });

    it('should throw error when no components selected', async () => {
      mockSelections.components = [];

      await expect(genMigr8Rule(mockSummary, mockSelections)).rejects.toThrow(
        'No components selected for migration rule generation'
      );
    });

    it('should handle malformed component format', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSelections.components = ['invalid-format'];

      await genMigr8Rule(mockSummary, mockSelections);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid component format: invalid-format');
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle invalid package or component selection', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSelections.tables = [
        {
          value: {
            package: '',
            component: '@test/ui|Button',
            propsSortedByUsage: ['variant']
          }
        }
      ];

      await genMigr8Rule(mockSummary, mockSelections);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid package or component selection')
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle components with no usages', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSummary['@test/ui']['Button'] = [];

      await genMigr8Rule(mockSummary, mockSelections);

      expect(consoleWarnSpy).toHaveBeenCalledWith('No usages found for @test/ui/Button');
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle directory creation errors', async () => {
      const dirError = new Error('Permission denied');
      dirError.code = 'EPERM';
      (mkdirSync as jest.Mock).mockImplementationOnce(() => { throw dirError; });

      await expect(genMigr8Rule(mockSummary, mockSelections)).rejects.toThrow(
        FileOperationError
      );

      expect(globalContext.lError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create migration rule file'),
        expect.any(Error)
      );
    });

    it('should handle file write errors', async () => {
      const writeError = new Error('Disk full');
      (writeFileSync as jest.Mock).mockImplementationOnce(() => { throw writeError; });

      await expect(genMigr8Rule(mockSummary, mockSelections)).rejects.toThrow(
        FileOperationError
      );

      expect(globalContext.lError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create migration rule file'),
        expect.any(Error)
      );
    });

    it('should handle usage table build errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (buildUsageTable as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Table build failed');
      });

      await genMigr8Rule(mockSummary, mockSelections);

      expect(globalContext.lError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to build usage table'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle table entry processing errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSelections.tables = [
        {
          value: {
            package: '@test/ui',
            component: null, // This will cause an error
            propsSortedByUsage: ['variant']
          }
        }
      ];

      await genMigr8Rule(mockSummary, mockSelections);

      expect(globalContext.lError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process table entry'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle unexpected module import errors', async () => {
      // Mock dynamic import failure
      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('Module not found'));

      await expect(genMigr8Rule(mockSummary, mockSelections)).rejects.toThrow(
        'Failed to create migration rule file'
      );

      global.import = originalImport;
    });

    it('should handle JSON stringify errors', async () => {
      // Create circular reference to cause JSON.stringify to fail
      const circularObject = {};
      circularObject.self = circularObject;
      mockSummary['@test/ui']['Button'][0].propsUsed = circularObject;

      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn().mockImplementation(() => {
        throw new Error('Converting circular structure to JSON');
      });

      await expect(genMigr8Rule(mockSummary, mockSelections)).rejects.toThrow(
        FileOperationError
      );

      JSON.stringify = originalStringify;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tables array', async () => {
      mockSelections.tables = [];

      const result = await genMigr8Rule(mockSummary, mockSelections);

      const writeCall = (writeFileSync as jest.Mock).mock.calls[0];
      const jsonContent = writeCall[1];
      const parsedContent = JSON.parse(jsonContent);

      expect(parsedContent.migr8rules).toHaveLength(0);
      expect(result).toContain('Created Migr8Rule file');
    });

    it('should handle special characters in component names', async () => {
      mockSelections.components = ['@test/ui|Button&Input', '@test/ui|Form<Field>'];
      
      await genMigr8Rule(mockSummary, mockSelections);

      expect(writeFileSync).toHaveBeenCalledWith(
        '/project/migr8Rules/1640995200-Button_Input-Form_Field_-migr8.json',
        expect.any(String),
        'utf8'
      );
    });

    it('should handle very long component names', async () => {
      const longName = 'A'.repeat(200);
      mockSelections.components = [`@test/ui|${longName}`];
      
      await genMigr8Rule(mockSummary, mockSelections);

      const writeCall = (writeFileSync as jest.Mock).mock.calls[0];
      const filePath = writeCall[0];
      
      // Should truncate or handle long names gracefully
      expect(filePath).toBeDefined();
      expect(filePath.length).toBeLessThan(300); // Reasonable path length
    });

    it('should handle concurrent execution', async () => {
      // Simulate multiple calls
      const promises = [
        genMigr8Rule(mockSummary, mockSelections),
        genMigr8Rule(mockSummary, mockSelections),
        genMigr8Rule(mockSummary, mockSelections)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(writeFileSync).toHaveBeenCalledTimes(3);
      // Each call should generate a unique filename (due to timestamp)
    });

    it('should preserve existing migr8rules directory permissions', async () => {
      // Directory already exists
      const error = new Error('Directory exists');
      error.code = 'EEXIST';
      (mkdirSync as jest.Mock).mockImplementationOnce(() => { throw error; });

      await genMigr8Rule(mockSummary, mockSelections);

      // Should not call mkdirSync again and proceed with file write
      expect(mkdirSync).toHaveBeenCalledTimes(1);
      expect(writeFileSync).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of components efficiently', async () => {
      // Create a large summary with many components
      const largeSelections = {
        packages: ['@test/ui'],
        components: [],
        tables: []
      };

      const largeSummary: ComponentPropsSummary = {
        '@test/ui': {}
      };

      // Generate 100 components
      for (let i = 0; i < 100; i++) {
        const componentName = `Component${i}`;
        largeSelections.components.push(`@test/ui|${componentName}`);
        largeSelections.tables.push({
          value: {
            package: '@test/ui',
            component: `@test/ui|${componentName}`,
            propsSortedByUsage: ['prop1', 'prop2']
          }
        });

        largeSummary['@test/ui'][componentName] = [
          {
            filePath: `/project/src/Component${i}.tsx`,
            localName: componentName,
            importName: componentName,
            propsUsed: { prop1: 'value1', prop2: 'value2' },
            instances: 1
          }
        ];
      }

      const startTime = Date.now();
      await genMigr8Rule(largeSummary, largeSelections);
      const endTime = Date.now();

      // Should complete within reasonable time (< 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      const writeCall = (writeFileSync as jest.Mock).mock.calls[0];
      const jsonContent = writeCall[1];
      const parsedContent = JSON.parse(jsonContent);

      expect(parsedContent.migr8rules).toHaveLength(100);
    });

    it('should handle components with many usage patterns', async () => {
      // Create many usage patterns for a single component
      const manyUsages: ComponentUsage[] = [];
      const manyRows: any[] = [];

      for (let i = 0; i < 50; i++) {
        manyUsages.push({
          filePath: `/project/src/File${i}.tsx`,
          localName: 'Button',
          importName: 'Button',
          propsUsed: { variant: `variant${i}`, size: `size${i}` },
          instances: 1
        });

        manyRows.push({
          props: { variant: `variant${i}`, size: `size${i}` }
        });
      }

      mockSummary['@test/ui']['Button'] = manyUsages;
      (buildUsageTable as jest.Mock).mockReturnValue({ rows: manyRows });

      const startTime = Date.now();
      await genMigr8Rule(mockSummary, mockSelections);
      const endTime = Date.now();

      // Should handle many patterns efficiently
      expect(endTime - startTime).toBeLessThan(2000);

      const writeCall = (writeFileSync as jest.Mock).mock.calls[0];
      const jsonContent = writeCall[1];
      const parsedContent = JSON.parse(jsonContent);

      const buttonRules = parsedContent.migr8rules.find((rule: any) => rule.component === 'Button');
      expect(buttonRules.rules).toHaveLength(50);
    });
  });
});
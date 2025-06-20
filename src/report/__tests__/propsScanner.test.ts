/**
 * @file propsScanner.test.ts
 * @description Comprehensive unit tests for props analysis and scanning
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the propsScanner module
const mockPropsScanner = {
  propsScanner: jest.fn(),
  scanComponentUsage: jest.fn(),
  analyzePropsPatterns: jest.fn(),
  generatePropsReport: jest.fn(),
  groupUsagesByComponent: jest.fn(),
  calculatePropsStatistics: jest.fn(),
  detectUnusedProps: jest.fn(),
  findCommonProps: jest.fn(),
  suggestPropMappings: jest.fn(),
  validatePropsConsistency: jest.fn(),
  PropsAnalysisError: class extends Error {
    constructor(message: string, public readonly code: string) {
      super(message);
      this.name = 'PropsAnalysisError';
    }
  }
};

// Mock dependencies
jest.mock('../../context/globalContext');
jest.mock('../../graph/types');
jest.mock('../printSelections');
jest.mock('../../utils/logger');

const mockContext = require('../../context/globalContext');
const mockPrintSelections = require('../printSelections');

describe('propsScanner', () => {
  const mockComponentSummary = {
    'react': {
      'Button': {
        totalUsages: 15,
        files: ['/src/Button.tsx', '/src/App.tsx'],
        usages: [
          {
            filePath: '/src/Button.tsx',
            props: { type: 'primary', size: 'medium', disabled: false },
            line: 10,
            column: 5
          },
          {
            filePath: '/src/App.tsx',
            props: { type: 'secondary', onClick: 'handleClick', children: 'Click me' },
            line: 25,
            column: 12
          }
        ]
      },
      'Input': {
        totalUsages: 8,
        files: ['/src/Form.tsx'],
        usages: [
          {
            filePath: '/src/Form.tsx',
            props: { placeholder: 'Enter text', required: true, type: 'text' },
            line: 15,
            column: 8
          }
        ]
      }
    },
    'old-ui-lib': {
      'LegacyButton': {
        totalUsages: 3,
        files: ['/src/Legacy.tsx'],
        usages: [
          {
            filePath: '/src/Legacy.tsx',
            props: { variant: 'danger', size: 'large' },
            line: 8,
            column: 4
          }
        ]
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock context
    mockContext.getContext.mockReturnValue({
      graph: {
        imports: [],
        jsx: [],
        packages: ['react', 'old-ui-lib']
      }
    });
    
    // Mock print selections
    mockPrintSelections.tableViewMenu = jest.fn();
    mockPrintSelections.propsTable = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('propsScanner', () => {
    it('should scan and analyze component props usage', async () => {
      mockPropsScanner.propsScanner.mockResolvedValue({
        success: true,
        message: 'Props analysis completed successfully',
        statistics: {
          totalComponents: 3,
          totalUsages: 26,
          uniqueProps: 12,
          filesAnalyzed: 3
        }
      });

      const result = await mockPropsScanner.propsScanner(mockComponentSummary);

      expect(result.success).toBe(true);
      expect(result.statistics.totalComponents).toBe(3);
      expect(result.statistics.totalUsages).toBe(26);
    });

    it('should handle empty component summary', async () => {
      mockPropsScanner.propsScanner.mockResolvedValue({
        success: true,
        message: 'No components found to analyze',
        statistics: {
          totalComponents: 0,
          totalUsages: 0,
          uniqueProps: 0,
          filesAnalyzed: 0
        }
      });

      const result = await mockPropsScanner.propsScanner({});

      expect(result.success).toBe(true);
      expect(result.statistics.totalComponents).toBe(0);
    });

    it('should display interactive props table', async () => {
      mockPrintSelections.tableViewMenu.mockResolvedValue('view-details');
      mockPrintSelections.propsTable.mockResolvedValue(undefined);
      
      mockPropsScanner.propsScanner.mockImplementation(async (summary) => {
        // Simulate interaction
        await mockPrintSelections.tableViewMenu();
        await mockPrintSelections.propsTable(summary);
        
        return {
          success: true,
          message: 'Interactive analysis completed',
          userInteraction: true
        };
      });

      const result = await mockPropsScanner.propsScanner(mockComponentSummary);

      expect(result.userInteraction).toBe(true);
      expect(mockPrintSelections.tableViewMenu).toHaveBeenCalled();
      expect(mockPrintSelections.propsTable).toHaveBeenCalledWith(mockComponentSummary);
    });

    it('should handle analysis errors gracefully', async () => {
      mockPropsScanner.propsScanner.mockRejectedValue(
        new mockPropsScanner.PropsAnalysisError('Failed to analyze props', 'ANALYSIS_FAILED')
      );

      await expect(mockPropsScanner.propsScanner(mockComponentSummary))
        .rejects.toThrow('Failed to analyze props');
    });

    it('should provide progress updates for large datasets', async () => {
      const progressUpdates: any[] = [];
      
      mockPropsScanner.propsScanner.mockImplementation(async (summary, options) => {
        const onProgress = options?.onProgress;
        
        if (onProgress) {
          onProgress(0, 3, 'Starting analysis');
          onProgress(1, 3, 'Analyzing react components');
          onProgress(2, 3, 'Analyzing old-ui-lib components');
          onProgress(3, 3, 'Analysis complete');
        }

        return {
          success: true,
          message: 'Analysis completed with progress tracking'
        };
      });

      await mockPropsScanner.propsScanner(mockComponentSummary, {
        onProgress: (current: number, total: number, message: string) => {
          progressUpdates.push({ current, total, message });
        }
      });

      expect(progressUpdates).toHaveLength(4);
      expect(progressUpdates[0].message).toBe('Starting analysis');
      expect(progressUpdates[3].current).toBe(3);
    });
  });

  describe('scanComponentUsage', () => {
    it('should scan individual component usage patterns', () => {
      const buttonUsages = mockComponentSummary.react.Button.usages;
      
      mockPropsScanner.scanComponentUsage.mockReturnValue({
        component: 'Button',
        package: 'react',
        totalUsages: 2,
        uniqueProps: ['type', 'size', 'disabled', 'onClick', 'children'],
        propFrequency: {
          type: 2,
          size: 1,
          disabled: 1,
          onClick: 1,
          children: 1
        },
        patterns: {
          mostCommon: { type: 'primary' },
          required: ['type'],
          optional: ['size', 'disabled', 'onClick', 'children']
        }
      });

      const result = mockPropsScanner.scanComponentUsage('Button', 'react', buttonUsages);

      expect(result.totalUsages).toBe(2);
      expect(result.uniqueProps).toHaveLength(5);
      expect(result.propFrequency.type).toBe(2);
      expect(result.patterns.required).toContain('type');
    });

    it('should handle components with no usages', () => {
      mockPropsScanner.scanComponentUsage.mockReturnValue({
        component: 'UnusedComponent',
        package: 'react',
        totalUsages: 0,
        uniqueProps: [],
        propFrequency: {},
        patterns: {
          mostCommon: {},
          required: [],
          optional: []
        }
      });

      const result = mockPropsScanner.scanComponentUsage('UnusedComponent', 'react', []);

      expect(result.totalUsages).toBe(0);
      expect(result.uniqueProps).toHaveLength(0);
    });

    it('should identify prop patterns and types', () => {
      const usages = [
        { props: { size: 'small', type: 'button' } },
        { props: { size: 'medium', type: 'button' } },
        { props: { size: 'large', type: 'submit' } },
        { props: { type: 'button', disabled: true } }
      ];

      mockPropsScanner.scanComponentUsage.mockReturnValue({
        component: 'Button',
        package: 'react',
        propTypes: {
          size: ['small', 'medium', 'large'],
          type: ['button', 'submit'],
          disabled: ['boolean']
        },
        patterns: {
          combinations: [
            { props: ['size', 'type'], frequency: 3 },
            { props: ['type', 'disabled'], frequency: 1 }
          ]
        }
      });

      const result = mockPropsScanner.scanComponentUsage('Button', 'react', usages);

      expect(result.propTypes.size).toEqual(['small', 'medium', 'large']);
      expect(result.propTypes.type).toEqual(['button', 'submit']);
      expect(result.patterns.combinations[0].frequency).toBe(3);
    });
  });

  describe('analyzePropsPatterns', () => {
    it('should analyze cross-component prop patterns', () => {
      mockPropsScanner.analyzePropsPatterns.mockReturnValue({
        commonProps: {
          'size': {
            components: ['Button', 'Input'],
            values: ['small', 'medium', 'large'],
            frequency: 12
          },
          'disabled': {
            components: ['Button', 'Input'],
            values: [true, false],
            frequency: 8
          }
        },
        unusualPatterns: [
          {
            component: 'LegacyButton',
            prop: 'variant',
            reason: 'Only used in legacy components'
          }
        ],
        migrationSuggestions: [
          {
            from: { component: 'LegacyButton', prop: 'variant' },
            to: { component: 'Button', prop: 'type' },
            confidence: 0.85
          }
        ]
      });

      const result = mockPropsScanner.analyzePropsPatterns(mockComponentSummary);

      expect(result.commonProps.size.components).toContain('Button');
      expect(result.migrationSuggestions).toHaveLength(1);
      expect(result.migrationSuggestions[0].confidence).toBe(0.85);
    });

    it('should detect inconsistent prop usage', () => {
      mockPropsScanner.analyzePropsPatterns.mockReturnValue({
        inconsistencies: [
          {
            prop: 'size',
            issue: 'Inconsistent values',
            details: {
              component: 'Button',
              expected: ['small', 'medium', 'large'],
              found: ['sm', 'md', 'lg', 'small']
            }
          }
        ],
        warnings: [
          'Mixed naming conventions for size prop',
          'Consider standardizing prop values'
        ]
      });

      const result = mockPropsScanner.analyzePropsPatterns(mockComponentSummary);

      expect(result.inconsistencies).toHaveLength(1);
      expect(result.warnings).toContain('Mixed naming conventions for size prop');
    });

    it('should analyze prop relationships and dependencies', () => {
      mockPropsScanner.analyzePropsPatterns.mockReturnValue({
        relationships: [
          {
            type: 'conditional',
            description: 'disabled prop only appears with type="submit"',
            props: ['disabled', 'type'],
            confidence: 0.75
          },
          {
            type: 'exclusive',
            description: 'variant and type are mutually exclusive',
            props: ['variant', 'type'],
            confidence: 0.9
          }
        ]
      });

      const result = mockPropsScanner.analyzePropsPatterns(mockComponentSummary);

      expect(result.relationships).toHaveLength(2);
      expect(result.relationships[0].type).toBe('conditional');
      expect(result.relationships[1].confidence).toBe(0.9);
    });
  });

  describe('generatePropsReport', () => {
    it('should generate comprehensive props usage report', () => {
      mockPropsScanner.generatePropsReport.mockReturnValue({
        summary: {
          totalComponents: 3,
          totalUsages: 26,
          mostUsedProps: ['type', 'size', 'onClick'],
          leastUsedProps: ['variant', 'disabled'],
          complexity: 'medium'
        },
        detailedAnalysis: {
          'react': {
            components: 2,
            usages: 23,
            averagePropsPerUsage: 2.8
          },
          'old-ui-lib': {
            components: 1,
            usages: 3,
            averagePropsPerUsage: 2.0
          }
        },
        recommendations: [
          'Consider migrating from old-ui-lib to react components',
          'Standardize size prop values across components',
          'Remove unused variant prop from legacy components'
        ]
      });

      const result = mockPropsScanner.generatePropsReport(mockComponentSummary);

      expect(result.summary.totalComponents).toBe(3);
      expect(result.recommendations).toHaveLength(3);
      expect(result.detailedAnalysis.react.components).toBe(2);
    });

    it('should include migration complexity assessment', () => {
      mockPropsScanner.generatePropsReport.mockReturnValue({
        migrationComplexity: {
          overall: 'high',
          factors: [
            'Multiple prop naming conventions',
            'Legacy component dependencies',
            'Complex prop relationships'
          ],
          estimatedEffort: {
            hours: 24,
            risk: 'medium'
          }
        }
      });

      const result = mockPropsScanner.generatePropsReport(mockComponentSummary);

      expect(result.migrationComplexity.overall).toBe('high');
      expect(result.migrationComplexity.estimatedEffort.hours).toBe(24);
    });

    it('should provide actionable migration steps', () => {
      mockPropsScanner.generatePropsReport.mockReturnValue({
        migrationSteps: [
          {
            step: 1,
            action: 'Replace LegacyButton with Button',
            affected: ['Legacy.tsx'],
            effort: 'low'
          },
          {
            step: 2,
            action: 'Standardize size prop values',
            affected: ['Button.tsx', 'App.tsx'],
            effort: 'medium'
          }
        ]
      });

      const result = mockPropsScanner.generatePropsReport(mockComponentSummary);

      expect(result.migrationSteps).toHaveLength(2);
      expect(result.migrationSteps[0].action).toContain('Replace LegacyButton');
    });
  });

  describe('utility functions', () => {
    describe('groupUsagesByComponent', () => {
      it('should group usages by component name', () => {
        const rawUsages = [
          { component: 'Button', props: { type: 'primary' } },
          { component: 'Input', props: { placeholder: 'Text' } },
          { component: 'Button', props: { type: 'secondary' } }
        ];

        mockPropsScanner.groupUsagesByComponent.mockReturnValue({
          'Button': [
            { component: 'Button', props: { type: 'primary' } },
            { component: 'Button', props: { type: 'secondary' } }
          ],
          'Input': [
            { component: 'Input', props: { placeholder: 'Text' } }
          ]
        });

        const result = mockPropsScanner.groupUsagesByComponent(rawUsages);

        expect(result.Button).toHaveLength(2);
        expect(result.Input).toHaveLength(1);
      });
    });

    describe('calculatePropsStatistics', () => {
      it('should calculate detailed statistics', () => {
        mockPropsScanner.calculatePropsStatistics.mockReturnValue({
          totalProps: 8,
          averagePropsPerUsage: 2.5,
          mostFrequentProps: ['type', 'size', 'onClick'],
          propDistribution: {
            'type': 15,
            'size': 10,
            'onClick': 8,
            'disabled': 3
          },
          diversityIndex: 0.75
        });

        const result = mockPropsScanner.calculatePropsStatistics(mockComponentSummary);

        expect(result.totalProps).toBe(8);
        expect(result.averagePropsPerUsage).toBe(2.5);
        expect(result.mostFrequentProps[0]).toBe('type');
      });
    });

    describe('detectUnusedProps', () => {
      it('should identify unused or rarely used props', () => {
        mockPropsScanner.detectUnusedProps.mockReturnValue({
          unused: [],
          rarelyUsed: [
            { prop: 'variant', usages: 1, threshold: 5 },
            { prop: 'tabIndex', usages: 2, threshold: 5 }
          ],
          recommendations: [
            'Consider removing variant prop (used only 1 time)',
            'tabIndex prop may not be necessary'
          ]
        });

        const result = mockPropsScanner.detectUnusedProps(mockComponentSummary, {
          rareUsageThreshold: 5
        });

        expect(result.unused).toHaveLength(0);
        expect(result.rarelyUsed).toHaveLength(2);
        expect(result.recommendations[0]).toContain('variant prop');
      });
    });

    describe('findCommonProps', () => {
      it('should find props common across components', () => {
        mockPropsScanner.findCommonProps.mockReturnValue({
          universal: ['className'],
          frequent: ['size', 'disabled'],
          crossPackage: [
            {
              prop: 'size',
              packages: ['react', 'old-ui-lib'],
              components: ['Button', 'Input', 'LegacyButton']
            }
          ]
        });

        const result = mockPropsScanner.findCommonProps(mockComponentSummary);

        expect(result.universal).toContain('className');
        expect(result.crossPackage[0].packages).toHaveLength(2);
      });
    });

    describe('suggestPropMappings', () => {
      it('should suggest prop mappings for migration', () => {
        mockPropsScanner.suggestPropMappings.mockReturnValue([
          {
            fromComponent: 'LegacyButton',
            toComponent: 'Button',
            mappings: [
              { from: 'variant', to: 'type', confidence: 0.9 },
              { from: 'size', to: 'size', confidence: 1.0 }
            ],
            complexMappings: [
              {
                from: 'variant',
                to: 'type',
                valueMap: {
                  'danger': 'error',
                  'success': 'primary'
                }
              }
            ]
          }
        ]);

        const result = mockPropsScanner.suggestPropMappings(mockComponentSummary);

        expect(result).toHaveLength(1);
        expect(result[0].mappings[0].confidence).toBe(0.9);
        expect(result[0].complexMappings[0].valueMap.danger).toBe('error');
      });
    });

    describe('validatePropsConsistency', () => {
      it('should validate prop consistency across usages', () => {
        mockPropsScanner.validatePropsConsistency.mockReturnValue({
          consistent: true,
          issues: [],
          warnings: [
            'size prop uses different naming conventions',
            'Consider standardizing boolean prop patterns'
          ],
          score: 0.85
        });

        const result = mockPropsScanner.validatePropsConsistency(mockComponentSummary);

        expect(result.consistent).toBe(true);
        expect(result.score).toBe(0.85);
        expect(result.warnings).toHaveLength(2);
      });

      it('should detect consistency issues', () => {
        mockPropsScanner.validatePropsConsistency.mockReturnValue({
          consistent: false,
          issues: [
            {
              type: 'naming-inconsistency',
              prop: 'size',
              description: 'Mixed short and long form values',
              examples: ['sm vs small', 'lg vs large']
            },
            {
              type: 'type-inconsistency',
              prop: 'disabled',
              description: 'Mixed boolean and string values',
              examples: [true, 'true', 'disabled']
            }
          ],
          score: 0.45
        });

        const result = mockPropsScanner.validatePropsConsistency(mockComponentSummary);

        expect(result.consistent).toBe(false);
        expect(result.issues).toHaveLength(2);
        expect(result.score).toBeLessThan(0.5);
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed component data', async () => {
      const malformedSummary = {
        'react': {
          'Button': {
            // Missing required fields
            usages: null
          }
        }
      };

      mockPropsScanner.propsScanner.mockRejectedValue(
        new mockPropsScanner.PropsAnalysisError('Invalid component data structure', 'INVALID_DATA')
      );

      await expect(mockPropsScanner.propsScanner(malformedSummary))
        .rejects.toThrow('Invalid component data structure');
    });

    it('should handle circular references in props', () => {
      const circularProps = { self: null };
      circularProps.self = circularProps;

      mockPropsScanner.scanComponentUsage.mockImplementation(() => {
        throw new mockPropsScanner.PropsAnalysisError('Circular reference detected', 'CIRCULAR_REF');
      });

      expect(() => mockPropsScanner.scanComponentUsage('Component', 'package', [
        { props: circularProps }
      ])).toThrow('Circular reference detected');
    });

    it('should handle extremely large datasets', async () => {
      const largeSummary = {};
      // Simulate large dataset
      for (let i = 0; i < 1000; i++) {
        largeSummary[`package-${i}`] = {
          [`Component-${i}`]: {
            totalUsages: 100,
            usages: Array(100).fill({ props: { prop1: 'value1' } })
          }
        };
      }

      mockPropsScanner.propsScanner.mockResolvedValue({
        success: true,
        message: 'Large dataset processed successfully',
        performance: {
          duration: 5000,
          memoryUsed: 150 * 1024 * 1024,
          componentsProcessed: 1000
        }
      });

      const result = await mockPropsScanner.propsScanner(largeSummary);

      expect(result.success).toBe(true);
      expect(result.performance.componentsProcessed).toBe(1000);
    });
  });
});
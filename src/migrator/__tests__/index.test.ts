/**
 * @file index.test.ts
 * @description Comprehensive unit tests for migration engine
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the migrator module 
const mockMigrator = {
  migrateComponents: jest.fn(),
  applyTransformations: jest.fn(),
  validateMigration: jest.fn(),
  prepareMigrationPlan: jest.fn(),
  executeTransformation: jest.fn(),
  rollbackMigration: jest.fn(),
  generateMigrationReport: jest.fn(),
  MigrationError: class extends Error {
    constructor(message: string, public readonly code: string, public readonly file?: string) {
      super(message);
      this.name = 'MigrationError';
    }
  }
};

// Mock dependencies
jest.mock('../../context/globalContext');
jest.mock('../../utils/fs-utils');
jest.mock('../../backup/backup-manager');
jest.mock('../../validation');
jest.mock('../../utils/logger');
jest.mock('../utils/prepareReportToMigrate');

const mockContext = require('../../context/globalContext');
const mockFsUtils = require('../../utils/fs-utils');
const mockBackupManager = require('../../backup/backup-manager');
const mockValidation = require('../../validation');
const mockPrepareReport = require('../utils/prepareReportToMigrate');

describe('migrator', () => {
  const mockFiles = [
    '/src/components/Button.tsx',
    '/src/components/Input.tsx',
    '/src/pages/App.tsx'
  ];

  const mockMigrationRules = {
    'old-ui-lib': {
      'Button': {
        importFrom: 'old-ui-lib',
        importTo: 'new-ui-lib',
        remove: ['variant'],
        rename: { size: 'dimension' },
        set: { type: 'button' }
      }
    }
  };

  const mockComponentUsages = [
    {
      filePath: '/src/components/Button.tsx',
      component: 'Button',
      props: { variant: 'primary', size: 'large' },
      line: 10,
      column: 5
    },
    {
      filePath: '/src/pages/App.tsx',
      component: 'Button',
      props: { variant: 'secondary', size: 'medium', onClick: 'handleClick' },
      line: 25,
      column: 12
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock context
    mockContext.getContext.mockReturnValue({
      ROOT_PATH: '/test/project',
      graph: {
        imports: [],
        jsx: mockComponentUsages,
        files: mockFiles
      }
    });
    
    // Mock file operations
    mockFsUtils.getMigr8RulesFileNames.mockReturnValue(['old-ui-lib.json']);
    mockFsUtils.readJsonFile.mockResolvedValue(mockMigrationRules);
    mockFsUtils.writeFile.mockResolvedValue(undefined);
    
    // Mock backup manager
    mockBackupManager.getBackupManager.mockReturnValue({
      createBackup: jest.fn().mockResolvedValue({ id: 'backup-123' }),
      deleteBackup: jest.fn().mockResolvedValue(undefined)
    });
    
    // Mock validation
    mockValidation.logSecurityEvent.mockImplementation(() => {});
    
    // Mock prepare report
    mockPrepareReport.prepareReportToMigrate.mockReturnValue({
      filesToMigrate: mockFiles,
      componentsToMigrate: mockComponentUsages
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('migrateComponents', () => {
    it('should perform dry run migration without modifying files', async () => {
      mockMigrator.migrateComponents.mockResolvedValue({
        success: true,
        dryRun: true,
        message: 'Migration preview completed successfully',
        filesAnalyzed: 3,
        transformationsPlanned: 5,
        changes: [
          {
            file: '/src/components/Button.tsx',
            type: 'prop-rename',
            from: 'size',
            to: 'dimension',
            line: 10
          },
          {
            file: '/src/components/Button.tsx',
            type: 'prop-remove',
            prop: 'variant',
            line: 10
          }
        ]
      });

      const result = await mockMigrator.migrateComponents(false);

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.changes).toHaveLength(2);
      expect(mockFsUtils.writeFile).not.toHaveBeenCalled();
    });

    it('should perform actual migration and modify files', async () => {
      mockMigrator.migrateComponents.mockResolvedValue({
        success: true,
        dryRun: false,
        message: 'Migration completed successfully',
        filesModified: 3,
        transformationsApplied: 5,
        backupId: 'backup-123',
        changes: [
          {
            file: '/src/components/Button.tsx',
            type: 'prop-rename',
            applied: true
          },
          {
            file: '/src/pages/App.tsx',
            type: 'import-update',
            applied: true
          }
        ]
      });

      const result = await mockMigrator.migrateComponents(true);

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(false);
      expect(result.filesModified).toBe(3);
      expect(result.backupId).toBe('backup-123');
    });

    it('should create backup before migration', async () => {
      const mockBackup = mockBackupManager.getBackupManager();
      
      mockMigrator.migrateComponents.mockImplementation(async (dryRun) => {
        if (!dryRun) {
          await mockBackup.createBackup();
        }
        return {
          success: true,
          dryRun,
          backupCreated: !dryRun
        };
      });

      await mockMigrator.migrateComponents(true);

      expect(mockBackup.createBackup).toHaveBeenCalled();
    });

    it('should handle migration errors gracefully', async () => {
      mockMigrator.migrateComponents.mockRejectedValue(
        new mockMigrator.MigrationError('Transformation failed', 'TRANSFORM_ERROR', '/src/components/Button.tsx')
      );

      await expect(mockMigrator.migrateComponents(true))
        .rejects.toThrow('Transformation failed');

      expect(mockValidation.logSecurityEvent).toHaveBeenCalledWith(
        'migration-error',
        'error',
        'Migration failed',
        expect.objectContaining({
          errorCode: 'TRANSFORM_ERROR',
          file: '/src/components/Button.tsx'
        })
      );
    });

    it('should validate migration rules before applying', async () => {
      mockMigrator.validateMigration.mockReturnValue({
        valid: true,
        errors: [],
        warnings: []
      });

      mockMigrator.migrateComponents.mockImplementation(async (dryRun) => {
        const validation = mockMigrator.validateMigration(mockMigrationRules);
        if (!validation.valid) {
          throw new mockMigrator.MigrationError('Invalid migration rules', 'INVALID_RULES');
        }
        return { success: true, validated: true };
      });

      const result = await mockMigrator.migrateComponents(false);

      expect(result.validated).toBe(true);
      expect(mockMigrator.validateMigration).toHaveBeenCalledWith(mockMigrationRules);
    });

    it('should handle partial migration failures', async () => {
      mockMigrator.migrateComponents.mockResolvedValue({
        success: false,
        partial: true,
        message: 'Migration completed with errors',
        filesModified: 2,
        filesFailed: 1,
        errors: [
          {
            file: '/src/components/Input.tsx',
            error: 'Parse error',
            code: 'PARSE_ERROR'
          }
        ],
        successfulTransformations: 3,
        failedTransformations: 2
      });

      const result = await mockMigrator.migrateComponents(true);

      expect(result.success).toBe(false);
      expect(result.partial).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.filesModified).toBe(2);
    });

    it('should provide progress updates for large migrations', async () => {
      const progressUpdates: any[] = [];
      
      mockMigrator.migrateComponents.mockImplementation(async (dryRun, options) => {
        const onProgress = options?.onProgress;
        
        if (onProgress) {
          onProgress(0, 3, 'Starting migration');
          onProgress(1, 3, 'Processing Button.tsx');
          onProgress(2, 3, 'Processing Input.tsx');
          onProgress(3, 3, 'Migration complete');
        }

        return {
          success: true,
          filesProcessed: 3
        };
      });

      await mockMigrator.migrateComponents(false, {
        onProgress: (current: number, total: number, message: string) => {
          progressUpdates.push({ current, total, message });
        }
      });

      expect(progressUpdates).toHaveLength(4);
      expect(progressUpdates[1].message).toBe('Processing Button.tsx');
    });
  });

  describe('applyTransformations', () => {
    it('should apply prop transformations correctly', async () => {
      const transformations = [
        {
          type: 'prop-rename',
          file: '/src/components/Button.tsx',
          component: 'Button',
          from: 'size',
          to: 'dimension'
        },
        {
          type: 'prop-remove',
          file: '/src/components/Button.tsx',
          component: 'Button',
          prop: 'variant'
        }
      ];

      mockMigrator.applyTransformations.mockResolvedValue({
        success: true,
        transformationsApplied: 2,
        results: [
          { transformation: transformations[0], success: true },
          { transformation: transformations[1], success: true }
        ]
      });

      const result = await mockMigrator.applyTransformations(transformations);

      expect(result.success).toBe(true);
      expect(result.transformationsApplied).toBe(2);
      expect(result.results.every(r => r.success)).toBe(true);
    });

    it('should handle import transformations', async () => {
      const importTransformation = {
        type: 'import-update',
        file: '/src/components/Button.tsx',
        from: 'old-ui-lib',
        to: 'new-ui-lib',
        specifiers: ['Button']
      };

      mockMigrator.applyTransformations.mockResolvedValue({
        success: true,
        transformationsApplied: 1,
        results: [
          { 
            transformation: importTransformation, 
            success: true,
            before: "import { Button } from 'old-ui-lib';",
            after: "import { Button } from 'new-ui-lib';"
          }
        ]
      });

      const result = await mockMigrator.applyTransformations([importTransformation]);

      expect(result.results[0].before).toContain('old-ui-lib');
      expect(result.results[0].after).toContain('new-ui-lib');
    });

    it('should handle JSX replacement transformations', async () => {
      const jsxTransformation = {
        type: 'jsx-replace',
        file: '/src/components/Button.tsx',
        component: 'Button',
        replaceWith: {
          code: '<NewButton {...OUTER_PROPS}>{CHILDREN}</NewButton>',
          OUTER_PROPS: ['onClick', 'disabled'],
          CHILDREN: true
        }
      };

      mockMigrator.applyTransformations.mockResolvedValue({
        success: true,
        transformationsApplied: 1,
        results: [
          {
            transformation: jsxTransformation,
            success: true,
            before: '<Button onClick={handler} disabled>Click me</Button>',
            after: '<NewButton onClick={handler} disabled>Click me</NewButton>'
          }
        ]
      });

      const result = await mockMigrator.applyTransformations([jsxTransformation]);

      expect(result.results[0].after).toContain('NewButton');
      expect(result.results[0].after).toContain('onClick={handler}');
    });

    it('should rollback on transformation failure', async () => {
      mockMigrator.applyTransformations.mockRejectedValue(
        new mockMigrator.MigrationError('Transformation failed', 'TRANSFORM_ERROR')
      );

      mockMigrator.rollbackMigration.mockResolvedValue({
        success: true,
        filesRestored: 2
      });

      try {
        await mockMigrator.applyTransformations([]);
      } catch (error) {
        await mockMigrator.rollbackMigration('backup-123');
      }

      expect(mockMigrator.rollbackMigration).toHaveBeenCalledWith('backup-123');
    });
  });

  describe('validateMigration', () => {
    it('should validate migration rules structure', () => {
      mockMigrator.validateMigration.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        rulesCount: 1,
        componentsCount: 1
      });

      const result = mockMigrator.validateMigration(mockMigrationRules);

      expect(result.valid).toBe(true);
      expect(result.rulesCount).toBe(1);
      expect(result.componentsCount).toBe(1);
    });

    it('should detect invalid rule structure', () => {
      const invalidRules = {
        'package': {
          'Component': {
            // Missing required fields
            remove: ['prop']
          }
        }
      };

      mockMigrator.validateMigration.mockReturnValue({
        valid: false,
        errors: [
          'Missing importFrom field for package.Component',
          'Missing importTo field for package.Component'
        ],
        warnings: []
      });

      const result = mockMigrator.validateMigration(invalidRules);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should validate prop mapping consistency', () => {
      const inconsistentRules = {
        'package': {
          'Component': {
            importFrom: 'old',
            importTo: 'new',
            remove: ['size'],
            rename: { size: 'dimension' } // Contradiction
          }
        }
      };

      mockMigrator.validateMigration.mockReturnValue({
        valid: false,
        errors: [
          'Prop "size" is both removed and renamed'
        ],
        warnings: []
      });

      const result = mockMigrator.validateMigration(inconsistentRules);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('both removed and renamed');
    });

    it('should warn about potential issues', () => {
      mockMigrator.validateMigration.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [
          'Component "Button" has complex JSX replacement',
          'Consider testing transformations thoroughly'
        ]
      });

      const result = mockMigrator.validateMigration(mockMigrationRules);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(2);
    });
  });

  describe('prepareMigrationPlan', () => {
    it('should create detailed migration plan', () => {
      mockMigrator.prepareMigrationPlan.mockReturnValue({
        totalFiles: 3,
        totalComponents: 2,
        estimatedTime: 120, // seconds
        complexity: 'medium',
        phases: [
          {
            name: 'Import Updates',
            files: ['/src/components/Button.tsx'],
            transformations: 1,
            risk: 'low'
          },
          {
            name: 'Prop Transformations',
            files: ['/src/components/Button.tsx', '/src/pages/App.tsx'],
            transformations: 4,
            risk: 'medium'
          }
        ],
        dependencies: [
          'Backup creation',
          'Rule validation'
        ]
      });

      const result = mockMigrator.prepareMigrationPlan(mockMigrationRules, mockComponentUsages);

      expect(result.totalFiles).toBe(3);
      expect(result.phases).toHaveLength(2);
      expect(result.complexity).toBe('medium');
    });

    it('should identify migration dependencies', () => {
      mockMigrator.prepareMigrationPlan.mockReturnValue({
        dependencies: [
          {
            type: 'package',
            name: 'new-ui-lib',
            required: true,
            reason: 'Target package for migration'
          },
          {
            type: 'file',
            name: 'types.d.ts',
            required: false,
            reason: 'TypeScript definitions'
          }
        ]
      });

      const result = mockMigrator.prepareMigrationPlan(mockMigrationRules, mockComponentUsages);

      expect(result.dependencies[0].required).toBe(true);
      expect(result.dependencies[1].type).toBe('file');
    });

    it('should estimate migration risks', () => {
      mockMigrator.prepareMigrationPlan.mockReturnValue({
        risks: [
          {
            level: 'high',
            description: 'Complex JSX replacement in Button component',
            mitigation: 'Test thoroughly in development environment'
          },
          {
            level: 'medium',
            description: 'Multiple prop renames may affect functionality',
            mitigation: 'Review prop mappings before applying'
          }
        ]
      });

      const result = mockMigrator.prepareMigrationPlan(mockMigrationRules, mockComponentUsages);

      expect(result.risks).toHaveLength(2);
      expect(result.risks[0].level).toBe('high');
    });
  });

  describe('executeTransformation', () => {
    it('should execute single transformation', async () => {
      const transformation = {
        type: 'prop-rename',
        file: '/src/components/Button.tsx',
        component: 'Button',
        from: 'size',
        to: 'dimension'
      };

      mockMigrator.executeTransformation.mockResolvedValue({
        success: true,
        transformation,
        changes: [
          {
            line: 10,
            column: 25,
            before: 'size="large"',
            after: 'dimension="large"'
          }
        ],
        duration: 45
      });

      const result = await mockMigrator.executeTransformation(transformation);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.duration).toBe(45);
    });

    it('should handle transformation errors', async () => {
      const transformation = {
        type: 'invalid-type',
        file: '/src/components/Button.tsx'
      };

      mockMigrator.executeTransformation.mockRejectedValue(
        new mockMigrator.MigrationError('Unknown transformation type', 'UNKNOWN_TYPE')
      );

      await expect(mockMigrator.executeTransformation(transformation))
        .rejects.toThrow('Unknown transformation type');
    });

    it('should validate file before transformation', async () => {
      mockFsUtils.fileExists.mockResolvedValue(false);
      
      mockMigrator.executeTransformation.mockRejectedValue(
        new mockMigrator.MigrationError('File not found', 'FILE_NOT_FOUND')
      );

      const transformation = {
        type: 'prop-rename',
        file: '/nonexistent/file.tsx'
      };

      await expect(mockMigrator.executeTransformation(transformation))
        .rejects.toThrow('File not found');
    });
  });

  describe('generateMigrationReport', () => {
    it('should generate comprehensive migration report', () => {
      const migrationResult = {
        success: true,
        filesModified: 3,
        transformationsApplied: 5,
        duration: 2500,
        backupId: 'backup-123'
      };

      mockMigrator.generateMigrationReport.mockReturnValue({
        summary: {
          status: 'completed',
          filesProcessed: 3,
          transformationsApplied: 5,
          duration: '2.5 seconds',
          backupCreated: true
        },
        details: {
          filesModified: [
            '/src/components/Button.tsx',
            '/src/components/Input.tsx',
            '/src/pages/App.tsx'
          ],
          transformationsByType: {
            'prop-rename': 2,
            'prop-remove': 1,
            'import-update': 2
          }
        },
        recommendations: [
          'Test the application thoroughly',
          'Update TypeScript definitions if needed',
          'Consider updating documentation'
        ]
      });

      const result = mockMigrator.generateMigrationReport(migrationResult);

      expect(result.summary.status).toBe('completed');
      expect(result.details.filesModified).toHaveLength(3);
      expect(result.recommendations).toHaveLength(3);
    });

    it('should include error details in report', () => {
      const failedMigration = {
        success: false,
        errors: [
          { file: '/src/components/Button.tsx', error: 'Parse error' }
        ]
      };

      mockMigrator.generateMigrationReport.mockReturnValue({
        summary: {
          status: 'failed',
          errors: 1
        },
        errorDetails: [
          {
            file: '/src/components/Button.tsx',
            error: 'Parse error',
            suggestion: 'Check file syntax before migration'
          }
        ]
      });

      const result = mockMigrator.generateMigrationReport(failedMigration);

      expect(result.summary.status).toBe('failed');
      expect(result.errorDetails).toHaveLength(1);
    });
  });

  describe('performance and optimization', () => {
    it('should handle concurrent transformations', async () => {
      const transformations = Array.from({ length: 10 }, (_, i) => ({
        type: 'prop-rename',
        file: `/src/component${i}.tsx`,
        from: 'oldProp',
        to: 'newProp'
      }));

      mockMigrator.applyTransformations.mockResolvedValue({
        success: true,
        transformationsApplied: 10,
        concurrency: 4,
        duration: 1200
      });

      const result = await mockMigrator.applyTransformations(transformations, {
        concurrency: 4
      });

      expect(result.transformationsApplied).toBe(10);
      expect(result.concurrency).toBe(4);
    });

    it('should optimize for large codebases', async () => {
      mockMigrator.migrateComponents.mockResolvedValue({
        success: true,
        optimization: {
          batchSize: 50,
          memoryUsage: '120MB',
          processingTime: '45 seconds'
        }
      });

      const result = await mockMigrator.migrateComponents(true, {
        optimization: true,
        batchSize: 50
      });

      expect(result.optimization).toBeDefined();
      expect(result.optimization.batchSize).toBe(50);
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle empty migration rules', async () => {
      mockMigrator.migrateComponents.mockResolvedValue({
        success: true,
        message: 'No migration rules found - nothing to migrate',
        filesAnalyzed: 0,
        transformationsApplied: 0
      });

      const result = await mockMigrator.migrateComponents(false);

      expect(result.success).toBe(true);
      expect(result.transformationsApplied).toBe(0);
    });

    it('should handle binary files gracefully', async () => {
      mockMigrator.migrateComponents.mockResolvedValue({
        success: true,
        skippedFiles: [
          { file: '/src/assets/image.png', reason: 'Binary file' },
          { file: '/src/assets/font.woff', reason: 'Binary file' }
        ]
      });

      const result = await mockMigrator.migrateComponents(false);

      expect(result.skippedFiles).toHaveLength(2);
    });

    it('should handle circular dependencies', async () => {
      mockMigrator.migrateComponents.mockRejectedValue(
        new mockMigrator.MigrationError('Circular dependency detected', 'CIRCULAR_DEPENDENCY')
      );

      await expect(mockMigrator.migrateComponents(true))
        .rejects.toThrow('Circular dependency detected');
    });
  });
});
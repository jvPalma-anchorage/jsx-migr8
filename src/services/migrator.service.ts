/**
 * Migrator service implementation
 */

import { IMigratorService, IFileService, IASTService, ILoggerService, IConfigurationService, IBackupService } from '../di/types';
import { makeDiff } from '../utils/diff';
import { getCompName } from '../utils/pathUtils';
import { applyRemapRule } from '../remap/utils/rules';
import { prepareReportToMigrate } from '../migrator/utils/prepareReportToMigrate';
import { transformFileIntoOptions } from '../utils/migr8.utils';
import { graphToComponentSummary } from '../compat/usageSummary';
import chalk from 'chalk';

export class MigratorService implements IMigratorService {
  constructor(
    private fileService: IFileService,
    private astService: IASTService,
    private loggerService: ILoggerService,
    private configService: IConfigurationService,
    private backupService: IBackupService
  ) {}

  async initialize(): Promise<void> {
    this.loggerService.debug('Migrator service initialized');
  }

  async dispose(): Promise<void> {
    this.loggerService.debug('Migrator service disposed');
  }

  async migrateComponents(options: { 
    dryRun?: boolean; 
    changeCode?: boolean;
    migr8Spec?: string;
    graph?: any;
  }): Promise<string | void> {
    try {
      const { dryRun = false, changeCode = false, migr8Spec, graph } = options;
      
      if (!graph) {
        this.loggerService.error('No graph provided for migration');
        return '⚠ No graph data available for migration';
      }

      const summary = graphToComponentSummary(graph);
      if (!summary) {
        this.loggerService.warn('No component summary available for migration');
        return '⚠ No component summary available for migration';
      }

      // Get migration rule files
      let migr8RuleFiles: string[];
      try {
        migr8RuleFiles = await this.fileService.findMigr8RuleFiles();
      } catch (error) {
        this.loggerService.error('Failed to load migration rule files:', error);
        return '⚠ Failed to load Migr8 files. Check file permissions and format.';
      }

      if (!migr8RuleFiles || migr8RuleFiles.length === 0) {
        return '⚠ No Migr8 files found to use.\nPlease create one in "🔍  Inspect components"';
      }

      // Prepare migration spec
      const selectedSpec = migr8Spec || migr8RuleFiles[0];
      let migrationMapper: any;
      
      try {
        migrationMapper = prepareReportToMigrate(selectedSpec, summary);
      } catch (error) {
        this.loggerService.error('Failed to prepare migration mapping:', error);
        return '⚠ Failed to prepare migration. Check your migration rules.';
      }

      // Perform migration
      const migrationConfig = this.configService.getMigrationConfig();
      const shouldCreateBackup = !dryRun && changeCode && migrationConfig.createBackup;

      if (shouldCreateBackup) {
        return this.migrateWithBackup(migrationMapper, selectedSpec, changeCode);
      } else {
        return this.migrateWithoutBackup(migrationMapper, selectedSpec, changeCode, dryRun);
      }

    } catch (error) {
      this.loggerService.error('Critical error in migration process:', error);
      throw error;
    }
  }

  async applyRules(filePath: string, rules: any): Promise<{ success: boolean; changes?: any }> {
    try {
      this.loggerService.debug(`Applying rules to ${filePath}`);
      
      const { ast, code } = await this.astService.parseFile(filePath);
      const originalCode = code;

      // Apply transformation rules to AST
      const transformedAST = await this.applyRulesToAST(ast, rules);
      
      // Generate new code
      const newCode = this.astService.printAST(transformedAST);
      
      // Check if there are actual changes
      if (originalCode === newCode) {
        return { success: true, changes: null };
      }

      return {
        success: true,
        changes: {
          originalCode,
          newCode,
          diff: this.generateDiff(originalCode, newCode, filePath),
          ast: transformedAST,
        },
      };

    } catch (error) {
      this.loggerService.error(`Failed to apply rules to ${filePath}:`, error);
      return { success: false };
    }
  }

  generateDiff(oldCode: string, newCode: string, filePath: string): string {
    try {
      return makeDiff(filePath, oldCode, newCode, 2);
    } catch (error) {
      this.loggerService.warn(`Failed to generate diff for ${filePath}:`, error);
      return `Diff generation failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // Batch migration methods
  async migrateMultipleFiles(
    files: Array<{ path: string; rules: any }>,
    options: { dryRun?: boolean; createBackup?: boolean }
  ): Promise<{
    successful: Array<{ path: string; changes?: any }>;
    failed: Array<{ path: string; error: Error }>;
    summary: {
      totalFiles: number;
      successfulFiles: number;
      failedFiles: number;
      filesWithChanges: number;
    };
  }> {
    this.loggerService.migrationStart('batch', files.length);

    const successful: Array<{ path: string; changes?: any }> = [];
    const failed: Array<{ path: string; error: Error }> = [];
    let filesWithChanges = 0;

    // Create backup if requested
    if (options.createBackup && !options.dryRun) {
      try {
        const backupId = await this.backupService.createBackup({
          name: `batch-migration-${Date.now()}`,
          files: files.map(f => f.path),
          reason: 'batch migration',
        });
        this.loggerService.backup(`Created backup: ${backupId}`);
      } catch (error) {
        this.loggerService.warn('Failed to create backup:', error);
      }
    }

    // Process files
    for (const file of files) {
      try {
        const result = await this.applyRules(file.path, file.rules);
        
        if (result.success) {
          if (result.changes) {
            filesWithChanges++;
            
            if (!options.dryRun) {
              // Write the changes
              await this.fileService.writeFile(file.path, result.changes.newCode);
              this.loggerService.fileOperation('migrated', file.path, true);
            } else {
              // Show diff for dry run
              this.loggerService.info(`\n${result.changes.diff}`);
            }
          }
          
          successful.push({ path: file.path, changes: result.changes });
        } else {
          failed.push({ path: file.path, error: new Error('Rule application failed') });
        }

      } catch (error) {
        failed.push({
          path: file.path,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    const summary = {
      totalFiles: files.length,
      successfulFiles: successful.length,
      failedFiles: failed.length,
      filesWithChanges,
    };

    this.loggerService.migrationComplete('batch', summary.successfulFiles, summary.failedFiles);
    
    return { successful, failed, summary };
  }

  // Private implementation methods
  private async migrateWithBackup(migrationMapper: any, migr8Spec: string, changeCode: boolean): Promise<string | void> {
    try {
      // Enhanced migration with backup integration
      const backupId = await this.backupService.createBackup({
        name: `migration-${Date.now()}`,
        files: Object.keys(migrationMapper),
        reason: 'code migration',
        metadata: { migr8Spec },
      });

      this.loggerService.backup(`Created backup: ${backupId}`);
      
      // Perform migration
      const result = await this.performMigration(migrationMapper, migr8Spec, changeCode);
      
      this.loggerService.success('Migration completed with backup');
      return result;

    } catch (error) {
      this.loggerService.warn('Backup integration failed, falling back to standard migration:', error);
      return this.migrateWithoutBackup(migrationMapper, migr8Spec, changeCode, false);
    }
  }

  private async migrateWithoutBackup(
    migrationMapper: any, 
    migr8Spec: string, 
    changeCode: boolean, 
    dryRun: boolean
  ): Promise<string | void> {
    return this.performMigration(migrationMapper, migr8Spec, changeCode, dryRun);
  }

  private async performMigration(
    migrationMapper: any,
    migr8Spec: string,
    changeCode: boolean,
    dryRun?: boolean
  ): Promise<string | void> {
    const successMigrated: string[] = [];
    const couldMigrate: string[] = [];
    const migrationErrors: string[] = [];

    const entries = Object.entries(migrationMapper);
    
    for (const [fileAbsPath, fileCompleteData] of entries) {
      try {
        const changed = applyRemapRule(changeCode, [fileAbsPath, fileCompleteData], migr8Spec);
        if (!changed) {
          continue;
        }

        const { codeCompare, elements, importNode } = fileCompleteData as any;

        const locName = getCompName(
          importNode.local,
          importNode.imported,
          importNode.importedType
        );

        const oldCode = codeCompare?.old || 'N/A';
        let newCode: string;

        try {
          newCode = this.astService.printAST(codeCompare.ast);
        } catch (error) {
          this.loggerService.error(`Failed to print AST for ${fileAbsPath}:`, error);
          migrationErrors.push(`Print AST failed: ${fileAbsPath}`);
          continue;
        }

        if (changeCode && !dryRun) {
          try {
            await this.fileService.writeFile(fileAbsPath, newCode);
            successMigrated.push(
              `migrated (${chalk.yellow(elements.length)}) ${chalk.yellow(locName)} in ${chalk.yellow(fileAbsPath)}`
            );
          } catch (error) {
            this.loggerService.error(`Failed to write file ${fileAbsPath}:`, error);
            migrationErrors.push(`Write failed: ${fileAbsPath}`);
          }
        } else {
          couldMigrate.push(
            `would migrate ${chalk.yellow(locName)} in ${chalk.yellow(fileAbsPath)}`
          );

          try {
            const diff = this.generateDiff(oldCode, newCode, fileAbsPath);
            console.info('🎉', diff);
          } catch (error) {
            this.loggerService.warn(`Failed to generate diff for ${fileAbsPath}:`, error);
          }
        }
      } catch (error) {
        this.loggerService.error(`Migration failed for ${fileAbsPath}:`, error);
        migrationErrors.push(`Migration failed: ${fileAbsPath}`);
      }
    }

    // Report results
    if (migrationErrors.length > 0) {
      this.loggerService.warn(
        `Migration completed with ${migrationErrors.length} errors. Some files may not have been processed.`
      );
    }

    if (!changeCode || dryRun) {
      couldMigrate.forEach((msg) => {
        const parts = msg.split(' migrate');
        this.loggerService.success(parts[0] + ' migrate', parts[1]);
      });
    }

    if (changeCode && !dryRun) {
      successMigrated.forEach((msg) => {
        const parts = msg.split(' (');
        this.loggerService.success(parts[0], ' (' + parts[1]);
      });
    }

    return undefined;
  }

  private async applyRulesToAST(ast: any, rules: any): Promise<any> {
    // Clone the AST to avoid modifying the original
    const clonedAST = this.astService.cloneNode(ast);
    
    // Apply transformation rules
    // This is a simplified version - in practice, you'd implement
    // the full rule application logic here
    const transformers = this.buildTransformers(rules);
    
    return this.astService.transformAST(clonedAST, transformers);
  }

  private buildTransformers(rules: any): Array<{ name: string; visitor: any }> {
    const transformers: Array<{ name: string; visitor: any }> = [];

    // Import transformers
    if (rules.importFrom && rules.importTo) {
      transformers.push({
        name: 'import-transformer',
        visitor: this.createImportTransformer(rules.importFrom, rules.importTo),
      });
    }

    // Rename transformers
    if (rules.rename && Object.keys(rules.rename).length > 0) {
      transformers.push({
        name: 'rename-transformer',
        visitor: this.createRenameTransformer(rules.rename),
      });
    }

    // Remove transformers
    if (rules.remove && rules.remove.length > 0) {
      transformers.push({
        name: 'remove-transformer',
        visitor: this.createRemoveTransformer(rules.remove),
      });
    }

    // Set transformers
    if (rules.set && Object.keys(rules.set).length > 0) {
      transformers.push({
        name: 'set-transformer',
        visitor: this.createSetTransformer(rules.set),
      });
    }

    return transformers;
  }

  private createImportTransformer(fromPackage: string, toPackage: string): any {
    return {
      visitImportDeclaration: (path: any) => {
        const node = path.node;
        if (node.source.value === fromPackage) {
          node.source.value = toPackage;
        }
        return false;
      },
    };
  }

  private createRenameTransformer(renameMap: Record<string, string>): any {
    return {
      visitJSXAttribute: (path: any) => {
        const node = path.node;
        if (node.name && node.name.name in renameMap) {
          node.name.name = renameMap[node.name.name];
        }
        return false;
      },
    };
  }

  private createRemoveTransformer(propsToRemove: string[]): any {
    return {
      visitJSXOpeningElement: (path: any) => {
        const node = path.node;
        if (node.attributes) {
          node.attributes = node.attributes.filter((attr: any) => {
            return !attr.name || !propsToRemove.includes(attr.name.name);
          });
        }
        return false;
      },
    };
  }

  private createSetTransformer(propsToSet: Record<string, any>): any {
    return {
      visitJSXOpeningElement: (path: any) => {
        const node = path.node;
        if (!node.attributes) {
          node.attributes = [];
        }

        // Add or update properties
        Object.entries(propsToSet).forEach(([propName, propValue]) => {
          const existingAttr = node.attributes.find((attr: any) => 
            attr.name && attr.name.name === propName
          );

          if (existingAttr) {
            // Update existing attribute
            existingAttr.value = this.createJSXAttributeValue(propValue);
          } else {
            // Add new attribute
            node.attributes.push(this.createJSXAttribute(propName, propValue));
          }
        });

        return false;
      },
    };
  }

  private createJSXAttribute(name: string, value: any): any {
    const builders = require('ast-types').builders;
    return builders.jsxAttribute(
      builders.jsxIdentifier(name),
      this.createJSXAttributeValue(value)
    );
  }

  private createJSXAttributeValue(value: any): any {
    const builders = require('ast-types').builders;
    
    if (typeof value === 'string') {
      return builders.literal(value);
    } else if (typeof value === 'boolean') {
      return value ? null : builders.jsxExpressionContainer(builders.literal(false));
    } else if (typeof value === 'number') {
      return builders.jsxExpressionContainer(builders.literal(value));
    } else {
      return builders.jsxExpressionContainer(builders.literal(String(value)));
    }
  }

  // Validation and analysis methods
  async validateMigrationRules(rules: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate required fields
    if (!rules.match && !rules.importFrom) {
      errors.push('Rules must specify either "match" criteria or "importFrom" package');
    }

    // Validate rename rules
    if (rules.rename && typeof rules.rename !== 'object') {
      errors.push('Rename rules must be an object mapping old names to new names');
    }

    // Validate remove rules
    if (rules.remove && !Array.isArray(rules.remove)) {
      errors.push('Remove rules must be an array of property names');
    }

    // Validate set rules
    if (rules.set && typeof rules.set !== 'object') {
      errors.push('Set rules must be an object mapping property names to values');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async estimateMigrationImpact(migrationMapper: any): Promise<{
    totalFiles: number;
    totalElements: number;
    packageBreakdown: Record<string, number>;
    componentBreakdown: Record<string, number>;
  }> {
    const totalFiles = Object.keys(migrationMapper).length;
    let totalElements = 0;
    const packageBreakdown: Record<string, number> = {};
    const componentBreakdown: Record<string, number> = {};

    Object.values(migrationMapper).forEach((fileData: any) => {
      const elements = fileData.elements || [];
      totalElements += elements.length;

      elements.forEach((element: any) => {
        const packageName = element.importRef?.pkg || 'unknown';
        const componentName = element.componentName || 'unknown';

        packageBreakdown[packageName] = (packageBreakdown[packageName] || 0) + 1;
        componentBreakdown[componentName] = (componentBreakdown[componentName] || 0) + 1;
      });
    });

    return {
      totalFiles,
      totalElements,
      packageBreakdown,
      componentBreakdown,
    };
  }
}
import { print, visit } from "recast";
import { 
  FileTransformation, 
  FileTransformationInput, 
  ComponentTransformation, 
  ImportChange, 
  PropChange, 
  AppliedRule,
  FileMigrationConfig,
  FileMigrationResult
} from "./file-transformation-types";
import { FileImpactAnalyzer } from "./utils/file-impact-analyzer";
import { EnhancedDiffGenerator } from "./utils/enhanced-diff";
import { getRuleMatch } from "@/remap/utils/rules/ruleMatch";
import { propRemove } from "@/remap/utils/rules/propRemove";
import { propSet } from "@/remap/utils/rules/propSet";
import { handleReplaceWithJsx } from "@/remap/utils/rules/replaceWithJsx";
import { RemapRule } from "@/remap/base-remapper";
import { lWarning, lError, lSuccess } from "@/context/globalContext";
import { default as chalk } from "chalk";

/**
 * Helper to check if a value is a TODO placeholder
 */
function isTodoPlaceholder(value: string | undefined): boolean {
  return !value || value.startsWith('TODO:') || value === 'TODO';
}

/**
 * File-centric migration processor that applies all applicable rules to a single file
 * and tracks comprehensive transformation information
 */
export class FileMigrationProcessor {
  private config: FileMigrationConfig;

  constructor(config: FileMigrationConfig = {}) {
    this.config = {
      showProgress: false,
      includeStats: true,
      includeLineNumbers: true,
      generateDiffs: true,
      validateSyntax: true,
      preserveFormatting: true,
      contextLines: 3,
      ...config
    };
  }

  /**
   * Processes multiple files using the file-by-file approach
   */
  async processFiles(fileInputs: FileTransformationInput[]): Promise<FileMigrationResult> {
    const startTime = Date.now();
    const fileTransformations: FileTransformation[] = [];
    const errors: FileMigrationResult['errors'] = [];

    let successfulFiles = 0;
    let failedFiles = 0;

    for (let i = 0; i < fileInputs.length; i++) {
      const fileInput = fileInputs[i];
      
      if (this.config.showProgress) {
        console.log(chalk.blue(`Processing ${i + 1}/${fileInputs.length}: ${fileInput.filePath}`));
      }

      try {
        const fileTransformation = await this.processFile(fileInput);
        fileTransformations.push(fileTransformation);
        
        if (fileTransformation.success) {
          successfulFiles++;
        } else {
          failedFiles++;
        }
      } catch (error) {
        failedFiles++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          filePath: fileInput.filePath,
          error: errorMessage,
          type: 'transformation'
        });
        lError(`Failed to process file ${fileInput.filePath}:`, error as any);
      }
    }

    const totalProcessingTime = Date.now() - startTime;

    // Calculate total stats
    const totalStats = this.calculateTotalStats(fileTransformations);

    const result: FileMigrationResult = {
      fileTransformations,
      totalStats,
      summary: {
        totalFiles: fileInputs.length,
        successfulFiles,
        failedFiles,
        totalProcessingTime
      },
      errors
    };

    return result;
  }

  /**
   * Processes a single file and applies all applicable rules
   */
  async processFile(fileInput: FileTransformationInput): Promise<FileTransformation> {
    const startTime = Date.now();
    
    const fileTransformation: FileTransformation = {
      filePath: fileInput.filePath,
      originalCode: fileInput.originalCode,
      transformedCode: fileInput.originalCode, // Will be updated
      ast: fileInput.ast,
      componentTransformations: [],
      importChanges: [],
      appliedRules: [],
      stats: {
        totalComponents: 0,
        componentsChanged: 0,
        totalPropsModified: 0,
        propsAdded: 0,
        propsRemoved: 0,
        propsRenamed: 0,
        importsAdded: 0,
        importsRemoved: 0,
        importsModified: 0,
        rulesApplied: 0,
        linesChanged: 0,
        charactersChanged: 0
      },
      processingTime: 0,
      success: false,
      errors: [],
      warnings: []
    };

    try {
      // Process each component in the file
      for (const component of fileInput.components) {
        await this.processComponent(component, fileInput, fileTransformation);
      }

      // Generate transformed code
      try {
        fileTransformation.transformedCode = print(fileTransformation.ast).code;
      } catch (error) {
        const errorMessage = `Failed to generate transformed code: ${error instanceof Error ? error.message : 'Unknown error'}`;
        fileTransformation.errors.push(errorMessage);
        lError(errorMessage, error as any);
      }

      // Calculate statistics
      fileTransformation.stats = FileImpactAnalyzer.calculateFileStats(
        fileTransformation.originalCode,
        fileTransformation.transformedCode,
        fileTransformation.componentTransformations,
        fileTransformation.importChanges,
        fileTransformation.appliedRules
      );

      // Validate syntax if requested
      if (this.config.validateSyntax) {
        try {
          // Basic syntax check by attempting to parse
          const recast = await import('recast');
          recast.parse(fileTransformation.transformedCode);
        } catch (error) {
          const errorMessage = `Syntax validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          fileTransformation.errors.push(errorMessage);
          fileTransformation.warnings.push("Generated code may have syntax errors");
        }
      }

      fileTransformation.success = fileTransformation.errors.length === 0;
      fileTransformation.processingTime = Date.now() - startTime;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fileTransformation.errors.push(`File processing failed: ${errorMessage}`);
      fileTransformation.success = false;
      fileTransformation.processingTime = Date.now() - startTime;
    }

    return fileTransformation;
  }

  /**
   * Processes a single component within a file
   */
  private async processComponent(
    component: FileTransformationInput['components'][0],
    fileInput: FileTransformationInput,
    fileTransformation: FileTransformation
  ): Promise<void> {
    const { componentName, packageName, elements } = component;
    
    const componentTransformation: ComponentTransformation = {
      componentName,
      packageName,
      elementId: `${packageName}.${componentName}`,
      propChanges: [],
      appliedRules: []
    };

    // Find migration rules for this component
    const migr8Spec = fileInput.migr8Spec;
    const spec = migr8Spec.migr8rules.find(
      (r) => r.package === packageName && r.component === componentName
    );

    if (!spec) {
      // This is expected - not all components will have migration rules
      return;
    }

    const migr8rules = spec.rules;
    let mutated = false;

    // Process each JSX element of this component
    if (!elements || elements.length === 0) {
      // No JSX elements to process, but we might still handle import-level transformations
      return;
    }
    
    elements.forEach((elem) => {
      const rule = getRuleMatch(migr8rules, elem.props);
      if (!rule) {
        // No matching rule for this element - this is normal
        return;
      }

      const opener = elem.opener.node.openingElement;

      // Handle replaceWith rule - check if migration spec has importTo configuration
      // This indicates a component replacement rather than prop modification
      if (spec.importTo && spec.importTo.component) {
        // Check if this is a valid component replacement (not just TODO placeholder)
        const isValidReplacement = !isTodoPlaceholder(spec.importTo.component) && 
                                  !isTodoPlaceholder(spec.importTo.importStm);
        
        if (isValidReplacement) {
          // Handle component replacement
          try {
            mutated = true;
            // TODO: Implement actual component replacement logic here
            // For now, we'll just track that a replacement should happen
            
            const propChange: PropChange = {
              type: 'replaceComponent',
              propName: '__component__',
              oldValue: componentName,
              newValue: spec.importTo.component,
              lineNumber: elem.jsxPath.line
            };

            componentTransformation.propChanges.push(propChange);

            const appliedRule: AppliedRule = {
              ruleType: 'replaceWith',
              description: `Replace component ${componentName} with ${spec.importTo.component}`,
              matchedProps: elem.props,
              appliedChanges: [propChange]
            };

            componentTransformation.appliedRules.push(appliedRule);
            fileTransformation.appliedRules.push(appliedRule);
          } catch (error) {
            fileTransformation.warnings.push(`Component replacement for ${componentName} will be processed with prop changes`);
          }
        } else {
          // Log as info instead of warning - TODO placeholders are expected during rule generation
          lWarning(`Component ${componentName} has placeholder replacement target - will process prop changes only`);
        }
      }

      // Handle remove props
      if (rule.remove && rule.remove.length > 0) {
        rule.remove.forEach((propToRemove) => {
          try {
            mutated = true;
            propRemove(opener, propToRemove);

            const propChange: PropChange = {
              type: 'remove',
              propName: propToRemove,
              oldValue: elem.props[propToRemove],
              lineNumber: elem.jsxPath.line
            };

            componentTransformation.propChanges.push(propChange);

            const appliedRule: AppliedRule = {
              ruleType: 'propRemove',
              description: `Remove prop '${propToRemove}' from ${componentName}`,
              matchedProps: elem.props,
              appliedChanges: [propChange]
            };

            componentTransformation.appliedRules.push(appliedRule);
            fileTransformation.appliedRules.push(appliedRule);

          } catch (error) {
            fileTransformation.errors.push(`Failed to remove prop ${propToRemove}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });
      }

      // Handle rename props
      if (rule.rename && Object.entries(rule.rename).length > 0) {
        Object.entries(rule.rename).forEach(([from, to]) => {
          const val = elem.props[from];
          if (val !== undefined) {
            try {
              mutated = true;
              propRemove(opener, from);
              propSet(opener, to, val);

              const propChange: PropChange = {
                type: 'rename',
                propName: from,
                newPropName: to,
                oldValue: val,
                newValue: val,
                lineNumber: elem.jsxPath.line
              };

              componentTransformation.propChanges.push(propChange);

              const appliedRule: AppliedRule = {
                ruleType: 'propRename',
                description: `Rename prop '${from}' to '${to}' in ${componentName}`,
                matchedProps: elem.props,
                appliedChanges: [propChange]
              };

              componentTransformation.appliedRules.push(appliedRule);
              fileTransformation.appliedRules.push(appliedRule);

            } catch (error) {
              fileTransformation.errors.push(`Failed to rename prop ${from} to ${to}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        });
      }

      // Handle set props
      if (rule.set && Object.entries(rule.set).length > 0) {
        Object.entries(rule.set).forEach(([k, v]) => {
          try {
            mutated = true;
            propSet(opener, k, v);

            const propChange: PropChange = {
              type: 'add',
              propName: k,
              newValue: v,
              lineNumber: elem.jsxPath.line
            };

            componentTransformation.propChanges.push(propChange);

            const appliedRule: AppliedRule = {
              ruleType: 'propSet',
              description: `Set prop '${k}' to '${v}' in ${componentName}`,
              matchedProps: elem.props,
              appliedChanges: [propChange]
            };

            componentTransformation.appliedRules.push(appliedRule);
            fileTransformation.appliedRules.push(appliedRule);

          } catch (error) {
            fileTransformation.errors.push(`Failed to set prop ${k}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });
      }
    });

    // Add component transformation if it had changes or applied rules
    if (mutated || componentTransformation.appliedRules.length > 0) {
      fileTransformation.componentTransformations.push(componentTransformation);
      fileTransformation.stats.totalComponents++;
      if (mutated) {
        fileTransformation.stats.componentsChanged++;
      }
    }

    // Handle import changes (simplified for now)
    // This would need to be expanded based on the specific import transformation rules
    // For now, we'll track that changes occurred
    if (mutated) {
      // This is a placeholder - actual import changes would be determined by the rules
      // and would require more sophisticated tracking
    }
  }

  /**
   * Calculates total statistics across all file transformations
   */
  private calculateTotalStats(fileTransformations: FileTransformation[]): FileTransformation['stats'] {
    const totalStats: FileTransformation['stats'] = {
      totalComponents: 0,
      componentsChanged: 0,
      totalPropsModified: 0,
      propsAdded: 0,
      propsRemoved: 0,
      propsRenamed: 0,
      importsAdded: 0,
      importsRemoved: 0,
      importsModified: 0,
      rulesApplied: 0,
      linesChanged: 0,
      charactersChanged: 0
    };

    fileTransformations.forEach(fileTransform => {
      const stats = fileTransform.stats;
      totalStats.totalComponents += stats.totalComponents;
      totalStats.componentsChanged += stats.componentsChanged;
      totalStats.totalPropsModified += stats.totalPropsModified;
      totalStats.propsAdded += stats.propsAdded;
      totalStats.propsRemoved += stats.propsRemoved;
      totalStats.propsRenamed += stats.propsRenamed;
      totalStats.importsAdded += stats.importsAdded;
      totalStats.importsRemoved += stats.importsRemoved;
      totalStats.importsModified += stats.importsModified;
      totalStats.rulesApplied += stats.rulesApplied;
      totalStats.linesChanged += stats.linesChanged;
      totalStats.charactersChanged += stats.charactersChanged;
    });

    return totalStats;
  }

  /**
   * Generates a comprehensive report for file migrations
   */
  generateReport(result: FileMigrationResult): string {
    const lines: string[] = [];
    
    lines.push(chalk.bold.cyan("\n🔄 File-by-File Migration Report"));
    lines.push(chalk.cyan("=" .repeat(50)));
    lines.push("");

    // Summary
    lines.push(chalk.bold("📊 Summary:"));
    lines.push(`  • Total files processed: ${result.summary.totalFiles}`);
    lines.push(`  • Successful migrations: ${chalk.green(result.summary.successfulFiles)}`);
    lines.push(`  • Failed migrations: ${chalk.red(result.summary.failedFiles)}`);
    lines.push(`  • Total processing time: ${(result.summary.totalProcessingTime / 1000).toFixed(2)}s`);
    lines.push("");

    // Total statistics
    const stats = result.totalStats;
    lines.push(chalk.bold("📈 Total Changes:"));
    lines.push(`  • Components processed: ${stats.totalComponents}`);
    lines.push(`  • Components changed: ${stats.componentsChanged}`);
    lines.push(`  • Props modified: ${stats.totalPropsModified} (+${stats.propsAdded} -${stats.propsRemoved} ~${stats.propsRenamed})`);
    lines.push(`  • Imports modified: ${stats.importsAdded + stats.importsRemoved + stats.importsModified}`);
    lines.push(`  • Rules applied: ${stats.rulesApplied}`);
    lines.push(`  • Lines changed: ${stats.linesChanged}`);
    lines.push("");

    // File-by-file details (showing top changed files)
    const sortedFiles = result.fileTransformations
      .filter(f => f.stats.totalPropsModified > 0 || f.componentTransformations.length > 0)
      .sort((a, b) => b.stats.totalPropsModified - a.stats.totalPropsModified)
      .slice(0, 5);

    if (sortedFiles.length > 0) {
      lines.push(chalk.bold("🏆 Top Changed Files:"));
      sortedFiles.forEach((fileTransform, index) => {
        const complexity = FileImpactAnalyzer.analyzeTransformationComplexity(fileTransform).complexity;
        const complexityColor = complexity === 'high' ? chalk.red : 
                               complexity === 'medium' ? chalk.yellow : chalk.green;
        
        lines.push(`  ${index + 1}. ${chalk.yellowBright(fileTransform.filePath)}`);
        lines.push(`     ${fileTransform.stats.componentsChanged} components, ${fileTransform.stats.totalPropsModified} props, ${complexityColor(complexity)} complexity`);
      });
      lines.push("");
    }

    // Errors
    if (result.errors.length > 0) {
      lines.push(chalk.bold.red("❌ Errors:"));
      result.errors.slice(0, 5).forEach((error) => {
        lines.push(chalk.red(`  • ${error.filePath}: ${error.error}`));
      });
      if (result.errors.length > 5) {
        lines.push(chalk.red(`  ... and ${result.errors.length - 5} more errors`));
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Displays diff for a single file transformation
   */
  displayFileDiff(fileTransformation: FileTransformation): void {
    if (this.config.generateDiffs) {
      // Generate enhanced diff
      const enhancedDiff = EnhancedDiffGenerator.generateEnhancedDiff(fileTransformation, this.config.contextLines);
      const formattedDiff = EnhancedDiffGenerator.formatEnhancedDiff(enhancedDiff, this.config.includeLineNumbers);
      console.log(formattedDiff);

      // Generate transformation summary
      if (this.config.includeStats) {
        const summary = EnhancedDiffGenerator.generateTransformationSummary(fileTransformation);
        console.log(summary);
      }
    } else {
      // Simple compact diff
      const compactDiff = EnhancedDiffGenerator.generateCompactDiff(fileTransformation);
      console.log(compactDiff);
    }
  }
}
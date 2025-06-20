import { default as chalk } from "chalk";
import { structuredPatch, Change } from "diff";
import { FileTransformation, EnhancedDiff, ComponentTransformation, ImportChange } from "../file-transformation-types";
import { stripBlankMoves } from "@/utils/diff";

/**
 * Enhanced diff generator that provides comprehensive before/after transformations
 * with line numbers, context, and change tracking
 */
export class EnhancedDiffGenerator {
  
  /**
   * Generates an enhanced diff for a file transformation
   */
  static generateEnhancedDiff(
    fileTransformation: FileTransformation,
    contextLines: number = 3
  ): EnhancedDiff {
    const { filePath, originalCode, transformedCode } = fileTransformation;
    
    const patch = structuredPatch(
      filePath,
      filePath,
      originalCode,
      transformedCode,
      "",
      "",
      { context: contextLines }
    );

    const enhancedDiff: EnhancedDiff = {
      filePath,
      hunks: [],
      stats: {
        linesAdded: 0,
        linesRemoved: 0,
        linesModified: 0,
        totalChanges: 0
      }
    };

    patch.hunks.forEach((hunk) => {
      const enhancedHunk = {
        oldStart: hunk.oldStart,
        oldLines: hunk.oldLines,
        newStart: hunk.newStart,
        newLines: hunk.newLines,
        changes: [] as EnhancedDiff['hunks'][0]['changes']
      };

      let currentLineNumber = hunk.oldStart;
      
      hunk.lines.forEach((line) => {
        const type = line.startsWith('+') ? 'add' : 
                    line.startsWith('-') ? 'remove' : 'context';
        
        const content = line.slice(1); // Remove +/- prefix
        
        // Try to identify what type of change this is
        const relatedChange = this.identifyChangeType(
          content, 
          fileTransformation.componentTransformations,
          fileTransformation.importChanges
        );

        enhancedHunk.changes.push({
          type,
          lineNumber: currentLineNumber,
          content,
          relatedChange
        });

        // Update stats
        if (type === 'add') {
          enhancedDiff.stats.linesAdded++;
          enhancedDiff.stats.totalChanges++;
        } else if (type === 'remove') {
          enhancedDiff.stats.linesRemoved++;
          enhancedDiff.stats.totalChanges++;
        }

        // Update line number (only for context and removed lines)
        if (type !== 'add') {
          currentLineNumber++;
        }
      });

      enhancedDiff.hunks.push(enhancedHunk);
    });

    // Calculate modified lines (lines that were both added and removed)
    enhancedDiff.stats.linesModified = Math.min(
      enhancedDiff.stats.linesAdded, 
      enhancedDiff.stats.linesRemoved
    );

    return enhancedDiff;
  }

  /**
   * Identifies what type of change a line represents
   */
  private static identifyChangeType(
    content: string,
    componentTransformations: ComponentTransformation[],
    importChanges: ImportChange[]
  ): EnhancedDiff['hunks'][0]['changes'][0]['relatedChange'] {
    
    // Check for import changes
    if (content.trim().startsWith('import')) {
      const importChange = importChanges.find(change => 
        content.includes(change.packageName) || 
        (change.componentName && content.includes(change.componentName))
      );
      
      if (importChange) {
        return {
          type: 'import',
          description: this.getImportChangeDescription(importChange)
        };
      }
    }

    // Check for component/prop changes
    for (const compTransform of componentTransformations) {
      // Check if line contains the component name
      if (content.includes(`<${compTransform.componentName}`) || 
          content.includes(`</${compTransform.componentName}>`)) {
        
        // Check for specific prop changes
        for (const propChange of compTransform.propChanges) {
          if (content.includes(propChange.propName) || 
              (propChange.newPropName && content.includes(propChange.newPropName))) {
            return {
              type: 'prop',
              description: this.getPropChangeDescription(propChange, compTransform.componentName)
            };
          }
        }
        
        // General component change
        return {
          type: 'component',
          description: `${compTransform.componentName} component modification`
        };
      }
    }

    return undefined;
  }

  /**
   * Gets a human-readable description for an import change
   */
  private static getImportChangeDescription(importChange: ImportChange): string {
    switch (importChange.type) {
      case 'add':
        return `Added import of ${importChange.componentName || 'components'} from ${importChange.packageName}`;
      case 'remove':
        return `Removed import from ${importChange.packageName}`;
      case 'modify':
        return `Modified import: ${importChange.oldPackage} → ${importChange.packageName}`;
      default:
        return `Import change in ${importChange.packageName}`;
    }
  }

  /**
   * Gets a human-readable description for a prop change
   */
  private static getPropChangeDescription(propChange: any, componentName: string): string {
    switch (propChange.type) {
      case 'add':
        return `Added prop '${propChange.propName}' to ${componentName}`;
      case 'remove':
        return `Removed prop '${propChange.propName}' from ${componentName}`;
      case 'rename':
        return `Renamed prop '${propChange.propName}' to '${propChange.newPropName}' in ${componentName}`;
      case 'modify':
        return `Modified prop '${propChange.propName}' in ${componentName}`;
      default:
        return `Prop change in ${componentName}`;
    }
  }

  /**
   * Formats the enhanced diff for console output
   */
  static formatEnhancedDiff(enhancedDiff: EnhancedDiff, includeLineNumbers: boolean = true): string {
    const lines: string[] = [];
    
    // File header
    lines.push(chalk.yellowBright(`\n📄 ${enhancedDiff.filePath}`));
    lines.push(chalk.gray(`Stats: +${enhancedDiff.stats.linesAdded} -${enhancedDiff.stats.linesRemoved} ~${enhancedDiff.stats.linesModified} (${enhancedDiff.stats.totalChanges} changes)`));
    lines.push("");

    enhancedDiff.hunks.forEach((hunk, hunkIndex) => {
      // Hunk header
      lines.push(
        chalk.cyan(
          `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`
        )
      );

      hunk.changes.forEach((change) => {
        let line = "";
        
        // Add line number if requested
        if (includeLineNumbers && change.type !== 'add') {
          line += chalk.gray(`${change.lineNumber.toString().padStart(4)}: `);
        } else if (includeLineNumbers) {
          line += "     "; // Spacing for added lines
        }

        // Add change indicator and content
        if (change.type === 'add') {
          line += chalk.green(`+${change.content}`);
        } else if (change.type === 'remove') {
          line += chalk.red(`-${change.content}`);
        } else {
          line += chalk.dim(` ${change.content}`);
        }

        // Add change description if available
        if (change.relatedChange) {
          line += chalk.yellow(` // ${change.relatedChange.description}`);
        }

        lines.push(line);
      });

      // Add spacing between hunks
      if (hunkIndex < enhancedDiff.hunks.length - 1) {
        lines.push("");
      }
    });

    return lines.join("\n") + "\n";
  }

  /**
   * Generates a comprehensive file transformation summary
   */
  static generateTransformationSummary(fileTransformation: FileTransformation): string {
    const lines: string[] = [];
    const { filePath, stats, componentTransformations, importChanges, appliedRules } = fileTransformation;

    lines.push(chalk.bold.yellowBright(`\n🔄 File Transformation Summary`));
    lines.push(chalk.yellowBright(`📄 ${filePath}`));
    lines.push("");

    // Statistics
    lines.push(chalk.bold("📊 Statistics:"));
    lines.push(`  • Components processed: ${stats.totalComponents}`);
    lines.push(`  • Components changed: ${stats.componentsChanged}`);
    lines.push(`  • Props modified: ${stats.totalPropsModified} (+${stats.propsAdded} -${stats.propsRemoved} ~${stats.propsRenamed})`);
    lines.push(`  • Imports modified: ${stats.importsAdded + stats.importsRemoved + stats.importsModified} (+${stats.importsAdded} -${stats.importsRemoved} ~${stats.importsModified})`);
    lines.push(`  • Rules applied: ${stats.rulesApplied}`);
    lines.push(`  • Lines changed: ${stats.linesChanged}`);
    lines.push(`  • Processing time: ${(fileTransformation.processingTime / 1000).toFixed(2)}s`);
    lines.push("");

    // Import changes
    if (importChanges.length > 0) {
      lines.push(chalk.bold("📦 Import Changes:"));
      importChanges.forEach((importChange) => {
        const icon = importChange.type === 'add' ? '➕' : importChange.type === 'remove' ? '➖' : '🔄';
        lines.push(`  ${icon} ${this.getImportChangeDescription(importChange)}`);
      });
      lines.push("");
    }

    // Component transformations
    if (componentTransformations.length > 0) {
      lines.push(chalk.bold("🧩 Component Transformations:"));
      componentTransformations.forEach((compTransform) => {
        lines.push(`  🔧 ${compTransform.componentName} (${compTransform.packageName})`);
        
        if (compTransform.replacement) {
          lines.push(`    🔄 Replaced with: ${compTransform.replacement.newComponentName}`);
        }
        
        if (compTransform.propChanges.length > 0) {
          lines.push(`    📝 Props: ${compTransform.propChanges.length} changes`);
          compTransform.propChanges.forEach((propChange) => {
            const icon = propChange.type === 'add' ? '➕' : 
                        propChange.type === 'remove' ? '➖' : 
                        propChange.type === 'rename' ? '🔄' : '✏️';
            lines.push(`      ${icon} ${this.getPropChangeDescription(propChange, compTransform.componentName)}`);
          });
        }
        
        if (compTransform.appliedRules.length > 0) {
          lines.push(`    📋 Applied rules: ${compTransform.appliedRules.map(r => r.ruleType).join(', ')}`);
        }
      });
      lines.push("");
    }

    // Applied rules summary
    if (appliedRules.length > 0) {
      lines.push(chalk.bold("📋 Applied Rules:"));
      const ruleTypeCounts = appliedRules.reduce((acc, rule) => {
        acc[rule.ruleType] = (acc[rule.ruleType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(ruleTypeCounts).forEach(([ruleType, count]) => {
        lines.push(`  • ${ruleType}: ${count}`);
      });
      lines.push("");
    }

    // Errors and warnings
    if (fileTransformation.errors.length > 0) {
      lines.push(chalk.bold.red("❌ Errors:"));
      fileTransformation.errors.forEach((error) => {
        lines.push(chalk.red(`  • ${error}`));
      });
      lines.push("");
    }

    if (fileTransformation.warnings.length > 0) {
      lines.push(chalk.bold.yellow("⚠️ Warnings:"));
      fileTransformation.warnings.forEach((warning) => {
        lines.push(chalk.yellow(`  • ${warning}`));
      });
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Generates a compact diff suitable for overview
   */
  static generateCompactDiff(fileTransformation: FileTransformation): string {
    const { filePath, stats } = fileTransformation;
    
    const changeIndicators = [];
    
    if (stats.componentsChanged > 0) {
      changeIndicators.push(`${stats.componentsChanged} components`);
    }
    
    if (stats.totalPropsModified > 0) {
      changeIndicators.push(`${stats.totalPropsModified} props`);
    }
    
    if (stats.importsAdded + stats.importsRemoved + stats.importsModified > 0) {
      changeIndicators.push(`${stats.importsAdded + stats.importsRemoved + stats.importsModified} imports`);
    }

    const changesText = changeIndicators.length > 0 ? 
      ` (${changeIndicators.join(', ')})` : 
      ' (no changes)';

    return `${chalk.yellowBright(filePath)}${chalk.gray(changesText)}`;
  }
}
import chalk from "chalk";
import { RemapRule } from "@/remap/base-remapper";
import { Migr8Rule, Migr8Spec } from "@/report/types";
import { MigrationMapper } from "@/migrator/types";
import { formatFileSize, formatDuration } from "./utils/formatters";
import { calculateProgress, FileProgress, MigrationStats } from "./utils/progress";
import { generateKeyboardShortcuts, generateHelpText } from "./utils/help";

export interface RuleDisplayInfo {
  ruleName: string;
  description: string;
  matchConditions: Record<string, any>[];
  transformations: {
    remove?: string[];
    rename?: Record<string, string>;
    set?: Record<string, any>;
    replaceWith?: {
      code: string;
      innerProps?: string[];
    };
  };
  importChanges: {
    from: {
      package: string;
      component: string;
      type: string;
    };
    to: {
      package: string;
      component: string;
      type: string;
    };
  };
  order: number;
}

export interface FileContextInfo {
  filePath: string;
  fileName: string;
  fileSize: string;
  totalComponents: number;
  transformationsApplied: number;
  dependenciesAffected: string[];
  complexity: 'low' | 'medium' | 'high';
}

export interface ProgressInfo {
  currentFile: {
    index: number;
    total: number;
  };
  currentRule: {
    index: number;
    total: number;
  };
  overallProgress: {
    filesProcessed: number;
    totalFiles: number;
    rulesApplied: number;
    totalRules: number;
    percentage: number;
  };
  estimatedTimeRemaining?: string;
  stats: MigrationStats;
}

export interface InfoPanelOptions {
  showRuleDetails: boolean;
  showFileContext: boolean;
  showProgress: boolean;
  showKeyboardShortcuts: boolean;
  showHelp: boolean;
  compact: boolean;
  maxWidth: number;
}

export class InfoPanel {
  private options: InfoPanelOptions;
  private startTime: number;
  
  constructor(options: Partial<InfoPanelOptions> = {}) {
    this.options = {
      showRuleDetails: true,
      showFileContext: true,
      showProgress: true,
      showKeyboardShortcuts: true,
      showHelp: false,
      compact: false,
      maxWidth: 120,
      ...options
    };
    this.startTime = Date.now();
  }

  /**
   * Generate comprehensive rule information display
   */
  generateRuleInfo(
    rule: RemapRule,
    migr8Rule: Migr8Rule,
    ruleIndex: number,
    totalRules: number
  ): RuleDisplayInfo {
    const transformations: RuleDisplayInfo['transformations'] = {};
    
    if (rule.remove && rule.remove.length > 0) {
      transformations.remove = rule.remove as string[];
    }
    
    if (rule.rename && Object.keys(rule.rename).length > 0) {
      transformations.rename = rule.rename as Record<string, string>;
    }
    
    if (rule.set && Object.keys(rule.set).length > 0) {
      transformations.set = rule.set;
    }
    
    if (rule.replaceWith) {
      transformations.replaceWith = {
        code: rule.replaceWith.code,
        innerProps: rule.replaceWith.INNER_PROPS
      };
    }

    return {
      ruleName: `${migr8Rule.component} Migration Rule #${rule.order}`,
      description: this.generateRuleDescription(rule, migr8Rule),
      matchConditions: rule.match,
      transformations,
      importChanges: {
        from: {
          package: migr8Rule.package,
          component: migr8Rule.component,
          type: migr8Rule.importType
        },
        to: {
          package: migr8Rule.importTo.component !== `TODO:${migr8Rule.importTo.component}` 
            ? migr8Rule.importTo.importStm 
            : migr8Rule.package,
          component: migr8Rule.importTo.component !== `TODO:${migr8Rule.importTo.component}` 
            ? migr8Rule.importTo.component 
            : migr8Rule.component,
          type: migr8Rule.importTo.importType
        }
      },
      order: rule.order
    };
  }

  /**
   * Generate file context information
   */
  generateFileContext(
    filePath: string,
    migrationData: MigrationMapper[string],
    transformationsApplied: number
  ): FileContextInfo {
    const fileName = filePath.split('/').pop() || 'unknown';
    const stats = require('fs').statSync(filePath);
    const fileSize = formatFileSize(stats.size);
    
    // Calculate complexity based on various factors
    const complexity = this.calculateFileComplexity(
      stats.size,
      migrationData.elements.length,
      transformationsApplied
    );

    // Extract dependencies from import information
    const dependenciesAffected = [migrationData.packageName];

    return {
      filePath,
      fileName,
      fileSize,
      totalComponents: migrationData.elements.length,
      transformationsApplied,
      dependenciesAffected,
      complexity
    };
  }

  /**
   * Generate progress information
   */
  generateProgressInfo(
    currentFileIndex: number,
    totalFiles: number,
    currentRuleIndex: number,
    totalRulesForFile: number,
    overallStats: MigrationStats
  ): ProgressInfo {
    const elapsedTime = Date.now() - this.startTime;
    const estimatedTotal = totalFiles > 0 ? (elapsedTime / currentFileIndex) * totalFiles : 0;
    const estimatedRemaining = Math.max(0, estimatedTotal - elapsedTime);

    return {
      currentFile: {
        index: currentFileIndex,
        total: totalFiles
      },
      currentRule: {
        index: currentRuleIndex,
        total: totalRulesForFile
      },
      overallProgress: {
        filesProcessed: currentFileIndex - 1,
        totalFiles,
        rulesApplied: overallStats.totalRulesApplied,
        totalRules: overallStats.totalRules,
        percentage: totalFiles > 0 ? Math.round(((currentFileIndex - 1) / totalFiles) * 100) : 0
      },
      estimatedTimeRemaining: estimatedRemaining > 0 ? formatDuration(estimatedRemaining) : undefined,
      stats: overallStats
    };
  }

  /**
   * Display the complete information panel
   */
  displayInfoPanel(
    ruleInfo: RuleDisplayInfo,
    fileContext: FileContextInfo,
    progressInfo: ProgressInfo
  ): string {
    const sections: string[] = [];
    const separator = chalk.dim('─'.repeat(this.options.maxWidth));

    // Header
    sections.push(chalk.bold.cyan('📋 JSX-Migr8 Interactive Diff Review'));
    sections.push(separator);

    // Progress section
    if (this.options.showProgress) {
      sections.push(this.formatProgressSection(progressInfo));
      sections.push(separator);
    }

    // File context section
    if (this.options.showFileContext) {
      sections.push(this.formatFileContextSection(fileContext));
      sections.push(separator);
    }

    // Rule details section
    if (this.options.showRuleDetails) {
      sections.push(this.formatRuleDetailsSection(ruleInfo));
      sections.push(separator);
    }

    // Keyboard shortcuts
    if (this.options.showKeyboardShortcuts) {
      sections.push(this.formatKeyboardShortcutsSection());
      sections.push(separator);
    }

    // Help section
    if (this.options.showHelp) {
      sections.push(this.formatHelpSection());
    }

    return sections.join('\n');
  }

  /**
   * Format progress section
   */
  private formatProgressSection(progressInfo: ProgressInfo): string {
    const lines: string[] = [];
    
    lines.push(chalk.bold.yellow('⚡ Progress'));
    
    // Current file progress
    const fileProgressBar = this.createProgressBar(
      progressInfo.currentFile.index,
      progressInfo.currentFile.total,
      30
    );
    lines.push(`File: ${chalk.cyan(progressInfo.currentFile.index)}/${chalk.cyan(progressInfo.currentFile.total)} ${fileProgressBar}`);
    
    // Current rule progress
    if (progressInfo.currentRule.total > 0) {
      const ruleProgressBar = this.createProgressBar(
        progressInfo.currentRule.index,
        progressInfo.currentRule.total,
        30
      );
      lines.push(`Rule: ${chalk.cyan(progressInfo.currentRule.index)}/${chalk.cyan(progressInfo.currentRule.total)} ${ruleProgressBar}`);
    }
    
    // Overall progress
    const overallProgressBar = this.createProgressBar(
      progressInfo.overallProgress.percentage,
      100,
      50
    );
    lines.push(`Overall: ${chalk.cyan(progressInfo.overallProgress.percentage + '%')} ${overallProgressBar}`);
    
    // Statistics
    if (!this.options.compact) {
      lines.push(chalk.dim(`Files processed: ${progressInfo.overallProgress.filesProcessed}`));
      lines.push(chalk.dim(`Rules applied: ${progressInfo.overallProgress.rulesApplied}`));
      if (progressInfo.estimatedTimeRemaining) {
        lines.push(chalk.dim(`Est. time remaining: ${progressInfo.estimatedTimeRemaining}`));
      }
    }

    return lines.join('\n');
  }

  /**
   * Format file context section
   */
  private formatFileContextSection(fileContext: FileContextInfo): string {
    const lines: string[] = [];
    
    lines.push(chalk.bold.blue('📁 File Context'));
    lines.push(`Path: ${chalk.cyan(fileContext.filePath)}`);
    lines.push(`Size: ${chalk.yellow(fileContext.fileSize)} | Components: ${chalk.yellow(fileContext.totalComponents)} | Transformations: ${chalk.yellow(fileContext.transformationsApplied)}`);
    
    // Complexity indicator
    const complexityColor = fileContext.complexity === 'high' ? 'red' : 
                           fileContext.complexity === 'medium' ? 'yellow' : 'green';
    lines.push(`Complexity: ${chalk[complexityColor](fileContext.complexity.toUpperCase())}`);
    
    // Dependencies
    if (fileContext.dependenciesAffected.length > 0) {
      lines.push(`Dependencies: ${fileContext.dependenciesAffected.map(dep => chalk.magenta(dep)).join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Format rule details section
   */
  private formatRuleDetailsSection(ruleInfo: RuleDisplayInfo): string {
    const lines: string[] = [];
    
    lines.push(chalk.bold.green('🔧 Rule Details'));
    lines.push(`Name: ${chalk.cyan(ruleInfo.ruleName)}`);
    lines.push(`Description: ${chalk.dim(ruleInfo.description)}`);
    
    // Match conditions
    if (ruleInfo.matchConditions.length > 0) {
      lines.push(chalk.bold('Match Conditions:'));
      ruleInfo.matchConditions.forEach((condition, index) => {
        lines.push(`  ${index + 1}. ${this.formatMatchCondition(condition)}`);
      });
    }
    
    // Transformations
    lines.push(chalk.bold('Transformations:'));
    
    if (ruleInfo.transformations.remove && ruleInfo.transformations.remove.length > 0) {
      lines.push(`  ${chalk.red('Remove:')} ${ruleInfo.transformations.remove.map(prop => chalk.red(prop)).join(', ')}`);
    }
    
    if (ruleInfo.transformations.rename && Object.keys(ruleInfo.transformations.rename).length > 0) {
      lines.push(`  ${chalk.yellow('Rename:')}`);
      Object.entries(ruleInfo.transformations.rename).forEach(([from, to]) => {
        lines.push(`    ${chalk.red(from)} → ${chalk.green(to)}`);
      });
    }
    
    if (ruleInfo.transformations.set && Object.keys(ruleInfo.transformations.set).length > 0) {
      lines.push(`  ${chalk.green('Set:')}`);
      Object.entries(ruleInfo.transformations.set).forEach(([key, value]) => {
        lines.push(`    ${chalk.green(key)} = ${chalk.cyan(JSON.stringify(value))}`);
      });
    }
    
    if (ruleInfo.transformations.replaceWith) {
      lines.push(`  ${chalk.magenta('Replace with:')} ${chalk.dim(ruleInfo.transformations.replaceWith.code.substring(0, 60))}${ruleInfo.transformations.replaceWith.code.length > 60 ? '...' : ''}`);
    }
    
    // Import changes
    if (ruleInfo.importChanges.from.package !== ruleInfo.importChanges.to.package ||
        ruleInfo.importChanges.from.component !== ruleInfo.importChanges.to.component) {
      lines.push(chalk.bold('Import Changes:'));
      lines.push(`  From: ${chalk.red(ruleInfo.importChanges.from.package)} → ${chalk.cyan(ruleInfo.importChanges.from.component)} (${ruleInfo.importChanges.from.type})`);
      lines.push(`  To:   ${chalk.green(ruleInfo.importChanges.to.package)} → ${chalk.cyan(ruleInfo.importChanges.to.component)} (${ruleInfo.importChanges.to.type})`);
    }

    return lines.join('\n');
  }

  /**
   * Format keyboard shortcuts section
   */
  private formatKeyboardShortcutsSection(): string {
    const shortcuts = generateKeyboardShortcuts();
    const lines: string[] = [];
    
    lines.push(chalk.bold.magenta('⌨️  Keyboard Shortcuts'));
    shortcuts.forEach(shortcut => {
      lines.push(`  ${chalk.cyan(shortcut.key)} - ${shortcut.description}`);
    });

    return lines.join('\n');
  }

  /**
   * Format help section
   */
  private formatHelpSection(): string {
    const helpText = generateHelpText();
    const lines: string[] = [];
    
    lines.push(chalk.bold.white('❓ Help'));
    lines.push(helpText);

    return lines.join('\n');
  }

  /**
   * Create a progress bar
   */
  private createProgressBar(current: number, total: number, width: number): string {
    if (total === 0) return chalk.dim('█'.repeat(width));
    
    const percentage = Math.min(current / total, 1);
    const filled = Math.round(percentage * width);
    const empty = width - filled;
    
    return chalk.green('█'.repeat(filled)) + chalk.dim('█'.repeat(empty));
  }

  /**
   * Format a match condition for display
   */
  private formatMatchCondition(condition: Record<string, any>): string {
    return Object.entries(condition)
      .map(([key, value]) => `${chalk.cyan(key)}=${chalk.yellow(JSON.stringify(value))}`)
      .join(' & ');
  }

  /**
   * Generate a human-readable description for a rule
   */
  private generateRuleDescription(rule: RemapRule, migr8Rule: Migr8Rule): string {
    const parts: string[] = [];
    
    if (rule.replaceWith) {
      parts.push(`Replace ${migr8Rule.component} with custom JSX`);
    } else {
      if (rule.remove && rule.remove.length > 0) {
        parts.push(`Remove ${rule.remove.length} prop${rule.remove.length > 1 ? 's' : ''}`);
      }
      if (rule.rename && Object.keys(rule.rename).length > 0) {
        parts.push(`Rename ${Object.keys(rule.rename).length} prop${Object.keys(rule.rename).length > 1 ? 's' : ''}`);
      }
      if (rule.set && Object.keys(rule.set).length > 0) {
        parts.push(`Set ${Object.keys(rule.set).length} prop${Object.keys(rule.set).length > 1 ? 's' : ''}`);
      }
    }
    
    if (migr8Rule.importTo.component !== migr8Rule.component) {
      parts.push(`Migrate from ${migr8Rule.package} to ${migr8Rule.importTo.importStm}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Transform component';
  }

  /**
   * Calculate file complexity based on various factors
   */
  private calculateFileComplexity(
    fileSize: number,
    componentCount: number,
    transformationCount: number
  ): 'low' | 'medium' | 'high' {
    let complexityScore = 0;
    
    // File size factor
    if (fileSize > 50000) complexityScore += 2; // >50KB
    else if (fileSize > 10000) complexityScore += 1; // >10KB
    
    // Component count factor
    if (componentCount > 20) complexityScore += 2;
    else if (componentCount > 5) complexityScore += 1;
    
    // Transformation count factor
    if (transformationCount > 10) complexityScore += 2;
    else if (transformationCount > 3) complexityScore += 1;
    
    if (complexityScore >= 4) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Update options
   */
  setOptions(newOptions: Partial<InfoPanelOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Toggle help display
   */
  toggleHelp(): void {
    this.options.showHelp = !this.options.showHelp;
  }

  /**
   * Toggle compact mode
   */
  toggleCompactMode(): void {
    this.options.compact = !this.options.compact;
  }
}

/**
 * Create a new InfoPanel instance with default options
 */
export function createInfoPanel(options?: Partial<InfoPanelOptions>): InfoPanel {
  return new InfoPanel(options);
}

/**
 * Quick function to display rule info in a formatted way
 */
export function displayRuleInfo(
  rule: RemapRule,
  migr8Rule: Migr8Rule,
  fileContext: FileContextInfo,
  progressInfo: ProgressInfo,
  options?: Partial<InfoPanelOptions>
): string {
  const panel = createInfoPanel(options);
  const ruleInfo = panel.generateRuleInfo(rule, migr8Rule, 1, 1);
  
  return panel.displayInfoPanel(ruleInfo, fileContext, progressInfo);
}
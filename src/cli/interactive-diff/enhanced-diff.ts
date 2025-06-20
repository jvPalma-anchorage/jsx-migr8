import chalk from "chalk";
import { structuredPatch } from "diff";
import { RemapRule } from "@/remap/base-remapper";
import { Migr8Rule } from "@/report/types";
import { MigrationMapper } from "@/migrator/types";
import { InfoPanel, createInfoPanel } from "./info-panel";
import { MigrationStats, DefaultProgressCalculator } from "./utils/progress";
import { formatFilePath, createSeparator } from "./utils/formatters";

export interface DiffDisplayOptions {
  contextLines: number;
  showLineNumbers: boolean;
  highlightChanges: boolean;
  maxWidth: number;
  showInfoPanel: boolean;
  compactMode: boolean;
  showWhitespace: boolean;
}

export interface DiffContext {
  filePath: string;
  oldCode: string;
  newCode: string;
  rule: RemapRule;
  migr8Rule: Migr8Rule;
  migrationData: MigrationMapper[string];
  ruleIndex: number;
  totalRules: number;
  fileIndex: number;
  totalFiles: number;
  stats: MigrationStats;
}

export class EnhancedDiffViewer {
  private infoPanel: InfoPanel;
  private options: DiffDisplayOptions;
  private progressCalculator: DefaultProgressCalculator;

  constructor(options: Partial<DiffDisplayOptions> = {}) {
    this.options = {
      contextLines: 3,
      showLineNumbers: true,
      highlightChanges: true,
      maxWidth: 120,
      showInfoPanel: true,
      compactMode: false,
      showWhitespace: false,
      ...options
    };

    this.infoPanel = createInfoPanel({
      maxWidth: this.options.maxWidth,
      compact: this.options.compactMode
    });

    this.progressCalculator = new DefaultProgressCalculator();
  }

  /**
   * Display a comprehensive diff with rule information
   */
  displayEnhancedDiff(context: DiffContext): string {
    const sections: string[] = [];

    // Add file to progress tracking if not already added
    if (!this.progressCalculator.fileProgresses.has(context.filePath)) {
      this.progressCalculator.addFile(context.filePath, context.totalRules);
    }

    // Update progress
    this.progressCalculator.updateFileProgress(
      context.filePath,
      context.ruleIndex,
      context.migrationData.elements.length
    );

    // Generate info panel content
    if (this.options.showInfoPanel) {
      const ruleInfo = this.infoPanel.generateRuleInfo(
        context.rule,
        context.migr8Rule,
        context.ruleIndex,
        context.totalRules
      );

      const fileContext = this.infoPanel.generateFileContext(
        context.filePath,
        context.migrationData,
        context.migrationData.elements.length
      );

      const progressInfo = this.infoPanel.generateProgressInfo(
        context.fileIndex,
        context.totalFiles,
        context.ruleIndex,
        context.totalRules,
        this.progressCalculator.getDetailedStats()
      );

      sections.push(this.infoPanel.displayInfoPanel(ruleInfo, fileContext, progressInfo));
    }

    // Generate the actual diff
    const diffSection = this.generateDiffSection(context);
    sections.push(diffSection);

    // Add action prompt
    sections.push(this.generateActionPrompt(context));

    return sections.join('\n');
  }

  /**
   * Generate the diff section with enhanced formatting
   */
  private generateDiffSection(context: DiffContext): string {
    const lines: string[] = [];
    
    // Section header
    lines.push(chalk.bold.white('📝 Code Changes'));
    lines.push(createSeparator('─', this.options.maxWidth));

    // File header
    lines.push(chalk.cyan(`File: ${formatFilePath(context.filePath, this.options.maxWidth - 10)}`));
    
    // Component and rule information
    lines.push(chalk.yellow(`Component: ${context.migr8Rule.component}`));
    lines.push(chalk.magenta(`Rule: ${context.ruleIndex}/${context.totalRules}`));
    lines.push('');

    // Generate the actual diff
    const diffContent = this.createStyledDiff(
      context.oldCode,
      context.newCode,
      context.filePath
    );
    
    lines.push(diffContent);

    // Show transformation summary
    const transformationSummary = this.generateTransformationSummary(context.rule);
    if (transformationSummary) {
      lines.push('');
      lines.push(chalk.bold.gray('Transformations Applied:'));
      lines.push(transformationSummary);
    }

    return lines.join('\n');
  }

  /**
   * Create a styled diff with enhanced formatting
   */
  private createStyledDiff(oldCode: string, newCode: string, filePath: string): string {
    const patch = structuredPatch(
      filePath,
      filePath,
      oldCode,
      newCode,
      '',
      '',
      { context: this.options.contextLines }
    );

    const lines: string[] = [];

    patch.hunks.forEach((hunk, hunkIndex) => {
      // Hunk header with enhanced styling
      const hunkHeader = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
      lines.push(chalk.cyan.bold(hunkHeader));

      hunk.lines.forEach((line, lineIndex) => {
        const styledLine = this.styleDiffLine(line, hunk.oldStart + lineIndex);
        lines.push(styledLine);
      });

      // Add spacing between hunks
      if (hunkIndex < patch.hunks.length - 1) {
        lines.push('');
      }
    });

    return lines.join('\n');
  }

  /**
   * Style individual diff lines with enhanced formatting
   */
  private styleDiffLine(line: string, lineNumber?: number): string {
    const lineContent = line.slice(1); // Remove the +/- prefix
    const prefix = line[0];

    let styledLine = '';

    // Add line numbers if enabled
    if (this.options.showLineNumbers && lineNumber !== undefined) {
      const lineNumStr = lineNumber.toString().padStart(4, ' ');
      styledLine += chalk.dim(`${lineNumStr} `);
    }

    // Style based on line type
    switch (prefix) {
      case '+':
        styledLine += chalk.green(`+${lineContent}`);
        if (this.options.highlightChanges) {
          // Highlight specific changes within the line
          styledLine = this.highlightInlineChanges(styledLine, 'addition');
        }
        break;
      case '-':
        styledLine += chalk.red(`-${lineContent}`);
        if (this.options.highlightChanges) {
          styledLine = this.highlightInlineChanges(styledLine, 'deletion');
        }
        break;
      case ' ':
        styledLine += chalk.dim(`${lineContent}`);
        break;
      default:
        styledLine += line;
    }

    // Show whitespace characters if enabled
    if (this.options.showWhitespace) {
      styledLine = styledLine
        .replace(/\t/g, chalk.dim('→'))
        .replace(/ /g, chalk.dim('·'));
    }

    return styledLine;
  }

  /**
   * Highlight inline changes within a diff line
   */
  private highlightInlineChanges(line: string, changeType: 'addition' | 'deletion'): string {
    // This is a simplified version - a more sophisticated implementation
    // would use word-level or character-level diffing
    
    if (changeType === 'addition') {
      // Highlight prop names, values, and JSX attributes
      return line
        .replace(/(\w+)=/g, chalk.green.bold('$1') + chalk.green('='))
        .replace(/="([^"]+)"/g, '=' + chalk.green.bold('"$1"'))
        .replace(/{([^}]+)}/g, chalk.green.bold('{$1}'));
    } else {
      // Similar highlighting for deletions
      return line
        .replace(/(\w+)=/g, chalk.red.bold('$1') + chalk.red('='))
        .replace(/="([^"]+)"/g, '=' + chalk.red.bold('"$1"'))
        .replace(/{([^}]+)}/g, chalk.red.bold('{$1}'));
    }
  }

  /**
   * Generate transformation summary
   */
  private generateTransformationSummary(rule: RemapRule): string {
    const transformations: string[] = [];

    if (rule.remove && rule.remove.length > 0) {
      transformations.push(chalk.red(`• Removed: ${rule.remove.join(', ')}`));
    }

    if (rule.rename && Object.keys(rule.rename).length > 0) {
      const renames = Object.entries(rule.rename as Record<string, string>)
        .map(([from, to]) => `${chalk.yellow(from)} → ${chalk.green(to)}`)
        .join(', ');
      transformations.push(chalk.yellow(`• Renamed: ${renames}`));
    }

    if (rule.set && Object.keys(rule.set).length > 0) {
      const sets = Object.entries(rule.set)
        .map(([key, value]) => `${chalk.green(key)}=${chalk.cyan(JSON.stringify(value))}`)
        .join(', ');
      transformations.push(chalk.green(`• Set: ${sets}`));
    }

    if (rule.replaceWith) {
      transformations.push(chalk.magenta(`• Replaced with: ${rule.replaceWith.code.substring(0, 50)}...`));
    }

    return transformations.join('\n');
  }

  /**
   * Generate action prompt
   */
  private generateActionPrompt(context: DiffContext): string {
    const lines: string[] = [];
    
    lines.push(createSeparator('─', this.options.maxWidth));
    lines.push(chalk.bold.cyan('🎯 What would you like to do?'));
    lines.push('');
    
    // Action options
    const actions = [
      { key: 'y/Enter', desc: 'Accept this change', color: 'green' as const },
      { key: 'n/Delete', desc: 'Skip this change', color: 'red' as const },
      { key: 'a', desc: 'Accept all changes in this file', color: 'yellow' as const },
      { key: 's', desc: 'Skip all changes in this file', color: 'yellow' as const },
      { key: '?', desc: 'Show help', color: 'blue' as const },
      { key: 'q', desc: 'Quit', color: 'gray' as const }
    ];

    actions.forEach(action => {
      lines.push(`  ${chalk[action.color](action.key.padEnd(10))} ${action.desc}`);
    });

    // Progress indicator
    lines.push('');
    lines.push(chalk.dim(`Progress: Rule ${context.ruleIndex}/${context.totalRules} | File ${context.fileIndex}/${context.totalFiles}`));

    return lines.join('\n');
  }

  /**
   * Update display options
   */
  setOptions(newOptions: Partial<DiffDisplayOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Update info panel options
    this.infoPanel.setOptions({
      maxWidth: this.options.maxWidth,
      compact: this.options.compactMode
    });
  }

  /**
   * Toggle info panel visibility
   */
  toggleInfoPanel(): void {
    this.options.showInfoPanel = !this.options.showInfoPanel;
  }

  /**
   * Toggle compact mode
   */
  toggleCompactMode(): void {
    this.options.compactMode = !this.options.compactMode;
    this.infoPanel.toggleCompactMode();
  }

  /**
   * Increase context lines
   */
  increaseContext(): void {
    this.options.contextLines = Math.min(this.options.contextLines + 1, 10);
  }

  /**
   * Decrease context lines
   */
  decreaseContext(): void {
    this.options.contextLines = Math.max(this.options.contextLines - 1, 0);
  }

  /**
   * Get current options
   */
  getOptions(): DiffDisplayOptions {
    return { ...this.options };
  }

  /**
   * Get progress calculator for external use
   */
  getProgressCalculator(): DefaultProgressCalculator {
    return this.progressCalculator;
  }
}

/**
 * Create an enhanced diff viewer with default options
 */
export function createEnhancedDiffViewer(options?: Partial<DiffDisplayOptions>): EnhancedDiffViewer {
  return new EnhancedDiffViewer(options);
}

/**
 * Quick function to display an enhanced diff
 */
export function displayEnhancedDiff(
  context: DiffContext,
  options?: Partial<DiffDisplayOptions>
): string {
  const viewer = createEnhancedDiffViewer(options);
  return viewer.displayEnhancedDiff(context);
}
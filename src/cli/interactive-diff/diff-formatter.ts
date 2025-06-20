/**********************************************************************
 *  src/cli/interactive-diff/diff-formatter.ts – Diff content formatter
 *********************************************************************/

import chalk from 'chalk';
import { DiffContent, DiffColors } from './types';

export class DiffFormatter {
  private colors: DiffColors;

  constructor(colors: DiffColors) {
    this.colors = colors;
  }

  public formatDiff(content: DiffContent, type: 'old' | 'new'): string {
    const lines = content[type === 'old' ? 'oldCode' : 'newCode'].split('\n');
    const formattedLines: string[] = [];
    const startLine = content.lineOffset || 1;

    lines.forEach((line, index) => {
      const lineNumber = startLine + index;
      const lineNumberStr = this.formatLineNumber(lineNumber);
      const formattedLine = this.formatCodeLine(line, type);
      formattedLines.push(`${lineNumberStr} ${formattedLine}`);
    });

    return formattedLines.join('\n');
  }

  public formatUnifiedDiff(content: DiffContent): string {
    const oldLines = content.oldCode.split('\n');
    const newLines = content.newCode.split('\n');
    const formattedLines: string[] = [];
    
    // Add file header
    formattedLines.push(chalk.bold(`--- ${content.fileName} (old)`));
    formattedLines.push(chalk.bold(`+++ ${content.fileName} (new)`));
    formattedLines.push('');

    // Simple unified diff format
    const maxLength = Math.max(oldLines.length, newLines.length);
    const startLine = content.lineOffset || 1;

    for (let i = 0; i < maxLength; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      const lineNumber = startLine + i;

      if (oldLine === newLine) {
        // Unchanged line
        formattedLines.push(`${this.formatLineNumber(lineNumber, ' ')} ${oldLine || ''}`);
      } else {
        // Changed lines
        if (oldLine !== undefined) {
          formattedLines.push(chalk.red(`${this.formatLineNumber(lineNumber, '-')} ${oldLine}`));
        }
        if (newLine !== undefined) {
          formattedLines.push(chalk.green(`${this.formatLineNumber(lineNumber, '+')} ${newLine}`));
        }
      }
    }

    return formattedLines.join('\n');
  }

  public formatSideBySideDiff(content: DiffContent): { left: string; right: string } {
    const oldLines = content.oldCode.split('\n');
    const newLines = content.newCode.split('\n');
    const leftFormatted: string[] = [];
    const rightFormatted: string[] = [];
    const startLine = content.lineOffset || 1;

    const maxLength = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLength; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      const lineNumber = startLine + i;

      // Format old code (left side)
      const oldLineFormatted = this.formatCodeLine(oldLine, 'old');
      leftFormatted.push(`${this.formatLineNumber(lineNumber)} ${oldLineFormatted}`);

      // Format new code (right side)
      const newLineFormatted = this.formatCodeLine(newLine, 'new');
      rightFormatted.push(`${this.formatLineNumber(lineNumber)} ${newLineFormatted}`);
    }

    return {
      left: leftFormatted.join('\n'),
      right: rightFormatted.join('\n'),
    };
  }

  public formatCodeLine(line: string, type: 'old' | 'new'): string {
    if (!line.trim()) {
      return line;
    }

    // Basic syntax highlighting for JSX/TSX
    let formattedLine = line;

    // Highlight JSX tags
    formattedLine = formattedLine.replace(
      /(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)/g,
      `$1${chalk.cyan('$2')}`
    );

    // Highlight JSX attributes
    formattedLine = formattedLine.replace(
      /\s([a-zA-Z][a-zA-Z0-9-]*)(=)/g,
      ` ${chalk.yellow('$1')}$2`
    );

    // Highlight strings
    formattedLine = formattedLine.replace(
      /(["'`])(.*?)\1/g,
      chalk.green('$1$2$1')
    );

    // Highlight comments
    formattedLine = formattedLine.replace(
      /(\/\/.*$|\/\*.*?\*\/)/g,
      chalk.gray('$1')
    );

    // Highlight keywords
    const keywords = ['import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while'];
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      formattedLine = formattedLine.replace(regex, chalk.magenta('$1'));
    });

    // Apply diff coloring based on type
    if (type === 'old') {
      // Mark as removed (subtle red background)
      return chalk.bgRedBright.black(formattedLine);
    } else {
      // Mark as added (subtle green background)
      return chalk.bgGreenBright.black(formattedLine);
    }
  }

  private formatLineNumber(lineNumber: number, prefix: string = ' '): string {
    const lineStr = lineNumber.toString().padStart(4, ' ');
    return chalk.hex(this.colors.lineNumber)(`${prefix}${lineStr}:`);
  }

  public formatWithHighlight(text: string, searchTerm?: string): string {
    if (!searchTerm) {
      return text;
    }

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, chalk.bgYellow.black('$1'));
  }

  public truncateContent(content: string, maxLines: number): { content: string; truncated: boolean } {
    const lines = content.split('\n');
    if (lines.length <= maxLines) {
      return { content, truncated: false };
    }

    const truncatedLines = lines.slice(0, maxLines - 1);
    truncatedLines.push(chalk.gray(`... (${lines.length - maxLines + 1} more lines)`));
    
    return {
      content: truncatedLines.join('\n'),
      truncated: true,
    };
  }

  public addLineNumbers(content: string, startLine: number = 1): string {
    const lines = content.split('\n');
    return lines
      .map((line, index) => {
        const lineNumber = startLine + index;
        return `${this.formatLineNumber(lineNumber)} ${line}`;
      })
      .join('\n');
  }

  public removeLineNumbers(content: string): string {
    return content
      .split('\n')
      .map(line => line.replace(/^\s*\d+:\s*/, ''))
      .join('\n');
  }

  public getLineDifferences(oldContent: string, newContent: string): {
    addedLines: number[];
    removedLines: number[];
    modifiedLines: number[];
  } {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const addedLines: number[] = [];
    const removedLines: number[] = [];
    const modifiedLines: number[] = [];

    const maxLength = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLength; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === undefined && newLine !== undefined) {
        addedLines.push(i + 1);
      } else if (oldLine !== undefined && newLine === undefined) {
        removedLines.push(i + 1);
      } else if (oldLine !== newLine) {
        modifiedLines.push(i + 1);
      }
    }

    return { addedLines, removedLines, modifiedLines };
  }
}
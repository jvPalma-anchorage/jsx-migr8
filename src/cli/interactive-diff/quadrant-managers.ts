/**********************************************************************
 *  src/cli/interactive-diff/quadrant-managers.ts – Quadrant content managers
 *********************************************************************/

import * as blessed from 'blessed';
import chalk from 'chalk';
import { DiffContent, RuleInfo, InteractiveMenuOptions, KeyboardAction } from './types';
import { DiffFormatter } from './diff-formatter';

export class OldCodeQuadrant {
  private box: blessed.Widgets.BoxElement;
  private textArea: blessed.Widgets.ScrollableTextElement;
  private formatter: DiffFormatter;

  constructor(parent: blessed.Widgets.Screen, formatter: DiffFormatter) {
    this.formatter = formatter;
    this.box = blessed.box({
      parent,
      label: ' Old Code ',
      border: 'line',
      style: {
        border: {
          fg: 'red',
        },
      },
    });

    this.textArea = blessed.scrollabletext({
      parent: this.box,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: ' ',
        style: {
          bg: 'red',
        },
        track: {
          bg: 'gray',
        },
      },
    });
  }

  public updateContent(content: DiffContent): void {
    const formattedContent = this.formatter.formatDiff(content, 'old');
    this.textArea.setContent(formattedContent);
    this.box.setLabel(` Old Code - ${content.fileName} `);
  }

  public getBox(): blessed.Widgets.BoxElement {
    return this.box;
  }

  public scrollUp(): void {
    this.textArea.scroll(-3);
  }

  public scrollDown(): void {
    this.textArea.scroll(3);
  }

  public focus(): void {
    this.textArea.focus();
  }
}

export class NewCodeQuadrant {
  private box: blessed.Widgets.BoxElement;
  private textArea: blessed.Widgets.ScrollableTextElement;
  private formatter: DiffFormatter;

  constructor(parent: blessed.Widgets.Screen, formatter: DiffFormatter) {
    this.formatter = formatter;
    this.box = blessed.box({
      parent,
      label: ' New Code ',
      border: 'line',
      style: {
        border: {
          fg: 'green',
        },
      },
    });

    this.textArea = blessed.scrollabletext({
      parent: this.box,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: ' ',
        style: {
          bg: 'green',
        },
        track: {
          bg: 'gray',
        },
      },
    });
  }

  public updateContent(content: DiffContent): void {
    const formattedContent = this.formatter.formatDiff(content, 'new');
    this.textArea.setContent(formattedContent);
    this.box.setLabel(` New Code - ${content.fileName} `);
  }

  public getBox(): blessed.Widgets.BoxElement {
    return this.box;
  }

  public scrollUp(): void {
    this.textArea.scroll(-3);
  }

  public scrollDown(): void {
    this.textArea.scroll(3);
  }

  public focus(): void {
    this.textArea.focus();
  }
}

export class InteractiveMenuQuadrant {
  private box: blessed.Widgets.BoxElement;
  private list: blessed.Widgets.ListElement;
  private statusText: blessed.Widgets.TextElement;
  private helpText: blessed.Widgets.TextElement;
  private currentSelection: number = 0;
  private onSelectionCallback?: (action: 'confirm' | 'needs-adjust' | 'stop') => void;

  constructor(parent: blessed.Widgets.Screen) {
    this.box = blessed.box({
      parent,
      label: ' Actions ',
      border: 'line',
      style: {
        border: {
          fg: 'cyan',
        },
      },
    });

    // Status text at the top
    this.statusText = blessed.text({
      parent: this.box,
      top: 0,
      left: 1,
      right: 1,
      height: 2,
      content: chalk.yellow('Review the changes and select an action:'),
      style: {
        fg: 'yellow',
      },
    });

    // Interactive menu list
    this.list = blessed.list({
      parent: this.box,
      top: 3,
      left: 1,
      right: 1,
      height: 8,
      items: [
        '✅ Confirm - Apply this change',
        '🔧 Needs Adjust - Skip and mark for manual review',
        '⛔ Stop - Stop migration process',
      ],
      keys: true,
      vi: true,
      mouse: true,
      style: {
        selected: {
          bg: 'cyan',
          fg: 'black',
        },
        item: {
          hover: {
            bg: 'gray',
          },
        },
      },
      border: 'line',
    });

    // Help text at the bottom
    this.helpText = blessed.text({
      parent: this.box,
      bottom: 0,
      left: 1,
      right: 1,
      height: 6,
      content: this.getHelpText(),
      style: {
        fg: 'gray',
      },
    });

    this.setupEventHandlers();
  }

  private getHelpText(): string {
    return [
      'Keyboard shortcuts:',
      '↑/↓ or j/k - Navigate menu',
      'Enter/Space - Select action',
      'q - Quit migration',
      'h - Toggle help',
    ].join('\n');
  }

  private setupEventHandlers(): void {
    this.list.on('select', (item, index) => {
      this.currentSelection = index;
      this.handleSelection();
    });

    this.list.key(['enter', 'space'], () => {
      this.handleSelection();
    });
  }

  private handleSelection(): void {
    if (!this.onSelectionCallback) return;

    switch (this.currentSelection) {
      case 0:
        this.onSelectionCallback('confirm');
        break;
      case 1:
        this.onSelectionCallback('needs-adjust');
        break;
      case 2:
        this.onSelectionCallback('stop');
        break;
    }
  }

  public updateStatus(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    let coloredMessage: string;
    
    switch (type) {
      case 'success':
        coloredMessage = chalk.green(message);
        break;
      case 'warning':
        coloredMessage = chalk.yellow(message);
        break;
      case 'error':
        coloredMessage = chalk.red(message);
        break;
      default:
        coloredMessage = chalk.yellow(message);
        break;
    }

    this.statusText.setContent(coloredMessage);
  }

  public onSelection(callback: (action: 'confirm' | 'needs-adjust' | 'stop') => void): void {
    this.onSelectionCallback = callback;
  }

  public getBox(): blessed.Widgets.BoxElement {
    return this.box;
  }

  public focus(): void {
    this.list.focus();
  }

  public reset(): void {
    this.currentSelection = 0;
    this.list.select(0);
    this.updateStatus('Review the changes and select an action:');
  }
}

export class RuleInfoQuadrant {
  private box: blessed.Widgets.BoxElement;
  private textArea: blessed.Widgets.ScrollableTextElement;

  constructor(parent: blessed.Widgets.Screen) {
    this.box = blessed.box({
      parent,
      label: ' Rule Information ',
      border: 'line',
      style: {
        border: {
          fg: 'magenta',
        },
      },
    });

    this.textArea = blessed.scrollabletext({
      parent: this.box,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: ' ',
        style: {
          bg: 'magenta',
        },
        track: {
          bg: 'gray',
        },
      },
    });
  }

  public updateContent(ruleInfo: RuleInfo): void {
    const content = this.formatRuleInfo(ruleInfo);
    this.textArea.setContent(content);
    this.box.setLabel(` Rule: ${ruleInfo.name} `);
  }

  private formatRuleInfo(rule: RuleInfo): string {
    const sections: string[] = [];

    // Header
    sections.push(chalk.bold.magenta('Migration Rule Details'));
    sections.push(''.padEnd(40, '─'));
    sections.push('');

    // Basic information
    sections.push(chalk.cyan('Name: ') + rule.name);
    sections.push(chalk.cyan('Description: ') + rule.description);
    sections.push('');

    // Migration details
    sections.push(chalk.yellow('Migration Path:'));
    sections.push(`  From: ${chalk.red(rule.sourcePackage)}`);
    sections.push(`  To:   ${chalk.green(rule.targetPackage)}`);
    sections.push('');

    // Component information
    sections.push(chalk.yellow('Component: ') + chalk.bold(rule.componentName));
    sections.push('');

    // Props changes
    if (rule.propsChanged.length > 0) {
      sections.push(chalk.yellow('Props Changes:'));
      rule.propsChanged.forEach(prop => {
        sections.push(`  • ${prop}`);
      });
      sections.push('');
    }

    // Import changes
    if (rule.importsChanged.length > 0) {
      sections.push(chalk.yellow('Import Changes:'));
      rule.importsChanged.forEach(imp => {
        sections.push(`  • ${imp}`);
      });
      sections.push('');
    }

    // Tips
    sections.push(chalk.gray('Tips:'));
    sections.push(chalk.gray('• Use ↑/↓ to scroll through rule details'));
    sections.push(chalk.gray('• Review all changes before confirming'));
    sections.push(chalk.gray('• Use "Needs Adjust" for manual review'));

    return sections.join('\n');
  }

  public getBox(): blessed.Widgets.BoxElement {
    return this.box;
  }

  public scrollUp(): void {
    this.textArea.scroll(-3);
  }

  public scrollDown(): void {
    this.textArea.scroll(3);
  }

  public focus(): void {
    this.textArea.focus();
  }
}
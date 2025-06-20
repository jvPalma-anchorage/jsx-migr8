/**********************************************************************
 *  src/cli/interactive-diff/keyboard-handler.ts – Keyboard input handler
 *********************************************************************/

import * as blessed from 'blessed';
import { KeyboardAction } from './types';
import { 
  OldCodeQuadrant, 
  NewCodeQuadrant, 
  InteractiveMenuQuadrant, 
  RuleInfoQuadrant 
} from './quadrant-managers';

export class KeyboardHandler {
  private screen: blessed.Widgets.Screen;
  private quadrants: {
    oldCode: OldCodeQuadrant;
    newCode: NewCodeQuadrant;
    menu: InteractiveMenuQuadrant;
    ruleInfo: RuleInfoQuadrant;
  };
  private currentFocus: 'oldCode' | 'newCode' | 'menu' | 'ruleInfo' = 'menu';
  private onActionCallback?: (action: 'confirm' | 'needs-adjust' | 'stop' | 'quit') => void;
  private helpVisible: boolean = false;

  constructor(
    screen: blessed.Widgets.Screen,
    quadrants: {
      oldCode: OldCodeQuadrant;
      newCode: NewCodeQuadrant;
      menu: InteractiveMenuQuadrant;
      ruleInfo: RuleInfoQuadrant;
    }
  ) {
    this.screen = screen;
    this.quadrants = quadrants;
    this.setupKeyboardBindings();
    this.focusCurrentQuadrant();
  }

  private setupKeyboardBindings(): void {
    // Global navigation keys
    this.screen.key(['tab'], () => {
      this.switchFocus('next');
    });

    this.screen.key(['S-tab'], () => {
      this.switchFocus('previous');
    });

    // Focus-specific navigation
    this.screen.key(['1'], () => {
      this.setFocus('oldCode');
    });

    this.screen.key(['2'], () => {
      this.setFocus('newCode');
    });

    this.screen.key(['3'], () => {
      this.setFocus('menu');
    });

    this.screen.key(['4'], () => {
      this.setFocus('ruleInfo');
    });

    // Scrolling keys (work in any focused quadrant except menu)
    this.screen.key(['up', 'k'], () => {
      this.handleScroll('up');
    });

    this.screen.key(['down', 'j'], () => {
      this.handleScroll('down');
    });

    this.screen.key(['pageup'], () => {
      this.handleScroll('pageup');
    });

    this.screen.key(['pagedown'], () => {
      this.handleScroll('pagedown');
    });

    // Action keys
    this.screen.key(['enter', 'space'], () => {
      if (this.currentFocus === 'menu') {
        // Let the menu handle its own enter/space
        return;
      }
      this.handleAction('confirm');
    });

    this.screen.key(['y'], () => {
      this.handleAction('confirm');
    });

    this.screen.key(['n'], () => {
      this.handleAction('needs-adjust');
    });

    this.screen.key(['s'], () => {
      this.handleAction('stop');
    });

    // Quit keys
    this.screen.key(['q', 'C-c'], () => {
      this.handleAction('quit');
    });

    // Help toggle
    this.screen.key(['h', '?'], () => {
      this.toggleHelp();
    });

    // Refresh
    this.screen.key(['r', 'C-r'], () => {
      this.screen.render();
    });
  }

  private switchFocus(direction: 'next' | 'previous'): void {
    const focusOrder: Array<'oldCode' | 'newCode' | 'menu' | 'ruleInfo'> = [
      'oldCode',
      'newCode',
      'menu',
      'ruleInfo',
    ];

    const currentIndex = focusOrder.indexOf(this.currentFocus);
    let newIndex: number;

    if (direction === 'next') {
      newIndex = (currentIndex + 1) % focusOrder.length;
    } else {
      newIndex = currentIndex === 0 ? focusOrder.length - 1 : currentIndex - 1;
    }

    this.setFocus(focusOrder[newIndex]);
  }

  private setFocus(quadrant: 'oldCode' | 'newCode' | 'menu' | 'ruleInfo'): void {
    // Remove focus styling from current quadrant
    this.removeFocusHighlight();

    this.currentFocus = quadrant;

    // Add focus styling to new quadrant
    this.addFocusHighlight();

    // Focus the appropriate element
    this.focusCurrentQuadrant();
  }

  private focusCurrentQuadrant(): void {
    switch (this.currentFocus) {
      case 'oldCode':
        this.quadrants.oldCode.focus();
        break;
      case 'newCode':
        this.quadrants.newCode.focus();
        break;
      case 'menu':
        this.quadrants.menu.focus();
        break;
      case 'ruleInfo':
        this.quadrants.ruleInfo.focus();
        break;
    }
  }

  private addFocusHighlight(): void {
    const quadrant = this.quadrants[this.currentFocus];
    const box = quadrant.getBox();
    
    (box.style as any).border = { ...(box.style as any).border, fg: 'yellow' };
    (box as any).border = { ...(box as any).border, fg: 'yellow' };
  }

  private removeFocusHighlight(): void {
    // Reset all quadrant borders to their default colors
    const defaultColors = {
      oldCode: 'red',
      newCode: 'green',
      menu: 'cyan',
      ruleInfo: 'magenta',
    };

    Object.entries(this.quadrants).forEach(([key, quadrant]) => {
      const box = quadrant.getBox();
      const defaultColor = defaultColors[key as keyof typeof defaultColors];
      (box.style as any).border = { ...(box.style as any).border, fg: defaultColor };
      (box as any).border = { ...(box as any).border, fg: defaultColor };
    });
  }

  private handleScroll(direction: 'up' | 'down' | 'pageup' | 'pagedown'): void {
    if (this.currentFocus === 'menu') {
      // Menu handles its own scrolling
      return;
    }

    const scrollAmount = direction === 'pageup' || direction === 'pagedown' ? 10 : 1;
    const isUp = direction === 'up' || direction === 'pageup';

    switch (this.currentFocus) {
      case 'oldCode':
        if (isUp) {
          for (let i = 0; i < scrollAmount; i++) {
            this.quadrants.oldCode.scrollUp();
          }
        } else {
          for (let i = 0; i < scrollAmount; i++) {
            this.quadrants.oldCode.scrollDown();
          }
        }
        break;
      case 'newCode':
        if (isUp) {
          for (let i = 0; i < scrollAmount; i++) {
            this.quadrants.newCode.scrollUp();
          }
        } else {
          for (let i = 0; i < scrollAmount; i++) {
            this.quadrants.newCode.scrollDown();
          }
        }
        break;
      case 'ruleInfo':
        if (isUp) {
          for (let i = 0; i < scrollAmount; i++) {
            this.quadrants.ruleInfo.scrollUp();
          }
        } else {
          for (let i = 0; i < scrollAmount; i++) {
            this.quadrants.ruleInfo.scrollDown();
          }
        }
        break;
    }

    this.screen.render();
  }

  private handleAction(action: 'confirm' | 'needs-adjust' | 'stop' | 'quit'): void {
    if (this.onActionCallback) {
      this.onActionCallback(action);
    }
  }

  private toggleHelp(): void {
    this.helpVisible = !this.helpVisible;
    
    if (this.helpVisible) {
      this.showHelpDialog();
    }
  }

  private showHelpDialog(): void {
    const helpContent = this.getHelpContent();
    
    const helpBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      content: helpContent,
      border: 'line',
      style: {
        border: {
          fg: 'yellow',
        },
        bg: 'black',
      },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      label: ' Help - Press ESC or h to close ',
    });

    helpBox.key(['escape', 'h', '?'], () => {
      helpBox.destroy();
      this.helpVisible = false;
      this.screen.render();
    });

    helpBox.focus();
    this.screen.render();
  }

  private getHelpContent(): string {
    return [
      '🚀 jsx-migr8 Interactive Diff Viewer Help',
      ''.padEnd(50, '='),
      '',
      '📍 NAVIGATION:',
      '  Tab/Shift+Tab    - Switch between quadrants',
      '  1-4              - Jump to specific quadrant:',
      '                     1: Old Code, 2: New Code, 3: Menu, 4: Rule Info',
      '  ↑/↓ or j/k       - Scroll content up/down',
      '  Page Up/Down     - Scroll content by page',
      '',
      '⚡ ACTIONS:',
      '  Enter/Space      - Confirm current selection (in menu)',
      '  y                - Confirm/Accept changes',
      '  n                - Mark as "Needs Adjust"',
      '  s                - Stop migration',
      '  q/Ctrl+C         - Quit application',
      '',
      '🎨 QUADRANTS:',
      '  Top Left         - Old Code (Red border)',
      '  Top Right        - New Code (Green border)',
      '  Bottom Left      - Interactive Menu (Cyan border)',
      '  Bottom Right     - Rule Information (Magenta border)',
      '',
      '💡 TIPS:',
      '  • Yellow border indicates currently focused quadrant',
      '  • Use scrolling to review long code changes',
      '  • Rule info shows migration details and affected props',
      '  • Menu allows you to accept, skip, or stop migration',
      '',
      '🔧 OTHER:',
      '  h/?              - Toggle this help dialog',
      '  r/Ctrl+R         - Refresh screen',
      '',
      'Press ESC or h to close this help dialog.',
    ].join('\n');
  }

  public onAction(callback: (action: 'confirm' | 'needs-adjust' | 'stop' | 'quit') => void): void {
    this.onActionCallback = callback;
  }

  public getCurrentFocus(): 'oldCode' | 'newCode' | 'menu' | 'ruleInfo' {
    return this.currentFocus;
  }

  public setMenuAsDefault(): void {
    this.setFocus('menu');
  }

  public getKeyboardActions(): KeyboardAction[] {
    return [
      { key: 'Tab', action: 'next', description: 'Switch to next quadrant' },
      { key: 'Shift+Tab', action: 'previous', description: 'Switch to previous quadrant' },
      { key: '↑/k', action: 'scroll-up', description: 'Scroll content up' },
      { key: '↓/j', action: 'scroll-down', description: 'Scroll content down' },
      { key: 'y', action: 'confirm', description: 'Confirm changes' },
      { key: 'n', action: 'needs-adjust', description: 'Mark as needs adjustment' },
      { key: 's', action: 'stop', description: 'Stop migration' },
      { key: 'q', action: 'quit', description: 'Quit application' },
    ];
  }
}
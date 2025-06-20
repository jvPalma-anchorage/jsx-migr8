/**********************************************************************
 *  src/cli/interactive-diff/layout-manager.ts – Terminal layout manager
 *********************************************************************/

import * as blessed from 'blessed';
// Terminal size detection
function getTerminalSize(): { columns: number; rows: number } {
  // In test environment or if stdout doesn't have dimensions, use defaults
  if (process.env.NODE_ENV === 'test' || !process.stdout.columns) {
    return { columns: 80, rows: 24 };
  }
  
  // Use process.stdout dimensions as fallback
  return {
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  };
}
import { TerminalDimensions, MatrixLayout, QuadrantDimensions, LayoutTheme } from './types';

export class TerminalLayoutManager {
  private screen: blessed.Widgets.Screen;
  private dimensions: TerminalDimensions;
  private layout: MatrixLayout;
  private theme: LayoutTheme;

  constructor(theme?: Partial<LayoutTheme>) {
    this.screen = blessed.screen({
      smartCSR: true,
      dockBorders: true,
      fullUnicode: true,
      debug: false,
      warnings: false,
    });

    // Initialize with fallback dimensions
    this.dimensions = {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24,
    };
    this.layout = this.calculateLayout();
    this.theme = this.mergeTheme(theme);

    this.setupEventHandlers();
    this.initializeDimensions();
  }

  private initializeDimensions(): void {
    try {
      this.dimensions = this.getTerminalDimensions();
      this.layout = this.calculateLayout();
    } catch (error) {
      // Use fallback dimensions
    }
  }

  private getTerminalDimensions(): TerminalDimensions {
    const { columns, rows } = getTerminalSize();
    return {
      width: columns,
      height: rows,
    };
  }

  private calculateLayout(): MatrixLayout {
    const { width, height } = this.dimensions;
    
    // Reserve space for borders (1 character each side)
    const usableWidth = width - 1;
    const usableHeight = height - 1;
    
    // Split into 4 quadrants with borders
    const halfWidth = Math.floor(usableWidth / 2);
    const halfHeight = Math.floor(usableHeight / 2);

    return {
      topLeft: {
        x: 0,
        y: 0,
        width: halfWidth,
        height: halfHeight,
      },
      topRight: {
        x: halfWidth,
        y: 0,
        width: usableWidth - halfWidth,
        height: halfHeight,
      },
      bottomLeft: {
        x: 0,
        y: halfHeight,
        width: halfWidth,
        height: usableHeight - halfHeight,
      },
      bottomRight: {
        x: halfWidth,
        y: halfHeight,
        width: usableWidth - halfWidth,
        height: usableHeight - halfHeight,
      },
    };
  }

  private mergeTheme(customTheme?: Partial<LayoutTheme>): LayoutTheme {
    const defaultTheme: LayoutTheme = {
      colors: {
        added: 'green',
        removed: 'red',
        modified: 'yellow',
        lineNumber: 'blue',
        background: 'black',
        border: 'white',
        highlight: 'cyan',
      },
      borders: {
        style: 'single',
        color: 'white',
      },
      scrollbar: {
        show: true,
        color: 'gray',
      },
    };

    return {
      ...defaultTheme,
      ...customTheme,
      colors: {
        ...defaultTheme.colors,
        ...customTheme?.colors,
      },
      borders: {
        ...defaultTheme.borders,
        ...customTheme?.borders,
      },
      scrollbar: {
        ...defaultTheme.scrollbar,
        ...customTheme?.scrollbar,
      },
    };
  }

  private setupEventHandlers(): void {
    // Handle window resize
    this.screen.on('resize', () => {
      try {
        this.dimensions = this.getTerminalDimensions();
        this.layout = this.calculateLayout();
        this.screen.render();
      } catch (error) {
        // Use current dimensions on error
      }
    });

    // Handle Ctrl+C
    this.screen.key(['C-c'], () => {
      this.destroy();
      process.exit(0);
    });
  }

  public createQuadrant(
    name: string,
    quadrant: keyof MatrixLayout,
    options?: Partial<blessed.Widgets.BoxOptions>
  ): blessed.Widgets.BoxElement {
    const dims = this.layout[quadrant];
    const box = blessed.box({
      name,
      parent: this.screen,
      top: dims.y,
      left: dims.x,
      width: dims.width,
      height: dims.height,
      border: 'line',
      style: {
        bg: this.theme.colors.background,
        border: {
          fg: this.theme.borders.color,
        },
      },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: this.theme.scrollbar.show ? {
        ch: ' ',
        style: {
          bg: this.theme.scrollbar.color,
        },
        track: {
          bg: 'gray',
        },
      } : undefined,
      mouse: true,
      keys: true,
      vi: true,
      ...options,
    });

    return box;
  }

  public createScrollableText(
    parent: blessed.Widgets.Node,
    content: string,
    options?: Partial<blessed.Widgets.ScrollableTextOptions>
  ): blessed.Widgets.ScrollableTextElement {
    return blessed.scrollabletext({
      parent,
      content,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: this.theme.scrollbar.show ? {
        ch: ' ',
        style: {
          bg: this.theme.scrollbar.color,
        },
        track: {
          bg: 'gray',
        },
      } : undefined,
      mouse: true,
      keys: true,
      vi: true,
      style: {
        bg: this.theme.colors.background,
      },
      ...options,
    });
  }

  public createList(
    parent: blessed.Widgets.Node,
    items: string[],
    options?: any
  ): blessed.Widgets.ListElement {
    return blessed.list({
      parent,
      items,
      scrollable: true,
      keys: true,
      vi: true,
      mouse: true,
      style: {
        bg: this.theme.colors.background,
        selected: {
          bg: this.theme.colors.highlight,
          fg: 'black',
        },
        item: {
          hover: {
            bg: 'gray',
          },
        },
      },
      scrollbar: this.theme.scrollbar.show ? {
        ch: ' ',
        style: {
          bg: this.theme.scrollbar.color,
        },
        track: {
          bg: 'gray',
        },
      } : undefined,
      ...options,
    });
  }

  public getScreen(): blessed.Widgets.Screen {
    return this.screen;
  }

  public getLayout(): MatrixLayout {
    return this.layout;
  }

  public getDimensions(): TerminalDimensions {
    return this.dimensions;
  }

  public getTheme(): LayoutTheme {
    return this.theme;
  }

  public render(): void {
    this.screen.render();
  }

  public destroy(): void {
    this.screen.destroy();
  }

  public focus(element: any): void {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }

  public addGlobalKeyHandler(keys: string[], handler: () => void): void {
    this.screen.key(keys, handler);
  }

  public setTitle(title: string): void {
    this.screen.title = title;
  }

  public showMessage(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const colors = {
      info: 'blue',
      success: 'green',
      warning: 'yellow',
      error: 'red',
    };

    const messageBox = blessed.message({
      parent: this.screen,
      border: 'line',
      height: 'shrink',
      width: Math.min(60, this.dimensions.width - 4),
      top: 'center',
      left: 'center',
      style: {
        border: {
          fg: colors[type],
        },
      },
    });

    messageBox.display(message, () => {
      messageBox.destroy();
      this.render();
    });
  }
}
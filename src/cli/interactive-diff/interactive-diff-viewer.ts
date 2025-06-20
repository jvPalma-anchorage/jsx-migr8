/**********************************************************************
 *  src/cli/interactive-diff/interactive-diff-viewer.ts – Main interactive diff viewer
 *********************************************************************/

import * as blessed from 'blessed';
import chalk from 'chalk';
import { QuadrantContent, LayoutTheme, DiffContent, RuleInfo } from './types';
import { TerminalLayoutManager } from './layout-manager';
import { DiffFormatter } from './diff-formatter';
import { 
  OldCodeQuadrant, 
  NewCodeQuadrant, 
  InteractiveMenuQuadrant, 
  RuleInfoQuadrant 
} from './quadrant-managers';
import { KeyboardHandler } from './keyboard-handler';

export interface InteractiveDiffResult {
  action: 'confirm' | 'needs-adjust' | 'stop' | 'quit';
  content: QuadrantContent;
}

export class InteractiveDiffViewer {
  private layoutManager: TerminalLayoutManager;
  private formatter: DiffFormatter;
  private quadrants!: {
    oldCode: OldCodeQuadrant;
    newCode: NewCodeQuadrant;
    menu: InteractiveMenuQuadrant;
    ruleInfo: RuleInfoQuadrant;
  };
  private keyboardHandler!: KeyboardHandler;
  private currentContent?: QuadrantContent;
  private isActive: boolean = false;
  private resultPromise?: Promise<InteractiveDiffResult>;
  private resolveResult?: (result: InteractiveDiffResult) => void;

  constructor(theme?: Partial<LayoutTheme>) {
    this.layoutManager = new TerminalLayoutManager(theme);
    this.formatter = new DiffFormatter(this.layoutManager.getTheme().colors);
    
    this.initializeQuadrants();
    this.setupKeyboardHandler();
    this.setupTitle();
  }

  private initializeQuadrants(): void {
    const screen = this.layoutManager.getScreen();
    const layout = this.layoutManager.getLayout();

    // Create quadrants with proper positioning
    this.quadrants = {
      oldCode: new OldCodeQuadrant(screen, this.formatter),
      newCode: new NewCodeQuadrant(screen, this.formatter),
      menu: new InteractiveMenuQuadrant(screen),
      ruleInfo: new RuleInfoQuadrant(screen),
    };

    // Position quadrants
    this.positionQuadrants();
  }

  private positionQuadrants(): void {
    const layout = this.layoutManager.getLayout();

    // Position old code quadrant (top left)
    const oldCodeBox = this.quadrants.oldCode.getBox();
    oldCodeBox.left = layout.topLeft.x;
    oldCodeBox.top = layout.topLeft.y;
    oldCodeBox.width = layout.topLeft.width;
    oldCodeBox.height = layout.topLeft.height;

    // Position new code quadrant (top right)
    const newCodeBox = this.quadrants.newCode.getBox();
    newCodeBox.left = layout.topRight.x;
    newCodeBox.top = layout.topRight.y;
    newCodeBox.width = layout.topRight.width;
    newCodeBox.height = layout.topRight.height;

    // Position menu quadrant (bottom left)
    const menuBox = this.quadrants.menu.getBox();
    menuBox.left = layout.bottomLeft.x;
    menuBox.top = layout.bottomLeft.y;
    menuBox.width = layout.bottomLeft.width;
    menuBox.height = layout.bottomLeft.height;

    // Position rule info quadrant (bottom right)
    const ruleInfoBox = this.quadrants.ruleInfo.getBox();
    ruleInfoBox.left = layout.bottomRight.x;
    ruleInfoBox.top = layout.bottomRight.y;
    ruleInfoBox.width = layout.bottomRight.width;
    ruleInfoBox.height = layout.bottomRight.height;
  }

  private setupKeyboardHandler(): void {
    this.keyboardHandler = new KeyboardHandler(
      this.layoutManager.getScreen(),
      this.quadrants
    );

    // Handle actions from keyboard or menu
    this.keyboardHandler.onAction((action) => {
      this.handleUserAction(action);
    });

    this.quadrants.menu.onSelection((action) => {
      this.handleUserAction(action);
    });
  }

  private setupTitle(): void {
    this.layoutManager.setTitle('jsx-migr8 - Interactive Migration Diff');
  }

  private handleUserAction(action: 'confirm' | 'needs-adjust' | 'stop' | 'quit'): void {
    if (!this.isActive || !this.currentContent || !this.resolveResult) {
      return;
    }

    this.isActive = false;
    
    const result: InteractiveDiffResult = {
      action,
      content: {
        ...this.currentContent,
        status: action === 'confirm' ? 'confirmed' : 
                action === 'needs-adjust' ? 'needs-adjust' : 'stopped',
      },
    };

    this.resolveResult(result);
  }

  public async showDiff(content: QuadrantContent): Promise<InteractiveDiffResult> {
    this.currentContent = content;
    this.isActive = true;

    return new Promise<InteractiveDiffResult>((resolve) => {
      this.resolveResult = resolve;
      
      // Update all quadrants with new content
      this.updateContent(content);
      
      // Reset menu state
      this.quadrants.menu.reset();
      
      // Set focus to menu by default
      this.keyboardHandler.setMenuAsDefault();
      
      // Show the interface
      this.show();
    });
  }

  private updateContent(content: QuadrantContent): void {
    // Update old code quadrant
    this.quadrants.oldCode.updateContent(content.oldDiff);
    
    // Update new code quadrant
    this.quadrants.newCode.updateContent(content.newDiff);
    
    // Update rule info quadrant
    this.quadrants.ruleInfo.updateContent(content.ruleInfo);
    
    // Update menu status
    const statusMessage = this.getStatusMessage(content);
    this.quadrants.menu.updateStatus(statusMessage);
  }

  private getStatusMessage(content: QuadrantContent): string {
    const { ruleInfo } = content;
    return `Migrating ${ruleInfo.componentName} from ${ruleInfo.sourcePackage} to ${ruleInfo.targetPackage}`;
  }

  private show(): void {
    this.layoutManager.render();
  }

  public hide(): void {
    this.isActive = false;
    // Clear the screen or hide the interface
    this.layoutManager.getScreen().clearRegion(0, 0, 
      this.layoutManager.getDimensions().width, 
      this.layoutManager.getDimensions().height
    );
    this.layoutManager.render();
  }

  public destroy(): void {
    this.isActive = false;
    this.layoutManager.destroy();
  }

  public showMessage(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    this.layoutManager.showMessage(message, type);
  }

  public isCurrentlyActive(): boolean {
    return this.isActive;
  }

  public getCurrentContent(): QuadrantContent | undefined {
    return this.currentContent;
  }

  // Static helper method to create diff content
  public static createDiffContent(
    oldCode: string,
    newCode: string,
    fileName: string,
    lineOffset?: number
  ): DiffContent {
    return {
      oldCode,
      newCode,
      fileName,
      lineOffset,
    };
  }

  // Static helper method to create rule info
  public static createRuleInfo(
    name: string,
    description: string,
    sourcePackage: string,
    targetPackage: string,
    componentName: string,
    propsChanged: string[] = [],
    importsChanged: string[] = []
  ): RuleInfo {
    return {
      name,
      description,
      sourcePackage,
      targetPackage,
      componentName,
      propsChanged,
      importsChanged,
    };
  }

  // Static helper method to create complete quadrant content
  public static createQuadrantContent(
    oldDiff: DiffContent,
    newDiff: DiffContent,
    ruleInfo: RuleInfo,
    status: 'pending' | 'confirmed' | 'needs-adjust' | 'stopped' = 'pending'
  ): QuadrantContent {
    return {
      oldDiff,
      newDiff,
      ruleInfo,
      status,
    };
  }

  // Method to handle multiple diffs in sequence
  public async showMultipleDiffs(contents: QuadrantContent[]): Promise<InteractiveDiffResult[]> {
    const results: InteractiveDiffResult[] = [];
    
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      
      // Update menu to show progress
      this.quadrants.menu.updateStatus(
        `Processing ${i + 1} of ${contents.length}: ${content.ruleInfo.componentName}`,
        'info'
      );
      
      try {
        const result = await this.showDiff(content);
        results.push(result);
        
        // If user chose to stop, break the loop
        if (result.action === 'stop' || result.action === 'quit') {
          break;
        }
        
        // Show brief success message for confirmed changes
        if (result.action === 'confirm') {
          this.showMessage('✅ Change confirmed!', 'success');
          // Brief pause to show the message
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        // Handle any errors gracefully
        this.showMessage('❌ Error processing diff', 'error');
        console.error('Error in showDiff:', error);
        break;
      }
    }
    
    return results;
  }

  // Method to get summary of results
  public static getSummary(results: InteractiveDiffResult[]): {
    confirmed: number;
    needsAdjust: number;
    stopped: number;
    total: number;
  } {
    const summary = {
      confirmed: 0,
      needsAdjust: 0,
      stopped: 0,
      total: results.length,
    };

    results.forEach(result => {
      switch (result.action) {
        case 'confirm':
          summary.confirmed++;
          break;
        case 'needs-adjust':
          summary.needsAdjust++;
          break;
        case 'stop':
        case 'quit':
          summary.stopped++;
          break;
      }
    });

    return summary;
  }
}
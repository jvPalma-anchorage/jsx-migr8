/**
 * Interactive Diff Review System for jsx-migr8
 * 
 * Provides an interactive interface for users to review and confirm
 * file transformations one by one during the migration process.
 */

import { readFileSync } from "node:fs";
import { default as chalk } from "chalk";
import { input, select, confirm } from "@inquirer/prompts";
import { makeDiff } from "../../utils/diff";
import { secureSelect, secureConfirmationInput } from "../secure-prompts";
import { logSecurityEvent } from "../../validation";
import { lSuccess, lError, lWarning } from "../../context/globalContext";

export interface FileTransformation {
  filePath: string;
  originalCode: string;
  transformedCode: string;
  componentName: string;
  elementCount: number;
  migrationRuleName?: string;
}

export interface ReviewDecision {
  action: 'confirm' | 'needs-adjust' | 'stop';
  filePath: string;
  timestamp: Date;
  reason?: string;
}

export interface ReviewSession {
  id: string;
  transformations: FileTransformation[];
  decisions: ReviewDecision[];
  currentIndex: number;
  startTime: Date;
  sessionState: 'active' | 'completed' | 'stopped';
}

export interface ReviewOptions {
  showDiffContext?: number;
  allowNavigation?: boolean;
  autoSave?: boolean;
  confirmBeforeStop?: boolean;
  maxHistorySize?: number;
}

export class InteractiveDiffReviewer {
  private session: ReviewSession;
  private options: ReviewOptions;
  private navigationHistory: number[] = [];

  constructor(
    transformations: FileTransformation[],
    options: ReviewOptions = {}
  ) {
    this.session = {
      id: this.generateSessionId(),
      transformations,
      decisions: [],
      currentIndex: 0,
      startTime: new Date(),
      sessionState: 'active'
    };

    this.options = {
      showDiffContext: 3,
      allowNavigation: true,
      autoSave: true,
      confirmBeforeStop: true,
      maxHistorySize: 50,
      ...options
    };

    logSecurityEvent(
      'interactive-diff-session-start',
      'info',
      'Interactive diff review session started',
      { 
        sessionId: this.session.id,
        transformationCount: transformations.length
      }
    );
  }

  /**
   * Start the interactive review process
   */
  async startReview(): Promise<ReviewSession> {
    console.log(chalk.cyan('\n🔍 Interactive Migration Review'));
    console.log(chalk.gray(`Session ID: ${this.session.id}`));
    console.log(chalk.gray(`Total files to review: ${this.session.transformations.length}\n`));

    try {
      while (this.session.currentIndex < this.session.transformations.length && 
             this.session.sessionState === 'active') {
        
        const currentTransformation = this.session.transformations[this.session.currentIndex];
        const decision = await this.reviewFile(currentTransformation);
        
        this.session.decisions.push(decision);
        
        if (decision.action === 'stop') {
          await this.handleStop();
          break;
        }
        
        if (decision.action === 'confirm') {
          this.navigationHistory.push(this.session.currentIndex);
          this.session.currentIndex++;
        } else if (decision.action === 'needs-adjust') {
          this.navigationHistory.push(this.session.currentIndex);
          this.session.currentIndex++;
        }
        
        // Limit navigation history size
        if (this.navigationHistory.length > (this.options.maxHistorySize || 50)) {
          this.navigationHistory.shift();
        }
      }

      if (this.session.currentIndex >= this.session.transformations.length) {
        this.session.sessionState = 'completed';
        await this.showFinalSummary();
      }

    } catch (error) {
      lError('Error during interactive review:', error as any);
      this.session.sessionState = 'stopped';
      
      logSecurityEvent(
        'interactive-diff-session-error',
        'error',
        'Interactive diff review session encountered an error',
        { 
          sessionId: this.session.id,
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }

    return this.session;
  }

  /**
   * Review a single file transformation
   */
  private async reviewFile(transformation: FileTransformation): Promise<ReviewDecision> {
    const { filePath, originalCode, transformedCode, componentName, elementCount } = transformation;
    
    // Clear screen and show header
    console.clear();
    this.showProgressHeader();
    
    // Show file information
    console.log(chalk.yellow(`📄 File: ${filePath}`));
    console.log(chalk.blue(`🔧 Component: ${componentName}`));
    console.log(chalk.green(`📊 Changes: ${elementCount} element(s) affected`));
    
    if (transformation.migrationRuleName) {
      console.log(chalk.magenta(`📋 Rule: ${transformation.migrationRuleName}`));
    }
    
    console.log(chalk.gray('─'.repeat(80)));
    
    // Show diff
    try {
      const diff = makeDiff(filePath, originalCode, transformedCode, this.options.showDiffContext);
      console.log(diff);
    } catch (error) {
      lWarning(`Failed to generate diff for ${filePath}:`, error as any);
      console.log(chalk.red('⚠️  Unable to display diff - proceeding with text comparison'));
      
      // Fallback to simple before/after
      console.log(chalk.red('--- BEFORE ---'));
      console.log(originalCode.substring(0, 500) + (originalCode.length > 500 ? '...' : ''));
      console.log(chalk.green('--- AFTER ---'));
      console.log(transformedCode.substring(0, 500) + (transformedCode.length > 500 ? '...' : ''));
    }
    
    console.log(chalk.gray('─'.repeat(80)));
    
    // Get user decision
    const action = await this.promptForAction();
    
    let reason: string | undefined;
    if (action === 'needs-adjust') {
      reason = await this.promptForReason();
    }
    
    const decision: ReviewDecision = {
      action,
      filePath,
      timestamp: new Date(),
      reason
    };

    logSecurityEvent(
      'interactive-diff-file-decision',
      'info',
      'User made decision on file transformation',
      { 
        sessionId: this.session.id,
        filePath,
        action,
        hasReason: !!reason
      }
    );

    return decision;
  }

  /**
   * Show progress header with navigation info
   */
  private showProgressHeader(): void {
    const current = this.session.currentIndex + 1;
    const total = this.session.transformations.length;
    const percentage = Math.round((current / total) * 100);
    
    console.log(chalk.cyan(`\n🔍 Interactive Migration Review`));
    console.log(chalk.gray(`Progress: ${current}/${total} (${percentage}%)`));
    
    // Show progress bar
    const barLength = 30;
    const filledLength = Math.round((current / total) * barLength);
    const progressBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    console.log(chalk.blue(`[${progressBar}]`));
    
    if (this.options.allowNavigation && this.navigationHistory.length > 0) {
      console.log(chalk.gray(`Navigation: ${this.navigationHistory.length} files in history`));
    }
    
    console.log();
  }

  /**
   * Prompt user for action decision
   */
  private async promptForAction(): Promise<'confirm' | 'needs-adjust' | 'stop'> {
    const choices = [
      {
        name: `${chalk.green('✅ Confirm')} - Apply this change and continue`,
        value: 'confirm' as const,
        description: 'Accept this transformation and move to the next file'
      },
      {
        name: `${chalk.yellow('⚠️  Needs Adjust')} - Skip this change and mark for manual review`,
        value: 'needs-adjust' as const,
        description: 'Skip this file and mark it for manual adjustment later'
      }
    ];

    // Add navigation options if enabled and available
    if (this.options.allowNavigation && this.navigationHistory.length > 0) {
      choices.push({
        name: `${chalk.blue('⬅️  Go Back')} - Return to previous file`,
        value: 'go-back' as const,
        description: 'Navigate back to the previously reviewed file'
      });
    }

    choices.push({
      name: `${chalk.red('🛑 Stop')} - Halt the migration process`,
      value: 'stop' as const,
      description: 'Stop the review process and exit'
    });

    const action = await secureSelect({
      message: 'What would you like to do with this change?',
      choices
    });

    if (action === 'go-back') {
      await this.handleGoBack();
      return this.promptForAction(); // Recurse after navigation
    }

    return action;
  }

  /**
   * Handle navigation back to previous file
   */
  private async handleGoBack(): Promise<void> {
    if (this.navigationHistory.length === 0) {
      lWarning('No previous files to navigate back to');
      return;
    }

    const previousIndex = this.navigationHistory.pop()!;
    
    // Remove the decision for the file we're going back to
    this.session.decisions = this.session.decisions.filter(
      decision => decision.filePath !== this.session.transformations[previousIndex].filePath
    );
    
    this.session.currentIndex = previousIndex;
    
    logSecurityEvent(
      'interactive-diff-navigation-back',
      'info',
      'User navigated back to previous file',
      { 
        sessionId: this.session.id,
        targetIndex: previousIndex
      }
    );
  }

  /**
   * Prompt for reason when user selects "needs adjust"
   */
  private async promptForReason(): Promise<string> {
    const reason = await input({
      message: 'Why does this change need adjustment? (optional)',
      validate: (value: string) => {
        if (value.length > 500) {
          return 'Reason must be less than 500 characters';
        }
        return true;
      }
    });

    return reason.trim();
  }

  /**
   * Handle stop action
   */
  private async handleStop(): Promise<void> {
    if (this.options.confirmBeforeStop) {
      const shouldStop = await confirm({
        message: 'Are you sure you want to stop the migration review?',
        default: false
      });

      if (!shouldStop) {
        return;
      }
    }

    this.session.sessionState = 'stopped';
    
    console.log(chalk.yellow('\n🛑 Migration review stopped by user'));
    await this.showCurrentSummary();

    logSecurityEvent(
      'interactive-diff-session-stopped',
      'info',
      'Interactive diff review session stopped by user',
      { 
        sessionId: this.session.id,
        reviewedCount: this.session.decisions.length,
        totalCount: this.session.transformations.length
      }
    );
  }

  /**
   * Show final summary when review is complete
   */
  private async showFinalSummary(): Promise<void> {
    console.clear();
    console.log(chalk.green('\n🎉 Migration Review Complete!'));
    console.log(chalk.gray('─'.repeat(50)));
    
    const confirmed = this.session.decisions.filter(d => d.action === 'confirm').length;
    const needsAdjust = this.session.decisions.filter(d => d.action === 'needs-adjust').length;
    const total = this.session.transformations.length;
    
    console.log(chalk.green(`✅ Confirmed changes: ${confirmed}`));
    console.log(chalk.yellow(`⚠️  Need adjustment: ${needsAdjust}`));
    console.log(chalk.blue(`📊 Total reviewed: ${total}`));
    
    const duration = Date.now() - this.session.startTime.getTime();
    console.log(chalk.gray(`⏱️  Review duration: ${this.formatDuration(duration)}`));
    
    // Show files that need adjustment
    const adjustmentFiles = this.session.decisions.filter(d => d.action === 'needs-adjust');
    if (adjustmentFiles.length > 0) {
      console.log(chalk.yellow('\n📝 Files marked for manual adjustment:'));
      adjustmentFiles.forEach(decision => {
        console.log(chalk.yellow(`   • ${decision.filePath}`));
        if (decision.reason) {
          console.log(chalk.gray(`     Reason: ${decision.reason}`));
        }
      });
    }
    
    console.log(chalk.gray('\n─'.repeat(50)));
    
    // Ask user what to do next
    const nextAction = await secureSelect({
      message: 'What would you like to do next?',
      choices: [
        {
          name: 'Apply confirmed changes',
          value: 'apply',
          description: 'Apply all confirmed transformations to files'
        },
        {
          name: 'Review summary and exit',
          value: 'exit',
          description: 'Exit without applying changes'
        },
        {
          name: 'Export review session',
          value: 'export',
          description: 'Save review decisions to a file'
        }
      ]
    });
    
    if (nextAction === 'export') {
      await this.exportSession();
    }
  }

  /**
   * Show current summary (used when stopping mid-review)
   */
  private async showCurrentSummary(): Promise<void> {
    const reviewed = this.session.decisions.length;
    const total = this.session.transformations.length;
    const confirmed = this.session.decisions.filter(d => d.action === 'confirm').length;
    const needsAdjust = this.session.decisions.filter(d => d.action === 'needs-adjust').length;
    
    console.log(chalk.blue('\n📊 Current Review Status:'));
    console.log(chalk.gray('─'.repeat(30)));
    console.log(chalk.blue(`📈 Progress: ${reviewed}/${total} files reviewed`));
    console.log(chalk.green(`✅ Confirmed: ${confirmed}`));
    console.log(chalk.yellow(`⚠️  Need adjustment: ${needsAdjust}`));
    console.log(chalk.red(`⏸️  Remaining: ${total - reviewed}`));
  }

  /**
   * Export session data to a file
   */
  private async exportSession(): Promise<void> {
    const exportData = {
      sessionId: this.session.id,
      startTime: this.session.startTime,
      endTime: new Date(),
      decisions: this.session.decisions,
      summary: {
        total: this.session.transformations.length,
        reviewed: this.session.decisions.length,
        confirmed: this.session.decisions.filter(d => d.action === 'confirm').length,
        needsAdjust: this.session.decisions.filter(d => d.action === 'needs-adjust').length
      }
    };

    const filename = `migration-review-${this.session.id}.json`;
    
    try {
      const fs = require('fs');
      fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
      lSuccess(`Review session exported to: ${filename}`);
    } catch (error) {
      lError('Failed to export session:', error as any);
    }
  }

  /**
   * Get files that were confirmed for transformation
   */
  getConfirmedTransformations(): FileTransformation[] {
    const confirmedPaths = this.session.decisions
      .filter(decision => decision.action === 'confirm')
      .map(decision => decision.filePath);
    
    return this.session.transformations.filter(
      transformation => confirmedPaths.includes(transformation.filePath)
    );
  }

  /**
   * Get files that need manual adjustment
   */
  getFilesNeedingAdjustment(): Array<{ transformation: FileTransformation; reason?: string }> {
    const adjustmentDecisions = this.session.decisions.filter(d => d.action === 'needs-adjust');
    
    return adjustmentDecisions.map(decision => ({
      transformation: this.session.transformations.find(t => t.filePath === decision.filePath)!,
      reason: decision.reason
    }));
  }

  /**
   * Get current session state
   */
  getSession(): ReviewSession {
    return this.session;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

/**
 * Utility function to create FileTransformation from migration data
 */
export function createFileTransformation(
  fileAbsPath: string,
  fileCompleteData: any,
  migrationRuleName?: string
): FileTransformation {
  const { codeCompare, elements, importNode } = fileCompleteData;
  
  return {
    filePath: fileAbsPath,
    originalCode: codeCompare?.old || '',
    transformedCode: codeCompare?.ast ? require('recast').print(codeCompare.ast).code : '',
    componentName: importNode?.local || importNode?.imported || 'Unknown',
    elementCount: elements?.length || 0,
    migrationRuleName
  };
}

/**
 * Main entry point for interactive diff review
 */
export async function startInteractiveDiffReview(
  transformations: FileTransformation[],
  options?: ReviewOptions
): Promise<{
  confirmedTransformations: FileTransformation[];
  filesNeedingAdjustment: Array<{ transformation: FileTransformation; reason?: string }>;
  session: ReviewSession;
}> {
  if (transformations.length === 0) {
    lWarning('No transformations to review');
    return {
      confirmedTransformations: [],
      filesNeedingAdjustment: [],
      session: {
        id: 'empty',
        transformations: [],
        decisions: [],
        currentIndex: 0,
        startTime: new Date(),
        sessionState: 'completed'
      }
    };
  }

  const reviewer = new InteractiveDiffReviewer(transformations, options);
  const session = await reviewer.startReview();
  
  return {
    confirmedTransformations: reviewer.getConfirmedTransformations(),
    filesNeedingAdjustment: reviewer.getFilesNeedingAdjustment(),
    session
  };
}
/**********************************************************************
 *  src/cli/interactive-diff/migration-integration.ts – Integration with jsx-migr8 migration
 *********************************************************************/

import { InteractiveDiffViewer } from './interactive-diff-viewer';
import { QuadrantContent, DiffContent, RuleInfo } from './types';
import chalk from 'chalk';

const darkTheme = {
  colors: {
    added: 'brightGreen',
    removed: 'brightRed',
    modified: 'brightYellow',
    lineNumber: 'brightBlue',
    background: 'black',
    border: 'gray',
    highlight: 'brightCyan',
  },
  borders: {
    style: 'rounded' as const,
    color: 'gray',
  },
  scrollbar: {
    show: true,
    color: 'brightBlack',
  },
};

/**
 * Integration interface for jsx-migr8 migration results
 */
export interface MigrationCandidate {
  filePath: string;
  originalContent: string;
  migratedContent: string;
  ruleName: string;
  ruleDescription: string;
  sourcePackage: string;
  targetPackage: string;
  componentName: string;
  propsChanged: string[];
  importsChanged: string[];
  lineNumber?: number;
}

/**
 * Result of interactive migration process
 */
export interface InteractiveMigrationResult {
  confirmed: MigrationCandidate[];
  needsAdjustment: MigrationCandidate[];
  skipped: MigrationCandidate[];
  totalProcessed: number;
  userQuit: boolean;
}

/**
 * Interactive migration processor that integrates with jsx-migr8
 */
export class InteractiveMigrationProcessor {
  private viewer: InteractiveDiffViewer;
  private results: InteractiveMigrationResult;

  constructor() {
    this.viewer = new InteractiveDiffViewer(darkTheme);
    this.results = {
      confirmed: [],
      needsAdjustment: [],
      skipped: [],
      totalProcessed: 0,
      userQuit: false,
    };
  }

  /**
   * Process migration candidates interactively
   */
  public async processMigrations(candidates: MigrationCandidate[]): Promise<InteractiveMigrationResult> {
    console.log(chalk.blue(`\n🚀 Starting interactive migration for ${candidates.length} candidates...\n`));
    
    try {
      // Convert candidates to quadrant content
      const contents = candidates.map(candidate => this.createQuadrantContent(candidate));
      
      // Process each migration interactively
      const diffResults = await this.viewer.showMultipleDiffs(contents);
      
      // Process results
      for (let i = 0; i < diffResults.length; i++) {
        const result = diffResults[i];
        const candidate = candidates[i];
        
        switch (result.action) {
          case 'confirm':
            this.results.confirmed.push(candidate);
            break;
          case 'needs-adjust':
            this.results.needsAdjustment.push(candidate);
            break;
          case 'stop':
          case 'quit':
            this.results.skipped.push(...candidates.slice(i));
            this.results.userQuit = result.action === 'quit';
            break;
        }
        
        this.results.totalProcessed = i + 1;
        
        // Break if user stopped or quit
        if (result.action === 'stop' || result.action === 'quit') {
          break;
        }
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error during interactive migration:'), error);
    } finally {
      this.cleanup();
    }
    
    return this.results;
  }

  /**
   * Process a single migration candidate
   */
  public async processSingleMigration(candidate: MigrationCandidate): Promise<'confirm' | 'needs-adjust' | 'stop' | 'quit'> {
    const content = this.createQuadrantContent(candidate);
    
    try {
      const result = await this.viewer.showDiff(content);
      return result.action;
    } catch (error) {
      console.error(chalk.red('❌ Error during single migration:'), error);
      return 'stop';
    }
  }

  /**
   * Convert MigrationCandidate to QuadrantContent
   */
  private createQuadrantContent(candidate: MigrationCandidate): QuadrantContent {
    const oldDiff: DiffContent = {
      oldCode: candidate.originalContent,
      newCode: candidate.originalContent,
      fileName: candidate.filePath,
      lineOffset: candidate.lineNumber,
    };

    const newDiff: DiffContent = {
      oldCode: candidate.originalContent,
      newCode: candidate.migratedContent,
      fileName: candidate.filePath,
      lineOffset: candidate.lineNumber,
    };

    const ruleInfo: RuleInfo = {
      name: candidate.ruleName,
      description: candidate.ruleDescription,
      sourcePackage: candidate.sourcePackage,
      targetPackage: candidate.targetPackage,
      componentName: candidate.componentName,
      propsChanged: candidate.propsChanged,
      importsChanged: candidate.importsChanged,
    };

    return {
      oldDiff,
      newDiff,
      ruleInfo,
      status: 'pending',
    };
  }

  /**
   * Show summary of migration results
   */
  public showSummary(): void {
    const { confirmed, needsAdjustment, skipped, totalProcessed, userQuit } = this.results;
    
    console.log(chalk.blue('\n📊 Interactive Migration Summary'));
    console.log(chalk.blue(''.padEnd(40, '=')));
    
    console.log(chalk.green(`✅ Confirmed: ${confirmed.length}`));
    confirmed.forEach(candidate => {
      console.log(chalk.gray(`   ${candidate.filePath} - ${candidate.componentName}`));
    });
    
    console.log(chalk.yellow(`🔧 Needs Adjustment: ${needsAdjustment.length}`));
    needsAdjustment.forEach(candidate => {
      console.log(chalk.gray(`   ${candidate.filePath} - ${candidate.componentName}`));
    });
    
    if (skipped.length > 0) {
      console.log(chalk.red(`⏭️  Skipped: ${skipped.length}`));
      skipped.forEach(candidate => {
        console.log(chalk.gray(`   ${candidate.filePath} - ${candidate.componentName}`));
      });
    }
    
    console.log(chalk.blue(`\n📈 Total Processed: ${totalProcessed}`));
    
    if (userQuit) {
      console.log(chalk.yellow('⚠️  Migration interrupted by user'));
    }
  }

  /**
   * Get migration candidates that need manual adjustment
   */
  public getCandidatesNeedingAdjustment(): MigrationCandidate[] {
    return this.results.needsAdjustment;
  }

  /**
   * Get confirmed migration candidates
   */
  public getConfirmedCandidates(): MigrationCandidate[] {
    return this.results.confirmed;
  }

  /**
   * Check if user quit the process
   */
  public didUserQuit(): boolean {
    return this.results.userQuit;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.viewer.destroy();
  }

  /**
   * Static method to create a migration candidate from jsx-migr8 internal data
   */
  public static createMigrationCandidate(
    filePath: string,
    originalContent: string,
    migratedContent: string,
    migrationRule: {
      name: string;
      description: string;
      sourcePackage: string;
      targetPackage: string;
      componentName: string;
      propsChanged?: string[];
      importsChanged?: string[];
    },
    lineNumber?: number
  ): MigrationCandidate {
    return {
      filePath,
      originalContent,
      migratedContent,
      ruleName: migrationRule.name,
      ruleDescription: migrationRule.description,
      sourcePackage: migrationRule.sourcePackage,
      targetPackage: migrationRule.targetPackage,
      componentName: migrationRule.componentName,
      propsChanged: migrationRule.propsChanged || [],
      importsChanged: migrationRule.importsChanged || [],
      lineNumber,
    };
  }
}

/**
 * Helper function to integrate with existing jsx-migr8 dry run process
 */
export async function runInteractiveDryRun(
  migrationCandidates: MigrationCandidate[]
): Promise<InteractiveMigrationResult> {
  const processor = new InteractiveMigrationProcessor();
  
  console.log(chalk.cyan('🔍 Starting interactive dry run...'));
  console.log(chalk.gray('Use Tab to navigate, h for help, y/n/s for actions'));
  
  const results = await processor.processMigrations(migrationCandidates);
  
  processor.showSummary();
  
  return results;
}

/**
 * Helper function to confirm migrations before applying them
 */
export async function confirmMigrations(
  migrationCandidates: MigrationCandidate[]
): Promise<MigrationCandidate[]> {
  console.log(chalk.yellow('\n⚠️  MIGRATION CONFIRMATION'));
  console.log(chalk.yellow('Review each change before applying to your files'));
  
  const processor = new InteractiveMigrationProcessor();
  const results = await processor.processMigrations(migrationCandidates);
  
  if (results.userQuit) {
    console.log(chalk.red('❌ Migration cancelled by user'));
    return [];
  }
  
  const confirmedCandidates = results.confirmed;
  
  if (confirmedCandidates.length === 0) {
    console.log(chalk.yellow('⚠️  No changes confirmed for migration'));
    return [];
  }
  
  console.log(chalk.green(`✅ ${confirmedCandidates.length} changes confirmed for migration`));
  
  return confirmedCandidates;
}
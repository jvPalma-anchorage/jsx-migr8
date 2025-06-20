/**
 * Navigation Controls for Interactive Diff Review
 * 
 * Provides advanced navigation capabilities including:
 * - Forward/backward navigation
 * - Jump to specific files
 * - Bookmarking system
 * - Search functionality
 */

import { default as chalk } from "chalk";
import { select, input } from "@inquirer/prompts";
import { FileTransformation, ReviewDecision, ReviewSession } from "./review-system";
import { secureSelect, secureInput } from "../secure-prompts";
import { lSuccess, lError, lWarning } from "../../context/globalContext";
import { logSecurityEvent } from "../../validation";

export interface NavigationBookmark {
  id: string;
  fileIndex: number;
  filePath: string;
  note?: string;
  timestamp: Date;
}

export interface NavigationState {
  currentIndex: number;
  history: number[];
  bookmarks: NavigationBookmark[];
  searchResults: number[];
  lastSearch?: string;
}

export class NavigationController {
  private state: NavigationState;
  private session: ReviewSession;
  private maxHistorySize: number;

  constructor(session: ReviewSession, maxHistorySize: number = 50) {
    this.session = session;
    this.maxHistorySize = maxHistorySize;
    this.state = {
      currentIndex: session.currentIndex,
      history: [],
      bookmarks: [],
      searchResults: [],
    };
  }

  /**
   * Navigate to a specific file index
   */
  async navigateTo(targetIndex: number): Promise<boolean> {
    if (targetIndex < 0 || targetIndex >= this.session.transformations.length) {
      lWarning(`Invalid navigation target: ${targetIndex}`);
      return false;
    }

    // Add current position to history before navigating
    if (this.state.currentIndex !== targetIndex) {
      this.addToHistory(this.state.currentIndex);
    }

    this.state.currentIndex = targetIndex;
    this.session.currentIndex = targetIndex;

    logSecurityEvent(
      'navigation-jump',
      'info',
      'User navigated to specific file',
      { fromIndex: this.state.currentIndex, toIndex: targetIndex }
    );

    return true;
  }

  /**
   * Navigate back to previous file
   */
  async goBack(): Promise<boolean> {
    if (this.state.history.length === 0) {
      lWarning('No previous files in navigation history');
      return false;
    }

    const previousIndex = this.state.history.pop()!;
    
    // Remove any decisions made for the file we're going back to
    this.session.decisions = this.session.decisions.filter(
      decision => {
        const fileIndex = this.session.transformations.findIndex(
          t => t.filePath === decision.filePath
        );
        return fileIndex < previousIndex;
      }
    );

    this.state.currentIndex = previousIndex;
    this.session.currentIndex = previousIndex;

    logSecurityEvent(
      'navigation-back',
      'info',
      'User navigated back to previous file',
      { targetIndex: previousIndex, historySize: this.state.history.length }
    );

    return true;
  }

  /**
   * Navigate forward (if possible)
   */
  async goForward(): Promise<boolean> {
    const nextIndex = this.state.currentIndex + 1;
    
    if (nextIndex >= this.session.transformations.length) {
      lWarning('Already at the last file');
      return false;
    }

    return this.navigateTo(nextIndex);
  }

  /**
   * Show navigation menu
   */
  async showNavigationMenu(): Promise<'continue' | 'navigate' | 'search' | 'bookmark' | 'help'> {
    const choices = [
      {
        name: `${chalk.blue('👈 Go Back')} - Return to previous file`,
        value: 'back' as const,
        disabled: this.state.history.length === 0
      },
      {
        name: `${chalk.blue('👉 Go Forward')} - Move to next file`,
        value: 'forward' as const,
        disabled: this.state.currentIndex >= this.session.transformations.length - 1
      },
      {
        name: `${chalk.yellow('🔢 Jump to File')} - Navigate to specific file`,
        value: 'jump' as const
      },
      {
        name: `${chalk.green('🔍 Search Files')} - Find files by name or content`,
        value: 'search' as const
      },
      {
        name: `${chalk.magenta('🔖 Bookmarks')} - Manage bookmarked files`,
        value: 'bookmark' as const
      },
      {
        name: `${chalk.cyan('📊 Progress Overview')} - View current progress`,
        value: 'progress' as const
      },
      {
        name: `${chalk.gray('❓ Help')} - Navigation help`,
        value: 'help' as const
      },
      {
        name: `${chalk.blue('↩️  Continue Review')} - Return to file review`,
        value: 'continue' as const
      }
    ];

    console.clear();
    this.showNavigationHeader();

    const action = await secureSelect({
      message: 'Navigation Options:',
      choices
    });

    switch (action) {
      case 'back':
        await this.goBack();
        return 'navigate';
      
      case 'forward':
        await this.goForward();
        return 'navigate';
      
      case 'jump':
        await this.showJumpToFileMenu();
        return 'navigate';
      
      case 'search':
        await this.showSearchMenu();
        return 'search';
      
      case 'bookmark':
        await this.showBookmarkMenu();
        return 'bookmark';
      
      case 'progress':
        await this.showProgressOverview();
        return this.showNavigationMenu(); // Return to navigation menu
      
      case 'help':
        await this.showNavigationHelp();
        return this.showNavigationMenu(); // Return to navigation menu
      
      default:
        return 'continue';
    }
  }

  /**
   * Show jump to file menu
   */
  private async showJumpToFileMenu(): Promise<void> {
    const choices = this.session.transformations.map((transformation, index) => {
      const status = this.getFileStatus(index);
      const statusIcon = this.getStatusIcon(status);
      
      return {
        name: `${statusIcon} ${transformation.filePath} (${transformation.componentName})`,
        value: index,
        description: `${transformation.elementCount} element(s) - ${status}`
      };
    });

    const selectedIndex = await secureSelect({
      message: 'Jump to file:',
      choices
    });

    await this.navigateTo(selectedIndex);
    lSuccess(`Navigated to: ${this.session.transformations[selectedIndex].filePath}`);
  }

  /**
   * Show search menu
   */
  private async showSearchMenu(): Promise<void> {
    const searchType = await secureSelect({
      message: 'Search by:',
      choices: [
        { name: 'File path', value: 'path' },
        { name: 'Component name', value: 'component' },
        { name: 'Files needing adjustment', value: 'needs-adjust' },
        { name: 'Confirmed files', value: 'confirmed' },
        { name: 'Unreviewed files', value: 'unreviewed' }
      ]
    });

    let results: number[] = [];

    switch (searchType) {
      case 'path':
        results = await this.searchByPath();
        break;
      case 'component':
        results = await this.searchByComponent();
        break;
      case 'needs-adjust':
        results = this.searchByStatus('needs-adjust');
        break;
      case 'confirmed':
        results = this.searchByStatus('confirmed');
        break;
      case 'unreviewed':
        results = this.searchByStatus('unreviewed');
        break;
    }

    if (results.length === 0) {
      lWarning('No files found matching your search criteria');
      return;
    }

    await this.showSearchResults(results);
  }

  /**
   * Search files by path
   */
  private async searchByPath(): Promise<number[]> {
    const searchTerm = await secureInput({
      message: 'Enter search term for file path:',
      maxLength: 200,
      allowEmpty: false
    });

    const results: number[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    this.session.transformations.forEach((transformation, index) => {
      if (transformation.filePath.toLowerCase().includes(lowerSearchTerm)) {
        results.push(index);
      }
    });

    this.state.searchResults = results;
    this.state.lastSearch = searchTerm;

    return results;
  }

  /**
   * Search files by component name
   */
  private async searchByComponent(): Promise<number[]> {
    const searchTerm = await secureInput({
      message: 'Enter component name:',
      maxLength: 100,
      allowEmpty: false
    });

    const results: number[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    this.session.transformations.forEach((transformation, index) => {
      if (transformation.componentName.toLowerCase().includes(lowerSearchTerm)) {
        results.push(index);
      }
    });

    this.state.searchResults = results;
    this.state.lastSearch = searchTerm;

    return results;
  }

  /**
   * Search files by review status
   */
  private searchByStatus(status: 'confirmed' | 'needs-adjust' | 'unreviewed'): number[] {
    const results: number[] = [];

    this.session.transformations.forEach((transformation, index) => {
      const fileStatus = this.getFileStatus(index);
      if (fileStatus === status) {
        results.push(index);
      }
    });

    return results;
  }

  /**
   * Show search results
   */
  private async showSearchResults(results: number[]): Promise<void> {
    const choices = results.map(index => {
      const transformation = this.session.transformations[index];
      const status = this.getFileStatus(index);
      const statusIcon = this.getStatusIcon(status);
      
      return {
        name: `${statusIcon} ${transformation.filePath}`,
        value: index,
        description: `Component: ${transformation.componentName} - Status: ${status}`
      };
    });

    choices.push({
      name: chalk.gray('← Back to search'),
      value: -1,
      description: 'Return to search menu'
    });

    const selectedIndex = await secureSelect({
      message: `Search Results (${results.length} found):`,
      choices
    });

    if (selectedIndex >= 0) {
      await this.navigateTo(selectedIndex);
      lSuccess(`Navigated to: ${this.session.transformations[selectedIndex].filePath}`);
    }
  }

  /**
   * Show bookmark menu
   */
  private async showBookmarkMenu(): Promise<void> {
    const action = await secureSelect({
      message: 'Bookmark Actions:',
      choices: [
        { name: 'Add current file to bookmarks', value: 'add' },
        { name: 'Navigate to bookmark', value: 'navigate' },
        { name: 'Manage bookmarks', value: 'manage' }
      ]
    });

    switch (action) {
      case 'add':
        await this.addBookmark();
        break;
      case 'navigate':
        await this.navigateToBookmark();
        break;
      case 'manage':
        await this.manageBookmarks();
        break;
    }
  }

  /**
   * Add current file to bookmarks
   */
  private async addBookmark(): Promise<void> {
    const currentFile = this.session.transformations[this.state.currentIndex];
    
    const note = await secureInput({
      message: 'Add a note for this bookmark (optional):',
      maxLength: 200,
      allowEmpty: true
    });

    const bookmark: NavigationBookmark = {
      id: `bookmark-${Date.now()}`,
      fileIndex: this.state.currentIndex,
      filePath: currentFile.filePath,
      note: note || undefined,
      timestamp: new Date()
    };

    this.state.bookmarks.push(bookmark);
    lSuccess(`Bookmarked: ${currentFile.filePath}`);

    logSecurityEvent(
      'navigation-bookmark-added',
      'info',
      'User added bookmark',
      { filePath: currentFile.filePath, hasNote: !!note }
    );
  }

  /**
   * Navigate to a bookmark
   */
  private async navigateToBookmark(): Promise<void> {
    if (this.state.bookmarks.length === 0) {
      lWarning('No bookmarks available');
      return;
    }

    const choices = this.state.bookmarks.map(bookmark => ({
      name: `${bookmark.filePath}${bookmark.note ? ` (${bookmark.note})` : ''}`,
      value: bookmark,
      description: `Added: ${bookmark.timestamp.toLocaleString()}`
    }));

    const selectedBookmark = await secureSelect({
      message: 'Navigate to bookmark:',
      choices
    });

    await this.navigateTo(selectedBookmark.fileIndex);
    lSuccess(`Navigated to bookmark: ${selectedBookmark.filePath}`);
  }

  /**
   * Manage bookmarks
   */
  private async manageBookmarks(): Promise<void> {
    if (this.state.bookmarks.length === 0) {
      lWarning('No bookmarks to manage');
      return;
    }

    const choices = this.state.bookmarks.map(bookmark => ({
      name: `${bookmark.filePath}${bookmark.note ? ` (${bookmark.note})` : ''}`,
      value: bookmark,
      description: `Added: ${bookmark.timestamp.toLocaleString()}`
    }));

    choices.push({
      name: chalk.red('Clear all bookmarks'),
      value: 'clear-all' as any,
      description: 'Remove all bookmarks'
    });

    const selection = await secureSelect({
      message: 'Select bookmark to remove (or clear all):',
      choices
    });

    if (selection === 'clear-all') {
      this.state.bookmarks = [];
      lSuccess('All bookmarks cleared');
    } else {
      this.state.bookmarks = this.state.bookmarks.filter(b => b.id !== selection.id);
      lSuccess(`Removed bookmark: ${selection.filePath}`);
    }
  }

  /**
   * Show progress overview
   */
  private async showProgressOverview(): Promise<void> {
    const total = this.session.transformations.length;
    const current = this.state.currentIndex + 1;
    const reviewed = this.session.decisions.length;
    const confirmed = this.session.decisions.filter(d => d.action === 'confirm').length;
    const needsAdjust = this.session.decisions.filter(d => d.action === 'needs-adjust').length;
    const remaining = total - reviewed;

    console.clear();
    console.log(chalk.cyan('\n📊 Progress Overview'));
    console.log(chalk.gray('═'.repeat(50)));
    
    // Progress bar
    const percentage = (reviewed / total) * 100;
    const barLength = 30;
    const filledLength = Math.round((reviewed / total) * barLength);
    const progressBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    console.log(chalk.blue(`Progress: [${progressBar}] ${percentage.toFixed(1)}%`));
    console.log(chalk.blue(`Current File: ${current} of ${total}`));
    console.log(chalk.gray('─'.repeat(30)));
    console.log(chalk.green(`✅ Confirmed: ${confirmed}`));
    console.log(chalk.yellow(`⚠️  Need Adjustment: ${needsAdjust}`));
    console.log(chalk.blue(`📋 Total Reviewed: ${reviewed}`));
    console.log(chalk.gray(`⏳ Remaining: ${remaining}`));
    
    if (this.state.bookmarks.length > 0) {
      console.log(chalk.magenta(`🔖 Bookmarks: ${this.state.bookmarks.length}`));
    }
    
    if (this.state.history.length > 0) {
      console.log(chalk.cyan(`📚 Navigation History: ${this.state.history.length}`));
    }

    console.log(chalk.gray('═'.repeat(50)));
    
    await input({ message: 'Press Enter to continue...' });
  }

  /**
   * Show navigation help
   */
  private async showNavigationHelp(): Promise<void> {
    console.clear();
    console.log(chalk.cyan('\n❓ Navigation Help'));
    console.log(chalk.gray('═'.repeat(50)));
    
    console.log(chalk.yellow('\n🚀 Quick Navigation:'));
    console.log(chalk.white('  • Use ') + chalk.green('Go Back') + chalk.white(' to return to the previous file'));
    console.log(chalk.white('  • Use ') + chalk.green('Go Forward') + chalk.white(' to move to the next file'));
    console.log(chalk.white('  • Use ') + chalk.green('Jump to File') + chalk.white(' to navigate to any specific file'));
    
    console.log(chalk.yellow('\n🔍 Search Features:'));
    console.log(chalk.white('  • Search by file path or component name'));
    console.log(chalk.white('  • Filter by review status (confirmed, needs adjustment, unreviewed)'));
    console.log(chalk.white('  • Search results are saved for quick access'));
    
    console.log(chalk.yellow('\n🔖 Bookmarks:'));
    console.log(chalk.white('  • Bookmark important files for quick access'));
    console.log(chalk.white('  • Add notes to bookmarks for context'));
    console.log(chalk.white('  • Manage and remove bookmarks as needed'));
    
    console.log(chalk.yellow('\n📊 Progress Tracking:'));
    console.log(chalk.white('  • View overall progress and statistics'));
    console.log(chalk.white('  • See breakdown of decisions made'));
    console.log(chalk.white('  • Track navigation history'));
    
    console.log(chalk.yellow('\n💡 Tips:'));
    console.log(chalk.white('  • Navigation history is preserved within the session'));
    console.log(chalk.white('  • Bookmarks help you mark complex files for later review'));
    console.log(chalk.white('  • Use search to quickly find specific types of files'));
    
    console.log(chalk.gray('═'.repeat(50)));
    
    await input({ message: 'Press Enter to continue...' });
  }

  /**
   * Show navigation header
   */
  private showNavigationHeader(): void {
    const current = this.state.currentIndex + 1;
    const total = this.session.transformations.length;
    const currentFile = this.session.transformations[this.state.currentIndex];
    
    console.log(chalk.cyan('\n🧭 Navigation Menu'));
    console.log(chalk.gray(`Current: ${current}/${total} - ${currentFile.filePath}`));
    console.log(chalk.gray(`Component: ${currentFile.componentName}`));
    
    if (this.state.history.length > 0) {
      console.log(chalk.gray(`History: ${this.state.history.length} previous files`));
    }
    
    if (this.state.bookmarks.length > 0) {
      console.log(chalk.gray(`Bookmarks: ${this.state.bookmarks.length} saved`));
    }
    
    console.log(chalk.gray('─'.repeat(50)));
  }

  /**
   * Get file review status
   */
  private getFileStatus(index: number): 'confirmed' | 'needs-adjust' | 'unreviewed' {
    const filePath = this.session.transformations[index].filePath;
    const decision = this.session.decisions.find(d => d.filePath === filePath);
    
    if (!decision) {
      return 'unreviewed';
    }
    
    return decision.action === 'confirm' ? 'confirmed' : 'needs-adjust';
  }

  /**
   * Get status icon for file
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'confirmed': return chalk.green('✅');
      case 'needs-adjust': return chalk.yellow('⚠️');
      case 'unreviewed': return chalk.gray('⭕');
      default: return chalk.gray('❓');
    }
  }

  /**
   * Add to navigation history
   */
  private addToHistory(index: number): void {
    // Don't add the same index consecutively
    if (this.state.history.length > 0 && this.state.history[this.state.history.length - 1] === index) {
      return;
    }

    this.state.history.push(index);
    
    // Limit history size
    if (this.state.history.length > this.maxHistorySize) {
      this.state.history.shift();
    }
  }

  /**
   * Get current navigation state
   */
  getState(): NavigationState {
    return { ...this.state };
  }

  /**
   * Update session reference
   */
  updateSession(session: ReviewSession): void {
    this.session = session;
    this.state.currentIndex = session.currentIndex;
  }
}
/**
 * Help system and keyboard shortcuts for the interactive diff interface
 */

export interface KeyboardShortcut {
  key: string;
  description: string;
  category: 'navigation' | 'action' | 'display' | 'help';
}

export interface HelpSection {
  title: string;
  content: string;
  shortcuts?: KeyboardShortcut[];
}

/**
 * Generate keyboard shortcuts reference
 */
export function generateKeyboardShortcuts(): KeyboardShortcut[] {
  return [
    // Navigation shortcuts
    {
      key: '↑/k',
      description: 'Previous diff/rule',
      category: 'navigation'
    },
    {
      key: '↓/j',
      description: 'Next diff/rule',
      category: 'navigation'
    },
    {
      key: '←/h',
      description: 'Previous file',
      category: 'navigation'
    },
    {
      key: '→/l',
      description: 'Next file',
      category: 'navigation'
    },
    {
      key: 'g',
      description: 'Go to first rule',
      category: 'navigation'
    },
    {
      key: 'G',
      description: 'Go to last rule',
      category: 'navigation'
    },
    {
      key: 'Home',
      description: 'Go to first file',
      category: 'navigation'
    },
    {
      key: 'End',
      description: 'Go to last file',
      category: 'navigation'
    },

    // Action shortcuts
    {
      key: 'y/Enter',
      description: 'Accept current change',
      category: 'action'
    },
    {
      key: 'n/Delete',
      description: 'Skip current change',
      category: 'action'
    },
    {
      key: 'a',
      description: 'Accept all changes in file',
      category: 'action'
    },
    {
      key: 's',
      description: 'Skip all changes in file',
      category: 'action'
    },
    {
      key: 'A',
      description: 'Accept all remaining changes',
      category: 'action'
    },
    {
      key: 'S',
      description: 'Skip all remaining changes',
      category: 'action'
    },
    {
      key: 'u',
      description: 'Undo last action',
      category: 'action'
    },
    {
      key: 'r',
      description: 'Restart current file',
      category: 'action'
    },

    // Display shortcuts
    {
      key: 'd',
      description: 'Toggle diff display mode',
      category: 'display'
    },
    {
      key: 'c',
      description: 'Toggle compact mode',
      category: 'display'
    },
    {
      key: 'i',
      description: 'Toggle info panel',
      category: 'display'
    },
    {
      key: 'f',
      description: 'Toggle file context',
      category: 'display'
    },
    {
      key: 'p',
      description: 'Toggle progress display',
      category: 'display'
    },
    {
      key: 'R',
      description: 'Toggle rule details',
      category: 'display'
    },
    {
      key: '+',
      description: 'Increase context lines',
      category: 'display'
    },
    {
      key: '-',
      description: 'Decrease context lines',
      category: 'display'
    },

    // Help shortcuts
    {
      key: '?/h',
      description: 'Show/hide help',
      category: 'help'
    },
    {
      key: 'q/Esc',
      description: 'Quit/cancel',
      category: 'help'
    },
    {
      key: 'Ctrl+C',
      description: 'Force quit',
      category: 'help'
    }
  ];
}

/**
 * Generate comprehensive help text
 */
export function generateHelpText(): string {
  return `
JSX-Migr8 Interactive Diff Review Help

OVERVIEW:
This tool allows you to review each migration rule and transformation before
applying changes to your codebase. You can accept or skip individual changes,
navigate between files and rules, and see detailed information about each
transformation.

NAVIGATION:
• Use arrow keys or vim-style keys (h/j/k/l) to navigate
• Jump to first/last with 'g'/'G' or Home/End keys
• Move between files with left/right arrows

ACTIONS:
• Accept changes with 'y' or Enter
• Skip changes with 'n' or Delete
• Use 'a'/'s' to accept/skip all changes in current file
• Use 'A'/'S' to accept/skip all remaining changes
• Undo last action with 'u'

DISPLAY OPTIONS:
• Toggle different views with 'd', 'c', 'i', 'f', 'p', 'R'
• Adjust diff context with '+'/'-'
• Customize display to your preference

RULE INFORMATION:
Each rule shows:
• What components are being transformed
• Which props are being changed (removed, renamed, set)
• Import statement changes
• Match conditions that trigger the rule

FILE CONTEXT:
• File path and size information
• Number of components affected
• Complexity indicators
• Dependencies being modified

PROGRESS TRACKING:
• Current position in migration process
• Estimated time remaining
• Statistics on changes applied
• Throughput information

Press '?' to toggle this help display.
Press 'q' or Esc to quit the interactive review.
`;
}

/**
 * Generate help for specific categories
 */
export function generateCategoryHelp(category: KeyboardShortcut['category']): HelpSection {
  const shortcuts = generateKeyboardShortcuts().filter(s => s.category === category);
  
  const sections: Record<KeyboardShortcut['category'], HelpSection> = {
    navigation: {
      title: 'Navigation Commands',
      content: 'Use these keys to move through files and rules in the migration process.',
      shortcuts
    },
    action: {
      title: 'Action Commands',
      content: 'These commands let you accept, skip, or modify the migration changes.',
      shortcuts
    },
    display: {
      title: 'Display Options',
      content: 'Customize what information is shown and how it\'s presented.',
      shortcuts
    },
    help: {
      title: 'Help & System',
      content: 'Get help or exit the interactive review process.',
      shortcuts
    }
  };

  return sections[category];
}

/**
 * Generate quick reference card
 */
export function generateQuickReference(): string {
  return `
Quick Reference:
Navigation: ↑/↓ (rules), ←/→ (files), g/G (first/last)
Actions: y (accept), n (skip), a/s (all in file), A/S (all remaining)
Display: d (diff), c (compact), i (info), ? (help)
Exit: q (quit), Ctrl+C (force quit)
`;
}

/**
 * Get contextual help based on current state
 */
export function getContextualHelp(context: {
  isFirstFile?: boolean;
  isLastFile?: boolean;
  isFirstRule?: boolean;
  isLastRule?: boolean;
  hasUndoHistory?: boolean;
  showingHelp?: boolean;
}): string[] {
  const tips: string[] = [];

  if (context.isFirstFile && context.isFirstRule) {
    tips.push("🎉 Welcome! Use 'y' to accept changes or 'n' to skip them.");
    tips.push("💡 Press '?' for full help or 'i' to toggle the info panel.");
  }

  if (context.isLastFile && context.isLastRule) {
    tips.push("🏁 This is the last change! Review carefully before proceeding.");
  }

  if (!context.hasUndoHistory) {
    tips.push("💡 You can undo actions with 'u' if you change your mind.");
  }

  if (context.showingHelp) {
    tips.push("📖 Press '?' again to hide help and return to the diff review.");
  }

  return tips;
}

/**
 * Format help section for display
 */
export function formatHelpSection(section: HelpSection): string {
  const lines: string[] = [];
  
  lines.push(`## ${section.title}`);
  lines.push(section.content);
  
  if (section.shortcuts && section.shortcuts.length > 0) {
    lines.push('');
    section.shortcuts.forEach(shortcut => {
      lines.push(`  ${shortcut.key.padEnd(12)} ${shortcut.description}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Get status indicators for the help system
 */
export function getStatusIndicators(): Record<string, string> {
  return {
    accepted: '✅',
    skipped: '⏭️',
    pending: '⏳',
    error: '❌',
    processing: '🔄',
    completed: '✅',
    warning: '⚠️',
    info: 'ℹ️',
    help: '❓',
    navigation: '🧭',
    action: '⚡',
    display: '👁️'
  };
}

/**
 * Generate tips based on user behavior patterns
 */
export function generateSmartTips(userStats: {
  acceptanceRate: number;
  skipRate: number;
  undoCount: number;
  helpRequestCount: number;
  averageTimePerDecision: number;
}): string[] {
  const tips: string[] = [];

  if (userStats.acceptanceRate > 0.8) {
    tips.push("💡 You're accepting most changes. Consider using 'A' to accept all remaining.");
  }

  if (userStats.skipRate > 0.8) {
    tips.push("💡 You're skipping most changes. Consider using 'S' to skip all remaining.");
  }

  if (userStats.undoCount > 5) {
    tips.push("💡 Frequent undo usage detected. Take your time to review each change.");
  }

  if (userStats.helpRequestCount === 0 && userStats.averageTimePerDecision > 10000) {
    tips.push("💡 Press '?' for help if you're unsure about the available options.");
  }

  if (userStats.averageTimePerDecision < 1000) {
    tips.push("💡 Quick decisions! Make sure you're reviewing changes carefully.");
  }

  return tips;
}

/**
 * Get keyboard shortcut by action name
 */
export function getShortcutByAction(actionName: string): KeyboardShortcut | undefined {
  const actionMap: Record<string, string> = {
    accept: 'y/Enter',
    skip: 'n/Delete',
    next: '↓/j',
    previous: '↑/k',
    help: '?/h',
    quit: 'q/Esc'
  };

  const key = actionMap[actionName];
  if (!key) return undefined;

  return generateKeyboardShortcuts().find(shortcut => shortcut.key === key);
}
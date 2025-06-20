/**********************************************************************
 *  src/cli/interactive-diff/index.ts – Interactive diff module exports
 *********************************************************************/

// Main components
export { InteractiveDiffViewer } from './interactive-diff-viewer';
export { TerminalLayoutManager } from './layout-manager';
export { DiffFormatter } from './diff-formatter';
export { KeyboardHandler } from './keyboard-handler';

// Quadrant managers
export {
  OldCodeQuadrant,
  NewCodeQuadrant,
  InteractiveMenuQuadrant,
  RuleInfoQuadrant,
} from './quadrant-managers';

// Types
export * from './types';
import { LayoutTheme } from './types';
import { InteractiveDiffViewer } from './interactive-diff-viewer';

// Migration integration
export { 
  InteractiveMigrationProcessor,
  MigrationCandidate,
  type InteractiveMigrationResult,
  runInteractiveDryRun,
  confirmMigrations,
} from './migration-integration';

// Utility functions and helpers
export const createInteractiveDiffViewer = (theme?: Partial<LayoutTheme>) => {
  return new InteractiveDiffViewer(theme);
};

export const defaultTheme = {
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
    style: 'single' as const,
    color: 'white',
  },
  scrollbar: {
    show: true,
    color: 'gray',
  },
};

export const darkTheme = {
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

export const lightTheme = {
  colors: {
    added: 'green',
    removed: 'red',
    modified: 'magenta',
    lineNumber: 'blue',
    background: 'white',
    border: 'black',
    highlight: 'blue',
  },
  borders: {
    style: 'double' as const,
    color: 'black',
  },
  scrollbar: {
    show: true,
    color: 'gray',
  },
};
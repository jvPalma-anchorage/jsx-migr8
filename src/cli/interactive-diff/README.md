# Interactive Diff System - jsx-migr8

A professional terminal-based 4x4 matrix layout system for displaying migration diffs and interactive controls in jsx-migr8.

## Overview

The Interactive Diff System provides a terminal UI that displays content in 4 quadrants:

- **Top Left**: Old code diff (before migration)
- **Top Right**: New code diff (after migration)  
- **Bottom Left**: Interactive menu [Confirm, Needs Adjust, Stop]
- **Bottom Right**: Rule information panel

## Features

### 🎨 Professional Terminal UI
- **4-quadrant matrix layout** with responsive sizing
- **Dynamic terminal size detection** and adaptation
- **Professional borders and styling** with customizable themes
- **Color-coded diff highlighting** (red/green for old/new)
- **Scrollable content areas** for long code files

### ⌨️ Keyboard Navigation
- **Tab/Shift+Tab**: Switch between quadrants
- **↑/↓ or j/k**: Scroll content up/down
- **Page Up/Down**: Scroll by page
- **1-4**: Jump directly to specific quadrants
- **y**: Confirm changes
- **n**: Mark as "Needs Adjust"
- **s**: Stop migration
- **q/Ctrl+C**: Quit application
- **h/?**: Show help dialog

### 🔧 Advanced Features
- **Syntax highlighting** for JSX/TSX code
- **Line number display** with proper formatting
- **Unified and side-by-side diff formats**
- **Interactive menu system** with visual feedback
- **Customizable themes** (default, dark, light)
- **Error handling and recovery**
- **Memory-efficient scrolling**

## Installation

The system is already integrated into jsx-migr8. Dependencies are installed automatically:

```bash
yarn install
```

## Usage

### Basic Example

```typescript
import { InteractiveDiffViewer, darkTheme } from './cli/interactive-diff';

const viewer = new InteractiveDiffViewer(darkTheme);

const content = {
  oldDiff: {
    oldCode: 'import { Button } from "@material-ui/core";',
    newCode: 'import { Button } from "@material-ui/core";',
    fileName: 'Component.tsx',
  },
  newDiff: {
    oldCode: 'import { Button } from "@material-ui/core";',
    newCode: 'import { Button } from "@mui/material";',
    fileName: 'Component.tsx',
  },
  ruleInfo: {
    name: 'Material-UI v4 to v5 Migration',
    description: 'Updates import paths from v4 to v5',
    sourcePackage: '@material-ui/core',
    targetPackage: '@mui/material',
    componentName: 'Button',
    propsChanged: [],
    importsChanged: ['@material-ui/core → @mui/material'],
  },
  status: 'pending',
};

const result = await viewer.showDiff(content);
// result.action: 'confirm' | 'needs-adjust' | 'stop' | 'quit'
```

### Integration with jsx-migr8 Migration

```typescript
import { 
  InteractiveMigrationProcessor, 
  MigrationCandidate,
  runInteractiveDryRun 
} from './cli/interactive-diff';

// Create migration candidates
const candidates: MigrationCandidate[] = [
  {
    filePath: 'src/Button.tsx',
    originalContent: oldCode,
    migratedContent: newCode,
    ruleName: 'Material-UI Migration',
    // ... other properties
  }
];

// Run interactive dry run
const results = await runInteractiveDryRun(candidates);

console.log(`Confirmed: ${results.confirmed.length}`);
console.log(`Needs adjustment: ${results.needsAdjustment.length}`);
```

## API Reference

### Core Classes

#### `InteractiveDiffViewer`
Main class for displaying interactive diffs.

```typescript
const viewer = new InteractiveDiffViewer(theme?);
await viewer.showDiff(content);
await viewer.showMultipleDiffs(contents);
viewer.destroy();
```

#### `InteractiveMigrationProcessor`
Integration class for jsx-migr8 migrations.

```typescript
const processor = new InteractiveMigrationProcessor();
const results = await processor.processMigrations(candidates);
processor.showSummary();
```

#### `TerminalLayoutManager`
Manages the 4-quadrant terminal layout.

```typescript
const layout = new TerminalLayoutManager(theme);
const screen = layout.getScreen();
const dimensions = layout.getDimensions();
```

#### `DiffFormatter`
Formats and highlights diff content.

```typescript
const formatter = new DiffFormatter(colors);
const formatted = formatter.formatDiff(content, 'old');
const sideBySide = formatter.formatSideBySideDiff(content);
```

### Types

#### `QuadrantContent`
```typescript
interface QuadrantContent {
  oldDiff: DiffContent;
  newDiff: DiffContent;
  ruleInfo: RuleInfo;
  status: 'pending' | 'confirmed' | 'needs-adjust' | 'stopped';
}
```

#### `MigrationCandidate`
```typescript
interface MigrationCandidate {
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
```

## Themes

### Default Theme
```typescript
import { defaultTheme } from './cli/interactive-diff';
```

### Dark Theme
```typescript
import { darkTheme } from './cli/interactive-diff';
```

### Light Theme
```typescript
import { lightTheme } from './cli/interactive-diff';
```

### Custom Theme
```typescript
const customTheme = {
  colors: {
    added: 'brightGreen',
    removed: 'brightRed',
    // ... other colors
  },
  borders: {
    style: 'rounded',
    color: 'cyan',
  },
  scrollbar: {
    show: true,
    color: 'gray',
  },
};
```

## Demo & Testing

### Run Interactive Demo
```bash
yarn demo:interactive-diff
```

### Run Example
```bash
yarn demo:interactive-diff:example
```

### Run Tests
```bash
yarn test src/cli/interactive-diff
```

## Architecture

### File Structure
```
src/cli/interactive-diff/
├── index.ts                     # Main exports
├── types.ts                     # TypeScript interfaces
├── layout-manager.ts            # Terminal layout management
├── diff-formatter.ts            # Code diff formatting
├── quadrant-managers.ts         # Individual quadrant logic
├── keyboard-handler.ts          # Keyboard input handling
├── interactive-diff-viewer.ts   # Main viewer class
├── migration-integration.ts     # jsx-migr8 integration
├── example.ts                   # Usage examples
├── cli-demo.ts                  # CLI demonstration
├── README.md                    # This file
└── __tests__/
    └── interactive-diff.test.ts # Test suite
```

### Key Components

1. **TerminalLayoutManager**: Manages the 4x4 matrix layout and terminal dimensions
2. **QuadrantManagers**: Handle content and behavior for each quadrant
3. **KeyboardHandler**: Manages keyboard input and navigation
4. **DiffFormatter**: Provides syntax highlighting and diff formatting
5. **InteractiveDiffViewer**: Orchestrates the entire system

## Integration Points

### With jsx-migr8 CLI
The system integrates with the existing jsx-migr8 CLI through:

- Migration candidate processing
- Dry run integration
- User confirmation workflows
- Result reporting and summary

### With Migration Rules
- Displays rule information and metadata
- Shows props and import changes
- Provides context for migration decisions

### With File Operations
- Shows file paths and line numbers
- Handles content formatting and display
- Manages diff generation and presentation

## Performance Considerations

- **Memory-efficient scrolling**: Only renders visible content
- **Lazy content loading**: Loads content as needed
- **Optimized rendering**: Uses blessed.js smart rendering
- **Responsive layout**: Adapts to terminal size changes

## Error Handling

- **Graceful degradation**: Falls back to basic text display
- **User-friendly errors**: Clear error messages and recovery options
- **Cleanup management**: Proper resource cleanup on exit
- **Terminal state recovery**: Restores terminal state on errors

## Future Enhancements

- **Search functionality**: Find text within diffs
- **Diff navigation**: Jump to specific changes
- **Export options**: Save diffs to files
- **Plugin system**: Custom quadrant types
- **Async loading**: Background content loading
- **Multi-file diffs**: Compare multiple files simultaneously

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Test with different terminal sizes
5. Ensure keyboard accessibility

## License

Same as jsx-migr8 - MIT License
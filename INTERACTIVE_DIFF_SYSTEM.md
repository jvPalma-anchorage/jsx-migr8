# Interactive Diff System - Complete Implementation

A professional terminal-based 4x4 matrix layout system for jsx-migr8 that displays migration diffs and interactive controls in a terminal UI.

## 🎯 System Overview

The Interactive Diff System provides a sophisticated terminal interface with a 4-quadrant matrix layout:

```
┌─────────────────┬─────────────────┐
│   OLD CODE      │   NEW CODE      │
│   (Before)      │   (After)       │
│                 │                 │
│   Red Border    │   Green Border  │
├─────────────────┼─────────────────┤
│ INTERACTIVE     │ RULE INFO       │
│ MENU            │ PANEL           │
│                 │                 │
│ Cyan Border     │ Magenta Border  │
└─────────────────┴─────────────────┘
```

## 📁 File Structure

```
src/cli/interactive-diff/
├── index.ts                      # Main exports and API
├── types.ts                      # TypeScript interfaces
├── layout-manager.ts             # Terminal layout management
├── diff-formatter.ts             # Code diff formatting & highlighting
├── quadrant-managers.ts          # Individual quadrant implementations
├── keyboard-handler.ts           # Keyboard navigation & input
├── interactive-diff-viewer.ts    # Main orchestration class
├── migration-integration.ts      # jsx-migr8 integration layer
├── jsx-migr8-integration.ts      # CLI integration helpers
├── example.ts                    # Usage examples
├── cli-demo.ts                   # Interactive demonstration
├── README.md                     # Detailed documentation
└── __tests__/
    └── interactive-diff.test.ts  # Test suite
```

## 🛠️ Core Components

### 1. **TerminalLayoutManager**
- **Purpose**: Manages the 4x4 matrix terminal layout
- **Features**: 
  - Dynamic terminal size detection
  - Responsive quadrant positioning
  - Theme support (default, dark, light)
  - Border and color management

### 2. **QuadrantManagers**
Four specialized classes for each quadrant:

#### **OldCodeQuadrant** (Top Left)
- Displays original code before migration
- Red border styling
- Syntax highlighting for JSX/TSX
- Scrollable content with line numbers

#### **NewCodeQuadrant** (Top Right)  
- Shows migrated code after changes
- Green border styling
- Diff highlighting (additions/changes)
- Side-by-side comparison support

#### **InteractiveMenuQuadrant** (Bottom Left)
- Action selection interface
- Options: Confirm, Needs Adjust, Stop
- Keyboard navigation (↑/↓, Enter)
- Status messages and progress

#### **RuleInfoQuadrant** (Bottom Right)
- Migration rule details
- Source/target package information
- Props and import changes
- Component metadata

### 3. **KeyboardHandler**
- **Navigation**: Tab/Shift+Tab between quadrants
- **Scrolling**: ↑/↓, j/k, Page Up/Down
- **Actions**: y (confirm), n (needs adjust), s (stop), q (quit)
- **Help**: h/? for help dialog
- **Focus Management**: Visual indicators for active quadrant

### 4. **DiffFormatter**
- **Syntax Highlighting**: JSX/TSX code formatting
- **Line Numbers**: Proper numbering with offset support
- **Diff Colors**: Red for removals, green for additions
- **Multiple Formats**: Unified diff, side-by-side, highlighted
- **Performance**: Efficient content truncation for large files

### 5. **InteractiveDiffViewer**
- **Main Orchestrator**: Coordinates all components
- **Content Management**: Handles diff content and rule information
- **User Interaction**: Processes user decisions
- **Multiple Diffs**: Sequential processing of migration candidates
- **Error Handling**: Graceful degradation and recovery

## ⌨️ Keyboard Navigation

| Key | Action | Description |
|-----|--------|-------------|
| `Tab` | Next Quadrant | Move focus to next quadrant clockwise |
| `Shift+Tab` | Previous Quadrant | Move focus to previous quadrant |
| `1-4` | Direct Jump | Jump directly to quadrant 1-4 |
| `↑/k` | Scroll Up | Scroll content up (3 lines) |
| `↓/j` | Scroll Down | Scroll content down (3 lines) |
| `Page Up` | Page Up | Scroll content up (10 lines) |
| `Page Down` | Page Down | Scroll content down (10 lines) |
| `y` | Confirm | Accept the migration changes |
| `n` | Needs Adjust | Mark for manual review |
| `s` | Stop | Stop the migration process |
| `q/Ctrl+C` | Quit | Exit the application |
| `h/?` | Help | Show help dialog |
| `r/Ctrl+R` | Refresh | Refresh the screen |

## 🎨 Themes

### Default Theme
```typescript
{
  colors: {
    added: 'green',
    removed: 'red', 
    modified: 'yellow',
    lineNumber: 'blue',
    background: 'black',
    border: 'white',
    highlight: 'cyan',
  },
  borders: { style: 'single', color: 'white' },
  scrollbar: { show: true, color: 'gray' }
}
```

### Dark Theme  
```typescript
{
  colors: {
    added: 'brightGreen',
    removed: 'brightRed',
    modified: 'brightYellow',
    lineNumber: 'brightBlue',
    background: 'black',
    border: 'gray',
    highlight: 'brightCyan',
  },
  borders: { style: 'rounded', color: 'gray' },
  scrollbar: { show: true, color: 'brightBlack' }
}
```

### Light Theme
```typescript
{
  colors: {
    added: 'green',
    removed: 'red',
    modified: 'magenta', 
    lineNumber: 'blue',
    background: 'white',
    border: 'black',
    highlight: 'blue',
  },
  borders: { style: 'double', color: 'black' },
  scrollbar: { show: true, color: 'gray' }
}
```

## 🔧 Dependencies Added

The system uses these terminal UI libraries:

```json
{
  "dependencies": {
    "blessed": "^0.1.81",
    "cli-boxes": "^3.0.0", 
    "terminal-size": "^4.0.0"
  },
  "devDependencies": {
    "@types/blessed": "^0.1.25"
  }
}
```

## 🚀 Usage Examples

### Basic Usage
```typescript
import { InteractiveDiffViewer, darkTheme } from './cli/interactive-diff';

const viewer = new InteractiveDiffViewer(darkTheme);
const result = await viewer.showDiff(content);
// result.action: 'confirm' | 'needs-adjust' | 'stop' | 'quit'
```

### jsx-migr8 Integration
```typescript
import { runInteractiveDryRun } from './cli/interactive-diff';

const candidates = [/* migration candidates */];
const results = await runInteractiveDryRun(candidates);
console.log(`Confirmed: ${results.confirmed.length}`);
```

### Multiple Migrations
```typescript
const results = await viewer.showMultipleDiffs(contents);
const summary = InteractiveDiffViewer.getSummary(results);
```

## 📱 Demo & Testing

### Run Interactive Demo
```bash
yarn demo:interactive-diff
```

### Run Usage Example  
```bash
yarn demo:interactive-diff:example
```

### Run Tests
```bash
yarn test src/cli/interactive-diff
```

### Integration Demo
```bash
tsx src/cli/interactive-diff/jsx-migr8-integration.ts
```

## ⚡ Performance Features

- **Memory Efficient**: Only renders visible content
- **Responsive Layout**: Adapts to terminal size changes  
- **Lazy Loading**: Content loaded as needed
- **Smart Scrolling**: Optimized scrolling with proper boundaries
- **Error Recovery**: Graceful handling of terminal issues

## 🔗 Integration Points

### With jsx-migr8 CLI
- **Dry Run Enhancement**: Visual diff preview
- **Migration Confirmation**: Interactive approval process
- **Rule Information**: Rich metadata display
- **Progress Tracking**: Visual progress through migrations

### With Migration Engine
- **Candidate Processing**: Seamless integration with migration candidates
- **Result Handling**: Structured result processing
- **Status Management**: Track confirmed/skipped/adjusted changes
- **Error Handling**: Graceful error recovery and reporting

## 📋 Future Enhancements

- **Search Functionality**: Find text within diffs
- **Diff Navigation**: Jump to specific changes
- **Export Options**: Save diffs to files  
- **Plugin System**: Custom quadrant types
- **Multi-file Views**: Compare multiple files simultaneously
- **Async Loading**: Background content preparation
- **Custom Shortcuts**: User-configurable key bindings

## ✅ Implementation Status

- [x] **Core Architecture**: 4-quadrant matrix layout
- [x] **Terminal Management**: Dynamic sizing and layout
- [x] **Diff Formatting**: Syntax highlighting and line numbers
- [x] **Keyboard Navigation**: Full navigation system
- [x] **Interactive Menus**: Action selection interface
- [x] **Theme Support**: Multiple color schemes
- [x] **jsx-migr8 Integration**: Migration candidate processing
- [x] **Error Handling**: Graceful degradation
- [x] **Testing**: Comprehensive test suite
- [x] **Documentation**: Complete documentation
- [x] **Demo System**: Interactive demonstrations

The Interactive Diff System is now fully implemented and ready for integration into jsx-migr8, providing a professional terminal-based interface for migration review and approval.
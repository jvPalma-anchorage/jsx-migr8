# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

jsx-migr8 is a general-purpose declarative JSX/TSX codemod CLI tool with interactive diff-preview and one-shot "YOLO" mode. It's designed to help migrate JSX components from ANY package/library to ANY other package/library through static analysis and rule-based transformations.

**Current Release**: Version 2.0 "Graph & Spec renaissance" - Features a new graph-based analysis system that always scans on start, dependency-first CLI (wizard removed), and improved performance.

### Two-Phase Migration Process

**Phase 1 - Analysis & Rule Creation**:
1. Scan the entire codebase
2. Discover all packages/libraries being used
3. Select specific components from chosen packages
4. Analyze prop usage patterns
5. Export migr8 rules template for manual customization

**Phase 2 - Migration Application**:
1. Load the customized migr8 rules file
2. Preview changes with dry-run mode (colored diffs)
3. Apply transformations with YOLO mode once confirmed

## Development Commands

### Essential Commands
```bash
# Install dependencies (using Yarn 4.2.0)
yarn install

# Run the interactive CLI
yarn start

# Run in dry-run mode (preview changes without applying)
yarn dry-run

# Run in YOLO mode (apply changes immediately)
yarn yolo

# Clean generated files
yarn clean          # Remove JSON reports only
yarn deep-clean     # Remove all generated files including component specs

# Code quality (Note: ESLint/Prettier configs not present)
yarn lint           # Run ESLint on TypeScript files
yarn format         # Format code with Prettier
```

### Environment Setup
Create a `.env` file based on `.env.example`:
```bash
ROOT_PATH=/path/to/project/to/scan
BLACKLIST=node_modules,generated,.template,out,dist,build,storybook,storybook-static
```

## Architecture Overview

### Core Data Flow
1. **Codebase Scanning**: Always scans on start using graph system (`buildGraph`) to discover all packages/components
2. **Package/Component Selection**: Interactive UI to browse discovered packages and select components to migrate
3. **Rule Template Export**: Generates migr8 rule files with prop usage analysis for manual customization
4. **Rule Application**: Loads customized rules and applies transformations while maintaining AST node references
5. **Output**: Either colored diffs (dry-run) or modified files (yolo mode)

### Directory Structure
- `src/analyzer/` - Static code analysis (imports & JSX usage tracking)
- `src/cli/` - Interactive menus and CLI entry points (wizard removed in v2.0)
- `src/compat/` - Compatibility layer for legacy reports
- `src/context/` - Global state management (configuration, reports, specs)
- `src/graph/` - **NEW in v2.0**: Graph-based code analysis system (replaces old reports)
- `src/migrator/` - Core migration logic (rule application, file transformation)
- `src/remap/` - Rule definitions and transformation helpers
- `src/report/` - Report generation (interactive prop usage tables)
- `src/types/` - TypeScript type definitions
- `src/utils/` - AST manipulation, logging, and diff utilities

### Key Data Structures
- **Migr8Spec**: New v2.0 format containing lookup and multiple component rule blocks
- **Graph System**: Maintains live AST node references for precise transformations
- **ImportSpecifierDetails**: Import metadata (type, names, paths, default handling)
- **ComponentUsage**: JSX usage with props and location info
- **ComponentSpec**: Legacy format for old → new component mappings (being phased out)

### Rule System
Migration rules support:
- **Property operations**: `remove`, `rename`, `set`
- **Import rewriting**: Change package sources
- **Full replacement**: Replace entire JSX elements
- **Placeholders**: `{...OUTER_PROPS}`, `{...INNER_PROPS}`, `{CHILDREN}`

Example rule (customizable for any package migration):
```json
{
  "match": [{ "type": "body", "size": "medium" }],
  "remove": ["type", "size"],
  "rename": { "oldProp": "newProp" },
  "set": { "variant": "bodyMedium" },
  "importFrom": "@any/source-package",
  "importTo": "@any/target-package",
  "replaceWith": {
    "INNER_PROPS": ["href", "target"],
    "code": "<NewComponent {...OUTER_PROPS}><a {...INNER_PROPS}>{CHILDREN}</a></NewComponent>"
  }
}
```

Rules are stored in `migr8Rules/` directory as JSON files. The tool generates templates based on actual usage patterns found in your codebase.

### State Management
Global context (`src/context/globalContext.ts`) manages:
- CLI arguments and configuration
- Migr8Spec specifications (with CLI precedence)
- Graph data (always fresh, no stale JSON)
- Runtime state
- Legacy support for `queue/` directory (optional export only)

### AST Processing
- Uses **Recast** for AST parsing/generation (preserves formatting)
- **jscodeshift** collections for AST queries
- Custom visitors for import/JSX analysis

## Development Notes

### TypeScript Configuration
- Target: ES2022
- Strict mode enabled
- Module: ES2022 with Node resolution
- Allows `.ts` extension imports
- Path alias: `@/*` → `src/*`
- Source in `src/`, output to `dist/`
- Node requirement: >=22.0.0

### Testing
Currently no tests implemented. Test framework needs to be set up.

### Code Style
ESLint and Prettier are installed but lack configuration files. Consider adding:
- `.eslintrc.json` for linting rules
- `.prettierrc` for formatting rules

### CLI Entry Points
- `src/cli/index.ts` - Main interactive menu (dependency-first approach)
- `src/cli/dry-run.ts` - Diff preview mode with colored output
- `src/cli/yolo.ts` - Direct migration mode (applies changes)
- `src/cli/constants.ts` - Menu options and UI strings

### Important Files
- `migr8Rules/` - Directory containing migration rule JSON files
- `.env` - Environment configuration (created from `.env.example`)
- `queue/` - Optional directory for legacy JSON exports (gitignored)

### Key Improvements in v2.0
- **Graph-based analysis**: Always fresh, maintains AST node references
- **Better import handling**: Improved support for default imports and various patterns
- **Performance**: More efficient scanning and transformation
- **Simplified workflow**: Removed wizard in favor of dependency-first selection
- **Multi-component support**: Can handle multiple packages/components in one session

### Recent Additions (Latest Commit)
- **Comprehensive Backup System** (`src/backup/`): Full backup and rollback functionality with:
  - Snapshot management with integrity verification
  - Git integration for automatic branch creation
  - Interactive CLI for backup operations
  - Automatic cleanup based on retention policies
  - Over 20,000 lines of code including extensive test coverage
- **Enhanced Async Processing**: Memory-efficient batch processing for large codebases
- **Test Infrastructure**: Jest configuration with comprehensive test suites

### Known Issues & Areas for Improvement
1. **Missing Linter Configurations**: ESLint and Prettier are installed but `.eslintrc.json` and `.prettierrc` files are missing
2. **Type Safety**: Multiple uses of `@ts-ignore` and `as any` throughout the codebase
3. **No Error Handling**: Critical paths lack try-catch blocks for file operations
4. **Performance**: Still uses some synchronous file operations in main paths
# Integration Test Fixtures

This directory contains realistic test fixtures for jsx-migr8 integration testing.

## Fixture Structure

Each fixture represents a different type of project or migration scenario:

### Basic Projects
- `simple-react-app/` - Basic React app with common component patterns
- `typescript-project/` - TypeScript project with strong typing
- `mixed-js-ts/` - Project mixing JavaScript and TypeScript files

### Complex Scenarios
- `large-codebase/` - Simulates a large enterprise codebase
- `monorepo/` - Multi-package monorepo structure
- `design-system-migration/` - Common design system migration scenario

### Edge Cases
- `edge-cases/` - Various edge cases and problematic patterns
- `malformed-jsx/` - Projects with syntax issues or unusual patterns
- `performance-test/` - Large codebases for performance testing

### Migration Scenarios
- `ui-library-v1-to-v2/` - Simulates upgrading a UI library
- `react-to-preact/` - Framework migration example
- `styled-components-to-emotion/` - CSS-in-JS migration

## Usage

These fixtures are used by:
1. End-to-end CLI workflow tests
2. Snapshot testing for transformations
3. Performance regression tests
4. Error scenario validation
5. Backup and rollback testing

Each fixture includes:
- Source code files with various JSX patterns
- Expected migration rules
- Expected transformation outputs
- Package.json and dependency configurations
- README with specific test scenarios
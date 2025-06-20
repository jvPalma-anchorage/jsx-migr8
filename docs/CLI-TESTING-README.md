# CLI Testing Guide

This directory contains automated testing scripts for the jsx-migr8 CLI interface, specifically designed to test the "Inspect components" functionality and other CLI interactions.

## Test Scripts

### 1. Basic CLI Test (`test-cli-interaction.js`)

A simple Node.js script that simulates basic user interaction with the CLI:

- Starts the CLI with `yarn start`
- Navigates to "Inspect components" option
- Selects packages and components
- Captures output for verification

**Usage:**
```bash
# Run directly
node test-cli-interaction.js

# Or via yarn script
yarn test:cli
```

### 2. Advanced CLI Test (`test-cli-advanced.js`)

A comprehensive testing framework with multiple scenarios:

- **Inspect Components Flow**: Full workflow testing
- **Quick Navigation Test**: Menu navigation testing
- Detailed step-by-step execution
- Output analysis and reporting
- JSON report generation

**Usage:**
```bash
# Interactive mode (default)
node test-cli-advanced.js

# Run specific scenario
node test-cli-advanced.js --scenario inspectComponents

# Run all scenarios
node test-cli-advanced.js --all

# Or via yarn scripts
yarn test:cli:advanced
yarn test:cli:all
```

### 3. Test Runner Script (`run-cli-tests.sh`)

A bash script providing a user-friendly interface:

- Menu-driven test selection
- Prerequisites checking
- Log management
- Colored output

**Usage:**
```bash
# Make executable (already done)
chmod +x run-cli-tests.sh

# Run interactively
./run-cli-tests.sh

# Or via yarn script
yarn test:cli:interactive
```

## Test Structure

### Key Simulation Actions

The tests simulate these user interactions:

1. **Menu Navigation**:
   - UP/DOWN arrow keys
   - ENTER to select
   - ESC to exit

2. **Component Selection**:
   - SPACE to toggle checkboxes
   - ENTER to confirm selections

3. **Output Verification**:
   - Menu display detection
   - Package/component list detection
   - Error message capture
   - Success criteria validation

### Test Scenarios

#### Inspect Components Flow
1. Wait for main menu to load
2. Navigate to "Inspect components" option
3. Select option with ENTER
4. Wait for package list
5. Select first package
6. Wait for component list
7. Toggle multiple components
8. Confirm selection
9. Wait for inspection results
10. Exit CLI

#### Quick Navigation Test
- Navigate through all menu options
- Test up/down navigation
- Exit gracefully

## Output and Logs

### Log Files
All test runs generate logs in the `test-logs/` directory:

- `test-*.log`: Raw CLI output capture
- `report-*.json`: Structured test results
- Timestamped files for easy tracking

### Report Structure
```json
{
  "scenario": "Test name",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "duration": 5000,
  "steps": {
    "total": 10,
    "successful": 9,
    "failed": 1
  },
  "results": [...],
  "outputAnalysis": {
    "menuDetected": true,
    "inspectOptionFound": true,
    "packageListFound": true,
    "componentListFound": true,
    "checkboxesFound": true,
    "errorMessages": [],
    "totalLines": 150
  }
}
```

## Prerequisites

- Node.js >= 22.0.0
- Yarn package manager
- All project dependencies installed (`yarn install`)

## Running Tests

### Quick Start
```bash
# Install dependencies
yarn install

# Run interactive test runner
yarn test:cli:interactive

# Or run specific tests
yarn test:cli                # Basic test
yarn test:cli:advanced       # Advanced interactive
yarn test:cli:all           # All scenarios
```

### Manual Testing
```bash
# Basic test
node test-cli-interaction.js

# Advanced test with options
node test-cli-advanced.js --help
node test-cli-advanced.js --scenario inspectComponents
node test-cli-advanced.js --all

# Test runner
./run-cli-tests.sh
```

## Debugging

### Verbose Output
All tests output real-time CLI interaction to the console, making it easy to see what's happening.

### Log Analysis
Check the `test-logs/` directory for:
- Complete CLI output capture
- Structured test reports
- Error messages and analysis

### Common Issues

1. **CLI doesn't start**: Check that `yarn start` works manually
2. **Navigation fails**: Menu structure may have changed
3. **Timing issues**: Increase wait times in test scenarios
4. **Output not captured**: Check file permissions on `test-logs/`

## Extending Tests

### Adding New Scenarios
Edit `test-cli-advanced.js` and add to `TEST_SCENARIOS`:

```javascript
newScenario: {
  name: 'New Test Scenario',
  steps: [
    { action: 'wait', duration: 2000, description: 'Wait for start' },
    { action: 'key', key: 'DOWN', description: 'Navigate down' },
    { action: 'key', key: 'ENTER', description: 'Select option' },
    // ... more steps
  ]
}
```

### Adding New Actions
Supported step actions:
- `wait`: Pause execution
- `key`: Send keyboard input
- `text`: Send text input
- `check`: Verify output patterns

### Customizing Analysis
Modify the `analyzeOutput()` method to add new output verification patterns.

## Integration with CI/CD

These tests can be integrated into automated testing pipelines:

```bash
# Exit codes indicate test success/failure
yarn test:cli:all
echo $?  # 0 = success, non-zero = failure
```

## Troubleshooting

### Test Hangs
- Increase timeout values
- Check if CLI is waiting for user input
- Verify menu structure hasn't changed

### False Positives/Negatives
- Review output patterns in `analyzeOutput()`
- Adjust timing between steps
- Check for race conditions

### Permission Issues
```bash
chmod +x run-cli-tests.sh
mkdir -p test-logs
```

## Contributing

When modifying the CLI interface:
1. Run existing tests to ensure compatibility
2. Update test scenarios if menu structure changes
3. Add new tests for new CLI functionality
4. Update this README with any new features
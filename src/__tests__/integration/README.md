# jsx-migr8 Integration Testing Suite

This directory contains a comprehensive integration testing suite for jsx-migr8 CLI workflows, designed to ensure reliability, performance, and correctness across different scenarios and environments.

## Test Suite Overview

### Core Test Suites

1. **CLI Workflows** (`cli-workflows.test.ts`)
   - End-to-end CLI command testing
   - Interactive mode simulation
   - Dry-run and YOLO mode validation
   - Help and version command testing
   - Cross-platform CLI execution

2. **Transformation Snapshots** (`transformation-snapshots.test.ts`)
   - Snapshot testing for code transformations
   - Diff output validation
   - Complex JSX pattern handling
   - Before/after transformation comparison
   - Colored diff output testing

3. **Performance Regression** (`performance-regression.test.ts`)
   - Performance benchmarking across project sizes
   - Memory usage monitoring
   - Regression detection against baselines
   - Concurrent processing tests
   - File processing rate consistency

4. **Error Scenarios** (`error-scenarios.test.ts`)
   - Configuration error handling
   - Malformed JSON and JSX processing
   - File system permission issues
   - Memory exhaustion protection
   - Graceful error recovery

5. **Node.js Compatibility** (`node-compatibility.test.ts`)
   - Multi-version Node.js support
   - Platform-specific feature testing
   - ES module compatibility
   - Unicode and encoding support
   - Environment variable handling

6. **Backup & Rollback** (`backup-rollback.test.ts`)
   - Backup creation during transformations
   - Backup integrity verification
   - Git integration testing
   - Rollback operation validation
   - Error handling during backup operations

### Test Utilities

- **CLI Test Utils** (`test-utils/cli-test-utils.ts`)
  - CLI execution helpers
  - File system mocking
  - Performance monitoring
  - User input simulation

- **Snapshot Utils** (`test-utils/snapshot-utils.ts`)
  - Snapshot creation and comparison
  - Output normalization
  - Test data generation
  - Cross-platform path handling

## Running Tests

### Quick Commands

```bash
# Run all integration tests
yarn test:integration:full

# Run specific test suites
yarn test:integration:cli          # CLI workflow tests
yarn test:integration:snapshots    # Transformation snapshot tests
yarn test:integration:performance  # Performance regression tests
yarn test:integration:errors       # Error scenario tests
yarn test:integration:backup       # Backup and rollback tests
yarn test:integration:node         # Node.js compatibility tests

# Update snapshots
yarn test:integration:update-snapshots
```

### Test Environment Setup

```bash
# Install dependencies
yarn install

# Set up git for backup tests (required)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Optional: Set environment variables
export ROOT_PATH=/path/to/test/project
export BLACKLIST=node_modules,dist,build
export NODE_ENV=test
```

### CI/CD Integration

The integration tests are designed to run in CI/CD environments with the provided GitHub Actions workflow (`.github/workflows/integration-tests.yml`).

**Matrix Testing:**
- Node.js versions: 18.x, 20.x, 22.x
- Operating systems: Ubuntu, Windows, macOS
- Test scenarios: Basic, performance, edge cases

## Test Fixtures

### Available Fixtures

Located in `__fixtures__/` directory:

- **simple-react-app/**: Basic React application with common component patterns
- **typescript-project/**: TypeScript project with Material-UI components
- **edge-cases/**: Various edge cases and problematic JSX patterns
- **performance-test/**: Large codebases for performance testing

### Fixture Structure

Each fixture includes:
- Source code files with realistic JSX patterns
- `package.json` with relevant dependencies
- Expected migration rules (`expected-rules/`)
- Expected transformation outputs (`expected-output/`)
- README with specific test scenarios

## Snapshot Testing

### How Snapshots Work

1. **CLI Output Snapshots**: Capture normalized CLI output including:
   - STDOUT and STDERR content
   - Exit codes
   - Execution duration (normalized)
   - Error messages

2. **Transformation Snapshots**: Capture file transformations including:
   - Original file content
   - Transformed file content
   - Applied migration rules
   - Content checksums

3. **Diff Snapshots**: Capture diff output including:
   - Colored diff formatting (normalized)
   - File-specific changes
   - Addition/deletion statistics

### Snapshot Management

```bash
# Update all snapshots
yarn test:integration:update-snapshots

# Review snapshot changes
git diff src/__tests__/integration/__snapshots__/

# Commit updated snapshots
git add src/__tests__/integration/__snapshots__/
git commit -m "Update integration test snapshots"
```

## Performance Testing

### Performance Baselines

Performance tests maintain baselines in `performance-baseline.json`:

```json
{
  "lastUpdated": "2024-01-01T00:00:00.000Z",
  "nodeVersion": "v22.0.0",
  "platform": "linux",
  "measurements": {
    "small-project-scan": {
      "count": 10,
      "mean": 1250.5,
      "min": 1100.2,
      "max": 1450.8
    }
  }
}
```

### Performance Thresholds

- Small projects (< 50 components): < 5 seconds
- Medium projects (50-200 components): < 15 seconds
- Large projects (200+ components): < 45 seconds
- Memory usage: < 512MB
- File processing rate: < 50ms per file

### Regression Detection

Tests automatically detect performance regressions:
- **Warning threshold**: 15% slower than baseline
- **Failure threshold**: 25% slower than baseline (configurable)

## Error Testing

### Error Categories

1. **Configuration Errors**
   - Missing or invalid `ROOT_PATH`
   - Permission denied scenarios
   - Invalid environment setup

2. **Input Validation Errors**
   - Malformed migration rules JSON
   - Invalid JSX syntax
   - Corrupted source files

3. **Runtime Errors**
   - Memory exhaustion
   - Disk space issues
   - Network timeouts

4. **Recovery Scenarios**
   - Interrupted operations
   - Partial transformations
   - Backup failures

## Contributing to Tests

### Adding New Test Cases

1. **Create fixture data** in `__fixtures__/`
2. **Write test scenarios** following existing patterns
3. **Add snapshots** for expected outputs
4. **Update documentation** with new test descriptions

### Test Guidelines

- **Isolation**: Each test should be independent and clean up after itself
- **Determinism**: Tests should produce consistent results across runs
- **Performance**: Avoid unnecessarily slow tests; use timeouts appropriately
- **Coverage**: Test both happy paths and error conditions
- **Documentation**: Include clear descriptions of what each test validates

### Example Test Structure

```typescript
describe('Feature Name', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await TestFileUtils.createTempDir('test-prefix-');
  });
  
  afterEach(async () => {
    await TestFileUtils.cleanup(tempDir);
  });
  
  test('should handle specific scenario', async () => {
    // Arrange: Set up test data
    const fixture = await TestFileUtils.copyFixture('fixture-name', tempDir);
    
    // Act: Execute the operation
    const result = await CLITestRunner.runDryRun(fixture);
    
    // Assert: Verify results
    expect(result.exitCode).toBe(0);
    
    // Create snapshot for regression testing
    await SnapshotTestUtils.createCLISnapshot('test-name', result);
  });
});
```

## Troubleshooting

### Common Issues

1. **Git configuration missing**
   ```bash
   git config --global user.name "Test User"
   git config --global user.email "test@example.com"
   ```

2. **Permission errors**
   ```bash
   # Ensure proper file permissions
   chmod -R 755 src/__tests__/integration/__fixtures__/
   ```

3. **Snapshot mismatches**
   ```bash
   # Review and update snapshots
   yarn test:integration:update-snapshots
   ```

4. **Performance test failures**
   - Check system load during test execution
   - Verify no background processes affecting performance
   - Consider adjusting performance thresholds for CI environment

### Debug Mode

Enable verbose logging:

```bash
# Run with debug output
DEBUG=jsx-migr8:* yarn test:integration:full

# Run specific test with verbose output
yarn test:integration:cli --verbose
```

## Test Reports

Integration tests generate comprehensive reports:

- **integration-test-report.json**: Overall test results and statistics
- **performance-baseline.json**: Performance measurements and baselines
- **coverage/**: Code coverage reports (when enabled)

These reports are used for:
- CI/CD pipeline decisions
- Performance trend analysis
- Test result tracking
- Debugging test failures

## Future Enhancements

Planned improvements to the integration test suite:

1. **Visual Regression Testing**: Screenshot comparison for CLI output
2. **Load Testing**: High-concurrency scenario testing
3. **Browser Testing**: Web-based transformation preview testing
4. **Docker Integration**: Containerized test execution
5. **Parallelization**: Improved test execution speed
6. **Fuzzing**: Automated edge case discovery
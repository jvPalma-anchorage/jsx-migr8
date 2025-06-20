# Advanced Edge Case Scenarios for jsx-migr8

This directory contains comprehensive edge case scenarios designed to test jsx-migr8's resilience, performance, and error handling capabilities under extreme conditions.

## Test Categories

### 1. Large-Scale Scenarios
- **Files**: `large-scale/thousand-components.tsx`
- **Tests**: 1000+ components, complex import graphs, deep nesting
- **Purpose**: Memory efficiency, parsing performance, transformation accuracy

### 2. Malformed Code Handling
- **Files**: `malformed/syntax-errors.tsx`
- **Tests**: Invalid JSX, incomplete imports, syntax errors, unicode issues
- **Purpose**: Parser resilience, error recovery, graceful degradation

### 3. Mixed Module Environments
- **Files**: `mixed-modules/hybrid-imports.js`, `mixed-modules/tsconfig-variations.tsx`
- **Tests**: CommonJS + ES modules, different TypeScript configs, path aliases
- **Purpose**: Module resolution compatibility, cross-system support

### 4. Dynamic Patterns
- **Files**: `dynamic-patterns/factory-components.tsx`
- **Tests**: Component factories, computed names, runtime generation, meta-programming
- **Purpose**: Static analysis of dynamic code, pattern recognition

### 5. Circular Dependencies
- **Files**: `circular-deps/component-a.tsx`, `circular-deps/component-b.tsx`, `circular-deps/component-c.tsx`
- **Tests**: Circular imports, self-referencing components, infinite loops
- **Purpose**: Dependency resolution, cycle breaking, deadlock prevention

### 6. Monorepo Complexity
- **Files**: `monorepo/workspace-a/`
- **Tests**: Workspace dependencies, path aliases, cross-package imports
- **Purpose**: Complex project structure handling, package resolution

### 7. Performance Stress Tests
- **Files**: `performance/memory-stress.tsx`
- **Tests**: Memory constraints, concurrent operations, large transformations
- **Purpose**: Performance under pressure, resource management, scalability

### 8. Recovery Patterns
- **Files**: `recovery-patterns/error-recovery.test.ts`
- **Tests**: File system errors, parsing failures, transformation rollbacks
- **Purpose**: Fault tolerance, data integrity, user experience

## Running the Tests

### Individual Test Categories
```bash
# Run specific edge case category
npm test -- --testPathPattern="edge-cases-advanced" --testNamePattern="Large-Scale"

# Run malformed code tests
npm test -- --testPathPattern="malformed"

# Run stress tests (longer timeout)
npm test -- --testTimeout=300000 --testPathPattern="stress"
```

### Comprehensive Edge Case Testing
```bash
# Run all edge cases
npm run test:edge-cases

# Run with detailed reporting
npm run test:edge-cases:verbose

# Run with memory profiling
node --expose-gc --max-old-space-size=1024 ./dist/__tests__/integration/edge-cases-runner.js
```

### Performance Benchmarking
```bash
# Benchmark performance across scenarios
npm run benchmark:edge-cases

# Memory usage analysis
npm run analyze:memory

# Concurrency stress test
npm run test:concurrency
```

## Expected Behaviors

### 1. Graceful Degradation
- jsx-migr8 should never crash completely
- Partial results should be provided when possible
- Clear error messages should be displayed
- Recovery suggestions should be offered

### 2. Performance Characteristics
- **Memory Usage**: Should not exceed 1GB for typical operations
- **Processing Time**: Large files (10MB+) should process within 5 minutes
- **Concurrency**: Should handle 50+ concurrent operations
- **Error Recovery**: Should complete rollback within 30 seconds

### 3. Resource Management
- **File Handles**: Should properly close all file handles
- **Memory Cleanup**: Should release memory after operations
- **Process Cleanup**: Should terminate worker processes cleanly
- **Lock Management**: Should release file locks promptly

### 4. Error Handling
- **Syntax Errors**: Should identify recoverable vs. fatal errors
- **File System**: Should handle permissions, locks, disk space
- **Network Issues**: Should retry with exponential backoff
- **Resource Exhaustion**: Should implement backpressure

## Test Data Characteristics

### Size Variations
- **Small**: < 100 components (baseline tests)
- **Medium**: 100-1000 components (typical usage)
- **Large**: 1000-10000 components (stress testing)
- **Extreme**: 10000+ components (edge case handling)

### Complexity Levels
- **Simple**: Basic JSX with standard props
- **Complex**: Nested components, spread operators, dynamic props
- **Extreme**: Meta-programming, runtime generation, circular refs

### Error Scenarios
- **Recoverable**: Missing imports, typos, incomplete syntax
- **Complex**: Circular dependencies, conflicting rules
- **Fatal**: Corrupted files, system resource exhaustion

## Monitoring and Profiling

### Memory Profiling
```bash
# Generate heap snapshot
node --inspect --expose-gc test-runner.js

# Monitor memory usage over time
node --trace-gc --expose-gc test-runner.js
```

### Performance Profiling
```bash
# CPU profiling
node --prof test-runner.js
node --prof-process isolate-*.log > profile.txt

# Event loop monitoring
node --trace-events-enabled --trace-event-categories=v8 test-runner.js
```

### Debugging Edge Cases
```bash
# Verbose logging
DEBUG=jsx-migr8:* npm run test:edge-cases

# Stack trace on errors
NODE_OPTIONS="--trace-warnings" npm run test:edge-cases

# Memory debugging
NODE_OPTIONS="--inspect-brk" npm run test:edge-cases
```

## Success Criteria

A successful edge case test run should demonstrate:

1. **Robustness**: No unhandled crashes or exceptions
2. **Performance**: Acceptable resource usage under stress
3. **Accuracy**: Correct transformations even in complex scenarios
4. **Recovery**: Graceful handling of error conditions
5. **Consistency**: Repeatable results across multiple runs

## Contributing New Edge Cases

When adding new edge case scenarios:

1. **Document the scenario**: What edge case does it test?
2. **Provide expected behavior**: How should jsx-migr8 handle it?
3. **Include recovery tests**: What happens when it fails?
4. **Add performance expectations**: Resource usage limits
5. **Update this README**: Document the new test category

## Troubleshooting

### Common Issues

**Memory Exhaustion**
- Reduce test file sizes
- Enable garbage collection
- Use streaming processing

**Timeout Errors**
- Increase test timeout values
- Check for infinite loops
- Verify circular dependency handling

**File System Errors**
- Check file permissions
- Verify disk space
- Ensure proper cleanup

### Debug Mode
```bash
# Enable debug logging
export DEBUG="jsx-migr8:*"
npm run test:edge-cases

# Increase verbosity
export LOG_LEVEL="debug"
npm run test:edge-cases
```
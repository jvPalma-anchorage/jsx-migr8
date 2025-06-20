# Asynchronous Processing Optimizations

This document describes the comprehensive asynchronous processing optimizations implemented in jsx-migr8 v2.0+.

## Overview

The jsx-migr8 codebase has been enhanced with extensive asynchronous processing capabilities to handle large codebases efficiently while providing real-time progress feedback and robust error handling.

## Key Features

### 1. Async Graph Building (`src/graph/buildGraph.ts`)

**Enhanced Functions:**
- `buildGraphAsyncEnhanced()` - Multi-phase processing with adaptive strategies
- `buildGraphAsyncBatched()` - Memory-efficient batch processing for large codebases
- `buildGraphAsync()` - Standard async processing with concurrency control

**Features:**
- **Adaptive Processing**: Automatically chooses optimal strategy based on codebase size
- **Worker Thread Support**: CPU-intensive AST parsing can be offloaded to worker threads
- **Memory Management**: Automatic garbage collection and memory monitoring
- **Progress Tracking**: Real-time progress updates with phase information
- **Batch Processing**: Processes files in batches to avoid memory pressure

**Usage:**
```typescript
import { buildGraphAsyncEnhanced } from "@/graph/buildGraph";

const result = await buildGraphAsyncEnhanced(rootPath, blacklist, {
  showProgress: true,
  adaptiveProcessing: true,
  memoryLimitMB: 512,
  onProgress: (phase, completed, total) => {
    console.log(`${phase}: ${completed}/${total}`);
  },
});
```

### 2. Streaming File Analysis (`src/analyzer/async-analyzer.ts`)

**Components:**
- `StreamingAnalyzer` - Memory-efficient analysis with streaming
- `FileAnalysisStream` - Transform stream for processing files
- `createStreamingAnalyzer()` - Factory function with optimal defaults

**Features:**
- **Memory-Efficient Streaming**: Processes files without loading entire codebase into memory
- **Worker Thread Integration**: Can offload AST parsing to worker threads
- **Progress Tracking**: Real-time progress with file-level granularity
- **Error Isolation**: Individual file errors don't stop entire analysis
- **Batch Processing**: Configurable batch sizes for optimal throughput

**Usage:**
```typescript
import { createStreamingAnalyzer } from "@/analyzer/async-analyzer";

const analyzer = createStreamingAnalyzer({
  useWorkerThreads: true,
  showProgress: true,
  concurrency: 8,
});

const result = await analyzer.analyzeFiles(filePaths);
```

### 3. Async Migration (`src/migrator/async-migrator.ts`)

**Components:**
- `AsyncMigrator` - Comprehensive migration with progress tracking
- `MigrationStream` - Transform stream for migration operations
- `createAsyncMigrator()` - Factory with optimal defaults

**Features:**
- **Multi-Phase Progress**: Preparation, Migration, and Finalization phases
- **Backup Integration**: Automatic backup creation before modifications
- **Syntax Validation**: Pre-migration syntax validation
- **Diff Generation**: Colored diff output for dry-run mode
- **Error Recovery**: Retry logic with exponential backoff
- **Performance Metrics**: Detailed timing and throughput statistics

**Usage:**
```typescript
import { createAsyncMigrator } from "@/migrator/async-migrator";

const migrator = createAsyncMigrator({
  showProgress: true,
  enableBackup: true,
  validateSyntax: true,
  useWorkerThreads: true,
});

const result = await migrator.migrateComponents(migrationMapper, migr8Spec, true);
```

### 4. Performance Monitoring (`src/utils/fs/performance-monitor.ts`)

**Components:**
- `PerformanceMonitor` - Tracks operation metrics and memory usage
- `PerformanceTracker` - Individual operation tracking
- `globalPerformanceMonitor` - Singleton instance for global tracking

**Features:**
- **Real-Time Metrics**: Duration, memory usage, throughput tracking
- **Performance Warnings**: Automatic alerts for slow operations or high memory usage
- **Aggregated Statistics**: Summary reports across all operations
- **Memory Efficiency**: Tracks bytes processed per memory used
- **Event-Driven**: Emits events for monitoring integration

**Usage:**
```typescript
import { globalPerformanceMonitor } from "@/utils/fs/performance-monitor";

const tracker = globalPerformanceMonitor.startOperation("myOperation", filePath);
// ... perform operation ...
tracker.complete(bytesProcessed);

// Get performance report
console.log(globalPerformanceMonitor.getPerformanceReport());
```

### 5. Progress Indicators (`src/utils/fs/progress-indicator.ts`)

**Components:**
- `ProgressIndicator` - Configurable progress display
- `MultiPhaseProgress` - Multi-phase operation progress
- `createProgressBar()` / `createSpinner()` - Factory functions

**Features:**
- **Multiple Formats**: Bar, spinner, dots, minimal, detailed
- **Real-Time Updates**: Speed, ETA, memory usage display
- **Multi-Phase Support**: Track progress across multiple phases
- **Customizable Display**: Configurable width, update intervals, and information shown

**Usage:**
```typescript
import { createProgressBar, MultiPhaseProgress } from "@/utils/fs/progress-indicator";

// Simple progress bar
const progress = createProgressBar(totalFiles, {
  showSpeed: true,
  showETA: true,
  showMemory: true,
});

progress.update(1, currentFile);

// Multi-phase progress
const multiPhase = new MultiPhaseProgress([
  { name: "Analysis", weight: 60, total: fileCount },
  { name: "Migration", weight: 40, total: fileCount },
]);

const phase1 = multiPhase.startPhase(0, fileCount);
phase1.update(1);
```

### 6. Worker Thread Pool (`src/utils/fs/worker-pool.ts`)

**Components:**
- `WorkerPool` - Manages worker threads for CPU-intensive tasks
- `getWorkerPool()` - Global worker pool instance
- `executeTask()` - Execute task in worker thread

**Features:**
- **Automatic Scaling**: Creates workers based on CPU cores and workload
- **Task Queuing**: Handles more tasks than available workers
- **Worker Lifecycle**: Automatic worker creation, idle timeout, and cleanup
- **Error Handling**: Proper error propagation from worker threads
- **Resource Management**: Memory and CPU usage monitoring

**Supported Tasks:**
- `PARSE_AST` - Parse JavaScript/TypeScript AST
- `ANALYZE_IMPORTS` - Extract import statements
- `PROCESS_JSX` - Process JSX elements
- `VALIDATE_SYNTAX` - Syntax validation

**Usage:**
```typescript
import { getWorkerPool, TASK_TYPES } from "@/utils/fs/worker-pool";

const pool = getWorkerPool();
const result = await pool.execute(TASK_TYPES.PARSE_AST, {
  filePath: "/path/to/file.tsx",
});
```

### 7. Error Recovery (`src/utils/fs/error-recovery.ts`)

**Components:**
- `RetryExecutor` - Advanced retry logic with circuit breaker
- `CircuitBreaker` - Prevents cascading failures
- `BatchRetryExecutor` - Retry logic for batch operations

**Features:**
- **Multiple Retry Strategies**: Conservative, Aggressive, Gentle, Network
- **Circuit Breaker**: Prevents system overload during failures
- **Exponential Backoff**: Intelligent delay calculation with jitter
- **Error Classification**: Determines which errors are retryable
- **Statistics Tracking**: Success rates, failure patterns, response times

**Retry Strategies:**
- **Conservative**: 3 attempts, moderate delays
- **Aggressive**: 5 attempts, shorter delays
- **Gentle**: 2 attempts, longer delays
- **Network**: 4 attempts, optimized for network errors

**Usage:**
```typescript
import { executeWithRetry, RETRY_STRATEGIES } from "@/utils/fs/error-recovery";

const result = await executeWithRetry(
  () => riskyOperation(),
  "myOperation",
  RETRY_STRATEGIES.AGGRESSIVE
);
```

### 8. Enhanced CLI (`src/cli/async-cli.ts`)

**Components:**
- `AsyncCliRunner` - Enhanced CLI with async processing
- `runEnhancedCli()` - Main CLI entry point

**Features:**
- **Real-Time Progress**: Live progress updates during operations
- **Performance Reports**: Built-in performance monitoring
- **Interactive Configuration**: Runtime configuration of async settings
- **Error Visualization**: Enhanced error reporting with context
- **Phase Tracking**: Multi-phase operation visualization

## Configuration Options

### Environment Variables

```bash
# Async processing settings
ASYNC_CONCURRENCY=8          # Number of concurrent operations
ASYNC_BATCH_SIZE=32          # Batch size for file processing
ASYNC_MEMORY_LIMIT=512       # Memory limit in MB
ASYNC_USE_WORKERS=true       # Enable worker threads
ASYNC_SHOW_PROGRESS=true     # Show progress indicators
```

### Runtime Configuration

```typescript
// Configure async migrator
const migrator = createAsyncMigrator({
  concurrency: 8,
  batchSize: 16,
  useWorkerThreads: true,
  showProgress: true,
  memoryLimitMB: 512,
  enableBackup: true,
  validateSyntax: true,
  generateDiffs: true,
  maxRetries: 3,
});
```

## Performance Optimizations

### Memory Management
- **Streaming Processing**: Files processed in streams to avoid loading entire codebase
- **Batch Processing**: Large file sets processed in manageable batches
- **Automatic Garbage Collection**: Forced GC during intensive operations
- **Memory Monitoring**: Real-time memory usage tracking with warnings

### Concurrency Control
- **Adaptive Concurrency**: Automatically adjusts based on system resources
- **Resource-Based Limits**: CPU cores and memory influence concurrency decisions
- **Queue Management**: Intelligent task queuing and load balancing
- **Worker Thread Pooling**: Reuses worker threads for efficiency

### Error Handling
- **Circuit Breaker Pattern**: Prevents system overload during failures
- **Exponential Backoff**: Intelligent retry delays
- **Error Classification**: Distinguishes retryable from permanent errors
- **Graceful Degradation**: Falls back to simpler strategies on failure

## Integration with Existing Code

The async optimizations are designed to be backward compatible:

1. **Gradual Adoption**: Existing synchronous code continues to work
2. **Opt-In Enhancement**: Async features enabled via configuration
3. **Fallback Mechanisms**: Automatic fallback to synchronous processing on errors
4. **Performance Monitoring**: Track performance improvements

### Enabling Async Features

```typescript
// In migration operations
const { runArgs } = getContext();
const shouldUseAsync = runArgs.async || migrationEntries.length > 10;

if (shouldUseAsync) {
  // Use enhanced async migration
  const result = await migrateComponentsAsync(migrationMapper, migr8Spec, changeCode);
} else {
  // Fall back to standard migration
  const result = migrateComponents(changeCode);
}
```

## Performance Metrics

The async optimizations provide detailed performance metrics:

- **Throughput**: Files processed per second
- **Memory Efficiency**: Bytes processed per MB of memory used
- **Error Rates**: Percentage of operations that fail
- **Response Times**: Average, min, max operation durations
- **Resource Utilization**: CPU and memory usage patterns

## Best Practices

1. **Large Codebases**: Use `buildGraphAsyncBatched()` for >1000 files
2. **Memory Constraints**: Set appropriate `memoryLimitMB` for your system
3. **Worker Threads**: Enable for CPU-intensive operations on multi-core systems
4. **Progress Tracking**: Use progress indicators for long-running operations
5. **Error Handling**: Configure retry strategies based on your environment
6. **Performance Monitoring**: Enable performance reports for optimization insights

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Reduce batch size or enable worker threads
2. **Slow Performance**: Increase concurrency or enable worker threads
3. **Frequent Errors**: Adjust retry strategy or check system resources
4. **Progress Not Showing**: Ensure `showProgress: true` in options

### Debug Mode

Enable debug mode for detailed logging:

```bash
DEBUG=jsx-migr8:* npm run migrate
```

Or in code:
```typescript
const migrator = createAsyncMigrator({
  showProgress: true,
  showPerformanceReport: true,
});
```

## Future Enhancements

- **Distributed Processing**: Support for multiple machine processing
- **Smart Caching**: Cache AST parsing results across runs
- **Predictive Scaling**: ML-based concurrency adjustment
- **Real-Time Monitoring**: Web-based monitoring dashboard
- **Custom Worker Scripts**: User-defined worker thread operations
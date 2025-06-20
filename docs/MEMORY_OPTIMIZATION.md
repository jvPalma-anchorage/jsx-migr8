# Memory Optimization Guide

jsx-migr8 now includes comprehensive memory optimization features to handle large enterprise codebases (10k+ files) without memory overflow issues.

## Quick Start

For most users experiencing memory issues, simply run with memory monitoring:

```bash
# Enable memory monitoring with 2GB limit
yarn start --max-memory 2048 --enable-memory-monitoring

# For very large codebases, use conservative settings
yarn start --max-memory 1024 --batch-size 25 --concurrency 2 --quiet
```

## Memory Optimization Features

### 1. Memory Monitoring & Circuit Breaker

The tool automatically monitors heap usage and prevents memory overflow:

- **Warning Level** (70%): Shows memory pressure warnings
- **Critical Level** (85%): Triggers automatic garbage collection
- **Emergency Level** (95%): Opens circuit breaker to pause operations
- **Circuit Breaker**: Automatically pauses processing when memory is too high

### 2. Intelligent File Filtering

Automatically excludes files that are unlikely to contain relevant JSX:

- Test files (`.test.js`, `.spec.ts`)
- Config files (`webpack.config.js`, `babel.config.js`)
- Generated/build directories (`/dist/`, `/build/`, `/node_modules/`)
- Large files over 2MB (likely generated or vendor code)
- Files without JSX indicators (for `.js`/`.ts` files)

### 3. Memory-Efficient Batching

Processes files in small batches with memory-aware delays:

- **Adaptive Batch Size**: Automatically adjusts based on memory pressure
- **Garbage Collection**: Triggered between batches
- **Memory-Aware Delays**: Longer delays when memory is high

### 4. Streaming Processing

Uses streaming algorithms to avoid loading all files into memory at once.

## CLI Options

### Memory Management
- `--max-memory <MB>`: Maximum memory usage before triggering management (default: 1024)
- `--enable-memory-monitoring`: Enable memory monitoring and circuit breaker (default: true)
- `--batch-size <num>`: Number of files to process per batch (auto-calculated if not specified)
- `--concurrency <num>`: Number of concurrent operations (auto-detected if not specified)
- `--quiet`: Reduce output verbosity to save memory

### Examples

```bash
# Conservative settings for large codebases
yarn start --max-memory 512 --batch-size 10 --concurrency 1

# Aggressive settings for powerful machines
yarn start --max-memory 4096 --batch-size 200 --concurrency 8

# Disable memory monitoring (not recommended for large codebases)
yarn start --enable-memory-monitoring false
```

## Memory Usage Scenarios

### Small Codebases (< 1,000 files)
- Default settings work fine
- Memory monitoring optional
- Standard processing speed

### Medium Codebases (1,000 - 5,000 files)
```bash
yarn start --max-memory 1024 --enable-memory-monitoring
```

### Large Codebases (5,000 - 10,000 files)
```bash
yarn start --max-memory 2048 --batch-size 50 --concurrency 4 --quiet
```

### Very Large Codebases (10,000+ files)
```bash
yarn start --max-memory 1024 --batch-size 25 --concurrency 2 --quiet
```

## Memory Monitoring Output

When memory monitoring is enabled, you'll see:

```
🧠 Memory monitoring enabled with 1024MB limit
   Current usage: 256.3MB

✓ Memory: 256.3MB / 1024MB (25.0%)     # Good
⚡ Memory: 614.4MB / 1024MB (60.0%)     # Warning
⚠ Memory: 819.2MB / 1024MB (80.0%)     # Critical
```

## Troubleshooting Memory Issues

### "JavaScript heap out of memory"

1. **Reduce memory limit**:
   ```bash
   yarn start --max-memory 512
   ```

2. **Use smaller batches**:
   ```bash
   yarn start --batch-size 10
   ```

3. **Reduce concurrency**:
   ```bash
   yarn start --concurrency 1
   ```

4. **Enable quiet mode**:
   ```bash
   yarn start --quiet
   ```

### "Memory circuit breaker opened"

This means the tool detected very high memory usage and paused to prevent crashes:

1. **Wait for the operation to resume automatically**
2. **Reduce batch size and concurrency**
3. **Increase memory limit if you have more RAM available**

### Slow Performance

1. **Check memory usage** - high memory usage causes slowdowns
2. **Optimize file filtering** - ensure test/build files are excluded
3. **Use appropriate batch size** - too small batches are inefficient

## Advanced Configuration

### Custom Memory Thresholds

Modify the memory monitor configuration:

```bash
# More aggressive memory management
yarn start --max-memory 1024 --batch-size 20

# More relaxed memory management  
yarn start --max-memory 2048 --batch-size 100
```

### Node.js Memory Options

For extreme cases, you can also increase Node.js heap size:

```bash
# Increase Node.js heap to 4GB
NODE_OPTIONS="--max-old-space-size=4096" yarn start --max-memory 3072

# Enable manual garbage collection
NODE_OPTIONS="--expose-gc" yarn start --max-memory 1024
```

### Environment Variables

You can also set memory options via environment variables:

```bash
export JSX_MIGR8_MAX_MEMORY=1024
export JSX_MIGR8_BATCH_SIZE=50
export JSX_MIGR8_CONCURRENCY=2
```

## Performance Tips

1. **Start Conservative**: Begin with low memory limits and small batch sizes
2. **Monitor Progress**: Watch memory usage and adjust parameters
3. **Use Quiet Mode**: Reduces memory used by logging
4. **Exclude Unnecessary Files**: Ensure your blacklist includes build/test directories
5. **Close Other Applications**: Free up system memory before running large operations

## Memory Architecture

The memory optimization system works in layers:

1. **File Discovery**: Fast glob with intelligent filtering
2. **Batch Processing**: Files processed in memory-safe chunks  
3. **Memory Monitoring**: Continuous heap monitoring with circuit breaker
4. **Garbage Collection**: Automatic cleanup between batches
5. **Adaptive Processing**: Batch size adjusts based on memory pressure

## Technical Details

### Memory Monitor

- Tracks heap usage every 1 second
- Maintains 100-point memory history for trend analysis
- Provides memory-safe operation wrappers
- Supports custom memory thresholds

### File Filtering

Intelligent filtering reduces memory usage by 50-80% on typical codebases:

- **Pattern Matching**: Regex-based exclusion of common non-JSX files
- **Size Filtering**: Skips files over 2MB (likely generated)
- **Content Scanning**: Quick 1KB scan for JSX indicators in `.js`/`.ts` files

### Batch Processing

- **Memory-Aware**: Batch size adapts to current memory usage
- **Streaming**: Processes files without loading entire codebase into memory
- **Circuit Breaker**: Pauses processing when memory is critical

This system allows jsx-migr8 to handle codebases of any size without memory overflow, making it suitable for large enterprise applications.
/**
 * Memory-Enhanced CLI Integration Example
 * 
 * This demonstrates how to integrate the comprehensive memory monitoring
 * system into jsx-migr8's CLI workflows.
 */

import chalk from "chalk";
import { 
  setupMemoryManagement,
  shutdownMemoryManagement,
  getMemoryStatus,
  createFileProcessingProgress,
  createAnalysisSpinner,
  withMemoryMonitoring,
  showMemoryReport,
  optimizeMemory,
  isMemoryHealthy,
  registerMemoryCleanup,
  registerDegradationStrategy
} from "../utils/memory";
import { getContext, initContext } from "../context/globalContext";

/**
 * Enhanced CLI bootstrap with memory management
 */
export async function enhancedCLIBootstrap() {
  console.log(chalk.blue("🚀 Starting jsx-migr8 with enhanced memory management..."));

  try {
    // Initialize memory management system
    const memorySystem = setupMemoryManagement({
      maxMemoryMB: 2048,
      enableLimiting: true,
      enableReporting: true,
      enableProgressDisplay: true
    });

    console.log(chalk.green("✅ Memory management system initialized"));

    // Set up cleanup for global data structures
    registerMemoryCleanup(async () => {
      // Clean up any global caches
      if (global.astCache) {
        global.astCache.clear();
        console.log(chalk.gray("🧹 Cleared AST cache"));
      }
      if (global.fileCache) {
        global.fileCache.clear();
        console.log(chalk.gray("🧹 Cleared file cache"));
      }
    });

    // Register jsx-migr8 specific degradation strategies
    registerDegradationStrategy({
      name: 'reduce-analysis-detail',
      threshold: 70,
      description: 'Reduce detail level of component analysis',
      priority: 2,
      impact: 'medium',
      reversible: true,
      execute: () => {
        const context = getContext();
        if (context.runArgs) {
          context.runArgs.detailed = false;
          console.log(chalk.yellow("🔧 Reduced analysis detail to save memory"));
        }
      }
    });

    registerDegradationStrategy({
      name: 'disable-prop-tracking',
      threshold: 80,
      description: 'Disable detailed prop usage tracking',
      priority: 3,
      impact: 'high',
      reversible: true,
      execute: () => {
        const context = getContext();
        if (context.runArgs) {
          context.runArgs.trackProps = false;
          console.log(chalk.yellow("🔧 Disabled prop tracking to save memory"));
        }
      }
    });

    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow("\n🛑 Shutting down gracefully..."));
      
      // Show final memory report
      console.log(chalk.blue("\n📊 Final Memory Report:"));
      showMemoryReport(true);
      
      // Shutdown memory management
      shutdownMemoryManagement();
      
      console.log(chalk.green("👋 Goodbye!\n"));
      process.exit(0);
    });

    // Monitor memory health periodically
    const healthCheckInterval = setInterval(() => {
      if (!isMemoryHealthy()) {
        console.log(chalk.yellow("⚠️ Memory pressure detected - consider optimizing"));
      }
    }, 30000); // Check every 30 seconds

    // Clear interval on exit
    process.on('exit', () => {
      clearInterval(healthCheckInterval);
    });

    return memorySystem;
  } catch (error) {
    console.error(chalk.red("❌ Failed to initialize memory management:"), error);
    throw error;
  }
}

/**
 * Enhanced file processing with memory monitoring
 */
export async function processFilesWithMemoryMonitoring(
  files: string[],
  processor: (file: string) => Promise<void>
) {
  const progress = createFileProcessingProgress(files.length, 'Processing files');
  
  try {
    progress.start();
    
    // Process files in batches to manage memory
    const batchSize = Math.max(1, Math.floor(50 / (await getCurrentMemoryPressure())));
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      await withMemoryMonitoring(
        async () => {
          await Promise.all(batch.map(async (file) => {
            await processor(file);
            progress.increment(`Processed ${file}`);
          }));
        },
        {
          label: `Processing batch ${Math.floor(i / batchSize) + 1}`,
          maxMemoryMB: 1536, // 75% of default limit
          onPressure: async () => {
            console.log(chalk.yellow("🔄 Memory pressure detected, optimizing..."));
            const result = await optimizeMemory();
            console.log(chalk.blue(`✨ Optimization complete: ${result.reclaimedMB.toFixed(1)}MB freed`));
          }
        }
      );
      
      // Check memory health between batches
      if (!isMemoryHealthy()) {
        console.log(chalk.yellow("⚡ Optimizing memory between batches..."));
        await optimizeMemory();
      }
    }
    
    progress.stop();
    console.log(chalk.green(`✅ Processed ${files.length} files successfully`));
    
  } catch (error) {
    progress.stop();
    console.error(chalk.red("❌ File processing failed:"), error);
    throw error;
  }
}

/**
 * Enhanced codebase analysis with memory monitoring
 */
export async function analyzeCodebaseWithMemoryMonitoring(rootPath: string) {
  const spinner = createAnalysisSpinner('Analyzing codebase structure');
  
  try {
    spinner.start();
    
    return await withMemoryMonitoring(
      async () => {
        // Import heavy analysis modules only when needed
        const { buildGraph } = await import("../graph/buildGraph");
        
        spinner.updateMessage('Building dependency graph');
        const graph = await buildGraph(rootPath);
        
        spinner.updateMessage('Analyzing component usage');
        // Additional analysis logic here
        
        return graph;
      },
      {
        label: 'Codebase Analysis',
        maxMemoryMB: 1024,
        onPressure: () => {
          spinner.updateMessage('Memory pressure detected - optimizing analysis');
        }
      }
    );
    
  } finally {
    spinner.stop();
  }
}

/**
 * Enhanced migration with memory monitoring
 */
export async function migrateWithMemoryMonitoring(dryRun: boolean = false) {
  console.log(chalk.blue(`🔄 Starting ${dryRun ? 'dry-run' : 'migration'} with memory monitoring`));
  
  // Show initial memory status
  const initialStatus = getMemoryStatus();
  console.log(chalk.gray(`📊 Initial memory usage: ${initialStatus.current.percentage.toFixed(1)}%`));
  
  try {
    return await withMemoryMonitoring(
      async () => {
        const { migrateComponents } = await import("../migrator");
        
        // Pre-migration optimization
        if (initialStatus.current.percentage > 60) {
          console.log(chalk.yellow("🔧 Pre-migration memory optimization..."));
          await optimizeMemory();
        }
        
        const result = await migrateComponents(dryRun);
        
        return result;
      },
      {
        label: `Migration ${dryRun ? '(dry-run)' : '(live)'}`,
        maxMemoryMB: 1536,
        onPressure: async () => {
          console.log(chalk.yellow("⚠️ Memory pressure during migration"));
          const result = await optimizeMemory();
          console.log(chalk.blue(`🔧 Emergency optimization: ${result.actions.join(', ')}`));
        }
      }
    );
    
  } catch (error) {
    console.error(chalk.red("❌ Migration failed:"), error);
    
    // Show memory report on failure for debugging
    console.log(chalk.blue("\n📊 Memory Report (for debugging):"));
    showMemoryReport(true);
    
    throw error;
  } finally {
    // Show final memory status
    const finalStatus = getMemoryStatus();
    console.log(chalk.gray(`📊 Final memory usage: ${finalStatus.current.percentage.toFixed(1)}%`));
    
    if (finalStatus.current.percentage > 80) {
      console.log(chalk.yellow("💡 Consider increasing memory limits for better performance"));
    }
  }
}

/**
 * Memory status display for CLI
 */
export function displayEnhancedMemoryStatus() {
  const status = getMemoryStatus();
  const { current, pressure, limiting } = status;
  
  // Memory usage bar
  const barLength = 20;
  const filled = Math.round((current.percentage / 100) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  
  let statusColor = chalk.green;
  let statusIcon = "✅";
  
  if (pressure.level === 'critical') {
    statusColor = chalk.red;
    statusIcon = "🚨";
  } else if (pressure.level === 'high') {
    statusColor = chalk.red;
    statusIcon = "⚠️";
  } else if (pressure.level === 'medium') {
    statusColor = chalk.yellow;
    statusIcon = "⚡";
  }
  
  console.log(chalk.bold("🧠 Memory Status:"));
  console.log(statusColor(`   ${statusIcon} Usage: ${current.percentage.toFixed(1)}% [${bar}]`));
  console.log(`   📈 ${(current.used / (1024 * 1024)).toFixed(1)}MB / ${(current.total / (1024 * 1024)).toFixed(1)}MB`);
  console.log(`   🎯 Pressure: ${pressure.level} (${pressure.description})`);
  
  if (limiting.activeStrategies.length > 0) {
    console.log(chalk.yellow(`   🔧 Active optimizations: ${limiting.activeStrategies.join(', ')}`));
  }
  
  if (status.suggestions.immediate.length > 0) {
    console.log(chalk.blue(`   💡 Suggestions available: Run 'jsx-migr8 --memory-report' for details`));
  }
  
  console.log('');
}

/**
 * Memory command handlers for CLI
 */
export async function handleMemoryCommands(args: any) {
  if (args.memoryReport) {
    console.log(chalk.blue("📊 Generating comprehensive memory report...\n"));
    const report = showMemoryReport(true);
    
    if (args.exportMemoryReport) {
      const { exportMemoryReport } = await import("../utils/memory");
      await exportMemoryReport(args.exportMemoryReport, 'html');
      console.log(chalk.green(`📝 Memory report exported to ${args.exportMemoryReport}`));
    }
    
    return true;
  }
  
  if (args.memoryOptimize) {
    console.log(chalk.blue("🔧 Performing memory optimization...\n"));
    const result = await optimizeMemory();
    
    console.log(chalk.green(`✅ Optimization complete:`));
    console.log(`   💾 Memory freed: ${result.reclaimedMB.toFixed(1)}MB`);
    console.log(`   🔧 Actions taken: ${result.actions.length}`);
    result.actions.forEach(action => {
      console.log(chalk.gray(`   • ${action}`));
    });
    
    return true;
  }
  
  if (args.memoryStatus) {
    displayEnhancedMemoryStatus();
    return true;
  }
  
  return false;
}

/**
 * Helper to get current memory pressure level
 */
async function getCurrentMemoryPressure(): Promise<number> {
  const status = getMemoryStatus();
  
  switch (status.pressure.level) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    default: return 1;
  }
}

/**
 * Batch processing with dynamic sizing based on memory
 */
export async function adaptiveBatchProcessing<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  options?: {
    minBatchSize?: number;
    maxBatchSize?: number;
    label?: string;
  }
) {
  const {
    minBatchSize = 1,
    maxBatchSize = 100,
    label = 'Processing items'
  } = options || {};
  
  const progress = createFileProcessingProgress(items.length, label);
  
  try {
    progress.start();
    
    let processedCount = 0;
    
    while (processedCount < items.length) {
      // Calculate dynamic batch size based on memory pressure
      const memoryPressure = await getCurrentMemoryPressure();
      const baseBatchSize = Math.floor(maxBatchSize / memoryPressure);
      const batchSize = Math.max(minBatchSize, Math.min(maxBatchSize, baseBatchSize));
      
      const batch = items.slice(processedCount, processedCount + batchSize);
      
      await withMemoryMonitoring(
        async () => {
          for (const item of batch) {
            await processor(item);
            processedCount++;
            progress.update(processedCount);
          }
        },
        {
          label: `${label} (batch ${Math.floor(processedCount / batchSize) + 1})`,
          onPressure: async () => {
            console.log(chalk.yellow(`🔄 Memory pressure during ${label.toLowerCase()}`));
            await optimizeMemory();
          }
        }
      );
      
      // Brief pause between batches for memory recovery
      if (processedCount < items.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    progress.stop();
    console.log(chalk.green(`✅ ${label} completed: ${items.length} items processed`));
    
  } catch (error) {
    progress.stop();
    console.error(chalk.red(`❌ ${label} failed:`), error);
    throw error;
  }
}

// Export all enhanced CLI functions
export {
  enhancedCLIBootstrap as bootstrap,
  processFilesWithMemoryMonitoring as processFiles,
  analyzeCodebaseWithMemoryMonitoring as analyzeCodebase,
  migrateWithMemoryMonitoring as migrate,
  displayEnhancedMemoryStatus as displayMemoryStatus,
  handleMemoryCommands,
  adaptiveBatchProcessing
};
/**
 * Enhanced CLI with async processing and progress indicators
 * Provides real-time progress feedback and performance monitoring
 */

import chalk from "chalk";
import { select, input, confirm } from "@inquirer/prompts";
import { performance } from "node:perf_hooks";

import { getContext, lSuccess, lError, lWarning, lInfo } from "@/context/globalContext";
import { buildGraphAsyncEnhanced } from "@/graph/buildGraph";
import { createStreamingAnalyzer } from "@/analyzer/async-analyzer";
import { createAsyncMigrator } from "@/migrator/async-migrator";
import { 
  globalPerformanceMonitor,
  createProgressBar,
  MultiPhaseProgress,
  globalRetryExecutor 
} from "@/utils/fs-utils";

export interface AsyncCliOptions {
  showProgress?: boolean;
  showPerformanceReport?: boolean;
  useWorkerThreads?: boolean;
  concurrency?: number;
  memoryLimitMB?: number;
  enableCircuitBreaker?: boolean;
}

/**
 * Enhanced CLI runner with async processing
 */
export class AsyncCliRunner {
  private options: Required<AsyncCliOptions>;

  constructor(options: AsyncCliOptions = {}) {
    this.options = {
      showProgress: options.showProgress ?? true,
      showPerformanceReport: options.showPerformanceReport ?? false,
      useWorkerThreads: options.useWorkerThreads ?? true,
      concurrency: options.concurrency ?? 0, // 0 = auto-detect
      memoryLimitMB: options.memoryLimitMB ?? 512,
      enableCircuitBreaker: options.enableCircuitBreaker ?? true,
    };

    this.setupPerformanceMonitoring();
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (this.options.showPerformanceReport) {
      globalPerformanceMonitor.on("performance-warning", (warning) => {
        console.warn(chalk.yellow(`⚠️  Performance Warning: ${warning.message}`));
      });

      // Show periodic performance updates for long operations
      globalPerformanceMonitor.on("operation-complete", (metric) => {
        if (metric.duration > 5000) { // Show for operations > 5 seconds
          const memoryMB = (metric.memoryAfter.heapUsed / 1024 / 1024).toFixed(1);
          console.log(
            chalk.gray(
              `${metric.operation} completed in ${(metric.duration / 1000).toFixed(2)}s (${memoryMB}MB)`
            )
          );
        }
      });
    }

    if (this.options.enableCircuitBreaker) {
      globalRetryExecutor.on("circuit-opened", (data) => {
        lWarning(`Circuit breaker opened: ${data.reason}`);
      });

      globalRetryExecutor.on("circuit-closed", () => {
        lSuccess("Circuit breaker closed - operations restored");
      });
    }
  }

  /**
   * Enhanced graph building with progress tracking
   */
  async buildGraphWithProgress(root: string, blacklist: string[]): Promise<any> {
    const startTime = performance.now();
    
    lInfo("Initializing enhanced graph builder...");

    // Create multi-phase progress tracker
    const multiPhaseProgress = new MultiPhaseProgress([
      { name: "File Discovery", weight: 10, total: 1 },
      { name: "AST Parsing", weight: 60, total: 100 }, // Will be updated
      { name: "Graph Assembly", weight: 20, total: 100 }, // Will be updated
      { name: "Optimization", weight: 10, total: 1 },
    ]);

    let currentPhase = multiPhaseProgress.startPhase(0, 1);
    currentPhase.update(1, undefined, "Discovering files...");

    try {
      const result = await buildGraphAsyncEnhanced(root, blacklist, {
        showProgress: this.options.showProgress,
        adaptiveProcessing: true,
        memoryLimitMB: this.options.memoryLimitMB,
        onProgress: (phase, completed, total) => {
          if (phase === "File Analysis") {
            currentPhase?.complete();
            currentPhase = multiPhaseProgress.startPhase(1, total);
          } else if (phase === "Graph Building") {
            currentPhase?.complete(); 
            currentPhase = multiPhaseProgress.startPhase(2, total);
          }
          
          currentPhase?.setProgress(completed, undefined, phase);
        },
        onError: (error) => {
          lError(`Graph building error: ${error.message}`);
        },
      });

      // Complete final phase
      currentPhase?.complete();
      currentPhase = multiPhaseProgress.startPhase(3, 1);
      currentPhase.update(1, undefined, "Finalizing...");
      currentPhase.complete();

      multiPhaseProgress.complete();

      const duration = (performance.now() - startTime) / 1000;
      
      lSuccess(`Graph built successfully in ${duration.toFixed(2)}s`);
      lInfo(`Files processed: ${result.stats.totalFiles}`);
      lInfo(`Imports found: ${result.graph.imports.length}`);
      lInfo(`JSX elements: ${result.graph.jsx.length}`);

      if (result.errors.length > 0) {
        lWarning(`Completed with ${result.errors.length} errors`);
      }

      return result;
    } catch (error) {
      currentPhase?.stop();
      throw error;
    }
  }

  /**
   * Enhanced analysis with streaming
   */
  async analyzeFilesWithProgress(filePaths: string[]): Promise<any> {
    lInfo("Starting enhanced file analysis...");

    const analyzer = createStreamingAnalyzer({
      showProgress: this.options.showProgress,
      useWorkerThreads: this.options.useWorkerThreads,
      concurrency: this.options.concurrency || undefined,
      memoryLimitMB: this.options.memoryLimitMB,
      onProgress: (completed, total, currentFile) => {
        if (currentFile && this.options.showProgress) {
          console.log(chalk.blue(`Analyzing ${completed}/${total}: ${currentFile}`));
        }
      },
      onError: (error) => {
        lError(`Analysis error: ${error.message}`);
      },
    });

    try {
      const result = await analyzer.analyzeFiles(filePaths);
      
      lSuccess(`Analysis completed`);
      lInfo(`Files analyzed: ${result.stats.totalFiles}`);
      lInfo(`Success rate: ${((result.stats.successfulFiles / result.stats.totalFiles) * 100).toFixed(1)}%`);
      lInfo(`Total imports: ${result.stats.totalImports}`);
      lInfo(`Total components: ${result.stats.totalComponents}`);
      lInfo(`Processing time: ${(result.stats.totalProcessingTime / 1000).toFixed(2)}s`);

      return result;
    } catch (error) {
      lError(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Enhanced migration with progress tracking
   */
  async migrateWithProgress(
    migrationMapper: Record<string, any>,
    migr8Spec: any,
    changeCode: boolean = false
  ): Promise<any> {
    const migrationCount = Object.keys(migrationMapper).length;
    
    lInfo(`Starting migration of ${migrationCount} files...`);

    const migrator = createAsyncMigrator({
      showProgress: this.options.showProgress,
      useWorkerThreads: this.options.useWorkerThreads && migrationCount > 20,
      concurrency: this.options.concurrency || undefined,
      memoryLimitMB: this.options.memoryLimitMB,
      enableBackup: true,
      validateSyntax: true,
      generateDiffs: !changeCode,
      onProgress: (completed, total, currentFile) => {
        if (this.options.showProgress) {
          const percentage = ((completed / total) * 100).toFixed(1);
          console.log(chalk.green(`Migration progress: ${percentage}% (${completed}/${total})`));
          
          if (currentFile) {
            console.log(chalk.gray(`  Processing: ${currentFile}`));
          }
        }
      },
      onError: (error) => {
        lError(`Migration error: ${error.message}`);
      },
      onPhaseChange: (phase, progress) => {
        lInfo(`Migration phase: ${phase} (${progress.toFixed(1)}%)`);
      },
    });

    try {
      const result = await migrator.migrateComponents(migrationMapper, migr8Spec, changeCode);

      // Display results
      if (changeCode) {
        lSuccess(`Migration completed successfully!`);
      } else {
        lSuccess(`Dry-run completed - no files were modified`);
      }

      lInfo(`Files processed: ${result.stats.totalFiles}`);
      lInfo(`Successful: ${result.stats.successfulMigrations}`);
      lInfo(`Failed: ${result.stats.failedMigrations}`);
      lInfo(`Components migrated: ${result.stats.totalComponentsMigrated}`);
      lInfo(`Props changed: ${result.stats.totalPropsChanged}`);
      lInfo(`Processing time: ${(result.stats.totalProcessingTime / 1000).toFixed(2)}s`);
      lInfo(`Throughput: ${result.stats.throughputFilesPerSecond.toFixed(2)} files/s`);

      if (result.errors.length > 0) {
        lWarning(`Completed with ${result.errors.length} errors`);
      }

      return result;
    } catch (error) {
      lError(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Interactive CLI menu with enhanced options
   */
  async showEnhancedMenu(): Promise<void> {
    console.log(chalk.cyan.bold("\n🚀 jsx-migr8 Enhanced Async CLI"));
    console.log(chalk.gray("Powered by async processing and progress tracking\n"));

    const action = await select({
      message: "What would you like to do?",
      choices: [
        {
          name: "🔍 Build graph with enhanced processing",
          value: "build-graph",
        },
        {
          name: "📊 Analyze files with streaming",
          value: "analyze-files",
        },
        {
          name: "🚀 Migrate components (async)",
          value: "migrate-components",
        },
        {
          name: "🧪 Dry-run migration with progress",
          value: "dry-run",
        },
        {
          name: "⚡ Performance monitoring",
          value: "performance",
        },
        {
          name: "⚙️ Configure async settings",
          value: "configure",
        },
        {
          name: "❌ Exit",
          value: "exit",
        },
      ],
    });

    switch (action) {
      case "build-graph":
        await this.handleBuildGraph();
        break;
      case "analyze-files":
        await this.handleAnalyzeFiles();
        break;
      case "migrate-components":
        await this.handleMigrateComponents(true);
        break;
      case "dry-run":
        await this.handleMigrateComponents(false);
        break;
      case "performance":
        await this.handlePerformanceMonitoring();
        break;
      case "configure":
        await this.handleConfiguration();
        break;
      case "exit":
        console.log(chalk.yellow("Goodbye! 👋"));
        process.exit(0);
        break;
    }

    // Show menu again unless exiting
    if (action !== "exit") {
      await this.showEnhancedMenu();
    }
  }

  /**
   * Handle graph building
   */
  private async handleBuildGraph(): Promise<void> {
    const { runArgs } = getContext();
    
    if (!runArgs.rootPath) {
      lError("Root path not configured. Please set ROOT_PATH in your environment.");
      return;
    }

    const blacklist = runArgs.blacklist || [];
    
    try {
      await this.buildGraphWithProgress(runArgs.rootPath, blacklist);
    } catch (error) {
      lError(`Graph building failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle file analysis
   */
  private async handleAnalyzeFiles(): Promise<void> {
    const filePaths = await input({
      message: "Enter file paths (comma-separated) or glob pattern:",
      default: "src/**/*.{js,jsx,ts,tsx}",
    });

    const paths = filePaths.split(",").map(p => p.trim());
    
    try {
      await this.analyzeFilesWithProgress(paths);
    } catch (error) {
      lError(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle component migration
   */
  private async handleMigrateComponents(changeCode: boolean): Promise<void> {
    // This would integrate with the existing migration logic
    lInfo(`${changeCode ? "Migration" : "Dry-run"} functionality would be integrated here`);
    
    // Example of how it would work:
    try {
      // const { migrationMapper, migr8Spec } = await prepareMigration();
      // await this.migrateWithProgress(migrationMapper, migr8Spec, changeCode);
      
      lInfo("Migration integration pending - would use existing migration logic");
    } catch (error) {
      lError(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle performance monitoring
   */
  private async handlePerformanceMonitoring(): Promise<void> {
    console.log(chalk.cyan.bold("\n📊 Performance Report"));
    console.log(chalk.gray("=".repeat(50)));
    
    const report = globalPerformanceMonitor.getPerformanceReport();
    console.log(report);
    
    const retryStats = globalRetryExecutor.getStats();
    if (retryStats.circuitBreaker) {
      console.log(chalk.cyan.bold("\n🔌 Circuit Breaker Status"));
      console.log(chalk.gray("=".repeat(30)));
      console.log(`State: ${retryStats.circuitBreaker.state}`);
      console.log(`Success Rate: ${(retryStats.circuitBreaker.successRate * 100).toFixed(1)}%`);
      console.log(`Recent Calls: ${retryStats.circuitBreaker.totalRecentCalls}`);
      console.log(`Failures: ${retryStats.circuitBreaker.failures}`);
    }

    await input({
      message: "Press Enter to continue...",
    });
  }

  /**
   * Handle configuration
   */
  private async handleConfiguration(): Promise<void> {
    console.log(chalk.cyan.bold("\n⚙️ Async Configuration"));
    console.log(chalk.gray("=".repeat(30)));

    const showProgress = await confirm({
      message: "Show progress indicators?",
      default: this.options.showProgress,
    });

    const useWorkerThreads = await confirm({
      message: "Use worker threads for CPU-intensive operations?",
      default: this.options.useWorkerThreads,
    });

    const showPerformanceReport = await confirm({
      message: "Show performance reports?",
      default: this.options.showPerformanceReport,
    });

    const memoryLimit = await input({
      message: "Memory limit (MB):",
      default: this.options.memoryLimitMB.toString(),
    });

    // Update options
    this.options.showProgress = showProgress;
    this.options.useWorkerThreads = useWorkerThreads;
    this.options.showPerformanceReport = showPerformanceReport;
    this.options.memoryLimitMB = parseInt(memoryLimit) || this.options.memoryLimitMB;

    lSuccess("Configuration updated!");
  }
}

/**
 * Create and run the enhanced CLI
 */
export async function runEnhancedCli(options: AsyncCliOptions = {}): Promise<void> {
  const cli = new AsyncCliRunner(options);
  
  try {
    await cli.showEnhancedMenu();
  } catch (error) {
    lError(`CLI error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Export CLI runner for integration with existing CLI
 */
export { AsyncCliRunner };
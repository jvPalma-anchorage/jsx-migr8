/**
 * Asynchronous migration operations with progress tracking and error recovery
 * Provides comprehensive migration capabilities with performance monitoring
 */

import { performance } from "node:perf_hooks";
import { print } from "recast";
import { Transform, pipeline } from "node:stream";
import { promisify } from "node:util";

import { globalPerformanceMonitor } from "@/utils/fs/performance-monitor";
import { createProgressBar, MultiPhaseProgress } from "@/utils/fs/progress-indicator";
import { getWorkerPool, TASK_TYPES } from "@/utils/fs/worker-pool";
import { 
  AsyncFileUtils, 
  FileOperationError, 
  AsyncBatchProcessor,
  getConcurrencyLimit 
} from "@/utils/fs-utils";
import { makeDiff } from "@/utils/diff";
import { applyRemapRule } from "@/remap/utils/rules";
import { getCompName } from "@/utils/pathUtils";

const pipelineAsync = promisify(pipeline);

export interface MigrationTask {
  filePath: string;
  fileData: any;
  migr8Spec: any;
  changeCode: boolean;
}

export interface MigrationResult {
  filePath: string;
  success: boolean;
  changes?: {
    oldCode: string;
    newCode: string;
    diff?: string;
  };
  error?: FileOperationError;
  metrics: {
    processingTime: number;
    componentsMigrated: number;
    propsChanged: number;
    linesModified: number;
  };
}

export interface MigrationStats {
  totalFiles: number;
  successfulMigrations: number;
  failedMigrations: number;
  totalProcessingTime: number;
  totalComponentsMigrated: number;
  totalPropsChanged: number;
  totalLinesModified: number;
  averageProcessingTime: number;
  throughputFilesPerSecond: number;
}

export interface AsyncMigrationOptions {
  concurrency?: number;
  batchSize?: number;
  useWorkerThreads?: boolean;
  showProgress?: boolean;
  memoryLimitMB?: number;
  enableBackup?: boolean;
  validateSyntax?: boolean;
  generateDiffs?: boolean;
  maxRetries?: number;
  onProgress?: (completed: number, total: number, currentFile?: string) => void;
  onError?: (error: FileOperationError) => void;
  onResult?: (result: MigrationResult) => void;
  onPhaseChange?: (phase: string, progress: number) => void;
}

/**
 * Migration processing stream
 */
export class MigrationStream extends Transform {
  private options: Required<AsyncMigrationOptions>;
  private processed = 0;
  private total = 0;
  private results: MigrationResult[] = [];
  private errors: FileOperationError[] = [];

  constructor(options: AsyncMigrationOptions = {}) {
    super({
      objectMode: true,
      highWaterMark: options.batchSize ?? 8,
    });

    this.options = {
      concurrency: options.concurrency ?? getConcurrencyLimit(),
      batchSize: options.batchSize ?? 8,
      useWorkerThreads: options.useWorkerThreads ?? false,
      showProgress: options.showProgress ?? true,
      memoryLimitMB: options.memoryLimitMB ?? 256,
      enableBackup: options.enableBackup ?? true,
      validateSyntax: options.validateSyntax ?? true,
      generateDiffs: options.generateDiffs ?? true,
      maxRetries: options.maxRetries ?? 3,
      onProgress: options.onProgress ?? (() => {}),
      onError: options.onError ?? (() => {}),
      onResult: options.onResult ?? (() => {}),
      onPhaseChange: options.onPhaseChange ?? (() => {}),
    };
  }

  setTotal(total: number): void {
    this.total = total;
  }

  _transform(task: MigrationTask, encoding: any, callback: any): void {
    this.processMigrationTask(task)
      .then((result) => {
        this.processed++;
        this.results.push(result);
        
        this.options.onProgress(this.processed, this.total, task.filePath);
        this.options.onResult(result);
        
        this.push(result);
        callback();
      })
      .catch((error) => {
        const fileError = new FileOperationError("migrationTask", task.filePath, error);
        this.errors.push(fileError);
        this.options.onError(fileError);

        const errorResult: MigrationResult = {
          filePath: task.filePath,
          success: false,
          error: fileError,
          metrics: {
            processingTime: 0,
            componentsMigrated: 0,
            propsChanged: 0,
            linesModified: 0,
          },
        };

        this.processed++;
        this.options.onProgress(this.processed, this.total, task.filePath);
        this.push(errorResult);
        callback();
      });
  }

  /**
   * Process a single migration task
   */
  private async processMigrationTask(task: MigrationTask): Promise<MigrationResult> {
    const perfTracker = globalPerformanceMonitor.startOperation("migrationTask", task.filePath);
    const startTime = performance.now();

    try {
      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt < this.options.maxRetries) {
        try {
          if (this.options.useWorkerThreads) {
            return await this.processMigrationWithWorker(task, startTime);
          } else {
            return await this.processMigrationMainThread(task, startTime);
          }
        } catch (error) {
          lastError = error as Error;
          attempt++;
          
          if (attempt < this.options.maxRetries) {
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
          }
        }
      }

      throw lastError || new Error("Migration failed after retries");
    } finally {
      perfTracker.complete();
    }
  }

  /**
   * Process migration using worker thread
   */
  private async processMigrationWithWorker(
    task: MigrationTask,
    startTime: number
  ): Promise<MigrationResult> {
    const workerPool = getWorkerPool();

    // Validate syntax first if required
    if (this.options.validateSyntax) {
      const validationResult = await workerPool.execute(TASK_TYPES.VALIDATE_SYNTAX, {
        content: task.fileData.codeCompare?.old || "",
        filePath: task.filePath,
      });

      if (!validationResult.isValid) {
        throw new Error(`Syntax validation failed: ${validationResult.errors.join(", ")}`);
      }
    }

    // Process migration in worker (this would need to be implemented in the worker script)
    // For now, fall back to main thread processing
    return await this.processMigrationMainThread(task, startTime);
  }

  /**
   * Process migration in main thread
   */
  private async processMigrationMainThread(
    task: MigrationTask,
    startTime: number
  ): Promise<MigrationResult> {
    const { filePath, fileData, migr8Spec, changeCode } = task;

    // Apply remap rule
    const changed = applyRemapRule(changeCode, [filePath, fileData], migr8Spec);

    if (!changed) {
      return {
        filePath,
        success: true,
        metrics: {
          processingTime: performance.now() - startTime,
          componentsMigrated: 0,
          propsChanged: 0,
          linesModified: 0,
        },
      };
    }

    const { codeCompare, elements, importNode } = fileData;
    const oldCode = codeCompare?.old || "";
    let newCode: string;

    try {
      newCode = print(codeCompare.ast!).code || "";
    } catch (error) {
      throw new Error(`Failed to print AST: ${error instanceof Error ? error.message : String(error)}`);
    }

    const componentName = getCompName(
      importNode.local,
      importNode.imported,
      importNode.importedType
    );

    // Calculate metrics
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const linesModified = Math.abs(newLines.length - oldLines.length);

    let diff: string | undefined;
    if (this.options.generateDiffs && !changeCode) {
      try {
        diff = makeDiff(filePath, oldCode, newCode, 2);
      } catch (error) {
        console.warn(`Failed to generate diff for ${filePath}:`, error);
      }
    }

    // Write file if changing code
    if (changeCode) {
      const fileUtils = new AsyncFileUtils(1);
      const writeResults = await fileUtils.writeFiles([{
        path: filePath,
        content: newCode,
      }]);

      const writeResult = writeResults[0];
      if (!writeResult.success) {
        throw writeResult.error || new Error("Failed to write file");
      }
    }

    return {
      filePath,
      success: true,
      changes: {
        oldCode,
        newCode,
        diff,
      },
      metrics: {
        processingTime: performance.now() - startTime,
        componentsMigrated: elements.length,
        propsChanged: this.countPropsChanged(elements),
        linesModified,
      },
    };
  }

  /**
   * Count properties changed in elements
   */
  private countPropsChanged(elements: any[]): number {
    return elements.reduce((total, element) => {
      // This would need to be implemented based on the actual element structure
      // For now, return a placeholder
      return total + (element.props ? Object.keys(element.props).length : 0);
    }, 0);
  }

  getResults(): MigrationResult[] {
    return this.results;
  }

  getErrors(): FileOperationError[] {
    return this.errors;
  }
}

/**
 * Asynchronous migrator with comprehensive progress tracking and error handling
 */
export class AsyncMigrator {
  private options: AsyncMigrationOptions;

  constructor(options: AsyncMigrationOptions = {}) {
    this.options = {
      concurrency: getConcurrencyLimit(),
      batchSize: 8,
      useWorkerThreads: false,
      showProgress: true,
      memoryLimitMB: 256,
      enableBackup: true,
      validateSyntax: true,
      generateDiffs: true,
      maxRetries: 3,
      ...options,
    };
  }

  /**
   * Migrate components with full async processing and progress tracking
   */
  async migrateComponents(
    migrationMapper: Record<string, any>,
    migr8Spec: any,
    changeCode: boolean = false
  ): Promise<{
    results: MigrationResult[];
    errors: FileOperationError[];
    stats: MigrationStats;
  }> {
    const perfTracker = globalPerformanceMonitor.startOperation("migrateComponents");
    const startTime = performance.now();

    // Convert migration mapper to tasks
    const tasks: MigrationTask[] = Object.entries(migrationMapper).map(([filePath, fileData]) => ({
      filePath,
      fileData,
      migr8Spec,
      changeCode,
    }));

    if (tasks.length === 0) {
      return {
        results: [],
        errors: [],
        stats: this.createEmptyStats(),
      };
    }

    // Initialize multi-phase progress
    const multiPhaseProgress = new MultiPhaseProgress([
      { name: "Preparation", weight: 10, total: 1 },
      { name: "Migration", weight: 80, total: tasks.length },
      { name: "Finalization", weight: 10, total: 1 },
    ]);

    let currentPhaseProgress: any = null;

    if (this.options.showProgress !== false) {
      currentPhaseProgress = multiPhaseProgress.startPhase(0, 1);
      this.options.onPhaseChange?.("Preparation", 0);
    }

    try {
      // Phase 1: Preparation
      await this.prepareForMigration(tasks);
      
      if (currentPhaseProgress) {
        currentPhaseProgress.complete();
        currentPhaseProgress = multiPhaseProgress.startPhase(1, tasks.length);
        this.options.onPhaseChange?.("Migration", 0);
      }

      // Phase 2: Migration
      const migrationResults = await this.executeMigration(tasks, currentPhaseProgress);

      // Phase 3: Finalization
      if (currentPhaseProgress) {
        currentPhaseProgress.complete();
        currentPhaseProgress = multiPhaseProgress.startPhase(2, 1);
        this.options.onPhaseChange?.("Finalization", 0);
      }

      const stats = this.calculateStats(migrationResults.results, performance.now() - startTime);
      
      if (currentPhaseProgress) {
        currentPhaseProgress.complete();
      }
      
      multiPhaseProgress.complete();

      perfTracker.complete(tasks.length);

      return {
        results: migrationResults.results,
        errors: migrationResults.errors,
        stats,
      };
    } catch (error) {
      if (currentPhaseProgress) {
        currentPhaseProgress.stop();
      }
      
      perfTracker.error(error as Error);
      throw error;
    }
  }

  /**
   * Prepare for migration (backup, validation, etc.)
   */
  private async prepareForMigration(tasks: MigrationTask[]): Promise<void> {
    if (this.options.enableBackup) {
      // Backup preparation would go here
      // For now, just simulate preparation time
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Memory check
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / (1024 * 1024);
    
    if (memUsageMB > (this.options.memoryLimitMB ?? 256) * 0.8) {
      if (global.gc) {
        global.gc();
      }
    }
  }

  /**
   * Execute migration with streaming or batched processing
   */
  private async executeMigration(
    tasks: MigrationTask[],
    progressIndicator?: any
  ): Promise<{
    results: MigrationResult[];
    errors: FileOperationError[];
  }> {
    // Determine processing strategy based on task count
    if (tasks.length > 100) {
      return await this.executeMigrationBatched(tasks, progressIndicator);
    } else {
      return await this.executeMigrationStreaming(tasks, progressIndicator);
    }
  }

  /**
   * Execute migration with streaming
   */
  private async executeMigrationStreaming(
    tasks: MigrationTask[],
    progressIndicator?: any
  ): Promise<{
    results: MigrationResult[];
    errors: FileOperationError[];
  }> {
    const { Readable } = await import("node:stream");

    // Create task stream
    const taskStream = new Readable({
      objectMode: true,
      read() {
        // Stream is populated externally
      },
    });

    // Create migration stream
    const migrationStream = new MigrationStream({
      ...this.options,
      onProgress: (completed, total, currentFile) => {
        progressIndicator?.setProgress(completed, currentFile);
        this.options.onProgress?.(completed, total, currentFile);
      },
      onError: (error) => {
        this.options.onError?.(error);
      },
      onResult: (result) => {
        this.options.onResult?.(result);
      },
    });

    migrationStream.setTotal(tasks.length);

    // Collect results
    const results: MigrationResult[] = [];
    migrationStream.on('data', (result) => {
      results.push(result);
    });

    // Pipeline the streams
    const pipelinePromise = pipelineAsync(
      taskStream,
      migrationStream
    );

    // Feed tasks to the stream
    for (const task of tasks) {
      taskStream.push(task);
    }
    taskStream.push(null); // End the stream

    await pipelinePromise;

    return {
      results,
      errors: migrationStream.getErrors(),
    };
  }

  /**
   * Execute migration in batches for large numbers of files
   */
  private async executeMigrationBatched(
    tasks: MigrationTask[],
    progressIndicator?: any
  ): Promise<{
    results: MigrationResult[];
    errors: FileOperationError[];
  }> {
    const batchSize = this.options.batchSize ?? 16;
    const allResults: MigrationResult[] = [];
    const allErrors: FileOperationError[] = [];

    let completed = 0;

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchProcessor = new AsyncBatchProcessor(
        batch,
        async (task) => {
          const migrationStream = new MigrationStream(this.options);
          migrationStream.setTotal(1);
          
          return new Promise<MigrationResult>((resolve, reject) => {
            migrationStream._transform(task, null, (error?: Error) => {
              if (error) {
                reject(error);
              } else {
                const results = migrationStream.getResults();
                resolve(results[0]);
              }
            });
          });
        },
        Math.min(this.options.concurrency ?? 4, batch.length)
      );

      const batchResults = await batchProcessor.process((batchCompleted) => {
        const totalCompleted = completed + batchCompleted;
        progressIndicator?.setProgress(totalCompleted);
        this.options.onProgress?.(totalCompleted, tasks.length);
      });

      // Process batch results
      for (const result of batchResults) {
        if ('error' in result && result.error) {
          allErrors.push(result.error);
        } else {
          allResults.push(result as MigrationResult);
        }
      }

      completed += batch.length;

      // Memory management
      if (global.gc && completed % (batchSize * 4) === 0) {
        global.gc();
      }
    }

    return {
      results: allResults,
      errors: allErrors,
    };
  }

  /**
   * Calculate migration statistics
   */
  private calculateStats(results: MigrationResult[], totalTime: number): MigrationStats {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      totalFiles: results.length,
      successfulMigrations: successful.length,
      failedMigrations: failed.length,
      totalProcessingTime: totalTime,
      totalComponentsMigrated: successful.reduce((sum, r) => sum + r.metrics.componentsMigrated, 0),
      totalPropsChanged: successful.reduce((sum, r) => sum + r.metrics.propsChanged, 0),
      totalLinesModified: successful.reduce((sum, r) => sum + r.metrics.linesModified, 0),
      averageProcessingTime: successful.length > 0 
        ? successful.reduce((sum, r) => sum + r.metrics.processingTime, 0) / successful.length
        : 0,
      throughputFilesPerSecond: totalTime > 0 ? (results.length * 1000) / totalTime : 0,
    };
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): MigrationStats {
    return {
      totalFiles: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      totalProcessingTime: 0,
      totalComponentsMigrated: 0,
      totalPropsChanged: 0,
      totalLinesModified: 0,
      averageProcessingTime: 0,
      throughputFilesPerSecond: 0,
    };
  }
}

/**
 * Create an async migrator with optimal defaults
 */
export function createAsyncMigrator(options: AsyncMigrationOptions = {}): AsyncMigrator {
  return new AsyncMigrator({
    concurrency: getConcurrencyLimit(),
    batchSize: 8,
    useWorkerThreads: false,
    showProgress: true,
    enableBackup: true,
    validateSyntax: true,
    generateDiffs: true,
    maxRetries: 3,
    ...options,
  });
}

/**
 * Migrate components with enhanced async processing
 */
export async function migrateComponentsAsync(
  migrationMapper: Record<string, any>,
  migr8Spec: any,
  changeCode: boolean = false,
  options: AsyncMigrationOptions = {}
): Promise<{
  results: MigrationResult[];
  errors: FileOperationError[];
  stats: MigrationStats;
}> {
  const migrator = createAsyncMigrator(options);
  return await migrator.migrateComponents(migrationMapper, migr8Spec, changeCode);
}
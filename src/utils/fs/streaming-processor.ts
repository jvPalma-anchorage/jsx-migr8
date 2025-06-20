/**
 * StreamingFileProcessor - Memory-efficient file processing for large codebases
 * Processes files in batches with memory monitoring and automatic cleanup
 */

import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import { performance } from "node:perf_hooks";
import { types as T } from "recast";
import fg from "fast-glob";

import { globalPerformanceMonitor } from "./performance-monitor";
import { createSpinner } from "./progress-indicator";
import { getFileAstAndCodeAsync } from "./ast-operations";
import { FileOperationError } from "./error-handling";
import { getConcurrencyLimit } from "./concurrency-utils";

export interface StreamingProcessorOptions {
  batchSize?: number;
  maxMemoryMB?: number;
  concurrency?: number;
  maxFileSize?: number; // in bytes
  skipLargeFiles?: boolean;
  showProgress?: boolean;
  gcThreshold?: number; // Memory usage % to trigger GC
  prioritizeSmallFiles?: boolean;
}

export interface FileMetadata {
  path: string;
  size: number;
  priority: number;
  lastModified: number;
}

export interface ProcessingStats {
  totalFiles: number;
  processedFiles: number;
  skippedFiles: number;
  errorFiles: number;
  totalSize: number;
  processedSize: number;
  startTime: number;
  estimatedTimeRemaining: number;
  averageFileTime: number;
  currentMemoryMB: number;
  peakMemoryMB: number;
  gcTriggers: number;
}

export interface FileProcessingResult<T> {
  path: string;
  result?: T;
  error?: FileOperationError;
  size: number;
  processingTime: number;
  memoryUsed: number;
}

export type FileProcessor<T> = (
  filePath: string,
  ast: T.ASTNode,
  content: string,
  metadata: FileMetadata
) => Promise<T> | T;

/**
 * Streaming file processor with memory management
 */
export class StreamingFileProcessor<T = any> extends EventEmitter {
  private options: Required<StreamingProcessorOptions>;
  private stats: ProcessingStats;
  private isProcessing = false;
  private shouldStop = false;
  private currentBatch: FileMetadata[] = [];
  private processedPaths = new Set<string>();

  constructor(options: StreamingProcessorOptions = {}) {
    super();
    
    this.options = {
      batchSize: options.batchSize ?? 25,
      maxMemoryMB: options.maxMemoryMB ?? 512,
      concurrency: options.concurrency ?? getConcurrencyLimit(),
      maxFileSize: options.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      skipLargeFiles: options.skipLargeFiles ?? true,
      showProgress: options.showProgress ?? true,
      gcThreshold: options.gcThreshold ?? 80, // 80%
      prioritizeSmallFiles: options.prioritizeSmallFiles ?? true,
    };

    this.stats = this.initializeStats();
  }

  /**
   * Process files in streaming fashion
   */
  async processFiles(
    patterns: string[],
    rootPath: string,
    blacklist: string[],
    processor: FileProcessor<T>,
  ): Promise<{
    results: FileProcessingResult<T>[];
    stats: ProcessingStats;
    errors: FileOperationError[];
  }> {
    if (this.isProcessing) {
      throw new Error("Processor is already running");
    }

    this.isProcessing = true;
    this.shouldStop = false;
    this.stats = this.initializeStats();
    
    const perfTracker = globalPerformanceMonitor.startOperation("streamingProcess", rootPath);
    const results: FileProcessingResult<T>[] = [];
    const errors: FileOperationError[] = [];

    let progressIndicator: any = null;

    try {
      // Phase 1: Discover and prioritize files
      this.emit("phase", "discovery");
      const files = await this.discoverFiles(patterns, rootPath, blacklist);
      
      if (files.length === 0) {
        return { results, stats: this.stats, errors };
      }

      this.stats.totalFiles = files.length;
      this.stats.totalSize = files.reduce((sum, f) => sum + f.size, 0);

      // Phase 2: Sort and filter files
      this.emit("phase", "prioritization");
      const prioritizedFiles = this.prioritizeFiles(files);
      const filteredFiles = this.filterFiles(prioritizedFiles);

      this.emit("files-discovered", {
        total: files.length,
        filtered: filteredFiles.length,
        totalSize: this.stats.totalSize,
      });

      // Phase 3: Process files in batches
      this.emit("phase", "processing");
      
      if (this.options.showProgress) {
        progressIndicator = createSpinner(filteredFiles.length, {
          showSpeed: true,
          showETA: true,
          showMemory: true,
        });
      }

      const batches = this.createBatches(filteredFiles);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        if (this.shouldStop) break;

        const batch = batches[batchIndex];
        this.currentBatch = batch;

        // Check memory before processing batch
        await this.checkMemoryPressure();

        this.emit("batch-start", {
          batchIndex: batchIndex + 1,
          totalBatches: batches.length,
          batchSize: batch.length,
        });

        const batchResults = await this.processBatch(batch, processor);
        results.push(...batchResults.results);
        errors.push(...batchResults.errors);

        // Update stats
        this.stats.processedFiles += batchResults.results.length;
        this.stats.errorFiles += batchResults.errors.length;
        this.stats.processedSize += batchResults.results.reduce((sum, r) => sum + r.size, 0);

        // Update progress
        if (progressIndicator) {
          progressIndicator.setProgress(
            this.stats.processedFiles,
            `Batch ${batchIndex + 1}/${batches.length}`,
          );
        }

        this.emit("batch-complete", {
          batchIndex: batchIndex + 1,
          processed: batchResults.results.length,
          errors: batchResults.errors.length,
          stats: this.getRealtimeStats(),
        });

        // Small delay to allow other processes to run
        await this.sleep(10);
      }

      if (progressIndicator) {
        progressIndicator.complete("Processing completed");
      }

      perfTracker.complete(this.stats.processedFiles);
      this.emit("complete", this.stats);

    } catch (error) {
      if (progressIndicator) {
        progressIndicator.stop();
      }
      
      perfTracker.error(error as Error);
      this.emit("error", error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.currentBatch = [];
    }

    return { results, stats: this.stats, errors };
  }

  /**
   * Stop processing
   */
  stop(): void {
    this.shouldStop = true;
    this.emit("stopping");
  }

  /**
   * Get current processing statistics
   */
  getStats(): ProcessingStats {
    return { ...this.stats };
  }

  /**
   * Discover files matching patterns
   */
  private async discoverFiles(
    patterns: string[],
    rootPath: string,
    blacklist: string[],
  ): Promise<FileMetadata[]> {
    const filePaths = fg.sync(patterns, {
      cwd: rootPath,
      absolute: true,
      ignore: blacklist.map((b) => `**/${b}/**`),
    });

    const files: FileMetadata[] = [];
    
    // Get file stats in batches to avoid overwhelming the filesystem
    const statBatchSize = 100;
    for (let i = 0; i < filePaths.length; i += statBatchSize) {
      const batch = filePaths.slice(i, i + statBatchSize);
      
      const batchStats = await Promise.allSettled(
        batch.map(async (path) => {
          const stat = await fs.stat(path);
          return {
            path,
            size: stat.size,
            priority: this.calculateFilePriority(path, stat.size),
            lastModified: stat.mtime.getTime(),
          };
        }),
      );

      for (const result of batchStats) {
        if (result.status === "fulfilled") {
          files.push(result.value);
        }
      }
    }

    return files;
  }

  /**
   * Calculate file processing priority
   */
  private calculateFilePriority(path: string, size: number): number {
    let priority = 100;

    // Prioritize smaller files
    if (this.options.prioritizeSmallFiles) {
      if (size < 1024) priority += 50; // < 1KB
      else if (size < 10 * 1024) priority += 30; // < 10KB
      else if (size < 100 * 1024) priority += 10; // < 100KB
      else if (size > 1024 * 1024) priority -= 20; // > 1MB
    }

    // Prioritize certain file types
    if (path.endsWith('.tsx') || path.endsWith('.jsx')) priority += 20;
    if (path.endsWith('.ts')) priority += 15;
    if (path.endsWith('.js')) priority += 10;

    // Deprioritize test files and node_modules
    if (path.includes('test') || path.includes('spec')) priority -= 10;
    if (path.includes('node_modules')) priority -= 50;
    if (path.includes('.d.ts')) priority -= 5;

    return priority;
  }

  /**
   * Prioritize files for processing
   */
  private prioritizeFiles(files: FileMetadata[]): FileMetadata[] {
    return files.sort((a, b) => {
      // First by priority (higher first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Then by size (smaller first if prioritizing small files)
      if (this.options.prioritizeSmallFiles) {
        return a.size - b.size;
      }
      
      // Otherwise by last modified (newer first)
      return b.lastModified - a.lastModified;
    });
  }

  /**
   * Filter files based on size and other criteria
   */
  private filterFiles(files: FileMetadata[]): FileMetadata[] {
    return files.filter((file) => {
      // Skip files that are too large
      if (this.options.skipLargeFiles && file.size > this.options.maxFileSize) {
        this.stats.skippedFiles++;
        this.emit("file-skipped", {
          path: file.path,
          reason: "too-large",
          size: file.size,
        });
        return false;
      }

      // Skip already processed files
      if (this.processedPaths.has(file.path)) {
        this.stats.skippedFiles++;
        return false;
      }

      return true;
    });
  }

  /**
   * Create processing batches
   */
  private createBatches(files: FileMetadata[]): FileMetadata[][] {
    const batches: FileMetadata[][] = [];
    let currentBatch: FileMetadata[] = [];
    let currentBatchSize = 0;

    for (const file of files) {
      // Start new batch if current is full or would exceed memory limits
      const estimatedMemoryPerFile = Math.max(file.size * 2, 100 * 1024); // Estimate 2x file size + 100KB overhead
      
      if (
        currentBatch.length >= this.options.batchSize ||
        (currentBatchSize + estimatedMemoryPerFile > 50 * 1024 * 1024) // 50MB per batch max
      ) {
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [];
          currentBatchSize = 0;
        }
      }

      currentBatch.push(file);
      currentBatchSize += estimatedMemoryPerFile;
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * Process a single batch of files
   */
  private async processBatch(
    batch: FileMetadata[],
    processor: FileProcessor<T>,
  ): Promise<{
    results: FileProcessingResult<T>[];
    errors: FileOperationError[];
  }> {
    const results: FileProcessingResult<T>[] = [];
    const errors: FileOperationError[] = [];

    // Process files in batch with limited concurrency
    const semaphore = new Array(Math.min(this.options.concurrency, batch.length)).fill(0);
    
    const processFile = async (file: FileMetadata): Promise<void> => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      try {
        // Parse AST
        const [ast, content] = await getFileAstAndCodeAsync(file.path);
        
        // Process with user-provided processor
        const result = await processor(file.path, ast, content, file);
        
        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;

        results.push({
          path: file.path,
          result,
          size: file.size,
          processingTime: endTime - startTime,
          memoryUsed: Math.max(0, endMemory - startMemory),
        });

        this.processedPaths.add(file.path);
        
        this.emit("file-processed", {
          path: file.path,
          size: file.size,
          processingTime: endTime - startTime,
        });

      } catch (error) {
        const fileError = error instanceof FileOperationError
          ? error
          : new FileOperationError("processFile", file.path, error as Error);
        
        errors.push(fileError);
        
        const endTime = performance.now();
        results.push({
          path: file.path,
          error: fileError,
          size: file.size,
          processingTime: endTime - startTime,
          memoryUsed: 0,
        });

        this.emit("file-error", { path: file.path, error: fileError });
      }
    };

    // Process with concurrency control
    await Promise.all(
      batch.map(async (file, index) => {
        // Wait for available slot
        await new Promise(resolve => {
          const checkSlot = () => {
            const availableSlot = semaphore.findIndex(slot => slot === 0);
            if (availableSlot !== -1) {
              semaphore[availableSlot] = 1;
              resolve(availableSlot);
            } else {
              setTimeout(checkSlot, 10);
            }
          };
          checkSlot();
        }).then(async (slotIndex) => {
          try {
            await processFile(file);
          } finally {
            (semaphore as number[])[slotIndex as number] = 0;
          }
        });
      })
    );

    return { results, errors };
  }

  /**
   * Check memory pressure and trigger cleanup if needed
   */
  private async checkMemoryPressure(): Promise<void> {
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / (1024 * 1024);
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Update peak memory tracking
    this.stats.peakMemoryMB = Math.max(this.stats.peakMemoryMB, memUsageMB);
    this.stats.currentMemoryMB = memUsageMB;

    this.emit("memory-update", {
      heapUsedMB: memUsageMB,
      heapTotalMB: memUsage.heapTotal / (1024 * 1024),
      usagePercent: memUsagePercent,
    });

    // Trigger GC if memory usage is high
    if (memUsagePercent > this.options.gcThreshold || memUsageMB > this.options.maxMemoryMB) {
      this.emit("memory-pressure", {
        heapUsedMB: memUsageMB,
        threshold: this.options.maxMemoryMB,
        usagePercent: memUsagePercent,
      });

      if (global.gc) {
        const beforeGC = process.memoryUsage().heapUsed;
        global.gc();
        const afterGC = process.memoryUsage().heapUsed;
        const freedMB = (beforeGC - afterGC) / (1024 * 1024);
        
        this.stats.gcTriggers++;
        
        this.emit("gc-triggered", {
          freedMB,
          beforeMB: beforeGC / (1024 * 1024),
          afterMB: afterGC / (1024 * 1024),
        });
      }

      // Small delay after GC
      await this.sleep(50);
    }
  }

  /**
   * Get real-time processing statistics
   */
  private getRealtimeStats(): ProcessingStats {
    const now = performance.now();
    const elapsed = (now - this.stats.startTime) / 1000; // seconds
    const processed = this.stats.processedFiles;
    
    this.stats.averageFileTime = processed > 0 ? elapsed / processed : 0;
    
    if (processed > 0 && this.stats.totalFiles > processed) {
      const remainingFiles = this.stats.totalFiles - processed;
      this.stats.estimatedTimeRemaining = remainingFiles * this.stats.averageFileTime;
    } else {
      this.stats.estimatedTimeRemaining = 0;
    }

    return { ...this.stats };
  }

  /**
   * Initialize processing statistics
   */
  private initializeStats(): ProcessingStats {
    return {
      totalFiles: 0,
      processedFiles: 0,
      skippedFiles: 0,
      errorFiles: 0,
      totalSize: 0,
      processedSize: 0,
      startTime: performance.now(),
      estimatedTimeRemaining: 0,
      averageFileTime: 0,
      currentMemoryMB: process.memoryUsage().heapUsed / (1024 * 1024),
      peakMemoryMB: 0,
      gcTriggers: 0,
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Memory-aware semaphore for controlling concurrency based on memory usage
 */
class MemoryAwareSemaphore {
  private permits: number;
  private maxPermits: number;
  private queue: Array<() => void> = [];
  private memoryThresholdMB: number;

  constructor(initialPermits: number, memoryThresholdMB: number = 512) {
    this.permits = initialPermits;
    this.maxPermits = initialPermits;
    this.memoryThresholdMB = memoryThresholdMB;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0 && this.checkMemoryAvailable()) {
        this.permits--;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    this.processQueue();
  }

  private checkMemoryAvailable(): boolean {
    const memUsageMB = process.memoryUsage().heapUsed / (1024 * 1024);
    return memUsageMB < this.memoryThresholdMB;
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.permits > 0 && this.checkMemoryAvailable()) {
      const resolve = this.queue.shift()!;
      this.permits--;
      resolve();
    }
  }

  adjustPermits(memoryUsageMB: number): void {
    const memoryRatio = memoryUsageMB / this.memoryThresholdMB;
    
    if (memoryRatio > 0.9) {
      // High memory usage, reduce permits
      this.maxPermits = Math.max(1, Math.floor(this.maxPermits / 2));
    } else if (memoryRatio < 0.5) {
      // Low memory usage, can increase permits
      this.maxPermits = Math.min(this.maxPermits * 2, 10);
    }
    
    // Don't exceed available permits
    this.permits = Math.min(this.permits, this.maxPermits);
  }
}
/**
 * Performance monitoring utilities for async operations
 * Tracks performance metrics, memory usage, and provides optimization insights
 */

import { EventEmitter } from "node:events";
import { performance } from "node:perf_hooks";

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  timestamp: number;
  filePath?: string;
  bytesProcessed?: number;
  concurrency?: number;
}

export interface AggregatedMetrics {
  totalOperations: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  totalMemoryUsed: number;
  averageMemoryUsed: number;
  totalBytesProcessed: number;
  throughputBytesPerSecond: number;
  operationsPerSecond: number;
  errorRate: number;
  memoryEfficiency: number;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private errors: { operation: string; error: Error; timestamp: number }[] = [];
  private maxMetricsHistory = 1000;
  private readonly startTime = performance.now();

  /**
   * Start tracking an operation
   */
  startOperation(operation: string, filePath?: string): PerformanceTracker {
    return new PerformanceTracker(this, operation, filePath);
  }

  /**
   * Record a completed operation
   */
  recordOperation(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Limit memory usage by keeping only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    this.emit("operation-complete", metric);
    
    // Emit warnings for performance issues
    this.checkPerformanceThresholds(metric);
  }

  /**
   * Record an error
   */
  recordError(operation: string, error: Error): void {
    const errorRecord = {
      operation,
      error,
      timestamp: performance.now(),
    };
    
    this.errors.push(errorRecord);
    
    // Limit error history
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    this.emit("operation-error", errorRecord);
  }

  /**
   * Get aggregated metrics for all operations
   */
  getAggregatedMetrics(operation?: string): AggregatedMetrics {
    const relevantMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return this.getEmptyMetrics();
    }

    const durations = relevantMetrics.map(m => m.duration);
    const memoryUsages = relevantMetrics.map(m => 
      m.memoryAfter.heapUsed - m.memoryBefore.heapUsed
    );
    const bytesProcessed = relevantMetrics
      .filter(m => m.bytesProcessed)
      .reduce((sum, m) => sum + (m.bytesProcessed || 0), 0);

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const totalMemoryUsed = memoryUsages.reduce((sum, m) => sum + Math.max(0, m), 0);
    const totalErrors = operation 
      ? this.errors.filter(e => e.operation === operation).length
      : this.errors.length;

    const elapsedTime = (performance.now() - this.startTime) / 1000; // seconds

    return {
      totalOperations: relevantMetrics.length,
      totalDuration,
      averageDuration: totalDuration / relevantMetrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalMemoryUsed,
      averageMemoryUsed: totalMemoryUsed / relevantMetrics.length,
      totalBytesProcessed: bytesProcessed,
      throughputBytesPerSecond: bytesProcessed / (totalDuration / 1000),
      operationsPerSecond: relevantMetrics.length / elapsedTime,
      errorRate: totalErrors / (relevantMetrics.length + totalErrors),
      memoryEfficiency: bytesProcessed / Math.max(1, totalMemoryUsed),
    };
  }

  /**
   * Get performance summary report
   */
  getPerformanceReport(): string {
    const overall = this.getAggregatedMetrics();
    const operationTypes = [...new Set(this.metrics.map(m => m.operation))];
    
    let report = `Performance Report\n`;
    report += `==================\n`;
    report += `Total Operations: ${overall.totalOperations}\n`;
    report += `Total Duration: ${(overall.totalDuration / 1000).toFixed(2)}s\n`;
    report += `Average Duration: ${overall.averageDuration.toFixed(2)}ms\n`;
    report += `Operations/Second: ${overall.operationsPerSecond.toFixed(2)}\n`;
    report += `Memory Usage: ${(overall.totalMemoryUsed / 1024 / 1024).toFixed(2)}MB\n`;
    report += `Error Rate: ${(overall.errorRate * 100).toFixed(2)}%\n`;

    if (overall.totalBytesProcessed > 0) {
      report += `Throughput: ${(overall.throughputBytesPerSecond / 1024 / 1024).toFixed(2)}MB/s\n`;
      report += `Memory Efficiency: ${overall.memoryEfficiency.toFixed(2)} bytes/byte\n`;
    }

    report += `\nOperation Breakdown:\n`;
    for (const opType of operationTypes) {
      const opMetrics = this.getAggregatedMetrics(opType);
      report += `  ${opType}: ${opMetrics.totalOperations} ops, `;
      report += `${opMetrics.averageDuration.toFixed(2)}ms avg\n`;
    }

    if (this.errors.length > 0) {
      report += `\nRecent Errors:\n`;
      this.errors.slice(-5).forEach(error => {
        report += `  ${error.operation}: ${error.error.message}\n`;
      });
    }

    return report;
  }

  /**
   * Clear all metrics and errors
   */
  clear(): void {
    this.metrics = [];
    this.errors = [];
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Check for performance issues and emit warnings
   */
  private checkPerformanceThresholds(metric: PerformanceMetrics): void {
    // Warn if operation takes too long
    if (metric.duration > 5000) { // 5 seconds
      this.emit("performance-warning", {
        type: "slow-operation",
        message: `${metric.operation} took ${metric.duration}ms`,
        metric,
      });
    }

    // Warn if memory usage is high
    const memoryDelta = metric.memoryAfter.heapUsed - metric.memoryBefore.heapUsed;
    if (memoryDelta > 100 * 1024 * 1024) { // 100MB
      this.emit("performance-warning", {
        type: "high-memory-usage",
        message: `${metric.operation} used ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        metric,
      });
    }

    // Warn if heap usage is getting high
    if (metric.memoryAfter.heapUsed > 0.8 * metric.memoryAfter.heapTotal) {
      this.emit("performance-warning", {
        type: "heap-pressure",
        message: `Heap usage at ${((metric.memoryAfter.heapUsed / metric.memoryAfter.heapTotal) * 100).toFixed(1)}%`,
        metric,
      });
    }
  }

  private getEmptyMetrics(): AggregatedMetrics {
    return {
      totalOperations: 0,
      totalDuration: 0,
      averageDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      totalMemoryUsed: 0,
      averageMemoryUsed: 0,
      totalBytesProcessed: 0,
      throughputBytesPerSecond: 0,
      operationsPerSecond: 0,
      errorRate: 0,
      memoryEfficiency: 0,
    };
  }
}

/**
 * Performance tracker for individual operations
 */
export class PerformanceTracker {
  private readonly startTime: number;
  private readonly startMemory: NodeJS.MemoryUsage;

  constructor(
    private monitor: PerformanceMonitor,
    private operation: string,
    private filePath?: string,
  ) {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
  }

  /**
   * Complete the operation and record metrics
   */
  complete(bytesProcessed?: number, concurrency?: number): void {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    const metric: PerformanceMetrics = {
      operation: this.operation,
      duration: endTime - this.startTime,
      memoryBefore: this.startMemory,
      memoryAfter: endMemory,
      timestamp: endTime,
      filePath: this.filePath,
      bytesProcessed,
      concurrency,
    };

    this.monitor.recordOperation(metric);
  }

  /**
   * Record an error for this operation
   */
  error(error: Error): void {
    this.monitor.recordError(this.operation, error);
  }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();
/**
 * Memory monitoring utilities for preventing heap overflow
 * Provides heap tracking, circuit breaker patterns, and memory-safe operations
 */

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  heapUsedMB: number;
  heapTotalMB: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  rssMB: number;
  usage: number; // Percentage of heap used
}

export interface MemoryThresholds {
  warning: number; // MB
  critical: number; // MB
  emergency: number; // MB
}

export interface MemoryMonitorConfig {
  maxMemoryMB: number;
  warningThresholdPercent: number; // 0-100
  criticalThresholdPercent: number; // 0-100
  emergencyThresholdPercent: number; // 0-100
  gcThresholdMB: number;
  monitorInterval: number; // ms
  enableAutoGC: boolean;
  circuitBreakerEnabled: boolean;
}

export class MemoryMonitor {
  private config: MemoryMonitorConfig;
  private isCircuitOpen = false;
  private lastGCTime = 0;
  private memoryHistory: MemoryStats[] = [];
  private maxHistorySize = 100;
  private monitoringInterval?: NodeJS.Timeout;
  private callbacks: {
    onWarning?: (stats: MemoryStats) => void;
    onCritical?: (stats: MemoryStats) => void;
    onEmergency?: (stats: MemoryStats) => void;
    onCircuitOpen?: (stats: MemoryStats) => void;
    onCircuitClose?: (stats: MemoryStats) => void;
  } = {};

  constructor(config: Partial<MemoryMonitorConfig> = {}) {
    this.config = {
      maxMemoryMB: config.maxMemoryMB ?? 1024, // 1GB default
      warningThresholdPercent: config.warningThresholdPercent ?? 70,
      criticalThresholdPercent: config.criticalThresholdPercent ?? 85,
      emergencyThresholdPercent: config.emergencyThresholdPercent ?? 95,
      gcThresholdMB: config.gcThresholdMB ?? 512,
      monitorInterval: config.monitorInterval ?? 1000,
      enableAutoGC: config.enableAutoGC ?? true,
      circuitBreakerEnabled: config.circuitBreakerEnabled ?? true,
    };
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / (1024 * 1024);
    const heapTotalMB = usage.heapTotal / (1024 * 1024);
    const rssMB = usage.rss / (1024 * 1024);
    const usagePercent = (heapUsedMB / this.config.maxMemoryMB) * 100;

    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      heapUsedMB,
      heapTotalMB,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      rss: usage.rss,
      rssMB,
      usage: usagePercent,
    };
  }

  /**
   * Get memory thresholds in MB
   */
  getThresholds(): MemoryThresholds {
    return {
      warning: (this.config.maxMemoryMB * this.config.warningThresholdPercent) / 100,
      critical: (this.config.maxMemoryMB * this.config.criticalThresholdPercent) / 100,
      emergency: (this.config.maxMemoryMB * this.config.emergencyThresholdPercent) / 100,
    };
  }

  /**
   * Check if memory usage is within safe limits
   */
  isMemorySafe(): boolean {
    const stats = this.getMemoryStats();
    const thresholds = this.getThresholds();
    return stats.heapUsedMB < thresholds.warning;
  }

  /**
   * Check if memory usage is at critical level
   */
  isMemoryCritical(): boolean {
    const stats = this.getMemoryStats();
    const thresholds = this.getThresholds();
    return stats.heapUsedMB >= thresholds.critical;
  }

  /**
   * Check if memory usage is at emergency level
   */
  isMemoryEmergency(): boolean {
    const stats = this.getMemoryStats();
    const thresholds = this.getThresholds();
    return stats.heapUsedMB >= thresholds.emergency;
  }

  /**
   * Force garbage collection if available and conditions are met
   */
  forceGarbageCollection(): boolean {
    const now = Date.now();
    const timeSinceLastGC = now - this.lastGCTime;
    const stats = this.getMemoryStats();

    // Only GC if enough time has passed and memory usage is high
    if (timeSinceLastGC > 5000 && stats.heapUsedMB > this.config.gcThresholdMB) {
      if (global.gc) {
        try {
          global.gc();
          this.lastGCTime = now;
          return true;
        } catch (error) {
          console.warn("Failed to trigger garbage collection:", error);
        }
      }
    }
    return false;
  }

  /**
   * Wait for memory to be available, with timeout
   */
  async waitForMemory(timeoutMs = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (this.isMemorySafe()) {
        return true;
      }

      // Try to free memory
      this.forceGarbageCollection();
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
  }

  /**
   * Circuit breaker check - returns true if operations should be blocked
   */
  shouldBlockOperation(): boolean {
    if (!this.config.circuitBreakerEnabled) {
      return false;
    }

    const stats = this.getMemoryStats();
    const thresholds = this.getThresholds();

    // Open circuit if memory is at emergency level
    if (stats.heapUsedMB >= thresholds.emergency) {
      if (!this.isCircuitOpen) {
        this.isCircuitOpen = true;
        this.callbacks.onCircuitOpen?.(stats);
      }
      return true;
    }

    // Close circuit if memory drops below critical level
    if (this.isCircuitOpen && stats.heapUsedMB < thresholds.critical) {
      this.isCircuitOpen = false;
      this.callbacks.onCircuitClose?.(stats);
    }

    return this.isCircuitOpen;
  }

  /**
   * Start continuous memory monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      const thresholds = this.getThresholds();

      // Add to history
      this.memoryHistory.push(stats);
      if (this.memoryHistory.length > this.maxHistorySize) {
        this.memoryHistory.shift();
      }

      // Check thresholds and trigger callbacks
      if (stats.heapUsedMB >= thresholds.emergency) {
        this.callbacks.onEmergency?.(stats);
        if (this.config.enableAutoGC) {
          this.forceGarbageCollection();
        }
      } else if (stats.heapUsedMB >= thresholds.critical) {
        this.callbacks.onCritical?.(stats);
        if (this.config.enableAutoGC) {
          this.forceGarbageCollection();
        }
      } else if (stats.heapUsedMB >= thresholds.warning) {
        this.callbacks.onWarning?.(stats);
      }

      // Update circuit breaker state
      this.shouldBlockOperation();
    }, this.config.monitorInterval);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Set callback functions for memory events
   */
  setCallbacks(callbacks: {
    onWarning?: (stats: MemoryStats) => void;
    onCritical?: (stats: MemoryStats) => void;
    onEmergency?: (stats: MemoryStats) => void;
    onCircuitOpen?: (stats: MemoryStats) => void;
    onCircuitClose?: (stats: MemoryStats) => void;
  }): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get memory usage trend (increasing, decreasing, stable)
   */
  getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' | 'unknown' {
    if (this.memoryHistory.length < 10) {
      return 'unknown';
    }

    const recent = this.memoryHistory.slice(-10);
    const first = recent[0].heapUsedMB;
    const last = recent[recent.length - 1].heapUsedMB;
    const difference = last - first;
    const threshold = first * 0.05; // 5% threshold

    if (difference > threshold) {
      return 'increasing';
    } else if (difference < -threshold) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Get memory statistics summary
   */
  getMemorySummary(): {
    current: MemoryStats;
    thresholds: MemoryThresholds;
    trend: string;
    isCircuitOpen: boolean;
    recommendations: string[];
  } {
    const current = this.getMemoryStats();
    const thresholds = this.getThresholds();
    const trend = this.getMemoryTrend();

    const recommendations: string[] = [];
    
    if (current.heapUsedMB > thresholds.warning) {
      recommendations.push('Consider reducing batch size');
    }
    
    if (current.heapUsedMB > thresholds.critical) {
      recommendations.push('Force garbage collection');
      recommendations.push('Process fewer files concurrently');
    }
    
    if (this.isCircuitOpen) {
      recommendations.push('Wait for memory to be freed before continuing');
    }
    
    if (trend === 'increasing') {
      recommendations.push('Memory usage is trending upward - consider breaking operation into smaller chunks');
    }

    return {
      current,
      thresholds,
      trend,
      isCircuitOpen: this.isCircuitOpen,
      recommendations,
    };
  }

  /**
   * Format memory size in human-readable format
   */
  static formatMemorySize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Create a memory-safe wrapper for async operations
   */
  createMemorySafeWrapper<T extends (...args: any[]) => Promise<any>>(
    operation: T,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      throwOnCircuitOpen?: boolean;
    } = {}
  ): T {
    const { maxRetries = 3, retryDelay = 1000, throwOnCircuitOpen = true } = options;

    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      let retries = 0;

      while (retries <= maxRetries) {
        // Check circuit breaker
        if (this.shouldBlockOperation()) {
          if (throwOnCircuitOpen) {
            throw new Error('Memory circuit breaker is open - operation blocked');
          }
          
          // Wait for memory to be available
          const memoryAvailable = await this.waitForMemory(30000);
          if (!memoryAvailable) {
            throw new Error('Memory pressure too high - operation timed out');
          }
        }

        try {
          // Check memory before operation
          if (!this.isMemorySafe() && retries > 0) {
            // Try to free memory
            this.forceGarbageCollection();
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }

          return await operation(...args);
        } catch (error) {
          retries++;
          
          // If it's a memory-related error and we have retries left
          if (retries <= maxRetries && this.isMemoryError(error)) {
            console.warn(`Memory pressure detected, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`);
            this.forceGarbageCollection();
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          
          throw error;
        }
      }

      throw new Error(`Operation failed after ${maxRetries} retries due to memory pressure`);
    }) as T;
  }

  /**
   * Check if an error is memory-related
   */
  private isMemoryError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    return (
      errorMessage.includes('heap') ||
      errorMessage.includes('memory') ||
      errorMessage.includes('out of memory') ||
      errorMessage.includes('maximum call stack')
    );
  }

  /**
   * Dispose of the memory monitor
   */
  dispose(): void {
    this.stopMonitoring();
    this.memoryHistory = [];
    this.callbacks = {};
  }
}

// Global memory monitor instance
export const globalMemoryMonitor = new MemoryMonitor();

/**
 * Convenience function to check if memory is safe
 */
export function isMemorySafe(maxMemoryMB?: number): boolean {
  if (maxMemoryMB) {
    const tempMonitor = new MemoryMonitor({ maxMemoryMB });
    return tempMonitor.isMemorySafe();
  }
  return globalMemoryMonitor.isMemorySafe();
}

/**
 * Convenience function to force garbage collection
 */
export function forceGarbageCollection(): boolean {
  return globalMemoryMonitor.forceGarbageCollection();
}

/**
 * Convenience function to get memory stats
 */
export function getMemoryStats(): MemoryStats {
  return globalMemoryMonitor.getMemoryStats();
}

/**
 * Memory-aware delay function
 */
export async function memoryAwareDelay(baseDelayMs: number = 100): Promise<void> {
  const stats = globalMemoryMonitor.getMemoryStats();
  const thresholds = globalMemoryMonitor.getThresholds();
  
  let delayMs = baseDelayMs;
  
  // Increase delay based on memory pressure
  if (stats.heapUsedMB > thresholds.critical) {
    delayMs *= 5; // 5x delay for critical memory
  } else if (stats.heapUsedMB > thresholds.warning) {
    delayMs *= 2; // 2x delay for warning level
  }
  
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Create a memory-efficient batch processor
 */
export function createMemoryEfficientBatcher<T, R>(
  processor: (batch: T[]) => Promise<R[]>,
  options: {
    maxBatchSize?: number;
    memoryLimitMB?: number;
    gcBetweenBatches?: boolean;
    delayBetweenBatches?: number;
  } = {}
) {
  const {
    maxBatchSize = 100,
    memoryLimitMB = 512,
    gcBetweenBatches = true,
    delayBetweenBatches = 100,
  } = options;
  
  const monitor = new MemoryMonitor({ maxMemoryMB: memoryLimitMB });

  return async function* processBatches(items: T[]): AsyncGenerator<R[], void, unknown> {
    for (let i = 0; i < items.length; i += maxBatchSize) {
      // Wait for memory to be available
      if (!monitor.isMemorySafe()) {
        await monitor.waitForMemory();
      }

      const batch = items.slice(i, i + maxBatchSize);
      const results = await processor(batch);
      
      yield results;

      // Clean up between batches
      if (gcBetweenBatches && i + maxBatchSize < items.length) {
        monitor.forceGarbageCollection();
        await memoryAwareDelay(delayBetweenBatches);
      }
    }
  };
}
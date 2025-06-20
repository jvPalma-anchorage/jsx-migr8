/**
 * Core Memory Monitoring System for jsx-migr8
 * 
 * Provides real-time memory usage tracking, pressure detection,
 * and automatic memory management for large codebase processing.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface MemoryStats {
  used: number;
  total: number;
  free: number;
  percentage: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  timestamp: number;
}

export interface MemoryPressureLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  description: string;
}

export interface MemoryConfiguration {
  maxMemoryMB: number;
  pressureThresholds: {
    medium: number;
    high: number;
    critical: number;
  };
  gcTriggerThreshold: number;
  monitoringInterval: number;
  leakDetectionWindow: number;
  cleanupEnabled: boolean;
  warningsEnabled: boolean;
}

export interface MemoryEvent {
  type: 'pressure' | 'gc' | 'limit' | 'leak' | 'cleanup';
  level?: string;
  stats: MemoryStats;
  message: string;
  timestamp: number;
}

export interface GCStats {
  frequency: number;
  lastRun: number;
  totalRuns: number;
  averageReclaimedMB: number;
  effectiveness: number;
}

export interface MemoryLeakCandidate {
  objectType: string;
  count: number;
  growthRate: number;
  memoryImpact: number;
  detected: number;
}

export class MemoryMonitor extends EventEmitter {
  private config: MemoryConfiguration;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private memoryHistory: MemoryStats[] = [];
  private gcStats: GCStats = {
    frequency: 0,
    lastRun: 0,
    totalRuns: 0,
    averageReclaimedMB: 0,
    effectiveness: 0
  };
  private leakCandidates: Map<string, MemoryLeakCandidate> = new Map();
  private lastPressureLevel: string = 'low';
  private cleanupCallbacks: Array<() => Promise<void> | void> = [];

  constructor(config?: Partial<MemoryConfiguration>) {
    super();
    
    this.config = {
      maxMemoryMB: 2048, // 2GB default
      pressureThresholds: {
        medium: 60, // 60%
        high: 80,   // 80%
        critical: 95 // 95%
      },
      gcTriggerThreshold: 75, // 75%
      monitoringInterval: 1000, // 1 second
      leakDetectionWindow: 30000, // 30 seconds
      cleanupEnabled: true,
      warningsEnabled: true,
      ...config
    };

    // Set up process memory limit
    if (process.platform !== 'win32') {
      try {
        const maxMemoryBytes = this.config.maxMemoryMB * 1024 * 1024;
        process.setMaxListeners(0);
        
        // Handle V8 memory limit
        if (global.gc) {
          // V8 heap limit enforcement
          const v8 = require('v8');
          const heapStats = v8.getHeapStatistics();
          if (heapStats.heap_size_limit > maxMemoryBytes) {
            console.warn(`Warning: V8 heap limit (${Math.round(heapStats.heap_size_limit / 1024 / 1024)}MB) exceeds configured limit (${this.config.maxMemoryMB}MB)`);
          }
        }
      } catch (error) {
        console.warn('Could not set memory limits:', error);
      }
    }

    this.setupGlobalGC();
  }

  /**
   * Start continuous memory monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.emit('monitoring-started');

    this.monitoringInterval = setInterval(() => {
      this.collectMemoryStats();
    }, this.config.monitoringInterval);

    // Initial collection
    this.collectMemoryStats();
  }

  /**
   * Stop memory monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('monitoring-stopped');
  }

  /**
   * Get current memory statistics
   */
  public getCurrentStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const totalMemory = this.config.maxMemoryMB * 1024 * 1024;
    
    return {
      used: memUsage.heapUsed + memUsage.external,
      total: totalMemory,
      free: totalMemory - (memUsage.heapUsed + memUsage.external),
      percentage: ((memUsage.heapUsed + memUsage.external) / totalMemory) * 100,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      rss: memUsage.rss,
      timestamp: Date.now()
    };
  }

  /**
   * Get memory pressure level
   */
  public getPressureLevel(): MemoryPressureLevel {
    const stats = this.getCurrentStats();
    const { pressureThresholds } = this.config;

    if (stats.percentage >= pressureThresholds.critical) {
      return {
        level: 'critical',
        threshold: pressureThresholds.critical,
        description: 'Critical memory pressure - immediate action required'
      };
    } else if (stats.percentage >= pressureThresholds.high) {
      return {
        level: 'high',
        threshold: pressureThresholds.high,
        description: 'High memory pressure - consider reducing workload'
      };
    } else if (stats.percentage >= pressureThresholds.medium) {
      return {
        level: 'medium',
        threshold: pressureThresholds.medium,
        description: 'Medium memory pressure - monitoring recommended'
      };
    } else {
      return {
        level: 'low',
        threshold: 0,
        description: 'Low memory pressure - optimal performance'
      };
    }
  }

  /**
   * Force garbage collection
   */
  public async forceGC(): Promise<{ success: boolean; reclaimedMB: number }> {
    const beforeStats = this.getCurrentStats();
    
    try {
      if (global.gc) {
        const startTime = performance.now();
        global.gc();
        const gcTime = performance.now() - startTime;
        
        // Allow some time for GC to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const afterStats = this.getCurrentStats();
        const reclaimedBytes = beforeStats.used - afterStats.used;
        const reclaimedMB = reclaimedBytes / (1024 * 1024);
        
        // Update GC stats
        this.gcStats.totalRuns++;
        this.gcStats.lastRun = Date.now();
        this.gcStats.averageReclaimedMB = 
          (this.gcStats.averageReclaimedMB * (this.gcStats.totalRuns - 1) + reclaimedMB) / 
          this.gcStats.totalRuns;
        this.gcStats.effectiveness = Math.max(0, (reclaimedBytes / beforeStats.used) * 100);
        
        this.emit('gc-completed', {
          type: 'gc',
          stats: afterStats,
          message: `GC completed: ${reclaimedMB.toFixed(2)}MB reclaimed in ${gcTime.toFixed(2)}ms`,
          timestamp: Date.now()
        });

        return { success: true, reclaimedMB };
      } else {
        // Fallback: try to trigger GC through memory pressure
        const largeBuffer = Buffer.alloc(1024 * 1024 * 10); // 10MB
        largeBuffer.fill(0);
        // Let it be garbage collected
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const afterStats = this.getCurrentStats();
        const reclaimedBytes = Math.max(0, beforeStats.used - afterStats.used);
        const reclaimedMB = reclaimedBytes / (1024 * 1024);
        
        return { success: false, reclaimedMB };
      }
    } catch (error) {
      console.error('Error during garbage collection:', error);
      return { success: false, reclaimedMB: 0 };
    }
  }

  /**
   * Register cleanup callback for automatic memory management
   */
  public registerCleanupCallback(callback: () => Promise<void> | void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Execute all registered cleanup callbacks
   */
  public async executeCleanup(): Promise<void> {
    if (!this.config.cleanupEnabled) {
      return;
    }

    const beforeStats = this.getCurrentStats();
    
    try {
      await Promise.all(
        this.cleanupCallbacks.map(async (callback) => {
          try {
            await callback();
          } catch (error) {
            console.error('Error in cleanup callback:', error);
          }
        })
      );

      const afterStats = this.getCurrentStats();
      const freedMB = (beforeStats.used - afterStats.used) / (1024 * 1024);
      
      this.emit('cleanup-completed', {
        type: 'cleanup',
        stats: afterStats,
        message: `Cleanup completed: ${freedMB.toFixed(2)}MB freed`,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error during cleanup execution:', error);
    }
  }

  /**
   * Get memory usage history
   */
  public getMemoryHistory(minutes: number = 5): MemoryStats[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.memoryHistory.filter(stat => stat.timestamp >= cutoff);
  }

  /**
   * Get garbage collection statistics
   */
  public getGCStats(): GCStats {
    return { ...this.gcStats };
  }

  /**
   * Get detected memory leak candidates
   */
  public getLeakCandidates(): MemoryLeakCandidate[] {
    return Array.from(this.leakCandidates.values());
  }

  /**
   * Check if memory usage is within limits
   */
  public isWithinLimits(): boolean {
    const stats = this.getCurrentStats();
    return stats.percentage < this.config.pressureThresholds.critical;
  }

  /**
   * Get memory usage summary
   */
  public getUsageSummary(): {
    current: MemoryStats;
    pressure: MemoryPressureLevel;
    gc: GCStats;
    leaks: number;
    trend: 'stable' | 'increasing' | 'decreasing';
  } {
    const current = this.getCurrentStats();
    const pressure = this.getPressureLevel();
    const gc = this.getGCStats();
    const leaks = this.leakCandidates.size;
    
    // Calculate trend from recent history
    const recent = this.getMemoryHistory(2);
    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    
    if (recent.length >= 2) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      const change = last.percentage - first.percentage;
      
      if (change > 5) {
        trend = 'increasing';
      } else if (change < -5) {
        trend = 'decreasing';
      }
    }

    return { current, pressure, gc, leaks, trend };
  }

  private collectMemoryStats(): void {
    const stats = this.getCurrentStats();
    
    // Add to history (keep last 1000 entries)
    this.memoryHistory.push(stats);
    if (this.memoryHistory.length > 1000) {
      this.memoryHistory.shift();
    }

    // Check pressure level
    const pressure = this.getPressureLevel();
    
    if (pressure.level !== this.lastPressureLevel) {
      this.lastPressureLevel = pressure.level;
      
      if (this.config.warningsEnabled) {
        this.emit('pressure-change', {
          type: 'pressure',
          level: pressure.level,
          stats,
          message: pressure.description,
          timestamp: Date.now()
        });
      }
    }

    // Trigger automatic GC if needed
    if (stats.percentage >= this.config.gcTriggerThreshold) {
      this.forceGC();
    }

    // Execute cleanup if in critical state
    if (pressure.level === 'critical' && this.config.cleanupEnabled) {
      this.executeCleanup();
    }

    // Check for memory leaks
    this.detectMemoryLeaks(stats);

    // Update GC frequency
    this.updateGCFrequency();
  }

  private detectMemoryLeaks(stats: MemoryStats): void {
    // Simple leak detection based on consistent growth
    const recent = this.getMemoryHistory(5); // Last 5 minutes
    
    if (recent.length < 10) {
      return; // Not enough data
    }

    const growthRate = this.calculateGrowthRate(recent);
    
    if (growthRate > 1.0) { // Growing more than 1MB per minute
      const candidate: MemoryLeakCandidate = {
        objectType: 'unknown',
        count: 1,
        growthRate,
        memoryImpact: stats.used,
        detected: Date.now()
      };

      this.leakCandidates.set('general', candidate);
      
      this.emit('leak-detected', {
        type: 'leak',
        stats,
        message: `Potential memory leak detected: ${growthRate.toFixed(2)}MB/min growth`,
        timestamp: Date.now()
      });
    }
  }

  private calculateGrowthRate(history: MemoryStats[]): number {
    if (history.length < 2) {
      return 0;
    }

    const first = history[0];
    const last = history[history.length - 1];
    const timeDiffMinutes = (last.timestamp - first.timestamp) / (1000 * 60);
    const memoryDiffMB = (last.used - first.used) / (1024 * 1024);
    
    return timeDiffMinutes > 0 ? memoryDiffMB / timeDiffMinutes : 0;
  }

  private updateGCFrequency(): void {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    
    if (this.gcStats.lastRun > 0) {
      const timeSinceLastGC = now - this.gcStats.lastRun;
      if (timeSinceLastGC < windowMs) {
        this.gcStats.frequency = windowMs / timeSinceLastGC;
      }
    }
  }

  private setupGlobalGC(): void {
    // Ensure global.gc is available if possible
    if (!global.gc && process.env.NODE_ENV !== 'production') {
      try {
        // Try to expose GC for development
        require('vm').runInThisContext('gc');
      } catch (error) {
        // GC not available, will use fallback methods
      }
    }
  }
}

// Singleton instance for global use
let globalMemoryMonitor: MemoryMonitor | null = null;

export function getGlobalMemoryMonitor(config?: Partial<MemoryConfiguration>): MemoryMonitor {
  if (!globalMemoryMonitor) {
    globalMemoryMonitor = new MemoryMonitor(config);
  }
  return globalMemoryMonitor;
}

export function resetGlobalMemoryMonitor(): void {
  if (globalMemoryMonitor) {
    globalMemoryMonitor.stopMonitoring();
    globalMemoryMonitor = null;
  }
}
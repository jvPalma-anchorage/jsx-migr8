/**
 * Memory Limit Enforcement and Graceful Degradation System
 * 
 * Provides intelligent memory limit enforcement with graceful degradation
 * strategies to maintain functionality while respecting memory constraints.
 */

import { EventEmitter } from 'events';
import { MemoryMonitor, MemoryStats, getGlobalMemoryMonitor } from './memory-monitor';

export interface DegradationStrategy {
  name: string;
  threshold: number; // Memory percentage threshold
  description: string;
  execute: () => Promise<void> | void;
  priority: number; // Lower number = higher priority
  impact: 'low' | 'medium' | 'high';
  reversible: boolean;
}

export interface LimiterConfiguration {
  enforcementEnabled: boolean;
  gracefulDegradation: boolean;
  hardLimitMB: number;
  softLimitMB: number;
  emergencyLimitMB: number;
  checkInterval: number;
  degradationDelay: number;
  recoveryDelay: number;
}

export interface LimitEvent {
  type: 'soft-limit' | 'hard-limit' | 'emergency-limit' | 'degradation' | 'recovery';
  strategy?: string;
  stats: MemoryStats;
  message: string;
  timestamp: number;
}

export class MemoryLimiter extends EventEmitter {
  private config: LimiterConfiguration;
  private memoryMonitor: MemoryMonitor;
  private strategies: Map<string, DegradationStrategy> = new Map();
  private activeStrategies: Set<string> = new Set();
  private checkInterval?: NodeJS.Timeout;
  private isEnforcing: boolean = false;
  private lastDegradation: number = 0;
  private lastRecovery: number = 0;

  constructor(config?: Partial<LimiterConfiguration>, memoryMonitor?: MemoryMonitor) {
    super();
    
    this.config = {
      enforcementEnabled: true,
      gracefulDegradation: true,
      hardLimitMB: 2048,      // 2GB hard limit
      softLimitMB: 1536,      // 1.5GB soft limit
      emergencyLimitMB: 2304, // 2.25GB emergency limit
      checkInterval: 2000,    // 2 seconds
      degradationDelay: 5000, // 5 seconds between degradations
      recoveryDelay: 10000,   // 10 seconds before recovery
      ...config
    };

    this.memoryMonitor = memoryMonitor || getGlobalMemoryMonitor();
    this.setupDefaultStrategies();
  }

  /**
   * Start memory limit enforcement
   */
  public startEnforcement(): void {
    if (this.isEnforcing) {
      return;
    }

    this.isEnforcing = true;
    this.emit('enforcement-started');

    this.checkInterval = setInterval(() => {
      this.checkMemoryLimits();
    }, this.config.checkInterval);

    // Initial check
    this.checkMemoryLimits();
  }

  /**
   * Stop memory limit enforcement
   */
  public stopEnforcement(): void {
    if (!this.isEnforcing) {
      return;
    }

    this.isEnforcing = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    this.emit('enforcement-stopped');
  }

  /**
   * Register a degradation strategy
   */
  public registerStrategy(strategy: DegradationStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Unregister a degradation strategy
   */
  public unregisterStrategy(name: string): void {
    this.strategies.delete(name);
    this.activeStrategies.delete(name);
  }

  /**
   * Force execution of a specific strategy
   */
  public async executeStrategy(name: string): Promise<boolean> {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      return false;
    }

    try {
      await strategy.execute();
      this.activeStrategies.add(name);
      
      const stats = this.memoryMonitor.getCurrentStats();
      this.emit('strategy-executed', {
        type: 'degradation',
        strategy: name,
        stats,
        message: `Degradation strategy '${name}' executed: ${strategy.description}`,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error(`Error executing strategy '${name}':`, error);
      return false;
    }
  }

  /**
   * Attempt to recover from degradation
   */
  public async attemptRecovery(): Promise<void> {
    const now = Date.now();
    if (now - this.lastRecovery < this.config.recoveryDelay) {
      return; // Too soon for recovery
    }

    const stats = this.memoryMonitor.getCurrentStats();
    const softLimitBytes = this.config.softLimitMB * 1024 * 1024;

    // Only attempt recovery if we're below soft limit
    if (stats.used > softLimitBytes) {
      return;
    }

    // Recovery logic would go here
    // For now, we'll just clear active strategies
    const recoveredStrategies = Array.from(this.activeStrategies);
    this.activeStrategies.clear();
    this.lastRecovery = now;

    if (recoveredStrategies.length > 0) {
      this.emit('recovery-attempted', {
        type: 'recovery',
        stats,
        message: `Recovery attempted: ${recoveredStrategies.length} strategies deactivated`,
        timestamp: now
      });
    }
  }

  /**
   * Get current enforcement status
   */
  public getStatus(): {
    enforcing: boolean;
    activeStrategies: string[];
    memoryUsage: MemoryStats;
    limits: {
      soft: number;
      hard: number;
      emergency: number;
    };
    withinLimits: boolean;
  } {
    const stats = this.memoryMonitor.getCurrentStats();
    
    return {
      enforcing: this.isEnforcing,
      activeStrategies: Array.from(this.activeStrategies),
      memoryUsage: stats,
      limits: {
        soft: this.config.softLimitMB,
        hard: this.config.hardLimitMB,
        emergency: this.config.emergencyLimitMB
      },
      withinLimits: stats.used < (this.config.hardLimitMB * 1024 * 1024)
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<LimiterConfiguration>): void {
    this.config = { ...this.config, ...config };
  }

  private checkMemoryLimits(): void {
    if (!this.config.enforcementEnabled) {
      return;
    }

    const stats = this.memoryMonitor.getCurrentStats();
    const usedMB = stats.used / (1024 * 1024);
    const now = Date.now();

    // Emergency limit check (immediate action)
    if (usedMB >= this.config.emergencyLimitMB) {
      this.handleEmergencyLimit(stats);
      return;
    }

    // Hard limit check
    if (usedMB >= this.config.hardLimitMB) {
      this.handleHardLimit(stats);
      return;
    }

    // Soft limit check (gradual degradation)
    if (usedMB >= this.config.softLimitMB) {
      this.handleSoftLimit(stats, now);
      return;
    }

    // Below soft limit - attempt recovery
    this.attemptRecovery();
  }

  private handleEmergencyLimit(stats: MemoryStats): void {
    this.emit('emergency-limit', {
      type: 'emergency-limit',
      stats,
      message: `Emergency memory limit reached: ${(stats.used / (1024 * 1024)).toFixed(2)}MB`,
      timestamp: Date.now()
    });

    // Execute all available strategies immediately
    this.executeEmergencyDegradation();
  }

  private handleHardLimit(stats: MemoryStats): void {
    this.emit('hard-limit', {
      type: 'hard-limit',
      stats,
      message: `Hard memory limit reached: ${(stats.used / (1024 * 1024)).toFixed(2)}MB`,
      timestamp: Date.now()
    });

    // Execute high-priority strategies
    this.executeCriticalDegradation();
  }

  private async handleSoftLimit(stats: MemoryStats, now: number): Promise<void> {
    if (!this.config.gracefulDegradation) {
      return;
    }

    if (now - this.lastDegradation < this.config.degradationDelay) {
      return; // Too soon for another degradation
    }

    this.emit('soft-limit', {
      type: 'soft-limit',
      stats,
      message: `Soft memory limit reached: ${(stats.used / (1024 * 1024)).toFixed(2)}MB`,
      timestamp: now
    });

    // Execute next available strategy
    await this.executeNextStrategy();
    this.lastDegradation = now;
  }

  private async executeEmergencyDegradation(): Promise<void> {
    // Execute all strategies, starting with highest priority
    const sortedStrategies = Array.from(this.strategies.values())
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of sortedStrategies) {
      if (!this.activeStrategies.has(strategy.name)) {
        await this.executeStrategy(strategy.name);
      }
    }

    // Force garbage collection
    await this.memoryMonitor.forceGC();

    // Execute cleanup callbacks
    await this.memoryMonitor.executeCleanup();
  }

  private async executeCriticalDegradation(): Promise<void> {
    // Execute high-impact strategies
    const criticalStrategies = Array.from(this.strategies.values())
      .filter(s => s.impact === 'high' && !this.activeStrategies.has(s.name))
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of criticalStrategies) {
      await this.executeStrategy(strategy.name);
    }

    // Force garbage collection
    await this.memoryMonitor.forceGC();
  }

  private async executeNextStrategy(): Promise<void> {
    // Find next strategy to execute
    const availableStrategies = Array.from(this.strategies.values())
      .filter(s => !this.activeStrategies.has(s.name))
      .sort((a, b) => a.priority - b.priority);

    if (availableStrategies.length > 0) {
      await this.executeStrategy(availableStrategies[0].name);
    }
  }

  private setupDefaultStrategies(): void {
    // Clear AST caches
    this.registerStrategy({
      name: 'clear-ast-cache',
      threshold: 70,
      description: 'Clear cached AST nodes and parsing results',
      priority: 1,
      impact: 'low',
      reversible: true,
      execute: () => {
        // Clear any global caches that might exist
        if (global.astCache) {
          global.astCache.clear();
        }
      }
    });

    // Reduce analysis batch size
    this.registerStrategy({
      name: 'reduce-batch-size',
      threshold: 75,
      description: 'Reduce file processing batch size',
      priority: 2,
      impact: 'medium',
      reversible: true,
      execute: () => {
        // This would be implemented in the processing logic
        if (global.processingConfig) {
          global.processingConfig.batchSize = Math.max(1, Math.floor(global.processingConfig.batchSize / 2));
        }
      }
    });

    // Disable detailed reporting
    this.registerStrategy({
      name: 'disable-detailed-reporting',
      threshold: 80,
      description: 'Disable detailed analysis reporting',
      priority: 3,
      impact: 'medium',
      reversible: true,
      execute: () => {
        if (global.reportingConfig) {
          global.reportingConfig.detailed = false;
        }
      }
    });

    // Clear file content cache
    this.registerStrategy({
      name: 'clear-file-cache',
      threshold: 85,
      description: 'Clear cached file contents',
      priority: 4,
      impact: 'high',
      reversible: false,
      execute: () => {
        if (global.fileCache) {
          global.fileCache.clear();
        }
      }
    });

    // Limit concurrent operations
    this.registerStrategy({
      name: 'limit-concurrency',
      threshold: 90,
      description: 'Reduce concurrent file operations',
      priority: 5,
      impact: 'high',
      reversible: true,
      execute: () => {
        if (global.concurrencyLimit) {
          global.concurrencyLimit = Math.max(1, Math.floor(global.concurrencyLimit / 2));
        }
      }
    });
  }
}

// Global instance
let globalMemoryLimiter: MemoryLimiter | null = null;

export function getGlobalMemoryLimiter(config?: Partial<LimiterConfiguration>): MemoryLimiter {
  if (!globalMemoryLimiter) {
    globalMemoryLimiter = new MemoryLimiter(config);
  }
  return globalMemoryLimiter;
}

export function resetGlobalMemoryLimiter(): void {
  if (globalMemoryLimiter) {
    globalMemoryLimiter.stopEnforcement();
    globalMemoryLimiter = null;
  }
}
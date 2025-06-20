/**
 * Memory-Aware Progress Indicators
 * 
 * Provides progress indicators that display memory usage information
 * alongside task progress, with visual warnings for memory pressure.
 */

import chalk from 'chalk';
import { MemoryMonitor, MemoryStats, getGlobalMemoryMonitor } from './memory-monitor';
import { MemoryLimiter, getGlobalMemoryLimiter } from './memory-limiter';

export interface ProgressConfiguration {
  showMemory: boolean;
  showPercentage: boolean;
  showBar: boolean;
  showETA: boolean;
  barWidth: number;
  updateInterval: number;
  memoryWarningThreshold: number;
  memoryErrorThreshold: number;
  colorEnabled: boolean;
}

export interface ProgressState {
  current: number;
  total: number;
  message: string;
  startTime: number;
  lastUpdate: number;
  completed: boolean;
  memoryStats?: MemoryStats;
}

export class MemoryAwareProgress {
  private config: ProgressConfiguration;
  private memoryMonitor: MemoryMonitor;
  private memoryLimiter: MemoryLimiter;
  private state: ProgressState;
  private updateInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(
    total: number,
    initialMessage: string = 'Processing...',
    config?: Partial<ProgressConfiguration>
  ) {
    this.config = {
      showMemory: true,
      showPercentage: true,
      showBar: true,
      showETA: true,
      barWidth: 40,
      updateInterval: 1000,
      memoryWarningThreshold: 70,
      memoryErrorThreshold: 90,
      colorEnabled: true,
      ...config
    };

    this.memoryMonitor = getGlobalMemoryMonitor();
    this.memoryLimiter = getGlobalMemoryLimiter();

    this.state = {
      current: 0,
      total,
      message: initialMessage,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      completed: false
    };

    this.setupMemoryMonitoring();
  }

  /**
   * Start the progress display
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.state.startTime = Date.now();
    this.state.lastUpdate = Date.now();

    // Initial render
    this.render();

    // Set up periodic updates
    this.updateInterval = setInterval(() => {
      this.updateMemoryStats();
      this.render();
    }, this.config.updateInterval);
  }

  /**
   * Stop the progress display
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    // Final render
    this.state.completed = true;
    this.render();
    console.log(); // Add newline after completion
  }

  /**
   * Update progress
   */
  public update(current: number, message?: string): void {
    this.state.current = Math.min(current, this.state.total);
    if (message) {
      this.state.message = message;
    }
    this.state.lastUpdate = Date.now();

    if (this.isRunning) {
      this.updateMemoryStats();
      this.render();
    }
  }

  /**
   * Increment progress by 1
   */
  public increment(message?: string): void {
    this.update(this.state.current + 1, message);
  }

  /**
   * Set total count (useful for dynamic totals)
   */
  public setTotal(total: number): void {
    this.state.total = total;
  }

  /**
   * Get current progress state
   */
  public getState(): ProgressState {
    return { ...this.state };
  }

  /**
   * Create a simple memory usage display
   */
  public static createMemoryDisplay(stats?: MemoryStats): string {
    if (!stats) {
      return '';
    }

    const usedMB = (stats.used / (1024 * 1024)).toFixed(1);
    const totalMB = (stats.total / (1024 * 1024)).toFixed(1);
    const percentage = stats.percentage.toFixed(1);

    let color = chalk.green;
    if (stats.percentage > 90) {
      color = chalk.red;
    } else if (stats.percentage > 70) {
      color = chalk.yellow;
    }

    return color(`${usedMB}/${totalMB}MB (${percentage}%)`);
  }

  /**
   * Create a memory pressure indicator
   */
  public static createPressureIndicator(percentage: number): string {
    const blocks = 10;
    const filled = Math.round((percentage / 100) * blocks);
    
    let bar = '';
    for (let i = 0; i < blocks; i++) {
      if (i < filled) {
        if (percentage > 90) {
          bar += chalk.red('█');
        } else if (percentage > 70) {
          bar += chalk.yellow('█');
        } else {
          bar += chalk.green('█');
        }
      } else {
        bar += chalk.gray('░');
      }
    }

    return `[${bar}]`;
  }

  private setupMemoryMonitoring(): void {
    // Listen for memory events
    this.memoryMonitor.on('pressure-change', (event) => {
      if (this.isRunning) {
        this.render();
      }
    });

    this.memoryLimiter.on('soft-limit', () => {
      if (this.isRunning) {
        this.render();
      }
    });
  }

  private updateMemoryStats(): void {
    this.state.memoryStats = this.memoryMonitor.getCurrentStats();
  }

  private render(): void {
    if (!this.isRunning && !this.state.completed) {
      return;
    }

    // Clear current line
    process.stdout.write('\r\x1b[K');

    const parts: string[] = [];

    // Progress bar
    if (this.config.showBar) {
      parts.push(this.createProgressBar());
    }

    // Percentage
    if (this.config.showPercentage) {
      const percentage = this.state.total > 0 
        ? ((this.state.current / this.state.total) * 100).toFixed(1)
        : '0.0';
      parts.push(`${percentage}%`);
    }

    // Current/Total
    parts.push(`${this.state.current}/${this.state.total}`);

    // Message
    parts.push(this.state.message);

    // ETA
    if (this.config.showETA && !this.state.completed) {
      const eta = this.calculateETA();
      if (eta) {
        parts.push(`ETA: ${eta}`);
      }
    }

    // Memory usage
    if (this.config.showMemory && this.state.memoryStats) {
      parts.push(this.createMemoryDisplay());
    }

    const output = parts.join(' | ');
    process.stdout.write(output);

    // Add memory warning if needed
    if (this.state.memoryStats && this.state.memoryStats.percentage > this.config.memoryWarningThreshold) {
      const warning = this.createMemoryWarning();
      if (warning) {
        process.stdout.write(` ${warning}`);
      }
    }
  }

  private createProgressBar(): string {
    const percentage = this.state.total > 0 ? this.state.current / this.state.total : 0;
    const filled = Math.round(this.config.barWidth * percentage);
    const empty = this.config.barWidth - filled;

    let bar = '[';
    
    // Filled portion - color based on memory pressure
    let fillColor = chalk.green;
    if (this.state.memoryStats) {
      if (this.state.memoryStats.percentage > this.config.memoryErrorThreshold) {
        fillColor = chalk.red;
      } else if (this.state.memoryStats.percentage > this.config.memoryWarningThreshold) {
        fillColor = chalk.yellow;
      }
    }
    
    bar += fillColor('='.repeat(filled));
    bar += ' '.repeat(empty);
    bar += ']';

    return bar;
  }

  private createMemoryDisplay(): string {
    if (!this.state.memoryStats) {
      return '';
    }

    const display = MemoryAwareProgress.createMemoryDisplay(this.state.memoryStats);
    const pressure = MemoryAwareProgress.createPressureIndicator(this.state.memoryStats.percentage);
    
    return `${display} ${pressure}`;
  }

  private createMemoryWarning(): string | null {
    if (!this.state.memoryStats) {
      return null;
    }

    const { percentage } = this.state.memoryStats;
    const limiterStatus = this.memoryLimiter.getStatus();

    if (percentage > this.config.memoryErrorThreshold) {
      let warning = chalk.red('⚠ HIGH MEMORY USAGE');
      if (limiterStatus.activeStrategies.length > 0) {
        warning += chalk.red(` (${limiterStatus.activeStrategies.length} degradations active)`);
      }
      return warning;
    } else if (percentage > this.config.memoryWarningThreshold) {
      return chalk.yellow('⚠ Memory pressure detected');
    }

    return null;
  }

  private calculateETA(): string | null {
    if (this.state.current === 0 || this.state.completed) {
      return null;
    }

    const elapsed = Date.now() - this.state.startTime;
    const rate = this.state.current / elapsed; // items per millisecond
    const remaining = this.state.total - this.state.current;
    const etaMs = remaining / rate;

    const etaSeconds = Math.round(etaMs / 1000);
    
    if (etaSeconds < 60) {
      return `${etaSeconds}s`;
    } else if (etaSeconds < 3600) {
      const minutes = Math.floor(etaSeconds / 60);
      const seconds = etaSeconds % 60;
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(etaSeconds / 3600);
      const minutes = Math.floor((etaSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}

/**
 * Simple memory-aware spinner for indeterminate progress
 */
export class MemoryAwareSpinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private isRunning = false;
  private interval?: NodeJS.Timeout;
  private memoryMonitor: MemoryMonitor;
  private message: string;

  constructor(message: string = 'Processing...') {
    this.message = message;
    this.memoryMonitor = getGlobalMemoryMonitor();
  }

  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.interval = setInterval(() => {
      this.render();
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 100);
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    // Clear line
    process.stdout.write('\r\x1b[K');
  }

  public updateMessage(message: string): void {
    this.message = message;
  }

  private render(): void {
    const stats = this.memoryMonitor.getCurrentStats();
    const memoryDisplay = MemoryAwareProgress.createMemoryDisplay(stats);
    
    let color = chalk.cyan;
    if (stats.percentage > 90) {
      color = chalk.red;
    } else if (stats.percentage > 70) {
      color = chalk.yellow;
    }

    const spinner = color(this.frames[this.currentFrame]);
    const output = `${spinner} ${this.message} | ${memoryDisplay}`;
    
    process.stdout.write('\r\x1b[K' + output);
  }
}

/**
 * Create a memory-aware progress bar
 */
export function createMemoryProgress(
  total: number,
  message?: string,
  config?: Partial<ProgressConfiguration>
): MemoryAwareProgress {
  return new MemoryAwareProgress(total, message, config);
}

/**
 * Create a memory-aware spinner
 */
export function createMemorySpinner(message?: string): MemoryAwareSpinner {
  return new MemoryAwareSpinner(message);
}
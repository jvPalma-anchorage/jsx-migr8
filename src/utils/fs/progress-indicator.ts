/**
 * Progress indicator utilities for long-running async operations
 * Provides various progress display formats with performance metrics
 */

import { performance } from "node:perf_hooks";
import { EventEmitter } from "node:events";

export interface ProgressOptions {
  total: number;
  format?: ProgressFormat;
  width?: number;
  showPercentage?: boolean;
  showSpeed?: boolean;
  showETA?: boolean;
  showMemory?: boolean;
  updateInterval?: number;
  stream?: NodeJS.WriteStream;
}

export type ProgressFormat = "bar" | "spinner" | "dots" | "minimal" | "detailed";

export interface ProgressUpdate {
  current: number;
  total: number;
  percentage: number;
  speed: number; // items per second
  eta: number; // estimated time remaining in ms
  elapsed: number; // elapsed time in ms
  memoryUsage?: NodeJS.MemoryUsage;
  currentItem?: string;
  phase?: string;
}

export class ProgressIndicator extends EventEmitter {
  private current = 0;
  private total: number;
  private startTime: number;
  private lastUpdate = 0;
  private lastUpdateTime = 0;
  private completed = false;
  private timer: NodeJS.Timeout | null = null;

  private readonly format: ProgressFormat;
  private readonly width: number;
  private readonly showPercentage: boolean;
  private readonly showSpeed: boolean;
  private readonly showETA: boolean;
  private readonly showMemory: boolean;
  private readonly updateInterval: number;
  private readonly stream: NodeJS.WriteStream;

  constructor(options: ProgressOptions) {
    super();
    
    this.total = options.total;
    this.format = options.format ?? "bar";
    this.width = options.width ?? 40;
    this.showPercentage = options.showPercentage ?? true;
    this.showSpeed = options.showSpeed ?? true;
    this.showETA = options.showETA ?? true;
    this.showMemory = options.showMemory ?? false;
    this.updateInterval = options.updateInterval ?? 100;
    this.stream = options.stream ?? process.stdout;

    this.startTime = performance.now();
    this.lastUpdateTime = this.startTime;

    // Start update timer
    this.startTimer();
  }

  /**
   * Update progress
   */
  update(increment = 1, currentItem?: string, phase?: string): void {
    if (this.completed) return;
    
    this.current = Math.min(this.current + increment, this.total);
    
    const now = performance.now();
    const progressUpdate = this.calculateProgress(now, currentItem, phase);
    
    // Emit progress event
    this.emit("progress", progressUpdate);
    
    // Update display if enough time has passed
    if (now - this.lastUpdateTime >= this.updateInterval) {
      this.render(progressUpdate);
      this.lastUpdateTime = now;
    }
    
    // Check if completed
    if (this.current >= this.total) {
      this.complete();
    }
  }

  /**
   * Set absolute progress value
   */
  setProgress(value: number, currentItem?: string, phase?: string): void {
    if (this.completed) return;
    
    this.current = Math.max(0, Math.min(value, this.total));
    
    const now = performance.now();
    const progressUpdate = this.calculateProgress(now, currentItem, phase);
    
    this.emit("progress", progressUpdate);
    
    if (now - this.lastUpdateTime >= this.updateInterval) {
      this.render(progressUpdate);
      this.lastUpdateTime = now;
    }
    
    if (this.current >= this.total) {
      this.complete();
    }
  }

  /**
   * Update total count (useful for dynamic scenarios)
   */
  setTotal(newTotal: number): void {
    this.total = Math.max(0, newTotal);
    this.current = Math.min(this.current, this.total);
  }

  /**
   * Complete the progress indicator
   */
  complete(message?: string): void {
    if (this.completed) return;
    
    this.completed = true;
    this.current = this.total;
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    const now = performance.now();
    const finalUpdate = this.calculateProgress(now);
    
    this.render(finalUpdate, true);
    
    if (message) {
      this.stream.write(`\n${message}\n`);
    } else {
      this.stream.write("\n");
    }
    
    this.emit("complete", finalUpdate);
  }

  /**
   * Stop and clear the progress indicator
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.completed = true;
    this.clearLine();
    this.emit("stop");
  }

  /**
   * Calculate current progress metrics
   */
  private calculateProgress(
    now: number,
    currentItem?: string,
    phase?: string,
  ): ProgressUpdate {
    const elapsed = now - this.startTime;
    const percentage = this.total > 0 ? (this.current / this.total) * 100 : 0;
    
    // Calculate speed (items per second)
    let speed = 0;
    if (elapsed > 0) {
      speed = (this.current * 1000) / elapsed;
    }
    
    // Calculate ETA
    let eta = 0;
    if (speed > 0 && this.current < this.total) {
      const remaining = this.total - this.current;
      eta = (remaining / speed) * 1000;
    }
    
    return {
      current: this.current,
      total: this.total,
      percentage,
      speed,
      eta,
      elapsed,
      memoryUsage: this.showMemory ? process.memoryUsage() : undefined,
      currentItem,
      phase,
    };
  }

  /**
   * Render progress display
   */
  private render(update: ProgressUpdate, final = false): void {
    const line = this.formatProgress(update, final);
    
    this.clearLine();
    this.stream.write(line);
    
    if (!final) {
      // Move cursor to beginning of line for next update
      this.stream.write("\r");
    }
  }

  /**
   * Format progress string based on selected format
   */
  private formatProgress(update: ProgressUpdate, final = false): string {
    switch (this.format) {
      case "bar":
        return this.formatProgressBar(update, final);
      case "spinner":
        return this.formatSpinner(update, final);
      case "dots":
        return this.formatDots(update, final);
      case "minimal":
        return this.formatMinimal(update, final);
      case "detailed":
        return this.formatDetailed(update, final);
      default:
        return this.formatProgressBar(update, final);
    }
  }

  /**
   * Format progress bar
   */
  private formatProgressBar(update: ProgressUpdate, final = false): string {
    const { current, total, percentage } = update;
    
    // Calculate filled and empty parts
    const filled = Math.floor((percentage / 100) * this.width);
    const empty = this.width - filled;
    
    // Build progress bar
    const bar = "█".repeat(filled) + "░".repeat(empty);
    
    let result = `[${bar}]`;
    
    // Add percentage
    if (this.showPercentage) {
      result += ` ${percentage.toFixed(1)}%`;
    }
    
    // Add count
    result += ` ${current}/${total}`;
    
    // Add speed
    if (this.showSpeed && update.speed > 0) {
      const speedStr = update.speed >= 1 
        ? `${update.speed.toFixed(1)}/s`
        : `${(update.speed * 60).toFixed(1)}/min`;
      result += ` | ${speedStr}`;
    }
    
    // Add ETA
    if (this.showETA && update.eta > 0 && !final) {
      result += ` | ETA: ${this.formatDuration(update.eta)}`;
    }
    
    // Add memory usage
    if (this.showMemory && update.memoryUsage) {
      const memMB = (update.memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
      result += ` | ${memMB}MB`;
    }
    
    // Add current item
    if (update.currentItem) {
      const item = update.currentItem.length > 30 
        ? "..." + update.currentItem.slice(-27)
        : update.currentItem;
      result += ` | ${item}`;
    }
    
    // Add phase
    if (update.phase) {
      result += ` | ${update.phase}`;
    }
    
    return result;
  }

  /**
   * Format spinner progress
   */
  private formatSpinner(update: ProgressUpdate, final = false): string {
    const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const spinnerIndex = final ? 0 : Math.floor(Date.now() / 100) % spinnerChars.length;
    const spinner = final ? "✓" : spinnerChars[spinnerIndex];
    
    let result = `${spinner} ${update.current}/${update.total}`;
    
    if (this.showPercentage) {
      result += ` (${update.percentage.toFixed(1)}%)`;
    }
    
    if (update.phase) {
      result += ` ${update.phase}`;
    }
    
    if (update.currentItem) {
      const item = update.currentItem.length > 40 
        ? "..." + update.currentItem.slice(-37)
        : update.currentItem;
      result += ` - ${item}`;
    }
    
    return result;
  }

  /**
   * Format dots progress
   */
  private formatDots(update: ProgressUpdate, final = false): string {
    const dotsCount = Math.floor((update.percentage / 100) * 50);
    const dots = ".".repeat(dotsCount);
    
    let result = `Processing${dots}`;
    
    if (this.showPercentage) {
      result += ` ${update.percentage.toFixed(1)}%`;
    }
    
    result += ` (${update.current}/${update.total})`;
    
    return result;
  }

  /**
   * Format minimal progress
   */
  private formatMinimal(update: ProgressUpdate, final = false): string {
    return `${update.current}/${update.total} ${update.phase || ""}`.trim();
  }

  /**
   * Format detailed progress
   */
  private formatDetailed(update: ProgressUpdate, final = false): string {
    let result = this.formatProgressBar(update, final);
    
    result += `\n  Elapsed: ${this.formatDuration(update.elapsed)}`;
    
    if (update.eta > 0 && !final) {
      result += ` | Remaining: ${this.formatDuration(update.eta)}`;
    }
    
    if (update.memoryUsage) {
      const heap = (update.memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
      const total = (update.memoryUsage.heapTotal / 1024 / 1024).toFixed(1);
      result += ` | Memory: ${heap}/${total}MB`;
    }
    
    return result;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Clear current line
   */
  private clearLine(): void {
    this.stream.write("\x1b[K"); // Clear to end of line
  }

  /**
   * Start update timer for spinner/animated formats
   */
  private startTimer(): void {
    if (this.format === "spinner" || this.format === "dots") {
      this.timer = setInterval(() => {
        if (!this.completed) {
          const now = performance.now();
          const update = this.calculateProgress(now);
          this.render(update);
        }
      }, this.updateInterval);
    }
  }
}

/**
 * Create a simple progress bar
 */
export function createProgressBar(total: number, options: Partial<ProgressOptions> = {}): ProgressIndicator {
  return new ProgressIndicator({
    total,
    format: "bar",
    ...options,
  });
}

/**
 * Create a spinner progress indicator
 */
export function createSpinner(total: number, options: Partial<ProgressOptions> = {}): ProgressIndicator {
  return new ProgressIndicator({
    total,
    format: "spinner",
    ...options,
  });
}

/**
 * Multi-phase progress tracker
 */
export class MultiPhaseProgress extends EventEmitter {
  private phases: Array<{ name: string; weight: number; progress: ProgressIndicator | null }> = [];
  private currentPhaseIndex = 0;
  private totalWeight = 0;

  constructor(phases: Array<{ name: string; weight: number; total: number }>) {
    super();
    
    phases.forEach(phase => {
      this.phases.push({
        name: phase.name,
        weight: phase.weight,
        progress: null,
      });
      this.totalWeight += phase.weight;
    });
  }

  /**
   * Start a phase
   */
  startPhase(index: number, total: number): ProgressIndicator {
    if (index >= this.phases.length) {
      throw new Error(`Phase index ${index} out of bounds`);
    }
    
    this.currentPhaseIndex = index;
    const phase = this.phases[index];
    
    phase.progress = new ProgressIndicator({
      total,
      format: "spinner",
      showETA: true,
    });
    
    phase.progress.on("progress", (update) => {
      this.emit("phase-progress", {
        phaseIndex: index,
        phaseName: phase.name,
        phaseProgress: update,
        overallProgress: this.calculateOverallProgress(),
      });
    });
    
    phase.progress.on("complete", () => {
      this.emit("phase-complete", {
        phaseIndex: index,
        phaseName: phase.name,
      });
    });
    
    return phase.progress;
  }

  /**
   * Calculate overall progress across all phases
   */
  private calculateOverallProgress(): number {
    let weightedProgress = 0;
    
    for (let i = 0; i < this.phases.length; i++) {
      const phase = this.phases[i];
      let phaseProgress = 0;
      
      if (i < this.currentPhaseIndex) {
        phaseProgress = 1; // Completed phases
      } else if (i === this.currentPhaseIndex && phase.progress) {
        phaseProgress = phase.progress["current"] / phase.progress["total"];
      }
      
      weightedProgress += phaseProgress * phase.weight;
    }
    
    return (weightedProgress / this.totalWeight) * 100;
  }

  /**
   * Complete all phases
   */
  complete(): void {
    this.emit("complete", {
      totalPhases: this.phases.length,
      overallProgress: 100,
    });
  }
}
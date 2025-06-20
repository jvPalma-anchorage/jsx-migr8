/**
 * Progress calculation utilities for the interactive diff system
 */

export interface FileProgress {
  filePath: string;
  currentRuleIndex: number;
  totalRules: number;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: Error;
  transformationsApplied: number;
  componentsAffected: number;
}

export interface MigrationStats {
  totalFiles: number;
  filesProcessed: number;
  filesSkipped: number;
  filesWithErrors: number;
  totalRules: number;
  totalRulesApplied: number;
  totalComponentsAffected: number;
  totalTransformationsApplied: number;
  startTime: number;
  endTime?: number;
  throughputFilesPerSecond: number;
  throughputRulesPerSecond: number;
  memoryUsage?: {
    peak: number;
    current: number;
  };
}

export interface ProgressCalculator {
  stats: MigrationStats;
  fileProgresses: Map<string, FileProgress>;
  
  addFile(filePath: string, totalRules: number): void;
  updateFileProgress(filePath: string, ruleIndex: number, transformationsApplied?: number): void;
  completeFile(filePath: string, transformationsApplied: number, componentsAffected: number): void;
  markFileError(filePath: string, error: Error): void;
  getOverallProgress(): number;
  getEstimatedTimeRemaining(): number | undefined;
  getDetailedStats(): MigrationStats;
}

export class DefaultProgressCalculator implements ProgressCalculator {
  public stats: MigrationStats;
  public fileProgresses: Map<string, FileProgress>;

  constructor() {
    this.stats = {
      totalFiles: 0,
      filesProcessed: 0,
      filesSkipped: 0,
      filesWithErrors: 0,
      totalRules: 0,
      totalRulesApplied: 0,
      totalComponentsAffected: 0,
      totalTransformationsApplied: 0,
      startTime: Date.now(),
      throughputFilesPerSecond: 0,
      throughputRulesPerSecond: 0
    };
    this.fileProgresses = new Map();
  }

  addFile(filePath: string, totalRules: number): void {
    this.fileProgresses.set(filePath, {
      filePath,
      currentRuleIndex: 0,
      totalRules,
      startTime: Date.now(),
      status: 'pending',
      transformationsApplied: 0,
      componentsAffected: 0
    });
    
    this.stats.totalFiles++;
    this.stats.totalRules += totalRules;
  }

  updateFileProgress(filePath: string, ruleIndex: number, transformationsApplied = 0): void {
    const progress = this.fileProgresses.get(filePath);
    if (!progress) return;

    progress.currentRuleIndex = ruleIndex;
    progress.status = 'processing';
    progress.transformationsApplied = transformationsApplied;
    
    this.updateStats();
  }

  completeFile(filePath: string, transformationsApplied: number, componentsAffected: number): void {
    const progress = this.fileProgresses.get(filePath);
    if (!progress) return;

    progress.status = 'completed';
    progress.endTime = Date.now();
    progress.transformationsApplied = transformationsApplied;
    progress.componentsAffected = componentsAffected;
    progress.currentRuleIndex = progress.totalRules;
    
    this.stats.filesProcessed++;
    this.stats.totalComponentsAffected += componentsAffected;
    this.stats.totalTransformationsApplied += transformationsApplied;
    this.stats.totalRulesApplied += progress.totalRules;
    
    this.updateStats();
  }

  markFileError(filePath: string, error: Error): void {
    const progress = this.fileProgresses.get(filePath);
    if (!progress) return;

    progress.status = 'error';
    progress.error = error;
    progress.endTime = Date.now();
    
    this.stats.filesWithErrors++;
    this.updateStats();
  }

  getOverallProgress(): number {
    if (this.stats.totalFiles === 0) return 0;
    
    const completedFiles = Array.from(this.fileProgresses.values())
      .filter(p => p.status === 'completed' || p.status === 'error').length;
    
    return Math.round((completedFiles / this.stats.totalFiles) * 100);
  }

  getEstimatedTimeRemaining(): number | undefined {
    const completedFiles = this.stats.filesProcessed + this.stats.filesWithErrors;
    if (completedFiles === 0) return undefined;

    const elapsedTime = Date.now() - this.stats.startTime;
    const averageTimePerFile = elapsedTime / completedFiles;
    const remainingFiles = this.stats.totalFiles - completedFiles;
    
    return remainingFiles * averageTimePerFile;
  }

  getDetailedStats(): MigrationStats {
    return { ...this.stats };
  }

  private updateStats(): void {
    const elapsedTime = Date.now() - this.stats.startTime;
    const elapsedSeconds = elapsedTime / 1000;
    
    if (elapsedSeconds > 0) {
      this.stats.throughputFilesPerSecond = this.stats.filesProcessed / elapsedSeconds;
      this.stats.throughputRulesPerSecond = this.stats.totalRulesApplied / elapsedSeconds;
    }
  }
}

/**
 * Calculate progress for a specific file
 */
export function calculateFileProgress(
  currentRuleIndex: number,
  totalRules: number
): { percentage: number; completed: boolean } {
  if (totalRules === 0) {
    return { percentage: 100, completed: true };
  }
  
  const percentage = Math.round((currentRuleIndex / totalRules) * 100);
  const completed = currentRuleIndex >= totalRules;
  
  return { percentage, completed };
}

/**
 * Calculate overall migration progress
 */
export function calculateProgress(
  filesProcessed: number,
  totalFiles: number,
  rulesApplied: number,
  totalRules: number
): {
  fileProgress: number;
  ruleProgress: number;
  overallProgress: number;
} {
  const fileProgress = totalFiles > 0 ? Math.round((filesProcessed / totalFiles) * 100) : 0;
  const ruleProgress = totalRules > 0 ? Math.round((rulesApplied / totalRules) * 100) : 0;
  
  // Overall progress is weighted: 70% file completion, 30% rule completion
  const overallProgress = Math.round((fileProgress * 0.7) + (ruleProgress * 0.3));
  
  return {
    fileProgress,
    ruleProgress,
    overallProgress
  };
}

/**
 * Estimate time remaining based on current progress
 */
export function estimateTimeRemaining(
  startTime: number,
  currentProgress: number
): number | undefined {
  if (currentProgress === 0) return undefined;
  
  const elapsedTime = Date.now() - startTime;
  const totalEstimatedTime = (elapsedTime / currentProgress) * 100;
  const remainingTime = totalEstimatedTime - elapsedTime;
  
  return Math.max(0, remainingTime);
}

/**
 * Calculate throughput statistics
 */
export function calculateThroughput(
  itemsProcessed: number,
  startTime: number,
  endTime?: number
): {
  itemsPerSecond: number;
  itemsPerMinute: number;
  totalTime: number;
} {
  const totalTime = (endTime || Date.now()) - startTime;
  const totalTimeSeconds = totalTime / 1000;
  
  const itemsPerSecond = totalTimeSeconds > 0 ? itemsProcessed / totalTimeSeconds : 0;
  const itemsPerMinute = itemsPerSecond * 60;
  
  return {
    itemsPerSecond: Math.round(itemsPerSecond * 100) / 100,
    itemsPerMinute: Math.round(itemsPerMinute * 100) / 100,
    totalTime
  };
}

/**
 * Create a progress bar string
 */
export function createProgressBar(
  current: number,
  total: number,
  width = 30,
  filledChar = '█',
  emptyChar = '░'
): string {
  if (total === 0) return emptyChar.repeat(width);
  
  const percentage = Math.min(current / total, 1);
  const filled = Math.round(percentage * width);
  const empty = width - filled;
  
  return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

/**
 * Create a more detailed progress bar with percentage
 */
export function createDetailedProgressBar(
  current: number,
  total: number,
  width = 30
): {
  bar: string;
  percentage: number;
  fraction: string;
} {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const bar = createProgressBar(current, total, width);
  const fraction = `${current}/${total}`;
  
  return { bar, percentage, fraction };
}

/**
 * Calculate ETA (Estimated Time of Arrival)
 */
export function calculateETA(
  startTime: number,
  currentProgress: number,
  totalProgress: number
): Date | undefined {
  if (currentProgress === 0 || currentProgress >= totalProgress) return undefined;
  
  const elapsedTime = Date.now() - startTime;
  const progressRatio = currentProgress / totalProgress;
  const estimatedTotalTime = elapsedTime / progressRatio;
  const remainingTime = estimatedTotalTime - elapsedTime;
  
  return new Date(Date.now() + remainingTime);
}

/**
 * Get progress summary string
 */
export function getProgressSummary(stats: MigrationStats): string {
  const overallProgress = calculateProgress(
    stats.filesProcessed,
    stats.totalFiles,
    stats.totalRulesApplied,
    stats.totalRules
  );
  
  return `${overallProgress.overallProgress}% complete (${stats.filesProcessed}/${stats.totalFiles} files, ${stats.totalRulesApplied}/${stats.totalRules} rules)`;
}
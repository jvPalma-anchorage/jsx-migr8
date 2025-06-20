/**
 * Memory Management System - Main Export Module
 * 
 * Comprehensive memory monitoring and management system for jsx-migr8
 * providing real-time tracking, pressure detection, graceful degradation,
 * and optimization suggestions.
 */

// Core components
export {
  MemoryMonitor,
  getGlobalMemoryMonitor,
  resetGlobalMemoryMonitor,
  type MemoryStats,
  type MemoryConfiguration,
  type MemoryPressureLevel,
  type MemoryEvent,
  type GCStats,
  type MemoryLeakCandidate
} from './memory-monitor';

export {
  MemoryLimiter,
  getGlobalMemoryLimiter,
  resetGlobalMemoryLimiter,
  type LimiterConfiguration,
  type DegradationStrategy,
  type LimitEvent
} from './memory-limiter';

export {
  MemoryAwareProgress,
  MemoryAwareSpinner,
  createMemoryProgress,
  createMemorySpinner,
  type ProgressConfiguration,
  type ProgressState
} from './memory-progress';

export {
  MemoryReporter,
  getGlobalMemoryReporter,
  resetGlobalMemoryReporter,
  type MemoryReport,
  type MemoryReportSummary,
  type PerformanceAnalysis,
  type OptimizationSuggestions,
  type OptimizationAction,
  type MemoryTrends,
  type MemoryIncident,
  type Recommendation,
  type ReportConfiguration
} from './memory-reporter';

// Convenience functions and integration helpers
import { MemoryMonitor, getGlobalMemoryMonitor } from './memory-monitor';
import { MemoryLimiter, getGlobalMemoryLimiter } from './memory-limiter';
import { MemoryReporter, getGlobalMemoryReporter } from './memory-reporter';
import { createMemoryProgress, createMemorySpinner } from './memory-progress';

/**
 * Initialize the complete memory management system
 */
export function initializeMemoryManagement(config?: {
  maxMemoryMB?: number;
  enableLimiting?: boolean;
  enableReporting?: boolean;
  enableProgressDisplay?: boolean;
}) {
  const {
    maxMemoryMB = 2048,
    enableLimiting = true,
    enableReporting = true,
    enableProgressDisplay = true
  } = config || {};

  // Initialize core monitor
  const monitor = getGlobalMemoryMonitor({
    maxMemoryMB,
    monitoringInterval: 1000,
    cleanupEnabled: true,
    warningsEnabled: true
  });

  // Initialize limiter if enabled
  let limiter;
  if (enableLimiting) {
    limiter = getGlobalMemoryLimiter({
      enforcementEnabled: true,
      gracefulDegradation: true,
      hardLimitMB: maxMemoryMB,
      softLimitMB: Math.floor(maxMemoryMB * 0.75),
      emergencyLimitMB: Math.floor(maxMemoryMB * 1.1)
    });
  }

  // Initialize reporter if enabled
  let reporter;
  if (enableReporting) {
    reporter = getGlobalMemoryReporter();
  }

  // Start monitoring
  monitor.startMonitoring();
  if (limiter) {
    limiter.startEnforcement();
  }

  console.log(`Memory management initialized (max: ${maxMemoryMB}MB)`);
  
  return {
    monitor,
    limiter,
    reporter,
    isInitialized: true
  };
}

/**
 * Shutdown the memory management system
 */
export function shutdownMemoryManagement() {
  const monitor = getGlobalMemoryMonitor();
  const limiter = getGlobalMemoryLimiter();
  
  monitor.stopMonitoring();
  limiter.stopEnforcement();
  
  console.log('Memory management shutdown complete');
}

/**
 * Get current memory status summary
 */
export function getMemoryStatus() {
  const monitor = getGlobalMemoryMonitor();
  const limiter = getGlobalMemoryLimiter();
  const reporter = getGlobalMemoryReporter();
  
  const summary = monitor.getUsageSummary();
  const limiterStatus = limiter.getStatus();
  const suggestions = reporter.getCurrentSuggestions();
  
  return {
    ...summary,
    limiting: limiterStatus,
    suggestions,
    timestamp: Date.now()
  };
}

/**
 * Create memory-aware progress indicator for file processing
 */
export function createFileProcessingProgress(totalFiles: number, label: string = 'Processing files') {
  return createMemoryProgress(totalFiles, label, {
    showMemory: true,
    showPercentage: true,
    showBar: true,
    showETA: true,
    memoryWarningThreshold: 70,
    memoryErrorThreshold: 90
  });
}

/**
 * Create memory-aware spinner for indeterminate operations
 */
export function createAnalysisSpinner(message: string = 'Analyzing codebase') {
  return createMemorySpinner(message);
}

/**
 * Register cleanup callback for large data structures
 */
export function registerMemoryCleanup(cleanupFn: () => Promise<void> | void) {
  const monitor = getGlobalMemoryMonitor();
  monitor.registerCleanupCallback(cleanupFn);
}

/**
 * Register degradation strategy for memory pressure handling
 */
export function registerDegradationStrategy(strategy: {
  name: string;
  threshold: number;
  description: string;
  execute: () => Promise<void> | void;
  priority: number;
  impact: 'low' | 'medium' | 'high';
  reversible: boolean;
}) {
  const limiter = getGlobalMemoryLimiter();
  limiter.registerStrategy(strategy);
}

/**
 * Generate and display memory report
 */
export function showMemoryReport(detailed: boolean = false) {
  const reporter = getGlobalMemoryReporter();
  const report = reporter.generateReport();
  
  reporter.displayReport(report, detailed ? 'detailed' : 'summary');
  
  return report;
}

/**
 * Export memory report to file
 */
export function exportMemoryReport(
  outputPath: string,
  format: 'json' | 'text' | 'html' = 'json'
) {
  const reporter = getGlobalMemoryReporter();
  
  return reporter.generateReport({
    includeHistory: true,
    includeTrends: true,
    includeRecommendations: true,
    detailLevel: 'comprehensive',
    exportFormat: format,
    outputPath
  });
}

/**
 * Check if memory usage is healthy
 */
export function isMemoryHealthy(): boolean {
  const monitor = getGlobalMemoryMonitor();
  const stats = monitor.getCurrentStats();
  const pressure = monitor.getPressureLevel();
  
  return stats.percentage < 80 && pressure.level !== 'critical';
}

/**
 * Force memory cleanup and optimization
 */
export async function optimizeMemory(): Promise<{
  success: boolean;
  reclaimedMB: number;
  actions: string[];
}> {
  const monitor = getGlobalMemoryMonitor();
  const limiter = getGlobalMemoryLimiter();
  const actions: string[] = [];
  
  const beforeStats = monitor.getCurrentStats();
  
  // Force GC
  const gcResult = await monitor.forceGC();
  if (gcResult.success) {
    actions.push(`Garbage collection: ${gcResult.reclaimedMB.toFixed(2)}MB freed`);
  }
  
  // Execute cleanup callbacks
  await monitor.executeCleanup();
  actions.push('Cleanup callbacks executed');
  
  // Execute available degradation strategies if still under pressure
  const afterGCStats = monitor.getCurrentStats();
  if (afterGCStats.percentage > 75) {
    const suggestions = getGlobalMemoryReporter().getCurrentSuggestions();
    for (const action of suggestions.immediate) {
      const success = await limiter.executeStrategy(action.title.toLowerCase().replace(/\s+/g, '-'));
      if (success) {
        actions.push(`Strategy executed: ${action.title}`);
      }
    }
  }
  
  const finalStats = monitor.getCurrentStats();
  const reclaimedMB = (beforeStats.used - finalStats.used) / (1024 * 1024);
  
  return {
    success: reclaimedMB > 0,
    reclaimedMB: Math.max(0, reclaimedMB),
    actions
  };
}

/**
 * Memory-aware wrapper for async operations
 */
export async function withMemoryMonitoring<T>(
  operation: () => Promise<T>,
  options?: {
    label?: string;
    maxMemoryMB?: number;
    onPressure?: () => void;
  }
): Promise<T> {
  const { label = 'Operation', maxMemoryMB, onPressure } = options || {};
  
  const monitor = getGlobalMemoryMonitor();
  const startStats = monitor.getCurrentStats();
  
  // Set up pressure monitoring if callback provided
  let pressureListener: ((event: any) => void) | undefined;
  if (onPressure) {
    pressureListener = (event) => {
      if (event.level === 'high' || event.level === 'critical') {
        onPressure();
      }
    };
    monitor.on('pressure-change', pressureListener);
  }
  
  // Set up temporary memory limit if provided
  let limiter;
  if (maxMemoryMB) {
    limiter = getGlobalMemoryLimiter();
    const originalConfig = limiter.getStatus().limits;
    limiter.updateConfig({ hardLimitMB: maxMemoryMB });
    
    // Restore after operation
    Promise.resolve().then(async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        limiter.updateConfig({ hardLimitMB: originalConfig.hard });
      } catch (error) {
        console.warn('Failed to restore memory limits:', error);
      }
    });
  }
  
  try {
    const result = await operation();
    
    const endStats = monitor.getCurrentStats();
    const memoryDiff = (endStats.used - startStats.used) / (1024 * 1024);
    
    if (memoryDiff > 50) { // More than 50MB increase
      console.warn(`${label} consumed ${memoryDiff.toFixed(1)}MB additional memory`);
    }
    
    return result;
  } finally {
    // Cleanup listeners
    if (pressureListener) {
      monitor.removeListener('pressure-change', pressureListener);
    }
  }
}

/**
 * Default memory management configuration for jsx-migr8
 */
export const DEFAULT_MEMORY_CONFIG = {
  maxMemoryMB: 2048,
  enableLimiting: true,
  enableReporting: true,
  enableProgressDisplay: true,
  
  // Monitor configuration
  monitoringInterval: 1000,
  cleanupEnabled: true,
  warningsEnabled: true,
  
  // Limiter configuration
  gracefulDegradation: true,
  degradationDelay: 5000,
  recoveryDelay: 10000,
  
  // Progress configuration
  showMemory: true,
  showPercentage: true,
  showBar: true,
  showETA: true,
  memoryWarningThreshold: 70,
  memoryErrorThreshold: 90,
  
  // Reporter configuration
  includeHistory: true,
  includeTrends: true,
  includeRecommendations: true,
  detailLevel: 'detailed' as const,
  exportFormat: 'text' as const
};

/**
 * Quick setup function for jsx-migr8 integration
 */
export function setupMemoryManagement(customConfig?: Partial<typeof DEFAULT_MEMORY_CONFIG>) {
  const config = { ...DEFAULT_MEMORY_CONFIG, ...customConfig };
  
  return initializeMemoryManagement({
    maxMemoryMB: config.maxMemoryMB,
    enableLimiting: config.enableLimiting,
    enableReporting: config.enableReporting,
    enableProgressDisplay: config.enableProgressDisplay
  });
}
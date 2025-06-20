/**
 * Memory Usage Reporting and Optimization Suggestions
 * 
 * Provides comprehensive memory usage reports and intelligent
 * optimization suggestions based on usage patterns and performance data.
 */

import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { MemoryMonitor, MemoryStats, GCStats, MemoryLeakCandidate, getGlobalMemoryMonitor } from './memory-monitor';
import { MemoryLimiter, getGlobalMemoryLimiter } from './memory-limiter';

export interface MemoryReport {
  timestamp: number;
  duration: number;
  summary: MemoryReportSummary;
  performance: PerformanceAnalysis;
  optimization: OptimizationSuggestions;
  trends: MemoryTrends;
  incidents: MemoryIncident[];
  recommendations: Recommendation[];
}

export interface MemoryReportSummary {
  peakUsage: MemoryStats;
  averageUsage: MemoryStats;
  minUsage: MemoryStats;
  totalGCRuns: number;
  totalMemoryFreed: number;
  pressureEvents: number;
  leakCandidates: number;
  degradationEvents: number;
}

export interface PerformanceAnalysis {
  gcEfficiency: number;
  memoryThroughput: number;
  pressureFrequency: number;
  recoveryTime: number;
  degradationImpact: number;
  overallScore: number;
}

export interface OptimizationSuggestions {
  immediate: OptimizationAction[];
  shortTerm: OptimizationAction[];
  longTerm: OptimizationAction[];
}

export interface OptimizationAction {
  type: 'config' | 'code' | 'process' | 'infrastructure';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImpact: string;
  implementation: string;
  estimatedEffort: 'minutes' | 'hours' | 'days';
}

export interface MemoryTrends {
  usage: 'stable' | 'increasing' | 'decreasing' | 'volatile';
  pressure: 'improving' | 'worsening' | 'stable';
  efficiency: 'improving' | 'degrading' | 'stable';
  growthRate: number; // MB per hour
  projectedExhaustion?: number; // Hours until memory exhaustion
}

export interface MemoryIncident {
  timestamp: number;
  type: 'pressure' | 'limit' | 'leak' | 'gc-failure' | 'degradation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  memoryUsage: number;
  resolved: boolean;
  duration?: number;
}

export interface Recommendation {
  category: 'configuration' | 'codebase' | 'monitoring' | 'infrastructure';
  priority: number;
  title: string;
  description: string;
  benefits: string[];
  risks: string[];
  implementation: RecommendationStep[];
}

export interface RecommendationStep {
  step: number;
  action: string;
  command?: string;
  verification: string;
}

export interface ReportConfiguration {
  includeHistory: boolean;
  includeTrends: boolean;
  includeRecommendations: boolean;
  detailLevel: 'summary' | 'detailed' | 'comprehensive';
  exportFormat: 'json' | 'text' | 'html';
  outputPath?: string;
}

export class MemoryReporter {
  private memoryMonitor: MemoryMonitor;
  private memoryLimiter: MemoryLimiter;
  private incidents: MemoryIncident[] = [];
  private reportStartTime: number = Date.now();

  constructor() {
    this.memoryMonitor = getGlobalMemoryMonitor();
    this.memoryLimiter = getGlobalMemoryLimiter();
    this.setupEventListeners();
  }

  /**
   * Generate comprehensive memory report
   */
  public generateReport(config: ReportConfiguration = { 
    includeHistory: true, 
    includeTrends: true, 
    includeRecommendations: true, 
    detailLevel: 'detailed',
    exportFormat: 'text'
  }): MemoryReport {
    const now = Date.now();
    const duration = now - this.reportStartTime;

    const summary = this.generateSummary();
    const performance = this.analyzePerformance();
    const optimization = this.generateOptimizationSuggestions(performance);
    const trends = this.analyzeTrends();
    const recommendations = this.generateRecommendations(summary, performance, trends);

    const report: MemoryReport = {
      timestamp: now,
      duration,
      summary,
      performance,
      optimization,
      trends,
      incidents: [...this.incidents],
      recommendations
    };

    if (config.outputPath) {
      this.exportReport(report, config);
    }

    return report;
  }

  /**
   * Display memory report in console
   */
  public displayReport(report?: MemoryReport, format: 'summary' | 'detailed' = 'detailed'): void {
    const reportData = report || this.generateReport();
    
    console.log(chalk.bold.blue('\n📊 Memory Usage Report'));
    console.log(chalk.gray('='.repeat(60)));
    
    this.displaySummary(reportData.summary);
    
    if (format === 'detailed') {
      this.displayPerformance(reportData.performance);
      this.displayTrends(reportData.trends);
      this.displayOptimizations(reportData.optimization);
      this.displayRecommendations(reportData.recommendations);
    }
    
    console.log(chalk.gray('='.repeat(60)));
  }

  /**
   * Get memory usage suggestions for current state
   */
  public getCurrentSuggestions(): OptimizationSuggestions {
    const performance = this.analyzePerformance();
    return this.generateOptimizationSuggestions(performance);
  }

  /**
   * Reset reporting data
   */
  public reset(): void {
    this.incidents = [];
    this.reportStartTime = Date.now();
  }

  private setupEventListeners(): void {
    this.memoryMonitor.on('pressure-change', (event) => {
      this.recordIncident({
        timestamp: event.timestamp,
        type: 'pressure',
        severity: this.getSeverityFromPressure(event.level as string),
        description: event.message,
        memoryUsage: event.stats.percentage,
        resolved: false
      });
    });

    this.memoryMonitor.on('leak-detected', (event) => {
      this.recordIncident({
        timestamp: event.timestamp,
        type: 'leak',
        severity: 'high',
        description: event.message,
        memoryUsage: event.stats.percentage,
        resolved: false
      });
    });

    this.memoryLimiter.on('soft-limit', (event) => {
      this.recordIncident({
        timestamp: event.timestamp,
        type: 'limit',
        severity: 'medium',
        description: event.message,
        memoryUsage: event.stats.percentage,
        resolved: false
      });
    });

    this.memoryLimiter.on('strategy-executed', (event) => {
      this.recordIncident({
        timestamp: event.timestamp,
        type: 'degradation',
        severity: 'medium',
        description: event.message,
        memoryUsage: event.stats.percentage,
        resolved: false
      });
    });
  }

  private recordIncident(incident: MemoryIncident): void {
    this.incidents.push(incident);
    
    // Keep only last 100 incidents
    if (this.incidents.length > 100) {
      this.incidents.shift();
    }
  }

  private generateSummary(): MemoryReportSummary {
    const history = this.memoryMonitor.getMemoryHistory(60); // Last hour
    const gcStats = this.memoryMonitor.getGCStats();
    const leakCandidates = this.memoryMonitor.getLeakCandidates();

    let peakUsage = history[0];
    let minUsage = history[0];
    let totalUsed = 0;

    for (const stat of history) {
      if (stat.used > peakUsage.used) {
        peakUsage = stat;
      }
      if (stat.used < minUsage.used) {
        minUsage = stat;
      }
      totalUsed += stat.used;
    }

    const averageUsage: MemoryStats = {
      ...history[0],
      used: totalUsed / history.length,
      percentage: (totalUsed / history.length / history[0].total) * 100
    };

    return {
      peakUsage,
      averageUsage,
      minUsage,
      totalGCRuns: gcStats.totalRuns,
      totalMemoryFreed: gcStats.averageReclaimedMB * gcStats.totalRuns,
      pressureEvents: this.incidents.filter(i => i.type === 'pressure').length,
      leakCandidates: leakCandidates.length,
      degradationEvents: this.incidents.filter(i => i.type === 'degradation').length
    };
  }

  private analyzePerformance(): PerformanceAnalysis {
    const gcStats = this.memoryMonitor.getGCStats();
    const history = this.memoryMonitor.getMemoryHistory(30);
    const pressureEvents = this.incidents.filter(i => i.type === 'pressure');
    
    // GC Efficiency (0-100)
    const gcEfficiency = Math.min(100, gcStats.effectiveness);
    
    // Memory Throughput (MB/minute)
    const memoryThroughput = history.length > 1 
      ? (history[history.length - 1].used - history[0].used) / (1024 * 1024) / (history.length / 60)
      : 0;
    
    // Pressure Frequency (events per hour)
    const pressureFrequency = pressureEvents.length / ((Date.now() - this.reportStartTime) / (1000 * 60 * 60));
    
    // Recovery Time (average time to recover from pressure)
    const recoveryTime = this.calculateAverageRecoveryTime();
    
    // Degradation Impact (percentage of time in degraded state)
    const degradationImpact = this.calculateDegradationImpact();
    
    // Overall Score (0-100)
    const overallScore = this.calculateOverallScore({
      gcEfficiency,
      memoryThroughput: Math.max(0, 100 - Math.abs(memoryThroughput) * 10),
      pressureFrequency: Math.max(0, 100 - pressureFrequency * 20),
      recoveryTime: Math.max(0, 100 - recoveryTime / 1000),
      degradationImpact: Math.max(0, 100 - degradationImpact)
    });

    return {
      gcEfficiency,
      memoryThroughput,
      pressureFrequency,
      recoveryTime,
      degradationImpact,
      overallScore
    };
  }

  private generateOptimizationSuggestions(performance: PerformanceAnalysis): OptimizationSuggestions {
    const immediate: OptimizationAction[] = [];
    const shortTerm: OptimizationAction[] = [];
    const longTerm: OptimizationAction[] = [];

    // Immediate actions
    if (performance.gcEfficiency < 50) {
      immediate.push({
        type: 'process',
        priority: 'high',
        title: 'Force Garbage Collection',
        description: 'GC efficiency is low. Force garbage collection to free memory.',
        expectedImpact: '10-20% memory reduction',
        implementation: 'Run memory monitor GC or add --expose-gc flag',
        estimatedEffort: 'minutes'
      });
    }

    if (performance.pressureFrequency > 5) {
      immediate.push({
        type: 'config',
        priority: 'critical',
        title: 'Increase Memory Limits',
        description: 'High pressure frequency indicates insufficient memory allocation.',
        expectedImpact: '50-80% reduction in pressure events',
        implementation: 'Increase maxMemoryMB in configuration',
        estimatedEffort: 'minutes'
      });
    }

    // Short-term actions
    if (performance.degradationImpact > 20) {
      shortTerm.push({
        type: 'code',
        priority: 'high',
        title: 'Optimize Processing Batch Size',
        description: 'Reduce batch sizes to lower memory peaks.',
        expectedImpact: '20-40% reduction in peak memory usage',
        implementation: 'Implement dynamic batch sizing based on memory pressure',
        estimatedEffort: 'hours'
      });
    }

    // Long-term actions
    longTerm.push({
      type: 'infrastructure',
      priority: 'medium',
      title: 'Implement Memory Pooling',
      description: 'Use object pools to reduce GC pressure.',
      expectedImpact: '15-30% improvement in GC efficiency',
      implementation: 'Create reusable object pools for frequently allocated objects',
      estimatedEffort: 'days'
    });

    return { immediate, shortTerm, longTerm };
  }

  private analyzeTrends(): MemoryTrends {
    const history = this.memoryMonitor.getMemoryHistory(60);
    if (history.length < 10) {
      return {
        usage: 'stable',
        pressure: 'stable',
        efficiency: 'stable',
        growthRate: 0
      };
    }

    // Calculate growth rate
    const first = history[0];
    const last = history[history.length - 1];
    const timeDiffHours = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
    const memoryDiffMB = (last.used - first.used) / (1024 * 1024);
    const growthRate = timeDiffHours > 0 ? memoryDiffMB / timeDiffHours : 0;

    // Determine usage trend
    let usage: MemoryTrends['usage'] = 'stable';
    if (Math.abs(growthRate) > 10) {
      usage = 'volatile';
    } else if (growthRate > 2) {
      usage = 'increasing';
    } else if (growthRate < -2) {
      usage = 'decreasing';
    }

    // Calculate projected exhaustion
    let projectedExhaustion: number | undefined;
    if (growthRate > 0) {
      const remainingMB = (last.total - last.used) / (1024 * 1024);
      projectedExhaustion = remainingMB / growthRate;
    }

    return {
      usage,
      pressure: this.calculatePressureTrend(),
      efficiency: this.calculateEfficiencyTrend(),
      growthRate,
      projectedExhaustion
    };
  }

  private generateRecommendations(
    summary: MemoryReportSummary,
    performance: PerformanceAnalysis,
    trends: MemoryTrends
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Configuration recommendations
    if (performance.overallScore < 70) {
      recommendations.push({
        category: 'configuration',
        priority: 1,
        title: 'Optimize Memory Configuration',
        description: 'Adjust memory limits and thresholds based on actual usage patterns.',
        benefits: [
          'Reduced memory pressure events',
          'Better performance',
          'Fewer degradation activations'
        ],
        risks: [
          'May require process restart',
          'Could impact other applications'
        ],
        implementation: [
          { step: 1, action: 'Analyze peak memory usage', verification: 'Check memory reports' },
          { step: 2, action: 'Increase memory limits by 20-30%', verification: 'Monitor pressure events' },
          { step: 3, action: 'Adjust thresholds proportionally', verification: 'Validate degradation timing' }
        ]
      });
    }

    // Monitoring recommendations
    if (summary.leakCandidates > 0) {
      recommendations.push({
        category: 'monitoring',
        priority: 2,
        title: 'Investigate Memory Leaks',
        description: 'Active memory leak detection requires investigation and resolution.',
        benefits: [
          'Prevent memory exhaustion',
          'Improved stability',
          'Better performance'
        ],
        risks: [
          'May require code changes',
          'Investigation time required'
        ],
        implementation: [
          { step: 1, action: 'Enable detailed heap profiling', verification: 'Heap snapshots generated' },
          { step: 2, action: 'Identify growing object types', verification: 'Object growth patterns identified' },
          { step: 3, action: 'Fix leak sources', verification: 'Memory growth stabilized' }
        ]
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private displaySummary(summary: MemoryReportSummary): void {
    console.log(chalk.bold('\n📈 Summary'));
    console.log(`Peak Usage: ${this.formatMemoryStats(summary.peakUsage)}`);
    console.log(`Average Usage: ${this.formatMemoryStats(summary.averageUsage)}`);
    console.log(`GC Runs: ${summary.totalGCRuns} (${summary.totalMemoryFreed.toFixed(1)}MB freed)`);
    console.log(`Pressure Events: ${summary.pressureEvents}`);
    console.log(`Memory Leaks: ${summary.leakCandidates} detected`);
    console.log(`Degradations: ${summary.degradationEvents} activations`);
  }

  private displayPerformance(performance: PerformanceAnalysis): void {
    console.log(chalk.bold('\n⚡ Performance Analysis'));
    console.log(`Overall Score: ${this.colorizeScore(performance.overallScore)}`);
    console.log(`GC Efficiency: ${performance.gcEfficiency.toFixed(1)}%`);
    console.log(`Memory Throughput: ${performance.memoryThroughput.toFixed(2)} MB/min`);
    console.log(`Pressure Frequency: ${performance.pressureFrequency.toFixed(2)} events/hour`);
    console.log(`Recovery Time: ${performance.recoveryTime.toFixed(0)}ms`);
    console.log(`Degradation Impact: ${performance.degradationImpact.toFixed(1)}%`);
  }

  private displayTrends(trends: MemoryTrends): void {
    console.log(chalk.bold('\n📊 Trends'));
    console.log(`Usage: ${this.colorizeTrend(trends.usage)}`);
    console.log(`Pressure: ${this.colorizeTrend(trends.pressure)}`);
    console.log(`Efficiency: ${this.colorizeTrend(trends.efficiency)}`);
    console.log(`Growth Rate: ${trends.growthRate.toFixed(2)} MB/hour`);
    
    if (trends.projectedExhaustion) {
      const hours = trends.projectedExhaustion;
      const color = hours < 1 ? chalk.red : hours < 24 ? chalk.yellow : chalk.green;
      console.log(`Projected Exhaustion: ${color(hours.toFixed(1) + ' hours')}`);
    }
  }

  private displayOptimizations(optimization: OptimizationSuggestions): void {
    console.log(chalk.bold('\n🔧 Optimization Suggestions'));
    
    if (optimization.immediate.length > 0) {
      console.log(chalk.red.bold('\nImmediate Actions:'));
      optimization.immediate.forEach((action, i) => {
        console.log(`${i + 1}. ${action.title} (${action.priority})`);
        console.log(`   ${action.description}`);
        console.log(`   Impact: ${action.expectedImpact}`);
      });
    }

    if (optimization.shortTerm.length > 0) {
      console.log(chalk.yellow.bold('\nShort-term Actions:'));
      optimization.shortTerm.forEach((action, i) => {
        console.log(`${i + 1}. ${action.title}`);
        console.log(`   ${action.description}`);
      });
    }
  }

  private displayRecommendations(recommendations: Recommendation[]): void {
    if (recommendations.length === 0) {
      return;
    }

    console.log(chalk.bold('\n💡 Recommendations'));
    recommendations.slice(0, 3).forEach((rec, i) => {
      console.log(`\n${i + 1}. ${rec.title} (${rec.category})`);
      console.log(`   ${rec.description}`);
      console.log(`   Benefits: ${rec.benefits.join(', ')}`);
    });
  }

  private exportReport(report: MemoryReport, config: ReportConfiguration): void {
    if (!config.outputPath) {
      return;
    }

    try {
      const filename = `memory-report-${Date.now()}.${config.exportFormat}`;
      const filepath = join(config.outputPath, filename);
      
      let content: string;
      
      switch (config.exportFormat) {
        case 'json':
          content = JSON.stringify(report, null, 2);
          break;
        case 'html':
          content = this.generateHTMLReport(report);
          break;
        default:
          content = this.generateTextReport(report);
      }
      
      writeFileSync(filepath, content);
      console.log(chalk.green(`Report exported to: ${filepath}`));
    } catch (error) {
      console.error(chalk.red('Failed to export report:'), error);
    }
  }

  private generateHTMLReport(report: MemoryReport): string {
    // Basic HTML report template
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Memory Usage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .metric { margin: 10px 0; }
        .score { font-weight: bold; font-size: 1.2em; }
    </style>
</head>
<body>
    <h1>Memory Usage Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <div class="metric">Peak Usage: ${this.formatMemoryStats(report.summary.peakUsage)}</div>
        <div class="metric">Average Usage: ${this.formatMemoryStats(report.summary.averageUsage)}</div>
        <div class="metric">Overall Score: <span class="score">${report.performance.overallScore.toFixed(1)}</span></div>
    </div>
    <pre>${JSON.stringify(report, null, 2)}</pre>
</body>
</html>`;
  }

  private generateTextReport(report: MemoryReport): string {
    const lines: string[] = [];
    lines.push('MEMORY USAGE REPORT');
    lines.push('='.repeat(60));
    lines.push(`Generated: ${new Date(report.timestamp).toISOString()}`);
    lines.push(`Duration: ${(report.duration / 1000 / 60).toFixed(1)} minutes`);
    lines.push('');
    
    lines.push('SUMMARY');
    lines.push('-'.repeat(30));
    lines.push(`Peak Usage: ${this.formatMemoryStats(report.summary.peakUsage)}`);
    lines.push(`Average Usage: ${this.formatMemoryStats(report.summary.averageUsage)}`);
    lines.push(`GC Runs: ${report.summary.totalGCRuns}`);
    lines.push(`Pressure Events: ${report.summary.pressureEvents}`);
    lines.push('');
    
    lines.push('PERFORMANCE');
    lines.push('-'.repeat(30));
    lines.push(`Overall Score: ${report.performance.overallScore.toFixed(1)}`);
    lines.push(`GC Efficiency: ${report.performance.gcEfficiency.toFixed(1)}%`);
    lines.push(`Memory Throughput: ${report.performance.memoryThroughput.toFixed(2)} MB/min`);
    lines.push('');
    
    return lines.join('\n');
  }

  private formatMemoryStats(stats: MemoryStats): string {
    const usedMB = (stats.used / (1024 * 1024)).toFixed(1);
    const totalMB = (stats.total / (1024 * 1024)).toFixed(1);
    return `${usedMB}MB / ${totalMB}MB (${stats.percentage.toFixed(1)}%)`;
  }

  private colorizeScore(score: number): string {
    if (score >= 80) return chalk.green(`${score.toFixed(1)}`);
    if (score >= 60) return chalk.yellow(`${score.toFixed(1)}`);
    return chalk.red(`${score.toFixed(1)}`);
  }

  private colorizeTrend(trend: string): string {
    switch (trend) {
      case 'improving': return chalk.green(trend);
      case 'worsening': return chalk.red(trend);
      case 'increasing': return chalk.yellow(trend);
      case 'decreasing': return chalk.cyan(trend);
      default: return chalk.gray(trend);
    }
  }

  private getSeverityFromPressure(level: string): MemoryIncident['severity'] {
    switch (level) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private calculateAverageRecoveryTime(): number {
    // Simplified calculation - would need more sophisticated tracking
    return 5000; // 5 seconds average
  }

  private calculateDegradationImpact(): number {
    const degradationEvents = this.incidents.filter(i => i.type === 'degradation').length;
    const totalTime = Date.now() - this.reportStartTime;
    return (degradationEvents * 30000) / totalTime * 100; // Assume 30s per degradation
  }

  private calculateOverallScore(metrics: Record<string, number>): number {
    const values = Object.values(metrics);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculatePressureTrend(): MemoryTrends['pressure'] {
    const recentPressure = this.incidents.filter(i => 
      i.type === 'pressure' && Date.now() - i.timestamp < 300000
    ).length;
    const olderPressure = this.incidents.filter(i => 
      i.type === 'pressure' && 
      Date.now() - i.timestamp >= 300000 && 
      Date.now() - i.timestamp < 600000
    ).length;

    if (recentPressure > olderPressure) return 'worsening';
    if (recentPressure < olderPressure) return 'improving';
    return 'stable';
  }

  private calculateEfficiencyTrend(): MemoryTrends['efficiency'] {
    const gcStats = this.memoryMonitor.getGCStats();
    // Simplified - would need historical GC efficiency data
    return gcStats.effectiveness > 70 ? 'improving' : 'stable';
  }
}

// Global instance
let globalMemoryReporter: MemoryReporter | null = null;

export function getGlobalMemoryReporter(): MemoryReporter {
  if (!globalMemoryReporter) {
    globalMemoryReporter = new MemoryReporter();
  }
  return globalMemoryReporter;
}

export function resetGlobalMemoryReporter(): void {
  globalMemoryReporter = null;
}
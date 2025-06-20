/**
 * Advanced file filtering and preprocessing for large-scale projects
 * Implements early filtering, size limits, and intelligent file selection
 */

import { promises as fs, Stats } from "node:fs";
import { join, extname, basename } from "node:path";
import fg from "fast-glob";
import { LRUCache } from "lru-cache";
import { FileMetadata, GraphOptimizationConfig } from "./optimized-types";

export interface FileFilterOptions {
  // Size limits
  maxFileSizeKB: number;
  maxLinesPerFile: number;
  
  // Content filtering
  skipMinified: boolean;
  skipGenerated: boolean;
  skipTestFiles: boolean;
  skipConfigFiles: boolean;
  
  // Pattern-based filtering
  includePatterns: string[];
  excludePatterns: string[];
  
  // Smart filtering
  prioritizeByImports: boolean;
  prioritizeByJSX: boolean;
  maxFilesPerBatch: number;
  
  // Caching
  enableMetadataCache: boolean;
  cacheDirectory?: string;
}

export const DEFAULT_FILTER_OPTIONS: FileFilterOptions = {
  maxFileSizeKB: 1024, // 1MB
  maxLinesPerFile: 10000,
  
  skipMinified: true,
  skipGenerated: true,
  skipTestFiles: false,
  skipConfigFiles: true,
  
  includePatterns: ["**/*.{js,jsx,ts,tsx}"],
  excludePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/coverage/**",
  ],
  
  prioritizeByImports: true,
  prioritizeByJSX: true,
  maxFilesPerBatch: 1000,
  
  enableMetadataCache: true,
};

// Quick content analysis results
export interface ContentAnalysis {
  hasImports: boolean;
  hasJsx: boolean;
  importCount: number;
  jsxCount: number;
  lineCount: number;
  isMinified: boolean;
  isGenerated: boolean;
  priority: number; // Higher = more important
}

// File processing result
export interface FileProcessingResult {
  metadata: FileMetadata;
  analysis: ContentAnalysis;
  shouldProcess: boolean;
  skipReason?: string;
  priority: number;
}

export class OptimizedFileFilter {
  private options: FileFilterOptions;
  private metadataCache: LRUCache<string, FileMetadata>;
  private analysisCache: LRUCache<string, ContentAnalysis>;
  private statsCache: LRUCache<string, { stats: Stats; timestamp: number }>;
  
  constructor(options: Partial<FileFilterOptions> = {}) {
    this.options = { ...DEFAULT_FILTER_OPTIONS, ...options };
    
    this.metadataCache = new LRUCache<string, FileMetadata>({
      max: 10000,
      ttl: 1000 * 60 * 15, // 15 minutes
    });
    
    this.analysisCache = new LRUCache<string, ContentAnalysis>({
      max: 5000,
      ttl: 1000 * 60 * 30, // 30 minutes
    });
    
    this.statsCache = new LRUCache<string, { stats: Stats; timestamp: number }>({
      max: 10000,
      ttl: 1000 * 60 * 5, // 5 minutes
    });
  }
  
  /**
   * Discover and filter files with intelligent prioritization
   */
  async discoverFiles(
    root: string,
    blacklist: string[] = [],
    onProgress?: (current: number, total: number, file?: string) => void
  ): Promise<FileProcessingResult[]> {
    // Phase 1: Fast glob-based discovery
    const allPatterns = this.options.includePatterns;
    const excludePatterns = [
      ...this.options.excludePatterns,
      ...blacklist.map(b => `**/${b}/**`),
    ];
    
    const files = fg.sync(allPatterns, {
      cwd: root,
      absolute: true,
      ignore: excludePatterns,
      suppressErrors: true,
    });
    
    if (files.length === 0) {
      return [];
    }
    
    // Phase 2: Quick metadata gathering
    const results: FileProcessingResult[] = [];
    const batchSize = Math.min(100, Math.max(10, files.length / 20));
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(file => this.analyzeFile(file))
      );
      
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Create failed result
          results.push({
            metadata: this.createFailedMetadata(batch[j], result.reason),
            analysis: this.createEmptyAnalysis(),
            shouldProcess: false,
            skipReason: `Analysis failed: ${result.reason}`,
            priority: 0,
          });
        }
        
        onProgress?.(i + j + 1, files.length, batch[j]);
      }
    }
    
    // Phase 3: Filter and prioritize
    const validResults = results.filter(r => r.shouldProcess);
    validResults.sort((a, b) => b.priority - a.priority);
    
    // Limit total files if needed
    if (this.options.maxFilesPerBatch > 0 && validResults.length > this.options.maxFilesPerBatch) {
      return validResults.slice(0, this.options.maxFilesPerBatch);
    }
    
    return validResults;
  }
  
  /**
   * Analyze single file for processing eligibility
   */
  async analyzeFile(filePath: string): Promise<FileProcessingResult> {
    const metadata = await this.getFileMetadata(filePath);
    const analysis = await this.analyzeContent(filePath, metadata);
    
    const { shouldProcess, skipReason } = this.shouldProcessFile(metadata, analysis);
    const priority = this.calculatePriority(metadata, analysis);
    
    return {
      metadata,
      analysis,
      shouldProcess,
      skipReason,
      priority,
    };
  }
  
  /**
   * Get file metadata with caching
   */
  async getFileMetadata(filePath: string): Promise<FileMetadata> {
    const cached = this.metadataCache.get(filePath);
    if (cached) {
      return cached;
    }
    
    try {
      const stats = await this.getFileStats(filePath);
      
      const metadata: FileMetadata = {
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime.getTime(),
        extension: extname(filePath),
        hasImports: false, // Will be set by content analysis
        hasJsx: false,     // Will be set by content analysis
        lineCount: 0,      // Will be set by content analysis
        isProcessed: false,
        isSkipped: false,
      };
      
      this.metadataCache.set(filePath, metadata);
      return metadata;
    } catch (error) {
      return this.createFailedMetadata(filePath, error);
    }
  }
  
  /**
   * Analyze file content for imports and JSX
   */
  async analyzeContent(filePath: string, metadata: FileMetadata): Promise<ContentAnalysis> {
    const cached = this.analysisCache.get(filePath);
    if (cached) {
      return cached;
    }
    
    try {
      // Quick content scan without full AST parsing
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      const analysis: ContentAnalysis = {
        hasImports: false,
        hasJsx: false,
        importCount: 0,
        jsxCount: 0,
        lineCount: lines.length,
        isMinified: this.isMinifiedFile(content, lines),
        isGenerated: this.isGeneratedFile(content, filePath),
        priority: 0,
      };
      
      // Quick regex-based scanning for performance
      const importRegex = /^\s*import\s+/;
      const jsxRegex = /<[A-Z][a-zA-Z0-9]*(?:\s|>|\/)/;
      
      for (const line of lines) {
        if (importRegex.test(line)) {
          analysis.hasImports = true;
          analysis.importCount++;
        }
        
        if (jsxRegex.test(line)) {
          analysis.hasJsx = true;
          analysis.jsxCount++;
        }
        
        // Early exit if we found what we need
        if (analysis.hasImports && analysis.hasJsx && 
            analysis.importCount > 10 && analysis.jsxCount > 10) {
          break;
        }
      }
      
      // Update metadata
      metadata.hasImports = analysis.hasImports;
      metadata.hasJsx = analysis.hasJsx;
      metadata.lineCount = analysis.lineCount;
      
      analysis.priority = this.calculateContentPriority(analysis);
      
      this.analysisCache.set(filePath, analysis);
      return analysis;
    } catch (error) {
      return this.createEmptyAnalysis();
    }
  }
  
  /**
   * Determine if file should be processed
   */
  shouldProcessFile(metadata: FileMetadata, analysis: ContentAnalysis): { 
    shouldProcess: boolean; 
    skipReason?: string;
  } {
    // Size checks
    if (metadata.size > this.options.maxFileSizeKB * 1024) {
      return { 
        shouldProcess: false, 
        skipReason: `File too large: ${Math.round(metadata.size / 1024)}KB > ${this.options.maxFileSizeKB}KB` 
      };
    }
    
    if (analysis.lineCount > this.options.maxLinesPerFile) {
      return { 
        shouldProcess: false, 
        skipReason: `Too many lines: ${analysis.lineCount} > ${this.options.maxLinesPerFile}` 
      };
    }
    
    // Content checks
    if (this.options.skipMinified && analysis.isMinified) {
      return { shouldProcess: false, skipReason: 'Minified file' };
    }
    
    if (this.options.skipGenerated && analysis.isGenerated) {
      return { shouldProcess: false, skipReason: 'Generated file' };
    }
    
    if (this.options.skipTestFiles && this.isTestFile(metadata.path)) {
      return { shouldProcess: false, skipReason: 'Test file' };
    }
    
    if (this.options.skipConfigFiles && this.isConfigFile(metadata.path)) {
      return { shouldProcess: false, skipReason: 'Config file' };
    }
    
    // Priority checks
    if (!analysis.hasImports && !analysis.hasJsx) {
      return { shouldProcess: false, skipReason: 'No imports or JSX found' };
    }
    
    return { shouldProcess: true };
  }
  
  /**
   * Calculate file priority for processing order
   */
  calculatePriority(metadata: FileMetadata, analysis: ContentAnalysis): number {
    let priority = 0;
    
    // Content-based priority
    if (this.options.prioritizeByImports && analysis.hasImports) {
      priority += analysis.importCount * 2;
    }
    
    if (this.options.prioritizeByJSX && analysis.hasJsx) {
      priority += analysis.jsxCount * 3; // JSX is more valuable
    }
    
    // File type priority
    if (metadata.extension === '.tsx' || metadata.extension === '.jsx') {
      priority += 10; // React files are high priority
    }
    
    // Size penalty (smaller files process faster)
    const sizePenalty = Math.min(metadata.size / (1024 * 100), 10); // Max 10 point penalty
    priority -= sizePenalty;
    
    // Recent files get slight boost
    const age = Date.now() - metadata.lastModified;
    const daysSinceModified = age / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 7) {
      priority += 5;
    }
    
    return Math.max(0, priority);
  }
  
  /**
   * Batch files for optimal processing
   */
  createProcessingBatches(results: FileProcessingResult[], batchSize: number): FileProcessingResult[][] {
    const batches: FileProcessingResult[][] = [];
    const sortedResults = [...results].sort((a, b) => b.priority - a.priority);
    
    for (let i = 0; i < sortedResults.length; i += batchSize) {
      batches.push(sortedResults.slice(i, i + batchSize));
    }
    
    return batches;
  }
  
  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.metadataCache.clear();
    this.analysisCache.clear();
    this.statsCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      metadata: {
        size: this.metadataCache.size,
        max: this.metadataCache.max,
      },
      analysis: {
        size: this.analysisCache.size,
        max: this.analysisCache.max,
      },
      stats: {
        size: this.statsCache.size,
        max: this.statsCache.max,
      },
    };
  }
  
  private async getFileStats(filePath: string): Promise<Stats> {
    const cached = this.statsCache.get(filePath);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      return cached.stats;
    }
    
    const stats = await fs.stat(filePath);
    this.statsCache.set(filePath, { stats, timestamp: Date.now() });
    return stats;
  }
  
  private isMinifiedFile(content: string, lines: string[]): boolean {
    // Check for typical minification patterns
    if (lines.length < 10 && content.length > 1000) {
      return true; // Very long lines
    }
    
    // Check for minification artifacts
    const minificationPatterns = [
      /;\s*$/gm, // Semicolons at end of lines
      /,\s*$/gm, // Commas at end of lines
      /}\s*$/gm, // Closing braces at end of lines
    ];
    
    let minificationScore = 0;
    for (const pattern of minificationPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 10) {
        minificationScore++;
      }
    }
    
    return minificationScore >= 2;
  }
  
  private isGeneratedFile(content: string, filePath: string): boolean {
    const fileName = basename(filePath).toLowerCase();
    
    // Check filename patterns
    const generatedPatterns = [
      'generated',
      '.gen.',
      '.generated.',
      'codegen',
      '__generated__',
      'schema.ts',
      'types.ts',
    ];
    
    if (generatedPatterns.some(pattern => fileName.includes(pattern))) {
      return true;
    }
    
    // Check content for generation markers
    const contentMarkers = [
      '// @generated',
      '/* @generated */',
      '// This file was automatically generated',
      '// Auto-generated',
      'DO NOT EDIT',
      'Code generated by',
    ];
    
    const firstLines = content.split('\n').slice(0, 10).join('\n');
    return contentMarkers.some(marker => firstLines.includes(marker));
  }
  
  private isTestFile(filePath: string): boolean {
    const fileName = basename(filePath).toLowerCase();
    const testPatterns = [
      '.test.',
      '.spec.',
      '.stories.',
      '__tests__',
      '__mocks__',
      '.mock.',
    ];
    
    return testPatterns.some(pattern => fileName.includes(pattern)) ||
           filePath.includes('/__tests__/') ||
           filePath.includes('/__mocks__/');
  }
  
  private isConfigFile(filePath: string): boolean {
    const fileName = basename(filePath).toLowerCase();
    const configPatterns = [
      'config.',
      '.config.',
      'webpack',
      'babel',
      'eslint',
      'prettier',
      'jest',
      'rollup',
      'vite',
    ];
    
    return configPatterns.some(pattern => fileName.includes(pattern));
  }
  
  private calculateContentPriority(analysis: ContentAnalysis): number {
    let score = 0;
    
    if (analysis.hasImports) score += analysis.importCount * 2;
    if (analysis.hasJsx) score += analysis.jsxCount * 3;
    
    // Bonus for files with both
    if (analysis.hasImports && analysis.hasJsx) {
      score += 10;
    }
    
    return score;
  }
  
  private createFailedMetadata(filePath: string, error: any): FileMetadata {
    return {
      path: filePath,
      size: 0,
      lastModified: 0,
      extension: extname(filePath),
      hasImports: false,
      hasJsx: false,
      lineCount: 0,
      isProcessed: false,
      isSkipped: true,
      skipReason: error?.message || 'Unknown error',
    };
  }
  
  private createEmptyAnalysis(): ContentAnalysis {
    return {
      hasImports: false,
      hasJsx: false,
      importCount: 0,
      jsxCount: 0,
      lineCount: 0,
      isMinified: false,
      isGenerated: false,
      priority: 0,
    };
  }
}
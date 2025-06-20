/**
 * Incremental graph updates and serialization for large projects
 * Supports partial updates, change detection, and persistent caching
 */

import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { OptimizedProjectGraph, FileMetadata, OptimizedGraphFactory } from "./optimized-types";
import { FileProcessingResult } from "./file-filter";

export interface GraphSnapshot {
  id: string;
  timestamp: number;
  version: string;
  fileHashes: Map<string, string>; // File path -> content hash
  graph: OptimizedProjectGraph;
  metadata: {
    totalFiles: number;
    processingTime: number;
    memoryUsed: number;
  };
}

export interface IncrementalUpdate {
  id: string;
  timestamp: number;
  baseSnapshotId: string;
  changedFiles: string[];
  deletedFiles: string[];
  addedFiles: string[];
  partialGraph: Partial<OptimizedProjectGraph>;
}

export interface GraphCache {
  currentSnapshot?: GraphSnapshot;
  updates: IncrementalUpdate[];
  maxUpdates: number;
  lastCleanup: number;
}

export interface IncrementalGraphOptions {
  cacheDirectory: string;
  maxSnapshots: number;
  maxUpdates: number;
  compressionEnabled: boolean;
  autoCleanup: boolean;
  cleanupInterval: number; // milliseconds
}

export const DEFAULT_INCREMENTAL_OPTIONS: IncrementalGraphOptions = {
  cacheDirectory: '.jsx-migr8-cache',
  maxSnapshots: 5,
  maxUpdates: 50,
  compressionEnabled: true,
  autoCleanup: true,
  cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
};

export class IncrementalGraphManager {
  private options: IncrementalGraphOptions;
  private graphFactory: OptimizedGraphFactory;
  private cache: GraphCache;
  private cacheFilePath: string;
  
  constructor(
    options: Partial<IncrementalGraphOptions> = {},
    graphFactory?: OptimizedGraphFactory
  ) {
    this.options = { ...DEFAULT_INCREMENTAL_OPTIONS, ...options };
    this.graphFactory = graphFactory || new OptimizedGraphFactory();
    this.cache = this.initializeCache();
    this.cacheFilePath = join(this.options.cacheDirectory, 'graph-cache.json');
  }
  
  /**
   * Initialize or load existing cache
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.options.cacheDirectory, { recursive: true });
      await this.loadCache();
      
      if (this.options.autoCleanup) {
        await this.performCleanup();
      }
    } catch (error) {
      console.warn('Failed to initialize incremental graph cache:', error);
      this.cache = this.initializeCache();
    }
  }
  
  /**
   * Check if we can use incremental updates for the given files
   */
  async canUseIncremental(files: FileProcessingResult[]): Promise<{
    canUse: boolean;
    reason?: string;
    changedFiles: string[];
    addedFiles: string[];
    deletedFiles: string[];
  }> {
    if (!this.cache.currentSnapshot) {
      return {
        canUse: false,
        reason: 'No base snapshot available',
        changedFiles: [],
        addedFiles: [],
        deletedFiles: [],
      };
    }
    
    const currentFileHashes = new Map<string, string>();
    const filePaths = files.map(f => f.metadata.path);
    
    // Calculate current file hashes
    for (const file of files) {
      try {
        const hash = await this.calculateFileHash(file.metadata.path);
        currentFileHashes.set(file.metadata.path, hash);
      } catch (error) {
        // File might be deleted or inaccessible
        console.warn(`Failed to hash file ${file.metadata.path}:`, error);
      }
    }
    
    // Compare with snapshot
    const snapshot = this.cache.currentSnapshot;
    const changedFiles: string[] = [];
    const addedFiles: string[] = [];
    const deletedFiles: string[] = [];
    
    // Find changed and added files
    for (const [filePath, currentHash] of currentFileHashes) {
      const previousHash = snapshot.fileHashes.get(filePath);
      if (!previousHash) {
        addedFiles.push(filePath);
      } else if (previousHash !== currentHash) {
        changedFiles.push(filePath);
      }
    }
    
    // Find deleted files
    for (const [filePath] of snapshot.fileHashes) {
      if (!currentFileHashes.has(filePath)) {
        deletedFiles.push(filePath);
      }
    }
    
    const totalChanges = changedFiles.length + addedFiles.length + deletedFiles.length;
    const changeRatio = totalChanges / Math.max(filePaths.length, 1);
    
    // Use incremental if less than 30% of files changed
    const canUse = changeRatio < 0.3;
    
    return {
      canUse,
      reason: canUse ? undefined : `Too many changes: ${Math.round(changeRatio * 100)}% of files modified`,
      changedFiles,
      addedFiles,
      deletedFiles,
    };
  }
  
  /**
   * Apply incremental update to existing graph
   */
  async applyIncrementalUpdate(
    files: FileProcessingResult[],
    changedFiles: string[],
    addedFiles: string[],
    deletedFiles: string[],
    onProgress?: (phase: string, progress: number, total: number) => void
  ): Promise<OptimizedProjectGraph> {
    if (!this.cache.currentSnapshot) {
      throw new Error('No base snapshot available for incremental update');
    }
    
    onProgress?.('Loading base graph', 0, 1);
    
    // Start with the base graph
    const graph = this.cloneGraph(this.cache.currentSnapshot.graph);
    
    onProgress?.('Removing deleted files', 1, 5);
    
    // Remove data for deleted files
    for (const filePath of deletedFiles) {
      this.removeFileFromGraph(graph, filePath);
    }
    
    onProgress?.('Processing changed files', 2, 5);
    
    // Process changed files (remove old data, add new)
    for (const filePath of changedFiles) {
      this.removeFileFromGraph(graph, filePath);
    }
    
    // Process changed and added files
    const filesToProcess = files.filter(f => 
      changedFiles.includes(f.metadata.path) || addedFiles.includes(f.metadata.path)
    );
    
    onProgress?.('Adding new data', 3, 5);
    
    // Here we would need to integrate with the actual AST processing
    // For now, this is a placeholder that shows the structure
    await this.processFilesIncremental(graph, filesToProcess, onProgress);
    
    onProgress?.('Updating indexes', 4, 5);
    
    // Update graph metadata
    graph.totalFiles = graph.importsByFile.size;
    graph.totalImports = graph.imports.size;
    graph.totalJsx = graph.jsx.size;
    graph.buildTimestamp = Date.now();
    
    onProgress?.('Finalizing', 5, 5);
    
    return graph;
  }
  
  /**
   * Create a new snapshot from current graph
   */
  async createSnapshot(
    graph: OptimizedProjectGraph,
    files: FileProcessingResult[],
    processingTime: number
  ): Promise<string> {
    const snapshot: GraphSnapshot = {
      id: this.generateSnapshotId(),
      timestamp: Date.now(),
      version: '2.0', // jsx-migr8 version
      fileHashes: new Map(),
      graph: this.cloneGraph(graph),
      metadata: {
        totalFiles: files.length,
        processingTime,
        memoryUsed: process.memoryUsage().heapUsed,
      },
    };
    
    // Calculate file hashes
    for (const file of files) {
      try {
        const hash = await this.calculateFileHash(file.metadata.path);
        snapshot.fileHashes.set(file.metadata.path, hash);
      } catch (error) {
        console.warn(`Failed to hash file ${file.metadata.path}:`, error);
      }
    }
    
    // Update cache
    this.cache.currentSnapshot = snapshot;
    this.cache.updates = []; // Clear updates after new snapshot
    
    // Save to disk
    await this.saveCache();
    
    return snapshot.id;
  }
  
  /**
   * Save graph to persistent storage with compression
   */
  async saveGraph(graph: OptimizedProjectGraph, filePath: string): Promise<void> {
    const serializedGraph = this.serializeGraph(graph);
    
    if (this.options.compressionEnabled) {
      // In a real implementation, you might use compression here
      const compressed = JSON.stringify(serializedGraph);
      await fs.writeFile(filePath, compressed, 'utf8');
    } else {
      await fs.writeFile(filePath, JSON.stringify(serializedGraph, null, 2), 'utf8');
    }
  }
  
  /**
   * Load graph from persistent storage
   */
  async loadGraph(filePath: string): Promise<OptimizedProjectGraph | null> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const serializedData = JSON.parse(content);
      return this.deserializeGraph(serializedData);
    } catch (error) {
      console.warn(`Failed to load graph from ${filePath}:`, error);
      return null;
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      hasSnapshot: !!this.cache.currentSnapshot,
      snapshotAge: this.cache.currentSnapshot 
        ? Date.now() - this.cache.currentSnapshot.timestamp 
        : 0,
      updateCount: this.cache.updates.length,
      cacheDirectory: this.options.cacheDirectory,
      cacheSize: this.calculateCacheSize(),
    };
  }
  
  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    this.cache = this.initializeCache();
    
    try {
      await fs.rm(this.options.cacheDirectory, { recursive: true, force: true });
      await fs.mkdir(this.options.cacheDirectory, { recursive: true });
    } catch (error) {
      console.warn('Failed to clear cache directory:', error);
    }
  }
  
  private initializeCache(): GraphCache {
    return {
      currentSnapshot: undefined,
      updates: [],
      maxUpdates: this.options.maxUpdates,
      lastCleanup: Date.now(),
    };
  }
  
  private async loadCache(): Promise<void> {
    try {
      const content = await fs.readFile(this.cacheFilePath, 'utf8');
      const data = JSON.parse(content);
      
      // Reconstruct Maps from JSON
      if (data.currentSnapshot?.fileHashes) {
        data.currentSnapshot.fileHashes = new Map(data.currentSnapshot.fileHashes);
      }
      
      if (data.currentSnapshot?.graph) {
        data.currentSnapshot.graph = this.deserializeGraph(data.currentSnapshot.graph);
      }
      
      this.cache = data;
    } catch (error) {
      // Cache file doesn't exist or is corrupted
      this.cache = this.initializeCache();
    }
  }
  
  private async saveCache(): Promise<void> {
    try {
      const data = {
        ...this.cache,
        currentSnapshot: this.cache.currentSnapshot ? {
          ...this.cache.currentSnapshot,
          fileHashes: Array.from(this.cache.currentSnapshot.fileHashes.entries()),
          graph: this.serializeGraph(this.cache.currentSnapshot.graph),
        } : undefined,
      };
      
      await fs.writeFile(this.cacheFilePath, JSON.stringify(data), 'utf8');
    } catch (error) {
      console.warn('Failed to save cache:', error);
    }
  }
  
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return createHash('sha256').update(content).digest('hex').substring(0, 16);
    } catch (error) {
      throw new Error(`Failed to hash file ${filePath}: ${error}`);
    }
  }
  
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private cloneGraph(graph: OptimizedProjectGraph): OptimizedProjectGraph {
    return {
      imports: new Map(graph.imports),
      jsx: new Map(graph.jsx),
      importsByFile: new Map(Array.from(graph.importsByFile.entries()).map(([k, v]) => [k, new Set(v)])),
      importsByPackage: new Map(Array.from(graph.importsByPackage.entries()).map(([k, v]) => [k, new Set(v)])),
      jsxByFile: new Map(Array.from(graph.jsxByFile.entries()).map(([k, v]) => [k, new Set(v)])),
      jsxByComponent: new Map(Array.from(graph.jsxByComponent.entries()).map(([k, v]) => [k, new Set(v)])),
      totalFiles: graph.totalFiles,
      totalImports: graph.totalImports,
      totalJsx: graph.totalJsx,
      buildTimestamp: graph.buildTimestamp,
    };
  }
  
  private removeFileFromGraph(graph: OptimizedProjectGraph, filePath: string): void {
    // Remove imports for this file
    const importIds = graph.importsByFile.get(filePath) || new Set();
    for (const importId of importIds) {
      const importData = graph.imports.get(importId);
      if (importData) {
        // Remove from package index
        const packageImports = graph.importsByPackage.get(importData.pkg);
        if (packageImports) {
          packageImports.delete(importId);
          if (packageImports.size === 0) {
            graph.importsByPackage.delete(importData.pkg);
          }
        }
        
        // Remove the import
        graph.imports.delete(importId);
      }
    }
    graph.importsByFile.delete(filePath);
    
    // Remove JSX for this file
    const jsxIds = graph.jsxByFile.get(filePath) || new Set();
    for (const jsxId of jsxIds) {
      const jsxData = graph.jsx.get(jsxId);
      if (jsxData) {
        // Remove from component index
        const componentJsx = graph.jsxByComponent.get(jsxData.componentName);
        if (componentJsx) {
          componentJsx.delete(jsxId);
          if (componentJsx.size === 0) {
            graph.jsxByComponent.delete(jsxData.componentName);
          }
        }
        
        // Remove the JSX
        graph.jsx.delete(jsxId);
      }
    }
    graph.jsxByFile.delete(filePath);
  }
  
  private async processFilesIncremental(
    graph: OptimizedProjectGraph,
    files: FileProcessingResult[],
    onProgress?: (phase: string, progress: number, total: number) => void
  ): Promise<void> {
    // This would integrate with the actual AST processing logic
    // For now, this is a placeholder that shows the integration point
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(`Processing ${file.metadata.path}`, i, files.length);
      
      // Here you would call the actual AST processing logic
      // and add the results to the graph using graphFactory methods
      
      // Example:
      // const [ast, code] = await getFileAstAndCodeAsync(file.metadata.path);
      // processFileAst(ast, file.metadata.path, graph);
    }
  }
  
  private serializeGraph(graph: OptimizedProjectGraph): any {
    return {
      imports: Array.from(graph.imports.entries()),
      jsx: Array.from(graph.jsx.entries()),
      importsByFile: Array.from(graph.importsByFile.entries()).map(([k, v]) => [k, Array.from(v)]),
      importsByPackage: Array.from(graph.importsByPackage.entries()).map(([k, v]) => [k, Array.from(v)]),
      jsxByFile: Array.from(graph.jsxByFile.entries()).map(([k, v]) => [k, Array.from(v)]),
      jsxByComponent: Array.from(graph.jsxByComponent.entries()).map(([k, v]) => [k, Array.from(v)]),
      totalFiles: graph.totalFiles,
      totalImports: graph.totalImports,
      totalJsx: graph.totalJsx,
      buildTimestamp: graph.buildTimestamp,
    };
  }
  
  private deserializeGraph(data: any): OptimizedProjectGraph {
    return {
      imports: new Map(data.imports),
      jsx: new Map(data.jsx),
      importsByFile: new Map(data.importsByFile.map(([k, v]: [string, string[]]) => [k, new Set(v)])),
      importsByPackage: new Map(data.importsByPackage.map(([k, v]: [string, string[]]) => [k, new Set(v)])),
      jsxByFile: new Map(data.jsxByFile.map(([k, v]: [string, string[]]) => [k, new Set(v)])),
      jsxByComponent: new Map(data.jsxByComponent.map(([k, v]: [string, string[]]) => [k, new Set(v)])),
      totalFiles: data.totalFiles,
      totalImports: data.totalImports,
      totalJsx: data.totalJsx,
      buildTimestamp: data.buildTimestamp,
    };
  }
  
  private calculateCacheSize(): number {
    // Estimate cache size in bytes
    let size = 0;
    
    if (this.cache.currentSnapshot) {
      size += JSON.stringify(this.serializeGraph(this.cache.currentSnapshot.graph)).length;
      size += this.cache.currentSnapshot.fileHashes.size * 100; // Approximate
    }
    
    size += this.cache.updates.length * 1000; // Approximate per update
    
    return size;
  }
  
  private async performCleanup(): Promise<void> {
    const now = Date.now();
    
    if (now - this.cache.lastCleanup < this.options.cleanupInterval) {
      return;
    }
    
    // Clean up old updates
    if (this.cache.updates.length > this.options.maxUpdates) {
      this.cache.updates = this.cache.updates.slice(-this.options.maxUpdates);
    }
    
    // Clean up old snapshot if it's too old (30 days)
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    if (this.cache.currentSnapshot && 
        now - this.cache.currentSnapshot.timestamp > maxAge) {
      this.cache.currentSnapshot = undefined;
    }
    
    this.cache.lastCleanup = now;
    await this.saveCache();
  }
}
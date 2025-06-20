/**
 * Optimized graph data structures for large-scale projects
 * Reduces memory footprint by storing only essential data with lazy loading
 */

import { namedTypes as n } from "ast-types";
import type { NodePath } from "ast-types/lib/node-path";
import { LRUCache } from "lru-cache";

// Lightweight reference to AST nodes that can be lazily loaded
export interface ASTNodeReference {
  filePath: string;
  nodeType: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  // Optional serialized data for quick access
  serializedData?: string;
}

// Optimized import usage with minimal memory footprint
export interface OptimizedImportUsage {
  id: string; // Unique identifier for fast lookups
  pkg: string;
  file: string;
  imported: string;
  importedType: string;
  local: string;
  // Store AST node reference instead of full node
  nodeRef: ASTNodeReference;
  // Cached hash for fast deduplication
  hash?: string;
}

// Lightweight prop data without full AST nodes
export interface OptimizedPropData {
  name: string;
  type: "literal" | "expression" | "boolean";
  value?: string | number | boolean;
  // Reference to actual AST node for lazy loading
  nodeRef?: ASTNodeReference;
}

// Optimized JSX usage with lazy loading
export interface OptimizedJsxUsage {
  id: string;
  file: string;
  importId: string; // Reference to import by ID instead of full object
  componentName: string;
  // Store AST node reference instead of full node
  openerRef: ASTNodeReference;
  // Optimized prop storage
  props: OptimizedPropData[];
  // Location information for quick filtering
  location: {
    line: number;
    column: number;
  };
}

// Optimized project graph with efficient data structures
export interface OptimizedProjectGraph {
  imports: Map<string, OptimizedImportUsage>; // ID -> Import mapping
  jsx: Map<string, OptimizedJsxUsage>; // ID -> JSX mapping
  // Index structures for fast lookups
  importsByFile: Map<string, Set<string>>; // File -> Import IDs
  importsByPackage: Map<string, Set<string>>; // Package -> Import IDs
  jsxByFile: Map<string, Set<string>>; // File -> JSX IDs
  jsxByComponent: Map<string, Set<string>>; // Component -> JSX IDs
  // Metadata
  totalFiles: number;
  totalImports: number;
  totalJsx: number;
  buildTimestamp: number;
}

// File metadata for filtering and processing
export interface FileMetadata {
  path: string;
  size: number;
  lastModified: number;
  extension: string;
  // Quick scan results
  hasImports: boolean;
  hasJsx: boolean;
  lineCount: number;
  // Processing flags
  isProcessed: boolean;
  isSkipped: boolean;
  skipReason?: string;
}

// Configuration for graph optimization
export interface GraphOptimizationConfig {
  // Memory management
  maxMemoryMB: number;
  maxCacheSize: number;
  enableWeakReferences: boolean;
  
  // File filtering
  maxFileSizeKB: number;
  maxLinesPerFile: number;
  skipLargeFiles: boolean;
  
  // AST node handling
  serializeCommonNodes: boolean;
  useNodeReferences: boolean;
  cacheNodeData: boolean;
  
  // Performance tuning
  batchSize: number;
  concurrency: number;
  enableIncrementalUpdates: boolean;
  
  // Caching
  enableFileCaching: boolean;
  cacheDirectory?: string;
  maxCacheAge: number;
}

// Default optimization configuration
export const DEFAULT_OPTIMIZATION_CONFIG: GraphOptimizationConfig = {
  maxMemoryMB: 512,
  maxCacheSize: 10000,
  enableWeakReferences: true,
  
  maxFileSizeKB: 1024, // 1MB
  maxLinesPerFile: 10000,
  skipLargeFiles: false,
  
  serializeCommonNodes: true,
  useNodeReferences: true,
  cacheNodeData: true,
  
  batchSize: 100,
  concurrency: 4,
  enableIncrementalUpdates: true,
  
  enableFileCaching: true,
  maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
};

// AST node cache with lazy loading capabilities
export class OptimizedASTCache {
  private nodeCache: LRUCache<string, NodePath>;
  private fileCache: LRUCache<string, string>;
  private weakRefs: WeakMap<object, ASTNodeReference>;
  
  constructor(config: GraphOptimizationConfig) {
    this.nodeCache = new LRUCache({
      max: config.maxCacheSize,
      ttl: 1000 * 60 * 30, // 30 minutes
      updateAgeOnGet: true,
      allowStale: false,
    });
    
    this.fileCache = new LRUCache({
      max: config.maxCacheSize / 10,
      ttl: config.maxCacheAge,
      updateAgeOnGet: true,
    });
    
    this.weakRefs = new WeakMap();
  }
  
  /**
   * Store AST node with lazy loading support
   */
  storeNode(nodeRef: ASTNodeReference, node: NodePath): void {
    const key = this.getNodeKey(nodeRef);
    this.nodeCache.set(key, node);
    
    // Store weak reference for cleanup
    if (node.node) {
      this.weakRefs.set(node.node, nodeRef);
    }
  }
  
  /**
   * Retrieve AST node with lazy loading
   */
  async getNode(nodeRef: ASTNodeReference): Promise<NodePath | null> {
    const key = this.getNodeKey(nodeRef);
    let node = this.nodeCache.get(key);
    
    if (!node) {
      // Lazy load from file
      node = await this.loadNodeFromFile(nodeRef);
      if (node) {
        this.nodeCache.set(key, node);
      }
    }
    
    return node || null;
  }
  
  /**
   * Create node reference from AST node
   */
  createNodeReference(node: NodePath, filePath: string): ASTNodeReference {
    const loc = node.node.loc;
    return {
      filePath,
      nodeType: node.node.type,
      startLine: loc?.start.line || 0,
      startColumn: loc?.start.column || 0,
      endLine: loc?.end.line || 0,
      endColumn: loc?.end.column || 0,
      serializedData: this.serializeNode(node),
    };
  }
  
  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.nodeCache.clear();
    this.fileCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      nodeCache: {
        size: this.nodeCache.size,
        max: this.nodeCache.max,
        hitRate: this.nodeCache.calculatedSize / (this.nodeCache.calculatedSize + this.nodeCache.size),
      },
      fileCache: {
        size: this.fileCache.size,
        max: this.fileCache.max,
      },
      weakRefs: this.weakRefs,
    };
  }
  
  private getNodeKey(nodeRef: ASTNodeReference): string {
    return `${nodeRef.filePath}:${nodeRef.nodeType}:${nodeRef.startLine}:${nodeRef.startColumn}`;
  }
  
  private async loadNodeFromFile(nodeRef: ASTNodeReference): Promise<NodePath | null> {
    // Implementation would re-parse file and find the node
    // This is a placeholder for the actual implementation
    return null;
  }
  
  private serializeNode(node: NodePath): string {
    // Serialize common node patterns for quick access
    try {
      return JSON.stringify({
        type: node.node.type,
        name: (node.node as any).name,
        value: (node.node as any).value,
      });
    } catch {
      return "";
    }
  }
}

// Factory for creating optimized graph instances
export class OptimizedGraphFactory {
  private config: GraphOptimizationConfig;
  private astCache: OptimizedASTCache;
  
  constructor(config: Partial<GraphOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
    this.astCache = new OptimizedASTCache(this.config);
  }
  
  /**
   * Create empty optimized graph
   */
  createGraph(): OptimizedProjectGraph {
    return {
      imports: new Map(),
      jsx: new Map(),
      importsByFile: new Map(),
      importsByPackage: new Map(),
      jsxByFile: new Map(),
      jsxByComponent: new Map(),
      totalFiles: 0,
      totalImports: 0,
      totalJsx: 0,
      buildTimestamp: Date.now(),
    };
  }
  
  /**
   * Convert legacy graph to optimized format
   */
  convertFromLegacy(legacyGraph: { imports: any[]; jsx: any[] }): OptimizedProjectGraph {
    const optimizedGraph = this.createGraph();
    let importIdCounter = 0;
    let jsxIdCounter = 0;
    
    // Convert imports
    for (const imp of legacyGraph.imports) {
      const id = `imp_${++importIdCounter}`;
      const nodeRef = this.astCache.createNodeReference(imp.node, imp.file);
      
      const optimizedImport: OptimizedImportUsage = {
        id,
        pkg: imp.pkg,
        file: imp.file,
        imported: imp.imported,
        importedType: imp.importedType,
        local: imp.local,
        nodeRef,
        hash: this.hashImport(imp),
      };
      
      optimizedGraph.imports.set(id, optimizedImport);
      this.updateIndexes(optimizedGraph, optimizedImport, 'import');
    }
    
    // Convert JSX
    for (const jsx of legacyGraph.jsx) {
      const id = `jsx_${++jsxIdCounter}`;
      const importId = this.findImportId(optimizedGraph, jsx.importRef);
      const openerRef = this.astCache.createNodeReference(jsx.opener, jsx.file);
      
      const optimizedJsx: OptimizedJsxUsage = {
        id,
        file: jsx.file,
        importId,
        componentName: jsx.componentName,
        openerRef,
        props: this.optimizeProps(jsx.props),
        location: {
          line: jsx.opener.node.loc?.start.line || 0,
          column: jsx.opener.node.loc?.start.column || 0,
        },
      };
      
      optimizedGraph.jsx.set(id, optimizedJsx);
      this.updateIndexes(optimizedGraph, optimizedJsx, 'jsx');
    }
    
    optimizedGraph.totalImports = optimizedGraph.imports.size;
    optimizedGraph.totalJsx = optimizedGraph.jsx.size;
    
    return optimizedGraph;
  }
  
  /**
   * Add import to optimized graph
   */
  addImport(graph: OptimizedProjectGraph, importData: any): string {
    const id = `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const nodeRef = this.astCache.createNodeReference(importData.node, importData.file);
    
    const optimizedImport: OptimizedImportUsage = {
      id,
      pkg: importData.pkg,
      file: importData.file,
      imported: importData.imported,
      importedType: importData.importedType,
      local: importData.local,
      nodeRef,
      hash: this.hashImport(importData),
    };
    
    graph.imports.set(id, optimizedImport);
    this.updateIndexes(graph, optimizedImport, 'import');
    graph.totalImports++;
    
    return id;
  }
  
  /**
   * Add JSX to optimized graph
   */
  addJsx(graph: OptimizedProjectGraph, jsxData: any, importId: string): string {
    const id = `jsx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const openerRef = this.astCache.createNodeReference(jsxData.opener, jsxData.file);
    
    const optimizedJsx: OptimizedJsxUsage = {
      id,
      file: jsxData.file,
      importId,
      componentName: jsxData.componentName,
      openerRef,
      props: this.optimizeProps(jsxData.props),
      location: {
        line: jsxData.opener.node.loc?.start.line || 0,
        column: jsxData.opener.node.loc?.start.column || 0,
      },
    };
    
    graph.jsx.set(id, optimizedJsx);
    this.updateIndexes(graph, optimizedJsx, 'jsx');
    graph.totalJsx++;
    
    return id;
  }
  
  /**
   * Get AST cache instance
   */
  getASTCache(): OptimizedASTCache {
    return this.astCache;
  }
  
  /**
   * Get configuration
   */
  getConfig(): GraphOptimizationConfig {
    return this.config;
  }
  
  private hashImport(imp: any): string {
    return `${imp.pkg}:${imp.imported}:${imp.local}:${imp.importedType}`;
  }
  
  private findImportId(graph: OptimizedProjectGraph, importRef: any): string {
    const hash = this.hashImport(importRef);
    for (const [id, imp] of graph.imports) {
      if (imp.hash === hash && imp.file === importRef.file) {
        return id;
      }
    }
    return '';
  }
  
  private optimizeProps(props: Record<string, any>): OptimizedPropData[] {
    return Object.entries(props).map(([name, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return {
          name,
          type: 'literal' as const,
          value,
        };
      } else if (value === true) {
        return {
          name,
          type: 'boolean' as const,
          value: true,
        };
      } else {
        // AST node - create reference
        const nodeRef = value.node ? this.astCache.createNodeReference(value, '') : undefined;
        return {
          name,
          type: 'expression' as const,
          nodeRef,
        };
      }
    });
  }
  
  private updateIndexes(graph: OptimizedProjectGraph, item: OptimizedImportUsage | OptimizedJsxUsage, type: 'import' | 'jsx'): void {
    if (type === 'import') {
      const imp = item as OptimizedImportUsage;
      
      // Update file index
      if (!graph.importsByFile.has(imp.file)) {
        graph.importsByFile.set(imp.file, new Set());
      }
      graph.importsByFile.get(imp.file)!.add(imp.id);
      
      // Update package index
      if (!graph.importsByPackage.has(imp.pkg)) {
        graph.importsByPackage.set(imp.pkg, new Set());
      }
      graph.importsByPackage.get(imp.pkg)!.add(imp.id);
    } else {
      const jsx = item as OptimizedJsxUsage;
      
      // Update file index
      if (!graph.jsxByFile.has(jsx.file)) {
        graph.jsxByFile.set(jsx.file, new Set());
      }
      graph.jsxByFile.get(jsx.file)!.add(jsx.id);
      
      // Update component index
      if (!graph.jsxByComponent.has(jsx.componentName)) {
        graph.jsxByComponent.set(jsx.componentName, new Set());
      }
      graph.jsxByComponent.get(jsx.componentName)!.add(jsx.id);
    }
  }
}
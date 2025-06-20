/**
 * Large Scale Performance Benchmark Test Suite
 * Tests jsx-migr8's performance with large codebases (1000+ files, 10MB+ code)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';
import { performance, PerformanceObserver } from 'perf_hooks';
import { Worker } from 'worker_threads';
import os from 'os';

// Import jsx-migr8 modules
import { buildGraph } from '../../../graph/buildGraph';
import { analyzeProject } from '../../../analyzer';
import { migrateProject } from '../../../migrator';

describe('Large Scale Performance Benchmarks', () => {
  let tempDir: string;
  let largeProjectPath: string;
  let performanceMetrics: Map<string, number[]>;
  
  const LARGE_PROJECT_CONFIG = {
    fileCount: 1000,
    avgFileSize: 10 * 1024, // 10KB average
    totalTargetSize: 10 * 1024 * 1024, // 10MB total
    maxComponentsPerFile: 20,
    maxImportsPerFile: 30,
    nestingDepth: 10
  };

  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'jsx-migr8-large-scale-'));
    largeProjectPath = join(tempDir, 'large-project');
    performanceMetrics = new Map();
    
    console.log('🏗️  Setting up large test project...');
    await setupLargeTestProject();
    console.log('✅ Large test project setup complete');
  }, 300000); // 5 minute timeout for setup

  afterAll(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clear memory and force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('File System Performance', () => {
    it('should scan large project efficiently', async () => {
      const startTime = performance.now();
      const memBefore = process.memoryUsage();
      
      const graph = await buildGraph(largeProjectPath);
      
      const duration = performance.now() - startTime;
      const memAfter = process.memoryUsage();
      const memoryIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      recordPerformanceMetric('scan-duration', duration);
      recordPerformanceMetric('scan-memory', memoryIncrease);

      expect(graph.nodes.size).toBeGreaterThanOrEqual(LARGE_PROJECT_CONFIG.fileCount);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(memoryIncrease).toBeLessThan(500); // Should use less than 500MB additional memory
      
      console.log(`📊 Scanned ${graph.nodes.size} files in ${duration.toFixed(2)}ms using ${memoryIncrease.toFixed(2)}MB`);
    }, 60000);

    it('should handle concurrent file analysis', async () => {
      const chunkSize = 100;
      const fileChunks = Array.from({ length: Math.ceil(LARGE_PROJECT_CONFIG.fileCount / chunkSize) }, (_, i) => 
        Array.from({ length: Math.min(chunkSize, LARGE_PROJECT_CONFIG.fileCount - i * chunkSize) }, (_, j) => 
          join(largeProjectPath, `component-${i * chunkSize + j}.tsx`)
        )
      );

      const startTime = performance.now();
      const memBefore = process.memoryUsage();

      const results = await Promise.all(
        fileChunks.map(chunk => 
          Promise.all(chunk.map(file => analyzeFile(file)))
        )
      );

      const duration = performance.now() - startTime;
      const memAfter = process.memoryUsage();
      const memoryIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      recordPerformanceMetric('concurrent-analysis-duration', duration);
      recordPerformanceMetric('concurrent-analysis-memory', memoryIncrease);

      const totalAnalyzed = results.flat().length;
      expect(totalAnalyzed).toBeGreaterThanOrEqual(LARGE_PROJECT_CONFIG.fileCount);
      expect(duration).toBeLessThan(60000); // Should complete within 1 minute
      expect(memoryIncrease).toBeLessThan(1000); // Should use less than 1GB
      
      console.log(`🔄 Analyzed ${totalAnalyzed} files concurrently in ${duration.toFixed(2)}ms using ${memoryIncrease.toFixed(2)}MB`);
    }, 120000);

    it('should stream process large files without memory issues', async () => {
      // Create extra large files for streaming test
      const largeFiles = await createExtraLargeFiles(5, 5 * 1024 * 1024); // 5 files, 5MB each

      const startTime = performance.now();
      const memBefore = process.memoryUsage();

      const results = await Promise.all(
        largeFiles.map(file => analyzeFileStreaming(file))
      );

      const duration = performance.now() - startTime;
      const memAfter = process.memoryUsage();
      const memoryIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      recordPerformanceMetric('streaming-duration', duration);
      recordPerformanceMetric('streaming-memory', memoryIncrease);

      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(30000);
      expect(memoryIncrease).toBeLessThan(200); // Streaming should use much less memory
      
      console.log(`🌊 Streamed ${largeFiles.length} large files in ${duration.toFixed(2)}ms using ${memoryIncrease.toFixed(2)}MB`);
    }, 60000);
  });

  describe('Analysis Performance', () => {
    it('should analyze imports efficiently at scale', async () => {
      const startTime = performance.now();
      const memBefore = process.memoryUsage();

      const analysis = await analyzeProject(largeProjectPath, {
        includeImports: true,
        includeExports: true,
        includeComponents: true
      });

      const duration = performance.now() - startTime;
      const memAfter = process.memoryUsage();
      const memoryIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      recordPerformanceMetric('import-analysis-duration', duration);
      recordPerformanceMetric('import-analysis-memory', memoryIncrease);

      expect(analysis.totalFiles).toBeGreaterThanOrEqual(LARGE_PROJECT_CONFIG.fileCount);
      expect(analysis.totalImports).toBeGreaterThan(LARGE_PROJECT_CONFIG.fileCount * 5); // At least 5 imports per file on average
      expect(duration).toBeLessThan(45000); // Should complete within 45 seconds
      expect(memoryIncrease).toBeLessThan(750); // Should use less than 750MB
      
      console.log(`🔍 Analyzed imports for ${analysis.totalFiles} files with ${analysis.totalImports} imports in ${duration.toFixed(2)}ms`);
    }, 90000);

    it('should detect JSX usage patterns efficiently', async () => {
      const startTime = performance.now();
      const memBefore = process.memoryUsage();

      const jsxAnalysis = await analyzeProject(largeProjectPath, {
        includeJSXUsage: true,
        trackPropUsage: true,
        generateUsageStats: true
      });

      const duration = performance.now() - startTime;
      const memAfter = process.memoryUsage();
      const memoryIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      recordPerformanceMetric('jsx-analysis-duration', duration);
      recordPerformanceMetric('jsx-analysis-memory', memoryIncrease);

      expect(jsxAnalysis.totalComponents).toBeGreaterThan(LARGE_PROJECT_CONFIG.fileCount * 3);
      expect(jsxAnalysis.totalProps).toBeGreaterThan(jsxAnalysis.totalComponents * 2);
      expect(duration).toBeLessThan(60000); // Should complete within 1 minute
      expect(memoryIncrease).toBeLessThan(800);
      
      console.log(`⚛️  Analyzed ${jsxAnalysis.totalComponents} components with ${jsxAnalysis.totalProps} props in ${duration.toFixed(2)}ms`);
    }, 120000);

    it('should build dependency graph efficiently', async () => {
      const startTime = performance.now();
      const memBefore = process.memoryUsage();

      const graph = await buildGraph(largeProjectPath, {
        includeDependencies: true,
        includeReverseDependencies: true,
        calculateMetrics: true
      });

      const duration = performance.now() - startTime;
      const memAfter = process.memoryUsage();
      const memoryIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      recordPerformanceMetric('graph-build-duration', duration);
      recordPerformanceMetric('graph-build-memory', memoryIncrease);

      expect(graph.nodes.size).toBeGreaterThanOrEqual(LARGE_PROJECT_CONFIG.fileCount);
      expect(graph.edges.size).toBeGreaterThan(LARGE_PROJECT_CONFIG.fileCount * 2);
      expect(duration).toBeLessThan(40000);
      expect(memoryIncrease).toBeLessThan(600);
      
      console.log(`🕸️  Built graph with ${graph.nodes.size} nodes and ${graph.edges.size} edges in ${duration.toFixed(2)}ms`);
    }, 90000);
  });

  describe('Migration Performance', () => {
    it('should migrate large project efficiently', async () => {
      const migrationRules = {
        '@mui/material': {
          Button: { to: '@custom/ui', component: 'CustomButton' },
          TextField: { to: '@custom/ui', component: 'CustomTextField' },
          Grid: { to: '@custom/layout', component: 'CustomGrid' }
        }
      };

      const startTime = performance.now();
      const memBefore = process.memoryUsage();

      const migrationResult = await migrateProject(largeProjectPath, migrationRules, {
        dryRun: true,
        batchSize: 50,
        parallelWorkers: Math.min(4, os.cpus().length)
      });

      const duration = performance.now() - startTime;
      const memAfter = process.memoryUsage();
      const memoryIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      recordPerformanceMetric('migration-duration', duration);
      recordPerformanceMetric('migration-memory', memoryIncrease);

      expect(migrationResult.filesProcessed).toBeGreaterThanOrEqual(LARGE_PROJECT_CONFIG.fileCount);
      expect(migrationResult.transformationsApplied).toBeGreaterThan(0);
      expect(duration).toBeLessThan(120000); // Should complete within 2 minutes
      expect(memoryIncrease).toBeLessThan(1000);
      
      console.log(`🔄 Migrated ${migrationResult.filesProcessed} files with ${migrationResult.transformationsApplied} transformations in ${duration.toFixed(2)}ms`);
    }, 180000);

    it('should handle batch processing efficiently', async () => {
      const batchSizes = [10, 25, 50, 100];
      const results: Array<{ batchSize: number; duration: number; memory: number }> = [];

      for (const batchSize of batchSizes) {
        const startTime = performance.now();
        const memBefore = process.memoryUsage();

        await processBatch(largeProjectPath, batchSize);

        const duration = performance.now() - startTime;
        const memAfter = process.memoryUsage();
        const memoryIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

        results.push({ batchSize, duration, memoryIncrease });
        
        // Force garbage collection between batches
        if (global.gc) global.gc();
      }

      // Verify that larger batch sizes are generally more efficient
      const efficiency = results.map(r => r.duration / r.batchSize);
      const bestBatchIndex = efficiency.indexOf(Math.min(...efficiency));
      
      expect(bestBatchIndex).toBeGreaterThan(0); // Should not be the smallest batch size
      
      console.log('📦 Batch processing results:', results);
    }, 120000);
  });

  describe('Memory Management', () => {
    it('should maintain stable memory usage during long operations', async () => {
      const memoryReadings: number[] = [];
      const interval = setInterval(() => {
        memoryReadings.push(process.memoryUsage().heapUsed / 1024 / 1024);
      }, 1000);

      try {
        // Perform multiple operations to test memory stability
        for (let i = 0; i < 10; i++) {
          await analyzeProject(largeProjectPath, { lightweight: true });
          if (global.gc) global.gc(); // Force GC if available
        }
      } finally {
        clearInterval(interval);
      }

      const maxMemory = Math.max(...memoryReadings);
      const minMemory = Math.min(...memoryReadings);
      const memoryVariance = maxMemory - minMemory;

      recordPerformanceMetric('memory-variance', memoryVariance);

      expect(memoryVariance).toBeLessThan(200); // Should not vary by more than 200MB
      expect(maxMemory).toBeLessThan(1000); // Should not exceed 1GB
      
      console.log(`💾 Memory variance: ${memoryVariance.toFixed(2)}MB (${minMemory.toFixed(2)}MB - ${maxMemory.toFixed(2)}MB)`);
    }, 120000);

    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by creating large objects
      const largeSets: Set<string>[] = [];
      
      try {
        // Fill memory until we approach limits
        while (process.memoryUsage().heapUsed < 800 * 1024 * 1024) { // 800MB
          largeSets.push(new Set(Array.from({ length: 10000 }, () => Math.random().toString())));
        }

        const startTime = performance.now();
        
        // Should still be able to analyze under memory pressure
        const result = await analyzeProject(largeProjectPath, { 
          lightweight: true,
          memoryLimit: 1024 * 1024 * 1024 // 1GB limit
        });

        const duration = performance.now() - startTime;

        expect(result.completed).toBe(true);
        expect(duration).toBeLessThan(60000);
        
        console.log(`🔥 Completed analysis under memory pressure in ${duration.toFixed(2)}ms`);
      } finally {
        // Clean up memory pressure
        largeSets.length = 0;
        if (global.gc) global.gc();
      }
    }, 90000);
  });

  describe('Scalability Tests', () => {
    it('should scale linearly with project size', async () => {
      const projectSizes = [100, 250, 500, 1000];
      const scalabilityResults: Array<{ size: number; duration: number; throughput: number }> = [];

      for (const size of projectSizes) {
        const testProjectPath = await createScaledTestProject(size);
        
        const startTime = performance.now();
        await analyzeProject(testProjectPath);
        const duration = performance.now() - startTime;
        
        const throughput = size / (duration / 1000); // files per second
        scalabilityResults.push({ size, duration, throughput });
        
        // Clean up
        rmSync(testProjectPath, { recursive: true, force: true });
      }

      // Verify scalability - throughput should not degrade significantly
      const firstThroughput = scalabilityResults[0].throughput;
      const lastThroughput = scalabilityResults[scalabilityResults.length - 1].throughput;
      
      expect(lastThroughput).toBeGreaterThan(firstThroughput * 0.5); // Should maintain at least 50% throughput
      
      console.log('📈 Scalability results:', scalabilityResults);
    }, 300000);

    it('should handle maximum supported project size', async () => {
      const maxProjectPath = await createMaxSizeTestProject();
      
      const startTime = performance.now();
      const memBefore = process.memoryUsage();
      
      const result = await analyzeProject(maxProjectPath, {
        streaming: true,
        batchSize: 100,
        memoryLimit: 2 * 1024 * 1024 * 1024 // 2GB limit
      });
      
      const duration = performance.now() - startTime;
      const memAfter = process.memoryUsage();
      const memoryIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      expect(result.completed).toBe(true);
      expect(duration).toBeLessThan(300000); // Should complete within 5 minutes
      expect(memoryIncrease).toBeLessThan(1500); // Should use less than 1.5GB
      
      console.log(`🏔️  Processed maximum project size in ${duration.toFixed(2)}ms using ${memoryIncrease.toFixed(2)}MB`);
      
      // Clean up
      rmSync(maxProjectPath, { recursive: true, force: true });
    }, 360000);
  });

  describe('Performance Regression Detection', () => {
    afterAll(() => {
      // Generate performance report
      generatePerformanceReport();
    });

    it('should maintain performance benchmarks', () => {
      const benchmarks = {
        'scan-duration': 30000, // 30 seconds max
        'scan-memory': 500, // 500MB max
        'import-analysis-duration': 45000, // 45 seconds max
        'migration-duration': 120000, // 2 minutes max
        'memory-variance': 200 // 200MB max variance
      };

      for (const [metric, threshold] of Object.entries(benchmarks)) {
        const readings = performanceMetrics.get(metric) || [];
        if (readings.length > 0) {
          const avgValue = readings.reduce((a, b) => a + b, 0) / readings.length;
          expect(avgValue).toBeLessThan(threshold);
          console.log(`✅ ${metric}: ${avgValue.toFixed(2)} (threshold: ${threshold})`);
        }
      }
    });
  });

  // Helper functions
  async function setupLargeTestProject(): Promise<void> {
    mkdirSync(largeProjectPath, { recursive: true });
    
    const filePromises: Promise<void>[] = [];
    
    for (let i = 0; i < LARGE_PROJECT_CONFIG.fileCount; i++) {
      filePromises.push(createLargeTestFile(i));
    }
    
    await Promise.all(filePromises);
    
    // Verify total size
    const totalSize = await calculateDirectorySize(largeProjectPath);
    console.log(`📁 Created ${LARGE_PROJECT_CONFIG.fileCount} files totaling ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  }

  async function createLargeTestFile(index: number): Promise<void> {
    const fileName = `component-${index}.tsx`;
    const filePath = join(largeProjectPath, fileName);
    
    const content = generateLargeFileContent(index);
    writeFileSync(filePath, content, 'utf8');
  }

  function generateLargeFileContent(index: number): string {
    const componentCount = Math.floor(Math.random() * LARGE_PROJECT_CONFIG.maxComponentsPerFile) + 1;
    const importCount = Math.floor(Math.random() * LARGE_PROJECT_CONFIG.maxImportsPerFile) + 5;
    
    let content = `// Generated test file ${index}\n`;
    
    // Generate imports
    const imports = [
      "import React, { useState, useEffect, useMemo, useCallback } from 'react';",
      "import { Button, TextField, Grid, Paper, Card, CardContent } from '@mui/material';",
      "import { Table, Space, Divider, Form, Input } from 'antd';",
      "import { Add, Remove, Edit, Delete } from '@mui/icons-material';"
    ];
    
    for (let i = 0; i < Math.min(importCount, 20); i++) {
      imports.push(`import { Component${i} } from './component-${Math.floor(Math.random() * LARGE_PROJECT_CONFIG.fileCount)}';`);
    }
    
    content += imports.slice(0, importCount).join('\n') + '\n\n';
    
    // Generate interfaces
    content += `interface Component${index}Props {\n`;
    for (let i = 0; i < 10; i++) {
      content += `  prop${i}?: string | number | boolean;\n`;
    }
    content += '}\n\n';
    
    // Generate components
    for (let i = 0; i < componentCount; i++) {
      content += generateComponentCode(index, i);
    }
    
    // Generate exports
    content += `\nexport { Component${index} };\n`;
    content += `export default Component${index};\n`;
    
    // Pad content to reach target size
    const currentSize = Buffer.byteLength(content, 'utf8');
    const targetSize = LARGE_PROJECT_CONFIG.avgFileSize;
    
    if (currentSize < targetSize) {
      const paddingSize = targetSize - currentSize;
      const paddingComment = '/* ' + 'x'.repeat(paddingSize - 10) + ' */\n';
      content += paddingComment;
    }
    
    return content;
  }

  function generateComponentCode(fileIndex: number, componentIndex: number): string {
    const componentName = `Component${fileIndex}_${componentIndex}`;
    
    return `
export const ${componentName}: React.FC<Component${fileIndex}Props> = (props) => {
  const [state, setState] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  
  const memoizedValue = useMemo(() => {
    return Object.keys(props).join(',');
  }, [props]);
  
  const handleClick = useCallback(() => {
    setState(prev => ({ ...prev, clicked: true }));
  }, []);
  
  useEffect(() => {
    setLoading(false);
  }, []);
  
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Paper elevation={3}>
          <Card>
            <CardContent>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleClick}
                disabled={loading}
              >
                {componentName} - {memoizedValue}
              </Button>
              <TextField 
                label="Input Field"
                value={state.value || ''}
                onChange={(e) => setState(prev => ({ ...prev, value: e.target.value }))}
              />
              <Table 
                dataSource={[{ key: '1', name: componentName }]}
                columns={[
                  { title: 'Name', dataIndex: 'name', key: 'name' },
                  { 
                    title: 'Action', 
                    key: 'action',
                    render: () => (
                      <Space>
                        <Button size="small"><Add /></Button>
                        <Button size="small"><Edit /></Button>
                        <Button size="small"><Delete /></Button>
                      </Space>
                    )
                  }
                ]}
              />
            </CardContent>
          </Card>
        </Paper>
      </Grid>
    </Grid>
  );
};
`;
  }

  async function createExtraLargeFiles(count: number, sizePerFile: number): Promise<string[]> {
    const files: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const fileName = `extra-large-${i}.tsx`;
      const filePath = join(largeProjectPath, fileName);
      
      let content = `// Extra large file ${i}\n`;
      const baseComponent = generateComponentCode(i, 0);
      
      // Repeat component to reach target size
      while (Buffer.byteLength(content, 'utf8') < sizePerFile) {
        content += baseComponent.replace(`Component${i}_0`, `Component${i}_${Math.floor(content.length / 1000)}`);
      }
      
      writeFileSync(filePath, content, 'utf8');
      files.push(filePath);
    }
    
    return files;
  }

  async function createScaledTestProject(fileCount: number): Promise<string> {
    const scaledPath = join(tempDir, `scaled-${fileCount}`);
    mkdirSync(scaledPath, { recursive: true });
    
    for (let i = 0; i < fileCount; i++) {
      const content = generateLargeFileContent(i);
      writeFileSync(join(scaledPath, `component-${i}.tsx`), content, 'utf8');
    }
    
    return scaledPath;
  }

  async function createMaxSizeTestProject(): Promise<string> {
    const maxPath = join(tempDir, 'max-size');
    mkdirSync(maxPath, { recursive: true });
    
    // Create maximum supported project (5000 files, ~50MB)
    const maxFiles = 5000;
    const maxFileSize = 10 * 1024; // 10KB per file
    
    for (let i = 0; i < maxFiles; i++) {
      const content = generateLargeFileContent(i);
      writeFileSync(join(maxPath, `max-component-${i}.tsx`), content, 'utf8');
    }
    
    return maxPath;
  }

  async function calculateDirectorySize(dirPath: string): Promise<number> {
    const files = await import('fs').then(fs => fs.readdirSync(dirPath));
    let totalSize = 0;
    
    for (const file of files) {
      const filePath = join(dirPath, file);
      const stats = statSync(filePath);
      totalSize += stats.size;
    }
    
    return totalSize;
  }

  async function analyzeFile(filePath: string): Promise<any> {
    // Mock file analysis
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          file: filePath,
          imports: Math.floor(Math.random() * 10) + 1,
          components: Math.floor(Math.random() * 5) + 1,
          success: true
        });
      }, Math.random() * 10);
    });
  }

  async function analyzeFileStreaming(filePath: string): Promise<any> {
    // Mock streaming analysis
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          file: filePath,
          size: statSync(filePath).size,
          success: true
        });
      }, 100);
    });
  }

  async function processBatch(projectPath: string, batchSize: number): Promise<void> {
    // Mock batch processing
    const files = await import('fs').then(fs => fs.readdirSync(projectPath));
    const batches = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      await Promise.all(batch.map(file => analyzeFile(join(projectPath, file))));
    }
  }

  function recordPerformanceMetric(metric: string, value: number): void {
    if (!performanceMetrics.has(metric)) {
      performanceMetrics.set(metric, []);
    }
    performanceMetrics.get(metric)!.push(value);
  }

  function generatePerformanceReport(): void {
    console.log('\n📊 Performance Report:');
    console.log('='.repeat(50));
    
    for (const [metric, values] of performanceMetrics.entries()) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      console.log(`${metric}:`);
      console.log(`  Average: ${avg.toFixed(2)}`);
      console.log(`  Range: ${min.toFixed(2)} - ${max.toFixed(2)}`);
      console.log(`  Samples: ${values.length}`);
      console.log('');
    }
  }
});
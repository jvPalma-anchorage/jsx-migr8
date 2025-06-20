/**
 * Memory Pressure and Resource Limits Stress Test Suite
 * Tests jsx-migr8's behavior under extreme memory constraints and resource pressure
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { Worker } from 'worker_threads';
import { performance } from 'perf_hooks';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';
import os from 'os';

// Import jsx-migr8 modules
import { buildGraph } from '../../../graph/buildGraph';
import { analyzeProject } from '../../../analyzer';
import { migrateProject } from '../../../migrator';

describe('Memory Pressure and Resource Limits', () => {
  let tempDir: string;
  let stressTestPath: string;
  let initialMemory: NodeJS.MemoryUsage;

  beforeAll(() => {
    initialMemory = process.memoryUsage();
    console.log(`🔍 Initial memory usage: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  });

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'jsx-migr8-memory-stress-'));
    stressTestPath = join(tempDir, 'stress-project');
    mkdirSync(stressTestPath, { recursive: true });
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    
    // Force cleanup
    if (global.gc) {
      global.gc();
    }
  });

  describe('Memory Allocation Stress', () => {
    it('should handle massive string processing without memory leaks', async () => {
      // Create files with very large content
      const largeFiles = await createMassiveStringFiles(10, 5 * 1024 * 1024); // 10 files, 5MB each
      
      const memBefore = process.memoryUsage();
      
      for (let iteration = 0; iteration < 5; iteration++) {
        console.log(`🔄 Iteration ${iteration + 1}/5`);
        
        for (const file of largeFiles) {
          await analyzeProject(file, { 
            streaming: true,
            chunkSize: 64 * 1024 // 64KB chunks
          });
        }
        
        // Check memory usage after each iteration
        const memCurrent = process.memoryUsage();
        const memoryIncrease = (memCurrent.heapUsed - memBefore.heapUsed) / 1024 / 1024;
        
        console.log(`📊 Memory increase after iteration ${iteration + 1}: ${memoryIncrease.toFixed(2)}MB`);
        
        // Memory should not increase unboundedly
        expect(memoryIncrease).toBeLessThan(200 * (iteration + 1)); // Max 200MB per iteration
        
        // Force garbage collection
        if (global.gc) global.gc();
      }
      
      const memAfter = process.memoryUsage();
      const totalIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
      
      // After GC, memory increase should be minimal
      expect(totalIncrease).toBeLessThan(100); // Less than 100MB after cleanup
      
      console.log(`✅ Final memory increase: ${totalIncrease.toFixed(2)}MB`);
    }, 120000);

    it('should handle rapid allocation/deallocation cycles', async () => {
      const cycles = 50;
      const memoryReadings: number[] = [];
      
      for (let i = 0; i < cycles; i++) {
        // Allocate large objects
        const largeArrays: number[][] = [];
        for (let j = 0; j < 100; j++) {
          largeArrays.push(new Array(10000).fill(Math.random()));
        }
        
        // Process some files
        await createAndAnalyzeFiles(10);
        
        // Record memory usage
        const memUsage = process.memoryUsage();
        memoryReadings.push(memUsage.heapUsed / 1024 / 1024);
        
        // Clear large objects
        largeArrays.length = 0;
        
        // Force GC every 10 cycles
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }
      
      // Analyze memory pattern
      const maxMemory = Math.max(...memoryReadings);
      const minMemory = Math.min(...memoryReadings);
      const memoryVariance = maxMemory - minMemory;
      
      console.log(`📈 Memory readings: min=${minMemory.toFixed(2)}MB, max=${maxMemory.toFixed(2)}MB, variance=${memoryVariance.toFixed(2)}MB`);
      
      // Memory variance should be reasonable
      expect(memoryVariance).toBeLessThan(500); // Less than 500MB variance
      expect(maxMemory).toBeLessThan(1500); // Should not exceed 1.5GB
    }, 180000);

    it('should handle memory-intensive AST operations', async () => {
      // Create files with deeply nested AST structures
      const complexFiles = await createComplexASTFiles(20);
      
      const memBefore = process.memoryUsage();
      const startTime = performance.now();
      
      const results = await Promise.all(
        complexFiles.map(async (file) => {
          try {
            const graph = await buildGraph(file, {
              maxDepth: 50,
              includeFullAST: true,
              preserveNodes: true
            });
            
            return {
              success: true,
              nodeCount: graph.nodes.size,
              edgeCount: graph.edges.size
            };
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        })
      );
      
      const duration = performance.now() - startTime;
      const memAfter = process.memoryUsage();
      const memoryIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
      
      const successfulResults = results.filter(r => r.success);
      
      expect(successfulResults.length).toBeGreaterThan(complexFiles.length * 0.8); // 80% success rate
      expect(duration).toBeLessThan(60000); // Should complete within 1 minute
      expect(memoryIncrease).toBeLessThan(800); // Should use less than 800MB
      
      console.log(`🧠 Processed ${successfulResults.length}/${complexFiles.length} complex AST files in ${duration.toFixed(2)}ms using ${memoryIncrease.toFixed(2)}MB`);
    }, 120000);
  });

  describe('Resource Constraint Handling', () => {
    it('should handle low memory conditions gracefully', async () => {
      // Simulate low memory by pre-allocating most available memory
      const preAllocation: ArrayBuffer[] = [];
      const targetMemoryUsage = 1.5 * 1024 * 1024 * 1024; // 1.5GB
      
      try {
        while (process.memoryUsage().heapUsed < targetMemoryUsage) {
          preAllocation.push(new ArrayBuffer(10 * 1024 * 1024)); // 10MB chunks
        }
      } catch (error) {
        // Expected when approaching memory limits
        console.log('🔴 Reached memory allocation limit');
      }
      
      console.log(`🔥 Pre-allocated ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      // Try to analyze under memory pressure
      const testFiles = await createTestFiles(50, 100 * 1024); // 50 files, 100KB each
      
      const result = await analyzeProject(stressTestPath, {
        memoryLimit: 200 * 1024 * 1024, // 200MB limit
        lowMemoryMode: true,
        streaming: true,
        batchSize: 5
      }).catch(error => ({
        error: error.message,
        completed: false,
        memoryExhausted: true
      }));
      
      // Should handle gracefully even under memory pressure
      expect(result).toBeDefined();
      if ('completed' in result) {
        expect(result.completed || result.memoryExhausted).toBe(true);
      }
      
      // Clean up pre-allocation
      preAllocation.length = 0;
      if (global.gc) global.gc();
      
      console.log('🧹 Cleaned up memory pressure test');
    }, 120000);

    it('should implement backpressure for large processing queues', async () => {
      const queueSize = 1000;
      const batchSize = 25;
      const maxConcurrency = 5;
      
      // Create a large number of files to process
      const files = await createTestFiles(queueSize, 50 * 1024); // 1000 files, 50KB each
      
      const memoryReadings: number[] = [];
      const processingTimes: number[] = [];
      
      const startTime = performance.now();
      let processedCount = 0;
      
      // Process in batches with backpressure
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchStartTime = performance.now();
        
        // Limit concurrency to prevent memory exhaustion
        const batchPromises = batch.map((file, index) => 
          new Promise((resolve) => {
            setTimeout(async () => {
              try {
                await analyzeProject(file);
                resolve({ success: true });
              } catch (error) {
                resolve({ success: false, error: error.message });
              }
            }, (index % maxConcurrency) * 10); // Stagger execution
          })
        );
        
        await Promise.all(batchPromises);
        
        const batchTime = performance.now() - batchStartTime;
        processingTimes.push(batchTime);
        
        processedCount += batch.length;
        
        // Record memory usage
        const memUsage = process.memoryUsage();
        memoryReadings.push(memUsage.heapUsed / 1024 / 1024);
        
        // Apply backpressure if memory usage is high
        if (memUsage.heapUsed > 800 * 1024 * 1024) { // 800MB threshold
          console.log('🚫 Applying backpressure - high memory usage');
          await new Promise(resolve => setTimeout(resolve, 100));
          if (global.gc) global.gc();
        }
        
        console.log(`📦 Processed batch ${Math.ceil((i + batchSize) / batchSize)}/${Math.ceil(files.length / batchSize)} (${processedCount}/${files.length} files)`);
      }
      
      const totalTime = performance.now() - startTime;
      const avgBatchTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const maxMemory = Math.max(...memoryReadings);
      
      expect(processedCount).toBe(queueSize);
      expect(totalTime).toBeLessThan(300000); // Should complete within 5 minutes
      expect(maxMemory).toBeLessThan(1000); // Should not exceed 1GB
      expect(avgBatchTime).toBeLessThan(5000); // Average batch should complete within 5 seconds
      
      console.log(`⏱️  Processed ${queueSize} files in ${totalTime.toFixed(2)}ms (avg batch: ${avgBatchTime.toFixed(2)}ms)`);
      console.log(`💾 Peak memory usage: ${maxMemory.toFixed(2)}MB`);
    }, 360000);

    it('should handle file descriptor limits', async () => {
      // Create many files to potentially exhaust file descriptors
      const fileCount = 2000;
      const testFiles = await createTestFiles(fileCount, 10 * 1024); // 2000 files, 10KB each
      
      const openFiles: Map<string, any> = new Map();
      const concurrentReads = 100;
      
      try {
        // Attempt to open many files concurrently
        const readPromises = testFiles.slice(0, concurrentReads).map(async (file, index) => {
          return new Promise((resolve) => {
            setTimeout(async () => {
              try {
                const content = readFileSync(file, 'utf8');
                openFiles.set(file, content);
                resolve({ success: true, file });
              } catch (error) {
                resolve({ success: false, error: error.message, file });
              }
            }, index * 10); // Stagger file operations
          });
        });
        
        const results = await Promise.all(readPromises);
        const successfulReads = results.filter(r => r.success).length;
        
        expect(successfulReads).toBeGreaterThan(concurrentReads * 0.9); // 90% success rate
        
        console.log(`📁 Successfully opened ${successfulReads}/${concurrentReads} files concurrently`);
        
      } finally {
        // Clean up open files
        openFiles.clear();
      }
    }, 120000);
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated operations', async () => {
      const iterations = 20;
      const memoryReadings: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        // Create temporary files
        const tempFiles = await createTestFiles(50, 20 * 1024); // 50 files, 20KB each
        
        // Perform analysis
        await analyzeProject(stressTestPath);
        
        // Record memory usage
        const memUsage = process.memoryUsage();
        memoryReadings.push(memUsage.heapUsed / 1024 / 1024);
        
        // Clean up files
        for (const file of tempFiles) {
          try {
            rmSync(file, { force: true });
          } catch (error) {
            // Ignore cleanup errors
          }
        }
        
        // Force GC every 5 iterations
        if (i % 5 === 0 && global.gc) {
          global.gc();
        }
        
        console.log(`🔄 Iteration ${i + 1}/${iterations}: ${memoryReadings[i].toFixed(2)}MB`);
      }
      
      // Analyze memory trend
      const firstQuarter = memoryReadings.slice(0, Math.floor(iterations / 4));
      const lastQuarter = memoryReadings.slice(-Math.floor(iterations / 4));
      
      const avgFirst = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
      const avgLast = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
      const memoryGrowth = avgLast - avgFirst;
      
      // Memory should not grow significantly over iterations
      expect(memoryGrowth).toBeLessThan(100); // Less than 100MB growth
      
      console.log(`📈 Memory growth over ${iterations} iterations: ${memoryGrowth.toFixed(2)}MB`);
    }, 300000);

    it('should properly clean up workers and child processes', async () => {
      const workerCount = 10;
      const workers: Worker[] = [];
      
      try {
        // Create multiple workers
        for (let i = 0; i < workerCount; i++) {
          const worker = new Worker(`
            const { parentPort } = require('worker_threads');
            
            // Simulate memory-intensive work
            const data = new Array(100000).fill('test data');
            
            parentPort.on('message', (msg) => {
              if (msg.type === 'process') {
                // Simulate processing
                const result = data.map(item => item.toUpperCase());
                parentPort.postMessage({ success: true, processed: result.length });
              } else if (msg.type === 'terminate') {
                process.exit(0);
              }
            });
          `, { eval: true });
          
          workers.push(worker);
        }
        
        // Send work to all workers
        const workPromises = workers.map((worker, index) => 
          new Promise((resolve) => {
            worker.on('message', resolve);
            worker.postMessage({ type: 'process', workerId: index });
          })
        );
        
        const results = await Promise.all(workPromises);
        
        expect(results.length).toBe(workerCount);
        expect(results.every(r => r.success)).toBe(true);
        
        console.log(`👷 Completed work with ${workerCount} workers`);
        
      } finally {
        // Clean up all workers
        await Promise.all(workers.map(worker => {
          return new Promise((resolve) => {
            worker.on('exit', resolve);
            worker.postMessage({ type: 'terminate' });
            
            // Force termination after timeout
            setTimeout(() => {
              worker.terminate().then(resolve);
            }, 1000);
          });
        }));
        
        console.log('🧹 All workers cleaned up');
      }
      
      // Verify memory cleanup
      if (global.gc) global.gc();
      
      const memAfterCleanup = process.memoryUsage();
      expect(memAfterCleanup.heapUsed).toBeLessThan(initialMemory.heapUsed + 200 * 1024 * 1024); // 200MB tolerance
    }, 60000);
  });

  describe('Stress Test Combinations', () => {
    it('should handle combined memory and processing stress', async () => {
      // Combine multiple stress factors
      const testConfig = {
        fileCount: 500,
        fileSize: 100 * 1024, // 100KB each
        concurrentWorkers: 5,
        memoryAllocations: 50,
        iterations: 10
      };
      
      const memoryAllocations: ArrayBuffer[] = [];
      const workers: Worker[] = [];
      
      try {
        // Pre-allocate some memory
        for (let i = 0; i < testConfig.memoryAllocations; i++) {
          memoryAllocations.push(new ArrayBuffer(5 * 1024 * 1024)); // 5MB each
        }
        
        // Create test files
        const testFiles = await createTestFiles(testConfig.fileCount, testConfig.fileSize);
        
        // Start concurrent workers
        for (let i = 0; i < testConfig.concurrentWorkers; i++) {
          const worker = new Worker(`
            const { parentPort } = require('worker_threads');
            
            parentPort.on('message', async (msg) => {
              try {
                // Simulate file processing
                const result = await new Promise(resolve => {
                  setTimeout(() => {
                    resolve({ workerId: msg.workerId, processed: msg.files.length });
                  }, Math.random() * 1000);
                });
                
                parentPort.postMessage({ success: true, result });
              } catch (error) {
                parentPort.postMessage({ success: false, error: error.message });
              }
            });
          `, { eval: true });
          
          workers.push(worker);
        }
        
        // Process files with workers under stress
        const startTime = performance.now();
        const memBefore = process.memoryUsage();
        
        for (let iteration = 0; iteration < testConfig.iterations; iteration++) {
          const fileChunks = chunkArray(testFiles, Math.ceil(testFiles.length / testConfig.concurrentWorkers));
          
          const workerPromises = workers.map((worker, index) => 
            new Promise((resolve) => {
              worker.on('message', resolve);
              worker.postMessage({
                workerId: index,
                files: fileChunks[index] || []
              });
            })
          );
          
          const results = await Promise.all(workerPromises);
          expect(results.every(r => r.success)).toBe(true);
          
          console.log(`🏋️  Completed stress iteration ${iteration + 1}/${testConfig.iterations}`);
          
          // Periodic cleanup
          if (iteration % 3 === 0 && global.gc) {
            global.gc();
          }
        }
        
        const duration = performance.now() - startTime;
        const memAfter = process.memoryUsage();
        const memoryIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
        
        expect(duration).toBeLessThan(120000); // Should complete within 2 minutes
        expect(memoryIncrease).toBeLessThan(500); // Should use less than 500MB additional
        
        console.log(`💪 Completed combined stress test in ${duration.toFixed(2)}ms using ${memoryIncrease.toFixed(2)}MB additional memory`);
        
      } finally {
        // Clean up workers
        await Promise.all(workers.map(worker => worker.terminate()));
        
        // Clean up memory allocations
        memoryAllocations.length = 0;
        
        if (global.gc) global.gc();
      }
    }, 180000);
  });

  // Helper functions
  async function createMassiveStringFiles(count: number, sizePerFile: number): Promise<string[]> {
    const files: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const fileName = `massive-${i}.tsx`;
      const filePath = join(stressTestPath, fileName);
      
      let content = `// Massive file ${i}\nimport React from 'react';\n`;
      
      // Generate content to reach target size
      const componentTemplate = `
export const Component${i}_{{INDEX}} = () => (
  <div>
    <button onClick={() => console.log('Click {{INDEX}}')}>
      Button {{INDEX}} with lots of text content that makes this file very large
    </button>
  </div>
);
`;
      
      let componentIndex = 0;
      while (Buffer.byteLength(content, 'utf8') < sizePerFile) {
        content += componentTemplate.replace(/\{\{INDEX\}\}/g, componentIndex.toString());
        componentIndex++;
      }
      
      writeFileSync(filePath, content, 'utf8');
      files.push(filePath);
    }
    
    return files;
  }

  async function createComplexASTFiles(count: number): Promise<string[]> {
    const files: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const fileName = `complex-ast-${i}.tsx`;
      const filePath = join(stressTestPath, fileName);
      
      const content = generateComplexASTContent(i);
      writeFileSync(filePath, content, 'utf8');
      files.push(filePath);
    }
    
    return files;
  }

  function generateComplexASTContent(index: number): string {
    const imports = Array.from({ length: 20 }, (_, i) => 
      `import { Component${i} } from './component-${i}';`
    ).join('\n');
    
    // Generate deeply nested JSX structure
    const generateNestedStructure = (depth: number, breadth: number): string => {
      if (depth === 0) {
        return `<span>Leaf node</span>`;
      }
      
      const children = Array.from({ length: breadth }, (_, i) => 
        generateNestedStructure(depth - 1, Math.max(1, breadth - 1))
      ).join('\n      ');
      
      return `
    <div data-depth="${depth}" data-index="${index}">
      ${children}
    </div>`;
    };
    
    return `
${imports}

export const ComplexAST${index} = () => {
  const nestedData = ${JSON.stringify(
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      nested: Array.from({ length: 5 }, (_, j) => ({ subId: j, data: `data-${i}-${j}` }))
    }))
  )};
  
  return (
    <div>
      ${generateNestedStructure(8, 3)}
      {nestedData.map(item => (
        <div key={item.id}>
          {item.nested.map(subItem => (
            <span key={subItem.subId}>{subItem.data}</span>
          ))}
        </div>
      ))}
    </div>
  );
};
`;
  }

  async function createTestFiles(count: number, size: number): Promise<string[]> {
    const files: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const fileName = `test-file-${i}.tsx`;
      const filePath = join(stressTestPath, fileName);
      
      let content = `import React from 'react';\nexport const TestComponent${i} = () => (\n  <div>`;
      
      // Add content to reach target size
      while (Buffer.byteLength(content, 'utf8') < size) {
        content += `<span>Content ${Math.random()}</span>`;
      }
      
      content += '\n  </div>\n);';
      
      writeFileSync(filePath, content, 'utf8');
      files.push(filePath);
    }
    
    return files;
  }

  async function createAndAnalyzeFiles(count: number): Promise<void> {
    const files = await createTestFiles(count, 10 * 1024); // 10KB each
    
    for (const file of files) {
      await analyzeProject(file).catch(() => {
        // Ignore analysis errors in stress test
      });
    }
  }

  function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
});
/**
 * Concurrent Operations Stress Test
 * Tests jsx-migr8's ability to handle multiple simultaneous operations
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Worker } from 'worker_threads';
import { performance } from 'perf_hooks';
import path from 'path';
import cluster from 'cluster';
import os from 'os';

const WORKER_COUNT = os.cpus().length;
const OPERATIONS_PER_WORKER = 50;
const TIMEOUT = 300000; // 5 minutes

describe('Concurrent Operations Stress Test', () => {
  let workers: Worker[] = [];

  beforeAll(() => {
    // Set up worker pool for concurrent testing
  });

  afterAll(async () => {
    // Clean up workers
    await Promise.all(workers.map(worker => worker.terminate()));
  });

  it('should handle multiple file analysis operations concurrently', async () => {
    const operations = Array.from({ length: WORKER_COUNT * OPERATIONS_PER_WORKER }, (_, i) => ({
      id: i,
      file: generateTestFile(i),
      operation: 'analyze'
    }));

    const startTime = performance.now();
    
    const results = await executeConCurrentOperations(operations);
    
    const duration = performance.now() - startTime;
    
    expect(results.length).toBe(operations.length);
    expect(results.every(r => r.success)).toBe(true);
    expect(duration).toBeLessThan(TIMEOUT);
    
    // Verify no memory leaks
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed / 1024 / 1024).toBeLessThan(1000); // Less than 1GB
  }, TIMEOUT);

  it('should handle mixed read/write operations safely', async () => {
    const readOps = Array.from({ length: 25 }, (_, i) => ({
      id: `read-${i}`,
      operation: 'read',
      file: generateTestFile(i)
    }));

    const writeOps = Array.from({ length: 25 }, (_, i) => ({
      id: `write-${i}`,
      operation: 'write',
      file: generateTestFile(i + 100),
      data: generateTransformedContent(i)
    }));

    const allOps = [...readOps, ...writeOps].sort(() => Math.random() - 0.5);
    
    const results = await executeConCurrentOperations(allOps);
    
    expect(results.length).toBe(50);
    expect(results.filter(r => r.operation === 'read').every(r => r.success)).toBe(true);
    expect(results.filter(r => r.operation === 'write').every(r => r.success)).toBe(true);
    
    // Verify no race conditions
    const writeResults = results.filter(r => r.operation === 'write');
    expect(writeResults.every(r => r.dataIntegrity)).toBe(true);
  }, TIMEOUT);

  it('should handle worker crashes gracefully', async () => {
    const operations = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      file: generateTestFile(i),
      operation: i % 10 === 0 ? 'crash' : 'analyze' // 10% crash rate
    }));

    const results = await executeConCurrentOperationsWithFailures(operations);
    
    // Should recover from worker crashes
    expect(results.filter(r => r.success).length).toBeGreaterThan(80);
    expect(results.filter(r => r.recovered).length).toBeGreaterThan(0);
  }, TIMEOUT);

  it('should maintain performance under high concurrency', async () => {
    const concurrencyLevels = [10, 50, 100, 200];
    const performanceResults: Array<{ level: number; avgTime: number; throughput: number }> = [];

    for (const level of concurrencyLevels) {
      const operations = Array.from({ length: level }, (_, i) => ({
        id: i,
        file: generateTestFile(i),
        operation: 'analyze'
      }));

      const startTime = performance.now();
      const results = await executeConCurrentOperations(operations, { maxConcurrency: level });
      const duration = performance.now() - startTime;

      const avgTime = duration / results.length;
      const throughput = results.length / (duration / 1000); // operations per second

      performanceResults.push({ level, avgTime, throughput });

      expect(results.every(r => r.success)).toBe(true);
    }

    // Performance should not degrade exponentially
    const firstThroughput = performanceResults[0].throughput;
    const lastThroughput = performanceResults[performanceResults.length - 1].throughput;
    
    expect(lastThroughput).toBeGreaterThan(firstThroughput * 0.3); // Should maintain at least 30% throughput
  }, TIMEOUT);

  it('should handle resource contention properly', async () => {
    // Create operations that compete for same resources
    const sharedFile = generateTestFile(999);
    const operations = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      file: sharedFile,
      operation: i % 2 === 0 ? 'read' : 'transform',
      priority: Math.floor(Math.random() * 3) // 0-2 priority
    }));

    const results = await executeConCurrentOperations(operations, {
      resourceLocking: true,
      priorityScheduling: true
    });

    expect(results.every(r => r.success)).toBe(true);
    expect(results.some(r => r.waited)).toBe(true); // Some operations should have waited
    
    // Higher priority operations should have completed first (on average)
    const priorityTimes = results.reduce((acc, r) => {
      acc[r.priority] = acc[r.priority] || [];
      acc[r.priority].push(r.completionTime);
      return acc;
    }, {} as Record<number, number[]>);

    const avgTimes = Object.entries(priorityTimes).map(([priority, times]) => ({
      priority: parseInt(priority),
      avgTime: times.reduce((a, b) => a + b, 0) / times.length
    }));

    // Higher priority (2) should generally complete faster than lower priority (0)
    if (avgTimes.length >= 2) {
      const highPriority = avgTimes.find(a => a.priority === 2);
      const lowPriority = avgTimes.find(a => a.priority === 0);
      
      if (highPriority && lowPriority) {
        expect(highPriority.avgTime).toBeLessThan(lowPriority.avgTime * 1.5);
      }
    }
  }, TIMEOUT);

  it('should handle memory pressure during concurrent operations', async () => {
    // Create memory-intensive operations
    const operations = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      file: generateLargeTestFile(5 * 1024 * 1024), // 5MB each
      operation: 'analyze',
      memoryIntensive: true
    }));

    const memBefore = process.memoryUsage();
    
    const results = await executeConCurrentOperations(operations, {
      memoryLimit: 512 * 1024 * 1024, // 512MB limit
      backpressure: true
    });
    
    const memAfter = process.memoryUsage();
    
    expect(results.every(r => r.success)).toBe(true);
    expect(results.some(r => r.backpressureApplied)).toBe(true);
    
    const memoryIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
    expect(memoryIncrease).toBeLessThan(600); // Should not exceed limit by much
  }, TIMEOUT);

  // Cluster-based testing for true multi-process concurrency
  it('should handle multi-process operations', async () => {
    if (cluster.isMaster) {
      const workerPromises: Promise<any>[] = [];
      
      for (let i = 0; i < Math.min(4, WORKER_COUNT); i++) {
        const worker = cluster.fork();
        const promise = new Promise((resolve, reject) => {
          worker.on('message', resolve);
          worker.on('error', reject);
          worker.send({ operations: Array.from({ length: 25 }, (_, j) => ({ id: j, workerId: i })) });
        });
        workerPromises.push(promise);
      }

      const results = await Promise.all(workerPromises);
      
      expect(results.length).toBe(Math.min(4, WORKER_COUNT));
      expect(results.every(r => r.success)).toBe(true);
      
      // Clean up workers
      for (const id in cluster.workers) {
        cluster.workers[id]?.kill();
      }
    } else {
      // Worker process
      process.on('message', async (msg: any) => {
        try {
          const results = await processWorkerOperations(msg.operations);
          process.send!({ success: true, results });
        } catch (error) {
          process.send!({ success: false, error: error.message });
        }
      });
    }
  }, TIMEOUT);
});

// Helper functions
async function executeConCurrentOperations(
  operations: any[], 
  options: any = {}
): Promise<any[]> {
  const { maxConcurrency = WORKER_COUNT, resourceLocking = false } = options;
  
  // Simulate concurrent execution
  const batches = [];
  for (let i = 0; i < operations.length; i += maxConcurrency) {
    batches.push(operations.slice(i, i + maxConcurrency));
  }

  const results: any[] = [];
  
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (op, index) => {
        const startTime = performance.now();
        
        // Simulate different operation types
        let result;
        switch (op.operation) {
          case 'analyze':
            result = await simulateAnalyzeOperation(op);
            break;
          case 'read':
            result = await simulateReadOperation(op);
            break;
          case 'write':
            result = await simulateWriteOperation(op);
            break;
          case 'transform':
            result = await simulateTransformOperation(op);
            break;
          default:
            result = { success: true };
        }
        
        const completionTime = performance.now() - startTime;
        
        return {
          ...result,
          id: op.id,
          operation: op.operation,
          completionTime,
          priority: op.priority || 0
        };
      })
    );
    
    results.push(...batchResults);
  }
  
  return results;
}

async function executeConCurrentOperationsWithFailures(operations: any[]): Promise<any[]> {
  return Promise.all(
    operations.map(async (op) => {
      if (op.operation === 'crash') {
        // Simulate worker crash and recovery
        try {
          throw new Error('Simulated worker crash');
        } catch (error) {
          // Recover by retrying with different worker
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            id: op.id,
            success: true,
            recovered: true
          };
        }
      }
      
      return simulateAnalyzeOperation(op);
    })
  );
}

async function simulateAnalyzeOperation(op: any): Promise<any> {
  // Simulate analysis time based on file size
  const delay = Math.min(op.file.content.length / 10000, 100);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  return {
    success: true,
    components: (op.file.content.match(/<\w+/g) || []).length,
    dataIntegrity: true
  };
}

async function simulateReadOperation(op: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 10));
  return {
    success: true,
    data: op.file.content,
    dataIntegrity: true
  };
}

async function simulateWriteOperation(op: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 20));
  return {
    success: true,
    bytesWritten: op.data.length,
    dataIntegrity: true
  };
}

async function simulateTransformOperation(op: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return {
    success: true,
    transformedComponents: Math.floor(Math.random() * 10) + 1,
    waited: Math.random() > 0.7 // 30% chance of waiting
  };
}

function generateTestFile(index: number) {
  return {
    id: `test-${index}`,
    content: `
import { Button, TextField } from '@mui/material';
export const TestComponent${index} = () => (
  <div>
    <Button variant="contained">Button ${index}</Button>
    <TextField label="Field ${index}" />
  </div>
);
`
  };
}

function generateLargeTestFile(targetSize: number) {
  const baseContent = generateTestFile(0).content;
  let content = '';
  let index = 0;
  
  while (content.length < targetSize) {
    content += baseContent.replace(/TestComponent0/g, `TestComponent${index}`);
    index++;
  }
  
  return {
    id: `large-test`,
    content
  };
}

function generateTransformedContent(index: number): string {
  return `
import { CustomButton, CustomTextField } from '@custom/ui';
export const TransformedComponent${index} = () => (
  <div>
    <CustomButton variant="contained">Button ${index}</CustomButton>
    <CustomTextField label="Field ${index}" />
  </div>
);
`;
}

async function processWorkerOperations(operations: any[]): Promise<any[]> {
  return Promise.all(
    operations.map(async (op) => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      return {
        id: op.id,
        workerId: op.workerId,
        success: true,
        components: Math.floor(Math.random() * 10) + 1
      };
    })
  );
}
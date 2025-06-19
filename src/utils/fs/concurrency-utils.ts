/**
 * Concurrency control utilities
 * Classes and functions for managing concurrent file operations
 */
import { cpus, totalmem } from "node:os";

/**
 * Semaphore for controlling concurrent operations
 */
export class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  get availablePermits(): number {
    return this.permits;
  }

  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

/**
 * Batch processor for handling collections with controlled concurrency
 */
export class AsyncBatchProcessor<T, R> {
  private semaphore: Semaphore;

  constructor(
    private items: T[],
    private processor: (item: T, index: number) => Promise<R>,
    private concurrency: number = getConcurrencyLimit(),
  ) {
    this.semaphore = new Semaphore(concurrency);
  }

  async process(
    onProgress?: (completed: number, total: number) => void,
  ): Promise<R[]> {
    const results: R[] = new Array(this.items.length);
    let completed = 0;

    const processItem = async (item: T, index: number): Promise<void> => {
      await this.semaphore.acquire();
      try {
        results[index] = await this.processor(item, index);
        completed++;
        if (onProgress) {
          onProgress(completed, this.items.length);
        }
      } finally {
        this.semaphore.release();
      }
    };

    await Promise.all(
      this.items.map((item, index) => processItem(item, index)),
    );
    return results;
  }
}

/**
 * Get optimal concurrency limit based on system resources
 */
export function getConcurrencyLimit(): number {
  const cpuCount = cpus().length;
  const memoryGB = totalmem() / (1024 * 1024 * 1024);

  // Base concurrency on CPU cores
  let concurrency = cpuCount * 2;

  // Adjust based on available memory
  if (memoryGB < 4) {
    concurrency = Math.max(2, Math.floor(concurrency / 2));
  } else if (memoryGB < 8) {
    concurrency = Math.max(4, Math.floor(concurrency * 0.75));
  }

  // Cap at reasonable limits
  return Math.min(concurrency, 20);
}

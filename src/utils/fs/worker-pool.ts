/**
 * Worker thread pool for CPU-intensive operations
 * Provides parallel processing capabilities for AST parsing and analysis
 */

import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { cpus } from "node:os";
import { EventEmitter } from "node:events";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export interface WorkerTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  resolve: (value: R) => void;
  reject: (error: Error) => void;
  startTime: number;
}

export interface WorkerPoolOptions {
  maxWorkers?: number;
  taskTimeout?: number;
  idleTimeout?: number;
  maxTasksPerWorker?: number;
}

export interface WorkerMessage<T = any> {
  type: "task" | "result" | "error" | "ping";
  taskId?: string;
  taskType?: string;
  data?: T;
  error?: string;
}

/**
 * Worker pool for managing CPU-intensive tasks
 */
export class WorkerPool extends EventEmitter {
  private workers: Map<number, WorkerInfo> = new Map();
  private taskQueue: WorkerTask[] = [];
  private activeTasks: Map<string, WorkerTask> = new Map();
  private taskIdCounter = 0;

  private readonly maxWorkers: number;
  private readonly taskTimeout: number;
  private readonly idleTimeout: number;
  private readonly maxTasksPerWorker: number;

  constructor(options: WorkerPoolOptions = {}) {
    super();
    
    this.maxWorkers = options.maxWorkers ?? Math.min(cpus().length, 4);
    this.taskTimeout = options.taskTimeout ?? 30000; // 30 seconds
    this.idleTimeout = options.idleTimeout ?? 60000; // 1 minute
    this.maxTasksPerWorker = options.maxTasksPerWorker ?? 100;
  }

  /**
   * Execute a task using the worker pool
   */
  async execute<T, R>(taskType: string, data: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const taskId = `task_${++this.taskIdCounter}`;
      const task: WorkerTask<T, R> = {
        id: taskId,
        type: taskType,
        data,
        resolve,
        reject,
        startTime: Date.now(),
      };

      this.taskQueue.push(task);
      this.processQueue();

      // Set timeout for the task
      setTimeout(() => {
        if (this.activeTasks.has(taskId)) {
          this.activeTasks.delete(taskId);
          reject(new Error(`Task ${taskId} timed out after ${this.taskTimeout}ms`));
        }
      }, this.taskTimeout);
    });
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      activeWorkers: this.workers.size,
      maxWorkers: this.maxWorkers,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      workerStats: Array.from(this.workers.values()).map(w => ({
        id: w.id,
        tasksCompleted: w.tasksCompleted,
        isIdle: w.isIdle,
        startTime: w.startTime,
      })),
    };
  }

  /**
   * Gracefully terminate all workers
   */
  async terminate(): Promise<void> {
    const terminationPromises = Array.from(this.workers.values()).map(
      worker => this.terminateWorker(worker)
    );

    await Promise.allSettled(terminationPromises);
    this.workers.clear();

    // Reject all pending tasks
    for (const task of this.activeTasks.values()) {
      task.reject(new Error("Worker pool terminated"));
    }
    this.activeTasks.clear();

    for (const task of this.taskQueue) {
      task.reject(new Error("Worker pool terminated"));
    }
    this.taskQueue.length = 0;
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.canProcessMoreTasks()) {
      const task = this.taskQueue.shift()!;
      const worker = this.getAvailableWorker();
      
      if (worker) {
        this.assignTaskToWorker(task, worker);
      } else {
        // Put task back in queue if no worker available
        this.taskQueue.unshift(task);
        break;
      }
    }
  }

  /**
   * Check if we can process more tasks
   */
  private canProcessMoreTasks(): boolean {
    return this.activeTasks.size < this.maxWorkers * 2; // Allow some queuing
  }

  /**
   * Get an available worker or create a new one
   */
  private getAvailableWorker(): WorkerInfo | null {
    // Find idle worker
    for (const worker of this.workers.values()) {
      if (worker.isIdle && worker.tasksCompleted < this.maxTasksPerWorker) {
        return worker;
      }
    }

    // Create new worker if under limit
    if (this.workers.size < this.maxWorkers) {
      return this.createWorker();
    }

    return null;
  }

  /**
   * Create a new worker
   */
  private createWorker(): WorkerInfo {
    const workerScript = join(__dirname, "worker-script.js");
    const worker = new Worker(workerScript);
    
    const workerInfo: WorkerInfo = {
      id: worker.threadId,
      worker,
      isIdle: true,
      tasksCompleted: 0,
      startTime: Date.now(),
      idleTimer: null,
    };

    // Set up worker event handlers
    worker.on("message", (message: WorkerMessage) => {
      this.handleWorkerMessage(workerInfo, message);
    });

    worker.on("error", (error) => {
      this.handleWorkerError(workerInfo, error);
    });

    worker.on("exit", (code) => {
      this.handleWorkerExit(workerInfo, code);
    });

    this.workers.set(worker.threadId, workerInfo);
    this.emit("worker-created", { workerId: worker.threadId });

    return workerInfo;
  }

  /**
   * Assign a task to a worker
   */
  private assignTaskToWorker(task: WorkerTask, worker: WorkerInfo): void {
    worker.isIdle = false;
    this.activeTasks.set(task.id, task);

    // Clear idle timer
    if (worker.idleTimer) {
      clearTimeout(worker.idleTimer);
      worker.idleTimer = null;
    }

    const message: WorkerMessage = {
      type: "task",
      taskId: task.id,
      taskType: task.type,
      data: task.data,
    };

    worker.worker.postMessage(message);
  }

  /**
   * Handle worker messages
   */
  private handleWorkerMessage(worker: WorkerInfo, message: WorkerMessage): void {
    if (message.type === "result" && message.taskId) {
      const task = this.activeTasks.get(message.taskId);
      if (task) {
        this.activeTasks.delete(message.taskId);
        task.resolve(message.data);
        this.completeTask(worker);
      }
    } else if (message.type === "error" && message.taskId) {
      const task = this.activeTasks.get(message.taskId);
      if (task) {
        this.activeTasks.delete(message.taskId);
        task.reject(new Error(message.error || "Worker error"));
        this.completeTask(worker);
      }
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(worker: WorkerInfo, error: Error): void {
    this.emit("worker-error", { workerId: worker.id, error });
    
    // Find and reject all tasks assigned to this worker
    for (const [taskId, task] of this.activeTasks.entries()) {
      // Note: We can't directly determine which worker has which task
      // In a production system, you'd track this more carefully
      task.reject(new Error(`Worker error: ${error.message}`));
      this.activeTasks.delete(taskId);
    }

    // Remove the worker
    this.workers.delete(worker.id);
  }

  /**
   * Handle worker exit
   */
  private handleWorkerExit(worker: WorkerInfo, code: number): void {
    this.emit("worker-exit", { workerId: worker.id, exitCode: code });
    this.workers.delete(worker.id);
  }

  /**
   * Complete a task and set worker idle
   */
  private completeTask(worker: WorkerInfo): void {
    worker.tasksCompleted++;
    worker.isIdle = true;

    // Set idle timer to terminate idle workers
    worker.idleTimer = setTimeout(() => {
      if (worker.isIdle && this.workers.size > 1) {
        this.terminateWorker(worker);
      }
    }, this.idleTimeout);

    // Terminate worker if it has completed too many tasks
    if (worker.tasksCompleted >= this.maxTasksPerWorker) {
      this.terminateWorker(worker);
      return;
    }

    // Process more tasks
    this.processQueue();
  }

  /**
   * Terminate a specific worker
   */
  private async terminateWorker(worker: WorkerInfo): Promise<void> {
    if (worker.idleTimer) {
      clearTimeout(worker.idleTimer);
    }

    this.workers.delete(worker.id);
    
    try {
      await worker.worker.terminate();
    } catch (error) {
      this.emit("worker-termination-error", { workerId: worker.id, error });
    }
  }
}

interface WorkerInfo {
  id: number;
  worker: Worker;
  isIdle: boolean;
  tasksCompleted: number;
  startTime: number;
  idleTimer: NodeJS.Timeout | null;
}

// Task handlers for different types of work
export const TASK_TYPES = {
  PARSE_AST: "parse-ast",
  ANALYZE_IMPORTS: "analyze-imports",
  PROCESS_JSX: "process-jsx",
  VALIDATE_SYNTAX: "validate-syntax",
} as const;

export type TaskType = typeof TASK_TYPES[keyof typeof TASK_TYPES];

// Global worker pool instance
let globalPool: WorkerPool | null = null;

/**
 * Get or create the global worker pool
 */
export function getWorkerPool(options?: WorkerPoolOptions): WorkerPool {
  if (!globalPool) {
    globalPool = new WorkerPool(options);
    
    // Cleanup on process exit
    process.on("exit", () => {
      globalPool?.terminate();
    });
    
    process.on("SIGINT", async () => {
      await globalPool?.terminate();
      process.exit(0);
    });
    
    process.on("SIGTERM", async () => {
      await globalPool?.terminate();
      process.exit(0);
    });
  }
  return globalPool;
}

/**
 * Execute a task using the global worker pool
 */
export async function executeTask<T, R>(
  taskType: TaskType,
  data: T,
  options?: WorkerPoolOptions,
): Promise<R> {
  const pool = getWorkerPool(options);
  return pool.execute<T, R>(taskType, data);
}
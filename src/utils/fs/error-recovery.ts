/**
 * Advanced error recovery and retry mechanisms for async operations
 * Provides circuit breaker, exponential backoff, and intelligent retry strategies
 */

import { EventEmitter } from "node:events";
import { performance } from "node:perf_hooks";
import { FileOperationError, sleep, isRetryableError } from "./error-handling";
import { globalPerformanceMonitor } from "./performance-monitor";

export interface RetryStrategy {
  name: string;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs?: number;
  retryableErrors: string[];
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitorWindowMs: number;
  halfOpenMaxCalls: number;
}

export interface ErrorRecoveryOptions {
  retryStrategy?: RetryStrategy;
  circuitBreaker?: CircuitBreakerConfig;
  onRetry?: (error: Error, attempt: number, nextDelayMs: number) => void;
  onGiveUp?: (error: Error, totalAttempts: number) => void;
  onCircuitOpen?: (reason: string) => void;
  onCircuitClose?: () => void;
}

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = "closed",
  OPEN = "open", 
  HALF_OPEN = "half_open",
}

/**
 * Predefined retry strategies
 */
export const RETRY_STRATEGIES: Record<string, RetryStrategy> = {
  CONSERVATIVE: {
    name: "conservative",
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitterMs: 50,
    retryableErrors: ["ENOENT", "EBUSY", "EMFILE", "ENFILE", "EAGAIN", "EACCES"],
  },
  
  AGGRESSIVE: {
    name: "aggressive",
    maxAttempts: 5,
    baseDelayMs: 50,
    maxDelayMs: 10000,
    backoffMultiplier: 1.5,
    jitterMs: 100,
    retryableErrors: ["ENOENT", "EBUSY", "EMFILE", "ENFILE", "EAGAIN", "EACCES", "ETIMEDOUT"],
  },
  
  GENTLE: {
    name: "gentle",
    maxAttempts: 2,
    baseDelayMs: 500,
    maxDelayMs: 3000,
    backoffMultiplier: 1.2,
    jitterMs: 200,
    retryableErrors: ["EBUSY", "EMFILE", "ENFILE"],
  },
  
  NETWORK: {
    name: "network",
    maxAttempts: 4,
    baseDelayMs: 200,
    maxDelayMs: 8000,
    backoffMultiplier: 2.5,
    jitterMs: 100,
    retryableErrors: ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND"],
  },
};

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker extends EventEmitter {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private halfOpenCalls = 0;
  private recentCalls: Array<{ timestamp: number; success: boolean }> = [];

  constructor(private config: CircuitBreakerConfig) {
    super();
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>, operationName?: string): Promise<T> {
    const canExecute = this.canExecute();
    
    if (!canExecute) {
      const error = new Error(`Circuit breaker is OPEN for ${operationName || "operation"}`);
      this.emit("circuit-blocked", { operationName, state: this.state });
      throw error;
    }

    const startTime = performance.now();
    
    try {
      const result = await operation();
      this.onSuccess(startTime);
      return result;
    } catch (error) {
      this.onFailure(error as Error, startTime);
      throw error;
    }
  }

  /**
   * Check if operation can be executed
   */
  private canExecute(): boolean {
    const now = Date.now();
    
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;
        
      case CircuitState.OPEN:
        if (now - this.lastFailureTime >= this.config.resetTimeoutMs) {
          this.state = CircuitState.HALF_OPEN;
          this.halfOpenCalls = 0;
          this.emit("circuit-half-open");
          return true;
        }
        return false;
        
      case CircuitState.HALF_OPEN:
        return this.halfOpenCalls < this.config.halfOpenMaxCalls;
        
      default:
        return false;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(startTime: number): void {
    const now = Date.now();
    this.recentCalls.push({ timestamp: now, success: true });
    this.cleanupOldCalls(now);

    switch (this.state) {
      case CircuitState.HALF_OPEN:
        this.successCount++;
        if (this.successCount >= this.config.halfOpenMaxCalls) {
          this.state = CircuitState.CLOSED;
          this.failures = 0;
          this.successCount = 0;
          this.emit("circuit-closed");
        }
        break;
        
      case CircuitState.CLOSED:
        // Reset failure count on success
        this.failures = Math.max(0, this.failures - 1);
        break;
    }

    this.emit("operation-success", {
      duration: performance.now() - startTime,
      state: this.state,
    });
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: Error, startTime: number): void {
    const now = Date.now();
    this.recentCalls.push({ timestamp: now, success: false });
    this.cleanupOldCalls(now);

    this.failures++;
    this.lastFailureTime = now;

    switch (this.state) {
      case CircuitState.CLOSED:
        if (this.failures >= this.config.failureThreshold) {
          this.state = CircuitState.OPEN;
          this.emit("circuit-opened", { 
            reason: "failure threshold exceeded",
            failures: this.failures,
          });
        }
        break;
        
      case CircuitState.HALF_OPEN:
        this.state = CircuitState.OPEN;
        this.successCount = 0;
        this.emit("circuit-opened", {
          reason: "failure in half-open state",
        });
        break;
    }

    this.emit("operation-failure", {
      error,
      duration: performance.now() - startTime,
      state: this.state,
      failures: this.failures,
    });

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls++;
    }
  }

  /**
   * Cleanup old call records
   */
  private cleanupOldCalls(now: number): void {
    const cutoff = now - this.config.monitorWindowMs;
    this.recentCalls = this.recentCalls.filter(call => call.timestamp >= cutoff);
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    const now = Date.now();
    const cutoff = now - this.config.monitorWindowMs;
    const recentCalls = this.recentCalls.filter(call => call.timestamp >= cutoff);
    
    const successfulCalls = recentCalls.filter(call => call.success).length;
    const failedCalls = recentCalls.filter(call => !call.success).length;
    const totalCalls = recentCalls.length;
    
    return {
      state: this.state,
      failures: this.failures,
      successRate: totalCalls > 0 ? successfulCalls / totalCalls : 0,
      totalRecentCalls: totalCalls,
      successfulCalls,
      failedCalls,
      halfOpenCalls: this.halfOpenCalls,
      timeSinceLastFailure: now - this.lastFailureTime,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successCount = 0;
    this.halfOpenCalls = 0;
    this.recentCalls = [];
    this.emit("circuit-reset");
  }
}

/**
 * Retry executor with advanced strategies and circuit breaking
 */
export class RetryExecutor extends EventEmitter {
  private circuitBreaker?: CircuitBreaker;

  constructor(private options: ErrorRecoveryOptions = {}) {
    super();
    
    if (options.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
      this.setupCircuitBreakerListeners();
    }
  }

  /**
   * Execute operation with retry and circuit breaking
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName?: string,
    customRetryStrategy?: RetryStrategy
  ): Promise<T> {
    const strategy = customRetryStrategy || this.options.retryStrategy || RETRY_STRATEGIES.CONSERVATIVE;
    const perfTracker = globalPerformanceMonitor.startOperation("retryExecute", operationName);

    try {
      if (this.circuitBreaker) {
        return await this.circuitBreaker.execute(async () => {
          return await this.executeWithRetry(operation, strategy, operationName);
        }, operationName);
      } else {
        return await this.executeWithRetry(operation, strategy, operationName);
      }
    } finally {
      perfTracker.complete();
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    strategy: RetryStrategy,
    operationName?: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          this.emit("retry-success", {
            operationName,
            attempt,
            totalAttempts: strategy.maxAttempts,
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        const shouldRetry = this.shouldRetry(error as Error, attempt, strategy);
        
        if (!shouldRetry || attempt >= strategy.maxAttempts) {
          break;
        }

        const delayMs = this.calculateDelay(attempt, strategy);
        
        this.emit("retry-attempt", {
          operationName,
          error: lastError,
          attempt,
          totalAttempts: strategy.maxAttempts,
          nextDelayMs: delayMs,
        });

        this.options.onRetry?.(lastError, attempt, delayMs);
        
        await sleep(delayMs);
      }
    }

    // All retries exhausted
    const finalError = new FileOperationError(
      "retryExhausted",
      operationName || "unknown",
      lastError!
    );

    this.emit("retry-exhausted", {
      operationName,
      finalError,
      totalAttempts: strategy.maxAttempts,
    });

    this.options.onGiveUp?.(finalError, strategy.maxAttempts);
    throw finalError;
  }

  /**
   * Determine if error should be retried
   */
  private shouldRetry(error: Error, attempt: number, strategy: RetryStrategy): boolean {
    // Check custom shouldRetry function first
    if (strategy.shouldRetry) {
      return strategy.shouldRetry(error, attempt);
    }

    // Check if error code is retryable
    return isRetryableError(error, strategy.retryableErrors);
  }

  /**
   * Calculate delay for retry attempt
   */
  private calculateDelay(attempt: number, strategy: RetryStrategy): number {
    // Calculate exponential backoff
    let delay = strategy.baseDelayMs * Math.pow(strategy.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, strategy.maxDelayMs);
    
    // Add jitter to prevent thundering herd
    if (strategy.jitterMs) {
      const jitter = Math.random() * strategy.jitterMs;
      delay += jitter;
    }
    
    return Math.floor(delay);
  }

  /**
   * Setup circuit breaker event listeners
   */
  private setupCircuitBreakerListeners(): void {
    if (!this.circuitBreaker) return;

    this.circuitBreaker.on("circuit-opened", (data) => {
      this.emit("circuit-opened", data);
      this.options.onCircuitOpen?.(data.reason);
    });

    this.circuitBreaker.on("circuit-closed", () => {
      this.emit("circuit-closed");
      this.options.onCircuitClose?.();
    });

    this.circuitBreaker.on("circuit-half-open", () => {
      this.emit("circuit-half-open");
    });

    this.circuitBreaker.on("circuit-blocked", (data) => {
      this.emit("circuit-blocked", data);
    });
  }

  /**
   * Get retry executor statistics
   */
  getStats() {
    return {
      circuitBreaker: this.circuitBreaker?.getStats(),
      retryStrategy: this.options.retryStrategy?.name || "default",
    };
  }

  /**
   * Reset circuit breaker if configured
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker?.reset();
  }
}

/**
 * Global retry executor instance
 */
const globalRetryExecutor = new RetryExecutor({
  retryStrategy: RETRY_STRATEGIES.CONSERVATIVE,
  circuitBreaker: {
    failureThreshold: 10,
    resetTimeoutMs: 30000,
    monitorWindowMs: 60000,
    halfOpenMaxCalls: 3,
  },
});

/**
 * Execute operation with global retry executor
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName?: string,
  strategy?: RetryStrategy
): Promise<T> {
  return globalRetryExecutor.execute(operation, operationName, strategy);
}

/**
 * Create a retry executor with specific configuration
 */
export function createRetryExecutor(options: ErrorRecoveryOptions): RetryExecutor {
  return new RetryExecutor(options);
}

/**
 * Utility function to wrap async functions with retry logic
 */
export function withRetry<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  strategy: RetryStrategy = RETRY_STRATEGIES.CONSERVATIVE,
  operationName?: string
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    return executeWithRetry(
      () => fn(...args),
      operationName || fn.name,
      strategy
    );
  };
}

/**
 * Batch retry executor for processing multiple operations with shared circuit breaker
 */
export class BatchRetryExecutor {
  private retryExecutor: RetryExecutor;
  private results: Array<{ success: boolean; result?: any; error?: Error }> = [];

  constructor(options: ErrorRecoveryOptions = {}) {
    this.retryExecutor = new RetryExecutor(options);
  }

  /**
   * Execute multiple operations with retry logic
   */
  async executeBatch<T>(
    operations: Array<() => Promise<T>>,
    operationNames?: string[]
  ): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
    const results = await Promise.allSettled(
      operations.map((operation, index) =>
        this.retryExecutor.execute(
          operation,
          operationNames?.[index] || `operation-${index}`
        )
      )
    );

    return results.map((result) => {
      if (result.status === "fulfilled") {
        return { success: true, result: result.value };
      } else {
        return { success: false, error: result.reason };
      }
    });
  }

  /**
   * Get batch execution statistics
   */
  getStats() {
    return this.retryExecutor.getStats();
  }
}

export { globalRetryExecutor };
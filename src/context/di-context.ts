/**
 * DI-based context implementation
 * This replaces the old globalContext.ts with dependency injection
 */

import path from 'node:path';
import { 
  getServiceRegistry, 
  initializeServiceRegistry,
  SERVICE_TOKENS,
  IServiceContainer,
  IConfigurationService,
  ILoggerService,
  IGraphService,
  IBackupService,
} from '../di';
import { ProjectGraph } from '../graph/types';
import { FileOperationError } from '../utils/fs-utils';
import type { GlobalState } from '../types';

export class DIContext {
  private serviceRegistry = getServiceRegistry();
  private container: IServiceContainer;
  private state: Partial<GlobalState> = {};
  private initialized = false;

  constructor() {
    this.container = this.serviceRegistry.getContainer();
  }

  /**
   * Initialize the DI context and all services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize the service registry and all services
      await initializeServiceRegistry();
      
      const configService = this.container.resolve(SERVICE_TOKENS.Configuration);
      const loggerService = this.container.resolve(SERVICE_TOKENS.LoggerService);
      
      loggerService.info('DI Context initialized');
      
      // Initialize basic state from configuration
      this.state = {
        ROOT_PATH: configService.getRootPath(),
        BLACKLIST: configService.getBlacklist(),
        PACKAGES: configService.getPackages(),
        report: {},
        QUEUE_COMPONENT_SPEC_DIR: configService.getQueueDir(),
        QUEUE_COMPONENT_SPEC: path.join(configService.getQueueDir(), 'component-spec.json'),
        compSpec: undefined,
        REPORT_GLOBAL_USAGE: path.join(configService.getQueueDir(), 'usage.json'),
        reportGlobalUsage: undefined,
        REPORT_COMPONENT_USAGES: path.join(configService.getQueueDir(), 'props-usage.json'),
        runArgs: configService.getRunArgs(),
      };

      // Initialize backup system
      await this.initializeBackupSystem(configService, loggerService);

      this.initialized = true;

    } catch (error) {
      const loggerService = this.container.tryResolve(SERVICE_TOKENS.LoggerService);
      if (loggerService) {
        loggerService.error('Failed to initialize DI context:', error);
      }
      throw error;
    }
  }

  /**
   * Initialize context with graph building
   */
  async initializeWithGraph(options: {
    useAsync?: boolean;
    useBatched?: boolean;
    concurrency?: number;
    batchSize?: number;
    memoryLimitMB?: number;
    onProgress?: (completed: number, total: number, info?: string) => void;
    onError?: (error: FileOperationError) => void;
  } = {}): Promise<{ errors: FileOperationError[] }> {
    await this.initialize();

    const configService = this.container.resolve(SERVICE_TOKENS.Configuration);
    const loggerService = this.container.resolve(SERVICE_TOKENS.LoggerService);
    const graphService = this.container.resolve(SERVICE_TOKENS.GraphService);

    loggerService.info('Building project graph');

    const errors: FileOperationError[] = [];
    const { useAsync = true, useBatched = false } = options;

    try {
      if (!useAsync) {
        // Synchronous graph building
        this.state.graph = await graphService.buildGraph(
          this.state.ROOT_PATH!,
          this.state.BLACKLIST!
        );
      } else if (useBatched) {
        // Batched async graph building
        const result = await graphService.buildGraphBatched(
          this.state.ROOT_PATH!,
          this.state.BLACKLIST!,
          {
            batchSize: options.batchSize,
            concurrency: options.concurrency,
            memoryLimitMB: options.memoryLimitMB,
            onProgress: (completed, total, batchNum) => {
              const info = batchNum ? `Batch ${batchNum}` : undefined;
              options.onProgress?.(completed, total, info);
            },
            onError: options.onError,
          }
        );
        this.state.graph = result.graph;
        errors.push(...result.errors);
      } else {
        // Standard async graph building
        const result = await graphService.buildGraphAsync(
          this.state.ROOT_PATH!,
          this.state.BLACKLIST!,
          {
            concurrency: options.concurrency,
            onProgress: options.onProgress,
            onError: options.onError,
          }
        );
        this.state.graph = result.graph;
        errors.push(...result.errors);
      }

      const totalImports = this.state.graph?.imports.length ?? 0;
      const totalJsx = this.state.graph?.jsx.length ?? 0;

      if (errors.length > 0) {
        loggerService.warn(
          `Graph built with ${errors.length} errors. Found ${totalImports} imports and ${totalJsx} JSX elements.`
        );
      } else {
        loggerService.success(
          `Graph built successfully! Found ${totalImports} imports and ${totalJsx} JSX elements.`
        );
      }

    } catch (error) {
      const contextError = new FileOperationError(
        'initializeWithGraph',
        this.state.ROOT_PATH!,
        error as Error
      );
      errors.push(contextError);
      options.onError?.(contextError);
      loggerService.error('Graph building failed:', error);
    }

    return { errors };
  }

  /**
   * Get the service container
   */
  getContainer(): IServiceContainer {
    return this.container;
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(token: { name: string; description?: string }): T {
    return this.container.resolve(token as any);
  }

  /**
   * Get the current state
   */
  getState(): Partial<GlobalState> {
    return { ...this.state };
  }

  /**
   * Update state
   */
  updateState(updates: Partial<GlobalState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Get the project graph
   */
  getGraph(): ProjectGraph | undefined {
    return this.state.graph;
  }

  /**
   * Set the project graph
   */
  setGraph(graph: ProjectGraph): void {
    this.state.graph = graph;
  }

  /**
   * Get root path
   */
  getRootPath(): string {
    return this.state.ROOT_PATH || process.cwd();
  }

  /**
   * Get blacklist
   */
  getBlacklist(): string[] {
    return this.state.BLACKLIST || [];
  }

  /**
   * Dispose the context and all services
   */
  async dispose(): Promise<void> {
    if (this.initialized) {
      const loggerService = this.container.tryResolve(SERVICE_TOKENS.LoggerService);
      if (loggerService) {
        loggerService.info('Disposing DI context');
      }

      await this.serviceRegistry.disposeServices();
      this.initialized = false;
    }
  }

  /**
   * Create a scoped context for isolated operations
   */
  createScope(): DIContext {
    const scopedContext = new DIContext();
    scopedContext.container = this.container.createScope();
    scopedContext.state = { ...this.state };
    scopedContext.initialized = this.initialized;
    return scopedContext;
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<string, { status: 'healthy' | 'unhealthy' | 'unknown'; error?: string }>;
  }> {
    try {
      const { ServiceHealthChecker } = await import('../di');
      const healthChecker = new ServiceHealthChecker(this.container);
      return await healthChecker.checkServiceHealth();
    } catch (error) {
      return {
        healthy: false,
        services: {
          healthChecker: {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : String(error),
          },
        },
      };
    }
  }

  /**
   * Get service performance statistics
   */
  getPerformanceStats(): Record<string, { average: number; min: number; max: number; count: number }> {
    // This would be implemented if performance monitoring is enabled
    return {};
  }

  /**
   * Validate service dependencies
   */
  validateDependencies(): { valid: boolean; errors: string[] } {
    return this.serviceRegistry.validateDependencies();
  }

  /**
   * Get dependency graph information
   */
  getDependencyGraph(): Record<string, string[]> {
    return this.serviceRegistry.getDependencyGraph();
  }

  /**
   * Initialize backup system
   */
  private async initializeBackupSystem(
    configService: IConfigurationService,
    loggerService: ILoggerService
  ): Promise<void> {
    try {
      const backupService = this.container.tryResolve(SERVICE_TOKENS.BackupService);
      if (backupService && typeof backupService.initialize === 'function') {
        await backupService.initialize();
        loggerService.info('Backup system initialized');
      }
    } catch (error) {
      loggerService.warn(
        'Failed to initialize backup system:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

// Global context instance
let globalDIContext: DIContext | null = null;

/**
 * Get the global DI context instance
 */
export function getDIContext(): DIContext {
  if (!globalDIContext) {
    globalDIContext = new DIContext();
  }
  return globalDIContext;
}

/**
 * Initialize the global DI context
 */
export async function initDIContext(options?: {
  useAsync?: boolean;
  useBatched?: boolean;
  concurrency?: number;
  batchSize?: number;
  memoryLimitMB?: number;
  onProgress?: (completed: number, total: number, info?: string) => void;
  onError?: (error: FileOperationError) => void;
}): Promise<{ errors: FileOperationError[] }> {
  const context = getDIContext();
  
  if (options) {
    return await context.initializeWithGraph(options);
  } else {
    await context.initialize();
    return { errors: [] };
  }
}

/**
 * Dispose the global DI context
 */
export async function disposeDIContext(): Promise<void> {
  if (globalDIContext) {
    await globalDIContext.dispose();
    globalDIContext = null;
  }
}

/**
 * Reset the global DI context (useful for testing)
 */
export function resetDIContext(): void {
  globalDIContext = null;
}

/**
 * Backward compatibility wrapper for legacy globalContext usage
 */
export class LegacyContextAdapter {
  private diContext: DIContext;

  constructor(diContext: DIContext) {
    this.diContext = diContext;
  }

  /**
   * Get state in the old format
   */
  getContext(): GlobalState {
    const state = this.diContext.getState();
    return {
      ROOT_PATH: state.ROOT_PATH || process.cwd(),
      TARGET_COMPONENT: state.TARGET_COMPONENT,
      BLACKLIST: state.BLACKLIST || [],
      PACKAGES: state.PACKAGES || [],
      report: state.report || {},
      QUEUE_COMPONENT_SPEC_DIR: state.QUEUE_COMPONENT_SPEC_DIR || './queue',
      QUEUE_COMPONENT_SPEC: state.QUEUE_COMPONENT_SPEC || './queue/component-spec.json',
      compSpec: state.compSpec,
      REPORT_GLOBAL_USAGE: state.REPORT_GLOBAL_USAGE || './queue/usage.json',
      reportGlobalUsage: state.reportGlobalUsage,
      REPORT_COMPONENT_USAGES: state.REPORT_COMPONENT_USAGES || './queue/props-usage.json',
      runArgs: state.runArgs || {},
      graph: state.graph,
    } as GlobalState;
  }

  /**
   * Get root path
   */
  getRootPath(): string {
    return this.diContext.getRootPath();
  }

  /**
   * Get logger functions in the old format
   */
  getLoggers() {
    const loggerService = this.diContext.resolve(SERVICE_TOKENS.LoggerService);
    
    return {
      logger: {
        info: loggerService.info.bind(loggerService),
        warn: loggerService.warn.bind(loggerService),
        error: loggerService.error.bind(loggerService),
        debug: loggerService.debug.bind(loggerService),
      },
      lSuccess: loggerService.success.bind(loggerService),
      lError: loggerService.error.bind(loggerService),
      lInfo: loggerService.info.bind(loggerService),
      lDbug: loggerService.debug.bind(loggerService),
      lWarning: loggerService.warn.bind(loggerService),
    };
  }
}

/**
 * Create a legacy adapter for backward compatibility
 */
export function createLegacyAdapter(): LegacyContextAdapter {
  return new LegacyAdapter(getDIContext());
}

class LegacyAdapter extends LegacyContextAdapter {}

/**
 * Export functions for backward compatibility
 */
export function getContext(): GlobalState {
  const adapter = createLegacyAdapter();
  return adapter.getContext();
}

export function getRootPath(): string {
  const adapter = createLegacyAdapter();
  return adapter.getRootPath();
}

export function getLoggers() {
  const adapter = createLegacyAdapter();
  return adapter.getLoggers();
}

// For backward compatibility, re-export the logger functions
export const { logger, lSuccess, lError, lInfo, lDbug, lWarning } = (() => {
  try {
    const adapter = createLegacyAdapter();
    return adapter.getLoggers();
  } catch {
    // Fallback if DI context is not initialized
    return {
      logger: {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      },
      lSuccess: console.log,
      lError: console.error,
      lInfo: console.log,
      lDbug: console.debug,
      lWarning: console.warn,
    };
  }
})();

/**
 * Legacy initialization functions
 */
export const initContext = async (): Promise<void> => {
  await initDIContext();
};

export const initContextAsync = async (options?: any): Promise<{ errors: FileOperationError[] }> => {
  return await initDIContext(options);
};
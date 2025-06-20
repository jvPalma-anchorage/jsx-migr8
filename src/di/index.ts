/**
 * Dependency injection module exports
 */

// Core DI types and interfaces
export * from './types';

// Container implementation
export { ServiceContainer, createContainer, register } from './container';

// Service registry
export {
  ServiceRegistry,
  getServiceRegistry,
  initializeServiceRegistry,
  disposeServiceRegistry,
  resetServiceRegistry,
} from './service-registry';

// Re-export service tokens for convenience
export { SERVICE_TOKENS } from './types';

// Utility functions for common DI patterns
import { IServiceContainer, ServiceToken } from './types';

/**
 * Decorator for automatic dependency injection (if using decorators)
 */
export function inject<T>(token: ServiceToken<T>) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // Store metadata for dependency injection
    const existingTokens = Reflect.getMetadata('design:paramtypes', target) || [];
    existingTokens[parameterIndex] = token;
    Reflect.defineMetadata('design:paramtypes', existingTokens, target);
  };
}

/**
 * Service locator pattern implementation
 */
export class ServiceLocator {
  private static container: IServiceContainer | null = null;

  static setContainer(container: IServiceContainer): void {
    ServiceLocator.container = container;
  }

  static resolve<T>(token: ServiceToken<T>): T {
    if (!ServiceLocator.container) {
      throw new Error('Service container not set. Call ServiceLocator.setContainer() first.');
    }
    return ServiceLocator.container.resolve(token);
  }

  static tryResolve<T>(token: ServiceToken<T>): T | undefined {
    if (!ServiceLocator.container) {
      return undefined;
    }
    return ServiceLocator.container.tryResolve(token);
  }

  static isRegistered<T>(token: ServiceToken<T>): boolean {
    if (!ServiceLocator.container) {
      return false;
    }
    return ServiceLocator.container.isRegistered(token);
  }

  static clear(): void {
    ServiceLocator.container = null;
  }
}

/**
 * Factory pattern helpers
 */
export interface IFactory<T> {
  create(...args: any[]): T;
}

export class Factory<T> implements IFactory<T> {
  constructor(
    private container: IServiceContainer,
    private token: ServiceToken<T>
  ) {}

  create(...args: any[]): T {
    // For simple cases, just resolve from container
    // In more complex scenarios, you might pass args to a factory method
    return this.container.resolve(this.token);
  }
}

/**
 * Service factory creator
 */
export function createFactory<T>(
  container: IServiceContainer,
  token: ServiceToken<T>
): IFactory<T> {
  return new Factory(container, token);
}

/**
 * Module configuration for dependency injection
 */
export interface DIModule {
  configure(container: IServiceContainer): void;
}

/**
 * Module loader for organizing service registrations
 */
export class ModuleLoader {
  private modules: DIModule[] = [];

  addModule(module: DIModule): void {
    this.modules.push(module);
  }

  configure(container: IServiceContainer): void {
    for (const module of this.modules) {
      module.configure(container);
    }
  }
}

/**
 * Core services module
 */
export class CoreServicesModule implements DIModule {
  configure(container: IServiceContainer): void {
    // This would be called by the service registry
    // Left empty as the registry handles core service registration
  }
}

/**
 * Testing utilities for dependency injection
 */
export class DITestUtils {
  /**
   * Create a test container with mock services
   */
  static createTestContainer(): IServiceContainer {
    const container = createContainer();
    
    // Register mock implementations
    // These would be specific to testing needs
    
    return container;
  }

  /**
   * Create a mock service implementation
   */
  static createMockService<T>(methods: Partial<T>): T {
    return {
      async initialize() {},
      async dispose() {},
      ...methods,
    } as T;
  }

  /**
   * Verify service dependencies are properly configured
   */
  static async verifyServiceConfiguration(container: IServiceContainer): Promise<boolean> {
    try {
      // Try to resolve all core services
      const { SERVICE_TOKENS } = await import('./types');
      
      const coreServices = [
        SERVICE_TOKENS.Configuration,
        SERVICE_TOKENS.FileService,
        SERVICE_TOKENS.ASTService,
        SERVICE_TOKENS.LoggerService,
        SERVICE_TOKENS.AnalyzerService,
        SERVICE_TOKENS.GraphService,
        SERVICE_TOKENS.MigratorService,
      ];

      for (const serviceToken of coreServices) {
        try {
          container.resolve(serviceToken);
        } catch (error) {
          console.error(`Failed to resolve ${serviceToken.name}:`, error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Service configuration verification failed:', error);
      return false;
    }
  }
}

/**
 * Performance monitoring for DI container
 */
export class DIPerformanceMonitor {
  private resolutionTimes = new Map<string, number[]>();

  startResolution(serviceName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.resolutionTimes.has(serviceName)) {
        this.resolutionTimes.set(serviceName, []);
      }
      
      this.resolutionTimes.get(serviceName)!.push(duration);
    };
  }

  getStatistics(): Record<string, { average: number; min: number; max: number; count: number }> {
    const stats: Record<string, { average: number; min: number; max: number; count: number }> = {};
    
    for (const [serviceName, times] of this.resolutionTimes) {
      const count = times.length;
      const sum = times.reduce((a, b) => a + b, 0);
      const average = sum / count;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      stats[serviceName] = { average, min, max, count };
    }
    
    return stats;
  }

  reset(): void {
    this.resolutionTimes.clear();
  }
}

/**
 * Service health checker
 */
export class ServiceHealthChecker {
  constructor(private container: IServiceContainer) {}

  async checkServiceHealth(): Promise<{
    healthy: boolean;
    services: Record<string, { status: 'healthy' | 'unhealthy' | 'unknown'; error?: string }>;
  }> {
    const services: Record<string, { status: 'healthy' | 'unhealthy' | 'unknown'; error?: string }> = {};
    let allHealthy = true;

    const registrations = this.container.getRegistrations();
    
    for (const registration of registrations) {
      try {
        const service = this.container.resolve(registration.token);
        
        // If service has a health check method, use it
        if (service && typeof (service as any).healthCheck === 'function') {
          const isHealthy = await (service as any).healthCheck();
          services[registration.token.name] = {
            status: isHealthy ? 'healthy' : 'unhealthy',
          };
          if (!isHealthy) allHealthy = false;
        } else {
          // Otherwise, just check if it can be resolved
          services[registration.token.name] = { status: 'healthy' };
        }
      } catch (error) {
        services[registration.token.name] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : String(error),
        };
        allHealthy = false;
      }
    }

    return { healthy: allHealthy, services };
  }
}
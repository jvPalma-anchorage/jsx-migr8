/**
 * Service registry for dependency injection
 */

import { IServiceContainer, SERVICE_TOKENS } from './types';
import { createContainer, register } from './container';

// Service implementations
import { ConfigurationService } from '../services/configuration.service';
import { FileService } from '../services/file.service';
import { ASTService } from '../services/ast.service';
import { LoggerService } from '../services/logger.service';
import { AnalyzerService } from '../services/analyzer.service';
import { GraphService } from '../services/graph.service';
import { MigratorService } from '../services/migrator.service';

export class ServiceRegistry {
  private container: IServiceContainer;
  private initialized = false;

  constructor() {
    this.container = createContainer();
  }

  /**
   * Register all core services with their dependencies
   */
  registerCoreServices(): void {
    if (this.initialized) {
      throw new Error('Services have already been registered');
    }

    // Register Configuration service (no dependencies)
    register(this.container, SERVICE_TOKENS.Configuration)
      .asSingleton(ConfigurationService);

    // Register Logger service (depends on Configuration)
    register(this.container, SERVICE_TOKENS.LoggerService)
      .asSingleton((container) => new LoggerService(
        container.resolve(SERVICE_TOKENS.Configuration)
      ));

    // Register File service (depends on Configuration)
    register(this.container, SERVICE_TOKENS.FileService)
      .asSingleton((container) => new FileService(
        container.resolve(SERVICE_TOKENS.Configuration)
      ));

    // Register AST service (depends on FileService and LoggerService)
    register(this.container, SERVICE_TOKENS.ASTService)
      .asSingleton((container) => new ASTService(
        container.resolve(SERVICE_TOKENS.FileService),
        container.resolve(SERVICE_TOKENS.LoggerService)
      ));

    // Register Analyzer service (depends on FileService, ASTService, and LoggerService)
    register(this.container, SERVICE_TOKENS.AnalyzerService)
      .asSingleton((container) => new AnalyzerService(
        container.resolve(SERVICE_TOKENS.FileService),
        container.resolve(SERVICE_TOKENS.ASTService),
        container.resolve(SERVICE_TOKENS.LoggerService)
      ));

    // Register Graph service (depends on FileService, ASTService, LoggerService, and Configuration)
    register(this.container, SERVICE_TOKENS.GraphService)
      .asSingleton((container) => new GraphService(
        container.resolve(SERVICE_TOKENS.FileService),
        container.resolve(SERVICE_TOKENS.ASTService),
        container.resolve(SERVICE_TOKENS.LoggerService),
        container.resolve(SERVICE_TOKENS.Configuration)
      ));

    // Register Backup service placeholder (will be implemented later)
    register(this.container, SERVICE_TOKENS.BackupService)
      .asSingleton(() => ({
        async initialize() {},
        async dispose() {},
        async createBackup() { return 'mock-backup-id'; },
        async listBackups() { return []; },
        async restoreBackup() {},
        async deleteBackup() {},
        async verifyBackup() { return { valid: true, summary: {} }; },
      }));

    // Register Migrator service (depends on all other services)
    register(this.container, SERVICE_TOKENS.MigratorService)
      .asSingleton((container) => new MigratorService(
        container.resolve(SERVICE_TOKENS.FileService),
        container.resolve(SERVICE_TOKENS.ASTService),
        container.resolve(SERVICE_TOKENS.LoggerService),
        container.resolve(SERVICE_TOKENS.Configuration),
        container.resolve(SERVICE_TOKENS.BackupService)
      ));

    this.initialized = true;
  }

  /**
   * Initialize all registered services
   */
  async initializeServices(): Promise<void> {
    if (!this.initialized) {
      this.registerCoreServices();
    }

    const services = [
      SERVICE_TOKENS.Configuration,
      SERVICE_TOKENS.LoggerService,
      SERVICE_TOKENS.FileService,
      SERVICE_TOKENS.ASTService,
      SERVICE_TOKENS.AnalyzerService,
      SERVICE_TOKENS.GraphService,
      SERVICE_TOKENS.BackupService,
      SERVICE_TOKENS.MigratorService,
    ];

    // Initialize services in dependency order
    for (const serviceToken of services) {
      try {
        const service = this.container.resolve(serviceToken);
        if (service && typeof service.initialize === 'function') {
          await service.initialize();
        }
      } catch (error) {
        console.error(`Failed to initialize service ${serviceToken.name}:`, error);
        throw error;
      }
    }
  }

  /**
   * Dispose all services
   */
  async disposeServices(): Promise<void> {
    await this.container.dispose();
  }

  /**
   * Get the service container
   */
  getContainer(): IServiceContainer {
    if (!this.initialized) {
      this.registerCoreServices();
    }
    return this.container;
  }

  /**
   * Resolve a specific service
   */
  resolve<T>(token: { name: string }): T {
    return this.container.resolve(token as any);
  }

  /**
   * Create a scoped container for testing or isolated operations
   */
  createScope(): IServiceContainer {
    return this.container.createScope();
  }

  /**
   * Register additional services (for plugins or extensions)
   */
  registerService<T>(
    token: { name: string },
    implementation: new (...args: any[]) => T,
    lifecycle: 'singleton' | 'transient' | 'scoped' = 'singleton'
  ): void {
    if (lifecycle === 'singleton') {
      register(this.container, token as any).asSingleton(implementation);
    } else if (lifecycle === 'transient') {
      register(this.container, token as any).asTransient(implementation);
    } else {
      register(this.container, token as any).asScoped(implementation);
    }
  }

  /**
   * Register a factory function for a service
   */
  registerFactory<T>(
    token: { name: string },
    factory: (container: IServiceContainer) => T,
    lifecycle: 'singleton' | 'transient' | 'scoped' = 'singleton'
  ): void {
    if (lifecycle === 'singleton') {
      register(this.container, token as any).asSingleton(factory);
    } else if (lifecycle === 'transient') {
      register(this.container, token as any).asTransient(factory);
    } else {
      register(this.container, token as any).asScoped(factory);
    }
  }

  /**
   * Check if a service is registered
   */
  isRegistered<T>(token: { name: string }): boolean {
    return this.container.isRegistered(token as any);
  }

  /**
   * Get service registration information
   */
  getRegistrations() {
    return this.container.getRegistrations();
  }

  /**
   * Validate service dependencies
   */
  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const registrations = this.getRegistrations();

    // Check for circular dependencies
    try {
      // Try to resolve all services to detect circular dependencies
      for (const registration of registrations) {
        try {
          this.container.resolve(registration.token);
        } catch (error) {
          if (error instanceof Error && error.name === 'CircularDependencyError') {
            errors.push(`Circular dependency detected: ${error.message}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Dependency validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get dependency graph information
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    
    // This is a simplified representation
    graph[SERVICE_TOKENS.Configuration.name] = [];
    graph[SERVICE_TOKENS.LoggerService.name] = [SERVICE_TOKENS.Configuration.name];
    graph[SERVICE_TOKENS.FileService.name] = [SERVICE_TOKENS.Configuration.name];
    graph[SERVICE_TOKENS.ASTService.name] = [SERVICE_TOKENS.FileService.name, SERVICE_TOKENS.LoggerService.name];
    graph[SERVICE_TOKENS.AnalyzerService.name] = [
      SERVICE_TOKENS.FileService.name,
      SERVICE_TOKENS.ASTService.name,
      SERVICE_TOKENS.LoggerService.name,
    ];
    graph[SERVICE_TOKENS.GraphService.name] = [
      SERVICE_TOKENS.FileService.name,
      SERVICE_TOKENS.ASTService.name,
      SERVICE_TOKENS.LoggerService.name,
      SERVICE_TOKENS.Configuration.name,
    ];
    graph[SERVICE_TOKENS.MigratorService.name] = [
      SERVICE_TOKENS.FileService.name,
      SERVICE_TOKENS.ASTService.name,
      SERVICE_TOKENS.LoggerService.name,
      SERVICE_TOKENS.Configuration.name,
      SERVICE_TOKENS.BackupService.name,
    ];

    return graph;
  }

  /**
   * Create a service registry for testing with mock services
   */
  static createTestRegistry(): ServiceRegistry {
    const registry = new ServiceRegistry();
    
    // Register mock services for testing
    registry.registerFactory(SERVICE_TOKENS.Configuration, () => ({
      async initialize() {},
      async dispose() {},
      getRootPath: () => '/test',
      getBlacklist: () => ['node_modules'],
      getPackages: () => [],
      getRunArgs: () => ({}),
      getMigr8RulesDir: () => './test-rules',
      getQueueDir: () => './test-queue',
      isDebugMode: () => false,
      isQuietMode: () => false,
      getLogLevel: () => 'info' as const,
      getIncludePatterns: () => ['**/*.{js,jsx,ts,tsx}'],
      getIgnorePatterns: () => ['**/node_modules/**'],
      getMemoryLimitMB: () => 512,
    }));

    return registry;
  }
}

// Global service registry instance
let globalRegistry: ServiceRegistry | null = null;

/**
 * Get the global service registry instance
 */
export function getServiceRegistry(): ServiceRegistry {
  if (!globalRegistry) {
    globalRegistry = new ServiceRegistry();
  }
  return globalRegistry;
}

/**
 * Initialize the global service registry
 */
export async function initializeServiceRegistry(): Promise<ServiceRegistry> {
  const registry = getServiceRegistry();
  await registry.initializeServices();
  return registry;
}

/**
 * Dispose the global service registry
 */
export async function disposeServiceRegistry(): Promise<void> {
  if (globalRegistry) {
    await globalRegistry.disposeServices();
    globalRegistry = null;
  }
}

/**
 * Reset the global service registry (useful for testing)
 */
export function resetServiceRegistry(): void {
  globalRegistry = null;
}
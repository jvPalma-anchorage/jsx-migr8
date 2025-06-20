/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import {
  ServiceRegistry,
  getServiceRegistry,
  initializeServiceRegistry,
  disposeServiceRegistry,
  resetServiceRegistry,
} from '../service-registry';
import { SERVICE_TOKENS } from '../types';

// Mock all service implementations
jest.mock('../../services/configuration.service', () => ({
  ConfigurationService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    dispose: jest.fn(),
    getRootPath: jest.fn().mockReturnValue('/test'),
    getBlacklist: jest.fn().mockReturnValue(['node_modules']),
    getPackages: jest.fn().mockReturnValue([]),
    getRunArgs: jest.fn().mockReturnValue({}),
    getMigr8RulesDir: jest.fn().mockReturnValue('./migr8Rules'),
    getQueueDir: jest.fn().mockReturnValue('./queue'),
    isDebugMode: jest.fn().mockReturnValue(false),
    isQuietMode: jest.fn().mockReturnValue(false),
  })),
}));

jest.mock('../../services/file.service', () => ({
  FileService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    dispose: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    fileExists: jest.fn(),
    glob: jest.fn(),
  })),
}));

jest.mock('../../services/ast.service', () => ({
  ASTService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    dispose: jest.fn(),
    parseFile: jest.fn(),
    printAST: jest.fn(),
    visitAST: jest.fn(),
  })),
}));

jest.mock('../../services/logger.service', () => ({
  LoggerService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    dispose: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../../services/analyzer.service', () => ({
  AnalyzerService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    dispose: jest.fn(),
    analyzeFile: jest.fn(),
    analyzeImports: jest.fn(),
    analyzeJSXUsage: jest.fn(),
  })),
}));

jest.mock('../../services/graph.service', () => ({
  GraphService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    dispose: jest.fn(),
    buildGraph: jest.fn(),
    buildGraphAsync: jest.fn(),
  })),
}));

jest.mock('../../services/migrator.service', () => ({
  MigratorService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    dispose: jest.fn(),
    migrateComponents: jest.fn(),
    applyRules: jest.fn(),
  })),
}));

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    resetServiceRegistry();
    registry = new ServiceRegistry();
  });

  afterEach(async () => {
    await registry.disposeServices();
    resetServiceRegistry();
  });

  describe('constructor', () => {
    it('should create registry instance', () => {
      expect(registry).toBeInstanceOf(ServiceRegistry);
    });

    it('should not be initialized by default', () => {
      expect((registry as any).initialized).toBe(false);
    });
  });

  describe('registerCoreServices', () => {
    it('should register all core services', () => {
      registry.registerCoreServices();

      expect(registry.isRegistered(SERVICE_TOKENS.Configuration)).toBe(true);
      expect(registry.isRegistered(SERVICE_TOKENS.LoggerService)).toBe(true);
      expect(registry.isRegistered(SERVICE_TOKENS.FileService)).toBe(true);
      expect(registry.isRegistered(SERVICE_TOKENS.ASTService)).toBe(true);
      expect(registry.isRegistered(SERVICE_TOKENS.AnalyzerService)).toBe(true);
      expect(registry.isRegistered(SERVICE_TOKENS.GraphService)).toBe(true);
      expect(registry.isRegistered(SERVICE_TOKENS.BackupService)).toBe(true);
      expect(registry.isRegistered(SERVICE_TOKENS.MigratorService)).toBe(true);
    });

    it('should throw error if services already registered', () => {
      registry.registerCoreServices();
      
      expect(() => registry.registerCoreServices()).toThrow('Services have already been registered');
    });

    it('should mark registry as initialized', () => {
      registry.registerCoreServices();
      
      expect((registry as any).initialized).toBe(true);
    });
  });

  describe('initializeServices', () => {
    it('should register services if not already registered', async () => {
      await registry.initializeServices();
      
      expect(registry.isRegistered(SERVICE_TOKENS.Configuration)).toBe(true);
    });

    it('should initialize all services in order', async () => {
      const initSpy = jest.fn();
      
      // Mock service with initialize method
      registry.registerFactory(SERVICE_TOKENS.Configuration, () => ({
        initialize: initSpy,
        dispose: jest.fn(),
      }));

      await registry.initializeServices();
      
      expect(initSpy).toHaveBeenCalled();
    });

    it('should handle services without initialize method', async () => {
      registry.registerFactory(SERVICE_TOKENS.Configuration, () => ({}));

      await expect(registry.initializeServices()).resolves.not.toThrow();
    });

    it('should throw error if service initialization fails', async () => {
      const error = new Error('Initialization failed');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      registry.registerFactory(SERVICE_TOKENS.Configuration, () => ({
        initialize: jest.fn().mockRejectedValue(error),
      }));

      await expect(registry.initializeServices()).rejects.toThrow(error);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Failed to initialize service ${SERVICE_TOKENS.Configuration.name}:`,
        error
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('disposeServices', () => {
    it('should dispose container', async () => {
      const disposeSpy = jest.spyOn(registry.getContainer(), 'dispose');
      
      await registry.disposeServices();
      
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('getContainer', () => {
    it('should return container instance', () => {
      const container = registry.getContainer();
      
      expect(container).toBeDefined();
      expect(typeof container.resolve).toBe('function');
    });

    it('should register services if not already initialized', () => {
      expect((registry as any).initialized).toBe(false);
      
      registry.getContainer();
      
      expect((registry as any).initialized).toBe(true);
    });
  });

  describe('resolve', () => {
    it('should resolve registered service', () => {
      registry.registerCoreServices();
      
      const configService = registry.resolve(SERVICE_TOKENS.Configuration);
      
      expect(configService).toBeDefined();
      expect(typeof configService.getRootPath).toBe('function');
    });

    it('should resolve services with dependencies', () => {
      registry.registerCoreServices();
      
      const astService = registry.resolve(SERVICE_TOKENS.ASTService);
      
      expect(astService).toBeDefined();
      expect(typeof astService.parseFile).toBe('function');
    });
  });

  describe('createScope', () => {
    it('should create scoped container', () => {
      const scope = registry.createScope();
      
      expect(scope).toBeDefined();
      expect(scope).not.toBe(registry.getContainer());
    });

    it('should inherit registrations from parent', () => {
      registry.registerCoreServices();
      const scope = registry.createScope();
      
      expect(scope.isRegistered(SERVICE_TOKENS.Configuration)).toBe(true);
    });
  });

  describe('registerService', () => {
    it('should register custom service as singleton', () => {
      class CustomService {
        getValue() { return 'custom'; }
      }
      
      const token = { name: 'CustomService' };
      registry.registerService(token, CustomService, 'singleton');
      
      expect(registry.isRegistered(token)).toBe(true);
      
      const instance1 = registry.resolve(token);
      const instance2 = registry.resolve(token);
      
      expect(instance1).toBe(instance2); // Singleton
    });

    it('should register custom service as transient', () => {
      class CustomService {
        constructor(public id: number = Math.random()) {}
      }
      
      const token = { name: 'CustomService' };
      registry.registerService(token, CustomService, 'transient');
      
      const instance1 = registry.resolve(token);
      const instance2 = registry.resolve(token);
      
      expect(instance1).not.toBe(instance2); // Different instances
    });

    it('should register custom service as scoped', () => {
      class CustomService {
        constructor(public id: number = Math.random()) {}
      }
      
      const token = { name: 'CustomService' };
      registry.registerService(token, CustomService, 'scoped');
      
      const instance1 = registry.resolve(token);
      const instance2 = registry.resolve(token);
      
      expect(instance1).toBe(instance2); // Same instance in scope
    });

    it('should default to singleton lifecycle', () => {
      class CustomService {}
      
      const token = { name: 'CustomService' };
      registry.registerService(token, CustomService);
      
      const instance1 = registry.resolve(token);
      const instance2 = registry.resolve(token);
      
      expect(instance1).toBe(instance2); // Singleton
    });
  });

  describe('registerFactory', () => {
    it('should register factory function', () => {
      const factory = jest.fn(() => ({ getValue: () => 'factory-value' }));
      const token = { name: 'FactoryService' };
      
      registry.registerFactory(token, factory, 'singleton');
      
      expect(registry.isRegistered(token)).toBe(true);
      
      const instance = registry.resolve(token);
      expect(instance.getValue()).toBe('factory-value');
      expect(factory).toHaveBeenCalledWith(registry.getContainer());
    });

    it('should support different lifecycles', () => {
      const factory = jest.fn(() => ({ id: Math.random() }));
      const token = { name: 'FactoryService' };
      
      registry.registerFactory(token, factory, 'transient');
      
      const instance1 = registry.resolve(token);
      const instance2 = registry.resolve(token);
      
      expect(instance1).not.toBe(instance2); // Different instances
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe('isRegistered', () => {
    it('should return false for unregistered service', () => {
      const token = { name: 'UnregisteredService' };
      
      expect(registry.isRegistered(token)).toBe(false);
    });

    it('should return true for registered service', () => {
      registry.registerCoreServices();
      
      expect(registry.isRegistered(SERVICE_TOKENS.Configuration)).toBe(true);
    });
  });

  describe('getRegistrations', () => {
    it('should return all registrations', () => {
      registry.registerCoreServices();
      
      const registrations = registry.getRegistrations();
      
      expect(registrations.length).toBeGreaterThan(0);
      expect(registrations.map(r => r.token.name)).toContain(SERVICE_TOKENS.Configuration.name);
    });
  });

  describe('validateDependencies', () => {
    it('should validate valid dependencies', () => {
      registry.registerCoreServices();
      
      const result = registry.validateDependencies();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect circular dependencies', () => {
      const tokenA = { name: 'ServiceA' };
      const tokenB = { name: 'ServiceB' };
      
      registry.registerFactory(tokenA, (container) => container.resolve(tokenB));
      registry.registerFactory(tokenB, (container) => container.resolve(tokenA));
      
      const result = registry.validateDependencies();
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Circular dependency detected');
    });

    it('should handle validation errors', () => {
      const token = { name: 'FailingService' };
      
      registry.registerFactory(token, () => {
        throw new Error('Service creation failed');
      });
      
      const result = registry.validateDependencies();
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getDependencyGraph', () => {
    it('should return dependency graph', () => {
      const graph = registry.getDependencyGraph();
      
      expect(graph).toHaveProperty(SERVICE_TOKENS.Configuration.name);
      expect(graph).toHaveProperty(SERVICE_TOKENS.FileService.name);
      expect(graph).toHaveProperty(SERVICE_TOKENS.ASTService.name);
      
      // Configuration has no dependencies
      expect(graph[SERVICE_TOKENS.Configuration.name]).toEqual([]);
      
      // FileService depends on Configuration
      expect(graph[SERVICE_TOKENS.FileService.name]).toContain(SERVICE_TOKENS.Configuration.name);
      
      // ASTService depends on FileService and LoggerService
      expect(graph[SERVICE_TOKENS.ASTService.name]).toContain(SERVICE_TOKENS.FileService.name);
      expect(graph[SERVICE_TOKENS.ASTService.name]).toContain(SERVICE_TOKENS.LoggerService.name);
    });
  });

  describe('createTestRegistry', () => {
    it('should create test registry with mock services', () => {
      const testRegistry = ServiceRegistry.createTestRegistry();
      
      expect(testRegistry).toBeInstanceOf(ServiceRegistry);
      expect(testRegistry.isRegistered(SERVICE_TOKENS.Configuration)).toBe(true);
      
      const configService = testRegistry.resolve(SERVICE_TOKENS.Configuration);
      expect(configService.getRootPath()).toBe('/test');
      expect(configService.getBlacklist()).toEqual(['node_modules']);
    });
  });
});

describe('global service registry functions', () => {
  beforeEach(() => {
    resetServiceRegistry();
  });

  afterEach(async () => {
    await disposeServiceRegistry();
  });

  describe('getServiceRegistry', () => {
    it('should return global registry instance', () => {
      const registry1 = getServiceRegistry();
      const registry2 = getServiceRegistry();
      
      expect(registry1).toBe(registry2); // Same instance
      expect(registry1).toBeInstanceOf(ServiceRegistry);
    });
  });

  describe('initializeServiceRegistry', () => {
    it('should initialize and return global registry', async () => {
      const registry = await initializeServiceRegistry();
      
      expect(registry).toBeInstanceOf(ServiceRegistry);
      expect(registry.isRegistered(SERVICE_TOKENS.Configuration)).toBe(true);
    });

    it('should call initializeServices on registry', async () => {
      const initSpy = jest.fn();
      
      // Mock the registry initialization
      jest.doMock('../service-registry', () => {
        const originalModule = jest.requireActual('../service-registry');
        return {
          ...originalModule,
          getServiceRegistry: () => ({
            initializeServices: initSpy,
          }),
        };
      });

      const { initializeServiceRegistry: mockInitialize } = await import('../service-registry');
      await mockInitialize();
      
      expect(initSpy).toHaveBeenCalled();
      
      jest.dontMock('../service-registry');
    });
  });

  describe('disposeServiceRegistry', () => {
    it('should dispose global registry', async () => {
      const registry = getServiceRegistry();
      const disposeSpy = jest.spyOn(registry, 'disposeServices');
      
      await disposeServiceRegistry();
      
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should reset global registry to null', async () => {
      getServiceRegistry(); // Create instance
      
      await disposeServiceRegistry();
      
      // New call should create new instance
      const newRegistry = getServiceRegistry();
      expect(newRegistry).toBeInstanceOf(ServiceRegistry);
    });

    it('should handle disposal when no registry exists', async () => {
      resetServiceRegistry(); // Ensure no global registry
      
      await expect(disposeServiceRegistry()).resolves.not.toThrow();
    });
  });

  describe('resetServiceRegistry', () => {
    it('should reset global registry', () => {
      const registry1 = getServiceRegistry();
      
      resetServiceRegistry();
      
      const registry2 = getServiceRegistry();
      expect(registry1).not.toBe(registry2); // Different instances
    });
  });
});

describe('service dependency integration', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    resetServiceRegistry();
    registry = new ServiceRegistry();
  });

  afterEach(async () => {
    await registry.disposeServices();
  });

  it('should resolve services with correct dependencies', () => {
    registry.registerCoreServices();
    
    // FileService should receive ConfigurationService
    const fileService = registry.resolve(SERVICE_TOKENS.FileService);
    expect(fileService).toBeDefined();
    
    // ASTService should receive FileService and LoggerService
    const astService = registry.resolve(SERVICE_TOKENS.ASTService);
    expect(astService).toBeDefined();
    
    // MigratorService should receive all its dependencies
    const migratorService = registry.resolve(SERVICE_TOKENS.MigratorService);
    expect(migratorService).toBeDefined();
  });

  it('should maintain singleton instances across resolutions', () => {
    registry.registerCoreServices();
    
    const config1 = registry.resolve(SERVICE_TOKENS.Configuration);
    const config2 = registry.resolve(SERVICE_TOKENS.Configuration);
    
    expect(config1).toBe(config2); // Same singleton instance
  });

  it('should handle complex dependency chains', () => {
    registry.registerCoreServices();
    
    // MigratorService depends on multiple services, which have their own dependencies
    const migratorService = registry.resolve(SERVICE_TOKENS.MigratorService);
    
    expect(migratorService).toBeDefined();
    expect(typeof migratorService.migrateComponents).toBe('function');
  });

  it('should handle backup service mock', () => {
    registry.registerCoreServices();
    
    const backupService = registry.resolve(SERVICE_TOKENS.BackupService);
    
    expect(backupService).toBeDefined();
    expect(typeof backupService.createBackup).toBe('function');
    expect(typeof backupService.listBackups).toBe('function');
  });
});

describe('error scenarios and edge cases', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    resetServiceRegistry();
    registry = new ServiceRegistry();
  });

  afterEach(async () => {
    await registry.disposeServices();
  });

  it('should handle service resolution failures', () => {
    const token = { name: 'NonExistentService' };
    
    expect(() => registry.resolve(token)).toThrow();
  });

  it('should handle malformed service tokens', () => {
    const malformedToken = { /* missing name */ } as any;
    
    expect(() => registry.isRegistered(malformedToken)).not.toThrow();
    expect(registry.isRegistered(malformedToken)).toBe(false);
  });

  it('should handle concurrent service registration', async () => {
    const promises = Array.from({ length: 10 }, (_, i) => 
      Promise.resolve().then(() => {
        const token = { name: `Service${i}` };
        registry.registerFactory(token, () => ({ id: i }));
        return registry.resolve(token);
      })
    );

    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(10);
    results.forEach((result, i) => {
      expect(result.id).toBe(i);
    });
  });

  it('should handle service initialization failures gracefully', async () => {
    const error = new Error('Service init failed');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    registry.registerFactory(SERVICE_TOKENS.Configuration, () => ({
      initialize: jest.fn().mockRejectedValue(error),
    }));

    await expect(registry.initializeServices()).rejects.toThrow(error);
    
    consoleSpy.mockRestore();
  });

  it('should handle large number of services', () => {
    // Register 100 services
    for (let i = 0; i < 100; i++) {
      const token = { name: `Service${i}` };
      registry.registerFactory(token, () => ({ id: i }));
    }
    
    const registrations = registry.getRegistrations();
    expect(registrations.length).toBe(100);
    
    // Resolve all services
    for (let i = 0; i < 100; i++) {
      const token = { name: `Service${i}` };
      const service = registry.resolve(token);
      expect(service.id).toBe(i);
    }
  });

  it('should handle circular dependency validation with deep chains', () => {
    // Create a chain of 10 services with circular dependency
    const tokens = Array.from({ length: 10 }, (_, i) => ({ name: `Service${i}` }));
    
    tokens.forEach((token, i) => {
      const nextToken = tokens[(i + 1) % tokens.length]; // Circular reference
      registry.registerFactory(token, (container) => ({
        dependency: container.resolve(nextToken),
      }));
    });
    
    const result = registry.validateDependencies();
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle service disposal errors', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const disposeSpy = jest.fn().mockRejectedValue(new Error('Disposal failed'));
    
    registry.registerFactory(SERVICE_TOKENS.Configuration, () => ({
      initialize: jest.fn(),
      dispose: disposeSpy,
    }));
    
    registry.resolve(SERVICE_TOKENS.Configuration); // Create instance
    
    await registry.disposeServices();
    
    expect(disposeSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});
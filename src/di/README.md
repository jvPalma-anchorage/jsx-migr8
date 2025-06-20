# Dependency Injection Architecture

This document describes the dependency injection (DI) architecture implemented in jsx-migr8 to reduce tight coupling and improve testability.

## Overview

The DI architecture consists of:

- **Service Container**: Manages service registration and resolution
- **Service Registry**: Centralized service registration and lifecycle management
- **Service Interfaces**: Abstract contracts for all major components
- **Service Implementations**: Concrete implementations of service interfaces
- **Factory Patterns**: For creating AST processors and other complex objects

## Core Components

### Service Container (`src/di/container.ts`)

The `ServiceContainer` is a lightweight DI container that supports:

- **Singleton Services**: Single instance per container
- **Transient Services**: New instance per resolution
- **Scoped Services**: Single instance per scope
- **Factory Functions**: Custom creation logic
- **Dependency Resolution**: Automatic constructor injection
- **Circular Dependency Detection**: Prevents infinite loops
- **Service Lifecycle**: Initialize and dispose hooks

```typescript
import { createContainer, register, SERVICE_TOKENS } from './di';

const container = createContainer();

// Register services
register(container, SERVICE_TOKENS.FileService)
  .asSingleton(FileService);

// Resolve services
const fileService = container.resolve(SERVICE_TOKENS.FileService);
```

### Service Registry (`src/di/service-registry.ts`)

The `ServiceRegistry` manages all service registrations and provides:

- **Core Service Registration**: Automatically registers all core services
- **Dependency Validation**: Checks for circular dependencies
- **Service Initialization**: Manages service lifecycle
- **Scoped Containers**: For testing and isolation
- **Health Checking**: Validates service health

```typescript
import { getServiceRegistry, initializeServiceRegistry } from './di';

// Initialize all services
await initializeServiceRegistry();

// Get the global registry
const registry = getServiceRegistry();

// Resolve services
const fileService = registry.resolve(SERVICE_TOKENS.FileService);
```

## Service Interfaces

### Core Services

#### IConfigurationService
Manages application configuration and environment settings.

```typescript
interface IConfigurationService {
  getRootPath(): string;
  getBlacklist(): string[];
  isDebugMode(): boolean;
  getLogLevel(): 'debug' | 'info' | 'warn' | 'error';
  // ... more methods
}
```

#### IFileService
Handles all file system operations.

```typescript
interface IFileService {
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  glob(pattern: string, options?: any): Promise<string[]>;
  // ... more methods
}
```

#### IASTService
Manages AST parsing and manipulation.

```typescript
interface IASTService {
  parseFile(filePath: string): Promise<{ ast: any; code: string }>;
  printAST(ast: any): string;
  visitAST(ast: any, visitors: any): void;
  // ... more methods
}
```

#### IAnalyzerService
Provides code analysis capabilities.

```typescript
interface IAnalyzerService {
  analyzeFile(filePath: string): Promise<boolean>;
  analyzeImports(filePath: string): Promise<any[]>;
  analyzeJSXUsage(filePath: string): Promise<any[]>;
  // ... more methods
}
```

#### IGraphService
Builds and manages project graphs.

```typescript
interface IGraphService {
  buildGraph(rootPath: string, blacklist: string[]): Promise<any>;
  buildGraphAsync(...): Promise<{ graph: any; errors: any[] }>;
  // ... more methods
}
```

#### IMigratorService
Handles code migration operations.

```typescript
interface IMigratorService {
  migrateComponents(options: any): Promise<string | void>;
  applyRules(filePath: string, rules: any): Promise<any>;
  // ... more methods
}
```

#### ILoggerService
Provides structured logging.

```typescript
interface ILoggerService {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  // ... more methods
}
```

## Service Implementations

### Configuration Service (`src/services/configuration.service.ts`)
- Reads environment variables and CLI arguments
- Provides typed configuration access
- Validates configuration values
- Supports different environments (dev/prod/test)

### File Service (`src/services/file.service.ts`)
- Abstracts file system operations
- Provides async and sync methods
- Handles batch operations
- Includes path utilities and validation

### AST Service (`src/services/ast.service.ts`)
- Wraps Recast for AST operations
- Provides helper methods for common operations
- Handles different file types (JS/TS/JSX/TSX)
- Includes AST validation and transformation

### Analyzer Service (`src/services/analyzer.service.ts`)
- Analyzes imports and JSX usage
- Provides batch analysis capabilities
- Generates component summaries
- Tracks prop usage patterns

### Graph Service (`src/services/graph.service.ts`)
- Builds project dependency graphs
- Supports async and batched processing
- Provides graph statistics and querying
- Memory-efficient for large codebases

### Migrator Service (`src/services/migrator.service.ts`)
- Applies migration rules to code
- Supports dry-run mode
- Integrates with backup system
- Provides migration impact analysis

### Logger Service (`src/services/logger.service.ts`)
- Structured logging with levels
- Colored output for CLI
- Performance and memory tracking
- Context-aware logging

## Factory Patterns

### AST Processor Factory (`src/factories/ast-processor.factory.ts`)

Creates specialized AST processors for different transformation tasks:

```typescript
import { createASTProcessorFactory } from './factories/ast-processor.factory';

const factory = createASTProcessorFactory(container);

// Create processors
const importProcessor = factory.create('import');
const jsxProcessor = factory.create('jsx');
const migrationProcessor = factory.create('migration');

// Process AST
const imports = await importProcessor.process(ast, context);
```

#### Available Processors

- **ImportProcessor**: Extracts import declarations
- **JSXProcessor**: Analyzes JSX elements and props
- **MigrationProcessor**: Applies transformation rules

#### Processor Pipeline

```typescript
const pipeline = new ProcessorPipeline(factory)
  .addStep('analyze', 'import')
  .addStep('transform', 'migration')
  .addStep('validate', 'jsx');

const result = await pipeline.execute(ast, context);
```

## DI Context (`src/context/di-context.ts`)

The `DIContext` replaces the old global context with a DI-based approach:

```typescript
import { getDIContext, initDIContext } from './context/di-context';

// Initialize context
await initDIContext({
  useAsync: true,
  onProgress: (completed, total) => console.log(`${completed}/${total}`)
});

// Get context
const context = getDIContext();

// Resolve services
const fileService = context.resolve(SERVICE_TOKENS.FileService);

// Get state
const state = context.getState();
const graph = context.getGraph();
```

### Backward Compatibility

The DI context includes a legacy adapter for backward compatibility:

```typescript
import { getContext, getRootPath, getLoggers } from './context/di-context';

// These work the same as before
const state = getContext();
const rootPath = getRootPath();
const { logger, lSuccess, lError } = getLoggers();
```

## CLI Integration (`src/cli/di-cli.ts`)

The new DI-based CLI provides:

- Service health checking
- Dependency visualization
- Performance monitoring
- Graceful shutdown
- Error recovery

```typescript
import { runDICLI } from './cli/di-cli';

// Run the CLI
await runDICLI();
```

### CLI Features

- **Health Check**: Validates all service health
- **Service Info**: Shows dependency graph
- **Performance Stats**: Service resolution times
- **Graceful Shutdown**: Proper resource cleanup

## Testing Support

### Test Registry

```typescript
import { ServiceRegistry } from './di';

const testRegistry = ServiceRegistry.createTestRegistry();
await testRegistry.initializeServices();

// Use mock services for testing
const mockFileService = testRegistry.resolve(SERVICE_TOKENS.FileService);
```

### Mock Services

```typescript
import { DITestUtils } from './di';

const mockService = DITestUtils.createMockService({
  readFile: async () => 'mock content',
  writeFile: async () => {},
});
```

### Scoped Testing

```typescript
const testContext = context.createScope();
// Use testContext for isolated tests
```

## Performance Monitoring

### Service Resolution Tracking

```typescript
import { DIPerformanceMonitor } from './di';

const monitor = new DIPerformanceMonitor();
const endTimer = monitor.startResolution('FileService');
// ... service operations
endTimer();

const stats = monitor.getStatistics();
console.log(stats.FileService); // { average: 2.5, min: 1, max: 5, count: 10 }
```

### Health Monitoring

```typescript
import { ServiceHealthChecker } from './di';

const healthChecker = new ServiceHealthChecker(container);
const health = await healthChecker.checkServiceHealth();

console.log(health.healthy); // true/false
console.log(health.services); // per-service health status
```

## Service Lifecycle

### Initialization Order

Services are initialized in dependency order:

1. Configuration Service
2. Logger Service
3. File Service
4. AST Service
5. Analyzer Service
6. Graph Service
7. Backup Service
8. Migrator Service

### Disposal

Services are disposed in reverse order during shutdown:

```typescript
// Automatic disposal
await context.dispose();

// Manual disposal
await container.dispose();
```

### Health Checks

Services can implement health checks:

```typescript
class MyService implements IService {
  async healthCheck(): Promise<boolean> {
    // Check service health
    return true;
  }
}
```

## Configuration

### Service Lifecycle

Services can configure their lifecycle:

```typescript
register(container, SERVICE_TOKENS.MyService)
  .asSingleton(MyService); // One instance

register(container, SERVICE_TOKENS.MyService)
  .asTransient(MyService); // New instance each time

register(container, SERVICE_TOKENS.MyService)
  .asScoped(MyService); // One instance per scope
```

### Factory Registration

```typescript
register(container, SERVICE_TOKENS.MyService)
  .asSingleton(container => new MyService(
    container.resolve(SERVICE_TOKENS.Configuration),
    'custom-param'
  ));
```

## Migration Guide

### From Global Context

Before:
```typescript
import { getContext, lSuccess } from '../context/globalContext';

const state = getContext();
lSuccess('Operation completed');
```

After:
```typescript
import { getDIContext, SERVICE_TOKENS } from '../di';

const context = getDIContext();
const loggerService = context.resolve(SERVICE_TOKENS.LoggerService);
const state = context.getState();

loggerService.success('Operation completed');
```

### From Direct Imports

Before:
```typescript
import { buildGraph } from '../graph/buildGraph';
import { analyzeFile } from '../analyzer/fileAnalyzer';

const graph = buildGraph(rootPath, blacklist);
const result = analyzeFile(filePath);
```

After:
```typescript
import { getDIContext, SERVICE_TOKENS } from '../di';

const context = getDIContext();
const graphService = context.resolve(SERVICE_TOKENS.GraphService);
const analyzerService = context.resolve(SERVICE_TOKENS.AnalyzerService);

const graph = await graphService.buildGraph(rootPath, blacklist);
const result = await analyzerService.analyzeFile(filePath);
```

## Best Practices

### Service Design

1. **Single Responsibility**: Each service should have a single, well-defined purpose
2. **Interface Segregation**: Keep interfaces focused and minimal
3. **Dependency Injection**: Inject dependencies through constructor
4. **Async Operations**: Prefer async methods for I/O operations
5. **Error Handling**: Provide meaningful error messages and recovery

### Registration

1. **Use Tokens**: Always use service tokens for type safety
2. **Appropriate Lifecycle**: Choose the right lifecycle for each service
3. **Validate Dependencies**: Ensure dependencies are registered before dependents
4. **Factory for Complex**: Use factories for services requiring complex initialization

### Testing

1. **Mock Dependencies**: Use mock implementations for testing
2. **Scoped Containers**: Create scoped containers for isolated tests
3. **Integration Tests**: Test service interactions
4. **Health Checks**: Implement health checks for monitoring

### Performance

1. **Lazy Loading**: Initialize services only when needed
2. **Singleton for Expensive**: Use singleton lifecycle for expensive-to-create services
3. **Monitor Resolution**: Track service resolution performance
4. **Memory Management**: Implement proper disposal for resource cleanup

## Troubleshooting

### Common Issues

1. **Circular Dependencies**: Check dependency graph and break cycles
2. **Service Not Found**: Ensure service is registered before resolution
3. **Initialization Errors**: Check service dependencies and initialization order
4. **Memory Leaks**: Ensure proper disposal of services and resources

### Debugging

1. **Enable Debug Logging**: Set log level to debug for detailed information
2. **Health Checks**: Use health checks to identify failing services
3. **Dependency Graph**: Visualize dependencies to understand relationships
4. **Performance Monitoring**: Track service resolution times

### Error Recovery

1. **Graceful Degradation**: Provide fallback behavior for failed services
2. **Retry Logic**: Implement retry mechanisms for transient failures
3. **Circuit Breaker**: Prevent cascading failures
4. **Health Monitoring**: Continuously monitor service health

## Future Enhancements

1. **Plugin System**: Support for third-party service plugins
2. **Configuration Validation**: Schema-based configuration validation
3. **Service Discovery**: Automatic service registration
4. **Metrics Collection**: Advanced performance and usage metrics
5. **Distributed Services**: Support for remote service resolution
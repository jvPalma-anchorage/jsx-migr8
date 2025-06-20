/**
 * Example integration showing how to use the new DI architecture
 * This file demonstrates the migration from the old tightly-coupled approach
 * to the new dependency injection pattern.
 */

import {
  getDIContext,
  initDIContext,
  SERVICE_TOKENS,
  IConfigurationService,
  ILoggerService,
  IFileService,
  IGraphService,
  IAnalyzerService,
  IMigratorService,
} from './di';
import { createASTProcessorFactory } from './factories/ast-processor.factory';
import { runDICLI } from './cli/di-cli';

// ============================================================================
// EXAMPLE 1: Basic Service Resolution
// ============================================================================

async function basicServiceExample() {
  // Initialize the DI context
  await initDIContext();
  
  // Get the global context
  const context = getDIContext();
  
  // Resolve services using tokens
  const configService = context.resolve<IConfigurationService>(SERVICE_TOKENS.Configuration);
  const loggerService = context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
  const fileService = context.resolve<IFileService>(SERVICE_TOKENS.FileService);
  
  // Use services
  const rootPath = configService.getRootPath();
  loggerService.info(`Project root: ${rootPath}`);
  
  const files = await fileService.findJSXFiles(rootPath);
  loggerService.info(`Found ${files.length} JSX files`);
}

// ============================================================================
// EXAMPLE 2: Graph Building and Analysis
// ============================================================================

async function graphAnalysisExample() {
  await initDIContext({
    useAsync: true,
    useBatched: false,
    onProgress: (completed, total, info) => {
      console.log(`Progress: ${completed}/${total} ${info || ''}`);
    },
    onError: (error) => {
      console.error(`Error: ${error.message}`);
    },
  });
  
  const context = getDIContext();
  const analyzerService = context.resolve<IAnalyzerService>(SERVICE_TOKENS.AnalyzerService);
  const loggerService = context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
  
  // Get the built graph
  const graph = context.getGraph();
  if (!graph) {
    loggerService.error('No graph data available');
    return;
  }
  
  // Generate component summary
  const summary = await analyzerService.generateComponentSummary(graph);
  loggerService.info(`Component summary generated for ${Object.keys(summary || {}).length} packages`);
  
  // Analyze specific components
  const configService = context.resolve<IConfigurationService>(SERVICE_TOKENS.Configuration);
  const usage = await analyzerService.findComponentUsage(
    configService.getRootPath(),
    'Button',
    '@mui/material'
  );
  
  loggerService.info(`Button component used in ${usage.files.length} files, ${usage.usageCount} times`);
}

// ============================================================================
// EXAMPLE 3: Code Migration with DI
// ============================================================================

async function migrationExample() {
  await initDIContext();
  
  const context = getDIContext();
  const migratorService = context.resolve<IMigratorService>(SERVICE_TOKENS.MigratorService);
  const loggerService = context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
  
  const graph = context.getGraph();
  if (!graph) {
    loggerService.error('No graph data available for migration');
    return;
  }
  
  // Dry run migration
  loggerService.info('Starting dry run migration...');
  const dryRunResult = await migratorService.migrateComponents({
    dryRun: true,
    changeCode: false,
    graph,
  });
  
  if (typeof dryRunResult === 'string') {
    loggerService.info(`Dry run result: ${dryRunResult}`);
  }
  
  // Actual migration (commented out for safety)
  /*
  loggerService.info('Starting actual migration...');
  const migrationResult = await migratorService.migrateComponents({
    dryRun: false,
    changeCode: true,
    graph,
  });
  
  if (typeof migrationResult === 'string') {
    loggerService.info(`Migration result: ${migrationResult}`);
  }
  */
}

// ============================================================================
// EXAMPLE 4: AST Processing with Factory Pattern
// ============================================================================

async function astProcessingExample() {
  await initDIContext();
  
  const context = getDIContext();
  const container = context.getContainer();
  const loggerService = context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
  
  // Create AST processor factory
  const factory = createASTProcessorFactory(container);
  
  // List available processors
  const processors = factory.getAvailableProcessors();
  loggerService.info(`Available processors: ${processors.join(', ')}`);
  
  // Example file analysis
  const filePath = '/example/Component.tsx';
  const astService = context.resolve(SERVICE_TOKENS.ASTService);
  
  try {
    const { ast } = await astService.parseFile(filePath);
    
    // Find suitable processors
    const suitableProcessors = factory.findSuitableProcessors(ast, { filePath });
    loggerService.info(`Suitable processors for ${filePath}: ${suitableProcessors.map(p => p.name).join(', ')}`);
    
    // Process with multiple processors
    const results = await factory.processParallel(ast, ['import', 'jsx'], { filePath });
    
    results.forEach(({ processor, result, error }) => {
      if (error) {
        loggerService.error(`Processor ${processor} failed:`, error);
      } else {
        loggerService.info(`Processor ${processor} found ${Array.isArray(result) ? result.length : 1} items`);
      }
    });
    
  } catch (error) {
    loggerService.error(`Failed to analyze ${filePath}:`, error);
  }
}

// ============================================================================
// EXAMPLE 5: Service Health Monitoring
// ============================================================================

async function healthMonitoringExample() {
  await initDIContext();
  
  const context = getDIContext();
  const loggerService = context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
  
  // Check overall system health
  const health = await context.healthCheck();
  
  loggerService.info(`System health: ${health.healthy ? 'Healthy' : 'Unhealthy'}`);
  
  Object.entries(health.services).forEach(([serviceName, serviceHealth]) => {
    const status = serviceHealth.status;
    const message = `${serviceName}: ${status}`;
    
    if (status === 'healthy') {
      loggerService.success(message);
    } else if (status === 'unhealthy') {
      loggerService.error(`${message} - ${serviceHealth.error}`);
    } else {
      loggerService.warn(message);
    }
  });
  
  // Validate dependencies
  const validation = context.validateDependencies();
  if (validation.valid) {
    loggerService.success('All service dependencies are valid');
  } else {
    loggerService.error('Dependency validation failed:');
    validation.errors.forEach(error => loggerService.error(`  - ${error}`));
  }
  
  // Show dependency graph
  const depGraph = context.getDependencyGraph();
  loggerService.info('Service dependency graph:');
  Object.entries(depGraph).forEach(([service, deps]) => {
    loggerService.info(`  ${service} -> [${deps.join(', ')}]`);
  });
}

// ============================================================================
// EXAMPLE 6: Testing with DI
// ============================================================================

async function testingExample() {
  const { ServiceRegistry, DITestUtils } = await import('./di');
  
  // Create test registry with mock services
  const testRegistry = ServiceRegistry.createTestRegistry();
  
  // Add custom mock
  testRegistry.registerFactory(SERVICE_TOKENS.FileService, () => 
    DITestUtils.createMockService({
      async readFile(path: string) {
        return `// Mock content for ${path}`;
      },
      async writeFile(path: string, content: string) {
        console.log(`Mock write to ${path}: ${content.length} chars`);
      },
      async glob(pattern: string) {
        return [`/mock/file1.tsx`, `/mock/file2.jsx`];
      },
    })
  );
  
  await testRegistry.initializeServices();
  
  const container = testRegistry.getContainer();
  const fileService = container.resolve(SERVICE_TOKENS.FileService);
  
  // Use mock service
  const content = await fileService.readFile('/test/file.tsx');
  console.log('Mock file content:', content);
  
  const files = await fileService.glob('**/*.tsx');
  console.log('Mock glob result:', files);
}

// ============================================================================
// EXAMPLE 7: Backward Compatibility
// ============================================================================

async function backwardCompatibilityExample() {
  // Initialize DI context
  await initDIContext();
  
  // Use old-style imports (these work with DI under the hood)
  const { getContext, getRootPath, lSuccess, lError } = await import('./context/di-context');
  
  // These function calls look the same but use DI internally
  const state = getContext();
  const rootPath = getRootPath();
  
  lSuccess('This message is logged through the DI logger service');
  lError('This error is also logged through DI');
  
  console.log('Root path:', rootPath);
  console.log('Graph available:', !!state.graph);
}

// ============================================================================
// EXAMPLE 8: CLI Integration
// ============================================================================

async function cliExample() {
  // The new DI-based CLI can be run directly
  await runDICLI();
  
  // Or create a CLI instance for testing
  const { createTestCLI } = await import('./cli/di-cli');
  const testCli = createTestCLI();
  
  // Initialize for testing
  await testCli.initialize();
  
  console.log('CLI initialized with DI services');
}

// ============================================================================
// EXAMPLE 9: Performance Monitoring
// ============================================================================

async function performanceExample() {
  const { DIPerformanceMonitor } = await import('./di');
  
  await initDIContext();
  
  const context = getDIContext();
  const monitor = new DIPerformanceMonitor();
  
  // Monitor service resolution
  const endTimer = monitor.startResolution('FileService');
  const fileService = context.resolve(SERVICE_TOKENS.FileService);
  endTimer();
  
  // Get performance statistics
  const stats = monitor.getPerformanceStats();
  console.log('Performance stats:', stats);
}

// ============================================================================
// EXAMPLE 10: Error Handling and Recovery
// ============================================================================

async function errorHandlingExample() {
  try {
    await initDIContext();
    
    const context = getDIContext();
    const loggerService = context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
    
    // Simulate service operation that might fail
    try {
      const fileService = context.resolve<IFileService>(SERVICE_TOKENS.FileService);
      await fileService.readFile('/nonexistent/file.txt');
    } catch (error) {
      loggerService.error('File operation failed:', error);
      
      // Graceful degradation - provide fallback behavior
      loggerService.warn('Using fallback behavior for missing file');
    }
    
    // Health check after error
    const health = await context.healthCheck();
    if (!health.healthy) {
      loggerService.error('System health compromised after error');
      
      // Could trigger recovery actions here
      loggerService.info('Initiating recovery procedures...');
    }
    
  } catch (error) {
    console.error('Critical system error:', error);
    
    // Ensure cleanup even in error scenarios
    try {
      const context = getDIContext();
      await context.dispose();
    } catch (disposeError) {
      console.error('Error during cleanup:', disposeError);
    }
  }
}

// ============================================================================
// Main Example Runner
// ============================================================================

async function runExamples() {
  console.log('='.repeat(60));
  console.log('jsx-migr8 Dependency Injection Examples');
  console.log('='.repeat(60));
  
  const examples = [
    { name: 'Basic Service Resolution', fn: basicServiceExample },
    { name: 'Graph Building and Analysis', fn: graphAnalysisExample },
    { name: 'Code Migration', fn: migrationExample },
    { name: 'AST Processing', fn: astProcessingExample },
    { name: 'Health Monitoring', fn: healthMonitoringExample },
    { name: 'Testing with Mocks', fn: testingExample },
    { name: 'Backward Compatibility', fn: backwardCompatibilityExample },
    { name: 'Performance Monitoring', fn: performanceExample },
    { name: 'Error Handling', fn: errorHandlingExample },
  ];
  
  for (const example of examples) {
    console.log(`\n--- ${example.name} ---`);
    try {
      await example.fn();
      console.log('✓ Example completed successfully');
    } catch (error) {
      console.error('✗ Example failed:', error);
    }
    
    // Clean up between examples
    try {
      const { disposeDIContext } = await import('./context/di-context');
      await disposeDIContext();
    } catch {
      // Ignore cleanup errors
    }
  }
  
  console.log('\n='.repeat(60));
  console.log('All examples completed');
  console.log('='.repeat(60));
}

// Export for use in other files
export {
  basicServiceExample,
  graphAnalysisExample,
  migrationExample,
  astProcessingExample,
  healthMonitoringExample,
  testingExample,
  backwardCompatibilityExample,
  cliExample,
  performanceExample,
  errorHandlingExample,
  runExamples,
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(error => {
    console.error('Example runner failed:', error);
    process.exit(1);
  });
}
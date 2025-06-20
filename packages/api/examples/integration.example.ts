#!/usr/bin/env node

/**
 * Example of programmatic integration with jsx-migr8 API
 * This shows how to embed the API server in your own application
 */

import { ServiceRegistry, getServiceRegistry } from '../../../src/di/service-registry';
import { API_SERVICE_TOKENS, IApiService, IWebSocketService, IProjectManagerService } from '../src/types/service.types';
import { ApiService } from '../src/services/api.service';
import { WebSocketService } from '../src/websocket/websocket.service';
import { ProjectManagerService } from '../src/services/project-manager.service';
import { SERVICE_TOKENS } from '../../../src/di/types';

async function createApiServer(): Promise<{
  api: IApiService;
  projectManager: IProjectManagerService;
  wsService: IWebSocketService;
  registry: ServiceRegistry;
}> {
  // Initialize core service registry
  const registry = getServiceRegistry();
  await registry.initializeServices();

  // Register API-specific services
  const container = registry.getContainer();

  // Register WebSocket service
  registry.registerFactory(
    API_SERVICE_TOKENS.WebSocketService,
    (container) => new WebSocketService(
      container.resolve(SERVICE_TOKENS.LoggerService)
    ),
    'singleton'
  );

  // Register Project Manager service
  registry.registerFactory(
    API_SERVICE_TOKENS.ProjectManagerService,
    (container) => new ProjectManagerService(
      container.resolve(SERVICE_TOKENS.LoggerService),
      registry
    ),
    'singleton'
  );

  // Register API service
  registry.registerFactory(
    API_SERVICE_TOKENS.ApiService,
    (container) => new ApiService(
      container.resolve(SERVICE_TOKENS.LoggerService),
      container.resolve(API_SERVICE_TOKENS.WebSocketService),
      container.resolve(API_SERVICE_TOKENS.ProjectManagerService)
    ),
    'singleton'
  );

  // Initialize services
  const wsService = container.resolve(API_SERVICE_TOKENS.WebSocketService);
  await wsService.initialize();

  const projectManager = container.resolve(API_SERVICE_TOKENS.ProjectManagerService);
  await projectManager.initialize();

  const api = container.resolve(API_SERVICE_TOKENS.ApiService);
  await api.initialize();

  return { api, projectManager, wsService, registry };
}

async function runMigrationProgrammatically() {
  console.log('Creating jsx-migr8 API server programmatically...\n');

  const { api, projectManager, wsService, registry } = await createApiServer();

  try {
    // Start the API server
    await api.start(3001);
    console.log(`✅ API server started at ${api.getUrl()}`);

    // Create a project programmatically
    const projectId = await projectManager.createProject({
      rootPath: './test-projects/simple-react-app',
      blacklist: ['node_modules', '.git'],
    });
    console.log(`✅ Project created: ${projectId}`);

    // Get the project container and services
    const project = projectManager.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const graphService = project.container.resolve(SERVICE_TOKENS.GraphService);
    const analyzerService = project.container.resolve(SERVICE_TOKENS.AnalyzerService);
    const migratorService = project.container.resolve(SERVICE_TOKENS.MigratorService);

    console.log('\n📊 Building dependency graph...');
    const graph = await graphService.buildGraph(
      project.config.rootPath,
      project.config.blacklist || []
    );
    console.log(`✅ Found ${Object.keys(graph).length} files`);

    console.log('\n🔍 Analyzing components...');
    const componentSummary = await analyzerService.generateComponentSummary(graph);
    console.log(`✅ Found ${Object.keys(componentSummary).length} components`);

    console.log('\n🚀 Running dry-run migration...');
    
    // Set up WebSocket listener for progress
    const progressHandler = (message: any) => {
      if (message.type === 'progress') {
        const progress = message.data;
        console.log(`Progress: ${progress.phase} - ${progress.progress}%`);
      }
    };

    // Simulate WebSocket client subscription
    wsService.broadcast(projectId, {
      type: 'progress',
      data: {
        projectId,
        phase: 'initializing',
        progress: 0,
        filesProcessed: 0,
        totalFiles: Object.keys(graph).length,
      },
    });

    // Run migration
    const result = await migratorService.migrateComponents({
      dryRun: true,
      changeCode: false,
    });

    console.log('\n✅ Migration completed!');
    console.log('Result:', result);

    // Clean up
    console.log('\n🧹 Cleaning up...');
    projectManager.deleteProject(projectId);
    await api.stop();
    await registry.disposeServices();

    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    await api.stop();
    await registry.disposeServices();
    process.exit(1);
  }
}

// Example: Custom migration workflow
async function customWorkflow() {
  console.log('Running custom migration workflow...\n');

  const { api, projectManager, registry } = await createApiServer();

  try {
    // Start API on custom port
    await api.start(4000);

    // Create multiple projects
    const projects = await Promise.all([
      projectManager.createProject({
        rootPath: './test-projects/project1',
        blacklist: ['node_modules'],
      }),
      projectManager.createProject({
        rootPath: './test-projects/project2',
        blacklist: ['node_modules'],
      }),
    ]);

    console.log(`Created ${projects.length} projects`);

    // Process each project
    for (const projectId of projects) {
      const project = projectManager.getProject(projectId);
      if (!project) continue;

      console.log(`\nProcessing project: ${project.config.rootPath}`);
      
      // Your custom logic here
      const graphService = project.container.resolve(SERVICE_TOKENS.GraphService);
      const graph = await graphService.buildGraph(
        project.config.rootPath,
        project.config.blacklist || []
      );
      
      console.log(`  Files: ${Object.keys(graph).length}`);
    }

    // Clean up
    await api.stop();
    await registry.disposeServices();
  } catch (error) {
    console.error('Error in custom workflow:', error);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const mode = process.argv[2] || 'basic';
  
  switch (mode) {
    case 'custom':
      customWorkflow();
      break;
    case 'basic':
    default:
      runMigrationProgrammatically();
      break;
  }
}
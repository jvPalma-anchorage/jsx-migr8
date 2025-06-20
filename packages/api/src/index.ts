#!/usr/bin/env node

import { ServiceRegistry, getServiceRegistry } from '../../../src/di/service-registry';
import { API_SERVICE_TOKENS } from './types/service.types';
import { ApiService } from './services/api.service';
import { WebSocketService } from './websocket/websocket.service';
import { ProjectManagerService } from './services/project-manager.service';
import { SERVICE_TOKENS } from '../../../src/di/types';

async function startApiServer() {
  console.log('Starting jsx-migr8 API server...');

  try {
    // Initialize core service registry
    const registry = getServiceRegistry();
    await registry.initializeServices();

    // Register API-specific services
    const container = registry.getContainer();
    const logger = container.resolve(SERVICE_TOKENS.LoggerService);

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

    // Initialize API services
    const wsService = container.resolve(API_SERVICE_TOKENS.WebSocketService);
    await wsService.initialize();

    const projectManager = container.resolve(API_SERVICE_TOKENS.ProjectManagerService);
    await projectManager.initialize();

    const apiService = container.resolve(API_SERVICE_TOKENS.ApiService);
    await apiService.initialize();

    // Start the server
    const port = parseInt(process.env.PORT || '3000', 10);
    await apiService.start(port);

    console.log(`✨ jsx-migr8 API server is running at http://localhost:${port}`);
    console.log(`📡 WebSocket server is available at ws://localhost:${port}/ws`);
    console.log(`\nAPI Endpoints:`);
    console.log(`  POST   /api/projects          - Create a new project`);
    console.log(`  GET    /api/projects          - List all projects`);
    console.log(`  GET    /api/projects/:id      - Get project details`);
    console.log(`  POST   /api/projects/:id/analyze - Analyze project components`);
    console.log(`  POST   /api/projects/:id/migrate - Start migration (dry-run or real)`);
    console.log(`  GET    /api/migration/rules   - Get available migration rules`);
    console.log(`  POST   /api/migration/rules   - Create a new migration rule`);
    console.log(`  GET    /api/migration/tasks/:taskId - Get migration task status`);
    console.log(`\nPress Ctrl+C to stop the server`);

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
      console.log('\nShutting down API server...');
      try {
        await apiService.stop();
        await registry.disposeServices();
        console.log('API server stopped successfully');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down...');
      await apiService.stop();
      await registry.disposeServices();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start API server:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startApiServer();
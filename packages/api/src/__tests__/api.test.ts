import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { ServiceRegistry } from '../../../../src/di/service-registry';
import { API_SERVICE_TOKENS } from '../types/service.types';
import { ApiService } from '../services/api.service';
import { WebSocketService } from '../websocket/websocket.service';
import { ProjectManagerService } from '../services/project-manager.service';
import { SERVICE_TOKENS } from '../../../../src/di/types';

describe('API Server', () => {
  let registry: ServiceRegistry;
  let apiService: any;

  beforeAll(async () => {
    // Create test registry
    registry = ServiceRegistry.createTestRegistry();
    
    // Register API services
    registry.registerFactory(
      API_SERVICE_TOKENS.WebSocketService,
      (container) => new WebSocketService(
        container.resolve(SERVICE_TOKENS.LoggerService)
      ),
      'singleton'
    );

    registry.registerFactory(
      API_SERVICE_TOKENS.ProjectManagerService,
      (container) => new ProjectManagerService(
        container.resolve(SERVICE_TOKENS.LoggerService),
        registry
      ),
      'singleton'
    );

    registry.registerFactory(
      API_SERVICE_TOKENS.ApiService,
      (container) => new ApiService(
        container.resolve(SERVICE_TOKENS.LoggerService),
        container.resolve(API_SERVICE_TOKENS.WebSocketService),
        container.resolve(API_SERVICE_TOKENS.ProjectManagerService)
      ),
      'singleton'
    );

    const container = registry.getContainer();
    apiService = container.resolve(API_SERVICE_TOKENS.ApiService);
    await apiService.initialize();
  });

  afterAll(async () => {
    if (apiService) {
      await apiService.stop();
    }
    await registry.disposeServices();
  });

  it('should create API service instance', () => {
    expect(apiService).toBeDefined();
    expect(apiService.getPort).toBeDefined();
    expect(apiService.start).toBeDefined();
    expect(apiService.stop).toBeDefined();
  });

  it('should start and stop server', async () => {
    // Start on random port
    const port = 3000 + Math.floor(Math.random() * 1000);
    await apiService.start(port);
    
    expect(apiService.getPort()).toBe(port);
    expect(apiService.getUrl()).toBe(`http://localhost:${port}`);
    
    await apiService.stop();
    expect(apiService.getPort()).toBe(0);
  });

  it('should handle project manager integration', async () => {
    const container = registry.getContainer();
    const projectManager = container.resolve(API_SERVICE_TOKENS.ProjectManagerService);
    
    const projectId = await projectManager.createProject({
      rootPath: '/test/path',
      blacklist: ['node_modules'],
    });
    
    expect(projectId).toBeDefined();
    expect(typeof projectId).toBe('string');
    
    const project = projectManager.getProject(projectId);
    expect(project).toBeDefined();
    expect(project?.config.rootPath).toBe('/test/path');
    
    projectManager.deleteProject(projectId);
    expect(projectManager.getProject(projectId)).toBeUndefined();
  });
});
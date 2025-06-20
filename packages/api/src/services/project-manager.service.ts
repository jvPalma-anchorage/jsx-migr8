import { IProjectManagerService } from '../types/service.types';
import { ILoggerService, IServiceContainer, SERVICE_TOKENS } from '../../../../src/di/types';
import { InitProjectRequest, ProjectInfo } from '../types/api.types';
import { ServiceRegistry } from '../../../../src/di/service-registry';
import { MigratorWrapperService } from './migrator-wrapper.service';
import { ProjectContextService } from './project-context.service';
import * as crypto from 'crypto';
import * as path from 'path';

interface ProjectSession {
  id: string;
  config: InitProjectRequest;
  container: IServiceContainer;
  contextService?: ProjectContextService;
  status: 'idle' | 'analyzing' | 'migrating' | 'error';
  createdAt: Date;
  stats?: {
    totalFiles: number;
    totalComponents: number;
    analyzedFiles: number;
  };
}

export class ProjectManagerService implements IProjectManagerService {
  private projects = new Map<string, ProjectSession>();

  constructor(
    private logger: ILoggerService,
    private serviceRegistry: ServiceRegistry
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Project Manager service initialized');
  }

  async dispose(): Promise<void> {
    // Dispose all project containers and contexts
    for (const [projectId, project] of this.projects) {
      try {
        if (project.contextService) {
          await project.contextService.dispose();
          this.logger.debug(`Disposed project context: ${projectId}`);
        }
        if (project.container) {
          await project.container.dispose();
          this.logger.debug(`Disposed project container: ${projectId}`);
        }
      } catch (error) {
        this.logger.error(`Error disposing project ${projectId}:`, error);
      }
    }
    this.projects.clear();
  }

  async createProject(config: InitProjectRequest): Promise<string> {
    const projectId = this.generateProjectId();
    
    try {
      // Create a project context service for this project
      const contextService = new ProjectContextService(
        projectId,
        config,
        this.serviceRegistry
      );
      
      // Also create a scoped container for backward compatibility
      const container = this.serviceRegistry.createScope();
      
      // Register the migrator wrapper service
      container.registerSingleton(
        SERVICE_TOKENS.MigratorService,
        () => new MigratorWrapperService()
      );

      const project: ProjectSession = {
        id: projectId,
        config,
        container,
        contextService,
        status: 'idle',
        createdAt: new Date(),
      };

      this.projects.set(projectId, project);
      this.logger.info(`Created project: ${projectId} for path: ${config.rootPath}`);

      return projectId;
    } catch (error) {
      this.logger.error(`Failed to create project ${projectId}:`, error);
      throw error;
    }
  }

  getProject(projectId: string): ProjectSession | undefined {
    return this.projects.get(projectId);
  }

  getProjectInfo(projectId: string): ProjectInfo | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;

    return {
      id: project.id,
      rootPath: project.config.rootPath,
      status: project.status,
      createdAt: project.createdAt.toISOString(),
      stats: project.stats,
    };
  }

  updateProjectStatus(projectId: string, status: ProjectSession['status']): void {
    const project = this.projects.get(projectId);
    if (project) {
      project.status = status;
      this.logger.debug(`Updated project ${projectId} status to: ${status}`);
    }
  }

  updateProjectStats(projectId: string, stats: ProjectSession['stats']): void {
    const project = this.projects.get(projectId);
    if (project) {
      project.stats = stats;
    }
  }

  deleteProject(projectId: string): void {
    const project = this.projects.get(projectId);
    if (project) {
      if (project.contextService) {
        project.contextService.dispose().catch(error => {
          this.logger.error(`Error disposing project context ${projectId}:`, error);
        });
      }
      if (project.container) {
        project.container.dispose().catch(error => {
          this.logger.error(`Error disposing project container ${projectId}:`, error);
        });
      }
      this.projects.delete(projectId);
      this.logger.info(`Deleted project: ${projectId}`);
    }
  }

  listProjects(): ProjectInfo[] {
    const projectInfos: ProjectInfo[] = [];
    for (const [projectId, project] of this.projects) {
      projectInfos.push({
        id: projectId,
        rootPath: project.config.rootPath,
        status: project.status,
        createdAt: project.createdAt.toISOString(),
        stats: project.stats,
      });
    }
    return projectInfos;
  }

  private generateProjectId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
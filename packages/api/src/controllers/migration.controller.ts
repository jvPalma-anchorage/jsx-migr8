import { Request, Response } from 'express';
import { 
  InitProjectRequest, 
  ComponentAnalysisRequest,
  DryRunMigrationRequest,
  ApiResponse,
  MigrationProgress,
  ComponentInfo,
  MigrationResult
} from '../types/api.types';
import { IProjectManagerService, IWebSocketService } from '../types/service.types';
import { 
  ILoggerService, 
  IGraphService,
  IAnalyzerService,
  IMigratorService,
  SERVICE_TOKENS
} from '../../../../src/di/types';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { validateProjectPath, validateMigrationRules } from '../utils/validation';

export class MigrationController {
  constructor(
    private projectManager: IProjectManagerService,
    private wsService: IWebSocketService,
    private logger: ILoggerService
  ) {}

  async initProject(req: Request<{}, {}, { path: string; name: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { path: projectPath, name } = req.body;
      
      // Validate project path
      const validation = validateProjectPath(projectPath);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error || 'Invalid project path',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Map frontend request to backend format
      const initRequest: InitProjectRequest = {
        rootPath: projectPath,
        blacklist: ['node_modules', '.git', 'dist', 'build'],
        includePatterns: ['**/*.{js,jsx,ts,tsx}'],
        ignorePatterns: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
      };
      
      const projectId = await this.projectManager.createProject(initRequest);
      
      // Return in the format expected by the frontend
      res.json({
        success: true,
        data: {
          id: projectId,
          name,
          path: projectPath,
          status: 'idle',
          lastModified: new Date()
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to initialize project:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize project',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async analyzeProject(req: Request<{ id: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const project = this.projectManager.getProject(projectId);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      this.projectManager.updateProjectStatus(projectId, 'analyzing');

      // Send initial progress
      this.wsService.broadcast(projectId, {
        type: 'progress',
        data: {
          projectId,
          phase: 'analyzing',
          progress: 0,
          filesProcessed: 0,
          totalFiles: 0,
        },
      });

      // Use the project context service to analyze
      let componentSummary, graph;
      
      if (project.contextService) {
        const analysisResult = await project.contextService.analyzeProject();
        componentSummary = analysisResult.componentSummary;
        graph = analysisResult.graph;
      } else {
        // Fallback to container-based analysis
        const analyzerService = project.container.resolve(SERVICE_TOKENS.AnalyzerService);
        const graphService = project.container.resolve(SERVICE_TOKENS.GraphService);
        
        graph = await graphService.buildGraph(
          project.config.rootPath,
          project.config.blacklist || []
        );
        
        componentSummary = await analyzerService.generateComponentSummary(graph);
      }
      
      // Convert to frontend format
      const components = Object.entries(componentSummary).flatMap(([packageName, pkgComponents]) => 
        Object.entries(pkgComponents).map(([componentName, componentData]: [string, any]) => ({
          name: componentName,
          package: packageName,
          filePath: componentData.filePath || '',
          props: Object.entries(componentData.props || {}).map(([propName, propData]: [string, any]) => ({
            name: propName,
            type: propData.type || 'any',
            required: propData.required || false,
            defaultValue: propData.defaultValue,
            usageCount: propData.usageCount || 0,
            combinations: propData.combinations || []
          })),
          usageCount: componentData.usageCount || 0,
          instances: componentData.instances || []
        }))
      );

      const filesAnalyzed = Object.keys(graph).length;
      const componentsFound = components.length;
      const packages = [...new Set(components.map(c => c.package))].map(pkg => ({
        name: pkg,
        components: components.filter(c => c.package === pkg).map(c => c.name)
      }));

      // Update project stats
      this.projectManager.updateProjectStats(projectId, {
        totalFiles: filesAnalyzed,
        totalComponents: componentsFound,
        analyzedFiles: filesAnalyzed,
      });

      // Send completion
      this.wsService.broadcast(projectId, {
        type: 'progress',
        data: {
          projectId,
          phase: 'completed',
          progress: 100,
          filesProcessed: filesAnalyzed,
          totalFiles: filesAnalyzed,
        },
      });

      this.projectManager.updateProjectStatus(projectId, 'idle');

      res.json({
        success: true,
        data: {
          filesAnalyzed,
          componentsFound,
          propsUsage: {},
          imports: [],
          suggestions: [],
          components,
          packages
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to analyze project:', error);
      const projectId = req.params.id;
      if (projectId) {
        this.projectManager.updateProjectStatus(projectId, 'error');
        this.wsService.broadcast(projectId, {
          type: 'error',
          data: {
            message: error instanceof Error ? error.message : 'Analysis failed',
          },
        });
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze project',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async analyzeComponents(req: Request<{}, {}, ComponentAnalysisRequest>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { projectId } = req.body;
      const project = this.projectManager.getProject(projectId);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Use project context to analyze
      const componentSummary = await project.contextService.analyzeProject(projectId);

      res.json({
        success: true,
        data: {
          projectId,
          components: componentSummary,
          totalComponents: Object.keys(componentSummary).length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to analyze components:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze components',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async migrate(req: Request<{ id: string }, {}, { ruleId: string; dryRun?: boolean; backup?: boolean }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const { ruleId, dryRun = false, backup = false } = req.body;
      const project = this.projectManager.getProject(projectId);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Generate a task ID for tracking
      const taskId = crypto.randomBytes(16).toString('hex');
      
      // Update project status
      this.projectManager.updateProjectStatus(projectId, 'migrating');

      // Start migration in background
      this.performMigration(projectId, project.contextService, {
        dryRun,
        ruleId,
        taskId,
        backup,
      }).catch(error => {
        this.logger.error(`Migration failed for project ${projectId}:`, error);
        this.projectManager.updateProjectStatus(projectId, 'error');
      });

      res.json({
        success: true,
        data: { taskId },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to start migration:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start migration',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async dryRunMigration(req: Request<{}, {}, DryRunMigrationRequest>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { projectId, rulesPath, options } = req.body;
      const project = this.projectManager.getProject(projectId);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Update project status
      this.projectManager.updateProjectStatus(projectId, 'migrating');

      // Start migration in background
      this.performMigration(projectId, project.contextService, {
        dryRun: true,
        rulesPath,
        ...options,
      }).catch(error => {
        this.logger.error(`Migration failed for project ${projectId}:`, error);
        this.projectManager.updateProjectStatus(projectId, 'idle');
      });

      res.json({
        success: true,
        data: {
          projectId,
          status: 'migration_started',
          mode: 'dry-run',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to start dry-run migration:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start migration',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getProjectStatus(req: Request<{ id: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const projectInfo = this.projectManager.getProjectInfo(projectId);
      
      if (!projectInfo) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Convert to frontend format
      const project = {
        id: projectInfo.id,
        name: path.basename(projectInfo.rootPath),
        path: projectInfo.rootPath,
        status: projectInfo.status,
        lastModified: new Date(projectInfo.createdAt)
      };
      
      res.json({
        success: true,
        data: project,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to get project status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project status',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async listProjects(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const projects = this.projectManager.listProjects();
      
      // Convert to frontend format
      const formattedProjects = projects.map(p => ({
        id: p.id,
        name: path.basename(p.rootPath),
        path: p.rootPath,
        status: p.status,
        lastModified: new Date(p.createdAt)
      }));
      
      res.json({
        success: true,
        data: formattedProjects,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to list projects:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list projects',
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async startProjectAnalysis(projectId: string): Promise<void> {
    const project = this.projectManager.getProject(projectId);
    if (!project) return;

    try {
      this.projectManager.updateProjectStatus(projectId, 'analyzing');

      // Send initial progress
      const progress: MigrationProgress = {
        projectId,
        phase: 'analyzing',
        progress: 0,
        filesProcessed: 0,
        totalFiles: 0,
      };
      this.wsService.broadcast(projectId, {
        type: 'progress',
        data: progress,
      });

      // Build graph using project context
      const graph = await project.contextService.buildProjectGraph(projectId);

      // Update stats
      const fileCount = Object.keys(graph).length;
      this.projectManager.updateProjectStats(projectId, {
        totalFiles: fileCount,
        totalComponents: 0, // Will be updated after analysis
        analyzedFiles: fileCount,
      });

      // Send completion
      this.wsService.broadcast(projectId, {
        type: 'progress',
        data: {
          ...progress,
          progress: 100,
          filesProcessed: fileCount,
          totalFiles: fileCount,
        },
      });

      this.projectManager.updateProjectStatus(projectId, 'idle');
    } catch (error) {
      this.logger.error(`Analysis failed for project ${projectId}:`, error);
      this.wsService.broadcast(projectId, {
        type: 'progress',
        data: {
          projectId,
          phase: 'error',
          progress: 0,
          filesProcessed: 0,
          totalFiles: 0,
          errors: [{
            file: '',
            error: error instanceof Error ? error.message : 'Analysis failed',
          }],
        },
      });
    }
  }

  async getMigrationRules(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      // TODO: Implement rules storage/retrieval
      const rules = [
        {
          id: 'mui-v4-to-v5',
          name: 'Material-UI v4 to v5',
          description: 'Migrate from Material-UI v4 to v5',
          sourcePackage: '@material-ui/core',
          targetPackage: '@mui/material',
          transformations: []
        }
      ];
      
      res.json({
        success: true,
        data: rules,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to get migration rules:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get migration rules',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async createMigrationRule(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const rule = req.body;
      
      // Validate migration rule
      const validation = validateMigrationRule(rule);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error || 'Invalid migration rule',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // TODO: Implement rule storage
      const savedRule = {
        ...rule,
        id: crypto.randomBytes(16).toString('hex')
      };
      
      res.json({
        success: true,
        data: savedRule,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to create migration rule:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create migration rule',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getMigrationStatus(req: Request<{ taskId: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { taskId } = req.params;
      // TODO: Implement task tracking
      
      res.json({
        success: true,
        data: {
          taskId,
          status: 'completed',
          progress: 100,
          filesModified: 0,
          errors: []
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to get migration status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get migration status',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getBackups(req: Request<{ id: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id: projectId } = req.params;
      // TODO: Implement backup storage/retrieval
      const backups: any[] = [];
      
      res.json({
        success: true,
        data: backups,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to get backups:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get backups',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async createBackup(req: Request<{ id: string }, {}, { description?: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const { description } = req.body;
      // TODO: Implement backup creation
      const backup = {
        id: crypto.randomBytes(16).toString('hex'),
        timestamp: new Date(),
        files: [],
        size: 0,
        description
      };
      
      res.json({
        success: true,
        data: backup,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to create backup:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create backup',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async restoreBackup(req: Request<{ id: string; backupId: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id: projectId, backupId } = req.params;
      // TODO: Implement backup restoration
      
      res.json({
        success: true,
        data: { message: 'Backup restored successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to restore backup:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore backup',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async deleteBackup(req: Request<{ id: string; backupId: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id: projectId, backupId } = req.params;
      // TODO: Implement backup deletion
      
      res.json({
        success: true,
        data: { message: 'Backup deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to delete backup:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete backup',
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async performMigration(
    projectId: string, 
    contextService: any,
    options: any
  ): Promise<void> {
    try {
      const project = this.projectManager.getProject(projectId);
      if (!project) throw new Error('Project not found');

      // Get graph from context
      const context = contextService.getProjectContext(projectId);
      if (!context || !context.graph) {
        await contextService.buildProjectGraph(projectId);
      }
      const graph = contextService.getProjectContext(projectId)?.graph;
      const totalFiles = graph ? Object.keys(graph).length : 0;

      // Send initial progress
      this.wsService.broadcast(projectId, {
        type: 'progress',
        data: {
          total: totalFiles,
          completed: 0,
          current: 'Starting migration...',
          status: 'running' as const,
          errors: []
        },
      });

      // Track progress
      let filesProcessed = 0;
      const progressCallback = (file: string, success: boolean, error?: string) => {
        filesProcessed++;
        this.wsService.broadcast(projectId, {
          type: 'progress',
          data: {
            total: totalFiles,
            completed: filesProcessed,
            current: file,
            status: 'running' as const,
            errors: error ? [error] : []
          },
        });

        // Send log message
        this.wsService.broadcast(projectId, {
          type: 'log',
          data: `[${new Date().toISOString()}] ${success ? '✓' : '✗'} ${file}${error ? `: ${error}` : ''}`
        });
      };
      
      // Perform migration with progress tracking
      const result = await contextService.migrateProject(projectId, {
        dryRun: options.dryRun,
        changeCode: !options.dryRun,
        progressCallback
      });

      // Send completion message
      this.wsService.broadcast(projectId, {
        type: 'complete',
        data: {
          filesModified: result.filesModified || 0,
          filesSkipped: result.filesSkipped || 0,
          errors: result.errors || []
        }
      });

      this.wsService.broadcast(projectId, {
        type: 'progress',
        data: {
          total: totalFiles,
          completed: totalFiles,
          current: 'Migration completed',
          status: 'completed' as const,
          errors: []
        },
      });

      this.projectManager.updateProjectStatus(projectId, 'idle');
    } catch (error) {
      this.logger.error(`Migration error for project ${projectId}:`, error);
      
      this.wsService.broadcast(projectId, {
        type: 'error',
        data: {
          message: error instanceof Error ? error.message : 'Migration failed',
        }
      });

      this.wsService.broadcast(projectId, {
        type: 'progress',
        data: {
          total: 0,
          completed: 0,
          current: '',
          status: 'error' as const,
          errors: [error instanceof Error ? error.message : 'Migration failed']
        },
      });

      this.projectManager.updateProjectStatus(projectId, 'error');
      throw error;
    }
  }
}
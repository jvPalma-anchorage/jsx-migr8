import { IServiceContainer, SERVICE_TOKENS, ILoggerService, IGraphService, IAnalyzerService } from '../../../../src/di/types';
import { ServiceRegistry } from '../../../../src/di/service-registry';
import { InitProjectRequest } from '../types/api.types';
import { MigratorServiceImpl } from './migrator-service-impl';
// Context is managed per-project through service configuration

export class ProjectContextService {
  private container: IServiceContainer;
  private logger: ILoggerService;
  
  constructor(
    private projectId: string,
    private config: InitProjectRequest,
    private serviceRegistry: ServiceRegistry
  ) {
    // Create a scoped container for this project
    this.container = this.serviceRegistry.createScope();
    this.logger = this.container.resolve(SERVICE_TOKENS.LoggerService);
    
    // Initialize project-specific context
    this.initializeContext();
  }
  
  private initializeContext(): void {
    try {
      // Override configuration service
      const configService = this.container.resolve(SERVICE_TOKENS.ConfigurationService);
      if (configService && typeof configService === 'object') {
        Object.assign(configService, {
          getRootPath: () => this.config.rootPath,
          getBlacklist: () => this.config.blacklist || ['node_modules', '.git'],
          getPackages: () => this.config.packages || [],
          getIncludePatterns: () => this.config.includePatterns || ['**/*.{js,jsx,ts,tsx}'],
          getIgnorePatterns: () => this.config.ignorePatterns || ['**/node_modules/**'],
        });
      }
      
      // Register project-specific migrator service
      this.container.registerSingleton(
        SERVICE_TOKENS.MigratorService,
        () => new MigratorServiceImpl(
          this.container.resolve(SERVICE_TOKENS.FileService),
          this.container.resolve(SERVICE_TOKENS.ASTService),
          this.container.resolve(SERVICE_TOKENS.LoggerService)
        )
      );
      
    } catch (error) {
      this.logger.error(`Failed to initialize context for project ${this.projectId}:`, error);
      throw error;
    }
  }
  
  async buildGraph(): Promise<any> {
    try {
      const graphService = this.container.resolve(SERVICE_TOKENS.GraphService);
      const graph = await graphService.buildGraph(
        this.config.rootPath,
        this.config.blacklist || []
      );
      
      // Graph is now available for this project
      
      return graph;
    } catch (error) {
      this.logger.error(`Failed to build graph for project ${this.projectId}:`, error);
      throw error;
    }
  }
  
  async analyzeProject(): Promise<any> {
    try {
      // Build graph first
      const graph = await this.buildGraph();
      
      // Analyze components
      const analyzerService = this.container.resolve(SERVICE_TOKENS.AnalyzerService);
      const componentSummary = await analyzerService.generateComponentSummary(graph);
      
      return {
        graph,
        componentSummary,
        filesAnalyzed: Object.keys(graph).length
      };
    } catch (error) {
      this.logger.error(`Failed to analyze project ${this.projectId}:`, error);
      throw error;
    }
  }
  
  async migrateProject(options: {
    dryRun: boolean;
    progressCallback?: (file: string, success: boolean, error?: string) => void;
  }): Promise<any> {
    try {
      const migratorService = this.container.resolve(SERVICE_TOKENS.MigratorService);
      return await migratorService.migrateComponents({
        dryRun: options.dryRun,
        changeCode: !options.dryRun,
        progressCallback: options.progressCallback
      });
    } catch (error) {
      this.logger.error(`Failed to migrate project ${this.projectId}:`, error);
      throw error;
    }
  }
  
  getContainer(): IServiceContainer {
    return this.container;
  }
  
  async dispose(): Promise<void> {
    try {
      await this.container.dispose();
    } catch (error) {
      this.logger.error(`Error disposing project context ${this.projectId}:`, error);
    }
  }
}
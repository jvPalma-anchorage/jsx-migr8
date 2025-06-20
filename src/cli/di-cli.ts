/**
 * DI-based CLI implementation
 */

import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { 
  getDIContext, 
  initDIContext,
  SERVICE_TOKENS,
  IConfigurationService,
  ILoggerService,
  IGraphService,
  IAnalyzerService,
  IMigratorService,
  IFileService,
} from '../di';
import { MAIN_MENU_OPTIONS } from './constants';
import { ensureEnvironmentSetup } from './envSetup';

export class DICLI {
  private context = getDIContext();
  private initialized = false;

  constructor() {}

  /**
   * Initialize the CLI with DI context
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await ensureEnvironmentSetup();
    
    const configService = this.context.resolve<IConfigurationService>(SERVICE_TOKENS.Configuration);
    const loggerService = this.context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
    
    const rootPath = configService.getRootPath();
    
    console.clear();
    console.info(MAIN_MENU_OPTIONS.welcomeHeader.replace('ROOTPATH', rootPath));

    // Initialize context with graph building
    await initDIContext({
      useAsync: true,
      useBatched: false,
      onProgress: (completed, total, info) => {
        const percentage = Math.round((completed / total) * 100);
        loggerService.progress(completed, total, info);
      },
      onError: (error) => {
        loggerService.error('Graph building error:', error.message);
      },
    });

    this.initialized = true;
  }

  /**
   * Run the main CLI menu
   */
  async run(preSelectedOption?: string): Promise<void> {
    await this.initialize();

    const firstRunState = { value: true };
    const optionState = { value: preSelectedOption };
    const messageState = { value: undefined as string | undefined };

    // Set up graceful shutdown
    this.setupGracefulShutdown();

    while (true) {
      const loggerService = this.context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
      
      try {
        // Clear screen except for first run
        if (firstRunState.value) {
          firstRunState.value = false;
        } else {
          console.clear();
        }

        // Handle menu options
        await this.handleMenuOption(optionState.value, messageState);
        optionState.value = undefined;

        // Show any messages
        if (messageState.value) {
          console.info(chalk.green(messageState.value));
          messageState.value = undefined;
        }

        // Build menu choices
        const choices = await this.buildMenuChoices();

        // Show system status
        await this.showSystemStatus();

        console.info('\n');

        // Get user selection
        optionState.value = await select({
          message: chalk.cyanBright(' What would you like to do?'),
          choices,
        });

        if (optionState.value === 'exit') {
          break;
        }

      } catch (error) {
        loggerService.error('CLI error:', error);
        
        const continueChoice = await select({
          message: 'An error occurred. What would you like to do?',
          choices: [
            { name: 'Continue to main menu', value: 'continue' },
            { name: 'Exit application', value: 'exit' },
          ],
        });

        if (continueChoice === 'exit') {
          break;
        }
        
        optionState.value = undefined;
      }
    }

    await this.shutdown();
  }

  /**
   * Handle specific menu options
   */
  private async handleMenuOption(
    option: string | undefined,
    messageState: { value: string | undefined }
  ): Promise<void> {
    if (!option) return;

    const loggerService = this.context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
    const analyzerService = this.context.resolve<IAnalyzerService>(SERVICE_TOKENS.AnalyzerService);
    const migratorService = this.context.resolve<IMigratorService>(SERVICE_TOKENS.MigratorService);

    switch (option) {
      case 'showProps': {
        await this.handleShowProps(messageState);
        break;
      }
      case 'dryRun': {
        await this.handleDryRun(messageState);
        break;
      }
      case 'migrate': {
        await this.handleMigration(messageState);
        break;
      }
      case 'backupManagement': {
        await this.handleBackupManagement();
        break;
      }
      case 'rollbackMenu': {
        await this.handleRollbackMenu();
        break;
      }
      case 'healthCheck': {
        await this.handleHealthCheck(messageState);
        break;
      }
      case 'serviceInfo': {
        await this.handleServiceInfo();
        break;
      }
      default:
        loggerService.warn(`Unknown menu option: ${option}`);
    }
  }

  /**
   * Handle props scanning
   */
  private async handleShowProps(messageState: { value: string | undefined }): Promise<void> {
    const analyzerService = this.context.resolve<IAnalyzerService>(SERVICE_TOKENS.AnalyzerService);
    const loggerService = this.context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);

    try {
      const graph = this.context.getGraph();
      if (!graph) {
        messageState.value = '⚠ No graph data available. Please rebuild the project graph.';
        return;
      }

      const summary = await analyzerService.generateComponentSummary(graph);
      if (!summary) {
        messageState.value = '⚠ No component summary available.';
        return;
      }

      // Import and use the props scanner
      const { propsScanner } = await import('../report/propsScanner');
      messageState.value = await propsScanner(summary);

    } catch (error) {
      loggerService.error('Failed to scan props:', error);
      messageState.value = '⚠ Failed to scan component props.';
    }
  }

  /**
   * Handle dry run migration
   */
  private async handleDryRun(messageState: { value: string | undefined }): Promise<void> {
    const migratorService = this.context.resolve<IMigratorService>(SERVICE_TOKENS.MigratorService);
    const loggerService = this.context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);

    try {
      const graph = this.context.getGraph();
      if (!graph) {
        messageState.value = '⚠ No graph data available for migration.';
        return;
      }

      const result = await migratorService.migrateComponents({
        dryRun: true,
        changeCode: false,
        graph,
      });

      if (typeof result === 'string') {
        messageState.value = result;
      } else {
        messageState.value = '✓ Dry run completed. Check the output above for details.';
      }

    } catch (error) {
      loggerService.error('Dry run failed:', error);
      messageState.value = '⚠ Dry run migration failed.';
    }
  }

  /**
   * Handle actual migration
   */
  private async handleMigration(messageState: { value: string | undefined }): Promise<void> {
    const migratorService = this.context.resolve<IMigratorService>(SERVICE_TOKENS.MigratorService);
    const loggerService = this.context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);

    try {
      const confirm = await input({
        message: chalk.redBright(
          'This will MODIFY your files - type "yes" to continue:'
        ),
      });

      if (confirm.trim().toLowerCase() !== 'yes') {
        messageState.value = '⚠ Migration cancelled.';
        return;
      }

      const graph = this.context.getGraph();
      if (!graph) {
        messageState.value = '⚠ No graph data available for migration.';
        return;
      }

      const result = await migratorService.migrateComponents({
        dryRun: false,
        changeCode: true,
        graph,
      });

      if (typeof result === 'string') {
        messageState.value = result;
      } else {
        messageState.value = '✓ Migration completed successfully.';
      }

    } catch (error) {
      loggerService.error('Migration failed:', error);
      messageState.value = '⚠ Migration failed.';
    }
  }

  /**
   * Handle backup management
   */
  private async handleBackupManagement(): Promise<void> {
    try {
      // Import the backup CLI
      const { BackupCLI } = await import('../backup/cli/backup-commands');
      const backupCLI = new BackupCLI();
      await backupCLI.handleBackupCommand();
    } catch (error) {
      const loggerService = this.context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
      loggerService.error('Backup management failed:', error);
    }
  }

  /**
   * Handle rollback menu
   */
  private async handleRollbackMenu(): Promise<void> {
    try {
      // Import rollback functionality
      const { handleRollbackMenu } = await import('./index');
      await handleRollbackMenu();
    } catch (error) {
      const loggerService = this.context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
      loggerService.error('Rollback menu failed:', error);
    }
  }

  /**
   * Handle health check
   */
  private async handleHealthCheck(messageState: { value: string | undefined }): Promise<void> {
    const loggerService = this.context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);

    try {
      const health = await this.context.healthCheck();
      
      console.log('\n' + chalk.blue('🏥 System Health Check'));
      console.log('='.repeat(50));
      
      const healthyServices: string[] = [];
      const unhealthyServices: string[] = [];

      Object.entries(health.services).forEach(([serviceName, serviceHealth]) => {
        const status = serviceHealth.status === 'healthy' 
          ? chalk.green('✓ Healthy')
          : serviceHealth.status === 'unhealthy'
            ? chalk.red('✗ Unhealthy')
            : chalk.yellow('? Unknown');
        
        console.log(`  ${serviceName}: ${status}`);
        
        if (serviceHealth.error) {
          console.log(`    Error: ${chalk.gray(serviceHealth.error)}`);
        }

        if (serviceHealth.status === 'healthy') {
          healthyServices.push(serviceName);
        } else {
          unhealthyServices.push(serviceName);
        }
      });

      console.log('='.repeat(50));
      console.log(`Overall Status: ${health.healthy ? chalk.green('✓ System Healthy') : chalk.red('✗ System Issues Detected')}`);
      console.log(`Healthy Services: ${healthyServices.length}`);
      console.log(`Unhealthy Services: ${unhealthyServices.length}`);

      messageState.value = health.healthy 
        ? '✓ All services are healthy'
        : `⚠ ${unhealthyServices.length} service(s) have issues`;

    } catch (error) {
      loggerService.error('Health check failed:', error);
      messageState.value = '⚠ Health check failed.';
    }
  }

  /**
   * Handle service information
   */
  private async handleServiceInfo(): Promise<void> {
    const loggerService = this.context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);

    try {
      console.log('\n' + chalk.blue('🔧 Service Information'));
      console.log('='.repeat(50));

      const dependencies = this.context.getDependencyGraph();
      
      Object.entries(dependencies).forEach(([serviceName, deps]) => {
        console.log(`${chalk.cyan(serviceName)}:`);
        if (deps.length === 0) {
          console.log('  No dependencies');
        } else {
          deps.forEach(dep => {
            console.log(`  └─ ${dep}`);
          });
        }
        console.log('');
      });

      const validation = this.context.validateDependencies();
      console.log(`Dependency Validation: ${validation.valid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid')}`);
      
      if (!validation.valid) {
        validation.errors.forEach(error => {
          console.log(`  ${chalk.red('Error:')} ${error}`);
        });
      }

    } catch (error) {
      loggerService.error('Service info failed:', error);
    }
  }

  /**
   * Build menu choices based on current state
   */
  private async buildMenuChoices(): Promise<Array<{ name: string; value: string; description?: string }>> {
    const choices: Array<{ name: string; value: string; description?: string }> = [];
    const fileService = this.context.resolve<IFileService>(SERVICE_TOKENS.FileService);

    const graph = this.context.getGraph();
    const migr8RuleFiles = await fileService.findMigr8RuleFiles();

    // Props inspection (only when we have graph data)
    if (graph) {
      choices.push(MAIN_MENU_OPTIONS.showProps);
    }

    // Migration options (only when we have graph data and migration rules)
    if (graph && migr8RuleFiles.length > 0) {
      choices.push(MAIN_MENU_OPTIONS.dryRun);
      choices.push(MAIN_MENU_OPTIONS.migrate);
    }

    // Always available options
    choices.push(MAIN_MENU_OPTIONS.backupManagement);
    choices.push(MAIN_MENU_OPTIONS.rollbackMenu);

    // DI-specific options
    choices.push({
      name: '🏥  System Health Check',
      value: 'healthCheck',
      description: 'Check the health of all services',
    });

    choices.push({
      name: '🔧  Service Information',
      value: 'serviceInfo',
      description: 'View service dependencies and configuration',
    });

    choices.push(MAIN_MENU_OPTIONS.exit);

    return choices;
  }

  /**
   * Show system status information
   */
  private async showSystemStatus(): Promise<void> {
    try {
      const configService = this.context.resolve<IConfigurationService>(SERVICE_TOKENS.Configuration);
      const fileService = this.context.resolve<IFileService>(SERVICE_TOKENS.FileService);
      
      const graph = this.context.getGraph();
      const migr8RuleFiles = await fileService.findMigr8RuleFiles();

      console.info(chalk.gray('─'.repeat(60)));
      console.info(chalk.gray(`   📁 Root: ${configService.getRootPath()}`));
      console.info(chalk.gray(`   📊 Graph: ${graph ? `${graph.imports.length} imports, ${graph.jsx.length} JSX` : 'Not loaded'}`));
      console.info(chalk.gray(`   📋 Rules: ${migr8RuleFiles.length} migration files`));
      console.info(chalk.gray(`   🏗️  Mode: ${configService.isDevelopment() ? 'Development' : 'Production'}`));

      // Show backup system status
      try {
        const { getBackupSystemStatus, showBackupHint } = await import('./backup-integration');
        const backupStatus = await getBackupSystemStatus();
        console.info(chalk.gray(`   📦 Backup: ${backupStatus}`));
        
        if (graph && migr8RuleFiles.length > 0) {
          await showBackupHint();
        }
      } catch (error) {
        // Silently ignore backup status errors
      }

    } catch (error) {
      const loggerService = this.context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
      loggerService.debug('Failed to show system status:', error);
    }
  }

  /**
   * Setup graceful shutdown handling
   */
  private setupGracefulShutdown(): void {
    process.on('SIGINT', async () => {
      console.info(chalk.green('\n\nGraceful shutdown initiated...\n'));
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.info(chalk.green('\n\nTermination signal received...\n'));
      await this.shutdown();
      process.exit(0);
    });
  }

  /**
   * Shutdown the CLI and dispose of resources
   */
  private async shutdown(): Promise<void> {
    const loggerService = this.context.tryResolve(SERVICE_TOKENS.LoggerService);
    
    try {
      if (loggerService) {
        loggerService.info('Shutting down CLI...');
      }
      
      await this.context.dispose();
      
      console.info(chalk.green('\nBye! 💪\n'));
    } catch (error) {
      if (loggerService) {
        loggerService.error('Error during shutdown:', error);
      }
      console.error('Error during shutdown:', error);
    }
  }

  /**
   * Handle CLI arguments for one-shot operations
   */
  async handleArguments(): Promise<boolean> {
    const configService = this.context.resolve<IConfigurationService>(SERVICE_TOKENS.Configuration);
    const runArgs = configService.getRunArgs();

    // Handle backup flags first
    const handledBackupFlag = await this.handleBackupFlags();
    if (handledBackupFlag) {
      return true;
    }

    // Handle one-shot operations
    if (runArgs.showProps) {
      await this.initialize();
      const messageState = { value: undefined as string | undefined };
      await this.handleShowProps(messageState);
      if (messageState.value) {
        console.info(messageState.value);
      }
      return true;
    }

    if (runArgs.dryRun) {
      await this.initialize();
      const messageState = { value: undefined as string | undefined };
      await this.handleDryRun(messageState);
      if (messageState.value) {
        console.info(messageState.value);
      }
      return true;
    }

    if (runArgs.yolo) {
      await this.initialize();
      const messageState = { value: undefined as string | undefined };
      await this.handleMigration(messageState);
      if (messageState.value) {
        console.info(messageState.value);
      }
      return true;
    }

    return false; // No arguments handled, continue to interactive mode
  }

  /**
   * Handle backup-related CLI flags
   */
  private async handleBackupFlags(): Promise<boolean> {
    const configService = this.context.resolve<IConfigurationService>(SERVICE_TOKENS.Configuration);
    const runArgs = configService.getRunArgs();

    if (runArgs.backup || runArgs.listBackups || runArgs.rollback || 
        runArgs.verifyBackup || runArgs.cleanupBackups) {
      try {
        // Import and delegate to the original backup flag handler
        const { handleBackupFlags } = await import('./index');
        await this.initialize();
        return await handleBackupFlags();
      } catch (error) {
        const loggerService = this.context.resolve<ILoggerService>(SERVICE_TOKENS.LoggerService);
        loggerService.error('Backup flag handling failed:', error);
        return true; // Exit to prevent further processing
      }
    }

    return false;
  }
}

/**
 * Main entry point for DI-based CLI
 */
export async function runDICLI(): Promise<void> {
  const cli = new DICLI();
  
  try {
    // Check if arguments were handled
    const argumentsHandled = await cli.handleArguments();
    
    if (!argumentsHandled) {
      // Run interactive mode
      await cli.run();
    }
  } catch (error) {
    console.error(chalk.red('CLI failed:'), error);
    process.exit(1);
  }
}

/**
 * Create CLI instance for testing
 */
export function createTestCLI(): DICLI {
  return new DICLI();
}
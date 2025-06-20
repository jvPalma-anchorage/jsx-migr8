/**
 * Core dependency injection types and interfaces
 */

// Service lifecycle types
export type ServiceLifecycle = 'singleton' | 'transient' | 'scoped';

// Constructor type for creating services
export type Constructor<T = {}> = new (...args: any[]) => T;

// Factory function type
export type Factory<T> = (container: IServiceContainer) => T;

// Service registration configuration
export interface ServiceRegistration<T = any> {
  token: ServiceToken<T>;
  implementation?: Constructor<T>;
  factory?: Factory<T>;
  lifecycle?: ServiceLifecycle;
  dependencies?: ServiceToken<any>[];
}

// Service token for dependency resolution
export interface ServiceToken<T = any> {
  name: string;
  description?: string;
}

// Main service container interface
export interface IServiceContainer {
  // Registration methods
  registerSingleton<T>(token: ServiceToken<T>, implementation: Constructor<T>): void;
  registerSingleton<T>(token: ServiceToken<T>, factory: Factory<T>): void;
  registerTransient<T>(token: ServiceToken<T>, implementation: Constructor<T>): void;
  registerTransient<T>(token: ServiceToken<T>, factory: Factory<T>): void;
  registerScoped<T>(token: ServiceToken<T>, implementation: Constructor<T>): void;
  registerScoped<T>(token: ServiceToken<T>, factory: Factory<T>): void;
  
  // Resolution methods
  resolve<T>(token: ServiceToken<T>): T;
  tryResolve<T>(token: ServiceToken<T>): T | undefined;
  
  // Container management
  createScope(): IServiceContainer;
  dispose(): Promise<void>;
  
  // Introspection
  isRegistered<T>(token: ServiceToken<T>): boolean;
  getRegistrations(): ServiceRegistration[];
}

// Base service interface with lifecycle management
export interface IService {
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
}

// Configuration service interface
export interface IConfigurationService extends IService {
  getRootPath(): string;
  getBlacklist(): string[];
  getPackages(): string[];
  getRunArgs(): any;
  getMigr8RulesDir(): string;
  getQueueDir(): string;
  isDebugMode(): boolean;
  isQuietMode(): boolean;
}

// File operations service interface
export interface IFileService extends IService {
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
  deleteFile(filePath: string): Promise<void>;
  ensureDir(dirPath: string): Promise<void>;
  glob(pattern: string, options?: { cwd?: string; absolute?: boolean; ignore?: string[] }): Promise<string[]>;
  getFileStats(filePath: string): Promise<{ size: number; mtime: Date }>;
}

// AST processing service interface
export interface IASTService extends IService {
  parseFile(filePath: string): Promise<{ ast: any; code: string }>;
  printAST(ast: any): string;
  visitAST(ast: any, visitors: any): void;
}

// Graph building service interface
export interface IGraphService extends IService {
  buildGraph(rootPath: string, blacklist: string[]): Promise<any>;
  buildGraphAsync(rootPath: string, blacklist: string[], options?: any): Promise<{ graph: any; errors: any[] }>;
  buildGraphBatched(rootPath: string, blacklist: string[], options?: any): Promise<{ graph: any; errors: any[] }>;
}

// Analysis service interface
export interface IAnalyzerService extends IService {
  analyzeFile(filePath: string): Promise<boolean>;
  analyzeImports(filePath: string): Promise<any[]>;
  analyzeJSXUsage(filePath: string): Promise<any[]>;
  generateComponentSummary(graph: any): Promise<any>;
}

// Migration service interface
export interface IMigratorService extends IService {
  migrateComponents(options: { dryRun?: boolean; changeCode?: boolean }): Promise<string | void>;
  applyRules(filePath: string, rules: any): Promise<{ success: boolean; changes?: any }>;
  generateDiff(oldCode: string, newCode: string, filePath: string): string;
}

// Logger service interface
export interface ILoggerService extends IService {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;
}

// Backup service interface
export interface IBackupService extends IService {
  createBackup(options: any): Promise<string>;
  listBackups(): Promise<any[]>;
  restoreBackup(backupId: string): Promise<void>;
  deleteBackup(backupId: string): Promise<void>;
  verifyBackup(backupId: string): Promise<{ valid: boolean; summary: any }>;
}

// Service tokens for dependency injection
export const SERVICE_TOKENS = {
  Configuration: { name: 'IConfigurationService', description: 'Configuration and environment service' } as ServiceToken<IConfigurationService>,
  FileService: { name: 'IFileService', description: 'File system operations service' } as ServiceToken<IFileService>,
  ASTService: { name: 'IASTService', description: 'AST parsing and manipulation service' } as ServiceToken<IASTService>,
  GraphService: { name: 'IGraphService', description: 'Code graph building service' } as ServiceToken<IGraphService>,
  AnalyzerService: { name: 'IAnalyzerService', description: 'Code analysis service' } as ServiceToken<IAnalyzerService>,
  MigratorService: { name: 'IMigratorService', description: 'Code migration service' } as ServiceToken<IMigratorService>,
  LoggerService: { name: 'ILoggerService', description: 'Logging service' } as ServiceToken<ILoggerService>,
  BackupService: { name: 'IBackupService', description: 'Backup and restore service' } as ServiceToken<IBackupService>,
} as const;

// Error types for dependency injection
export class DIError extends Error {
  constructor(message: string, public readonly token?: ServiceToken<any>) {
    super(message);
    this.name = 'DIError';
  }
}

export class ServiceNotFoundError extends DIError {
  constructor(token: ServiceToken<any>) {
    super(`Service not found: ${token.name}`, token);
    this.name = 'ServiceNotFoundError';
  }
}

export class CircularDependencyError extends DIError {
  constructor(chain: string[]) {
    super(`Circular dependency detected: ${chain.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}
import { ServiceToken } from '../../../../src/di/types';
import { IService } from '../../../../src/di/types';

// API-specific service interfaces
export interface IApiService extends IService {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  getPort(): number;
  getUrl(): string;
}

export interface IWebSocketService extends IService {
  broadcast(projectId: string, message: any): void;
  sendToClient(clientId: string, message: any): void;
  getConnectedClients(projectId: string): string[];
}

export interface IProjectManagerService extends IService {
  createProject(config: any): Promise<string>;
  getProject(projectId: string): any;
  getProjectInfo(projectId: string): any;
  updateProjectStatus(projectId: string, status: string): void;
  updateProjectStats(projectId: string, stats: any): void;
  deleteProject(projectId: string): void;
  listProjects(): any[];
}

// Service tokens for API
export const API_SERVICE_TOKENS = {
  ApiService: { name: 'IApiService', description: 'Express API server service' } as ServiceToken<IApiService>,
  WebSocketService: { name: 'IWebSocketService', description: 'WebSocket communication service' } as ServiceToken<IWebSocketService>,
  ProjectManagerService: { name: 'IProjectManagerService', description: 'Project session management service' } as ServiceToken<IProjectManagerService>,
} as const;
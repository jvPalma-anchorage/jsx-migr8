import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IWebSocketService } from '../types/service.types';
import { WSMessage, WSMessageSchema } from '../types/api.types';
import { ILoggerService } from '../../../../src/di/types';

interface ClientInfo {
  id: string;
  ws: WebSocket;
  projectIds: Set<string>;
}

export class WebSocketService implements IWebSocketService {
  private wss?: WebSocketServer;
  private clients = new Map<string, ClientInfo>();
  private projectClients = new Map<string, Set<string>>();
  private clientIdCounter = 0;

  constructor(private logger: ILoggerService) {}

  async initialize(): Promise<void> {
    this.logger.info('WebSocket service initialized');
  }

  async dispose(): Promise<void> {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
      this.projectClients.clear();
    }
  }

  attachToServer(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = this.generateClientId();
      const clientInfo: ClientInfo = {
        id: clientId,
        ws,
        projectIds: new Set(),
      };

      this.clients.set(clientId, clientInfo);
      this.logger.info(`WebSocket client connected: ${clientId}`);

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          const validatedMessage = WSMessageSchema.parse(message);
          this.handleMessage(clientId, validatedMessage);
        } catch (error) {
          this.logger.error('Invalid WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          }));
        }
      });

      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      ws.on('error', (error) => {
        this.logger.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString(),
      }));
    });
  }

  private handleMessage(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        this.subscribeToProject(clientId, message.projectId);
        break;
      case 'unsubscribe':
        this.unsubscribeFromProject(clientId, message.projectId);
        break;
      default:
        // Handle other message types if needed
        break;
    }
  }

  private subscribeToProject(clientId: string, projectId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.projectIds.add(projectId);

    if (!this.projectClients.has(projectId)) {
      this.projectClients.set(projectId, new Set());
    }
    this.projectClients.get(projectId)!.add(clientId);

    this.logger.debug(`Client ${clientId} subscribed to project ${projectId}`);

    // Send confirmation
    client.ws.send(JSON.stringify({
      type: 'subscribed',
      projectId,
      timestamp: new Date().toISOString(),
    }));
  }

  private unsubscribeFromProject(clientId: string, projectId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.projectIds.delete(projectId);

    const projectClients = this.projectClients.get(projectId);
    if (projectClients) {
      projectClients.delete(clientId);
      if (projectClients.size === 0) {
        this.projectClients.delete(projectId);
      }
    }

    this.logger.debug(`Client ${clientId} unsubscribed from project ${projectId}`);
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all project subscriptions
    for (const projectId of client.projectIds) {
      const projectClients = this.projectClients.get(projectId);
      if (projectClients) {
        projectClients.delete(clientId);
        if (projectClients.size === 0) {
          this.projectClients.delete(projectId);
        }
      }
    }

    this.clients.delete(clientId);
    this.logger.info(`WebSocket client disconnected: ${clientId}`);
  }

  broadcast(projectId: string, message: any): void {
    const projectClients = this.projectClients.get(projectId);
    if (!projectClients) return;

    const messageStr = JSON.stringify(message);
    for (const clientId of projectClients) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  }

  sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  getConnectedClients(projectId: string): string[] {
    const projectClients = this.projectClients.get(projectId);
    return projectClients ? Array.from(projectClients) : [];
  }

  private generateClientId(): string {
    return `client-${++this.clientIdCounter}-${Date.now()}`;
  }
}
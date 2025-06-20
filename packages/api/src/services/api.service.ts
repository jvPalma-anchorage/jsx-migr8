import express, { Express } from 'express';
import { Server } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { IApiService, IWebSocketService, IProjectManagerService } from '../types/service.types';
import { ILoggerService } from '../../../../src/di/types';
import { MigrationController } from '../controllers/migration.controller';
import { createMigrationRoutes } from '../routes/migration.routes';
import { errorHandler } from '../middleware/error.middleware';
import { WebSocketService } from '../websocket/websocket.service';

export class ApiService implements IApiService {
  private app: Express;
  private server?: Server;
  private port: number = 0;

  constructor(
    private logger: ILoggerService,
    private wsService: IWebSocketService,
    private projectManager: IProjectManagerService
  ) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  async initialize(): Promise<void> {
    this.logger.info('API service initialized');
  }

  async dispose(): Promise<void> {
    if (this.server) {
      await this.stop();
    }
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          this.port = port;
          this.logger.info(`API server started on port ${port}`);
          
          // Attach WebSocket server
          if (this.server && this.wsService instanceof WebSocketService) {
            this.wsService.attachToServer(this.server);
            this.logger.info('WebSocket server attached');
          }
          
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            this.logger.error(`Port ${port} is already in use`);
          } else {
            this.logger.error('Server error:', error);
          }
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          this.logger.error('Error stopping server:', error);
          reject(error);
        } else {
          this.logger.info('API server stopped');
          this.server = undefined;
          this.port = 0;
          resolve();
        }
      });
    });
  }

  getPort(): number {
    return this.port;
  }

  getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP',
    });
    this.app.use('/api/', limiter);

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API info
    this.app.get('/api/info', (req, res) => {
      res.json({
        name: 'jsx-migr8 API',
        version: '1.0.0',
        endpoints: [
          'POST /api/projects',
          'GET /api/projects',
          'GET /api/projects/:id',
          'POST /api/projects/:id/analyze',
          'POST /api/projects/:id/migrate',
          'GET /api/migration/rules',
          'POST /api/migration/rules',
          'GET /api/migration/tasks/:taskId',
          'GET /api/projects/:id/backups',
          'POST /api/projects/:id/backups',
          'POST /api/projects/:id/backups/:backupId/restore',
          'DELETE /api/projects/:id/backups/:backupId',
        ],
        websocket: 'ws://localhost:' + this.port,
      });
    });

    // Migration routes
    const migrationController = new MigrationController(
      this.projectManager,
      this.wsService,
      this.logger
    );
    this.app.use('/api', createMigrationRoutes(migrationController));
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not found',
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }
}
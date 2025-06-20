import { Router } from 'express';
import { MigrationController } from '../controllers/migration.controller';
import { validateBody } from '../middleware/validation.middleware';
import { 
  InitProjectSchema, 
  ComponentAnalysisSchema, 
  DryRunMigrationSchema 
} from '../types/api.types';

export function createMigrationRoutes(controller: MigrationController): Router {
  const router = Router();

  // Project management
  router.post('/projects', validateBody(InitProjectSchema), (req, res) => 
    controller.initProject(req, res)
  );

  router.get('/projects', (req, res) => 
    controller.listProjects(req, res)
  );

  router.get('/projects/:id', (req, res) => 
    controller.getProjectStatus(req, res)
  );

  // Component analysis
  router.post('/projects/:id/analyze', (req, res) => 
    controller.analyzeProject(req, res)
  );

  // Migration operations
  router.post('/projects/:id/migrate', validateBody(DryRunMigrationSchema), (req, res) => 
    controller.migrate(req, res)
  );

  // Migration rules management
  router.get('/migration/rules', (req, res) => 
    controller.getMigrationRules(req, res)
  );

  router.post('/migration/rules', (req, res) => 
    controller.createMigrationRule(req, res)
  );

  router.get('/migration/tasks/:taskId', (req, res) => 
    controller.getMigrationStatus(req, res)
  );

  // Backup operations
  router.get('/projects/:id/backups', (req, res) => 
    controller.getBackups(req, res)
  );

  router.post('/projects/:id/backups', (req, res) => 
    controller.createBackup(req, res)
  );

  router.post('/projects/:id/backups/:backupId/restore', (req, res) => 
    controller.restoreBackup(req, res)
  );

  router.delete('/projects/:id/backups/:backupId', (req, res) => 
    controller.deleteBackup(req, res)
  );

  return router;
}
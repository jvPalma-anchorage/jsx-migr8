import { z } from 'zod';

// Request/Response schemas
export const InitProjectSchema = z.object({
  rootPath: z.string(),
  blacklist: z.array(z.string()).optional(),
  packages: z.array(z.string()).optional(),
  includePatterns: z.array(z.string()).optional(),
  ignorePatterns: z.array(z.string()).optional(),
});

export const ComponentAnalysisSchema = z.object({
  projectId: z.string(),
  components: z.array(z.string()).optional(),
  depth: z.number().min(1).max(10).optional(),
});

export const DryRunMigrationSchema = z.object({
  projectId: z.string(),
  rulesPath: z.string(),
  targetComponents: z.array(z.string()).optional(),
  options: z.object({
    createBackup: z.boolean().optional(),
    interactive: z.boolean().optional(),
    batchSize: z.number().optional(),
  }).optional(),
});

export const MigrationProgressSchema = z.object({
  projectId: z.string(),
  phase: z.enum(['initializing', 'analyzing', 'migrating', 'completed', 'error']),
  progress: z.number().min(0).max(100),
  currentFile: z.string().optional(),
  filesProcessed: z.number(),
  totalFiles: z.number(),
  errors: z.array(z.object({
    file: z.string(),
    error: z.string(),
  })).optional(),
});

// WebSocket message types
export const WSMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subscribe'),
    projectId: z.string(),
  }),
  z.object({
    type: z.literal('unsubscribe'),
    projectId: z.string(),
  }),
  z.object({
    type: z.literal('progress'),
    data: MigrationProgressSchema,
  }),
  z.object({
    type: z.literal('log'),
    level: z.enum(['info', 'warn', 'error', 'debug']),
    message: z.string(),
    timestamp: z.string(),
  }),
  z.object({
    type: z.literal('diff'),
    file: z.string(),
    oldContent: z.string(),
    newContent: z.string(),
    changes: z.array(z.object({
      type: z.enum(['add', 'remove', 'modify']),
      line: z.number(),
      content: z.string(),
    })),
  }),
]);

// Type exports
export type InitProjectRequest = z.infer<typeof InitProjectSchema>;
export type ComponentAnalysisRequest = z.infer<typeof ComponentAnalysisSchema>;
export type DryRunMigrationRequest = z.infer<typeof DryRunMigrationSchema>;
export type MigrationProgress = z.infer<typeof MigrationProgressSchema>;
export type WSMessage = z.infer<typeof WSMessageSchema>;

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ProjectInfo {
  id: string;
  rootPath: string;
  status: 'idle' | 'analyzing' | 'migrating';
  createdAt: string;
  stats?: {
    totalFiles: number;
    totalComponents: number;
    analyzedFiles: number;
  };
}

export interface ComponentInfo {
  name: string;
  path: string;
  type: 'jsx' | 'tsx';
  imports: string[];
  exports: string[];
  usedComponents: string[];
  props: Record<string, any>;
}

export interface MigrationResult {
  projectId: string;
  filesModified: number;
  filesSkipped: number;
  errors: Array<{ file: string; error: string }>;
  diffs: Array<{
    file: string;
    changes: number;
    additions: number;
    deletions: number;
  }>;
}
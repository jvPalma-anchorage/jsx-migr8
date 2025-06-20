#!/usr/bin/env node

/**
 * Example client for testing the jsx-migr8 API
 */

import WebSocket from 'ws';

const API_URL = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3000';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

class JsxMigr8Client {
  private ws?: WebSocket;
  private projectId?: string;

  async initProject(rootPath: string): Promise<string> {
    console.log(`Initializing project at: ${rootPath}`);
    
    const response = await fetch(`${API_URL}/projects/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rootPath,
        blacklist: ['node_modules', '.git', 'dist'],
      }),
    });

    const result: ApiResponse = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to initialize project');
    }

    this.projectId = result.data.projectId;
    console.log(`Project initialized with ID: ${this.projectId}`);
    return this.projectId;
  }

  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);

      this.ws.on('open', () => {
        console.log('WebSocket connected');
        
        // Subscribe to project updates
        if (this.projectId) {
          this.ws!.send(JSON.stringify({
            type: 'subscribe',
            projectId: this.projectId,
          }));
        }
        
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message:', message);

        if (message.type === 'progress') {
          const progress = message.data;
          console.log(`Progress: ${progress.phase} - ${progress.progress}% (${progress.filesProcessed}/${progress.totalFiles} files)`);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('WebSocket disconnected');
      });
    });
  }

  async analyzeComponents(): Promise<void> {
    if (!this.projectId) {
      throw new Error('No project initialized');
    }

    console.log('Analyzing components...');
    
    const response = await fetch(`${API_URL}/analyze/components`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: this.projectId,
      }),
    });

    const result: ApiResponse = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to analyze components');
    }

    console.log(`Found ${result.data.totalComponents} components`);
    console.log('Component summary:', result.data.components);
  }

  async runDryRunMigration(rulesPath: string): Promise<void> {
    if (!this.projectId) {
      throw new Error('No project initialized');
    }

    console.log(`Running dry-run migration with rules: ${rulesPath}`);
    
    const response = await fetch(`${API_URL}/migrate/dry-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: this.projectId,
        rulesPath,
        options: {
          createBackup: true,
        },
      }),
    });

    const result: ApiResponse = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to start migration');
    }

    console.log('Migration started:', result.data);
  }

  async getProjectStatus(): Promise<void> {
    if (!this.projectId) {
      throw new Error('No project initialized');
    }

    const response = await fetch(`${API_URL}/projects/${this.projectId}`);
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get project status');
    }

    console.log('Project status:', result.data);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Example usage
async function main() {
  const client = new JsxMigr8Client();

  try {
    // Initialize project
    const projectPath = process.argv[2] || './test-projects/simple-react-app';
    await client.initProject(projectPath);

    // Connect WebSocket for real-time updates
    await client.connectWebSocket();

    // Wait a bit for WebSocket to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Analyze components
    await client.analyzeComponents();

    // Check project status
    await client.getProjectStatus();

    // Run dry-run migration
    const rulesPath = process.argv[3] || './migr8Rules/test-simple-migration.json';
    await client.runDryRunMigration(rulesPath);

    // Keep connection open to receive progress updates
    console.log('\nListening for migration progress updates...');
    console.log('Press Ctrl+C to exit\n');

  } catch (error) {
    console.error('Error:', error);
    client.disconnect();
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down client...');
  process.exit(0);
});

if (require.main === module) {
  main();
}
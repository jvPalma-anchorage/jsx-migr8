#!/usr/bin/env node

const axios = require('axios');
const WebSocket = require('ws');
const chalk = require('chalk');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3000';
const TEST_PROJECT_PATH = '/data/data/com.termux/files/home/coder/apps/backoffice';

// Helper functions
const log = {
  info: (msg) => console.log(chalk.blue('[INFO]'), msg),
  success: (msg) => console.log(chalk.green('[SUCCESS]'), msg),
  error: (msg) => console.log(chalk.red('[ERROR]'), msg),
  warn: (msg) => console.log(chalk.yellow('[WARN]'), msg),
  section: (msg) => console.log(chalk.bold.cyan(`\n${'='.repeat(50)}\n${msg}\n${'='.repeat(50)}`))
};

// API client helper
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// WebSocket connection manager
class WSManager {
  constructor() {
    this.ws = null;
    this.messages = [];
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);
      
      this.ws.on('open', () => {
        this.connected = true;
        log.success('WebSocket connected');
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.messages.push(message);
          this.handleMessage(message);
        } catch (error) {
          log.error(`Failed to parse WebSocket message: ${error.message}`);
        }
      });
      
      this.ws.on('error', (error) => {
        log.error(`WebSocket error: ${error.message}`);
        reject(error);
      });
      
      this.ws.on('close', () => {
        this.connected = false;
        log.info('WebSocket disconnected');
      });
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case 'progress':
        const progress = message.data;
        log.info(`Progress: ${progress.phase} - ${progress.progress}% (${progress.filesProcessed}/${progress.totalFiles} files)`);
        if (progress.currentFile) {
          log.info(`  Current file: ${progress.currentFile}`);
        }
        break;
      
      case 'log':
        const logMsg = `[${message.level.toUpperCase()}] ${message.message}`;
        switch (message.level) {
          case 'error':
            log.error(logMsg);
            break;
          case 'warn':
            log.warn(logMsg);
            break;
          default:
            log.info(logMsg);
        }
        break;
      
      case 'diff':
        log.info(`File diff for: ${message.file}`);
        log.info(`  Changes: ${message.changes.length}`);
        break;
      
      default:
        log.info(`Received message type: ${message.type}`);
    }
  }

  subscribe(projectId) {
    if (!this.connected) {
      throw new Error('WebSocket not connected');
    }
    
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      projectId
    }));
    log.info(`Subscribed to project: ${projectId}`);
  }

  unsubscribe(projectId) {
    if (!this.connected) return;
    
    this.ws.send(JSON.stringify({
      type: 'unsubscribe',
      projectId
    }));
    log.info(`Unsubscribed from project: ${projectId}`);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  getMessages() {
    return this.messages;
  }
}

// Test workflow functions
async function testCreateProject(projectPath) {
  log.section('Testing Project Creation');
  
  try {
    const payload = {
      rootPath: projectPath,
      blacklist: ['node_modules', '.git', 'dist', 'build'],
      includePatterns: ['**/*.jsx', '**/*.tsx', '**/*.js', '**/*.ts'],
      ignorePatterns: ['**/*.test.*', '**/*.spec.*']
    };
    
    log.info('Creating project with payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    const response = await apiClient.post('/projects', payload);
    
    if (response.data.success) {
      log.success(`Project created successfully!`);
      log.info(`Project ID: ${response.data.data.id}`);
      log.info(`Root Path: ${response.data.data.rootPath}`);
      log.info(`Status: ${response.data.data.status}`);
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to create project');
    }
  } catch (error) {
    log.error(`Failed to create project: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

async function testGetProject(projectId) {
  log.section('Testing Project Retrieval');
  
  try {
    const response = await apiClient.get(`/projects/${projectId}`);
    
    if (response.data.success) {
      log.success('Project retrieved successfully!');
      const project = response.data.data;
      log.info(`Project ID: ${project.id}`);
      log.info(`Root Path: ${project.rootPath}`);
      log.info(`Status: ${project.status}`);
      log.info(`Created At: ${project.createdAt}`);
      
      if (project.stats) {
        log.info('Project Statistics:');
        log.info(`  Total Files: ${project.stats.totalFiles}`);
        log.info(`  Total Components: ${project.stats.totalComponents}`);
        log.info(`  Analyzed Files: ${project.stats.analyzedFiles}`);
      }
      
      return project;
    } else {
      throw new Error(response.data.error || 'Failed to get project');
    }
  } catch (error) {
    log.error(`Failed to get project: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

async function testListProjects() {
  log.section('Testing List Projects');
  
  try {
    const response = await apiClient.get('/projects');
    
    if (response.data.success) {
      const projects = response.data.data;
      log.success(`Retrieved ${projects.length} projects`);
      
      projects.forEach((project, index) => {
        log.info(`\nProject ${index + 1}:`);
        log.info(`  ID: ${project.id}`);
        log.info(`  Path: ${project.rootPath}`);
        log.info(`  Status: ${project.status}`);
        log.info(`  Created: ${project.createdAt}`);
      });
      
      return projects;
    } else {
      throw new Error(response.data.error || 'Failed to list projects');
    }
  } catch (error) {
    log.error(`Failed to list projects: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

async function testAnalyzeProject(projectId, wsManager) {
  log.section('Testing Project Analysis');
  
  try {
    // Subscribe to WebSocket updates for this project
    wsManager.subscribe(projectId);
    
    log.info('Starting project analysis...');
    const response = await apiClient.post(`/projects/${projectId}/analyze`);
    
    if (response.data.success) {
      log.success('Analysis started successfully!');
      
      // Wait for analysis to complete (monitor WebSocket messages)
      log.info('Monitoring analysis progress...');
      
      // Poll for completion
      let completed = false;
      let retries = 0;
      const maxRetries = 60; // 5 minutes max
      
      while (!completed && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const projectStatus = await testGetProject(projectId);
        if (projectStatus.status !== 'analyzing') {
          completed = true;
          log.success(`Analysis completed with status: ${projectStatus.status}`);
          
          if (projectStatus.stats) {
            log.info('Final Statistics:');
            log.info(`  Total Files: ${projectStatus.stats.totalFiles}`);
            log.info(`  Total Components: ${projectStatus.stats.totalComponents}`);
            log.info(`  Analyzed Files: ${projectStatus.stats.analyzedFiles}`);
          }
        }
        
        retries++;
      }
      
      if (!completed) {
        log.warn('Analysis timed out after 5 minutes');
      }
      
      // Unsubscribe from WebSocket updates
      wsManager.unsubscribe(projectId);
      
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to start analysis');
    }
  } catch (error) {
    log.error(`Failed to analyze project: ${error.response?.data?.error || error.message}`);
    wsManager.unsubscribe(projectId);
    throw error;
  }
}

async function testMigrationRules() {
  log.section('Testing Migration Rules');
  
  try {
    const response = await apiClient.get('/migration/rules');
    
    if (response.data.success) {
      const rules = response.data.data;
      log.success(`Retrieved ${rules?.length || 0} migration rules`);
      
      if (rules && rules.length > 0) {
        rules.forEach((rule, index) => {
          log.info(`\nRule ${index + 1}:`);
          log.info(`  Name: ${rule.name}`);
          log.info(`  Description: ${rule.description}`);
        });
      }
      
      return rules;
    } else {
      throw new Error(response.data.error || 'Failed to get migration rules');
    }
  } catch (error) {
    log.error(`Failed to get migration rules: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

async function testDryRunMigration(projectId, wsManager) {
  log.section('Testing Dry Run Migration');
  
  try {
    // Subscribe to WebSocket updates
    wsManager.subscribe(projectId);
    
    const payload = {
      projectId,
      rulesPath: './default-rules.json', // Use default rules
      options: {
        createBackup: true,
        interactive: false,
        batchSize: 10
      }
    };
    
    log.info('Starting dry run migration with payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    const response = await apiClient.post(`/projects/${projectId}/migrate`, payload);
    
    if (response.data.success) {
      log.success('Migration started successfully!');
      
      // Wait for migration to complete
      log.info('Monitoring migration progress...');
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const result = response.data.data;
      log.info('Migration Result:');
      log.info(`  Files Modified: ${result.filesModified}`);
      log.info(`  Files Skipped: ${result.filesSkipped}`);
      log.info(`  Errors: ${result.errors?.length || 0}`);
      
      if (result.errors && result.errors.length > 0) {
        log.warn('Migration Errors:');
        result.errors.forEach(err => {
          log.error(`  ${err.file}: ${err.error}`);
        });
      }
      
      if (result.diffs && result.diffs.length > 0) {
        log.info('File Changes:');
        result.diffs.forEach(diff => {
          log.info(`  ${diff.file}: ${diff.additions} additions, ${diff.deletions} deletions`);
        });
      }
      
      wsManager.unsubscribe(projectId);
      return result;
    } else {
      throw new Error(response.data.error || 'Failed to start migration');
    }
  } catch (error) {
    log.error(`Failed to run migration: ${error.response?.data?.error || error.message}`);
    wsManager.unsubscribe(projectId);
    throw error;
  }
}

// Main test runner
async function runCompleteWorkflowTest() {
  log.section('JSX-MIGR8 API WORKFLOW TEST');
  log.info(`Testing with project path: ${TEST_PROJECT_PATH}`);
  log.info(`API URL: ${API_BASE_URL}`);
  log.info(`WebSocket URL: ${WS_URL}`);
  
  const wsManager = new WSManager();
  let projectId = null;
  
  try {
    // 1. Connect WebSocket
    log.section('WebSocket Connection');
    await wsManager.connect();
    
    // 2. Create project
    const project = await testCreateProject(TEST_PROJECT_PATH);
    projectId = project.id;
    
    // 3. List all projects
    await testListProjects();
    
    // 4. Get specific project
    await testGetProject(projectId);
    
    // 5. Analyze project
    await testAnalyzeProject(projectId, wsManager);
    
    // 6. Get migration rules
    await testMigrationRules();
    
    // 7. Run dry-run migration
    await testDryRunMigration(projectId, wsManager);
    
    // 8. Show WebSocket message summary
    log.section('WebSocket Message Summary');
    const messages = wsManager.getMessages();
    log.info(`Total messages received: ${messages.length}`);
    
    const messageCounts = {};
    messages.forEach(msg => {
      messageCounts[msg.type] = (messageCounts[msg.type] || 0) + 1;
    });
    
    Object.entries(messageCounts).forEach(([type, count]) => {
      log.info(`  ${type}: ${count} messages`);
    });
    
    log.section('TEST COMPLETED SUCCESSFULLY');
    
  } catch (error) {
    log.section('TEST FAILED');
    log.error(error.message);
    console.error(error);
  } finally {
    // Cleanup
    wsManager.disconnect();
    
    // Optional: Delete the test project
    if (projectId) {
      try {
        log.info(`\nCleaning up project: ${projectId}`);
        // Note: There's no DELETE endpoint in the routes, so we'll skip this
        // await apiClient.delete(`/projects/${projectId}`);
      } catch (error) {
        log.warn('Failed to cleanup project (this is okay if DELETE endpoint is not implemented)');
      }
    }
  }
}

// Health check
async function checkApiHealth() {
  try {
    await apiClient.get('/health');
    return true;
  } catch (error) {
    // Try root endpoint if health doesn't exist
    try {
      await axios.get(`${API_BASE_URL.replace('/api', '')}/`);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Entry point
async function main() {
  log.info('Checking API availability...');
  
  const isHealthy = await checkApiHealth();
  if (!isHealthy) {
    log.error('API server is not running!');
    log.info('Please start the API server first:');
    log.info('  cd packages/api && npm run dev');
    process.exit(1);
  }
  
  log.success('API server is running!');
  
  // Run the complete workflow test
  await runCompleteWorkflowTest();
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    log.error('Unhandled error:');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  apiClient,
  WSManager,
  testCreateProject,
  testGetProject,
  testListProjects,
  testAnalyzeProject,
  testMigrationRules,
  testDryRunMigration,
  runCompleteWorkflowTest
};
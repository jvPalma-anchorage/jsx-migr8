#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3000';
const TEST_PROJECT_PATH = '/data/data/com.termux/files/home/coder/apps/backoffice';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Logging helpers
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  section: (msg) => console.log(`${colors.bright}${colors.cyan}\n${'='.repeat(50)}\n${msg}\n${'='.repeat(50)}${colors.reset}`)
};

// Simple HTTP request wrapper
function httpRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || `${API_BASE_URL}${options.path}`);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(requestOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          };
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
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
    
    const response = await httpRequest({
      path: '/projects',
      method: 'POST'
    }, payload);
    
    if (response.data.success) {
      log.success('Project created successfully!');
      log.info(`Project ID: ${response.data.data.id}`);
      log.info(`Root Path: ${response.data.data.rootPath}`);
      log.info(`Status: ${response.data.data.status}`);
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to create project');
    }
  } catch (error) {
    log.error(`Failed to create project: ${error.message}`);
    throw error;
  }
}

async function testGetProject(projectId) {
  log.section('Testing Project Retrieval');
  
  try {
    const response = await httpRequest({
      path: `/projects/${projectId}`,
      method: 'GET'
    });
    
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
    log.error(`Failed to get project: ${error.message}`);
    throw error;
  }
}

async function testListProjects() {
  log.section('Testing List Projects');
  
  try {
    const response = await httpRequest({
      path: '/projects',
      method: 'GET'
    });
    
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
    log.error(`Failed to list projects: ${error.message}`);
    throw error;
  }
}

async function testAnalyzeProject(projectId) {
  log.section('Testing Project Analysis');
  
  try {
    log.info('Starting project analysis...');
    const response = await httpRequest({
      path: `/projects/${projectId}/analyze`,
      method: 'POST'
    });
    
    if (response.data.success) {
      log.success('Analysis started successfully!');
      
      // Poll for completion
      log.info('Monitoring analysis progress...');
      let completed = false;
      let retries = 0;
      const maxRetries = 60; // 5 minutes max
      
      while (!completed && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        try {
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
          } else {
            log.info(`Still analyzing... (attempt ${retries + 1}/${maxRetries})`);
          }
        } catch (error) {
          log.warn(`Failed to check status: ${error.message}`);
        }
        
        retries++;
      }
      
      if (!completed) {
        log.warn('Analysis timed out after 5 minutes');
      }
      
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to start analysis');
    }
  } catch (error) {
    log.error(`Failed to analyze project: ${error.message}`);
    throw error;
  }
}

async function testMigrationRules() {
  log.section('Testing Migration Rules');
  
  try {
    const response = await httpRequest({
      path: '/migration/rules',
      method: 'GET'
    });
    
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
    log.error(`Failed to get migration rules: ${error.message}`);
    throw error;
  }
}

async function checkApiHealth() {
  try {
    await httpRequest({
      url: `${API_BASE_URL.replace('/api', '')}/`,
      method: 'GET'
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Main test runner
async function runCompleteWorkflowTest() {
  log.section('JSX-MIGR8 API WORKFLOW TEST');
  log.info(`Testing with project path: ${TEST_PROJECT_PATH}`);
  log.info(`API URL: ${API_BASE_URL}`);
  
  let projectId = null;
  
  try {
    // 1. Create project
    const project = await testCreateProject(TEST_PROJECT_PATH);
    projectId = project.id;
    
    // 2. List all projects
    await testListProjects();
    
    // 3. Get specific project
    await testGetProject(projectId);
    
    // 4. Analyze project
    await testAnalyzeProject(projectId);
    
    // 5. Get migration rules
    await testMigrationRules();
    
    log.section('TEST COMPLETED SUCCESSFULLY');
    log.success('All API endpoints tested successfully!');
    
  } catch (error) {
    log.section('TEST FAILED');
    log.error(error.message);
    console.error(error);
    process.exit(1);
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
  httpRequest,
  testCreateProject,
  testGetProject,
  testListProjects,
  testAnalyzeProject,
  testMigrationRules,
  runCompleteWorkflowTest
};
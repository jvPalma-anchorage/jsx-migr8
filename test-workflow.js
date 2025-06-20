import fetch from 'node-fetch';
import WebSocket from 'ws';
import chalk from 'chalk';

const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';
const TEST_ROOT_PATH = '/data/data/com.termux/files/home/coder/apps/backoffice';

class WorkflowTester {
  constructor() {
    this.projectId = null;
    this.ws = null;
    this.wsMessages = [];
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      console.log(chalk.blue('🔌 Connecting to WebSocket...'));
      
      this.ws = new WebSocket(WS_URL);
      
      this.ws.on('open', () => {
        console.log(chalk.green('✅ WebSocket connected'));
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.wsMessages.push(message);
          
          if (message.type === 'progress') {
            console.log(chalk.gray(`📊 Progress: ${message.data.phase} - ${message.data.progress}%`));
          } else if (message.type === 'log') {
            console.log(chalk.gray(`📝 Log: ${message.data}`));
          } else if (message.type === 'error') {
            console.log(chalk.red(`❌ Error: ${message.data.message}`));
          }
        } catch (err) {
          console.error(chalk.red('Failed to parse WebSocket message'), err);
        }
      });
      
      this.ws.on('error', (error) => {
        console.error(chalk.red('WebSocket error:'), error);
        reject(error);
      });
      
      this.ws.on('close', () => {
        console.log(chalk.yellow('WebSocket disconnected'));
      });
    });
  }

  async testHealthCheck() {
    console.log(chalk.blue('\n1️⃣  Testing API Health Check...'));
    
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      
      if (response.ok && data.status === 'ok') {
        console.log(chalk.green('✅ API is healthy'));
        return true;
      } else {
        console.log(chalk.red('❌ API health check failed'));
        return false;
      }
    } catch (error) {
      console.log(chalk.red('❌ Cannot connect to API server'));
      console.error(error.message);
      return false;
    }
  }

  async createProject() {
    console.log(chalk.blue('\n2️⃣  Creating Project...'));
    console.log(chalk.gray(`Path: ${TEST_ROOT_PATH}`));
    
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: TEST_ROOT_PATH,
          name: 'Backoffice Test Project'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.log(chalk.red(`❌ Failed to create project: ${data.error}`));
        if (data.suggestions) {
          console.log(chalk.yellow('💡 Suggestions:'));
          data.suggestions.forEach(s => console.log(chalk.gray(`   - ${s}`)));
        }
        return false;
      }
      
      this.projectId = data.data.id;
      console.log(chalk.green(`✅ Project created with ID: ${this.projectId}`));
      console.log(chalk.gray(`   Name: ${data.data.name}`));
      console.log(chalk.gray(`   Path: ${data.data.path}`));
      console.log(chalk.gray(`   Status: ${data.data.status}`));
      
      // Subscribe to project updates
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'subscribe', projectId: this.projectId }));
      }
      
      return true;
    } catch (error) {
      console.log(chalk.red('❌ Failed to create project'));
      console.error(error.message);
      return false;
    }
  }

  async getProjectDetails() {
    console.log(chalk.blue('\n3️⃣  Getting Project Details...'));
    
    try {
      const response = await fetch(`${API_URL}/api/projects/${this.projectId}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.log(chalk.red(`❌ Failed to get project: ${data.error}`));
        return false;
      }
      
      console.log(chalk.green('✅ Project details retrieved'));
      console.log(chalk.gray(`   ID: ${data.data.id}`));
      console.log(chalk.gray(`   Name: ${data.data.name}`));
      console.log(chalk.gray(`   Path: ${data.data.path}`));
      console.log(chalk.gray(`   Status: ${data.data.status}`));
      
      return true;
    } catch (error) {
      console.log(chalk.red('❌ Failed to get project details'));
      console.error(error.message);
      return false;
    }
  }

  async analyzeProject() {
    console.log(chalk.blue('\n4️⃣  Analyzing Project Components...'));
    
    try {
      const response = await fetch(`${API_URL}/api/projects/${this.projectId}/analyze`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.log(chalk.red(`❌ Failed to analyze project: ${data.error}`));
        return false;
      }
      
      console.log(chalk.green('✅ Project analysis completed'));
      console.log(chalk.gray(`   Files analyzed: ${data.data.filesAnalyzed}`));
      console.log(chalk.gray(`   Components found: ${data.data.componentsFound}`));
      
      if (data.data.packages && data.data.packages.length > 0) {
        console.log(chalk.gray(`   Packages:`));
        data.data.packages.forEach(pkg => {
          console.log(chalk.gray(`     - ${pkg.name}: ${pkg.components.length} components`));
        });
      }
      
      if (data.data.components && data.data.components.length > 0) {
        console.log(chalk.gray(`\n   Sample components:`));
        data.data.components.slice(0, 5).forEach(comp => {
          console.log(chalk.gray(`     - ${comp.name} (${comp.package})`));
          console.log(chalk.gray(`       Path: ${comp.filePath}`));
          console.log(chalk.gray(`       Props: ${comp.props.length}`));
          console.log(chalk.gray(`       Usage: ${comp.usageCount} times`));
        });
        
        if (data.data.components.length > 5) {
          console.log(chalk.gray(`     ... and ${data.data.components.length - 5} more`));
        }
      }
      
      return true;
    } catch (error) {
      console.log(chalk.red('❌ Failed to analyze project'));
      console.error(error.message);
      return false;
    }
  }

  async listProjects() {
    console.log(chalk.blue('\n5️⃣  Listing All Projects...'));
    
    try {
      const response = await fetch(`${API_URL}/api/projects`);
      const data = await response.json();
      
      if (!response.ok) {
        console.log(chalk.red(`❌ Failed to list projects: ${data.error}`));
        return false;
      }
      
      console.log(chalk.green(`✅ Found ${data.data.length} project(s)`));
      data.data.forEach((project, index) => {
        console.log(chalk.gray(`   ${index + 1}. ${project.name}`));
        console.log(chalk.gray(`      ID: ${project.id}`));
        console.log(chalk.gray(`      Path: ${project.path}`));
        console.log(chalk.gray(`      Status: ${project.status}`));
      });
      
      return true;
    } catch (error) {
      console.log(chalk.red('❌ Failed to list projects'));
      console.error(error.message);
      return false;
    }
  }

  async getMigrationRules() {
    console.log(chalk.blue('\n6️⃣  Getting Migration Rules...'));
    
    try {
      const response = await fetch(`${API_URL}/api/migration/rules`);
      const data = await response.json();
      
      if (!response.ok) {
        console.log(chalk.red(`❌ Failed to get migration rules: ${data.error}`));
        return false;
      }
      
      console.log(chalk.green(`✅ Found ${data.data.length} migration rule(s)`));
      data.data.forEach((rule, index) => {
        console.log(chalk.gray(`   ${index + 1}. ${rule.name}`));
        console.log(chalk.gray(`      ID: ${rule.id}`));
        console.log(chalk.gray(`      Description: ${rule.description}`));
        console.log(chalk.gray(`      Source: ${rule.sourcePackage} → Target: ${rule.targetPackage}`));
      });
      
      return true;
    } catch (error) {
      console.log(chalk.red('❌ Failed to get migration rules'));
      console.error(error.message);
      return false;
    }
  }

  async runFullWorkflow() {
    console.log(chalk.bold.cyan('\n🚀 Starting jsx-migr8 Workflow Test\n'));
    console.log(chalk.gray(`Testing with path: ${TEST_ROOT_PATH}`));
    console.log(chalk.gray('─'.repeat(60)));
    
    // Connect WebSocket first
    try {
      await this.connectWebSocket();
    } catch (error) {
      console.log(chalk.red('❌ Failed to connect WebSocket, continuing without real-time updates'));
    }
    
    // Run tests
    const tests = [
      () => this.testHealthCheck(),
      () => this.createProject(),
      () => this.getProjectDetails(),
      () => this.analyzeProject(),
      () => this.listProjects(),
      () => this.getMigrationRules()
    ];
    
    let passedTests = 0;
    let failedTests = 0;
    
    for (const test of tests) {
      const result = await test();
      if (result) {
        passedTests++;
      } else {
        failedTests++;
      }
      
      // Small delay between tests
      await this.delay(500);
    }
    
    // Summary
    console.log(chalk.gray('\n' + '─'.repeat(60)));
    console.log(chalk.bold.cyan('\n📊 Test Summary\n'));
    console.log(chalk.green(`   ✅ Passed: ${passedTests}`));
    console.log(chalk.red(`   ❌ Failed: ${failedTests}`));
    console.log(chalk.blue(`   📨 WebSocket messages received: ${this.wsMessages.length}`));
    
    if (failedTests === 0) {
      console.log(chalk.bold.green('\n🎉 All tests passed! The workflow is working correctly.'));
    } else {
      console.log(chalk.bold.yellow('\n⚠️  Some tests failed. Please check the errors above.'));
    }
    
    // Cleanup
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Check if servers are running first
async function checkServers() {
  try {
    // Try multiple times with delay
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) return true;
      } catch (e) {
        console.log(chalk.gray(`Connection attempt ${i + 1} failed: ${e.message}`));
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function main() {
  console.log(chalk.bold.blue('jsx-migr8 Workflow Tester'));
  console.log(chalk.gray('Version 1.0.0\n'));
  
  // Check if servers are running
  console.log(chalk.blue('Checking if servers are running...'));
  const serversRunning = await checkServers();
  
  if (!serversRunning) {
    console.log(chalk.red('\n❌ API server is not running!'));
    console.log(chalk.yellow('Please start the servers first:'));
    console.log(chalk.gray('   ./scripts/termux-dev.sh'));
    process.exit(1);
  }
  
  console.log(chalk.green('✅ Servers are running'));
  
  // Run workflow test
  const tester = new WorkflowTester();
  await tester.runFullWorkflow();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n💥 Unhandled error:'), error);
  process.exit(1);
});

// Run the test
main().catch(error => {
  console.error(chalk.red('\n💥 Fatal error:'), error);
  process.exit(1);
});
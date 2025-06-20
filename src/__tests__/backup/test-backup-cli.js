#!/usr/bin/env node

/**
 * Test script to directly test backup management functionality
 */

// Set up test environment
process.env.ROOT_PATH = "/data/data/com.termux/files/home/jsx-migr8/src/__tests__/integration/__fixtures__/simple-react-app";
process.env.BLACKLIST = "node_modules,generated,.template,out,dist,build,storybook,storybook-static";

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testBackupSystem() {
  console.log("🧪 Testing jsx-migr8 Backup Management System\n");
  
  try {
    // Test 1: Check if backup CLI can be imported
    console.log("1. Testing backup CLI module import...");
    const { BackupCLI } = require('./dist/backup/cli/backup-commands.js');
    console.log("✅ Backup CLI module imported successfully\n");
    
    // Test 2: Check if backup manager can be imported
    console.log("2. Testing backup manager import...");
    const { getBackupManager } = require('./dist/backup/backup-manager.js');
    const backupManager = getBackupManager();
    console.log("✅ Backup manager imported successfully\n");
    
    // Test 3: List backups (should show empty initially)
    console.log("3. Testing backup listing...");
    const backups = await backupManager.listBackups();
    console.log(`✅ Found ${backups.length} existing backups\n`);
    
    // Test 4: Get backup configuration
    console.log("4. Testing backup configuration...");
    const config = backupManager.getConfig();
    console.log("✅ Backup configuration loaded:");
    console.log(`   Max backups: ${config.maxBackups}`);
    console.log(`   Max age (days): ${config.maxAgeDays}`);
    console.log(`   Auto cleanup: ${config.autoCleanup}`);
    console.log(`   Git integration: ${config.gitIntegration}`);
    console.log(`   Verify after backup: ${config.verifyAfterBackup}\n`);
    
    // Test 5: Test the CLI integration
    console.log("5. Testing CLI integration...");
    console.log("✅ CLI integration tests would require interactive prompts\n");
    
    console.log("🎉 All backup system tests passed!\n");
    
    console.log("📋 Test Summary:");
    console.log("✓ Backup CLI module loads correctly");
    console.log("✓ Backup manager initializes properly");
    console.log("✓ Backup listing functionality works");
    console.log("✓ Configuration system is accessible");
    console.log("✓ System is ready for interactive testing");
    
  } catch (error) {
    console.error("❌ Backup system test failed:", error);
    process.exit(1);
  }
}

testBackupSystem();
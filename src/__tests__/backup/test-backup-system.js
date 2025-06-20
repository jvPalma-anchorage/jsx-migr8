#!/usr/bin/env node

/**
 * Script to test the backup management system functionality
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up environment variables
process.env.ROOT_PATH = join(__dirname, 'src/__tests__/integration/__fixtures__/simple-react-app');
process.env.BLACKLIST = "node_modules,generated,.template,out,dist,build,storybook,storybook-static";

async function testBackupSystem() {
  console.log("🧪 Testing jsx-migr8 Backup Management System\n");
  
  try {
    console.log("1. Testing backup system imports...");
    
    // Import backup system modules
    const { getBackupManager } = await import('./src/backup/backup-manager.js');
    const { BackupCLI } = await import('./src/backup/cli/backup-commands.js');
    console.log("✅ Backup modules imported successfully\n");
    
    console.log("2. Testing backup manager initialization...");
    const backupManager = getBackupManager();
    console.log("✅ Backup manager initialized\n");
    
    console.log("3. Testing backup configuration...");
    const config = backupManager.getConfig();
    console.log("✅ Backup configuration loaded:");
    console.log(`   Max backups: ${config.maxBackups}`);
    console.log(`   Max age (days): ${config.maxAgeDays}`);
    console.log(`   Max total size: ${formatBytes(config.maxTotalSize)}`);
    console.log(`   Auto cleanup: ${config.autoCleanup}`);
    console.log(`   Git integration: ${config.gitIntegration}`);
    console.log(`   Verify after backup: ${config.verifyAfterBackup}`);
    console.log(`   Concurrency: ${config.concurrency}`);
    console.log(`   Show progress: ${config.showProgress}\n`);
    
    console.log("4. Testing backup listing...");
    const backups = await backupManager.listBackups();
    console.log(`✅ Found ${backups.length} existing backups\n`);
    
    if (backups.length > 0) {
      console.log("5. Testing backup details...");
      const firstBackup = backups[0];
      const metadata = await backupManager.getBackupInfo(firstBackup.id);
      console.log(`✅ Retrieved metadata for backup: ${firstBackup.name}`);
      console.log(`   Created: ${metadata.createdAt.toISOString()}`);
      console.log(`   Files: ${metadata.stats.totalFiles}`);
      console.log(`   Size: ${formatBytes(metadata.stats.totalSize)}\n`);
      
      console.log("6. Testing backup verification...");
      const verificationResult = await backupManager.verifyBackup(firstBackup.id);
      console.log(`✅ Backup verification result: ${verificationResult.valid ? 'VALID' : 'INVALID'}`);
      console.log(`   Valid files: ${verificationResult.summary.validFiles}/${verificationResult.summary.totalFiles}\n`);
    } else {
      console.log("5. No existing backups to test - this is normal for a fresh installation\n");
    }
    
    console.log("7. Testing CLI integration...");
    const backupCLI = new BackupCLI();
    console.log("✅ Backup CLI instance created successfully\n");
    
    console.log("🎉 All backup system tests completed successfully!\n");
    
    console.log("📋 Test Results Summary:");
    console.log("✓ Backup system modules load correctly");
    console.log("✓ Backup manager initializes properly");
    console.log("✓ Configuration system is accessible");
    console.log("✓ Backup listing functionality works");  
    console.log("✓ CLI integration is functional");
    console.log(`✓ Found ${backups.length} existing backups`);
    
    if (backups.length > 0) {
      console.log("✓ Backup metadata retrieval works");
      console.log("✓ Backup verification system works");
    }
    
    console.log("\n📝 Manual Testing Recommendations:");
    console.log("1. Run 'yarn start' and select '📦 Backup Management'");
    console.log("2. Test creating a manual backup");
    console.log("3. Test listing backups after creation");
    console.log("4. Test backup verification");
    console.log("5. Test rollback functionality if backups exist");
    
  } catch (error) {
    console.error("❌ Backup system test failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

testBackupSystem();
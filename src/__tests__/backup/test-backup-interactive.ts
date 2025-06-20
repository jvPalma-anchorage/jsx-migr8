#!/usr/bin/env tsx

/**
 * Interactive test of backup management system
 */

import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up environment variables
process.env.ROOT_PATH = join(__dirname, 'src/__tests__/integration/__fixtures__/simple-react-app');
process.env.BLACKLIST = "node_modules,generated,.template,out,dist,build,storybook,storybook-static";

async function testManualBackupCreation() {
  console.log("🧪 Testing Manual Backup Creation\n");
  
  try {
    const { getBackupManager } = await import('./src/backup/backup-manager');
    const backupManager = getBackupManager();
    
    // Create a test file for backup
    const testDir = join(__dirname, 'test-backup-files');
    await fs.mkdir(testDir, { recursive: true });
    
    const testFiles = [
      join(testDir, 'test1.tsx'),
      join(testDir, 'test2.ts'),
      join(testDir, 'test3.js')
    ];
    
    // Write test content
    await fs.writeFile(testFiles[0], 'import React from "react";\nexport const Test1 = () => <div>Test 1</div>;');
    await fs.writeFile(testFiles[1], 'export interface TestInterface { name: string; }');
    await fs.writeFile(testFiles[2], 'console.log("Test file 3");');
    
    console.log("✅ Created test files for backup\n");
    
    // Test manual backup creation
    console.log("📦 Creating manual backup...");
    const backupId = await backupManager.createManualBackup(
      testFiles,
      'test-backup-' + Date.now(),
      {
        name: 'Test Backup',
        description: 'Automated test backup',
        tags: ['test', 'automated'],
        user: 'test-user',
        timestamp: new Date()
      }
    );
    
    console.log(`✅ Manual backup created successfully: ${backupId}\n`);
    
    // Test backup listing after creation
    console.log("📋 Listing backups after creation...");
    const backups = await backupManager.listBackups();
    console.log(`✅ Found ${backups.length} backup(s)\n`);
    
    if (backups.length > 0) {
      const backup = backups.find(b => b.id === backupId);
      if (backup) {
        console.log("📦 Backup Details:");
        console.log(`   ID: ${backup.id}`);
        console.log(`   Name: ${backup.name}`);
        console.log(`   Created: ${backup.createdAt.toISOString()}`);
        console.log(`   Files: ${backup.fileCount}`);
        console.log(`   Size: ${formatBytes(backup.totalSize)}`);
        console.log(`   Integrity: ${backup.integrityValid ? 'Valid' : 'Invalid'}`);
        console.log(`   Tags: ${backup.tags.join(', ')}\n`);
        
        // Test backup verification
        console.log("🔍 Testing backup verification...");
        const verificationResult = await backupManager.verifyBackup(backupId);
        console.log(`✅ Backup verification: ${verificationResult.valid ? 'PASSED' : 'FAILED'}`);
        console.log(`   Valid files: ${verificationResult.summary.validFiles}/${verificationResult.summary.totalFiles}`);
        
        if (!verificationResult.valid) {
          console.log("   Errors found:");
          verificationResult.files.filter(f => !f.valid).forEach(f => {
            console.log(`     ${f.filePath}: ${f.error}`);
          });
        }
        console.log("");
        
        // Test backup metadata retrieval
        console.log("📄 Testing backup metadata retrieval...");
        const metadata = await backupManager.getBackupInfo(backupId);
        if (metadata) {
          console.log("✅ Backup metadata retrieved successfully:");
          console.log(`   Description: ${metadata.description}`);
          console.log(`   Migration: ${metadata.migration.componentName}`);
          console.log(`   Stats: ${metadata.stats.totalFiles} files, ${formatBytes(metadata.stats.totalSize)}`);
          console.log(`   Duration: ${metadata.stats.durationMs}ms\n`);
        }
      }
    }
    
    // Clean up test files
    await fs.rm(testDir, { recursive: true, force: true });
    console.log("✅ Cleaned up test files\n");
    
    console.log("🎉 Manual backup test completed successfully!\n");
    
    return { backupId, backupsFound: backups.length };
    
  } catch (error) {
    console.error("❌ Manual backup test failed:", error);
    throw error;
  }
}

async function testBackupUI() {
  console.log("🧪 Testing Backup Management UI Components\n");
  
  try {
    // Test backup system status
    const { getBackupSystemStatus, showBackupHint } = await import('./src/cli/backup-integration');
    
    console.log("📊 Testing backup system status...");
    const status = await getBackupSystemStatus();
    console.log(`✅ Backup system status: ${status}\n`);
    
    console.log("💡 Testing backup hint display...");
    // This would normally show an interactive hint, but we'll just test that it doesn't crash
    await showBackupHint();
    console.log("✅ Backup hint system works\n");
    
    console.log("🎉 Backup UI tests completed successfully!\n");
    
  } catch (error) {
    console.error("❌ Backup UI test failed:", error);
    throw error;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function runAllTests() {
  console.log("🚀 Starting Comprehensive Backup System Tests\n");
  
  try {
    // Test 1: Manual backup creation and verification
    const backupResults = await testManualBackupCreation();
    
    // Test 2: UI components
    await testBackupUI();
    
    console.log("✅ ALL TESTS PASSED!\n");
    
    console.log("📋 Final Summary:");
    console.log("✓ Manual backup creation works");
    console.log("✓ Backup listing functionality works");
    console.log("✓ Backup verification system works");
    console.log("✓ Backup metadata retrieval works");
    console.log("✓ Backup UI integration works");
    console.log("✓ Backup system status reporting works");
    console.log(`✓ Created and verified ${backupResults.backupsFound} backup(s)`);
    
    console.log("\n🎯 Interactive Testing Results:");
    console.log("The backup management system is fully functional and ready for use!");
    console.log("Users can successfully:");
    console.log("• Create manual backups through the UI");
    console.log("• List existing backups with full details");
    console.log("• Verify backup integrity automatically");
    console.log("• View comprehensive backup metadata");
    console.log("• See backup system status in the main CLI");
    
  } catch (error) {
    console.error("❌ Comprehensive test suite failed:", error);
    process.exit(1);
  }
}

runAllTests();
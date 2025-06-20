#!/usr/bin/env tsx
import { BackupManager } from '../../backup/backup-manager.js';
import path from 'path';
import fs from 'fs';

const testProjectPath = '/data/data/com.termux/files/home/jsx-migr8/test-projects/test-react-project';

console.log('🧪 Testing backup functionality...');
console.log('📂 Target project:', testProjectPath);

async function testBackupSystem() {
  try {
    const backupRoot = path.join(testProjectPath, '.migr8-backups');
    const backupManager = new BackupManager(backupRoot, {
      retentionDays: 7,
      maxBackups: 5,
      compressionEnabled: false
    });

    console.log('\n📦 Creating backup...');
    
    // Get files to backup
    const filesToBackup = [
      path.join(testProjectPath, 'src/components/TestOldUIComponents.tsx'),
      path.join(testProjectPath, 'src/App.tsx'),
      path.join(testProjectPath, 'package.json')
    ];
    
    const backupId = await backupManager.createManualBackup(
      filesToBackup,
      'Pre-migration backup for jsx-migr8 test',
      { description: 'Test backup before migration' }
    );

    console.log('✅ Backup created with ID:', backupId);

    // List available backups
    console.log('\n📋 Available backups:');
    const backups = await backupManager.listBackups();
    backups.forEach(backup => {
      console.log(`  - ${backup.id}: ${backup.description}`);
      console.log(`    Created: ${backup.createdAt}`);
      console.log(`    Files: ${backup.fileCount}, Size: ${Math.round(backup.totalSize / 1024)}KB`);
    });

    // Verify backup integrity
    console.log('\n🔍 Verifying backup integrity...');
    const isValid = await backupManager.verifyBackup(backupId);
    console.log('Backup integrity:', isValid ? '✅ Valid' : '❌ Invalid');

    return backupId;
  } catch (error) {
    console.error('❌ Backup test failed:', error.message);
    throw error;
  }
}

testBackupSystem()
  .then(backupId => {
    console.log('\n🎉 Backup system test completed successfully!');
    console.log('🔑 Backup ID for testing:', backupId);
  })
  .catch(error => {
    console.error('💥 Backup system test failed:', error);
    process.exit(1);
  });
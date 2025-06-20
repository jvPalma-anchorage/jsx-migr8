#!/usr/bin/env tsx

/**
 * Simple Backup System Test
 */

import { BackupManager } from './src/backup/index.js';

async function testBackup() {
  console.log('🧪 Testing backup system...');
  
  try {
    const backupManager = new BackupManager('/data/data/com.termux/files/home/jsx-migr8/.migr8-backups');
    
    // Test listing backups
    const backups = await backupManager.listBackups();
    console.log(`✅ Backup listing successful`);
    console.log(`💾 Found ${backups.length} existing backups`);
    
    // Test backup validation if any exist
    if (backups.length > 0) {
      const firstBackup = backups[0];
      console.log(`🔍 Testing backup validation for: ${firstBackup.id}`);
      
      const isValid = await backupManager.verifyBackup(firstBackup.id);
      console.log(`✅ Backup verification: ${isValid ? 'VALID' : 'INVALID'}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Backup test failed:`, error);
    return false;
  }
}

testBackup().then(success => {
  console.log(`\\n🎯 Backup system test: ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
});
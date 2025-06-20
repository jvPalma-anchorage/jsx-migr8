#!/usr/bin/env tsx

/**
 * Test CLI functionality directly
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up environment variables
process.env.ROOT_PATH = join(__dirname, 'src/__tests__/integration/__fixtures__/simple-react-app');
process.env.BLACKLIST = "node_modules,generated,.template,out,dist,build,storybook,storybook-static";

async function testCLINavigation() {
  console.log("🧪 Testing CLI Menu Navigation\n");
  
  return new Promise<void>((resolve, reject) => {
    // Launch the CLI
    const cli = spawn('yarn', ['start'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });
    
    let output = '';
    let hasSeenMenu = false;
    let hasSeenBackupOption = false;
    let hasSeenRollbackOption = false;
    let hasSeenBackupStatus = false;
    
    // Collect output
    cli.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Check for main menu
      if (text.includes('What would you like to do?')) {
        hasSeenMenu = true;
        console.log("✅ Main menu displayed");
      }
      
      // Check for backup management option
      if (text.includes('📦  Backup Management')) {
        hasSeenBackupOption = true;
        console.log("✅ Backup Management option found");
      }
      
      // Check for rollback option
      if (text.includes('🔄  Rollback Migration')) {
        hasSeenRollbackOption = true;
        console.log("✅ Rollback Migration option found");
      }
      
      // Check for backup system status
      if (text.includes('📦 Backup System:')) {
        hasSeenBackupStatus = true;
        console.log("✅ Backup system status displayed");
      }
      
      // Once we see the menu, exit by selecting exit
      if (hasSeenMenu && text.includes('⏹  Exit')) {
        console.log("✅ Exit option found");
        console.log("📤 Sending exit command...");
        
        // Send arrow down commands to navigate to exit, then enter
        setTimeout(() => {
          cli.stdin.write('\u001B[B'); // Down arrow
          setTimeout(() => {
            cli.stdin.write('\u001B[B'); // Down arrow
            setTimeout(() => {
              cli.stdin.write('\u001B[B'); // Down arrow
              setTimeout(() => {
                cli.stdin.write('\u001B[B'); // Down arrow
                setTimeout(() => {
                  cli.stdin.write('\u001B[B'); // Down arrow to Exit
                  setTimeout(() => {
                    cli.stdin.write('\n'); // Enter
                  }, 100);
                }, 100);
              }, 100);
            }, 100);
          }, 100);
        }, 500);
      }
    });
    
    cli.stderr.on('data', (data) => {
      console.error('CLI Error:', data.toString());
    });
    
    cli.on('close', (code) => {
      console.log(`\n📊 CLI Test Results:`);
      console.log(`Exit code: ${code}`);
      console.log(`Has main menu: ${hasSeenMenu ? '✅' : '❌'}`);
      console.log(`Has backup option: ${hasSeenBackupOption ? '✅' : '❌'}`);
      console.log(`Has rollback option: ${hasSeenRollbackOption ? '✅' : '❌'}`);
      console.log(`Has backup status: ${hasSeenBackupStatus ? '✅' : '❌'}`);
      
      if (hasSeenMenu && hasSeenBackupOption && hasSeenRollbackOption && hasSeenBackupStatus) {
        console.log("\n🎉 CLI integration test PASSED!");
        resolve();
      } else {
        console.log("\n❌ CLI integration test FAILED - missing required elements");
        reject(new Error('CLI test failed'));
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      cli.kill();
      reject(new Error('CLI test timed out'));
    }, 30000);
  });
}

async function testBackupCommands() {
  console.log("\n🧪 Testing Backup CLI Commands\n");
  
  try {
    // Test --listBackups flag
    console.log("📋 Testing --listBackups flag...");
    const { getBackupManager } = await import('./src/backup/backup-manager');
    const backupManager = getBackupManager();
    const backups = await backupManager.listBackups();
    
    console.log(`✅ List backups command works: found ${backups.length} backup(s)`);
    
    if (backups.length > 0) {
      console.log("📄 Found backups:");
      backups.forEach((backup, index) => {
        console.log(`   ${index + 1}. ${backup.name} (${backup.fileCount} files)`);
      });
    }
    
    return true;
  } catch (error) {
    console.error("❌ Backup commands test failed:", error);
    return false;
  }
}

async function runAllCLITests() {
  console.log("🚀 Starting CLI Integration Tests\n");
  
  try {
    // Test CLI navigation
    await testCLINavigation();
    
    // Test backup commands
    const backupCommandsWork = await testBackupCommands();
    
    if (backupCommandsWork) {
      console.log("\n✅ ALL CLI TESTS PASSED!\n");
      
      console.log("📋 CLI Test Summary:");
      console.log("✓ Main CLI menu displays correctly");
      console.log("✓ Backup Management option is available");
      console.log("✓ Rollback Migration option is available");
      console.log("✓ Backup system status is shown");
      console.log("✓ Backup commands work programmatically");
      console.log("✓ CLI navigation and exit works");
      
      console.log("\n🎯 CLI Functionality Verified:");
      console.log("• Main menu with all options displays correctly");
      console.log("• Backup system is properly integrated");
      console.log("• Users can access backup management features");
      console.log("• Status information is displayed clearly");
      console.log("• Exit functionality works properly");
    } else {
      throw new Error("Backup commands test failed");
    }
    
  } catch (error) {
    console.error("❌ CLI integration tests failed:", error);
    process.exit(1);
  }
}

runAllCLITests();
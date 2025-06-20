#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

console.log(chalk.bold.cyan('🧪 Testing jsx-migr8 Migration Improvements\n'));

// Test configuration
const ROOT_PATH = '/data/data/com.termux/files/home/coder/apps/backoffice';
const MIGR8_RULES_DIR = path.join(process.cwd(), 'migr8Rules');

// Check if backoffice directory exists
if (!fs.existsSync(ROOT_PATH)) {
  console.log(chalk.red(`❌ Test directory not found: ${ROOT_PATH}`));
  console.log(chalk.yellow('Please ensure the backoffice project is available at the specified path.'));
  process.exit(1);
}

console.log(chalk.blue('📁 Test Configuration:'));
console.log(chalk.gray(`   Root Path: ${ROOT_PATH}`));
console.log(chalk.gray(`   Rules Directory: ${MIGR8_RULES_DIR}`));

// List available migration rules
console.log(chalk.blue('\n📋 Available Migration Rules:'));
try {
  const ruleFiles = fs.readdirSync(MIGR8_RULES_DIR)
    .filter(f => f.endsWith('-migr8.json'))
    .sort();
  
  ruleFiles.forEach((file, index) => {
    const rulePath = path.join(MIGR8_RULES_DIR, file);
    const rule = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
    const hasTodos = JSON.stringify(rule).includes('TODO');
    
    console.log(chalk.gray(`   ${index + 1}. ${file}`));
    console.log(chalk.gray(`      Components: ${rule.lookup?.components?.join(', ') || 'None'}`));
    console.log(chalk.gray(`      Rules: ${rule.migr8rules?.[0]?.rules?.length || 0}`));
    if (hasTodos) {
      console.log(chalk.yellow(`      ⚠️  Contains TODO placeholders`));
    }
  });
} catch (error) {
  console.log(chalk.red('   Failed to list migration rules'));
}

// Run the migration in dry-run mode
console.log(chalk.blue('\n🚀 Running Migration Test (Dry Run)...'));
console.log(chalk.gray('   This will analyze the codebase and show what would be migrated.\n'));

try {
  // Set environment variable for the root path
  process.env.ROOT_PATH = ROOT_PATH;
  
  // Run the migration tool
  const startTime = Date.now();
  const output = execSync('yarn start', {
    cwd: process.cwd(),
    env: { ...process.env, ROOT_PATH },
    encoding: 'utf8',
    input: '2\n1\n3\n' // Select dry-run, first rule, then exit
  });
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Parse the output to extract statistics
  const lines = output.split('\n');
  let filesProcessed = 0;
  let successfulMigrations = 0;
  let failedMigrations = 0;
  
  lines.forEach(line => {
    if (line.includes('files for migration')) {
      const match = line.match(/(\d+) files for migration/);
      if (match) filesProcessed = parseInt(match[1]);
    }
    if (line.includes('✅') && line.includes('migrated')) {
      successfulMigrations++;
    }
    if (line.includes('❌') || line.includes('failed')) {
      failedMigrations++;
    }
  });
  
  // Calculate success rate
  const totalAttempted = successfulMigrations + failedMigrations;
  const successRate = totalAttempted > 0 ? ((successfulMigrations / totalAttempted) * 100).toFixed(1) : 0;
  
  console.log(chalk.green('\n✅ Migration Test Completed!'));
  console.log(chalk.blue('\n📊 Results Summary:'));
  console.log(chalk.gray(`   Duration: ${duration}s`));
  console.log(chalk.gray(`   Files Analyzed: ${filesProcessed}`));
  console.log(chalk.gray(`   Migrations Attempted: ${totalAttempted}`));
  console.log(chalk.green(`   Successful: ${successfulMigrations}`));
  console.log(chalk.red(`   Failed: ${failedMigrations}`));
  console.log(chalk.cyan(`   Success Rate: ${successRate}%`));
  
  // Improvement analysis
  console.log(chalk.blue('\n📈 Improvement Analysis:'));
  console.log(chalk.gray('   Previous success rate: ~1.4% (3/215)'));
  console.log(chalk.gray(`   Current success rate: ${successRate}%`));
  
  if (parseFloat(successRate) > 10) {
    const improvement = (parseFloat(successRate) / 1.4).toFixed(1);
    console.log(chalk.green(`   🎉 ${improvement}x improvement!`));
  } else {
    console.log(chalk.yellow('   ⚠️  Success rate needs further improvement'));
  }
  
  // Show sample output
  console.log(chalk.blue('\n📝 Sample Output:'));
  const relevantLines = lines
    .filter(line => 
      line.includes('Processing') || 
      line.includes('migrated') || 
      line.includes('Transformation') ||
      line.includes('File')
    )
    .slice(0, 10);
  
  relevantLines.forEach(line => {
    console.log(chalk.gray(`   ${line.trim()}`));
  });
  
  if (relevantLines.length === 0) {
    console.log(chalk.gray('   (No transformation output captured)'));
  }
  
} catch (error) {
  console.log(chalk.red('\n❌ Migration test failed'));
  console.log(chalk.red(`   Error: ${error.message}`));
  
  if (error.stdout) {
    console.log(chalk.blue('\n📝 Tool Output:'));
    console.log(chalk.gray(error.stdout));
  }
}

console.log(chalk.blue('\n💡 Recommendations:'));
console.log(chalk.gray('   1. Complete TODO placeholders in migration rules'));
console.log(chalk.gray('   2. Add more specific transformation rules'));
console.log(chalk.gray('   3. Test with different component patterns'));
console.log(chalk.gray('   4. Use the web UI for better visualization'));

console.log(chalk.cyan('\n✨ Test completed!\n'));
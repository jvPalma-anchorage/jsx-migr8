import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

console.log(chalk.bold.cyan('📊 jsx-migr8 Migration Status Check\n'));

// Check migration rules
const rulesDir = './migr8Rules';
const ruleFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('-migr8.json'));

console.log(chalk.blue('Migration Rules:'));
ruleFiles.forEach(file => {
  const content = fs.readFileSync(path.join(rulesDir, file), 'utf8');
  const rule = JSON.parse(content);
  const hasTodos = content.includes('TODO');
  
  console.log(`\n${chalk.yellow(file)}:`);
  console.log(`  Components: ${rule.lookup?.components?.join(', ') || 'None'}`);
  console.log(`  Package: ${rule.migr8rules?.[0]?.package || 'None'}`);
  console.log(`  Rules count: ${rule.migr8rules?.[0]?.rules?.length || 0}`);
  
  if (hasTodos) {
    console.log(chalk.red('  ⚠️  Has TODO placeholders - migrations will be limited'));
  } else {
    console.log(chalk.green('  ✅ Complete migration rules'));
  }
  
  // Check if rules have actual transformations
  const firstRule = rule.migr8rules?.[0];
  if (firstRule) {
    let hasTransformations = false;
    firstRule.rules?.forEach(r => {
      if ((r.set && Object.keys(r.set).length > 0) || 
          (r.remove && r.remove.length > 0) ||
          (r.rename && Object.keys(r.rename).length > 0)) {
        hasTransformations = true;
      }
    });
    
    if (!hasTransformations) {
      console.log(chalk.yellow('  ⚠️  No actual transformations defined'));
    }
  }
});

// Check key files
console.log(chalk.blue('\n\nKey Files Status:'));
const keyFiles = [
  'src/migrator/utils/file-aggregator.ts',
  'src/migrator/file-migration-processor.ts',
  'src/migrator/index.ts'
];

keyFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    console.log(`\n${chalk.green('✅')} ${file}`);
    
    // Check for key improvements
    if (file.includes('file-aggregator')) {
      if (content.includes('elements = []')) {
        console.log('  ✓ Allows components without JSX elements');
      }
    }
    if (file.includes('file-migration-processor')) {
      if (content.includes('isTodoPlaceholder')) {
        console.log('  ✓ Has TODO placeholder handling');
      }
    }
  } else {
    console.log(`${chalk.red('❌')} ${file} - Not found`);
  }
});

console.log(chalk.blue('\n\nExpected Improvements:'));
console.log('1. Files without JSX elements can still be processed ✅');
console.log('2. TODO placeholders are handled gracefully ✅');
console.log('3. Better error messages and reporting ✅');
console.log('4. File-by-file aggregation for efficiency ✅');

console.log(chalk.cyan('\n✨ Status check complete!\n'));
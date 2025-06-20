#!/usr/bin/env tsx
import { migr8Runner } from './src/migrator/index.js';
import { buildGraph } from './src/graph/buildGraph.js';
import fs from 'fs';
import path from 'path';

const testProjectPath = '/data/data/com.termux/files/home/jsx-migr8/test-react-project';
const blacklist = ['node_modules', 'dist', 'build', '.git'];

console.log('🧪 Testing direct migration functionality...');
console.log('📂 Target project:', testProjectPath);

try {
  // Load migration rules
  const rulesPath = './migr8Rules/old-ui-to-new-migration.json';
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
  const migrationRules = JSON.parse(rulesContent);
  
  console.log('📋 Loaded migration rules for:', migrationRules.lookup);
  console.log('🧩 Components to migrate:', migrationRules.components.map((c: any) => c.name).join(', '));
  
  // Build graph to analyze the codebase
  const graph = buildGraph(testProjectPath, blacklist);
  console.log('📊 Found', graph.jsx.length, 'JSX elements');
  
  // Find relevant JSX elements to migrate
  const relevantJsx = graph.jsx.filter(jsx => 
    jsx.importRef.pkg === migrationRules.lookup
  );
  
  console.log('🎯 Found', relevantJsx.length, 'elements to migrate from', migrationRules.lookup);
  
  relevantJsx.forEach(jsx => {
    console.log(`  - ${jsx.componentName} in ${path.relative(testProjectPath, jsx.file)}`);
    console.log(`    Props: ${Object.keys(jsx.props).join(', ')}`);
  });
  
  if (relevantJsx.length > 0) {
    console.log('\n📝 Testing migration would affect these files:');
    const affectedFiles = [...new Set(relevantJsx.map(jsx => jsx.file))];
    affectedFiles.forEach(file => {
      console.log(`  - ${path.relative(testProjectPath, file)}`);
    });
    
    // Let's examine the first file to see what changes would be made
    const firstFile = affectedFiles[0];
    const originalContent = fs.readFileSync(firstFile, 'utf-8');
    console.log('\n📄 Original content of', path.relative(testProjectPath, firstFile));
    console.log('=' .repeat(50));
    console.log(originalContent);
  }
  
} catch (error) {
  console.error('❌ Error during migration test:', error.message);
  console.error(error.stack);
}
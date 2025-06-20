#!/usr/bin/env tsx

import { buildGraph } from './src/graph/buildGraph';

async function testRealBuild() {
  try {
    console.log('Testing real build with main project...');
    
    const rootPath = '/data/data/com.termux/files/home/jsx-migr8/src/__tests__/integration/__fixtures__/material-ui-v4-to-v5';
    const blacklist = ['node_modules', '.git', 'dist', 'build'];
    
    console.log(`Root path: ${rootPath}`);
    console.log(`Building graph...`);
    
    const graph = buildGraph(rootPath, blacklist);
    
    console.log('\n=== BUILD SUCCESSFUL ===');
    console.log(`Found ${graph.imports.length} imports`);
    console.log(`Found ${graph.jsx.length} JSX elements`);
    
    // Check for empty component names
    const emptyComponents = graph.jsx.filter(jsx => !jsx.componentName || jsx.componentName.trim() === '');
    console.log(`Empty component names: ${emptyComponents.length}`);
    
    if (emptyComponents.length === 0) {
      console.log('✅ SUCCESS: No empty component names detected!');
    } else {
      console.log('❌ FAILURE: Found empty component names');
      emptyComponents.forEach((jsx, idx) => {
        console.log(`  ${idx + 1}. Empty in ${jsx.file}: local="${jsx.importRef.local}", imported="${jsx.importRef.imported}"`);
      });
    }
    
    // Show first few components for verification
    console.log('\n=== SAMPLE COMPONENTS ===');
    graph.jsx.slice(0, 10).forEach((jsx, idx) => {
      console.log(`${idx + 1}. "${jsx.componentName}" from ${jsx.importRef.pkg}`);
    });
    
  } catch (error) {
    console.error('❌ Error during build:', error);
  }
}

testRealBuild();
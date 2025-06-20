#!/usr/bin/env tsx

/**
 * Simple Graph Building Test
 */

import { buildGraph } from './src/graph/buildGraph.js';

async function testGraph() {
  console.log('🧪 Testing graph building directly...');
  
  try {
    const startTime = Date.now();
    
    const result = await buildGraph(
      '/data/data/com.termux/files/home/jsx-migr8/test-react-project',
      ['node_modules', '.git']
    );
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Graph built successfully in ${duration}ms`);
    console.log(`📊 Found ${Object.keys(result.packages).length} packages`);
    console.log(`📄 Scanned ${result.totalFiles} files`);
    console.log(`🏗️ Components discovered: ${Object.keys(result.components).length}`);
    
    // Show some sample data
    const packageNames = Object.keys(result.packages).slice(0, 5);
    console.log(`📦 Sample packages: ${packageNames.join(', ')}`);
    
    const componentNames = Object.keys(result.components).slice(0, 5);
    console.log(`🧩 Sample components: ${componentNames.join(', ')}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Graph building failed:`, error);
    return false;
  }
}

testGraph().then(success => {
  process.exit(success ? 0 : 1);
});
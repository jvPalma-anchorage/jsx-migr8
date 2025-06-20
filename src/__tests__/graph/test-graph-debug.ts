#!/usr/bin/env tsx

/**
 * Debug Graph Building Test
 */

import { buildGraph } from './src/graph/buildGraph.js';

async function testGraph() {
  console.log('🧪 Testing graph building with debug...');
  
  try {
    const result = await buildGraph(
      '/data/data/com.termux/files/home/jsx-migr8/test-react-project',
      ['node_modules', '.git']
    );
    
    console.log('📊 Graph result structure:');
    console.log('Type:', typeof result);
    console.log('Keys:', result ? Object.keys(result) : 'null/undefined');
    console.log('Full result:', JSON.stringify(result, null, 2));
    
    return true;
  } catch (error) {
    console.error(`❌ Graph building failed:`, error);
    return false;
  }
}

testGraph().then(success => {
  process.exit(success ? 0 : 1);
});
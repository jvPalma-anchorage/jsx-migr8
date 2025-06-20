#!/usr/bin/env tsx

/**
 * Final Graph Building Test
 */

import { buildGraph } from './src/graph/buildGraph.js';

async function testGraph() {
  console.log('🧪 Testing graph building functionality...');
  
  try {
    const startTime = Date.now();
    
    const result = await buildGraph(
      '/data/data/com.termux/files/home/jsx-migr8/test-react-project',
      ['node_modules', '.git']
    );
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Graph built successfully in ${duration}ms`);
    console.log(`📊 Graph structure: ${Object.keys(result).join(', ')}`);
    
    // Check imports
    if (result.imports) {
      const importFiles = Object.keys(result.imports);
      console.log(`📥 Import analysis: ${importFiles.length} files`);
      
      // Count total imports
      let totalImports = 0;
      importFiles.forEach(file => {
        if (result.imports[file] && Array.isArray(result.imports[file])) {
          totalImports += result.imports[file].length;
        }
      });
      console.log(`📦 Total imports found: ${totalImports}`);
    }
    
    // Check JSX usage
    if (result.jsx) {
      const jsxFiles = Object.keys(result.jsx);
      console.log(`🧩 JSX analysis: ${jsxFiles.length} files`);
      
      // Count total JSX components
      let totalComponents = 0;
      jsxFiles.forEach(file => {
        if (result.jsx[file] && Array.isArray(result.jsx[file])) {
          totalComponents += result.jsx[file].length;
        }
      });
      console.log(`🏗️ Total JSX components: ${totalComponents}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Graph building failed:`, error);
    return false;
  }
}

testGraph().then(success => {
  console.log(`\\n🎯 Graph building test: ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
});
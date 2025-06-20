#!/usr/bin/env tsx
import { buildGraph } from './src/graph/buildGraph.js';
import path from 'path';

const testProjectPath = '/data/data/com.termux/files/home/jsx-migr8/test-react-project';
const blacklist = ['node_modules', 'dist', 'build', '.git'];
console.log('🔍 Analyzing test project at:', testProjectPath);

try {
  const graph = buildGraph(testProjectPath, blacklist);
  
  console.log('\n📊 Graph Statistics:');
  console.log('  Total imports:', graph.imports.length);
  console.log('  Total JSX elements:', graph.jsx.length);
  
  // Group imports by package
  const packageMap = new Map<string, Set<string>>();
  graph.imports.forEach(imp => {
    if (!packageMap.has(imp.pkg)) {
      packageMap.set(imp.pkg, new Set());
    }
    packageMap.get(imp.pkg)?.add(imp.imported);
  });
  
  console.log('\n📦 Discovered packages:');
  packageMap.forEach((components, pkg) => {
    console.log(`  📦 ${pkg}:`);
    components.forEach(comp => {
      console.log(`    - ${comp}`);
    });
  });
  
  console.log('\n🔍 JSX Usage Examples:');
  graph.jsx.slice(0, 10).forEach(usage => {
    console.log(`  ${usage.componentName} (from ${usage.importRef.pkg})`);
    console.log(`    File: ${path.relative(testProjectPath, usage.file)}`);
    if (Object.keys(usage.props).length > 0) {
      console.log(`    Props: ${Object.keys(usage.props).join(', ')}`);
    }
    console.log('');
  });
  
} catch (error) {
  console.error('❌ Error during analysis:', error.message);
  console.error(error.stack);
}
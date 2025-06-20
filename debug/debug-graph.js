#!/usr/bin/env node

const { buildGraph } = require('./dist/graph/buildGraph.js');
const path = require('path');

async function debugGraph() {
  try {
    console.log('Starting graph debug...');
    
    const rootPath = process.cwd();
    const blacklist = ['node_modules', '.git', 'dist', 'build'];
    
    console.log(`Root path: ${rootPath}`);
    console.log(`Blacklist: ${blacklist.join(', ')}`);
    
    const graph = buildGraph(rootPath, blacklist);
    
    console.log('\n=== GRAPH ANALYSIS ===');
    console.log(`Found ${graph.imports.length} imports`);
    console.log(`Found ${graph.jsx.length} JSX elements`);
    
    // Show sample imports
    console.log('\n=== SAMPLE IMPORTS ===');
    graph.imports.slice(0, 5).forEach((imp, idx) => {
      console.log(`${idx + 1}. ${imp.pkg} -> ${imp.imported} (local: ${imp.local})`);
    });
    
    // Show sample JSX elements
    console.log('\n=== SAMPLE JSX ELEMENTS ===');
    graph.jsx.slice(0, 5).forEach((jsx, idx) => {
      console.log(`${idx + 1}. Component: "${jsx.componentName}" from ${jsx.importRef.pkg}`);
      console.log(`   File: ${jsx.file}`);
      console.log(`   Props: ${Object.keys(jsx.props).join(', ')}`);
    });
    
    // Check for empty component names
    const emptyComponents = graph.jsx.filter(jsx => !jsx.componentName || jsx.componentName.trim() === '');
    console.log(`\n=== EMPTY COMPONENT NAMES ===`);
    console.log(`Found ${emptyComponents.length} JSX elements with empty component names`);
    
    if (emptyComponents.length > 0) {
      emptyComponents.slice(0, 3).forEach((jsx, idx) => {
        console.log(`${idx + 1}. Empty component in ${jsx.file}`);
        console.log(`   Import ref: ${jsx.importRef.pkg} -> ${jsx.importRef.imported} (local: ${jsx.importRef.local})`);
        console.log(`   Component name: "${jsx.componentName}"`);
      });
    }
    
  } catch (error) {
    console.error('Error building graph:', error);
  }
}

debugGraph();
#!/usr/bin/env node

// Test script to reproduce blacklist bug

import path from 'path';

// Simulate various blacklist scenarios
console.log('Testing blacklist scenarios...\n');

// Scenario 1: String blacklist (should be converted to array)
const stringBlacklist = "node_modules,dist,build";
console.log('1. String blacklist:', stringBlacklist);
console.log('   Type:', typeof stringBlacklist);
try {
  const result = stringBlacklist.split(',').map(s => s.trim()).filter(s => s.length > 0);
  console.log('   ✓ Converted to array:', result);
} catch (error) {
  console.log('   ✗ Error:', error.message);
}

// Scenario 2: Array blacklist (should work as-is)
const arrayBlacklist = ["node_modules", "dist", "build"];
console.log('\n2. Array blacklist:', arrayBlacklist);
console.log('   Type:', typeof arrayBlacklist, 'Array:', Array.isArray(arrayBlacklist));
try {
  const result = arrayBlacklist.map((b) => `**/${b}/**`);
  console.log('   ✓ Mapped to ignore patterns:', result);
} catch (error) {
  console.log('   ✗ Error:', error.message);
}

// Scenario 3: Undefined blacklist (problematic)
const undefinedBlacklist = undefined;
console.log('\n3. Undefined blacklist:', undefinedBlacklist);
console.log('   Type:', typeof undefinedBlacklist);
try {
  const result = undefinedBlacklist.map((b) => `**/${b}/**`);
  console.log('   ✓ This should not work');
} catch (error) {
  console.log('   ✗ Error (expected):', error.message);
}

// Scenario 4: Non-string, non-array (problematic)
const objectBlacklist = { value: "node_modules" };
console.log('\n4. Object blacklist:', objectBlacklist);
console.log('   Type:', typeof objectBlacklist);
try {
  const result = objectBlacklist.map((b) => `**/${b}/**`);
  console.log('   ✓ This should not work');
} catch (error) {
  console.log('   ✗ Error (expected):', error.message);
}

// Test the actual code logic from buildGraph
console.log('\n=== Testing buildGraph logic ===');

function testBuildGraphBlacklist(blacklist) {
  console.log('\nTesting with blacklist:', blacklist, '(type:', typeof blacklist, ')');
  try {
    const ignore = blacklist.map((b) => `**/${b}/**`);
    console.log('✓ Success - ignore patterns:', ignore);
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

testBuildGraphBlacklist(["node_modules", "dist"]);          // Should work
testBuildGraphBlacklist("node_modules,dist");               // Should fail
testBuildGraphBlacklist(undefined);                         // Should fail
testBuildGraphBlacklist(null);                              // Should fail

console.log('\n=== Proposed fix ===');

function safeBuildGraphBlacklist(blacklist) {
  console.log('\nTesting SAFE version with blacklist:', blacklist, '(type:', typeof blacklist, ')');
  try {
    // Ensure blacklist is always an array
    let safeBlacklist = [];
    
    if (Array.isArray(blacklist)) {
      safeBlacklist = blacklist;
    } else if (typeof blacklist === 'string') {
      safeBlacklist = blacklist.split(',').map(s => s.trim()).filter(s => s.length > 0);
    } else if (blacklist) {
      console.log('   Warning: Unexpected blacklist type, using default');
      safeBlacklist = ['node_modules', '.git'];
    } else {
      safeBlacklist = ['node_modules', '.git'];
    }
    
    const ignore = safeBlacklist.map((b) => `**/${b}/**`);
    console.log('✓ Success - ignore patterns:', ignore);
    return ignore;
  } catch (error) {
    console.log('✗ Error:', error.message);
    return [];
  }
}

safeBuildGraphBlacklist(["node_modules", "dist"]);          // Should work
safeBuildGraphBlacklist("node_modules,dist");               // Should work
safeBuildGraphBlacklist(undefined);                         // Should work with defaults
safeBuildGraphBlacklist(null);                              // Should work with defaults
safeBuildGraphBlacklist({ foo: "bar" });                    // Should work with defaults
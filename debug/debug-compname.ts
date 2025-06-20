#!/usr/bin/env tsx

import { getCompName } from './src/utils/pathUtils';

function debugGetCompName() {
  console.log('=== Testing getCompName function ===\n');
  
  const testCases = [
    // Normal cases
    { local: 'Button', imported: 'Button', type: 'ImportSpecifier', description: 'Normal named import' },
    { local: 'MyButton', imported: 'Button', type: 'ImportSpecifier', description: 'Renamed import' },
    { local: 'Button', imported: 'default', type: 'ImportDefaultSpecifier', description: 'Default import' },
    { local: 'React', imported: 'React', type: 'ImportDefaultSpecifier', description: 'React default import' },
    
    // Edge cases that could cause empty names
    { local: '', imported: 'Button', type: 'ImportSpecifier', description: 'Empty local name' },
    { local: 'Button', imported: '', type: 'ImportSpecifier', description: 'Empty imported name' },
    { local: '', imported: '', type: 'ImportSpecifier', description: 'Both empty' },
    { local: 'Button', imported: undefined, type: 'ImportSpecifier', description: 'Undefined imported' },
    { local: undefined, imported: 'Button', type: 'ImportSpecifier', description: 'Undefined local' },
    { local: undefined, imported: undefined, type: 'ImportSpecifier', description: 'Both undefined' },
    { local: '', imported: undefined, type: undefined, description: 'All empty/undefined' },
    { local: 'Button', imported: undefined, type: undefined, description: 'Only local defined' },
    
    // Namespace imports
    { local: 'React', imported: '*', type: 'ImportNamespaceSpecifier', description: 'Namespace import' },
    
    // Invalid types
    { local: 'Button', imported: 'Button', type: 'InvalidType', description: 'Invalid import type' },
    { local: 'Button', imported: 'Button', type: '', description: 'Empty import type' },
  ];
  
  testCases.forEach((testCase, index) => {
    try {
      const result = getCompName(testCase.local as any, testCase.imported as any, testCase.type as any);
      const isEmpty = !result || result.trim() === '';
      
      console.log(`${index + 1}. ${testCase.description}`);
      console.log(`   Input: local="${testCase.local}", imported="${testCase.imported}", type="${testCase.type}"`);
      console.log(`   Result: "${result}" ${isEmpty ? '⚠️  EMPTY!' : '✅'}`);
      console.log('');
    } catch (error) {
      console.log(`${index + 1}. ${testCase.description}`);
      console.log(`   Input: local="${testCase.local}", imported="${testCase.imported}", type="${testCase.type}"`);
      console.log(`   ERROR: ${error.message} ❌`);
      console.log('');
    }
  });
}

debugGetCompName();
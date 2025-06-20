#!/usr/bin/env tsx

import { getNameFromSpecifier, getSpecifierLocalName } from './src/types/ast';

function debugAstFunctions() {
  console.log('=== Testing AST extraction functions ===\n');
  
  // Simulate different types of import specifiers
  const testCases = [
    // Valid cases
    {
      description: 'Normal ImportSpecifier',
      spec: {
        type: 'ImportSpecifier',
        local: { type: 'Identifier', name: 'Button' },
        imported: { type: 'Identifier', name: 'Button' }
      }
    },
    {
      description: 'Renamed ImportSpecifier',
      spec: {
        type: 'ImportSpecifier',
        local: { type: 'Identifier', name: 'MyButton' },
        imported: { type: 'Identifier', name: 'Button' }
      }
    },
    {
      description: 'ImportDefaultSpecifier',
      spec: {
        type: 'ImportDefaultSpecifier',
        local: { type: 'Identifier', name: 'React' }
      }
    },
    {
      description: 'ImportNamespaceSpecifier',
      spec: {
        type: 'ImportNamespaceSpecifier',
        local: { type: 'Identifier', name: 'React' }
      }
    },
    
    // Edge cases that could cause issues
    {
      description: 'Empty local name',
      spec: {
        type: 'ImportSpecifier',
        local: { type: 'Identifier', name: '' },
        imported: { type: 'Identifier', name: 'Button' }
      }
    },
    {
      description: 'Empty imported name',
      spec: {
        type: 'ImportSpecifier',
        local: { type: 'Identifier', name: 'Button' },
        imported: { type: 'Identifier', name: '' }
      }
    },
    {
      description: 'Missing local property',
      spec: {
        type: 'ImportSpecifier',
        imported: { type: 'Identifier', name: 'Button' }
      }
    },
    {
      description: 'Missing imported property',
      spec: {
        type: 'ImportSpecifier',
        local: { type: 'Identifier', name: 'Button' }
      }
    },
    {
      description: 'Invalid identifier type',
      spec: {
        type: 'ImportSpecifier',
        local: { type: 'InvalidType', name: 'Button' },
        imported: { type: 'Identifier', name: 'Button' }
      }
    },
    {
      description: 'Missing name in identifier',
      spec: {
        type: 'ImportSpecifier',
        local: { type: 'Identifier' },
        imported: { type: 'Identifier', name: 'Button' }
      }
    },
    {
      description: 'Null local',
      spec: {
        type: 'ImportSpecifier',
        local: null,
        imported: { type: 'Identifier', name: 'Button' }
      }
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. ${testCase.description}`);
    
    // Test getSpecifierLocalName
    try {
      const localName = getSpecifierLocalName(testCase.spec as any);
      const isEmpty = !localName || localName.trim() === '';
      console.log(`   getSpecifierLocalName: "${localName}" ${isEmpty ? '⚠️  EMPTY!' : '✅'}`);
    } catch (error) {
      console.log(`   getSpecifierLocalName: ERROR - ${error.message} ❌`);
    }
    
    // Test getNameFromSpecifier
    try {
      const importedName = getNameFromSpecifier(testCase.spec as any);
      const isEmpty = !importedName || importedName.trim() === '';
      console.log(`   getNameFromSpecifier: "${importedName}" ${isEmpty ? '⚠️  EMPTY!' : '✅'}`);
    } catch (error) {
      console.log(`   getNameFromSpecifier: ERROR - ${error.message} ❌`);
    }
    
    console.log('');
  });
}

debugAstFunctions();
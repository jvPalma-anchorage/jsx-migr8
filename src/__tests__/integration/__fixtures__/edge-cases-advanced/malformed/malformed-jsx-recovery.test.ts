/**
 * Malformed JSX and Recovery Scenarios Test Suite
 * Tests jsx-migr8's ability to handle and recover from various syntax errors
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';

// Import jsx-migr8 modules
import { parseFile } from '../../../utils/ast-parser';
import { analyzeJSXUsage } from '../../../analyzer/jsxUsage';
import { recoverFromSyntaxError } from '../../../utils/error-recovery';
import { validateJSXStructure } from '../../../utils/jsx-validator';

describe('Malformed JSX and Recovery Scenarios', () => {
  let tempDir: string;
  let testProjectPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'jsx-migr8-malformed-tests-'));
    testProjectPath = join(tempDir, 'test-project');
    mkdirSync(testProjectPath, { recursive: true });
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Syntax Error Recovery', () => {
    it('should recover from unclosed JSX tags', async () => {
      const malformedContent = `
import React from 'react';
import { Button } from '@mui/material';

export const Component = () => (
  <div>
    <Button variant="contained">Click me
    <p>This paragraph is missing closing tag
  </div>
);`;

      const filePath = createTestFile('unclosed-tags.tsx', malformedContent);
      
      const result = await parseFile(filePath, { 
        recoveryMode: true,
        errorTolerance: 'high'
      });

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].type).toBe('unclosed-tag');
      expect(result.errors[0].element).toBe('Button');
      expect(result.errors[1].type).toBe('unclosed-tag');
      expect(result.errors[1].element).toBe('p');
      
      expect(result.recovered).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.partiallyParsed).toBe(true);

      // Should still be able to extract some information
      expect(result.extractedComponents).toContain('Button');
      expect(result.extractedImports).toHaveLength(2);
    });

    it('should recover from malformed JSX attributes', async () => {
      const malformedContent = `
import React from 'react';
import { Button, TextField } from '@mui/material';

export const Component = () => (
  <div>
    <Button 
      variant="contained
      color=primary
      size={large}
      onClick={handleClick}
      disabled="true
    >
      Button Text
    </Button>
    <TextField 
      label="Field"
      value={value
      onChange={handleChange
    />
  </div>
);`;

      const filePath = createTestFile('malformed-attributes.tsx', malformedContent);
      
      const result = await parseFile(filePath, { 
        recoveryMode: true,
        fixableErrors: true 
      });

      expect(result.errors).toHaveLength(6);
      expect(result.errors.some(e => e.type === 'unclosed-string')).toBe(true);
      expect(result.errors.some(e => e.type === 'missing-quotes')).toBe(true);
      expect(result.errors.some(e => e.type === 'unclosed-expression')).toBe(true);

      expect(result.recovered).toBe(true);
      expect(result.fixedErrors).toHaveLength(4); // Some errors are auto-fixable
      
      // Should be able to identify components despite attribute errors
      const jsxAnalysis = await analyzeJSXUsage(result.ast);
      expect(jsxAnalysis.components).toContain('Button');
      expect(jsxAnalysis.components).toContain('TextField');
    });

    it('should recover from invalid JSX expressions', async () => {
      const malformedContent = `
import React from 'react';
import { Button } from '@mui/material';

export const Component = () => {
  const invalid = ;
  const another = {
  
  return (
    <div>
      <Button onClick={() => {}}>
        {invalid.map(item => 
          <span key={item.id}>{item.name</span>
        )}
      </Button>
      <Button>
        {another.}
      </Button>
      <Button>
        {/* Unclosed comment
      </Button>
    </div>
  );
};`;

      const filePath = createTestFile('invalid-expressions.tsx', malformedContent);
      
      const result = await parseFile(filePath, { 
        recoveryMode: true,
        continueOnError: true 
      });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.type === 'invalid-expression')).toBe(true);
      expect(result.errors.some(e => e.type === 'unclosed-comment')).toBe(true);
      expect(result.errors.some(e => e.type === 'incomplete-object')).toBe(true);

      expect(result.recovered).toBe(true);
      expect(result.partiallyParsed).toBe(true);

      // Should still identify valid JSX elements
      expect(result.extractedComponents).toContain('Button');
      expect(result.validJSXElements).toHaveLength(1); // Only the first Button is valid
    });

    it('should recover from mixed JavaScript and JSX syntax errors', async () => {
      const malformedContent = `
import React from 'react';
import { Button, TextField, Grid } from '@mui/material';

export const Component = () => {
  const [state, setState] = useState(;
  
  useEffect(() => {
    // Missing closing brace and parenthesis
  }, [state);
  
  const handleClick = () => {
    setState(prev => ({
      ...prev,
      clicked: true
    }; // Missing closing parenthesis
  };
  
  return (
    <Grid container>
      <Grid item xs={12}>
        <Button 
          onClick={handleClick
          variant="contained"
        >
          Click me
        </Button>
        <TextField 
          value={state.value || ''}
          onChange={(e) => setState(prev => ({...prev, value: e.target.value})}
          label="Input"
        />
      </Grid>
    </Grid>
  );
}; // Valid closing brace`;

      const filePath = createTestFile('mixed-syntax-errors.tsx', malformedContent);
      
      const result = await parseFile(filePath, { 
        recoveryMode: true,
        separateJSXFromJS: true 
      });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.jsErrors).toHaveLength(3); // JavaScript syntax errors
      expect(result.jsxErrors).toHaveLength(1); // JSX attribute error

      expect(result.recovered).toBe(true);
      expect(result.jsxRecovered).toBe(true);
      expect(result.jsRecovered).toBe(false); // JS errors are harder to recover from

      // Should still be able to analyze JSX despite JS errors
      const jsxAnalysis = await analyzeJSXUsage(result.recoveredJSX);
      expect(jsxAnalysis.components).toContain('Button');
      expect(jsxAnalysis.components).toContain('TextField');
      expect(jsxAnalysis.components).toContain('Grid');
    });

    it('should handle completely corrupted files gracefully', async () => {
      const corruptedContent = `
impo##rt React fr@m 'react';
imp0rt { Button } from '@mui/material';

export const Component = () => {
  ∀ ∃ ∄ ∅ ∆ ∇ ∈ ∉ // Unicode corruption
  
  ret☃rn (
    <d█v>
      <Button vari▓nt="contained">
        Corrupt€d T€xt
      </Button>
    </div>
  );
}; ♠♣♥♦`;

      const filePath = createTestFile('corrupted.tsx', corruptedContent);
      
      const result = await parseFile(filePath, { 
        recoveryMode: true,
        handleCorruption: true,
        fallbackToRegex: true 
      });

      expect(result.corrupted).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.fallbackUsed).toBe(true);

      // Should use regex fallback to extract some information
      expect(result.regexExtracted).toBeDefined();
      expect(result.regexExtracted.possibleComponents).toContain('Button');
      expect(result.regexExtracted.possibleImports).toHaveLength(2);

      // Should not crash the entire analysis
      expect(() => result.ast).not.toThrow();
    });
  });

  describe('JSX Structure Validation', () => {
    it('should detect and report nested JSX issues', async () => {
      const malformedContent = `
import React from 'react';
import { Button, TextField } from '@mui/material';

export const Component = () => (
  <div>
    <Button>
      <TextField label="Invalid nesting" />
      <Button>Nested button</Button>
    </Button>
    <p>
      <div>Invalid p > div nesting</div>
    </p>
    <table>
      <Button>Invalid table child</Button>
    </table>
  </div>
);`;

      const filePath = createTestFile('invalid-nesting.tsx', malformedContent);
      
      const validation = await validateJSXStructure(filePath, {
        checkHTMLSemantics: true,
        checkReactPatterns: true
      });

      expect(validation.errors).toHaveLength(3);
      expect(validation.errors[0]).toMatchObject({
        type: 'invalid-nesting',
        parent: 'Button',
        child: 'TextField',
        reason: 'Interactive elements cannot contain other interactive elements'
      });
      expect(validation.errors[1]).toMatchObject({
        type: 'invalid-html-nesting',
        parent: 'p',
        child: 'div',
        reason: 'Block elements cannot be nested in inline elements'
      });
      expect(validation.errors[2]).toMatchObject({
        type: 'invalid-table-child',
        parent: 'table',
        child: 'Button'
      });

      expect(validation.suggestions).toHaveLength(3);
      expect(validation.suggestions[0].fix).toBe('move-to-parent');
      expect(validation.autoFixable).toBe(false);
    });

    it('should detect missing required JSX attributes', async () => {
      const malformedContent = `
import React from 'react';
import { Button, TextField, img } from '@mui/material';

export const Component = () => (
  <div>
    <img /> // Missing alt attribute
    <TextField /> // Missing label attribute
    <Button></Button> // Empty button
    <label></label> // Missing htmlFor
    <input type="text" /> // Missing id/name
  </div>
);`;

      const filePath = createTestFile('missing-attributes.tsx', malformedContent);
      
      const validation = await validateJSXStructure(filePath, {
        checkAccessibility: true,
        checkRequiredAttributes: true
      });

      expect(validation.warnings).toHaveLength(5);
      expect(validation.warnings.some(w => w.type === 'missing-alt')).toBe(true);
      expect(validation.warnings.some(w => w.type === 'missing-label')).toBe(true);
      expect(validation.warnings.some(w => w.type === 'empty-button')).toBe(true);
      expect(validation.warnings.some(w => w.type === 'missing-htmlfor')).toBe(true);
      expect(validation.warnings.some(w => w.type === 'missing-input-id')).toBe(true);

      expect(validation.autoFixable).toBe(true);
      expect(validation.suggestedFixes).toHaveLength(5);
    });

    it('should detect conflicting JSX attributes', async () => {
      const malformedContent = `
import React from 'react';
import { Button, TextField } from '@mui/material';

export const Component = () => (
  <div>
    <Button 
      disabled={true}
      disabled={false}
      onClick={handleClick}
    >
      Conflicting disabled
    </Button>
    <TextField 
      value="controlled"
      defaultValue="uncontrolled"
      label="Conflicting control"
    />
    <input 
      type="text"
      type="email"
    />
  </div>
);`;

      const filePath = createTestFile('conflicting-attributes.tsx', malformedContent);
      
      const validation = await validateJSXStructure(filePath, {
        checkAttributeConflicts: true
      });

      expect(validation.errors).toHaveLength(3);
      expect(validation.errors[0]).toMatchObject({
        type: 'duplicate-attribute',
        attribute: 'disabled',
        element: 'Button'
      });
      expect(validation.errors[1]).toMatchObject({
        type: 'conflicting-control',
        attributes: ['value', 'defaultValue'],
        element: 'TextField'
      });
      expect(validation.errors[2]).toMatchObject({
        type: 'duplicate-attribute',
        attribute: 'type',
        element: 'input'
      });

      expect(validation.resolutionStrategies).toHaveLength(3);
    });
  });

  describe('Error Recovery Strategies', () => {
    it('should apply automatic fixes where possible', async () => {
      const malformedContent = `
import React from 'react';
import { Button, TextField } from '@mui/material';

export const Component = () => (
  <div>
    <Button variant="contained>Click me</Button>
    <TextField label="Field value={inputValue} />
    <img src="image.jpg" />
    <Button></Button>
  </div>
);`;

      const filePath = createTestFile('auto-fixable.tsx', malformedContent);
      
      const recovery = await recoverFromSyntaxError(filePath, {
        autoFix: true,
        generateReport: true
      });

      expect(recovery.applied).toBe(true);
      expect(recovery.fixes).toHaveLength(4);
      
      expect(recovery.fixes[0]).toMatchObject({
        type: 'add-missing-quote',
        line: 6,
        fixed: true
      });
      expect(recovery.fixes[1]).toMatchObject({
        type: 'add-missing-quote',
        line: 7,
        fixed: true
      });
      expect(recovery.fixes[2]).toMatchObject({
        type: 'add-alt-attribute',
        line: 8,
        fixed: true
      });
      expect(recovery.fixes[3]).toMatchObject({
        type: 'add-button-content',
        line: 9,
        fixed: true
      });

      expect(recovery.fixedContent).toContain('variant="contained"');
      expect(recovery.fixedContent).toContain('value={inputValue}');
      expect(recovery.fixedContent).toContain('alt=""');
      expect(recovery.fixedContent).toContain('Button content');
    });

    it('should suggest manual fixes for complex errors', async () => {
      const malformedContent = `
import React from 'react';
import { Button } from '@mui/material';

export const Component = () => {
  const handleClick = () => {
    // Missing implementation
  };
  
  return (
    <div>
      <Button onClick={nonExistentFunction}>
        Click me
      </Button>
      <UnknownComponent customProp="value">
        Unknown content
      </UnknownComponent>
    </div>
  );
};`;

      const filePath = createTestFile('manual-fixes.tsx', malformedContent);
      
      const recovery = await recoverFromSyntaxError(filePath, {
        suggestManualFixes: true,
        analyzeReferences: true
      });

      expect(recovery.manualFixes).toHaveLength(2);
      expect(recovery.manualFixes[0]).toMatchObject({
        type: 'undefined-reference',
        identifier: 'nonExistentFunction',
        suggestion: 'Define function or import from module'
      });
      expect(recovery.manualFixes[1]).toMatchObject({
        type: 'unknown-component',
        component: 'UnknownComponent',
        suggestion: 'Import component or replace with known component'
      });

      expect(recovery.requiresManualIntervention).toBe(true);
      expect(recovery.confidence).toBe('medium');
    });

    it('should handle progressive recovery for deeply nested errors', async () => {
      const malformedContent = `
import React from 'react';
import { Button, Grid, Paper, Card } from '@mui/material';

export const Component = () => (
  <Grid container>
    <Grid item xs={12}>
      <Paper elevation={3}>
        <Card>
          <CardContent>
            <Button variant="contained>
              <Grid container>
                <Grid item xs={6}>
                  <Button color="primary>
                    Nested Button 1
                  </Button>
                <Grid item xs={6}>
                  <Button color="secondary>
                    Nested Button 2
                  </Button>
                </Grid>
              </Grid>
            </Button>
          </CardContent>
        </Card>
      </Paper>
    </Grid>
  </Grid>
);`;

      const filePath = createTestFile('nested-errors.tsx', malformedContent);
      
      const recovery = await recoverFromSyntaxError(filePath, {
        progressiveRecovery: true,
        maxRecoveryDepth: 5
      });

      expect(recovery.progressiveSteps).toHaveLength(4);
      expect(recovery.progressiveSteps[0].level).toBe(1); // Outermost error
      expect(recovery.progressiveSteps[3].level).toBe(4); // Innermost error

      expect(recovery.fullyRecovered).toBe(true);
      expect(recovery.validAfterRecovery).toBe(true);

      // Should be able to parse the recovered content
      const reparse = await parseFile(filePath, { 
        content: recovery.fixedContent 
      });
      expect(reparse.errors).toHaveLength(0);
    });
  });

  describe('Unicode and Encoding Issues', () => {
    it('should handle various Unicode characters in JSX', async () => {
      const unicodeContent = `
import React from 'react';
import { Button, Typography } from '@mui/material';

export const Component = () => (
  <div>
    <Typography>
      Text with émojis: 🚀 🎉 ✨ 
      Math symbols: ∑ ∏ ∫ √ ∞
      Special chars: ñ ü ç æ ø
    </Typography>
    <Button>
      ボタン (Japanese)
    </Button>
    <Button>
      кнопка (Russian)
    </Button>
    <Button>
      按钮 (Chinese)
    </Button>
  </div>
);`;

      const filePath = createTestFile('unicode-content.tsx', unicodeContent);
      
      const result = await parseFile(filePath, {
        handleUnicode: true,
        preserveEncoding: true
      });

      expect(result.errors).toHaveLength(0);
      expect(result.unicodeSupported).toBe(true);
      expect(result.encoding).toBe('utf8');

      const jsxAnalysis = await analyzeJSXUsage(result.ast);
      expect(jsxAnalysis.components).toContain('Button');
      expect(jsxAnalysis.components).toContain('Typography');
      expect(jsxAnalysis.textContent).toContain('🚀');
      expect(jsxAnalysis.textContent).toContain('ボタン');
    });

    it('should handle malformed Unicode sequences', async () => {
      const malformedUnicodeContent = `
import React from 'react';
import { Button } from '@mui/material';

export const Component = () => (
  <div>
    <Button>
      Invalid Unicode: \\uXXXX \\u123 \\uZZZZ
    </Button>
    <Button>
      Incomplete: \\u12
    </Button>
    <Button>
      Mixed: Valid \\u0041 and invalid \\uGGGG
    </Button>
  </div>
);`;

      const filePath = createTestFile('malformed-unicode.tsx', malformedUnicodeContent);
      
      const result = await parseFile(filePath, {
        handleMalformedUnicode: true,
        unicodeRecovery: true
      });

      expect(result.unicodeErrors).toHaveLength(4);
      expect(result.unicodeRecovered).toBe(true);
      
      expect(result.fixedContent).toContain('\\\\uXXXX'); // Escaped invalid sequences
      expect(result.fixedContent).toContain('A'); // Valid \\u0041 converted
    });
  });

  describe('Performance with Malformed Files', () => {
    it('should handle malformed files without performance degradation', async () => {
      const malformedFiles = await createMultipleMalformedFiles(100);
      
      const startTime = performance.now();
      const results = await Promise.all(
        malformedFiles.map(file => 
          parseFile(file, { recoveryMode: true }).catch(error => ({
            error: error.message,
            recovered: false
          }))
        )
      );
      const duration = performance.now() - startTime;

      const successfulRecoveries = results.filter(r => r.recovered).length;
      const partialRecoveries = results.filter(r => r.partiallyParsed).length;
      const totalProcessed = successfulRecoveries + partialRecoveries;

      expect(totalProcessed).toBeGreaterThan(50); // At least 50% recovery rate
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log(`🔧 Processed ${malformedFiles.length} malformed files in ${duration.toFixed(2)}ms`);
      console.log(`📊 Recovery rate: ${((totalProcessed / malformedFiles.length) * 100).toFixed(1)}%`);
    }, 60000);

    it('should prevent infinite loops in error recovery', async () => {
      const recursiveErrorContent = `
import React from 'react';
import { Component } from './recursive-error';

export const Component = () => (
  <Component>
    <Component>
      <Component>
        // Potentially infinite recursion in error recovery
      </Component>
    </Component>
  </Component>
);`;

      const filePath = createTestFile('recursive-error.tsx', recursiveErrorContent);
      
      const startTime = performance.now();
      const result = await parseFile(filePath, {
        recoveryMode: true,
        maxRecoveryAttempts: 10,
        recoveryTimeout: 5000
      });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(6000); // Should timeout before infinite loop
      expect(result.recoveryLimited).toBe(true);
      expect(result.maxAttemptsReached || result.timeoutReached).toBe(true);
    });
  });

  // Helper functions
  function createTestFile(filename: string, content: string): string {
    const filePath = join(testProjectPath, filename);
    writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  async function createMultipleMalformedFiles(count: number): Promise<string[]> {
    const files: string[] = [];
    const errorTypes = [
      'unclosed-tags',
      'malformed-attributes',
      'invalid-expressions',
      'unicode-issues',
      'nested-errors'
    ];

    for (let i = 0; i < count; i++) {
      const errorType = errorTypes[i % errorTypes.length];
      const content = generateMalformedContent(errorType, i);
      const filename = `malformed-${errorType}-${i}.tsx`;
      const filePath = createTestFile(filename, content);
      files.push(filePath);
    }

    return files;
  }

  function generateMalformedContent(errorType: string, index: number): string {
    const baseImports = `
import React from 'react';
import { Button, TextField } from '@mui/material';
`;

    switch (errorType) {
      case 'unclosed-tags':
        return baseImports + `
export const Component${index} = () => (
  <div>
    <Button>Unclosed button
    <TextField label="Unclosed field
  </div>
);`;

      case 'malformed-attributes':
        return baseImports + `
export const Component${index} = () => (
  <div>
    <Button variant="contained color="primary>Button</Button>
    <TextField value={missing} label="field />
  </div>
);`;

      case 'invalid-expressions':
        return baseImports + `
export const Component${index} = () => {
  const invalid = ;
  return (
    <div>
      <Button>{invalid.}</Button>
    </div>
  );
};`;

      case 'unicode-issues':
        return baseImports + `
export const Component${index} = () => (
  <div>
    <Button>\\uXXXX \\u12 invalid unicode</Button>
  </div>
);`;

      case 'nested-errors':
        return baseImports + `
export const Component${index} = () => (
  <div>
    <Button variant="contained>
      <TextField label="nested
    </Button>
  </div>
);`;

      default:
        return baseImports + `export const Component${index} = () => <div>Valid</div>;`;
    }
  }
});
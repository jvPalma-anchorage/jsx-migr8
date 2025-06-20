#!/usr/bin/env node

/**
 * Migration Scenarios Validation Script
 * 
 * This script validates the migration scenarios and can be used to test
 * jsx-migr8's migration capabilities against realistic React ecosystem patterns.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ValidationResult {
  scenario: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    inputSize: number;
    expectedSize: number;
    rulesComplexity: number;
    patterns: number;
  };
}

interface MigrationScenario {
  name: string;
  inputPath: string;
  expectedPath: string;
  rulesPath: string;
  description: string;
  complexity: 'simple' | 'medium' | 'complex';
  patterns: string[];
}

class ScenarioValidator {
  private scenariosPath: string;
  private results: ValidationResult[] = [];

  constructor(scenariosPath: string = __dirname) {
    this.scenariosPath = scenariosPath;
  }

  /**
   * Validate all migration scenarios
   */
  async validateAll(): Promise<ValidationResult[]> {
    console.log('🔍 Starting migration scenarios validation...\n');

    const scenarios = this.loadScenarios();
    
    for (const scenario of scenarios) {
      console.log(`📝 Validating: ${scenario.name}`);
      const result = await this.validateScenario(scenario);
      this.results.push(result);
      
      this.printScenarioResult(result);
      console.log();
    }

    this.printSummary();
    return this.results;
  }

  /**
   * Validate a single migration scenario
   */
  private async validateScenario(scenario: MigrationScenario): Promise<ValidationResult> {
    const result: ValidationResult = {
      scenario: scenario.name,
      passed: true,
      errors: [],
      warnings: [],
      metrics: {
        inputSize: 0,
        expectedSize: 0,
        rulesComplexity: 0,
        patterns: scenario.patterns.length
      }
    };

    try {
      // Validate file existence
      await this.validateFileStructure(scenario, result);
      
      // Validate file contents
      await this.validateFileContents(scenario, result);
      
      // Validate migration rules
      await this.validateMigrationRules(scenario, result);
      
      // Validate TypeScript syntax
      await this.validateTypeScript(scenario, result);
      
      // Calculate metrics
      this.calculateMetrics(scenario, result);
      
      // Check for potential issues
      this.checkForIssues(scenario, result);

    } catch (error) {
      result.passed = false;
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Load migration scenarios configuration
   */
  private loadScenarios(): MigrationScenario[] {
    return [
      {
        name: 'React Router v5 to v6',
        inputPath: 'react-router-v5-to-v6/input/App.tsx',
        expectedPath: 'react-router-v5-to-v6/expected/App.tsx',
        rulesPath: 'react-router-v5-to-v6/rules/react-router-v5-to-v6.json',
        description: 'Migrates React Router v5 components and patterns to v6',
        complexity: 'complex',
        patterns: ['Switch → Routes', 'useHistory → useNavigate', 'withRouter HOC removal']
      },
      {
        name: 'Class Components to Hooks',
        inputPath: 'class-to-hooks/input/UserDashboard.tsx',
        expectedPath: 'class-to-hooks/expected/UserDashboard.tsx',
        rulesPath: 'class-to-hooks/rules/class-to-hooks.json',
        description: 'Converts React class components to functional components with hooks',
        complexity: 'complex',
        patterns: ['Component → FC', 'componentDidMount → useEffect', 'this.state → useState']
      },
      {
        name: 'HOCs to Custom Hooks',
        inputPath: 'hocs-to-hooks/input/withAuth.tsx',
        expectedPath: 'hocs-to-hooks/expected/useAuth.tsx',
        rulesPath: 'hocs-to-hooks/rules/hocs-to-hooks.json',
        description: 'Converts Higher-Order Components to custom hooks',
        complexity: 'complex',
        patterns: ['withAuth → useAuth', 'HOC composition → multiple hooks']
      },
      {
        name: 'Styled Components to Emotion',
        inputPath: 'styled-to-emotion/input/StyledComponents.tsx',
        expectedPath: 'styled-to-emotion/expected/EmotionComponents.tsx',
        rulesPath: 'styled-to-emotion/rules/styled-to-emotion.json',
        description: 'Migrates styled-components to @emotion/react and @emotion/styled',
        complexity: 'medium',
        patterns: ['createGlobalStyle → css + Global', 'DefaultTheme → EmotionTheme']
      },
      {
        name: 'Context API Evolution',
        inputPath: 'context-evolution/input/LegacyContext.tsx',
        expectedPath: 'context-evolution/expected/ModernContext.tsx',
        rulesPath: 'context-evolution/rules/context-evolution.json',
        description: 'Migrates legacy Context API to modern React Context with hooks',
        complexity: 'complex',
        patterns: ['getChildContext → Context Provider', 'contextTypes → useContext']
      }
    ];
  }

  /**
   * Validate file structure exists
   */
  private async validateFileStructure(scenario: MigrationScenario, result: ValidationResult): Promise<void> {
    const files = [scenario.inputPath, scenario.expectedPath, scenario.rulesPath];
    
    for (const filePath of files) {
      const fullPath = path.join(this.scenariosPath, filePath);
      if (!fs.existsSync(fullPath)) {
        result.errors.push(`Missing file: ${filePath}`);
        result.passed = false;
      }
    }
  }

  /**
   * Validate file contents
   */
  private async validateFileContents(scenario: MigrationScenario, result: ValidationResult): Promise<void> {
    const inputPath = path.join(this.scenariosPath, scenario.inputPath);
    const expectedPath = path.join(this.scenariosPath, scenario.expectedPath);

    if (fs.existsSync(inputPath)) {
      const inputContent = fs.readFileSync(inputPath, 'utf-8');
      
      // Check for basic React patterns
      if (!inputContent.includes('import') || !inputContent.includes('React')) {
        result.warnings.push('Input file may not be a valid React component');
      }
      
      // Check for substantial content
      if (inputContent.length < 1000) {
        result.warnings.push('Input file seems too small for a comprehensive test');
      }
      
      result.metrics.inputSize = inputContent.length;
    }

    if (fs.existsSync(expectedPath)) {
      const expectedContent = fs.readFileSync(expectedPath, 'utf-8');
      
      // Check for basic React patterns
      if (!expectedContent.includes('import') || !expectedContent.includes('React')) {
        result.warnings.push('Expected file may not be a valid React component');
      }
      
      result.metrics.expectedSize = expectedContent.length;
    }
  }

  /**
   * Validate migration rules
   */
  private async validateMigrationRules(scenario: MigrationScenario, result: ValidationResult): Promise<void> {
    const rulesPath = path.join(this.scenariosPath, scenario.rulesPath);
    
    if (!fs.existsSync(rulesPath)) {
      return; // Already handled in file structure validation
    }

    try {
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
      const rules = JSON.parse(rulesContent);
      
      // Validate required fields
      if (!rules.name) {
        result.errors.push('Migration rules missing required field: name');
        result.passed = false;
      }
      
      if (!rules.description) {
        result.errors.push('Migration rules missing required field: description');
        result.passed = false;
      }
      
      if (!rules.lookup) {
        result.errors.push('Migration rules missing required field: lookup');
        result.passed = false;
      }
      
      // Check for transformation rules
      const hasTransformations = 
        rules.transformations ||
        rules.components ||
        rules.hooks ||
        rules.hocs ||
        rules.types ||
        rules.customTransformations;
        
      if (!hasTransformations) {
        result.warnings.push('Migration rules may lack transformation definitions');
      }
      
      // Calculate complexity based on rule content
      result.metrics.rulesComplexity = this.calculateRulesComplexity(rules);
      
    } catch (error) {
      result.errors.push(`Invalid JSON in rules file: ${error instanceof Error ? error.message : String(error)}`);
      result.passed = false;
    }
  }

  /**
   * Validate TypeScript syntax
   */
  private async validateTypeScript(scenario: MigrationScenario, result: ValidationResult): Promise<void> {
    const files = [scenario.inputPath, scenario.expectedPath];
    
    for (const filePath of files) {
      const fullPath = path.join(this.scenariosPath, filePath);
      
      if (!fs.existsSync(fullPath)) {
        continue; // Already handled in file structure validation
      }

      try {
        // Basic TypeScript syntax validation
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Check for TypeScript patterns
        if (!content.includes('interface') && !content.includes('type ')) {
          result.warnings.push(`${filePath} may lack TypeScript type definitions`);
        }
        
        // Check for React TypeScript patterns
        if (!content.includes('React.FC') && !content.includes(': React.')) {
          result.warnings.push(`${filePath} may lack proper React TypeScript patterns`);
        }
        
        // Simple syntax checks
        const braceCount = (content.match(/\{/g) || []).length - (content.match(/\}/g) || []).length;
        if (braceCount !== 0) {
          result.errors.push(`${filePath} has mismatched braces`);
          result.passed = false;
        }
        
        const parenCount = (content.match(/\(/g) || []).length - (content.match(/\)/g) || []).length;
        if (parenCount !== 0) {
          result.errors.push(`${filePath} has mismatched parentheses`);
          result.passed = false;
        }
        
      } catch (error) {
        result.errors.push(`TypeScript validation failed for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        result.passed = false;
      }
    }
  }

  /**
   * Calculate metrics for the scenario
   */
  private calculateMetrics(scenario: MigrationScenario, result: ValidationResult): void {
    // Metrics are already partially calculated in other validation methods
    
    // Add complexity score based on file sizes and patterns
    const sizeScore = (result.metrics.inputSize + result.metrics.expectedSize) / 1000;
    const patternScore = result.metrics.patterns * 10;
    const rulesScore = result.metrics.rulesComplexity;
    
    const totalComplexity = sizeScore + patternScore + rulesScore;
    
    // Validate complexity matches declared complexity
    const expectedComplexity = {
      'simple': 50,
      'medium': 100,
      'complex': 150
    };
    
    if (totalComplexity < expectedComplexity[scenario.complexity] * 0.7) {
      result.warnings.push(`Actual complexity (${totalComplexity.toFixed(1)}) seems lower than declared (${scenario.complexity})`);
    }
  }

  /**
   * Calculate rules complexity score
   */
  private calculateRulesComplexity(rules: any): number {
    let complexity = 0;
    
    // Count different types of rules
    if (rules.transformations) complexity += rules.transformations.length * 5;
    if (rules.components) complexity += rules.components.length * 3;
    if (rules.hooks) complexity += rules.hooks.length * 4;
    if (rules.hocs) complexity += rules.hocs.length * 4;
    if (rules.customTransformations) complexity += rules.customTransformations.length * 2;
    
    // Count lookup entries
    if (rules.lookup) {
      complexity += Object.keys(rules.lookup).length * 2;
    }
    
    return complexity;
  }

  /**
   * Check for potential issues
   */
  private checkForIssues(scenario: MigrationScenario, result: ValidationResult): void {
    // Check if files are too similar (might indicate incomplete migration)
    if (Math.abs(result.metrics.inputSize - result.metrics.expectedSize) < 100) {
      result.warnings.push('Input and expected files are very similar in size - migration might be incomplete');
    }
    
    // Check for very small files
    if (result.metrics.inputSize < 1000 || result.metrics.expectedSize < 1000) {
      result.warnings.push('Files are quite small - consider adding more comprehensive examples');
    }
    
    // Check for very large files
    if (result.metrics.inputSize > 30000 || result.metrics.expectedSize > 30000) {
      result.warnings.push('Files are quite large - consider breaking into smaller scenarios');
    }
  }

  /**
   * Print validation result for a single scenario
   */
  private printScenarioResult(result: ValidationResult): void {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`   ${status}`);
    
    if (result.errors.length > 0) {
      console.log('   🚨 Errors:');
      result.errors.forEach(error => console.log(`      • ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('   ⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`      • ${warning}`));
    }
    
    console.log('   📊 Metrics:');
    console.log(`      • Input size: ${result.metrics.inputSize} chars`);
    console.log(`      • Expected size: ${result.metrics.expectedSize} chars`);
    console.log(`      • Rules complexity: ${result.metrics.rulesComplexity}`);
    console.log(`      • Patterns covered: ${result.metrics.patterns}`);
  }

  /**
   * Print overall validation summary
   */
  private printSummary(): void {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log('📋 VALIDATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total scenarios: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log();
    
    // Print metrics summary
    const totalInputSize = this.results.reduce((sum, r) => sum + r.metrics.inputSize, 0);
    const totalExpectedSize = this.results.reduce((sum, r) => sum + r.metrics.expectedSize, 0);
    const totalComplexity = this.results.reduce((sum, r) => sum + r.metrics.rulesComplexity, 0);
    const totalPatterns = this.results.reduce((sum, r) => sum + r.metrics.patterns, 0);
    
    console.log('📊 AGGREGATE METRICS');
    console.log('-'.repeat(30));
    console.log(`Total input code: ${(totalInputSize / 1000).toFixed(1)}KB`);
    console.log(`Total expected code: ${(totalExpectedSize / 1000).toFixed(1)}KB`);
    console.log(`Total rules complexity: ${totalComplexity}`);
    console.log(`Total patterns: ${totalPatterns}`);
    console.log();
    
    // Print recommendations
    this.printRecommendations();
  }

  /**
   * Print recommendations based on validation results
   */
  private printRecommendations(): void {
    const failedScenarios = this.results.filter(r => !r.passed);
    const warningScenarios = this.results.filter(r => r.warnings.length > 0);
    
    if (failedScenarios.length > 0 || warningScenarios.length > 0) {
      console.log('💡 RECOMMENDATIONS');
      console.log('-'.repeat(30));
      
      if (failedScenarios.length > 0) {
        console.log(`• Fix ${failedScenarios.length} failed scenario(s) before using for testing`);
      }
      
      if (warningScenarios.length > 0) {
        console.log(`• Review ${warningScenarios.length} scenario(s) with warnings for improvements`);
      }
      
      // Check for missing complexity levels
      const complexities = this.results.map(r => r.scenario);
      if (!complexities.some(s => s.includes('simple'))) {
        console.log('• Consider adding simple migration scenarios for basic testing');
      }
      
      console.log('• Run actual jsx-migr8 transformations to verify rule effectiveness');
      console.log('• Consider adding performance benchmarks for large scenarios');
      console.log();
    }
    
    if (passed === total) {
      console.log('🎉 All scenarios validated successfully!');
      console.log('Ready for jsx-migr8 testing and development.');
    }
  }
}

/**
 * CLI interface
 */
if (require.main === module) {
  const validator = new ScenarioValidator();
  
  validator.validateAll()
    .then((results) => {
      const exitCode = results.every(r => r.passed) ? 0 : 1;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

export { ScenarioValidator, type ValidationResult, type MigrationScenario };
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// Test utilities for migration scenarios
interface MigrationScenario {
  name: string;
  inputPath: string;
  expectedPath: string;
  rulesPath: string;
  description: string;
  complexity: 'simple' | 'medium' | 'complex';
  patterns: string[];
}

const migrationScenarios: MigrationScenario[] = [
  {
    name: 'React Router v5 to v6',
    inputPath: 'react-router-v5-to-v6/input/App.tsx',
    expectedPath: 'react-router-v5-to-v6/expected/App.tsx',
    rulesPath: 'react-router-v5-to-v6/rules/react-router-v5-to-v6.json',
    description: 'Migrates React Router v5 components and patterns to v6',
    complexity: 'complex',
    patterns: [
      'Switch → Routes',
      'useHistory → useNavigate',
      'withRouter HOC removal',
      'Route component prop → element prop',
      'Redirect → Navigate',
      'match.path removal',
      'Nested routing changes'
    ]
  },
  {
    name: 'Class Components to Hooks',
    inputPath: 'class-to-hooks/input/UserDashboard.tsx',
    expectedPath: 'class-to-hooks/expected/UserDashboard.tsx',
    rulesPath: 'class-to-hooks/rules/class-to-hooks.json',
    description: 'Converts React class components to functional components with hooks',
    complexity: 'complex',
    patterns: [
      'Component → FC',
      'PureComponent → React.memo',
      'componentDidMount → useEffect',
      'componentDidUpdate → useEffect',
      'componentWillUnmount → useEffect cleanup',
      'this.state → useState',
      'this.setState → state setters',
      'Class methods → useCallback',
      'connect → useSelector/useDispatch'
    ]
  },
  {
    name: 'HOCs to Custom Hooks',
    inputPath: 'hocs-to-hooks/input/withAuth.tsx',
    expectedPath: 'hocs-to-hooks/expected/useAuth.tsx',
    rulesPath: 'hocs-to-hooks/rules/hocs-to-hooks.json',
    description: 'Converts Higher-Order Components to custom hooks',
    complexity: 'complex',
    patterns: [
      'withAuth → useAuth',
      'withData → useData',
      'withTheme → useTheme',
      'HOC composition → multiple hooks',
      'Conditional rendering → guard components',
      'Props injection → hook return values',
      'Component wrapping → hook usage'
    ]
  },
  {
    name: 'Styled Components to Emotion',
    inputPath: 'styled-to-emotion/input/StyledComponents.tsx',
    expectedPath: 'styled-to-emotion/expected/EmotionComponents.tsx',
    rulesPath: 'styled-to-emotion/rules/styled-to-emotion.json',
    description: 'Migrates styled-components to @emotion/react and @emotion/styled',
    complexity: 'medium',
    patterns: [
      'styled-components → @emotion/styled',
      'createGlobalStyle → css + Global',
      'DefaultTheme → EmotionTheme',
      'Import path changes',
      'Global styles pattern changes',
      'Theme provider compatibility'
    ]
  },
  {
    name: 'Context API Evolution',
    inputPath: 'context-evolution/input/LegacyContext.tsx',
    expectedPath: 'context-evolution/expected/ModernContext.tsx',
    rulesPath: 'context-evolution/rules/context-evolution.json',
    description: 'Migrates legacy Context API to modern React Context with hooks',
    complexity: 'complex',
    patterns: [
      'getChildContext → Context Provider',
      'contextTypes → useContext',
      'PropTypes → TypeScript',
      'Class providers → Functional providers',
      'Context consumption → custom hooks',
      'Performance optimizations',
      'Error boundaries for context'
    ]
  }
];

describe('Migration Scenarios', () => {
  const scenariosPath = __dirname;

  beforeEach(() => {
    // Ensure test files exist
    expect(fs.existsSync(scenariosPath)).toBe(true);
  });

  describe('File Structure Validation', () => {
    migrationScenarios.forEach(scenario => {
      describe(scenario.name, () => {
        it('should have all required files', () => {
          const inputFile = path.join(scenariosPath, scenario.inputPath);
          const expectedFile = path.join(scenariosPath, scenario.expectedPath);
          const rulesFile = path.join(scenariosPath, scenario.rulesPath);

          expect(fs.existsSync(inputFile)).toBe(true);
          expect(fs.existsSync(expectedFile)).toBe(true);
          expect(fs.existsSync(rulesFile)).toBe(true);
        });

        it('should have valid input TypeScript file', () => {
          const inputFile = path.join(scenariosPath, scenario.inputPath);
          const content = fs.readFileSync(inputFile, 'utf-8');

          expect(content).toContain('import');
          expect(content).toContain('export');
          expect(content.length).toBeGreaterThan(100);
        });

        it('should have valid expected TypeScript file', () => {
          const expectedFile = path.join(scenariosPath, scenario.expectedPath);
          const content = fs.readFileSync(expectedFile, 'utf-8');

          expect(content).toContain('import');
          expect(content).toContain('export');
          expect(content.length).toBeGreaterThan(100);
        });

        it('should have valid migration rules JSON', () => {
          const rulesFile = path.join(scenariosPath, scenario.rulesPath);
          const content = fs.readFileSync(rulesFile, 'utf-8');

          expect(() => JSON.parse(content)).not.toThrow();
          
          const rules = JSON.parse(content);
          expect(rules).toHaveProperty('name');
          expect(rules).toHaveProperty('description');
          expect(rules.name).toBe(scenario.name);
        });
      });
    });
  });

  describe('Content Validation', () => {
    describe('React Router v5 to v6', () => {
      let inputContent: string;
      let expectedContent: string;
      let rules: any;

      beforeEach(() => {
        const scenario = migrationScenarios.find(s => s.name === 'React Router v5 to v6')!;
        inputContent = fs.readFileSync(path.join(scenariosPath, scenario.inputPath), 'utf-8');
        expectedContent = fs.readFileSync(path.join(scenariosPath, scenario.expectedPath), 'utf-8');
        rules = JSON.parse(fs.readFileSync(path.join(scenariosPath, scenario.rulesPath), 'utf-8'));
      });

      it('should contain v5 patterns in input', () => {
        expect(inputContent).toContain('Switch');
        expect(inputContent).toContain('useHistory');
        expect(inputContent).toContain('withRouter');
        expect(inputContent).toContain('Redirect');
        expect(inputContent).toContain('RouteComponentProps');
      });

      it('should contain v6 patterns in expected output', () => {
        expect(expectedContent).toContain('Routes');
        expect(expectedContent).toContain('useNavigate');
        expect(expectedContent).toContain('Navigate');
        expect(expectedContent).toContain('element={');
        expect(expectedContent).not.toContain('withRouter');
        expect(expectedContent).not.toContain('RouteComponentProps');
      });

      it('should have comprehensive migration rules', () => {
        expect(rules.lookup).toHaveProperty('react-router-dom');
        expect(rules.components).toBeInstanceOf(Array);
        expect(rules.hooks).toBeInstanceOf(Array);
        expect(rules.hocs).toBeInstanceOf(Array);
      });
    });

    describe('Class Components to Hooks', () => {
      let inputContent: string;
      let expectedContent: string;
      let rules: any;

      beforeEach(() => {
        const scenario = migrationScenarios.find(s => s.name === 'Class Components to Hooks')!;
        inputContent = fs.readFileSync(path.join(scenariosPath, scenario.inputPath), 'utf-8');
        expectedContent = fs.readFileSync(path.join(scenariosPath, scenario.expectedPath), 'utf-8');
        rules = JSON.parse(fs.readFileSync(path.join(scenariosPath, scenario.rulesPath), 'utf-8'));
      });

      it('should contain class component patterns in input', () => {
        expect(inputContent).toContain('extends Component');
        expect(inputContent).toContain('extends PureComponent');
        expect(inputContent).toContain('componentDidMount');
        expect(inputContent).toContain('componentDidUpdate');
        expect(inputContent).toContain('componentWillUnmount');
        expect(inputContent).toContain('this.state');
        expect(inputContent).toContain('this.setState');
        expect(inputContent).toContain('connect(');
      });

      it('should contain hook patterns in expected output', () => {
        expect(expectedContent).toContain('useState');
        expect(expectedContent).toContain('useEffect');
        expect(expectedContent).toContain('useCallback');
        expect(expectedContent).toContain('useSelector');
        expect(expectedContent).toContain('useDispatch');
        expect(expectedContent).toContain('React.memo');
        expect(expectedContent).not.toContain('extends Component');
        expect(expectedContent).not.toContain('componentDidMount');
      });

      it('should have lifecycle transformation rules', () => {
        expect(rules.transformations).toBeInstanceOf(Array);
        expect(rules.stateTransformations).toBeInstanceOf(Array);
        expect(rules.methodTransformations).toBeInstanceOf(Array);
      });
    });

    describe('HOCs to Custom Hooks', () => {
      let inputContent: string;
      let expectedContent: string;
      let rules: any;

      beforeEach(() => {
        const scenario = migrationScenarios.find(s => s.name === 'HOCs to Custom Hooks')!;
        inputContent = fs.readFileSync(path.join(scenariosPath, scenario.inputPath), 'utf-8');
        expectedContent = fs.readFileSync(path.join(scenariosPath, scenario.expectedPath), 'utf-8');
        rules = JSON.parse(fs.readFileSync(path.join(scenariosPath, scenario.rulesPath), 'utf-8'));
      });

      it('should contain HOC patterns in input', () => {
        expect(inputContent).toContain('function with');
        expect(inputContent).toContain('ComponentType');
        expect(inputContent).toContain('WrappedComponent');
        expect(inputContent).toContain('withAuth(');
        expect(inputContent).toContain('withData(');
        expect(inputContent).toContain('withTheme(');
      });

      it('should contain custom hook patterns in expected output', () => {
        expect(expectedContent).toContain('const use');
        expect(expectedContent).toContain('useAuth');
        expect(expectedContent).toContain('useData');
        expect(expectedContent).toContain('useTheme');
        expect(expectedContent).toContain('usePermissionGuard');
        expect(expectedContent).not.toContain('function with');
        expect(expectedContent).not.toContain('WrappedComponent');
      });

      it('should have HOC transformation rules', () => {
        expect(rules.transformations).toBeInstanceOf(Array);
        expect(rules.hookConversions).toBeInstanceOf(Array);
        expect(rules.usageTransformations).toBeInstanceOf(Array);
      });
    });

    describe('Styled Components to Emotion', () => {
      let inputContent: string;
      let expectedContent: string;
      let rules: any;

      beforeEach(() => {
        const scenario = migrationScenarios.find(s => s.name === 'Styled Components to Emotion')!;
        inputContent = fs.readFileSync(path.join(scenariosPath, scenario.inputPath), 'utf-8');
        expectedContent = fs.readFileSync(path.join(scenariosPath, scenario.expectedPath), 'utf-8');
        rules = JSON.parse(fs.readFileSync(path.join(scenariosPath, scenario.rulesPath), 'utf-8'));
      });

      it('should contain styled-components patterns in input', () => {
        expect(inputContent).toContain("from 'styled-components'");
        expect(inputContent).toContain('createGlobalStyle');
        expect(inputContent).toContain('DefaultTheme');
        expect(inputContent).toContain('<GlobalStyle');
      });

      it('should contain Emotion patterns in expected output', () => {
        expect(expectedContent).toContain("from '@emotion/react'");
        expect(expectedContent).toContain("from '@emotion/styled'");
        expect(expectedContent).toContain('EmotionTheme');
        expect(expectedContent).toContain('<Global styles=');
        expect(expectedContent).toContain('const globalStyles = css');
        expect(expectedContent).not.toContain('createGlobalStyle');
        expect(expectedContent).not.toContain('DefaultTheme');
      });

      it('should have CSS-in-JS transformation rules', () => {
        expect(rules.globalStylesTransformation).toBeDefined();
        expect(rules.themeTransformation).toBeDefined();
        expect(rules.importTransformations).toBeInstanceOf(Array);
      });
    });

    describe('Context API Evolution', () => {
      let inputContent: string;
      let expectedContent: string;
      let rules: any;

      beforeEach(() => {
        const scenario = migrationScenarios.find(s => s.name === 'Context API Evolution')!;
        inputContent = fs.readFileSync(path.join(scenariosPath, scenario.inputPath), 'utf-8');
        expectedContent = fs.readFileSync(path.join(scenariosPath, scenario.expectedPath), 'utf-8');
        rules = JSON.parse(fs.readFileSync(path.join(scenariosPath, scenario.rulesPath), 'utf-8'));
      });

      it('should contain legacy context patterns in input', () => {
        expect(inputContent).toContain('getChildContext');
        expect(inputContent).toContain('childContextTypes');
        expect(inputContent).toContain('contextTypes');
        expect(inputContent).toContain('PropTypes');
        expect(inputContent).toContain('this.context');
      });

      it('should contain modern context patterns in expected output', () => {
        expect(expectedContent).toContain('useContext');
        expect(expectedContent).toContain('useState');
        expect(expectedContent).toContain('useCallback');
        expect(expectedContent).toContain('useMemo');
        expect(expectedContent).toContain('createContext');
        expect(expectedContent).not.toContain('getChildContext');
        expect(expectedContent).not.toContain('contextTypes');
        expect(expectedContent).not.toContain('PropTypes');
      });

      it('should have context transformation rules', () => {
        expect(rules.transformations).toBeInstanceOf(Array);
        expect(rules.classToFunctionalTransformations).toBeInstanceOf(Array);
        expect(rules.optimizationPatterns).toBeInstanceOf(Array);
      });
    });
  });

  describe('Migration Rule Validation', () => {
    migrationScenarios.forEach(scenario => {
      describe(`${scenario.name} Rules`, () => {
        let rules: any;

        beforeEach(() => {
          const rulesFile = path.join(scenariosPath, scenario.rulesPath);
          rules = JSON.parse(fs.readFileSync(rulesFile, 'utf-8'));
        });

        it('should have required rule structure', () => {
          expect(rules).toHaveProperty('name');
          expect(rules).toHaveProperty('description');
          expect(rules.name).toBe(scenario.name);
          expect(typeof rules.description).toBe('string');
        });

        it('should have lookup configuration', () => {
          expect(rules).toHaveProperty('lookup');
          expect(typeof rules.lookup).toBe('object');
          expect(Object.keys(rules.lookup).length).toBeGreaterThan(0);
        });

        it('should have transformation rules', () => {
          const hasTransformations = 
            rules.transformations ||
            rules.components ||
            rules.hooks ||
            rules.hocs ||
            rules.types ||
            rules.customTransformations;

          expect(hasTransformations).toBeTruthy();
        });

        it('should match patterns mentioned in scenario', () => {
          const rulesString = JSON.stringify(rules).toLowerCase();
          
          // At least some patterns should be mentioned in the rules
          const mentionedPatterns = scenario.patterns.filter(pattern => {
            const normalizedPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
            return rulesString.includes(normalizedPattern.substring(0, 5));
          });

          expect(mentionedPatterns.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Complexity Assessment', () => {
    it('should have appropriate complexity distribution', () => {
      const complexityCount = migrationScenarios.reduce((acc, scenario) => {
        acc[scenario.complexity] = (acc[scenario.complexity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(complexityCount.complex).toBeGreaterThan(0);
      expect(complexityCount.medium).toBeGreaterThan(0);
    });

    it('should have comprehensive pattern coverage', () => {
      const allPatterns = migrationScenarios.flatMap(s => s.patterns);
      
      // Ensure we cover major React ecosystem areas
      const reactPatterns = allPatterns.filter(p => p.toLowerCase().includes('react'));
      const hookPatterns = allPatterns.filter(p => p.toLowerCase().includes('hook') || p.toLowerCase().includes('use'));
      const componentPatterns = allPatterns.filter(p => p.toLowerCase().includes('component'));
      
      expect(reactPatterns.length).toBeGreaterThan(0);
      expect(hookPatterns.length).toBeGreaterThan(0);
      expect(componentPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Test Preparation', () => {
    it('should have realistic codebase examples', () => {
      migrationScenarios.forEach(scenario => {
        const inputFile = path.join(scenariosPath, scenario.inputPath);
        const content = fs.readFileSync(inputFile, 'utf-8');
        
        // Should have realistic code patterns
        expect(content).toContain('interface');
        expect(content).toContain('React');
        expect(content.split('\n').length).toBeGreaterThan(50); // Substantial code
      });
    });

    it('should demonstrate complex component hierarchies', () => {
      const routerScenario = migrationScenarios.find(s => s.name === 'React Router v5 to v6')!;
      const content = fs.readFileSync(path.join(scenariosPath, routerScenario.inputPath), 'utf-8');
      
      expect(content).toContain('nested');
      expect(content).toContain('Switch');
      expect(content).toContain('Route');
      expect(content.match(/component.*=/g)?.length).toBeGreaterThan(3);
    });

    it('should include TypeScript integration', () => {
      migrationScenarios.forEach(scenario => {
        const inputFile = path.join(scenariosPath, scenario.inputPath);
        const expectedFile = path.join(scenariosPath, scenario.expectedPath);
        
        const inputContent = fs.readFileSync(inputFile, 'utf-8');
        const expectedContent = fs.readFileSync(expectedFile, 'utf-8');
        
        expect(inputContent).toContain('interface');
        expect(expectedContent).toContain('interface');
        expect(inputContent).toContain(': React.');
        expect(expectedContent).toContain(': React.');
      });
    });
  });
});

// Performance and validation tests
describe('Migration Scenario Performance', () => {
  it('should have reasonable file sizes', () => {
    migrationScenarios.forEach(scenario => {
      const inputFile = path.join(__dirname, 'migration-scenarios', scenario.inputPath);
      const expectedFile = path.join(__dirname, 'migration-scenarios', scenario.expectedPath);
      
      const inputStats = fs.statSync(inputFile);
      const expectedStats = fs.statSync(expectedFile);
      
      // Files should be substantial but not excessive (5KB - 50KB)
      expect(inputStats.size).toBeGreaterThan(5000);
      expect(inputStats.size).toBeLessThan(50000);
      expect(expectedStats.size).toBeGreaterThan(5000);
      expect(expectedStats.size).toBeLessThan(50000);
    });
  });

  it('should demonstrate realistic migration scenarios', () => {
    // Ensure scenarios cover real-world migration patterns
    const scenarioNames = migrationScenarios.map(s => s.name.toLowerCase());
    
    expect(scenarioNames.some(name => name.includes('router'))).toBe(true);
    expect(scenarioNames.some(name => name.includes('class'))).toBe(true);
    expect(scenarioNames.some(name => name.includes('hook'))).toBe(true);
    expect(scenarioNames.some(name => name.includes('context'))).toBe(true);
    expect(scenarioNames.some(name => name.includes('styled') || name.includes('emotion'))).toBe(true);
  });
});

export { migrationScenarios, type MigrationScenario };
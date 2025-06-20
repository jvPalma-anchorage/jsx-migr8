/**********************************************************************
 *  src/cli/interactive-diff/__tests__/interactive-diff.test.ts – Tests
 *********************************************************************/

import { describe, test, expect } from '@jest/globals';

// Mock chalk to avoid ES module issues in tests
jest.mock('chalk', () => ({
  default: {
    red: (text: string) => `[RED]${text}[/RED]`,
    green: (text: string) => `[GREEN]${text}[/GREEN]`,
    blue: (text: string) => `[BLUE]${text}[/BLUE]`,
    yellow: (text: string) => `[YELLOW]${text}[/YELLOW]`,
    cyan: (text: string) => `[CYAN]${text}[/CYAN]`,
    gray: (text: string) => `[GRAY]${text}[/GRAY]`,
    bold: (text: string) => `[BOLD]${text}[/BOLD]`,
    bgRedBright: { black: (text: string) => `[BG_RED]${text}[/BG_RED]` },
    bgGreenBright: { black: (text: string) => `[BG_GREEN]${text}[/BG_GREEN]` },
    bgYellow: { black: (text: string) => `[BG_YELLOW]${text}[/BG_YELLOW]` },
    hex: (color: string) => (text: string) => `[${color}]${text}[/${color}]`,
  },
}));

// Mock blessed to avoid terminal issues in tests
jest.mock('blessed', () => ({
  screen: () => ({
    destroy: jest.fn(),
    render: jest.fn(),
    on: jest.fn(),
    key: jest.fn(),
    clearRegion: jest.fn(),
    title: '',
  }),
  box: () => ({
    style: { border: {} },
    border: {},
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    setLabel: jest.fn(),
  }),
  scrollabletext: () => ({
    setContent: jest.fn(),
    scroll: jest.fn(),
    focus: jest.fn(),
  }),
  list: () => ({
    on: jest.fn(),
    key: jest.fn(),
    select: jest.fn(),
    focus: jest.fn(),
  }),
  text: () => ({
    setContent: jest.fn(),
  }),
  message: () => ({
    display: jest.fn(),
    destroy: jest.fn(),
  }),
}));

import { 
  DiffContent,
  RuleInfo,
  QuadrantContent,
  defaultTheme,
  darkTheme,
  lightTheme,
} from '../index';

describe('InteractiveDiffViewer Types', () => {

  test('should create diff content', () => {
    const diffContent: DiffContent = {
      oldCode: 'old code',
      newCode: 'new code',
      fileName: 'test.tsx',
      lineOffset: 1,
    };

    expect(diffContent.oldCode).toBe('old code');
    expect(diffContent.newCode).toBe('new code');
    expect(diffContent.fileName).toBe('test.tsx');
    expect(diffContent.lineOffset).toBe(1);
  });

  test('should create rule info', () => {
    const ruleInfo: RuleInfo = {
      name: 'Test Rule',
      description: 'Test description',
      sourcePackage: 'old-package',
      targetPackage: 'new-package',
      componentName: 'TestComponent',
      propsChanged: ['prop1', 'prop2'],
      importsChanged: ['import1', 'import2'],
    };

    expect(ruleInfo.name).toBe('Test Rule');
    expect(ruleInfo.sourcePackage).toBe('old-package');
    expect(ruleInfo.targetPackage).toBe('new-package');
    expect(ruleInfo.propsChanged).toHaveLength(2);
    expect(ruleInfo.importsChanged).toHaveLength(2);
  });

  test('should create quadrant content', () => {
    const oldDiff: DiffContent = {
      oldCode: 'old',
      newCode: 'old',
      fileName: 'test.tsx',
    };

    const newDiff: DiffContent = {
      oldCode: 'old',
      newCode: 'new',
      fileName: 'test.tsx',
    };

    const ruleInfo: RuleInfo = {
      name: 'Test',
      description: 'Test rule',
      sourcePackage: 'old',
      targetPackage: 'new',
      componentName: 'Test',
      propsChanged: [],
      importsChanged: [],
    };

    const content: QuadrantContent = {
      oldDiff,
      newDiff,
      ruleInfo,
      status: 'pending',
    };

    expect(content.status).toBe('pending');
    expect(content.oldDiff).toEqual(oldDiff);
    expect(content.newDiff).toEqual(newDiff);
    expect(content.ruleInfo).toEqual(ruleInfo);
  });
});

describe('Theme configurations', () => {
  test('should have valid default theme', () => {
    expect(defaultTheme.colors.added).toBe('green');
    expect(defaultTheme.borders.style).toBe('single');
    expect(defaultTheme.scrollbar.show).toBe(true);
  });

  test('should have valid dark theme', () => {
    expect(darkTheme.colors.added).toBe('brightGreen');
    expect(darkTheme.borders.style).toBe('rounded');
  });

  test('should have valid light theme', () => {
    expect(lightTheme.colors.background).toBe('white');
    expect(lightTheme.borders.style).toBe('double');
  });
});
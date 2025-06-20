/**********************************************************************
 *  src/cli/interactive-diff/types.ts – Interactive diff types
 *********************************************************************/

export interface DiffContent {
  oldCode: string;
  newCode: string;
  fileName: string;
  lineOffset?: number;
}

export interface RuleInfo {
  name: string;
  description: string;
  sourcePackage: string;
  targetPackage: string;
  componentName: string;
  propsChanged: string[];
  importsChanged: string[];
}

export interface QuadrantContent {
  oldDiff: DiffContent;
  newDiff: DiffContent;
  ruleInfo: RuleInfo;
  status: 'pending' | 'confirmed' | 'needs-adjust' | 'stopped';
}

export interface TerminalDimensions {
  width: number;
  height: number;
}

export interface QuadrantDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MatrixLayout {
  topLeft: QuadrantDimensions;    // Old code diff
  topRight: QuadrantDimensions;   // New code diff
  bottomLeft: QuadrantDimensions; // Interactive menu
  bottomRight: QuadrantDimensions; // Rule information
}

export interface InteractiveMenuOptions {
  confirm: string;
  needsAdjust: string;
  stop: string;
}

export interface KeyboardAction {
  key: string;
  action: 'confirm' | 'needs-adjust' | 'stop' | 'scroll-up' | 'scroll-down' | 'next' | 'previous' | 'quit';
  description: string;
}

export interface DiffColors {
  added: string;
  removed: string;
  modified: string;
  lineNumber: string;
  background: string;
  border: string;
  highlight: string;
}

export interface LayoutTheme {
  colors: DiffColors;
  borders: {
    style: 'single' | 'double' | 'rounded';
    color: string;
  };
  scrollbar: {
    show: boolean;
    color: string;
  };
}
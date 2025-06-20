import { types as T } from "recast";
import { JsxUsage } from "@/graph/types";
import { ComponentUsage } from "@/types";
import { RemapRule } from "@/remap/base-remapper";
import { Migr8Spec } from "@/report";

/**
 * Represents a change made to a component's props
 */
export interface PropChange {
  type: 'add' | 'remove' | 'rename' | 'modify';
  propName: string;
  oldValue?: any;
  newValue?: any;
  newPropName?: string; // for rename operations
  lineNumber?: number;
}

/**
 * Represents a change made to an import statement
 */
export interface ImportChange {
  type: 'add' | 'remove' | 'modify';
  packageName: string;
  componentName?: string;
  importType: 'default' | 'named' | 'namespace';
  oldPackage?: string; // for package changes
  lineNumber?: number;
}

/**
 * Represents a component replacement (when using replaceWith rule)
 */
export interface ComponentReplacement {
  oldComponentName: string;
  newComponentName: string;
  newPackage?: string;
  lineNumber?: number;
  propChanges: PropChange[];
}

/**
 * Represents a single component transformation within a file
 */
export interface ComponentTransformation {
  componentName: string;
  packageName: string;
  elementId: string;
  lineNumber?: number;
  propChanges: PropChange[];
  replacement?: ComponentReplacement;
  appliedRules: AppliedRule[];
}

/**
 * Represents a rule that was applied to a component
 */
export interface AppliedRule {
  ruleId?: string;
  ruleType: 'propSet' | 'propRemove' | 'propRename' | 'replaceWith' | 'importChange';
  description: string;
  matchedProps?: Record<string, any>;
  appliedChanges: (PropChange | ImportChange)[];
}

/**
 * Statistics about the transformation of a file
 */
export interface FileTransformationStats {
  totalComponents: number;
  componentsChanged: number;
  totalPropsModified: number;
  propsAdded: number;
  propsRemoved: number;
  propsRenamed: number;
  importsAdded: number;
  importsRemoved: number;
  importsModified: number;
  rulesApplied: number;
  linesChanged: number;
  charactersChanged: number;
}

/**
 * Complete transformation information for a single file
 */
export interface FileTransformation {
  filePath: string;
  originalCode: string;
  transformedCode: string;
  ast: T.ASTNode;
  
  // Component-level transformations
  componentTransformations: ComponentTransformation[];
  
  // Import-level transformations
  importChanges: ImportChange[];
  
  // Applied rules tracking
  appliedRules: AppliedRule[];
  
  // Statistics
  stats: FileTransformationStats;
  
  // Metadata
  processingTime: number;
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Aggregated migration result for all files
 */
export interface FileMigrationResult {
  fileTransformations: FileTransformation[];
  totalStats: FileTransformationStats;
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalProcessingTime: number;
  };
  errors: Array<{
    filePath: string;
    error: string;
    type: 'validation' | 'parsing' | 'transformation' | 'io';
  }>;
}

/**
 * Configuration for file-based migration
 */
export interface FileMigrationConfig {
  showProgress?: boolean;
  includeStats?: boolean;
  includeLineNumbers?: boolean;
  generateDiffs?: boolean;
  validateSyntax?: boolean;
  preserveFormatting?: boolean;
  contextLines?: number; // for diff generation
}

/**
 * Input data for file transformation
 */
export interface FileTransformationInput {
  filePath: string;
  originalCode: string;
  ast: T.ASTNode;
  components: Array<{
    componentName: string;
    packageName: string;
    elements: JsxUsage[];
    importNode: ComponentUsage["impObj"];
  }>;
  migr8Spec: Migr8Spec;
  config: FileMigrationConfig;
}

/**
 * Enhanced diff information with line numbers and context
 */
export interface EnhancedDiff {
  filePath: string;
  hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    changes: Array<{
      type: 'add' | 'remove' | 'context';
      lineNumber: number;
      content: string;
      relatedChange?: {
        type: 'prop' | 'import' | 'component';
        description: string;
      };
    }>;
  }>;
  stats: {
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
    totalChanges: number;
  };
}
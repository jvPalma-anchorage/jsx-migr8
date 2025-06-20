import { MigrationMapper } from "../types";
import { Migr8Spec } from "@/report";
import { ComponentPropsSummary } from "@/types";
import { FileTransformationInput } from "../file-transformation-types";
import { getFileAstAndCode } from "@/utils/fs-utils";
import { getCompName } from "@/utils/pathUtils";
import { lWarning, lError } from "@/context/globalContext";
import { ProjectGraph } from "@/graph/types";

/**
 * Aggregates migration data by file path instead of by rule
 * This allows us to process all transformations for a single file at once
 */
export class FileAggregator {
  private fileMap: Map<string, FileTransformationInput> = new Map();

  /**
   * Aggregates migration data from the existing MigrationMapper format
   * and converts it to a file-centric structure
   */
  aggregateFromMigrationMapper(
    migrationMapper: MigrationMapper,
    migr8Spec: Migr8Spec,
    config: { includeStats?: boolean; includeLineNumbers?: boolean; generateDiffs?: boolean } = {}
  ): FileTransformationInput[] {
    const aggregatedFiles: FileTransformationInput[] = [];

    // Group data by file path
    Object.entries(migrationMapper).forEach(([filePath, migrationData]) => {
      try {
        const { packageName, component, codeCompare, importNode, elements } = migrationData;
        
        // Get or create file transformation input
        let fileInput = this.fileMap.get(filePath);
        
        if (!fileInput) {
          // Create new file input
          fileInput = {
            filePath,
            originalCode: codeCompare.old || "",
            ast: codeCompare.ast!,
            components: [],
            migr8Spec,
            config: {
              showProgress: false,
              includeStats: config.includeStats ?? true,
              includeLineNumbers: config.includeLineNumbers ?? true,
              generateDiffs: config.generateDiffs ?? true,
              validateSyntax: true,
              preserveFormatting: true,
              contextLines: 3
            }
          };
          
          this.fileMap.set(filePath, fileInput);
        }

        // Add component data to the file input
        fileInput.components.push({
          componentName: component,
          packageName,
          elements,
          importNode
        });

      } catch (error) {
        lError(`Failed to aggregate data for file ${filePath}:`, error as any);
      }
    });

    // Convert map to array
    this.fileMap.forEach((fileInput) => {
      aggregatedFiles.push(fileInput);
    });

    return aggregatedFiles;
  }

  /**
   * Creates file transformation inputs from component summary
   * This is an alternative approach that works directly with the component summary
   */
  aggregateFromComponentSummary(
    summary: ComponentPropsSummary,
    migr8Spec: Migr8Spec,
    config: { includeStats?: boolean; includeLineNumbers?: boolean; generateDiffs?: boolean } = {},
    graph?: ProjectGraph
  ): FileTransformationInput[] {
    const fileInputs: FileTransformationInput[] = [];
    const filePathToInput: Map<string, FileTransformationInput> = new Map();

    const { packages, components } = migr8Spec.lookup;

    packages.forEach((pkgName) => {
      if (!summary[pkgName]) return;

      Object.keys(summary[pkgName]).forEach((compName) => {
        if (!components.includes(compName)) return;

        const componentUsages = summary[pkgName][compName];
        if (!componentUsages) return;

        componentUsages.forEach((compUsage) => {
          const filePath = compUsage.impObj.file;
          
          let fileInput = filePathToInput.get(filePath);
          
          if (!fileInput) {
            // Load file AST and code
            let ast, originalCode;
            try {
              [ast, originalCode] = getFileAstAndCode(filePath);
            } catch (error) {
              lError(`Failed to load file ${filePath}:`, error as any);
              return;
            }

            fileInput = {
              filePath,
              originalCode,
              ast,
              components: [],
              migr8Spec,
              config: {
                showProgress: false,
                includeStats: config.includeStats ?? true,
                includeLineNumbers: config.includeLineNumbers ?? true,
                generateDiffs: config.generateDiffs ?? true,
                validateSyntax: true,
                preserveFormatting: true,
                contextLines: 3
              }
            };
            
            filePathToInput.set(filePath, fileInput);
            fileInputs.push(fileInput);
          }

          // Find elements for this component in this file from the graph
          const elements = graph ? graph.jsx.filter(jsx => 
            jsx.importRef.file === filePath &&
            jsx.importRef.imported === compUsage.impObj.imported &&
            jsx.importRef.local === compUsage.impObj.local
          ) : [];

          // Add component to file input
          fileInput.components.push({
            componentName: getCompName(
              compUsage.impObj.local,
              compUsage.impObj.imported,
              compUsage.impObj.importedType
            ),
            packageName: pkgName,
            elements,
            importNode: compUsage.impObj
          });
        });
      });
    });

    return fileInputs;
  }

  /**
   * Groups components by file and merges duplicate component entries
   */
  static mergeComponentsByFile(fileInputs: FileTransformationInput[]): FileTransformationInput[] {
    const mergedFiles: FileTransformationInput[] = [];
    const filePathToInput: Map<string, FileTransformationInput> = new Map();

    fileInputs.forEach((fileInput) => {
      const existing = filePathToInput.get(fileInput.filePath);
      
      if (existing) {
        // Merge components
        fileInput.components.forEach((component) => {
          const existingComponent = existing.components.find(
            (c) => c.componentName === component.componentName && 
                  c.packageName === component.packageName
          );
          
          if (existingComponent) {
            // Merge elements
            existingComponent.elements.push(...component.elements);
          } else {
            existing.components.push(component);
          }
        });
      } else {
        filePathToInput.set(fileInput.filePath, fileInput);
        mergedFiles.push(fileInput);
      }
    });

    return mergedFiles;
  }

  /**
   * Validates that all required data is present for file transformation
   */
  static validateFileInputs(fileInputs: FileTransformationInput[]): {
    valid: FileTransformationInput[];
    invalid: Array<{ fileInput: FileTransformationInput; errors: string[] }>;
  } {
    const valid: FileTransformationInput[] = [];
    const invalid: Array<{ fileInput: FileTransformationInput; errors: string[] }> = [];

    fileInputs.forEach((fileInput) => {
      const errors: string[] = [];

      if (!fileInput.filePath) {
        errors.push("Missing file path");
      }

      if (!fileInput.originalCode) {
        errors.push("Missing original code");
      }

      if (!fileInput.ast) {
        errors.push("Missing AST");
      }

      if (!fileInput.components || fileInput.components.length === 0) {
        errors.push("No components to migrate");
      }

      if (!fileInput.migr8Spec || !fileInput.migr8Spec.migr8rules) {
        errors.push("Missing migration rules");
      }

      fileInput.components.forEach((component, index) => {
        if (!component.componentName) {
          errors.push(`Component ${index}: Missing component name`);
        }
        
        if (!component.packageName) {
          errors.push(`Component ${index}: Missing package name`);
        }
        
        if (!component.elements || component.elements.length === 0) {
          errors.push(`Component ${index} (${component.componentName}): No JSX elements found`);
        }
      });

      if (errors.length === 0) {
        valid.push(fileInput);
      } else {
        invalid.push({ fileInput, errors });
        lWarning(`File ${fileInput.filePath} has validation errors:`, errors.join(", "));
      }
    });

    return { valid, invalid };
  }

  /**
   * Clears the internal file map
   */
  clear(): void {
    this.fileMap.clear();
  }

  /**
   * Gets statistics about the aggregated files
   */
  getAggregationStats(): {
    totalFiles: number;
    totalComponents: number;
    componentsPerFile: Record<string, number>;
    packagesUsed: Set<string>;
  } {
    const stats = {
      totalFiles: this.fileMap.size,
      totalComponents: 0,
      componentsPerFile: {} as Record<string, number>,
      packagesUsed: new Set<string>()
    };

    this.fileMap.forEach((fileInput, filePath) => {
      stats.componentsPerFile[filePath] = fileInput.components.length;
      stats.totalComponents += fileInput.components.length;
      
      fileInput.components.forEach((component) => {
        stats.packagesUsed.add(component.packageName);
      });
    });

    return stats;
  }
}
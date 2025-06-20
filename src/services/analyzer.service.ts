/**
 * Analyzer service implementation
 */

import { IAnalyzerService, IFileService, IASTService, ILoggerService } from '../di/types';
import { graphToComponentSummary } from '../compat/usageSummary';
import type { NodePath } from 'ast-types/lib/node-path';
import { types as T } from 'recast';

export class AnalyzerService implements IAnalyzerService {
  constructor(
    private fileService: IFileService,
    private astService: IASTService,
    private loggerService: ILoggerService
  ) {}

  async initialize(): Promise<void> {
    this.loggerService.debug('Analyzer service initialized');
  }

  async dispose(): Promise<void> {
    this.loggerService.debug('Analyzer service disposed');
  }

  async analyzeFile(filePath: string): Promise<boolean> {
    try {
      this.loggerService.debug(`Analyzing file: ${filePath}`);
      
      const { ast } = await this.astService.parseFile(filePath);
      
      // Create analysis context
      const context = {
        filePath,
        imports: [] as any[],
        jsxElements: [] as any[],
        errors: [] as string[],
      };

      // Analyze imports
      try {
        context.imports = await this.analyzeImportsFromAST(ast, filePath);
        this.loggerService.debug(`Found ${context.imports.length} imports in ${filePath}`);
      } catch (error) {
        const errorMsg = `Failed to analyze imports in ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
        context.errors.push(errorMsg);
        this.loggerService.warn(errorMsg);
      }

      // Analyze JSX elements
      try {
        context.jsxElements = await this.analyzeJSXFromAST(ast, filePath);
        this.loggerService.debug(`Found ${context.jsxElements.length} JSX elements in ${filePath}`);
      } catch (error) {
        const errorMsg = `Failed to analyze JSX elements in ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
        context.errors.push(errorMsg);
        this.loggerService.warn(errorMsg);
      }

      // Return success if no critical errors occurred
      return context.errors.length === 0;

    } catch (error) {
      this.loggerService.error(`File analysis failed for ${filePath}:`, error);
      return false;
    }
  }

  async analyzeImports(filePath: string): Promise<any[]> {
    try {
      const { ast } = await this.astService.parseFile(filePath);
      return this.analyzeImportsFromAST(ast, filePath);
    } catch (error) {
      this.loggerService.error(`Failed to analyze imports in ${filePath}:`, error);
      throw error;
    }
  }

  async analyzeJSXUsage(filePath: string): Promise<any[]> {
    try {
      const { ast } = await this.astService.parseFile(filePath);
      return this.analyzeJSXFromAST(ast, filePath);
    } catch (error) {
      this.loggerService.error(`Failed to analyze JSX usage in ${filePath}:`, error);
      throw error;
    }
  }

  async generateComponentSummary(graph: any): Promise<any> {
    try {
      this.loggerService.debug('Generating component summary from graph');
      return graphToComponentSummary(graph);
    } catch (error) {
      this.loggerService.error('Failed to generate component summary:', error);
      throw error;
    }
  }

  // Batch analysis for multiple files
  async analyzeMultipleFiles(filePaths: string[]): Promise<{
    successful: string[];
    failed: Array<{ path: string; error: Error }>;
    summary: {
      totalFiles: number;
      successfulFiles: number;
      failedFiles: number;
      totalImports: number;
      totalJSXElements: number;
    };
  }> {
    this.loggerService.info(`Starting batch analysis of ${filePaths.length} files`);

    const successful: string[] = [];
    const failed: Array<{ path: string; error: Error }> = [];
    let totalImports = 0;
    let totalJSXElements = 0;

    // Analyze files concurrently with controlled concurrency
    const batchSize = 10; // Process 10 files at a time
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (filePath) => {
          const result = await this.analyzeFile(filePath);
          if (result) {
            // Get detailed analysis for counting
            const imports = await this.analyzeImports(filePath);
            const jsxElements = await this.analyzeJSXUsage(filePath);
            return {
              path: filePath,
              success: true,
              importCount: imports.length,
              jsxCount: jsxElements.length,
            };
          } else {
            throw new Error(`Analysis failed for ${filePath}`);
          }
        })
      );

      // Process batch results
      batchResults.forEach((result, index) => {
        const filePath = batch[index];
        if (result.status === 'fulfilled') {
          successful.push(filePath);
          totalImports += result.value.importCount;
          totalJSXElements += result.value.jsxCount;
        } else {
          failed.push({
            path: filePath,
            error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
          });
        }
      });

      // Progress update
      this.loggerService.progress(i + batch.length, filePaths.length, 'Analyzing files');
    }

    const summary = {
      totalFiles: filePaths.length,
      successfulFiles: successful.length,
      failedFiles: failed.length,
      totalImports,
      totalJSXElements,
    };

    this.loggerService.info(`Batch analysis completed: ${summary.successfulFiles}/${summary.totalFiles} files successful`);
    
    return { successful, failed, summary };
  }

  // Private implementation methods
  private async analyzeImportsFromAST(ast: T.ASTNode, filePath: string): Promise<any[]> {
    const imports: any[] = [];

    this.astService.visitAST(ast, {
      visitImportDeclaration: (path: NodePath<T.ImportDeclaration>) => {
        try {
          const node = path.node;
          const packageName = node.source.value as string;

          node.specifiers?.forEach((spec) => {
            let imported: string;
            let local: string;
            let importType: string;

            try {
              switch (spec.type) {
                case 'ImportDefaultSpecifier':
                  imported = 'default';
                  local = spec.local!.name;
                  importType = 'default';
                  break;
                case 'ImportNamespaceSpecifier':
                  imported = '*';
                  local = spec.local!.name;
                  importType = 'namespace';
                  break;
                case 'ImportSpecifier':
                  imported = spec.imported!.name;
                  local = spec.local!.name;
                  importType = 'named';
                  break;
                default:
                  imported = 'UNKNOWN';
                  local = spec.local?.name || 'UNKNOWN';
                  importType = 'unknown';
                  this.loggerService.warn(`Unknown import specifier type: ${spec.type} in ${filePath}`);
              }

              imports.push({
                packageName,
                imported,
                local,
                importType,
                filePath,
                node: path,
                specifierType: spec.type,
              });

            } catch (error) {
              this.loggerService.warn(`Failed to process import specifier in ${filePath}:`, error);
            }
          });

        } catch (error) {
          this.loggerService.warn(`Failed to process import declaration in ${filePath}:`, error);
        }

        return false; // Don't traverse deeper
      },
    });

    return imports;
  }

  private async analyzeJSXFromAST(ast: T.ASTNode, filePath: string): Promise<any[]> {
    const jsxElements: any[] = [];

    this.astService.visitAST(ast, {
      visitJSXElement: (path: NodePath<T.JSXElement>) => {
        try {
          const node = path.node;
          const openingElement = node.openingElement;

          if (openingElement.name.type === 'JSXIdentifier') {
            const componentName = openingElement.name.name;
            
            // Extract props
            const props: Record<string, any> = {};
            const originalProps: Record<string, any> = {};

            openingElement.attributes?.forEach((attr) => {
              if (attr.type === 'JSXAttribute' && attr.name) {
                const propName = attr.name.name as string;
                
                if (!attr.value) {
                  // Boolean prop like <Component flag />
                  props[propName] = true;
                  originalProps[propName] = true;
                } else if (attr.value.type === 'Literal') {
                  props[propName] = attr.value.value;
                  originalProps[propName] = attr.value.value;
                } else if (attr.value.type === 'JSXExpressionContainer') {
                  // For complex expressions, store a simplified representation
                  props[propName] = this.simplifyExpression(attr.value.expression);
                  originalProps[propName] = attr.value.expression; // Keep original AST node
                } else {
                  props[propName] = attr.value;
                  originalProps[propName] = attr.value;
                }
              }
            });

            jsxElements.push({
              componentName,
              props,
              originalProps,
              filePath,
              node: path,
              children: node.children || [],
            });
          }

        } catch (error) {
          this.loggerService.warn(`Failed to process JSX element in ${filePath}:`, error);
        }

        return false; // Don't traverse into nested JSX for now
      },
    });

    return jsxElements;
  }

  private simplifyExpression(expression: any): any {
    if (!expression) return null;

    switch (expression.type) {
      case 'Literal':
        return expression.value;
      case 'Identifier':
        return `{${expression.name}}`;
      case 'MemberExpression':
        return `{${this.buildMemberExpressionString(expression)}}`;
      case 'CallExpression':
        return `{${this.buildCallExpressionString(expression)}}`;
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return '{function}';
      case 'ObjectExpression':
        return '{object}';
      case 'ArrayExpression':
        return '{array}';
      case 'BinaryExpression':
        return `{${this.buildBinaryExpressionString(expression)}}`;
      case 'ConditionalExpression':
        return '{conditional}';
      case 'LogicalExpression':
        return `{${this.buildLogicalExpressionString(expression)}}`;
      default:
        return `{${expression.type}}`;
    }
  }

  private buildMemberExpressionString(expr: any): string {
    try {
      const object = expr.object.type === 'Identifier' ? expr.object.name : 'object';
      const property = expr.property.type === 'Identifier' ? expr.property.name : 'property';
      return `${object}.${property}`;
    } catch {
      return 'object.property';
    }
  }

  private buildCallExpressionString(expr: any): string {
    try {
      const callee = expr.callee.type === 'Identifier' ? expr.callee.name : 'function';
      return `${callee}()`;
    } catch {
      return 'function()';
    }
  }

  private buildBinaryExpressionString(expr: any): string {
    try {
      const left = expr.left.type === 'Identifier' ? expr.left.name : 'left';
      const right = expr.right.type === 'Identifier' ? expr.right.name : 'right';
      return `${left} ${expr.operator} ${right}`;
    } catch {
      return 'left op right';
    }
  }

  private buildLogicalExpressionString(expr: any): string {
    try {
      const left = expr.left.type === 'Identifier' ? expr.left.name : 'left';
      const right = expr.right.type === 'Identifier' ? expr.right.name : 'right';
      return `${left} ${expr.operator} ${right}`;
    } catch {
      return 'left && right';
    }
  }

  // Analysis utilities
  async findComponentUsage(rootPath: string, componentName: string, packageName?: string): Promise<{
    files: string[];
    usageCount: number;
    propsSummary: Record<string, { count: number; values: Set<any> }>;
  }> {
    const files = await this.fileService.findJSXFiles(rootPath);
    const matchingFiles: string[] = [];
    let usageCount = 0;
    const propsSummary: Record<string, { count: number; values: Set<any> }> = {};

    for (const file of files) {
      try {
        const jsxElements = await this.analyzeJSXUsage(file);
        const matchingElements = jsxElements.filter(elem => {
          if (elem.componentName !== componentName) return false;
          
          // If package name is specified, check if component is imported from that package
          if (packageName) {
            // This would require cross-referencing with import analysis
            // For now, just match by component name
          }
          
          return true;
        });

        if (matchingElements.length > 0) {
          matchingFiles.push(file);
          usageCount += matchingElements.length;

          // Aggregate props usage
          matchingElements.forEach(elem => {
            Object.entries(elem.props).forEach(([propName, propValue]) => {
              if (!propsSummary[propName]) {
                propsSummary[propName] = { count: 0, values: new Set() };
              }
              propsSummary[propName].count++;
              propsSummary[propName].values.add(propValue);
            });
          });
        }

      } catch (error) {
        this.loggerService.warn(`Failed to analyze file ${file} for component usage:`, error);
      }
    }

    return {
      files: matchingFiles,
      usageCount,
      propsSummary: Object.fromEntries(
        Object.entries(propsSummary).map(([key, value]) => [
          key,
          { ...value, values: Array.from(value.values) }
        ])
      ) as any,
    };
  }

  async getPackageUsageSummary(rootPath: string): Promise<Record<string, {
    importCount: number;
    files: string[];
    components: Record<string, number>;
  }>> {
    const files = await this.fileService.findJSXFiles(rootPath);
    const packageSummary: Record<string, {
      importCount: number;
      files: string[];
      components: Record<string, number>;
    }> = {};

    for (const file of files) {
      try {
        const imports = await this.analyzeImports(file);
        
        imports.forEach(imp => {
          if (!packageSummary[imp.packageName]) {
            packageSummary[imp.packageName] = {
              importCount: 0,
              files: [],
              components: {},
            };
          }

          packageSummary[imp.packageName].importCount++;
          
          if (!packageSummary[imp.packageName].files.includes(file)) {
            packageSummary[imp.packageName].files.push(file);
          }

          const componentName = imp.imported === 'default' ? imp.local : imp.imported;
          packageSummary[imp.packageName].components[componentName] = 
            (packageSummary[imp.packageName].components[componentName] || 0) + 1;
        });

      } catch (error) {
        this.loggerService.warn(`Failed to analyze imports in ${file}:`, error);
      }
    }

    return packageSummary;
  }
}
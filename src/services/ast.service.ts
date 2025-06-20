/**
 * AST service implementation
 */

import { parse, print, visit, types as T } from 'recast';
import { IASTService, IFileService, ILoggerService } from '../di/types';

export class ASTService implements IASTService {
  constructor(
    private fileService: IFileService,
    private loggerService: ILoggerService
  ) {}

  async initialize(): Promise<void> {
    // Any initialization logic
  }

  async dispose(): Promise<void> {
    // Cleanup if needed
  }

  async parseFile(filePath: string): Promise<{ ast: T.ASTNode; code: string }> {
    try {
      const code = await this.fileService.readFile(filePath);
      const ast = this.parseCode(code, filePath);
      return { ast, code };
    } catch (error) {
      this.loggerService.error(`Failed to parse file ${filePath}:`, error);
      throw new Error(`Failed to parse file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  parseFileSync(filePath: string): { ast: T.ASTNode; code: string } {
    try {
      const code = this.fileService.readFileSync(filePath);
      const ast = this.parseCode(code, filePath);
      return { ast, code };
    } catch (error) {
      this.loggerService.error(`Failed to parse file ${filePath}:`, error);
      throw new Error(`Failed to parse file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  parseCode(code: string, filePath?: string): T.ASTNode {
    try {
      return parse(code, {
        parser: this.getParserOptions(filePath),
        tolerant: true,
        range: true,
        loc: true,
        tokens: true,
        comments: true,
      });
    } catch (error) {
      const location = filePath ? ` in ${filePath}` : '';
      this.loggerService.error(`Failed to parse code${location}:`, error);
      throw new Error(`Failed to parse code${location}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  printAST(ast: T.ASTNode, options?: { tabWidth?: number; quote?: 'single' | 'double' }): string {
    try {
      return print(ast, {
        tabWidth: options?.tabWidth || 2,
        quote: options?.quote || 'single',
        trailingComma: true,
        arrayBracketSpacing: false,
        objectCurlySpacing: true,
        reuseParsers: true,
      }).code;
    } catch (error) {
      this.loggerService.error('Failed to print AST:', error);
      throw new Error(`Failed to print AST: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  visitAST(ast: T.ASTNode, visitors: any): void {
    try {
      visit(ast, visitors);
    } catch (error) {
      this.loggerService.error('Failed to visit AST:', error);
      throw new Error(`Failed to visit AST: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Helper methods for common AST operations
  createVisitor(config: {
    visitImportDeclaration?: (path: any) => any;
    visitJSXElement?: (path: any) => any;
    visitJSXOpeningElement?: (path: any) => any;
    visitJSXAttribute?: (path: any) => any;
    visitCallExpression?: (path: any) => any;
    visitIdentifier?: (path: any) => any;
    visitMemberExpression?: (path: any) => any;
    [key: string]: any;
  }) {
    return config;
  }

  // Extract imports from AST
  extractImports(ast: T.ASTNode): Array<{
    source: string;
    specifiers: Array<{
      type: string;
      imported?: string;
      local: string;
    }>;
    node: any;
  }> {
    const imports: Array<{
      source: string;
      specifiers: Array<{
        type: string;
        imported?: string;
        local: string;
      }>;
      node: any;
    }> = [];

    this.visitAST(ast, {
      visitImportDeclaration: (path: any) => {
        const node = path.node;
        const source = node.source.value as string;
        
        const specifiers = (node.specifiers || []).map((spec: any) => {
          switch (spec.type) {
            case 'ImportDefaultSpecifier':
              return {
                type: 'default',
                local: spec.local.name,
              };
            case 'ImportNamespaceSpecifier':
              return {
                type: 'namespace',
                local: spec.local.name,
              };
            case 'ImportSpecifier':
              return {
                type: 'named',
                imported: spec.imported.name,
                local: spec.local.name,
              };
            default:
              return {
                type: 'unknown',
                local: spec.local?.name || 'unknown',
              };
          }
        });

        imports.push({
          source,
          specifiers,
          node: path,
        });

        return false; // Don't traverse deeper
      },
    });

    return imports;
  }

  // Extract JSX elements from AST
  extractJSXElements(ast: T.ASTNode): Array<{
    name: string;
    props: Record<string, any>;
    children: any[];
    node: any;
  }> {
    const jsxElements: Array<{
      name: string;
      props: Record<string, any>;
      children: any[];
      node: any;
    }> = [];

    this.visitAST(ast, {
      visitJSXElement: (path: any) => {
        const node = path.node;
        const openingElement = node.openingElement;

        if (openingElement.name.type === 'JSXIdentifier') {
          const name = openingElement.name.name;
          const props: Record<string, any> = {};

          // Extract props
          (openingElement.attributes || []).forEach((attr: any) => {
            if (attr.type === 'JSXAttribute' && attr.name) {
              const propName = attr.name.name;
              const propValue = attr.value;

              if (!propValue) {
                // Boolean prop like <Component flag />
                props[propName] = true;
              } else if (propValue.type === 'Literal') {
                props[propName] = propValue.value;
              } else if (propValue.type === 'JSXExpressionContainer') {
                // Keep the expression node for further analysis
                props[propName] = propValue.expression;
              } else {
                props[propName] = propValue;
              }
            }
          });

          jsxElements.push({
            name,
            props,
            children: node.children || [],
            node: path,
          });
        }

        return false; // Don't traverse deeper into nested JSX
      },
    });

    return jsxElements;
  }

  // Clone AST node
  cloneNode(node: any): any {
    try {
      // Use recast's built-in cloning or implement deep cloning
      return JSON.parse(JSON.stringify(node));
    } catch (error) {
      this.loggerService.warn('Failed to clone AST node, returning original:', error);
      return node;
    }
  }

  // Transform AST with multiple visitors
  transformAST(ast: T.ASTNode, transformers: Array<{ name: string; visitor: any }>): T.ASTNode {
    const clonedAST = this.cloneNode(ast);

    transformers.forEach(({ name, visitor }) => {
      try {
        this.visitAST(clonedAST, visitor);
        this.loggerService.debug(`Applied transformer: ${name}`);
      } catch (error) {
        this.loggerService.error(`Failed to apply transformer ${name}:`, error);
        throw error;
      }
    });

    return clonedAST;
  }

  // Validate AST structure
  validateAST(ast: T.ASTNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Basic validation - try to print the AST
      this.printAST(ast);
    } catch (error) {
      errors.push(`Invalid AST structure: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Additional validation checks can be added here
    try {
      let hasValidStructure = false;
      this.visitAST(ast, {
        visitProgram: () => {
          hasValidStructure = true;
          return false;
        },
      });

      if (!hasValidStructure) {
        errors.push('AST does not contain a valid Program node');
      }
    } catch (error) {
      errors.push(`AST validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Get appropriate parser options based on file extension
  private getParserOptions(filePath?: string) {
    if (!filePath) {
      return require('recast/parsers/typescript');
    }

    const ext = filePath.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'ts':
      case 'tsx':
        return require('recast/parsers/typescript');
      case 'js':
      case 'jsx':
      default:
        // Default to TypeScript parser as it can handle both JS and TS
        return require('recast/parsers/typescript');
    }
  }

  // Utility methods for AST manipulation
  createImportDeclaration(source: string, specifiers: Array<{ type: 'default' | 'named' | 'namespace'; imported?: string; local: string }>): any {
    const builders = require('ast-types').builders;
    
    const importSpecifiers = specifiers.map(spec => {
      switch (spec.type) {
        case 'default':
          return builders.importDefaultSpecifier(builders.identifier(spec.local));
        case 'namespace':
          return builders.importNamespaceSpecifier(builders.identifier(spec.local));
        case 'named':
          return builders.importSpecifier(
            builders.identifier(spec.imported || spec.local),
            builders.identifier(spec.local)
          );
        default:
          throw new Error(`Unknown import specifier type: ${spec.type}`);
      }
    });

    return builders.importDeclaration(importSpecifiers, builders.literal(source));
  }

  createJSXElement(name: string, props: Record<string, any> = {}, children: any[] = []): any {
    const builders = require('ast-types').builders;
    
    const attributes = Object.entries(props).map(([key, value]) => {
      let attrValue;
      
      if (typeof value === 'boolean' && value === true) {
        attrValue = null; // Boolean attribute like <div hidden />
      } else if (typeof value === 'string') {
        attrValue = builders.literal(value);
      } else {
        attrValue = builders.jsxExpressionContainer(value);
      }

      return builders.jsxAttribute(builders.jsxIdentifier(key), attrValue);
    });

    const openingElement = builders.jsxOpeningElement(
      builders.jsxIdentifier(name),
      attributes,
      children.length === 0
    );

    if (children.length === 0) {
      return builders.jsxElement(openingElement, null, []);
    }

    const closingElement = builders.jsxClosingElement(builders.jsxIdentifier(name));
    return builders.jsxElement(openingElement, closingElement, children);
  }
}
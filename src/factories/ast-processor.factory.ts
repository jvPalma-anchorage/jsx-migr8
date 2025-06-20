/**
 * Factory patterns for AST processors
 */

import { IServiceContainer, SERVICE_TOKENS, IASTService, ILoggerService } from '../di';

/**
 * Base interface for AST processors
 */
export interface IASTProcessor {
  name: string;
  process(ast: any, context?: any): Promise<any>;
  canProcess(ast: any, context?: any): boolean;
  getMetadata(): { name: string; description: string; version: string };
}

/**
 * AST processor context
 */
export interface ASTProcessorContext {
  filePath: string;
  packageName?: string;
  componentName?: string;
  rules?: any;
  metadata?: Record<string, any>;
}

/**
 * Import declaration processor
 */
export class ImportProcessor implements IASTProcessor {
  name = 'ImportProcessor';

  constructor(
    private astService: IASTService,
    private loggerService: ILoggerService
  ) {}

  async process(ast: any, context?: ASTProcessorContext): Promise<any> {
    this.loggerService.debug(`Processing imports for ${context?.filePath || 'unknown file'}`);

    const imports: any[] = [];

    this.astService.visitAST(ast, {
      visitImportDeclaration: (path: any) => {
        const node = path.node;
        const source = node.source.value as string;

        const specifiers = (node.specifiers || []).map((spec: any) => ({
          type: spec.type,
          imported: spec.imported?.name,
          local: spec.local?.name,
        }));

        imports.push({
          source,
          specifiers,
          node: path,
          filePath: context?.filePath,
        });

        return false;
      },
    });

    return imports;
  }

  canProcess(ast: any, context?: ASTProcessorContext): boolean {
    // Check if AST contains import declarations
    let hasImports = false;
    try {
      this.astService.visitAST(ast, {
        visitImportDeclaration: () => {
          hasImports = true;
          return false;
        },
      });
    } catch {
      return false;
    }
    return hasImports;
  }

  getMetadata() {
    return {
      name: this.name,
      description: 'Processes import declarations in AST',
      version: '1.0.0',
    };
  }
}

/**
 * JSX element processor
 */
export class JSXProcessor implements IASTProcessor {
  name = 'JSXProcessor';

  constructor(
    private astService: IASTService,
    private loggerService: ILoggerService
  ) {}

  async process(ast: any, context?: ASTProcessorContext): Promise<any> {
    this.loggerService.debug(`Processing JSX elements for ${context?.filePath || 'unknown file'}`);

    const jsxElements: any[] = [];

    this.astService.visitAST(ast, {
      visitJSXElement: (path: any) => {
        const node = path.node;
        const openingElement = node.openingElement;

        if (openingElement.name.type === 'JSXIdentifier') {
          const componentName = openingElement.name.name;
          
          // Extract props
          const props: Record<string, any> = {};
          openingElement.attributes?.forEach((attr: any) => {
            if (attr.type === 'JSXAttribute' && attr.name) {
              const propName = attr.name.name;
              props[propName] = this.extractPropValue(attr.value);
            }
          });

          jsxElements.push({
            componentName,
            props,
            children: node.children || [],
            node: path,
            filePath: context?.filePath,
          });
        }

        return false;
      },
    });

    return jsxElements;
  }

  private extractPropValue(value: any): any {
    if (!value) return true; // Boolean prop
    if (value.type === 'Literal') return value.value;
    if (value.type === 'JSXExpressionContainer') {
      return this.simplifyExpression(value.expression);
    }
    return value;
  }

  private simplifyExpression(expression: any): any {
    if (!expression) return null;
    
    switch (expression.type) {
      case 'Literal':
        return expression.value;
      case 'Identifier':
        return `{${expression.name}}`;
      case 'MemberExpression':
        return `{object.property}`;
      case 'CallExpression':
        return `{function()}`;
      default:
        return `{${expression.type}}`;
    }
  }

  canProcess(ast: any, context?: ASTProcessorContext): boolean {
    let hasJSX = false;
    try {
      this.astService.visitAST(ast, {
        visitJSXElement: () => {
          hasJSX = true;
          return false;
        },
      });
    } catch {
      return false;
    }
    return hasJSX;
  }

  getMetadata() {
    return {
      name: this.name,
      description: 'Processes JSX elements in AST',
      version: '1.0.0',
    };
  }
}

/**
 * Component migration processor
 */
export class MigrationProcessor implements IASTProcessor {
  name = 'MigrationProcessor';

  constructor(
    private astService: IASTService,
    private loggerService: ILoggerService
  ) {}

  async process(ast: any, context?: ASTProcessorContext): Promise<any> {
    if (!context?.rules) {
      throw new Error('Migration rules are required for MigrationProcessor');
    }

    this.loggerService.debug(`Applying migration rules to ${context.filePath || 'unknown file'}`);

    const rules = context.rules;
    const transformers: Array<{ name: string; visitor: any }> = [];

    // Build transformers based on rules
    if (rules.importFrom && rules.importTo) {
      transformers.push({
        name: 'import-transformer',
        visitor: this.createImportTransformer(rules.importFrom, rules.importTo),
      });
    }

    if (rules.rename && Object.keys(rules.rename).length > 0) {
      transformers.push({
        name: 'rename-transformer',
        visitor: this.createRenameTransformer(rules.rename),
      });
    }

    if (rules.remove && rules.remove.length > 0) {
      transformers.push({
        name: 'remove-transformer',
        visitor: this.createRemoveTransformer(rules.remove),
      });
    }

    if (rules.set && Object.keys(rules.set).length > 0) {
      transformers.push({
        name: 'set-transformer',
        visitor: this.createSetTransformer(rules.set),
      });
    }

    // Apply transformations
    return this.astService.transformAST(ast, transformers);
  }

  private createImportTransformer(fromPackage: string, toPackage: string): any {
    return {
      visitImportDeclaration: (path: any) => {
        const node = path.node;
        if (node.source.value === fromPackage) {
          node.source.value = toPackage;
        }
        return false;
      },
    };
  }

  private createRenameTransformer(renameMap: Record<string, string>): any {
    return {
      visitJSXAttribute: (path: any) => {
        const node = path.node;
        if (node.name && node.name.name in renameMap) {
          node.name.name = renameMap[node.name.name];
        }
        return false;
      },
    };
  }

  private createRemoveTransformer(propsToRemove: string[]): any {
    return {
      visitJSXOpeningElement: (path: any) => {
        const node = path.node;
        if (node.attributes) {
          node.attributes = node.attributes.filter((attr: any) => {
            return !attr.name || !propsToRemove.includes(attr.name.name);
          });
        }
        return false;
      },
    };
  }

  private createSetTransformer(propsToSet: Record<string, any>): any {
    return {
      visitJSXOpeningElement: (path: any) => {
        const node = path.node;
        if (!node.attributes) {
          node.attributes = [];
        }

        Object.entries(propsToSet).forEach(([propName, propValue]) => {
          const existingAttr = node.attributes.find((attr: any) => 
            attr.name && attr.name.name === propName
          );

          if (existingAttr) {
            existingAttr.value = this.createJSXAttributeValue(propValue);
          } else {
            node.attributes.push(this.createJSXAttribute(propName, propValue));
          }
        });

        return false;
      },
    };
  }

  private createJSXAttribute(name: string, value: any): any {
    const builders = require('ast-types').builders;
    return builders.jsxAttribute(
      builders.jsxIdentifier(name),
      this.createJSXAttributeValue(value)
    );
  }

  private createJSXAttributeValue(value: any): any {
    const builders = require('ast-types').builders;
    
    if (typeof value === 'string') {
      return builders.literal(value);
    } else if (typeof value === 'boolean') {
      return value ? null : builders.jsxExpressionContainer(builders.literal(false));
    } else if (typeof value === 'number') {
      return builders.jsxExpressionContainer(builders.literal(value));
    } else {
      return builders.jsxExpressionContainer(builders.literal(String(value)));
    }
  }

  canProcess(ast: any, context?: ASTProcessorContext): boolean {
    return Boolean(context?.rules);
  }

  getMetadata() {
    return {
      name: this.name,
      description: 'Applies migration rules to transform AST',
      version: '1.0.0',
    };
  }
}

/**
 * AST processor factory
 */
export class ASTProcessorFactory {
  private processors = new Map<string, () => IASTProcessor>();

  constructor(private container: IServiceContainer) {
    this.registerBuiltInProcessors();
  }

  /**
   * Register built-in processors
   */
  private registerBuiltInProcessors(): void {
    this.register('import', () => new ImportProcessor(
      this.container.resolve(SERVICE_TOKENS.ASTService),
      this.container.resolve(SERVICE_TOKENS.LoggerService)
    ));

    this.register('jsx', () => new JSXProcessor(
      this.container.resolve(SERVICE_TOKENS.ASTService),
      this.container.resolve(SERVICE_TOKENS.LoggerService)
    ));

    this.register('migration', () => new MigrationProcessor(
      this.container.resolve(SERVICE_TOKENS.ASTService),
      this.container.resolve(SERVICE_TOKENS.LoggerService)
    ));
  }

  /**
   * Register a new processor
   */
  register(name: string, factory: () => IASTProcessor): void {
    this.processors.set(name, factory);
  }

  /**
   * Create a processor by name
   */
  create(name: string): IASTProcessor {
    const factory = this.processors.get(name);
    if (!factory) {
      throw new Error(`Unknown processor: ${name}`);
    }
    return factory();
  }

  /**
   * Create multiple processors
   */
  createMultiple(names: string[]): IASTProcessor[] {
    return names.map(name => this.create(name));
  }

  /**
   * Get all available processor names
   */
  getAvailableProcessors(): string[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Find suitable processors for an AST
   */
  findSuitableProcessors(ast: any, context?: ASTProcessorContext): IASTProcessor[] {
    const suitable: IASTProcessor[] = [];
    
    for (const [name, factory] of this.processors) {
      try {
        const processor = factory();
        if (processor.canProcess(ast, context)) {
          suitable.push(processor);
        }
      } catch (error) {
        const loggerService = this.container.tryResolve(SERVICE_TOKENS.LoggerService);
        loggerService?.warn(`Failed to check processor ${name}:`, error);
      }
    }

    return suitable;
  }

  /**
   * Process AST with multiple processors in sequence
   */
  async processSequentially(
    ast: any,
    processorNames: string[],
    context?: ASTProcessorContext
  ): Promise<any[]> {
    const results: any[] = [];
    let currentAST = ast;

    for (const processorName of processorNames) {
      try {
        const processor = this.create(processorName);
        const result = await processor.process(currentAST, context);
        results.push(result);
        
        // If processor returns a transformed AST, use it for the next processor
        if (result && typeof result === 'object' && result.type) {
          currentAST = result;
        }
      } catch (error) {
        const loggerService = this.container.tryResolve(SERVICE_TOKENS.LoggerService);
        loggerService?.error(`Processor ${processorName} failed:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Process AST with multiple processors in parallel
   */
  async processParallel(
    ast: any,
    processorNames: string[],
    context?: ASTProcessorContext
  ): Promise<Array<{ processor: string; result: any; error?: Error }>> {
    const processors = processorNames.map(name => ({ name, processor: this.create(name) }));
    
    const results = await Promise.allSettled(
      processors.map(async ({ name, processor }) => ({
        processor: name,
        result: await processor.process(ast, context),
      }))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          processor: processors[index].name,
          result: null,
          error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        };
      }
    });
  }

  /**
   * Auto-process AST with all suitable processors
   */
  async autoProcess(ast: any, context?: ASTProcessorContext): Promise<{
    processors: string[];
    results: any[];
    errors: Array<{ processor: string; error: Error }>;
  }> {
    const suitableProcessors = this.findSuitableProcessors(ast, context);
    const processorNames = suitableProcessors.map(p => p.name);
    
    try {
      const results = await this.processSequentially(ast, processorNames, context);
      return {
        processors: processorNames,
        results,
        errors: [],
      };
    } catch (error) {
      return {
        processors: processorNames,
        results: [],
        errors: [{
          processor: 'auto-process',
          error: error instanceof Error ? error : new Error(String(error)),
        }],
      };
    }
  }

  /**
   * Get processor metadata
   */
  getProcessorMetadata(name: string): { name: string; description: string; version: string } | null {
    try {
      const processor = this.create(name);
      return processor.getMetadata();
    } catch {
      return null;
    }
  }

  /**
   * Get metadata for all processors
   */
  getAllProcessorMetadata(): Array<{ name: string; description: string; version: string }> {
    return this.getAvailableProcessors()
      .map(name => this.getProcessorMetadata(name))
      .filter((metadata): metadata is { name: string; description: string; version: string } => 
        metadata !== null
      );
  }
}

/**
 * Create AST processor factory
 */
export function createASTProcessorFactory(container: IServiceContainer): ASTProcessorFactory {
  return new ASTProcessorFactory(container);
}

/**
 * Processor pipeline for complex AST transformations
 */
export class ProcessorPipeline {
  private steps: Array<{
    name: string;
    processor: string;
    context?: Partial<ASTProcessorContext>;
  }> = [];

  constructor(private factory: ASTProcessorFactory) {}

  /**
   * Add a processing step
   */
  addStep(
    name: string,
    processor: string,
    context?: Partial<ASTProcessorContext>
  ): ProcessorPipeline {
    this.steps.push({ name, processor, context });
    return this;
  }

  /**
   * Execute the pipeline
   */
  async execute(
    ast: any,
    baseContext?: ASTProcessorContext
  ): Promise<{
    finalResult: any;
    stepResults: Array<{ step: string; result: any; error?: Error }>;
  }> {
    const stepResults: Array<{ step: string; result: any; error?: Error }> = [];
    let currentResult = ast;

    for (const step of this.steps) {
      try {
        const processor = this.factory.create(step.processor);
        const context = { ...baseContext, ...step.context };
        
        const result = await processor.process(currentResult, context);
        stepResults.push({ step: step.name, result });
        
        // Update current result for next step
        if (result && typeof result === 'object' && result.type) {
          currentResult = result;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        stepResults.push({ step: step.name, result: null, error: err });
        throw err; // Stop pipeline on error
      }
    }

    return {
      finalResult: currentResult,
      stepResults,
    };
  }

  /**
   * Get pipeline steps
   */
  getSteps(): Array<{ name: string; processor: string; context?: Partial<ASTProcessorContext> }> {
    return [...this.steps];
  }

  /**
   * Clear pipeline steps
   */
  clear(): ProcessorPipeline {
    this.steps = [];
    return this;
  }
}
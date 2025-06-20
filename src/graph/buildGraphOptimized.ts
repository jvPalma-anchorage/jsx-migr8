import {
  getFileAstAndCode,
  getFileAstAndCodeAsync,
  getConcurrencyLimit,
} from "@/utils/fs-utils";
import { getCompName } from "@/utils/pathUtils";
import { builders as b, visit } from "ast-types";
import fg from "fast-glob";
import { ProjectGraph } from "./types";
import { types as T } from "recast";
import { getNameFromSpecifier, getSpecifierLocalName } from "@/types/ast";
import { getLoggers } from "@/utils/logger";
import { 
  validateRootPath, 
  validateBlacklist, 
  validateFileSystemPermissions,
  formatPathError,
  PathValidationError
} from "@/utils/path-validation";
import chalk from "chalk";

// Ultra-aggressive file filtering for large codebases
const shouldProcessFile = (filePath: string): boolean => {
  const fileName = filePath.toLowerCase();
  
  // Skip test files completely
  if (fileName.includes('.test.') || fileName.includes('.spec.') || 
      fileName.includes('__tests__') || fileName.includes('__mocks__')) {
    return false;
  }
  
  // Skip config files
  if (fileName.includes('config') || fileName.includes('.config.') ||
      fileName.includes('webpack') || fileName.includes('babel') ||
      fileName.includes('eslint') || fileName.includes('prettier')) {
    return false;
  }
  
  // Skip documentation
  if (fileName.includes('.md') || fileName.includes('.mdx')) {
    return false;
  }
  
  // Skip stories and examples
  if (fileName.includes('.stories.') || fileName.includes('.story.') ||
      fileName.includes('stories/') || fileName.includes('examples/')) {
    return false;
  }
  
  // Only process files that likely contain JSX/components
  if (!fileName.includes('component') && !fileName.includes('page') && 
      !fileName.includes('view') && !fileName.includes('screen') &&
      !fileName.includes('container') && !fileName.includes('layout') &&
      !fileName.includes('form') && !fileName.includes('modal') &&
      !fileName.includes('button') && !fileName.includes('input') &&
      !fileName.includes('card') && !fileName.includes('header') &&
      !fileName.includes('footer') && !fileName.includes('nav') &&
      !fileName.includes('menu') && !fileName.includes('list') &&
      !fileName.includes('item') && !fileName.includes('dialog') &&
      !fileName.includes('panel') && !fileName.includes('widget')) {
    
    // If it doesn't match common component patterns, check for JSX indicators
    try {
      const fs = require('fs');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Quick check for JSX without parsing
      if (!content.includes('<') || !content.includes('jsx') && !content.includes('tsx')) {
        return false;
      }
      
      // If file is too large, skip it
      if (content.length > 100000) { // 100KB limit
        return false;
      }
    } catch {
      return false;
    }
  }
  
  return true;
};

// Lightning-fast graph builder for massive codebases
export const buildGraphOptimized = (root: string, blacklist: string[]): ProjectGraph => {
  const startTime = Date.now();
  const { lInfo, lWarning, lError } = getLoggers();
  lInfo("🚀 Starting optimized graph building for large codebase...");

  // Validate root path first
  try {
    console.info(chalk.blue('🔍 Validating root path for optimized build...'));
    
    const rootValidation = validateRootPath(root);
    if (!rootValidation.valid) {
      console.error(formatPathError(rootValidation.error!));
      throw new Error(`Root path validation failed: ${rootValidation.error!.message}`);
    }
    
    // Use the validated resolved path
    root = rootValidation.resolvedPath!;
    
    // Check file system permissions
    const permissions = validateFileSystemPermissions(root);
    if (!permissions.canRead) {
      console.error(chalk.red('❌ No read permission for root directory'));
      permissions.suggestions.forEach(suggestion => {
        console.error(chalk.gray(`   • ${suggestion}`));
      });
      throw new Error('Insufficient permissions to scan root directory');
    }
    
    console.info(chalk.green(`✅ Root path validated for optimized build: ${root}`));
  } catch (error) {
    if (error instanceof PathValidationError) {
      throw error;
    }
    throw new Error(`Path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Validate blacklist
  try {
    console.info(chalk.blue('🚫 Validating blacklist for optimized build...'));
    
    const blacklistValidation = validateBlacklist(blacklist, root);
    if (!blacklistValidation.valid) {
      console.warn(chalk.yellow('⚠️ Some blacklist entries are invalid:'));
      blacklistValidation.invalidEntries.forEach(invalid => {
        console.warn(chalk.gray(`   • "${invalid.entry}": ${invalid.reason}`));
      });
      
      // Use only valid entries
      blacklist = blacklistValidation.validEntries;
      console.info(chalk.yellow(`Using ${blacklist.length} valid blacklist entries`));
    }
    
    console.info(chalk.green(`✅ Blacklist validated (${blacklist.length} entries)`));
  } catch (error) {
    console.warn(chalk.yellow(`⚠️ Blacklist validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    console.warn(chalk.yellow('Proceeding with provided blacklist...'));
  }

  // Enhanced blacklist for large projects
  const enhancedBlacklist = [
    ...blacklist,
    '**/coverage/**',
    '**/docs/**',
    '**/documentation/**',
    '**/.cache/**',
    '**/.tmp/**',
    '**/tmp/**',
    '**/temp/**',
    '**/.git/**',
    '**/logs/**',
    '**/*.log',
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/.vscode/**',
    '**/.idea/**',
    '**/cypress/**',
    '**/e2e/**',
    '**/playwright/**',
    '**/screenshots/**',
    '**/snapshots/**',
    '**/.storybook/**',
    '**/storybook-static/**'
  ];

  // Get all potential files first
  const allFiles = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
    cwd: root,
    absolute: true,
    ignore: enhancedBlacklist.map((b) => b.startsWith('**/') ? b : `**/${b}/**`),
  });

  lInfo(`📁 Found ${allFiles.length} potential files`);

  // Ultra-aggressive filtering
  const files = allFiles.filter(shouldProcessFile);
  
  lInfo(`🔍 Filtered down to ${files.length} files (${((files.length / allFiles.length) * 100).toFixed(1)}% of original)`);

  const graph: ProjectGraph = { imports: [], jsx: [] };
  let processedCount = 0;
  let errorCount = 0;

  // Process in chunks of 100 with progress reporting
  const chunkSize = 100;
  const totalChunks = Math.ceil(files.length / chunkSize);

  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    const chunkNum = Math.floor(i / chunkSize) + 1;
    
    lInfo(`📦 Processing chunk ${chunkNum}/${totalChunks} (${chunk.length} files)`);

    for (const abs of chunk) {
      try {
        // Quick memory check - if we're using too much memory, skip detailed parsing
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > 800 * 1024 * 1024) { // 800MB limit
          lWarning(`⚠️  Memory usage high (${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB), skipping detailed parsing for ${abs}`);
          continue;
        }

        const [ast, code] = getFileAstAndCode(abs);

        // Super-fast import collection (minimal data storage)
        visit(ast, {
          visitImportDeclaration(p) {
            try {
              const node = p.node;
              const pkg = node.source.value as string;

              // Only store imports from external packages (not relative imports)
              if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
                node.specifiers?.forEach((spec) => {
                  try {
                    const imported = getNameFromSpecifier(spec);
                    const local = getSpecifierLocalName(spec);

                    graph.imports.push({
                      pkg,
                      file: abs,
                      imported,
                      importedType: spec.type,
                      local,
                      node: p,
                    });
                  } catch (error) {
                    // Skip invalid specifiers silently for speed
                  }
                });
              }
            } catch (error) {
              // Skip files with import errors for speed
            }
            return false;
          },
        });

        // Super-fast JSX collection (only external components)
        visit(ast, {
          visitJSXElement(p) {
            try {
              const openingElement = p.node.openingElement;
              if (openingElement.name.type !== "JSXIdentifier") return false;

              const localName = openingElement.name.name;

              // Only process components that start with uppercase (likely external)
              if (localName[0] !== localName[0].toUpperCase()) {
                return this.traverse(p);
              }

              const importRef = graph.imports.find(
                (i) => i.file === abs && i.local === localName,
              );
              
              if (!importRef) return this.traverse(p);

              // Minimal prop collection for speed
              const props: Record<string, any> = {};
              let propCount = 0;
              
              openingElement.attributes?.forEach((attr) => {
                if (attr.type === "JSXAttribute" && attr.name && propCount < 10) {
                  // Limit to 10 props max for speed
                  props[attr.name.name as string] = attr.value
                    ? attr.value.type === "JSXExpressionContainer"
                      ? attr.value.expression
                      : attr.value
                    : b.booleanLiteral(true);
                  propCount++;
                }
              });

              graph.jsx.push({
                file: abs,
                importRef,
                componentName: getCompName(
                  importRef.local,
                  importRef.imported,
                  importRef.importedType,
                ),
                opener: p,
                props,
              });
            } catch (error) {
              // Skip JSX errors for speed
            }
            return this.traverse(p);
          },
        });

        processedCount++;
        
        // Progress reporting every 50 files
        if (processedCount % 50 === 0) {
          const progress = ((processedCount / files.length) * 100).toFixed(1);
          const memUsage = process.memoryUsage();
          lInfo(`⚡ Progress: ${progress}% (${processedCount}/${files.length}) - Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
        }

      } catch (error) {
        errorCount++;
        if (errorCount < 10) { // Only log first 10 errors
          lWarning(`❌ Error processing ${abs}:`, error);
        }
      }
    }

    // Trigger garbage collection between chunks
    if (global.gc) {
      global.gc();
    }
  }

  const duration = Date.now() - startTime;
  
  lInfo(`✅ Graph building completed in ${(duration / 1000).toFixed(1)}s`);
  lInfo(`📊 Processed ${processedCount}/${files.length} files (${errorCount} errors)`);
  lInfo(`📈 Found ${graph.imports.length} imports and ${graph.jsx.length} JSX elements`);
  
  return graph;
};
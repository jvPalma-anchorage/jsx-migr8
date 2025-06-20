#!/usr/bin/env tsx

import { getFileAstAndCode } from './src/utils/fs-utils';
import { getSpecifierLocalName, getNameFromSpecifier } from './src/types/ast';
import { getCompName } from './src/utils/pathUtils';
import { builders as b, visit } from "ast-types";
import fg from "fast-glob";
import { ProjectGraph } from './src/graph/types';

// Simple version of buildGraph to debug component name issue
function simpleBuildGraph(root: string): ProjectGraph {
  const blacklist = ['node_modules', '.git', 'dist', 'build', 'out', '.cache'];
  
  const files = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
    cwd: root,
    absolute: true,
    ignore: blacklist.map((b) => `**/${b}/**`),
  });

  console.log(`Found ${files.length} files to analyze`);
  
  const graph: ProjectGraph = { imports: [], jsx: [] };
  
  // Only process first few files for debugging
  for (const abs of files.slice(0, 10)) {
    console.log(`\nProcessing: ${abs}`);
    
    try {
      const [ast, code] = getFileAstAndCode(abs);

      // Pass 1 - collect imports
      visit(ast, {
        visitImportDeclaration(p) {
          try {
            const node = p.node;
            const pkg = node.source.value as string;

            node.specifiers?.forEach((spec) => {
              let imported: string;
              let local: string;
              
              try {
                imported = getNameFromSpecifier(spec);
                local = getSpecifierLocalName(spec);
                
                console.log(`  Import: ${pkg} -> imported: "${imported}", local: "${local}", type: ${spec.type}`);
                
                graph.imports.push({
                  pkg,
                  file: abs,
                  imported,
                  importedType: spec.type,
                  local,
                  node: p,
                });
              } catch (error) {
                console.warn(`    Error processing import specifier:`, error);
              }
            });
          } catch (error) {
            console.warn(`  Error processing import:`, error);
          }
          return false;
        },
      });

      // Pass 2 - collect JSX elements
      visit(ast, {
        visitJSXElement(p) {
          try {
            const openingElement = p.node.openingElement;
            if (openingElement.name.type !== "JSXIdentifier") {
              console.log(`  Skipping non-JSXIdentifier: ${openingElement.name.type}`);
              return false;
            }

            const localName = openingElement.name.name;
            console.log(`  JSX Element: localName = "${localName}"`);

            const importRef = graph.imports.find(
              (i) => i.file === abs && i.local === localName,
            );
            
            if (!importRef) {
              console.log(`    No import found for "${localName}"`);
              return this.traverse(p);
            }

            console.log(`    Found import: ${importRef.pkg} -> imported: "${importRef.imported}", local: "${importRef.local}"`);

            const componentName = getCompName(
              importRef.local,
              importRef.imported,
              importRef.importedType,
            );
            
            console.log(`    Generated componentName: "${componentName}"`);

            const props: Record<string, any> = {};
            openingElement.attributes?.forEach((attr) => {
              if (attr.type !== "JSXAttribute" || !attr.name) return;
              props[attr.name.name as string] = attr.value
                ? attr.value.type === "JSXExpressionContainer"
                  ? attr.value.expression
                  : attr.value
                : b.booleanLiteral(true);
            });

            graph.jsx.push({
              file: abs,
              importRef,
              componentName,
              opener: p,
              props,
            });
            
            console.log(`    Added JSX element with componentName: "${componentName}"`);
          } catch (error) {
            console.warn(`  Error processing JSX element:`, error);
          }
          return false;
        },
      });
    } catch (error) {
      console.warn(`Failed to process file ${abs}:`, error);
    }
  }

  return graph;
}

async function debugSimple() {
  try {
    console.log('Starting simple graph debug...');
    
    const rootPath = './src/__tests__/integration/__fixtures__/edge-cases';
    console.log(`Root path: ${rootPath}`);
    
    const graph = simpleBuildGraph(rootPath);
    
    console.log('\n=== FINAL RESULTS ===');
    console.log(`Found ${graph.imports.length} imports`);
    console.log(`Found ${graph.jsx.length} JSX elements`);
    
    // Check for empty component names
    const emptyComponents = graph.jsx.filter(jsx => !jsx.componentName || jsx.componentName.trim() === '');
    console.log(`\nEmpty component names: ${emptyComponents.length}`);
    
    // Show all JSX components with names
    console.log('\n=== ALL JSX COMPONENTS ===');
    graph.jsx.forEach((jsx, idx) => {
      console.log(`${idx + 1}. "${jsx.componentName}" from ${jsx.importRef.pkg} (${jsx.importRef.importedType})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugSimple();
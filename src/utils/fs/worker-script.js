/**
 * Worker script for handling CPU-intensive tasks
 * This runs in a separate thread to avoid blocking the main thread
 */

const { parentPort, workerData } = require("node:worker_threads");
const { parse } = require("recast");
const { readFileSync } = require("node:fs");

// Task handlers
const taskHandlers = {
  "parse-ast": handleParseAst,
  "analyze-imports": handleAnalyzeImports,
  "process-jsx": handleProcessJsx,
  "validate-syntax": handleValidateSyntax,
};

// Main message handler
if (parentPort) {
  parentPort.on("message", async (message) => {
    try {
      const { type, taskId, taskType, data } = message;
      
      if (type === "task" && taskType && taskHandlers[taskType]) {
        const result = await taskHandlers[taskType](data);
        
        parentPort.postMessage({
          type: "result",
          taskId,
          data: result,
        });
      } else if (type === "ping") {
        parentPort.postMessage({ type: "pong" });
      }
    } catch (error) {
      parentPort.postMessage({
        type: "error",
        taskId: message.taskId,
        error: error.message,
      });
    }
  });
}

/**
 * Parse AST from file content
 */
async function handleParseAst({ filePath, content }) {
  try {
    let sourceCode = content;
    
    // Read file if content not provided
    if (!sourceCode && filePath) {
      sourceCode = readFileSync(filePath, "utf8");
    }
    
    if (!sourceCode) {
      throw new Error("No source code provided");
    }

    const ast = parse(sourceCode, {
      parser: {
        parse: (source) => {
          // Use different parsers based on file extension
          if (filePath?.endsWith(".ts") || filePath?.endsWith(".tsx")) {
            return require("@babel/parser").parse(source, {
              sourceType: "module",
              allowImportExportEverywhere: true,
              allowReturnOutsideFunction: true,
              plugins: [
                "jsx",
                "typescript",
                "decorators-legacy",
                "classProperties",
                "objectRestSpread",
                "functionBind",
                "exportDefaultFrom",
                "exportNamespaceFrom",
                "dynamicImport",
                "nullishCoalescingOperator",
                "optionalChaining",
              ],
            });
          } else {
            return require("@babel/parser").parse(source, {
              sourceType: "module",
              allowImportExportEverywhere: true,
              allowReturnOutsideFunction: true,
              plugins: [
                "jsx",
                "decorators-legacy",
                "classProperties",
                "objectRestSpread",
                "functionBind",
                "exportDefaultFrom",
                "exportNamespaceFrom",
                "dynamicImport",
                "nullishCoalescingOperator",
                "optionalChaining",
              ],
            });
          }
        },
      },
    });

    return {
      ast: ast,
      content: sourceCode,
      filePath: filePath,
      success: true,
    };
  } catch (error) {
    return {
      ast: null,
      content: content || "",
      filePath: filePath,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Analyze imports in AST
 */
async function handleAnalyzeImports({ ast, filePath }) {
  const imports = [];
  
  try {
    const { visit } = require("ast-types");
    
    visit(ast, {
      visitImportDeclaration(path) {
        const node = path.node;
        const packageName = node.source.value;
        
        if (node.specifiers) {
          node.specifiers.forEach(spec => {
            let importedName;
            let localName;
            let importType;
            
            if (spec.type === "ImportDefaultSpecifier") {
              importedName = "default";
              localName = spec.local.name;
              importType = "default";
            } else if (spec.type === "ImportSpecifier") {
              importedName = spec.imported.name;
              localName = spec.local.name;
              importType = "named";
            } else if (spec.type === "ImportNamespaceSpecifier") {
              importedName = "*";
              localName = spec.local.name;
              importType = "namespace";
            }
            
            imports.push({
              packageName,
              importedName,
              localName,
              importType,
              filePath,
            });
          });
        }
        
        return false;
      },
    });
    
    return { imports, success: true };
  } catch (error) {
    return { imports: [], success: false, error: error.message };
  }
}

/**
 * Process JSX elements in AST
 */
async function handleProcessJsx({ ast, filePath, imports }) {
  const jsxElements = [];
  
  try {
    const { visit } = require("ast-types");
    
    visit(ast, {
      visitJSXElement(path) {
        const node = path.node;
        const openingElement = node.openingElement;
        
        if (openingElement.name.type === "JSXIdentifier") {
          const localName = openingElement.name.name;
          
          // Find corresponding import
          const importRef = imports.find(imp => imp.localName === localName);
          
          if (importRef) {
            const props = {};
            
            // Extract props
            if (openingElement.attributes) {
              openingElement.attributes.forEach(attr => {
                if (attr.type === "JSXAttribute" && attr.name) {
                  const propName = attr.name.name;
                  let propValue = null;
                  
                  if (attr.value) {
                    if (attr.value.type === "Literal") {
                      propValue = attr.value.value;
                    } else if (attr.value.type === "JSXExpressionContainer") {
                      // For expression containers, we'll store the type
                      propValue = { type: attr.value.expression.type };
                    }
                  } else {
                    propValue = true; // Boolean attribute
                  }
                  
                  props[propName] = propValue;
                }
              });
            }
            
            jsxElements.push({
              localName,
              importRef,
              props,
              filePath,
              line: openingElement.loc?.start?.line,
              column: openingElement.loc?.start?.column,
            });
          }
        }
        
        return false;
      },
    });
    
    return { jsxElements, success: true };
  } catch (error) {
    return { jsxElements: [], success: false, error: error.message };
  }
}

/**
 * Validate syntax of code
 */
async function handleValidateSyntax({ content, filePath }) {
  try {
    // Try to parse the content
    const ast = parse(content, {
      parser: {
        parse: (source) => {
          if (filePath?.endsWith(".ts") || filePath?.endsWith(".tsx")) {
            return require("@babel/parser").parse(source, {
              sourceType: "module",
              allowImportExportEverywhere: true,
              allowReturnOutsideFunction: true,
              plugins: [
                "jsx",
                "typescript",
                "decorators-legacy",
                "classProperties",
                "objectRestSpread",
                "functionBind",
                "exportDefaultFrom",
                "exportNamespaceFrom",
                "dynamicImport",
                "nullishCoalescingOperator",
                "optionalChaining",
              ],
            });
          } else {
            return require("@babel/parser").parse(source, {
              sourceType: "module",
              allowImportExportEverywhere: true,
              allowReturnOutsideFunction: true,
              plugins: [
                "jsx",
                "decorators-legacy",
                "classProperties",
                "objectRestSpread",
                "functionBind",
                "exportDefaultFrom",
                "exportNamespaceFrom",
                "dynamicImport",
                "nullishCoalescingOperator",
                "optionalChaining",
              ],
            });
          }
        },
      },
    });
    
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error.message],
      warnings: [],
    };
  }
}
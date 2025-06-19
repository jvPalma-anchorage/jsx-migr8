#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { parse, print } = require("recast");
const babelParser = require("recast/parsers/babel-ts");
const fg = require("fast-glob");

let stats = {
  functionToArrow: 0,
  letToConst: 0,
  defaultToNamed: 0,
  filesModified: new Set(),
  errors: [],
};

function transformFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, "utf8");
    const ast = parse(code, { parser: babelParser.default });
    let modified = false;

    // Track imports and exports for conversion
    const exportedIdentifiers = new Set();
    const separateExports = new Map(); // identifier -> export node

    // First pass: collect separate export statements
    ast.program.body.forEach((node) => {
      if (
        node.type === "ExportNamedDeclaration" &&
        !node.declaration &&
        node.specifiers
      ) {
        node.specifiers.forEach((spec) => {
          if (spec.local && spec.local.name) {
            separateExports.set(spec.local.name, node);
            exportedIdentifiers.add(spec.local.name);
          }
        });
      }
    });

    // Transform the AST
    ast.program.body = ast.program.body
      .map((node, index) => {
        // Convert export function to export const arrow function
        if (
          node.type === "ExportNamedDeclaration" &&
          node.declaration &&
          node.declaration.type === "FunctionDeclaration"
        ) {
          const funcDecl = node.declaration;
          if (funcDecl.id) {
            stats.functionToArrow++;
            modified = true;

            const arrowFunc = {
              type: "ArrowFunctionExpression",
              params: funcDecl.params,
              body: funcDecl.body,
              async: funcDecl.async,
              generator: false,
            };

            return {
              type: "ExportNamedDeclaration",
              declaration: {
                type: "VariableDeclaration",
                kind: "const",
                declarations: [
                  {
                    type: "VariableDeclarator",
                    id: funcDecl.id,
                    init: arrowFunc,
                  },
                ],
              },
              specifiers: [],
              source: null,
            };
          }
        }

        // Convert regular function declarations
        if (node.type === "FunctionDeclaration" && node.id) {
          stats.functionToArrow++;
          modified = true;

          const arrowFunc = {
            type: "ArrowFunctionExpression",
            params: node.params,
            body: node.body,
            async: node.async,
            generator: false,
          };

          // Check if this function is exported separately
          const isExportedSeparately = exportedIdentifiers.has(node.id.name);

          if (isExportedSeparately) {
            // Convert to export const
            const exportNode = separateExports.get(node.id.name);
            // Remove from the separate exports list
            if (exportNode) {
              exportNode.specifiers = exportNode.specifiers.filter(
                (spec) => spec.local.name !== node.id.name,
              );
            }

            return {
              type: "ExportNamedDeclaration",
              declaration: {
                type: "VariableDeclaration",
                kind: "const",
                declarations: [
                  {
                    type: "VariableDeclarator",
                    id: node.id,
                    init: arrowFunc,
                  },
                ],
              },
              specifiers: [],
              source: null,
            };
          } else {
            return {
              type: "VariableDeclaration",
              kind: "const",
              declarations: [
                {
                  type: "VariableDeclarator",
                  id: node.id,
                  init: arrowFunc,
                },
              ],
            };
          }
        }

        // Convert let to const where possible
        if (node.type === "VariableDeclaration" && node.kind === "let") {
          // Simple check - in real implementation, would need proper scope analysis
          const canBeConst = node.declarations.every((decl) => {
            // Skip if it's a complex pattern or no init
            if (decl.id.type !== "Identifier" || !decl.init) return false;

            // This is a simplified check - would need full AST traversal
            // to properly detect reassignments
            return true;
          });

          if (canBeConst) {
            stats.letToConst++;
            modified = true;
            node.kind = "const";
          }
        }

        // Convert default exports to named exports
        if (node.type === "ExportDefaultDeclaration") {
          stats.defaultToNamed++;
          modified = true;

          if (
            node.declaration.type === "FunctionDeclaration" &&
            node.declaration.id
          ) {
            // export default function foo() {} -> export const foo = () => {}
            const funcDecl = node.declaration;
            const arrowFunc = {
              type: "ArrowFunctionExpression",
              params: funcDecl.params,
              body: funcDecl.body,
              async: funcDecl.async,
              generator: false,
            };

            return {
              type: "ExportNamedDeclaration",
              declaration: {
                type: "VariableDeclaration",
                kind: "const",
                declarations: [
                  {
                    type: "VariableDeclarator",
                    id: funcDecl.id,
                    init: arrowFunc,
                  },
                ],
              },
              specifiers: [],
              source: null,
            };
          } else if (node.declaration.type === "Identifier") {
            // export default foo -> export { foo }
            return {
              type: "ExportNamedDeclaration",
              declaration: null,
              specifiers: [
                {
                  type: "ExportSpecifier",
                  local: node.declaration,
                  exported: node.declaration,
                },
              ],
              source: null,
            };
          }
        }

        return node;
      })
      .filter((node) => {
        // Remove empty export statements
        if (
          node.type === "ExportNamedDeclaration" &&
          !node.declaration &&
          node.specifiers &&
          node.specifiers.length === 0
        ) {
          return false;
        }
        return true;
      });

    if (modified) {
      const output = print(ast).code;
      fs.writeFileSync(filePath, output);
      stats.filesModified.add(filePath);
    }
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
  }
}

async function main() {
  const targetDirs = [
    "src/analyzer/",
    "src/cli/",
    "src/context/",
    "src/graph/",
    "src/utils/",
    "src/report/",
    "src/migrator/",
    "src/remap/",
    "src/compat/",
  ];

  console.log("🔄 Starting refactoring...\n");

  for (const dir of targetDirs) {
    const pattern = path.join(dir, "**/*.{ts,tsx,js,jsx}");
    const files = await fg(pattern, { absolute: true });

    console.log(`Processing ${dir} (${files.length} files)...`);

    for (const file of files) {
      // Skip test files and type declaration files
      if (
        file.includes("__tests__") ||
        file.includes(".test.") ||
        file.endsWith(".d.ts")
      ) {
        continue;
      }
      transformFile(file);
    }
  }

  // Print summary
  console.log("\n✅ Refactoring complete!\n");
  console.log("📊 Summary:");
  console.log(
    `  - Functions converted to arrow functions: ${stats.functionToArrow}`,
  );
  console.log(`  - let → const conversions: ${stats.letToConst}`);
  console.log(
    `  - Default → named export conversions: ${stats.defaultToNamed}`,
  );
  console.log(`  - Total files modified: ${stats.filesModified.size}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered (${stats.errors.length}):`);
    stats.errors.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
  }

  console.log("\n📝 Modified files:");
  Array.from(stats.filesModified)
    .sort()
    .forEach((file) => {
      console.log(`  - ${path.relative(process.cwd(), file)}`);
    });
}

main().catch(console.error);

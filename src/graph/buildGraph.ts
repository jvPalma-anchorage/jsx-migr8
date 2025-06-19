import {
  getFileAstAndCode,
  getFileAstAndCodeAsync,
  AsyncFileUtils,
  FileOperationError,
  getConcurrencyLimit,
} from "@/utils/fs-utils";
import { getCompName } from "@/utils/pathUtils";
import { builders as b, visit } from "ast-types";
import fg from "fast-glob";
import { ProjectGraph } from "./types";
import { types as T } from "recast";

export const buildGraph = (root: string, blacklist: string[]): ProjectGraph => {
  const files = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
    cwd: root,
    absolute: true,
    ignore: blacklist.map((b) => `**/${b}/**`),
  });

  const graph: ProjectGraph = { imports: [], jsx: [] };

  for (const abs of files) {
    const [ast, code] = getFileAstAndCode(abs);

    /* Pass 1 – collect imports */
    visit(ast, {
      visitImportDeclaration(p) {
        const node = p.node;
        const pkg = node.source.value as string;

        node.specifiers?.forEach((spec) => {
          const imported =
            spec.type === "ImportSpecifier"
              ? (spec.imported as any).name
              : spec.type === "ImportDefaultSpecifier"
                ? "default"
                : spec.type === "ImportNamespaceSpecifier"
                  ? (spec.local?.loc as any)?.identifierName || "namespaced"
                  : "UNKNOWN";

          if (imported === "UNKNOWN") {
            console.warn(
              `Unhandled import type: ${(spec as any).type} ---`,
              spec,
            );
          }

          const local = (spec.local as any).name;

          graph.imports.push({
            pkg,
            file: abs,
            imported,
            importedType: spec.type,
            local,
            node: p, // keep reference
          });
        });

        return false;
      },
    });

    /* Pass 2 – collect JSX tied to those imports */
    visit(ast, {
      visitJSXElement(p) {
        const openingElement = p.node.openingElement;
        if (openingElement.name.type !== "JSXIdentifier") return false;

        const localName = openingElement.name.name;

        const importRef = graph.imports.find(
          (i) => i.file === abs && i.local === localName,
        );
        if (!importRef) return this.traverse(p); // unrelated component

        const props: Record<string, any> = {};

        openingElement.attributes?.forEach((attr) => {
          if (attr.type !== "JSXAttribute" || !attr.name) return;
          props[attr.name.name as string] = attr.value
            ? attr.value.type === "JSXExpressionContainer"
              ? attr.value.expression // real AST node
              : attr.value
            : b.booleanLiteral(true); // <Comp flag />
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

        return false;
      },
    });
  }

  return graph;
};

/**
 * Process AST for imports and JSX usage
 */
const processFileAst = (
  ast: T.ASTNode,
  filePath: string,
  graph: ProjectGraph,
): void => {
  /* Pass 1 – collect imports */
  visit(ast, {
    visitImportDeclaration(p) {
      const node = p.node;
      const pkg = node.source.value as string;

      node.specifiers?.forEach((spec) => {
        let imported = "";

        if (spec.type === "ImportSpecifier") {
          imported = (spec.imported as any).name;
        } else if (spec.type === "ImportDefaultSpecifier") {
          imported = "default";
        } else if (spec.type === "ImportNamespaceSpecifier") {
          imported = (spec.local?.loc as any)?.identifierName || "namespaced";
        } else {
          imported = "UNKNOWN";
          console.warn(
            `Unhandled import type: ${(spec as any).type} ---`,
            spec,
          );
        }

        const local = (spec.local as any).name;

        graph.imports.push({
          pkg,
          file: filePath,
          imported,
          importedType: spec.type,
          local,
          node: p, // keep reference
        });
      });

      return false;
    },
  });

  /* Pass 2 – collect JSX tied to those imports */
  visit(ast, {
    visitJSXElement(p) {
      const openingElement = p.node.openingElement;
      if (openingElement.name.type !== "JSXIdentifier") return false;

      const localName = openingElement.name.name;

      const importRef = graph.imports.find(
        (i) => i.file === filePath && i.local === localName,
      );
      if (!importRef) return this.traverse(p); // unrelated component

      const props: Record<string, any> = {};

      openingElement.attributes?.forEach((attr) => {
        if (attr.type !== "JSXAttribute" || !attr.name) return;
        props[attr.name.name as string] = attr.value
          ? attr.value.type === "JSXExpressionContainer"
            ? attr.value.expression // real AST node
            : attr.value
          : b.booleanLiteral(true); // <Comp flag />
      });

      graph.jsx.push({
        file: filePath,
        importRef,
        componentName: getCompName(
          importRef.local,
          importRef.imported,
          importRef.importedType,
        ),
        opener: p,
        props,
      });

      return false;
    },
  });
};

/**
 * Async version of buildGraph with concurrent file processing and comprehensive error handling
 */
export const buildGraphAsync = async (
  root: string,
  blacklist: string[],
  options: {
    concurrency?: number;
    onProgress?: (
      completed: number,
      total: number,
      currentFile?: string,
    ) => void;
    onError?: (error: FileOperationError) => void;
  } = {},
): Promise<{ graph: ProjectGraph; errors: FileOperationError[] }> => {
  const files = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
    cwd: root,
    absolute: true,
    ignore: blacklist.map((b) => `**/${b}/**`),
  });

  const graph: ProjectGraph = { imports: [], jsx: [] };
  const errors: FileOperationError[] = [];
  const concurrency = options.concurrency ?? getConcurrencyLimit();

  options.onProgress?.(0, files.length);

  // Use AsyncFileUtils for concurrent file processing
  const fileUtils = new AsyncFileUtils(concurrency);

  const completedState = { value: 0 };
  const progressCallback = (currentCompleted: number, total: number) => {
    completedState.value = currentCompleted;
    options.onProgress?.(completedState.value, total);
  };

  try {
    // Read all files concurrently with AST parsing
    const results = await fileUtils.readFilesWithAst(files, progressCallback);

    // Process results and collect errors
    for (const result of results) {
      if (result.error) {
        errors.push(result.error);
        options.onError?.(result.error);
        continue;
      }

      try {
        // Process the AST for imports and JSX
        processFileAst(result.ast, result.path, graph);
      } catch (error) {
        const processError = new FileOperationError(
          "processAST",
          result.path,
          error as Error,
        );
        errors.push(processError);
        options.onError?.(processError);
      }
    }
  } catch (error) {
    // Handle any unexpected errors during concurrent processing
    const generalError = new FileOperationError(
      "buildGraphAsync",
      root,
      error as Error,
    );
    errors.push(generalError);
    options.onError?.(generalError);
  }

  options.onProgress?.(files.length, files.length);

  return { graph, errors };
};

/**
 * Memory-efficient buildGraph for very large codebases
 * Processes files in smaller batches to avoid memory pressure
 */
export const buildGraphAsyncBatched = async (
  root: string,
  blacklist: string[],
  options: {
    batchSize?: number;
    concurrency?: number;
    onProgress?: (
      completed: number,
      total: number,
      currentBatch?: number,
    ) => void;
    onError?: (error: FileOperationError) => void;
    memoryLimitMB?: number;
  } = {},
): Promise<{ graph: ProjectGraph; errors: FileOperationError[] }> => {
  const files = fg.sync(["**/*.{js,jsx,ts,tsx}"], {
    cwd: root,
    absolute: true,
    ignore: blacklist.map((b) => `**/${b}/**`),
  });

  const graph: ProjectGraph = { imports: [], jsx: [] };
  const errors: FileOperationError[] = [];

  const batchSize =
    options.batchSize ?? Math.max(50, Math.min(files.length / 10, 200));
  const concurrency = options.concurrency ?? getConcurrencyLimit();
  const memoryLimitMB = options.memoryLimitMB ?? 512;

  const completedState = { value: 0 };
  const currentBatchState = { value: 0 };
  const totalBatches = Math.ceil(files.length / batchSize);

  // Process files in batches
  for (let i = 0; i < files.length; i += batchSize) {
    currentBatchState.value++;
    const batch = files.slice(i, i + batchSize);

    options.onProgress?.(
      completedState.value,
      files.length,
      currentBatchState.value,
    );

    // Check memory usage before processing batch
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / (1024 * 1024);

    if (memUsageMB > memoryLimitMB) {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait a bit for memory to be freed
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    try {
      const fileUtils = new AsyncFileUtils(Math.min(concurrency, batch.length));

      const results = await fileUtils.readFilesWithAst(
        batch,
        (batchCompleted) => {
          options.onProgress?.(
            completedState.value + batchCompleted,
            files.length,
            currentBatchState.value,
          );
        },
      );

      // Process batch results
      for (const result of results) {
        if (result.error) {
          errors.push(result.error);
          options.onError?.(result.error);
          continue;
        }

        try {
          processFileAst(result.ast, result.path, graph);
        } catch (error) {
          const processError = new FileOperationError(
            "processAST",
            result.path,
            error as Error,
          );
          errors.push(processError);
          options.onError?.(processError);
        }
      }

      completedState.value += batch.length;
    } catch (error) {
      const batchError = new FileOperationError(
        "processBatch",
        `batch-${currentBatchState.value}`,
        error as Error,
      );
      errors.push(batchError);
      options.onError?.(batchError);

      // Skip this batch but continue with the next
      completedState.value += batch.length;
    }
  }

  options.onProgress?.(files.length, files.length, totalBatches);

  return { graph, errors };
};

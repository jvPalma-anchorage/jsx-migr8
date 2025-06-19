/**
 * AsyncFileUtils class for batch file operations
 * Provides high-level utilities for concurrent file processing
 */
import { promises, createReadStream, createWriteStream } from "node:fs";
import { dirname } from "node:path";
import { types as T } from "recast";
import {
  Semaphore,
  AsyncBatchProcessor,
  getConcurrencyLimit,
} from "./concurrency-utils";
import {
  FileOperationError,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
} from "./error-handling";
import { readFileAsync, writeFileAsync } from "./async-file-operations";
import { getFileAstAndCodeAsync } from "./ast-operations";

export class AsyncFileUtils {
  private semaphore: Semaphore;
  private retryConfig: RetryConfig;

  constructor(
    concurrency: number = getConcurrencyLimit(),
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
  ) {
    this.semaphore = new Semaphore(concurrency);
    this.retryConfig = retryConfig;
  }

  /**
   * Read multiple files concurrently
   */
  async readFiles(
    filePaths: string[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<
    Array<{ path: string; content: string; error?: FileOperationError }>
  > {
    const processor = new AsyncBatchProcessor<
      string,
      { path: string; content: string; error?: FileOperationError }
    >(
      filePaths,
      async (filePath) => {
        try {
          const content = await readFileAsync(
            filePath,
            "utf8",
            this.retryConfig,
          );
          return { path: filePath, content };
        } catch (error) {
          return {
            path: filePath,
            content: "",
            error:
              error instanceof FileOperationError
                ? error
                : new FileOperationError("readFile", filePath, error as Error),
          };
        }
      },
      this.semaphore.availablePermits,
    );

    return processor.process(onProgress);
  }

  /**
   * Read files and parse AST concurrently
   */
  async readFilesWithAst(
    filePaths: string[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<
    Array<{
      path: string;
      ast: T.ASTNode;
      content: string;
      error?: FileOperationError;
    }>
  > {
    const processor = new AsyncBatchProcessor<
      string,
      {
        path: string;
        ast: T.ASTNode;
        content: string;
        error?: FileOperationError;
      }
    >(
      filePaths,
      async (filePath) => {
        try {
          const [ast, content] = await getFileAstAndCodeAsync(filePath);
          return { path: filePath, ast, content };
        } catch (error) {
          return {
            path: filePath,
            ast: null as any,
            content: "",
            error:
              error instanceof FileOperationError
                ? error
                : new FileOperationError("parseAST", filePath, error as Error),
          };
        }
      },
      this.semaphore.availablePermits,
    );

    return processor.process(onProgress);
  }

  /**
   * Write multiple files concurrently
   */
  async writeFiles(
    files: Array<{ path: string; content: string }>,
    onProgress?: (completed: number, total: number) => void,
  ): Promise<
    Array<{ path: string; success: boolean; error?: FileOperationError }>
  > {
    const processor = new AsyncBatchProcessor<
      { path: string; content: string },
      { path: string; success: boolean; error?: FileOperationError }
    >(
      files,
      async (file) => {
        try {
          await writeFileAsync(
            file.path,
            file.content,
            undefined,
            this.retryConfig,
          );
          return { path: file.path, success: true };
        } catch (error) {
          return {
            path: file.path,
            success: false,
            error:
              error instanceof FileOperationError
                ? error
                : new FileOperationError(
                    "writeFile",
                    file.path,
                    error as Error,
                  ),
          };
        }
      },
      this.semaphore.availablePermits,
    );

    return processor.process(onProgress);
  }

  /**
   * Check disk space availability
   */
  async checkDiskSpace(
    filePath: string,
  ): Promise<{ available: number; total: number }> {
    try {
      const stats = await promises.statfs(dirname(filePath));
      return {
        available: stats.bavail * stats.bsize,
        total: stats.blocks * stats.bsize,
      };
    } catch (error) {
      throw new FileOperationError("checkDiskSpace", filePath, error as Error);
    }
  }

  /**
   * Memory-efficient file processing for large files
   */
  async processLargeFile(
    filePath: string,
    processor: (chunk: string) => Promise<string>,
    chunkSize: number = 1024 * 1024, // 1MB chunks
  ): Promise<void> {
    const tempPath = `${filePath}.processing.${process.pid}`;

    try {
      const readStream = createReadStream(filePath, {
        encoding: "utf8",
        highWaterMark: chunkSize,
      });
      const writeStream = createWriteStream(tempPath, { encoding: "utf8" });

      for await (const chunk of readStream) {
        const processedChunk = await processor(chunk);
        writeStream.write(processedChunk);
      }

      writeStream.end();
      await new Promise<void>((resolve, reject) => {
        writeStream.on("finish", () => resolve());
        writeStream.on("error", reject);
      });

      // Atomic replace
      await promises.rename(tempPath, filePath);
    } catch (error) {
      // Cleanup temp file
      try {
        await promises.unlink(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw new FileOperationError(
        "processLargeFile",
        filePath,
        error as Error,
      );
    }
  }
}

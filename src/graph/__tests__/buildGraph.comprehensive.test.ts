import { jest } from '@jest/globals';
import { 
  buildGraph, 
  buildGraphAsync, 
  buildGraphAsyncBatched,
  buildGraphAsyncEnhanced 
} from '../buildGraph';
import * as fsUtils from '@/utils/fs-utils';
import * as performanceMonitor from '@/utils/fs/performance-monitor';
import * as progressIndicator from '@/utils/fs/progress-indicator';
import * as workerPool from '@/utils/fs/worker-pool';
import * as pathUtils from '@/utils/pathUtils';
import * as astTypes from '@/types/ast';
import { builders as b, visit } from 'ast-types';
import fg from 'fast-glob';
import { types as T } from 'recast';

// Mock dependencies
jest.mock('fast-glob');
jest.mock('@/utils/fs-utils');
jest.mock('@/utils/fs/performance-monitor');
jest.mock('@/utils/fs/progress-indicator');
jest.mock('@/utils/fs/worker-pool');
jest.mock('@/utils/pathUtils');
jest.mock('@/types/ast');
jest.mock('ast-types', () => ({
  builders: {
    booleanLiteral: jest.fn((value) => ({ type: 'BooleanLiteral', value }))
  },
  visit: jest.fn()
}));

describe('buildGraph', () => {
  let mockFiles: string[];
  let mockAst: any;
  let mockCode: string;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFiles = [
      '/project/src/component1.tsx',
      '/project/src/component2.tsx',
      '/project/src/utils/helper.ts'
    ];

    mockAst = {
      type: 'Program',
      body: []
    };

    mockCode = 'const Component = () => <div>Hello</div>';

    // Setup default mocks
    (fg.sync as jest.Mock).mockReturnValue(mockFiles);
    (fsUtils.getFileAstAndCode as jest.Mock).mockReturnValue([mockAst, mockCode]);
    (pathUtils.getCompName as jest.Mock).mockImplementation((local, imported) => imported || local);
    (astTypes.getNameFromSpecifier as jest.Mock).mockImplementation((spec) => spec.imported?.name || 'default');
    (astTypes.getSpecifierLocalName as jest.Mock).mockImplementation((spec) => spec.local?.name || 'default');
    (astTypes.isIdentifier as jest.Mock).mockReturnValue(true);
  });

  describe('buildGraph - Synchronous', () => {
    it('should find all JavaScript/TypeScript files', () => {
      buildGraph('/project', ['node_modules', 'dist']);

      expect(fg.sync).toHaveBeenCalledWith(
        ['**/*.{js,jsx,ts,tsx}'],
        {
          cwd: '/project',
          absolute: true,
          ignore: ['**/node_modules/**', '**/dist/**']
        }
      );
    });

    it('should process imports correctly', () => {
      const importVisitor = jest.fn();
      (visit as jest.Mock).mockImplementation((ast, visitors) => {
        if (visitors.visitImportDeclaration) {
          importVisitor(visitors.visitImportDeclaration);
        }
      });

      const mockImportPath = {
        node: {
          source: { value: '@test/lib' },
          specifiers: [
            {
              type: 'ImportSpecifier',
              imported: { name: 'Button' },
              local: { name: 'Button' }
            },
            {
              type: 'ImportDefaultSpecifier',
              local: { name: 'React' }
            }
          ]
        }
      };

      buildGraph('/project', []);

      // Simulate import visitor
      const visitorCall = (visit as jest.Mock).mock.calls[0][1];
      visitorCall.visitImportDeclaration(mockImportPath);

      expect(importVisitor).toHaveBeenCalled();
    });

    it('should handle import processing errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      (visit as jest.Mock).mockImplementation((ast, visitors) => {
        if (visitors.visitImportDeclaration) {
          const errorPath = {
            node: {
              source: { value: '@test/lib' },
              specifiers: [{ type: 'UnknownSpecifier' }]
            }
          };
          visitors.visitImportDeclaration(errorPath);
        }
      });

      (astTypes.getNameFromSpecifier as jest.Mock).mockImplementation(() => {
        throw new Error('Unknown specifier type');
      });

      const graph = buildGraph('/project', []);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled import type'),
        expect.any(Object)
      );
      expect(graph.imports).toHaveLength(3); // One per file, but specifier was skipped
      
      consoleWarnSpy.mockRestore();
    });

    it('should process JSX elements correctly', () => {
      const graph = { 
        imports: [{
          pkg: '@test/lib',
          file: '/project/src/component1.tsx',
          imported: 'Button',
          importedType: 'ImportSpecifier',
          local: 'Button',
          node: {}
        }],
        jsx: []
      };

      (visit as jest.Mock).mockImplementation((ast, visitors) => {
        if (visitors.visitJSXElement) {
          const jsxPath = {
            node: {
              openingElement: {
                name: { type: 'JSXIdentifier', name: 'Button' },
                attributes: [
                  {
                    type: 'JSXAttribute',
                    name: { name: 'variant' },
                    value: { type: 'StringLiteral', value: 'primary' }
                  },
                  {
                    type: 'JSXAttribute',
                    name: { name: 'disabled' },
                    value: null // boolean prop
                  },
                  {
                    type: 'JSXAttribute',
                    name: { name: 'onClick' },
                    value: {
                      type: 'JSXExpressionContainer',
                      expression: { type: 'ArrowFunctionExpression' }
                    }
                  }
                ]
              }
            },
            // Mock traverse function
            traverse: jest.fn()
          };

          // Find matching import
          const importRef = graph.imports.find(
            i => i.file === '/project/src/component1.tsx' && i.local === 'Button'
          );
          
          if (importRef) {
            visitors.visitJSXElement.call({ traverse: jsxPath.traverse }, jsxPath);
          }
        }
      });

      const result = buildGraph('/project', []);

      expect(result.jsx).toBeDefined();
    });

    it('should handle file processing errors', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      (fsUtils.getFileAstAndCode as jest.Mock)
        .mockImplementationOnce(() => { throw new Error('File read error'); })
        .mockReturnValue([mockAst, mockCode]);

      const graph = buildGraph('/project', []);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process file'),
        expect.stringContaining('File read error')
      );
      
      // Should continue processing other files
      expect(graph).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Graph building completed with 1 errors')
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle JSX elements without matching imports', () => {
      (visit as jest.Mock).mockImplementation((ast, visitors) => {
        if (visitors.visitJSXElement) {
          const jsxPath = {
            node: {
              openingElement: {
                name: { type: 'JSXIdentifier', name: 'UnknownComponent' }
              }
            },
            traverse: jest.fn()
          };
          
          const result = visitors.visitJSXElement(jsxPath);
          expect(jsxPath.traverse).toHaveBeenCalled(); // Should traverse children
        }
      });

      const graph = buildGraph('/project', []);
      expect(graph.jsx).toHaveLength(0); // No JSX should be added for unknown components
    });
  });

  describe('buildGraphAsync - Asynchronous', () => {
    let mockFileUtils: any;
    let mockFileResults: any[];

    beforeEach(() => {
      mockFileResults = mockFiles.map(path => ({
        path,
        ast: mockAst,
        error: null
      }));

      mockFileUtils = {
        readFilesWithAst: jest.fn().mockResolvedValue(mockFileResults)
      };

      (fsUtils.AsyncFileUtils as jest.Mock).mockImplementation(() => mockFileUtils);
      (fsUtils.getConcurrencyLimit as jest.Mock).mockReturnValue(4);
    });

    it('should process files concurrently', async () => {
      const progressCallback = jest.fn();
      
      const result = await buildGraphAsync('/project', ['node_modules'], {
        concurrency: 2,
        onProgress: progressCallback
      });

      expect(fsUtils.AsyncFileUtils).toHaveBeenCalledWith(2);
      expect(mockFileUtils.readFilesWithAst).toHaveBeenCalledWith(
        mockFiles,
        expect.any(Function)
      );
      expect(progressCallback).toHaveBeenCalledWith(0, mockFiles.length);
      expect(progressCallback).toHaveBeenCalledWith(mockFiles.length, mockFiles.length);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle file read errors', async () => {
      const errorCallback = jest.fn();
      const fileError = new fsUtils.FileOperationError('read', '/project/src/error.tsx', new Error('Read failed'));
      
      mockFileResults[1] = {
        path: mockFiles[1],
        ast: null,
        error: fileError
      };

      const result = await buildGraphAsync('/project', [], {
        onError: errorCallback
      });

      expect(errorCallback).toHaveBeenCalledWith(fileError);
      expect(result.errors).toContain(fileError);
      expect(result.graph).toBeDefined();
    });

    it('should handle AST processing errors', async () => {
      const errorCallback = jest.fn();
      
      (visit as jest.Mock).mockImplementationOnce(() => {
        throw new Error('AST processing failed');
      });

      const result = await buildGraphAsync('/project', [], {
        onError: errorCallback
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].operation).toBe('processAST');
    });

    it('should handle unexpected errors during concurrent processing', async () => {
      const errorCallback = jest.fn();
      const unexpectedError = new Error('Unexpected error');
      
      mockFileUtils.readFilesWithAst.mockRejectedValue(unexpectedError);

      const result = await buildGraphAsync('/project', [], {
        onError: errorCallback
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].operation).toBe('buildGraphAsync');
    });
  });

  describe('buildGraphAsyncBatched - Batched Processing', () => {
    let mockPerfTracker: any;
    let mockSpinner: any;
    let mockWorkerPool: any;

    beforeEach(() => {
      // Mock large number of files
      const largeFileList = Array.from({ length: 500 }, (_, i) => `/project/src/file${i}.tsx`);
      (fg.sync as jest.Mock).mockReturnValue(largeFileList);

      mockPerfTracker = {
        complete: jest.fn(),
        error: jest.fn(),
        startTime: Date.now()
      };

      mockSpinner = {
        setProgress: jest.fn(),
        complete: jest.fn(),
        stop: jest.fn()
      };

      mockWorkerPool = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          ast: mockAst,
          imports: [],
          jsxElements: []
        })
      };

      (performanceMonitor.globalPerformanceMonitor.startOperation as jest.Mock).mockReturnValue(mockPerfTracker);
      (progressIndicator.createSpinner as jest.Mock).mockReturnValue(mockSpinner);
      (workerPool.getWorkerPool as jest.Mock).mockReturnValue(mockWorkerPool);
      
      // Mock global.gc
      global.gc = jest.fn();
    });

    afterEach(() => {
      delete global.gc;
    });

    it('should process files in batches', async () => {
      const progressCallback = jest.fn();
      
      const result = await buildGraphAsyncBatched('/project', [], {
        batchSize: 50,
        onProgress: progressCallback,
        showProgress: true
      });

      expect(mockSpinner.setProgress).toHaveBeenCalled();
      expect(mockSpinner.complete).toHaveBeenCalledWith('Graph building completed');
      expect(progressCallback).toHaveBeenCalled();
      expect(result.graph).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should use worker threads for large batches', async () => {
      const result = await buildGraphAsyncBatched('/project', [], {
        batchSize: 100,
        useWorkerThreads: true
      });

      expect(workerPool.getWorkerPool).toHaveBeenCalled();
      expect(mockWorkerPool.execute).toHaveBeenCalled();
      expect(result.graph).toBeDefined();
    });

    it('should handle memory pressure', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 600 * 1024 * 1024, // 600MB
        heapTotal: 1024 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        rss: 0
      });

      await buildGraphAsyncBatched('/project', [], {
        memoryLimitMB: 512,
        batchSize: 50
      });

      expect(global.gc).toHaveBeenCalled();
      
      process.memoryUsage = originalMemoryUsage;
    });

    it('should handle batch processing errors', async () => {
      const errorCallback = jest.fn();
      const batchError = new Error('Batch processing failed');
      
      mockWorkerPool.execute.mockRejectedValueOnce(batchError);

      const result = await buildGraphAsyncBatched('/project', [], {
        useWorkerThreads: true,
        onError: errorCallback
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle worker thread results', async () => {
      mockWorkerPool.execute
        .mockResolvedValueOnce({
          success: true,
          ast: mockAst
        })
        .mockResolvedValueOnce({
          success: true,
          imports: [{
            packageName: '@test/lib',
            filePath: '/project/src/file1.tsx',
            importedName: 'Button',
            importType: 'ImportSpecifier',
            localName: 'Button'
          }]
        })
        .mockResolvedValueOnce({
          success: true,
          jsxElements: [{
            filePath: '/project/src/file1.tsx',
            localName: 'Button',
            props: { variant: 'primary' }
          }]
        });

      const result = await buildGraphAsyncBatched('/project', [], {
        useWorkerThreads: true,
        batchSize: 1
      });

      expect(result.graph.imports.length).toBeGreaterThan(0);
      expect(result.graph.jsx.length).toBeGreaterThan(0);
    });

    it('should handle spinner errors gracefully', async () => {
      (progressIndicator.createSpinner as jest.Mock).mockImplementation(() => {
        throw new Error('Spinner creation failed');
      });

      // Should not throw, just continue without progress
      const result = await buildGraphAsyncBatched('/project', [], {
        showProgress: true
      });

      expect(result).toBeDefined();
    });
  });

  describe('buildGraphAsyncEnhanced - Multi-phase Processing', () => {
    let mockMultiPhaseProgress: any;

    beforeEach(() => {
      mockMultiPhaseProgress = {
        startPhase: jest.fn().mockReturnValue({
          setProgress: jest.fn(),
          update: jest.fn(),
          complete: jest.fn(),
          stop: jest.fn()
        }),
        complete: jest.fn()
      };

      (progressIndicator.MultiPhaseProgress as jest.Mock).mockImplementation(() => mockMultiPhaseProgress);
    });

    it('should process through multiple phases', async () => {
      const progressCallback = jest.fn();
      
      const result = await buildGraphAsyncEnhanced('/project', [], {
        onProgress: progressCallback,
        adaptiveProcessing: true
      });

      expect(progressIndicator.MultiPhaseProgress).toHaveBeenCalledWith([
        { name: 'File Analysis', weight: 60, total: mockFiles.length },
        { name: 'Graph Building', weight: 30, total: mockFiles.length },
        { name: 'Optimization', weight: 10, total: 1 }
      ]);

      expect(mockMultiPhaseProgress.startPhase).toHaveBeenCalledTimes(3);
      expect(mockMultiPhaseProgress.complete).toHaveBeenCalled();
      expect(result.stats).toBeDefined();
      expect(result.stats.totalFiles).toBe(mockFiles.length);
    });

    it('should handle empty file list', async () => {
      (fg.sync as jest.Mock).mockReturnValue([]);

      const result = await buildGraphAsyncEnhanced('/project', []);

      expect(result.graph.imports).toHaveLength(0);
      expect(result.graph.jsx).toHaveLength(0);
      expect(result.stats.totalFiles).toBe(0);
    });

    it('should use adaptive processing strategies', async () => {
      // Mock 1500 files to trigger batching and workers
      const manyFiles = Array.from({ length: 1500 }, (_, i) => `/project/src/file${i}.tsx`);
      (fg.sync as jest.Mock).mockReturnValue(manyFiles);

      await buildGraphAsyncEnhanced('/project', [], {
        adaptiveProcessing: true
      });

      // Should have called batched version due to file count
      expect(performanceMonitor.globalPerformanceMonitor.startOperation).toHaveBeenCalledWith(
        'buildGraphAsyncBatched',
        '/project'
      );
    });

    it('should deduplicate imports', async () => {
      // Create duplicate imports
      const mockGraphWithDuplicates = {
        imports: [
          {
            file: '/project/src/file1.tsx',
            pkg: '@test/lib',
            imported: 'Button',
            local: 'Button'
          },
          {
            file: '/project/src/file1.tsx',
            pkg: '@test/lib',
            imported: 'Button',
            local: 'Button'
          }
        ],
        jsx: []
      };

      // Mock buildGraphAsync to return duplicates
      jest.spyOn(global, 'buildGraphAsync' as any).mockResolvedValue({
        graph: mockGraphWithDuplicates,
        errors: []
      });

      const result = await buildGraphAsyncEnhanced('/project', []);

      // Should have deduplicated
      expect(result.graph.imports).toHaveLength(1);
    });

    it('should optimize JSX references', async () => {
      const mockGraphWithJsx = {
        imports: [{
          file: '/project/src/file1.tsx',
          pkg: '@test/lib',
          imported: 'Button',
          local: 'Button'
        }],
        jsx: [{
          file: '/project/src/file1.tsx',
          importRef: { local: 'Button' },
          componentName: 'Button',
          opener: {},
          props: {}
        }]
      };

      jest.spyOn(global, 'buildGraphAsync' as any).mockResolvedValue({
        graph: mockGraphWithJsx,
        errors: []
      });

      const result = await buildGraphAsyncEnhanced('/project', []);

      // JSX importRef should be correctly linked
      expect(result.graph.jsx[0].importRef).toBe(result.graph.imports[0]);
    });

    it('should force garbage collection when enabled', async () => {
      global.gc = jest.fn();

      await buildGraphAsyncEnhanced('/project', [], {
        adaptiveProcessing: true
      });

      expect(global.gc).toHaveBeenCalled();
      
      delete global.gc;
    });

    it('should track performance metrics', async () => {
      const result = await buildGraphAsyncEnhanced('/project', []);

      expect(result.stats.phases).toBeDefined();
      expect(result.stats.phases.analysis).toBeGreaterThan(0);
      expect(result.stats.phases.optimization).toBeGreaterThan(0);
      expect(result.stats.processingTime).toBeGreaterThan(0);
    });

    it('should handle phase errors gracefully', async () => {
      const error = new Error('Phase error');
      mockMultiPhaseProgress.startPhase.mockImplementation(() => {
        throw error;
      });

      await expect(buildGraphAsyncEnhanced('/project', [])).rejects.toThrow(error);
      
      expect(performanceMonitor.globalPerformanceMonitor.startOperation('buildGraphAsyncEnhanced', '/project').error)
        .toHaveBeenCalledWith(error);
    });
  });

  describe('Performance Testing', () => {
    it('should handle very large codebases efficiently', async () => {
      // Mock 10,000 files
      const hugeFileList = Array.from({ length: 10000 }, (_, i) => `/project/src/file${i}.tsx`);
      (fg.sync as jest.Mock).mockReturnValue(hugeFileList);

      const startTime = Date.now();
      
      const result = await buildGraphAsyncBatched('/project', [], {
        batchSize: 200,
        concurrency: 8,
        useWorkerThreads: true,
        showProgress: false
      });

      const duration = Date.now() - startTime;

      expect(result.graph).toBeDefined();
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
      expect(mockWorkerPool.execute).toHaveBeenCalled();
    });

    it('should maintain memory efficiency with large batches', async () => {
      const memorySnapshots: number[] = [];
      const originalMemoryUsage = process.memoryUsage;
      
      process.memoryUsage = jest.fn().mockImplementation(() => {
        const usage = originalMemoryUsage();
        memorySnapshots.push(usage.heapUsed);
        return usage;
      });

      const largeFileList = Array.from({ length: 1000 }, (_, i) => `/project/src/file${i}.tsx`);
      (fg.sync as jest.Mock).mockReturnValue(largeFileList);

      await buildGraphAsyncBatched('/project', [], {
        batchSize: 100,
        memoryLimitMB: 256
      });

      // Memory usage should not grow linearly with file count
      const maxMemory = Math.max(...memorySnapshots);
      const avgMemory = memorySnapshots.reduce((a, b) => a + b, 0) / memorySnapshots.length;
      
      expect(maxMemory / avgMemory).toBeLessThan(2); // Max should not be more than 2x average
      
      process.memoryUsage = originalMemoryUsage;
    });
  });
});
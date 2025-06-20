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

  describe("buildProjectGraph", () => {
    it("should scan project and analyze files", async () => {
      const mockFiles = [
        "/project/src/components/App.tsx",
        "/project/src/pages/Home.tsx",
        "/project/src/utils/helpers.ts",
      ];

      mockFg.mockResolvedValue(mockFiles);
      jest.spyOn(fileAnalyzer, "analyzeFile").mockImplementation(() => {});

      const result = await buildProjectGraph();

      expect(mockFg).toHaveBeenCalledWith("**/*.{js,jsx,ts,tsx}", {
        cwd: "/project",
        absolute: true,
        ignore: ["**/node_modules/**", "**/dist/**"],
      });

      expect(fileAnalyzer.analyzeFile).toHaveBeenCalledTimes(3);
      expect(fileAnalyzer.analyzeFile).toHaveBeenCalledWith(mockFiles[0]);
      expect(fileAnalyzer.analyzeFile).toHaveBeenCalledWith(mockFiles[1]);
      expect(fileAnalyzer.analyzeFile).toHaveBeenCalledWith(mockFiles[2]);

      expect(result).toEqual({
        projectRoot: "/project",
        packages: ["@company/ui-lib", "@company/common"],
        targetComponent: "Button",
        fileCount: 3,
        report: mockContext.report,
      });
    });

    it("should log progress during analysis", async () => {
      const mockFiles = Array.from(
        { length: 150 },
        (_, i) => `/project/file${i}.tsx`,
      );

      mockFg.mockResolvedValue(mockFiles);
      jest.spyOn(fileAnalyzer, "analyzeFile").mockImplementation(() => {});

      await buildProjectGraph();

      // Should log at 0%, 50%, and 100%
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Analyzing files: 0% (0/150)"),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Analyzing files: 50%"),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Analyzing files: 100% (150/150)"),
      );
    });

    it("should handle empty file list", async () => {
      mockFg.mockResolvedValue([]);

      const result = await buildProjectGraph();

      expect(fileAnalyzer.analyzeFile).not.toHaveBeenCalled();
      expect(result.fileCount).toBe(0);
    });

    it("should handle file analysis errors gracefully", async () => {
      const mockFiles = ["/project/file1.tsx", "/project/file2.tsx"];

      mockFg.mockResolvedValue(mockFiles);
      jest
        .spyOn(fileAnalyzer, "analyzeFile")
        .mockImplementationOnce(() => {
          throw new Error("Parse error");
        })
        .mockImplementationOnce(() => {});

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await buildProjectGraph();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error analyzing file /project/file1.tsx:"),
        expect.any(Error),
      );
      expect(result.fileCount).toBe(2); // Still counts both files

      consoleSpy.mockRestore();
    });

    it("should respect blacklist patterns", async () => {
      mockContext.BLACK_LIST = ["node_modules", "dist", "build", ".next"];

      await buildProjectGraph();

      expect(mockFg).toHaveBeenCalledWith("**/*.{js,jsx,ts,tsx}", {
        cwd: "/project",
        absolute: true,
        ignore: [
          "**/node_modules/**",
          "**/dist/**",
          "**/build/**",
          "**/.next/**",
        ],
      });
    });

    it("should handle Windows paths correctly", async () => {
      mockContext.ROOT_DIR = "C:\\Users\\project";
      mockContext.BLACK_LIST = ["node_modules"];

      const mockFiles = [
        "C:\\Users\\project\\src\\App.tsx",
        "C:\\Users\\project\\src\\Button.tsx",
      ];

      mockFg.mockResolvedValue(mockFiles);
      jest.spyOn(fileAnalyzer, "analyzeFile").mockImplementation(() => {});

      const result = await buildProjectGraph();

      expect(result.projectRoot).toBe("C:\\Users\\project");
      expect(fileAnalyzer.analyzeFile).toHaveBeenCalledWith(mockFiles[0]);
      expect(fileAnalyzer.analyzeFile).toHaveBeenCalledWith(mockFiles[1]);
    });

    it("should handle fast-glob errors", async () => {
      mockFg.mockRejectedValue(new Error("Permission denied"));

      await expect(buildProjectGraph()).rejects.toThrow("Permission denied");
    });

    it("should log start and completion messages", async () => {
      mockFg.mockResolvedValue(["/project/file.tsx"]);
      jest.spyOn(fileAnalyzer, "analyzeFile").mockImplementation(() => {});

      await buildProjectGraph();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Building project graph from: /project"),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Found 1 files to analyze"),
      );
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining("Project graph built successfully"),
      );
    });

    it("should not log progress for small file sets", async () => {
      const mockFiles = Array.from(
        { length: 50 },
        (_, i) => `/project/file${i}.tsx`,
      );

      mockFg.mockResolvedValue(mockFiles);
      jest.spyOn(fileAnalyzer, "analyzeFile").mockImplementation(() => {});

      await buildProjectGraph();

      // Should only log start, found files, and completion
      const infoCallsWithProgress = (
        mockLogger.info as jest.Mock
      ).mock.calls.filter((call) => call[0].includes("%"));

      expect(infoCallsWithProgress).toHaveLength(0);
    });

    it("should return complete ProjectGraph structure", async () => {
      const mockFiles = ["/project/App.tsx"];
      mockFg.mockResolvedValue(mockFiles);
      jest.spyOn(fileAnalyzer, "analyzeFile").mockImplementation(() => {});

      mockContext.report = {
        "@company/ui-lib": {
          _imports: [
            {
              filePath: "/project/App.tsx",
              localName: "Button",
              importedName: "Button",
            },
          ],
          Button: [
            {
              filePath: "/project/App.tsx",
              localName: "Button",
              importName: "Button",
              propsUsed: { onClick: 1 },
              instances: 1,
            },
          ],
        },
      };

      const result = await buildProjectGraph();

      expect(result).toEqual({
        projectRoot: "/project",
        packages: ["@company/ui-lib", "@company/common"],
        targetComponent: "Button",
        fileCount: 1,
        report: mockContext.report,
      });
    });

    it("should handle concurrent file analysis", async () => {
      const mockFiles = Array.from(
        { length: 10 },
        (_, i) => `/project/file${i}.tsx`,
      );
      mockFg.mockResolvedValue(mockFiles);

      let concurrentCalls = 0;
      let maxConcurrent = 0;

      jest.spyOn(fileAnalyzer, "analyzeFile").mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrentCalls--;
      });

      await buildProjectGraph();

      // Should process files concurrently but not all at once
      expect(maxConcurrent).toBeGreaterThan(1);
      expect(maxConcurrent).toBeLessThanOrEqual(mockFiles.length);
    });
  });
});

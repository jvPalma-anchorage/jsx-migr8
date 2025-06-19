import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { parse } from "recast";
import { setInPath, getFileCode, getCompName } from "../pathUtils";
import type { ComponentUsage, FileUsage, PathNode } from "../../types";

// Mock fs module
jest.mock("node:fs");
jest.mock("recast");

const mockFs = fs as jest.Mocked<typeof fs>;
const mockParse = parse as jest.MockedFunction<typeof parse>;

describe("pathUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("setInPath", () => {
    it("should create nested path structure for single-level path", () => {
      const root: PathNode<FileUsage> = {};
      const compUsage: ComponentUsage = {
        filePath: "test.js",
        localName: "Button",
        importName: "Button",
        propsUsed: {},
        instances: 1,
      };

      setInPath(root, "test.js", compUsage);

      expect(root).toEqual({
        "test.js": [compUsage],
      });
    });

    it("should create nested path structure for multi-level path", () => {
      const root: PathNode<FileUsage> = {};
      const compUsage: ComponentUsage = {
        filePath: "src/components/Button.js",
        localName: "Button",
        importName: "Button",
        propsUsed: {},
        instances: 1,
      };

      setInPath(root, "src/components/Button.js", compUsage);

      expect(root).toEqual({
        src: {
          components: {
            "Button.js": [compUsage],
          },
        },
      });
    });

    it("should append to existing file array", () => {
      const root: PathNode<FileUsage> = {};
      const compUsage1: ComponentUsage = {
        filePath: "test.js",
        localName: "Button",
        importName: "Button",
        propsUsed: {},
        instances: 1,
      };
      const compUsage2: ComponentUsage = {
        filePath: "test.js",
        localName: "Input",
        importName: "Input",
        propsUsed: {},
        instances: 2,
      };

      setInPath(root, "test.js", compUsage1);
      setInPath(root, "test.js", compUsage2);

      expect(root).toEqual({
        "test.js": [compUsage1, compUsage2],
      });
    });

    it("should handle Windows-style paths", () => {
      const root: PathNode<FileUsage> = {};
      const compUsage: ComponentUsage = {
        filePath: "src\\components\\Button.js",
        localName: "Button",
        importName: "Button",
        propsUsed: {},
        instances: 1,
      };

      // Mock path.sep for Windows
      const originalSep = path.sep;
      Object.defineProperty(path, "sep", { value: "\\", writable: true });

      setInPath(root, "src\\components\\Button.js", compUsage);

      expect(root).toEqual({
        src: {
          components: {
            "Button.js": [compUsage],
          },
        },
      });

      // Restore original sep
      Object.defineProperty(path, "sep", {
        value: originalSep,
        writable: true,
      });
    });

    it("should preserve existing directory structure", () => {
      const root: PathNode<FileUsage> = {
        src: {
          components: {
            "OtherComponent.js": [
              {
                filePath: "src/components/OtherComponent.js",
                localName: "Other",
                importName: "Other",
                propsUsed: {},
                instances: 1,
              },
            ],
          },
        },
      };

      const compUsage: ComponentUsage = {
        filePath: "src/components/Button.js",
        localName: "Button",
        importName: "Button",
        propsUsed: {},
        instances: 1,
      };

      setInPath(root, "src/components/Button.js", compUsage);

      expect(root.src).toBeDefined();
      expect((root.src as PathNode<FileUsage>).components).toBeDefined();
      expect(
        ((root.src as PathNode<FileUsage>).components as PathNode<FileUsage>)[
          "OtherComponent.js"
        ],
      ).toBeDefined();
      expect(
        ((root.src as PathNode<FileUsage>).components as PathNode<FileUsage>)[
          "Button.js"
        ],
      ).toEqual([compUsage]);
    });

    it("should handle empty path segments correctly", () => {
      const root: PathNode<FileUsage> = {};
      const compUsage: ComponentUsage = {
        filePath: "file.js",
        localName: "Component",
        importName: "Component",
        propsUsed: {},
        instances: 1,
      };

      // This should not happen in practice, but test edge case
      setInPath(root, "", compUsage);

      // Empty path results in empty string key
      expect(root[""]).toEqual([compUsage]);
    });
  });

  describe("getFileCode", () => {
    it("should read file and return AST and code", () => {
      const filePath = "/test/file.js";
      const code = "const x = 5;";
      const mockAst = { type: "File" };

      mockFs.readFileSync.mockReturnValue(code);
      mockParse.mockReturnValue(mockAst as any);

      const [ast, returnedCode] = getFileCode(filePath);

      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, "utf8");
      expect(mockParse).toHaveBeenCalledWith(code, {
        parser: expect.any(Object),
      });
      expect(returnedCode).toBe(code);
      expect(ast).toBe(mockAst);
    });

    it("should handle file read errors", () => {
      const filePath = "/test/nonexistent.js";
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      expect(() => getFileCode(filePath)).toThrow("ENOENT");
    });

    it("should handle parse errors", () => {
      const filePath = "/test/invalid.js";
      const code = "const x = ;"; // Invalid syntax

      mockFs.readFileSync.mockReturnValue(code);
      mockParse.mockImplementation(() => {
        throw new Error("Unexpected token");
      });

      expect(() => getFileCode(filePath)).toThrow("Unexpected token");
    });
  });

  describe("getCompName", () => {
    it("should return local name when no imported name or type", () => {
      const result = getCompName("LocalButton", undefined, undefined);
      expect(result).toBe("LocalButton");
    });

    it("should return local name for default import", () => {
      const result = getCompName(
        "MyButton",
        "Button",
        "ImportDefaultSpecifier",
      );
      expect(result).toBe("MyButton");
    });

    it("should return imported name for named import", () => {
      const result = getCompName("LocalButton", "Button", "ImportSpecifier");
      expect(result).toBe("Button");
    });

    it("should fallback to local name when imported is undefined but type exists", () => {
      const result = getCompName("LocalButton", undefined, "ImportSpecifier");
      expect(result).toBe("LocalButton");
    });

    it("should handle empty strings", () => {
      const result = getCompName("", "", "");
      expect(result).toBe("");
    });

    it("should prioritize imported over local for non-default imports", () => {
      const result = getCompName("LocalName", "ImportedName", "SomeOtherType");
      expect(result).toBe("ImportedName");
    });

    it("should handle various import types correctly", () => {
      // Test different scenarios
      const testCases = [
        {
          local: "A",
          imported: "B",
          type: "ImportDefaultSpecifier",
          expected: "A",
        },
        { local: "A", imported: "B", type: "ImportSpecifier", expected: "B" },
        {
          local: "A",
          imported: undefined,
          type: "ImportDefaultSpecifier",
          expected: "A",
        },
        { local: "A", imported: undefined, type: undefined, expected: "A" },
        {
          local: "Component",
          imported: "OriginalComponent",
          type: "ImportSpecifier",
          expected: "OriginalComponent",
        },
        {
          local: "Component",
          imported: "OriginalComponent",
          type: undefined,
          expected: "OriginalComponent",
        },
      ];

      testCases.forEach(({ local, imported, type, expected }) => {
        expect(getCompName(local, imported, type)).toBe(expected);
      });
    });
  });
});

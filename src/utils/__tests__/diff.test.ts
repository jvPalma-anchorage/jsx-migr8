import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import chalk from "chalk";
import diff from "diff";
import { showDiff } from "../diff";

// Mock dependencies
jest.mock("chalk", () => ({
  default: {
    green: jest.fn((str: string) => `[GREEN]${str}[/GREEN]`),
    red: jest.fn((str: string) => `[RED]${str}[/RED]`),
    gray: jest.fn((str: string) => `[GRAY]${str}[/GRAY]`),
    yellow: jest.fn((str: string) => `[YELLOW]${str}[/YELLOW]`),
    cyan: jest.fn((str: string) => `[CYAN]${str}[/CYAN]`),
  },
}));

jest.mock("diff");

const mockDiff = diff as jest.Mocked<typeof diff>;
const mockChalk = chalk as jest.Mocked<typeof chalk>;

describe("diff utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  describe("showDiff", () => {
    it("should display added lines in green", () => {
      mockDiff.diffLines.mockReturnValue([
        { value: "unchanged line\n", added: false, removed: false },
        { value: "new line\n", added: true, removed: false },
      ] as any);

      showDiff("file.ts", "unchanged line\n", "unchanged line\nnew line\n");

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[CYAN]file.ts[/CYAN]"),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[GREEN]+ new line[/GREEN]"),
      );
    });

    it("should display removed lines in red", () => {
      mockDiff.diffLines.mockReturnValue([
        { value: "unchanged line\n", added: false, removed: false },
        { value: "removed line\n", added: false, removed: true },
      ] as any);

      showDiff("file.ts", "unchanged line\nremoved line\n", "unchanged line\n");

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[RED]- removed line[/RED]"),
      );
    });

    it("should display unchanged lines in gray", () => {
      mockDiff.diffLines.mockReturnValue([
        { value: "unchanged line 1\n", added: false, removed: false },
        { value: "unchanged line 2\n", added: false, removed: false },
      ] as any);

      showDiff(
        "file.ts",
        "unchanged line 1\nunchanged line 2\n",
        "unchanged line 1\nunchanged line 2\n",
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[GRAY]  unchanged line 1[/GRAY]"),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[GRAY]  unchanged line 2[/GRAY]"),
      );
    });

    it("should handle multiple line changes", () => {
      mockDiff.diffLines.mockReturnValue([
        { value: "line 1\n", added: false, removed: false },
        { value: "old line 2\nold line 3\n", added: false, removed: true },
        {
          value: "new line 2\nnew line 3\nnew line 4\n",
          added: true,
          removed: false,
        },
        { value: "line 5\n", added: false, removed: false },
      ] as any);

      showDiff(
        "complex.ts",
        "line 1\nold line 2\nold line 3\nline 5\n",
        "line 1\nnew line 2\nnew line 3\nnew line 4\nline 5\n",
      );

      const logs = (console.log as jest.Mock).mock.calls.map((call) => call[0]);

      expect(logs).toContainEqual(
        expect.stringContaining("[RED]- old line 2[/RED]"),
      );
      expect(logs).toContainEqual(
        expect.stringContaining("[RED]- old line 3[/RED]"),
      );
      expect(logs).toContainEqual(
        expect.stringContaining("[GREEN]+ new line 2[/GREEN]"),
      );
      expect(logs).toContainEqual(
        expect.stringContaining("[GREEN]+ new line 3[/GREEN]"),
      );
      expect(logs).toContainEqual(
        expect.stringContaining("[GREEN]+ new line 4[/GREEN]"),
      );
    });

    it("should display separator between file changes", () => {
      mockDiff.diffLines.mockReturnValue([
        { value: "content\n", added: true, removed: false },
      ] as any);

      showDiff("file1.ts", "", "content\n");
      showDiff("file2.ts", "", "content\n");

      const logs = (console.log as jest.Mock).mock.calls.map((call) => call[0]);

      // Should have separators
      expect(
        logs.filter(
          (log) =>
            log ===
            "[YELLOW]=================================================================================[/YELLOW]",
        ),
      ).toHaveLength(4);
    });

    it("should handle empty strings", () => {
      mockDiff.diffLines.mockReturnValue([
        { value: "new content\n", added: true, removed: false },
      ] as any);

      showDiff("new-file.ts", "", "new content\n");

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[GREEN]+ new content[/GREEN]"),
      );
    });

    it("should handle no changes", () => {
      mockDiff.diffLines.mockReturnValue([
        { value: "same content\n", added: false, removed: false },
      ] as any);

      showDiff("unchanged.ts", "same content\n", "same content\n");

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[GRAY]  same content[/GRAY]"),
      );
    });

    it("should preserve empty lines in diff", () => {
      mockDiff.diffLines.mockReturnValue([
        { value: "line 1\n\nline 3\n", added: false, removed: false },
      ] as any);

      showDiff("file.ts", "line 1\n\nline 3\n", "line 1\n\nline 3\n");

      const logs = (console.log as jest.Mock).mock.calls.map((call) => call[0]);

      expect(logs).toContainEqual(
        expect.stringContaining("[GRAY]  line 1[/GRAY]"),
      );
      expect(logs).toContainEqual(expect.stringContaining("[GRAY]  [/GRAY]")); // Empty line
      expect(logs).toContainEqual(
        expect.stringContaining("[GRAY]  line 3[/GRAY]"),
      );
    });

    it("should handle lines without newline characters", () => {
      mockDiff.diffLines.mockReturnValue([
        { value: "line without newline", added: true, removed: false },
      ] as any);

      showDiff("file.ts", "", "line without newline");

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[GREEN]+ line without newline[/GREEN]"),
      );
    });

    it("should display file path in cyan", () => {
      mockDiff.diffLines.mockReturnValue([]);

      showDiff("/path/to/file.tsx", "", "");

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[CYAN]/path/to/file.tsx[/CYAN]"),
      );
    });

    it("should handle very long file paths", () => {
      const longPath = "/very/long/path/".repeat(10) + "file.ts";
      mockDiff.diffLines.mockReturnValue([
        { value: "content\n", added: false, removed: false },
      ] as any);

      showDiff(longPath, "content\n", "content\n");

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`[CYAN]${longPath}[/CYAN]`),
      );
    });

    it("should handle null or undefined diff parts", () => {
      mockDiff.diffLines.mockReturnValue([
        { value: "line 1\n", added: false, removed: false },
        { value: undefined as any, added: true, removed: false },
        { value: null as any, added: false, removed: true },
      ] as any);

      expect(() => {
        showDiff("file.ts", "line 1\n", "line 1\n");
      }).not.toThrow();
    });
  });
});

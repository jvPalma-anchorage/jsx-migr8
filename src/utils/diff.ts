import chalk from "chalk";
import { structuredPatch } from "diff";

/**
 * Remove “blank” +/- lines from a unified diff string.
 * A blank +/- line is literally “+” or “-” followed only by spaces / tabs.
 */
export function stripBlankMoves(diffText: string): string {
  return diffText
    .split("\n")
    .filter((line) => {
      if (line.length === 0) return true; // keep empty lines
      if (line[0] === "+" || line[0] === "-") {
        // Is it just "+" or "-" followed by whitespace?
        return /\S/.test(line.slice(1)); // keep only if there’s a non-space char
      }
      return true; // context, @@ headers, etc.
    })
    .join("\n");
}

export function makeDiff(
  filePath: string,
  oldCode: string,
  newCode: string,
  contextLines = 2,
): string {
  const patch = structuredPatch(
    filePath, // old filename (only used for header)
    filePath, // new filename
    oldCode,
    newCode,
    "", // old header
    "", // new header
    { context: contextLines }, // ✨ keep N lines of ctx
  );

  const lines: string[] = [];
  patch.hunks.forEach((h) => {
    // header like @@ -12,7 +12,7 @@
    lines.push(
      chalk.cyan(
        `@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`,
      ),
    );

    h.lines.forEach((l) => {
      if (l.startsWith("+"))
        lines.push(chalk.green(l)); // additions
      else if (l.startsWith("-"))
        lines.push(chalk.red(l)); // deletions
      else lines.push(chalk.dim(l)); // context
    });
  });

  return lines.join("\n") + "\n\n";
}

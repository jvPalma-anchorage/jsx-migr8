import { config } from "dotenv";
import { default as yargs } from "yargs";
import { hideBin } from "yargs/helpers";
import { 
  validateRootPath, 
  validateBlacklist, 
  expandHomePath,
  isPathSafeForScanning,
  formatPathError,
  PathValidationError
} from "../utils/path-validation";
import chalk from "chalk";

config();

/**
 * Validate root path argument
 */
function validateRootPathArg(value: string): string | boolean {
  if (!value) return "Root path is required";
  
  try {
    const expandedPath = expandHomePath(value);
    
    // Check basic safety
    if (!isPathSafeForScanning(expandedPath)) {
      return "Path is not safe for scanning (system directory detected)";
    }
    
    // Full validation
    const validation = validateRootPath(expandedPath);
    if (!validation.valid) {
      return validation.error!.message;
    }
    
    return true;
  } catch (error) {
    return `Path validation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

/**
 * Validate blacklist argument
 */
function validateBlacklistArg(value: string): string | boolean {
  if (!value) return true; // Empty blacklist is allowed
  
  try {
    const entries = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const validation = validateBlacklist(entries);
    
    if (!validation.valid) {
      const firstError = validation.invalidEntries[0];
      return `Invalid blacklist entry "${firstError.entry}": ${firstError.reason}`;
    }
    
    return true;
  } catch (error) {
    return `Blacklist validation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

export const getArgv = () => yargs(hideBin(process.argv))
  .option("root", {
    alias: "r",
    type: "string",
    default: process.env.ROOT_PATH,
    describe: "Root folder to scan",
    coerce: (value: string) => {
      if (value) {
        const validation = validateRootPathArg(value);
        if (validation !== true) {
          console.error(chalk.red(`❌ Invalid root path: ${validation}`));
          process.exit(1);
        }
      }
      return value;
    }
  })
  .option("blacklist", {
    alias: "b",
    type: "string",
    default: process.env.BLACKLIST,
    describe: "Comma-separated folders to ignore",
    coerce: (value: string) => {
      if (value) {
        const validation = validateBlacklistArg(value);
        if (validation !== true) {
          console.error(chalk.red(`❌ Invalid blacklist: ${validation}`));
          process.exit(1);
        }
      }
      return value;
    }
  })
  .option("interative", {
    alias: "i",
    type: "boolean",
    default: false,
    describe: "Redefine the migration reports for a nre component",
  })
  .option("showProps", {
    alias: "sp",
    type: "boolean",
    default: false,
    describe: "Show the props of the reports made",
  })
  .option("yolo", {
    alias: "y",
    type: "boolean",
    default: false,
    describe: "Actually migrate and change code with the set os rules",
  })
  .option("dryRun", {
    alias: "d",
    type: "boolean",
    default: false,
    describe: "When present the file is overwritten - otherwise dry-run",
  })
  .option("report", {
    alias: "rp",
    type: "string",
    default: "./report/props-usage.json",
    describe: "The props-usage summary generated in phase-2",
  })
  .option("info", {
    type: "boolean",
    default: false,
    describe: "Show internal code process information",
  })
  .option("debug", {
    type: "boolean",
    default: false,
    describe: "Show internal states during the process",
  })
  .option("backup", {
    type: "boolean",
    default: false,
    describe: "Launch backup management UI",
  })
  .option("rollback", {
    type: "string",
    describe: "Rollback to specified backup ID (interactive if no ID provided)",
  })
  .option("listBackups", {
    type: "boolean",
    default: false,
    describe: "List all available backups",
  })
  .option("verifyBackup", {
    type: "string",
    describe: "Verify integrity of specified backup",
  })
  .option("optimized", {
    alias: "opt",
    type: "boolean",
    default: false,
    describe: "Use optimized graph builder for large codebases",
  })
  .option("cleanupBackups", {
    type: "boolean",
    default: false,
    describe: "Clean up old backups",
  })
  .option("skipBackup", {
    type: "boolean",
    default: false,
    describe: "Skip automatic backup creation during migration",
  })
  .option("backupName", {
    type: "string",
    describe: "Name for manual backup creation",
  })
  .option("backupTags", {
    type: "string",
    describe: "Comma-separated tags for backup",
  })
  .option("forceRollback", {
    type: "boolean",
    default: false,
    describe: "Force rollback even with conflicts",
  })
  .option("maxMemory", {
    type: "number",
    default: 1024,
    describe: "Maximum memory usage in MB before triggering memory management",
  })
  .option("concurrency", {
    type: "number",
    describe: "Number of concurrent file operations (auto-detected if not specified)",
  })
  .option("batchSize", {
    type: "number",
    describe: "Batch size for memory-efficient processing (auto-calculated if not specified)",
  })
  .option("enableMemoryMonitoring", {
    type: "boolean",
    default: true,
    describe: "Enable memory monitoring and circuit breaker",
  })
  .option("quiet", {
    alias: "q",
    type: "boolean",
    default: false,
    describe: "Reduce output verbosity",
  })
  .option("graphTimeout", {
    type: "number",
    default: 300000, // 5 minutes
    describe: "Timeout for graph building in milliseconds",
  })
  .strict()
  .parseSync();

export const argv = getArgv();

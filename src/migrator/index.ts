import { readFileSync, writeFileSync, existsSync } from "node:fs";
/* ------------------------------------------------------------------------- */
/*  Single-pass migrate + dry-run diff                                       */
/* ------------------------------------------------------------------------- */
import { print } from "recast";

/* ---------- load remap rules (your generator returns the full map) -------- */
import { getMigr8RulesFileNames, FileOperationError } from "@/utils/fs-utils";
import { transformFileIntoOptions } from "@/utils/migr8.utils";
import { input, select } from "@inquirer/prompts";
import { default as chalk } from "chalk";
import { secureSelect, secureConfirmationInput } from "../cli/secure-prompts";
import { logSecurityEvent } from "../validation";
import { graphToComponentSummary } from "../compat/usageSummary";
import { getContext, lSuccess, lError, lWarning } from "../context/globalContext";
import { applyRemapRule } from "../remap/utils/rules";
import { makeDiff } from "../utils/diff";
import { getCompName } from "../utils/pathUtils";
import { prepareReportToMigrate } from "./utils/prepareReportToMigrate";
import { migrateComponentsWithBackup } from "../backup/migrator-integration";
import { migrateComponentsAsync, createAsyncMigrator } from "./async-migrator";
import { globalPerformanceMonitor } from "@/utils/fs/performance-monitor";
import { 
  validatePath, 
  validateFileSystemPermissions,
  formatPathError,
  PathValidationError 
} from "@/utils/path-validation";

/**
 * Validate file operation before migration to prevent corruption
 */
function validateFileForMigration(filePath: string, changeCode: boolean = false): {
  valid: boolean;
  error?: string;
  suggestions: string[];
} {
  const suggestions: string[] = [];
  
  try {
    // Check if file exists
    if (!existsSync(filePath)) {
      return {
        valid: false,
        error: `File does not exist: ${filePath}`,
        suggestions: [
          "Check if the file path is correct",
          "Ensure the file hasn't been moved or deleted",
          "Refresh the project graph if files have changed"
        ]
      };
    }
    
    // Validate path structure
    const pathValidation = validatePath(filePath, {
      allowRelative: false,
      checkRead: true,
      checkWrite: changeCode, // Only check write permission if we're changing code
      maxDepth: 50
    });
    
    if (!pathValidation.valid) {
      return {
        valid: false,
        error: pathValidation.error!.message,
        suggestions: pathValidation.error!.suggestions
      };
    }
    
    // Additional checks for migration safety
    if (changeCode) {
      // Check file isn't too large (>1MB)
      const stats = require('fs').statSync(filePath);
      if (stats.size > 1024 * 1024) {
        suggestions.push("File is large (>1MB), consider reviewing changes carefully");
      }
      
      // Check if file is in a protected directory
      if (filePath.includes('node_modules') || filePath.includes('.git')) {
        return {
          valid: false,
          error: "Cannot modify files in protected directories",
          suggestions: [
            "Files in node_modules and .git should not be modified",
            "Check your blacklist configuration",
            "Ensure the file is in your project source code"
          ]
        };
      }
      
      // Check if file appears to be generated
      const content = readFileSync(filePath, 'utf8');
      if (content.includes('@generated') || content.includes('DO NOT EDIT')) {
        suggestions.push("File appears to be generated, proceed with caution");
      }
    }
    
    return {
      valid: true,
      suggestions
    };
    
  } catch (error) {
    return {
      valid: false,
      error: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      suggestions: [
        "Check file permissions",
        "Ensure the file is accessible",
        "Verify the file path is correct"
      ]
    };
  }
}

/**
 * Validate migration rules file
 */
function validateMigrationRulesFile(ruleFilePath: string): {
  valid: boolean;
  error?: string;
  suggestions: string[];
} {
  try {
    if (!existsSync(ruleFilePath)) {
      return {
        valid: false,
        error: `Migration rules file not found: ${ruleFilePath}`,
        suggestions: [
          "Create migration rules using the component inspector",
          "Check if the rules file was moved or deleted",
          "Verify the migr8Rules directory exists"
        ]
      };
    }
    
    // Try to parse the rules file
    const content = readFileSync(ruleFilePath, 'utf8');
    let rules;
    try {
      rules = JSON.parse(content);
    } catch (parseError) {
      return {
        valid: false,
        error: `Invalid JSON in migration rules file: ${parseError}`,
        suggestions: [
          "Check JSON syntax in the rules file",
          "Regenerate the rules file if corrupted",
          "Validate JSON using an online tool"
        ]
      };
    }
    
    // Basic structure validation
    if (!rules.lookup || !rules.components) {
      return {
        valid: false,
        error: "Migration rules file missing required structure (lookup/components)",
        suggestions: [
          "Regenerate the rules file using the component inspector",
          "Check that the file follows the migr8 rules format",
          "Review the documentation for proper rules structure"
        ]
      };
    }
    
    return {
      valid: true,
      suggestions: []
    };
    
  } catch (error) {
    return {
      valid: false,
      error: `Rules file validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      suggestions: [
        "Check file permissions for the rules file",
        "Regenerate the rules file if corrupted"
      ]
    };
  }
}

export const migrateComponents = async (changeCode = false) => {
  try {
    const { runArgs, graph } = getContext();

    const summary = graphToComponentSummary(graph!);

    if (!summary) {
      lWarning("No component summary available for migration");
      return;
    }

    let migr8RuleFiles;
    try {
      migr8RuleFiles = getMigr8RulesFileNames();
    } catch (error) {
      lError("Failed to load migration rule files:", error as any);
      return `
⚠ Failed to load Migr8 files. Check file permissions and format.`;
    }

    if (!migr8RuleFiles || migr8RuleFiles.length === 0) {
      return `
⚠ No Migr8 files found to use.
Please create one in "🔍  Inspect components"`;
    }

    let fileOptions;
    try {
      fileOptions = transformFileIntoOptions();
    } catch (error) {
      lError("Failed to transform file options:", error as any);
      return `
⚠ Failed to process migration rule files.`;
    }

    /* ── 2.5  import type (named or default)  */
    const migr8Spec = await secureSelect({
      message: "🔗  Pick an Migr8 :",
      choices: fileOptions,
    });

    // Validate the selected migration rules file
    const rulesValidation = validateMigrationRulesFile(migr8Spec);
    if (!rulesValidation.valid) {
      lError("Migration rules validation failed:", rulesValidation.error);
      console.error(chalk.red(`❌ ${rulesValidation.error}`));
      if (rulesValidation.suggestions.length > 0) {
        console.error(chalk.yellow('💡 Suggestions:'));
        rulesValidation.suggestions.forEach(suggestion => {
          console.error(chalk.gray(`   • ${suggestion}`));
        });
      }
      return `⚠ Migration rules validation failed. Please fix the rules file.`;
    }

    if (rulesValidation.suggestions.length > 0) {
      console.warn(chalk.yellow('💡 Migration rules suggestions:'));
      rulesValidation.suggestions.forEach(suggestion => {
        console.warn(chalk.gray(`   • ${suggestion}`));
      });
    }

    let migrationMapper;
    try {
      migrationMapper = prepareReportToMigrate(migr8Spec, summary);
    } catch (error) {
      lError("Failed to prepare migration mapping:", error as any);
      return `
⚠ Failed to prepare migration. Check your migration rules.`;
    }

  // Check if backup integration should be used
  const shouldSkipBackup = runArgs.skipBackup;
  const isYoloMode = runArgs.yolo || changeCode;
  const migrationEntries = Object.entries(migrationMapper);

  // Use enhanced async migration for large numbers of files or when explicitly requested
  const shouldUseAsyncMigration = migrationEntries.length > 10 || runArgs.async;

  if (shouldUseAsyncMigration) {
    try {
      lSuccess("Using enhanced async migration...");
      
      const asyncMigrator = createAsyncMigrator({
        showProgress: !runArgs.quiet,
        enableBackup: !shouldSkipBackup,
        validateSyntax: !runArgs.skipValidation,
        generateDiffs: !changeCode,
        useWorkerThreads: migrationEntries.length > 50,
        onProgress: (completed, total, currentFile) => {
          if (!runArgs.quiet && currentFile) {
            console.log(chalk.blue(`Processing ${completed}/${total}: ${currentFile}`));
          }
        },
        onError: (error) => {
          lError("Migration error:", error.message);
        },
      });

      const result = await asyncMigrator.migrateComponents(migrationMapper, migr8Spec, changeCode);
      
      // Log results
      if (result.stats.successfulMigrations > 0) {
        lSuccess(`Successfully migrated ${result.stats.successfulMigrations} files`);
        lSuccess(`Components migrated: ${result.stats.totalComponentsMigrated}`);
        lSuccess(`Props changed: ${result.stats.totalPropsChanged}`);
        lSuccess(`Processing time: ${(result.stats.totalProcessingTime / 1000).toFixed(2)}s`);
        lSuccess(`Throughput: ${result.stats.throughputFilesPerSecond.toFixed(2)} files/s`);
      }

      if (result.errors.length > 0) {
        lWarning(`Migration completed with ${result.errors.length} errors`);
      }

      // Show performance report
      if (runArgs.debug || runArgs.verbose) {
        console.log("\n" + globalPerformanceMonitor.getPerformanceReport());
      }

      return;
    } catch (error) {
      console.warn(
        chalk.yellow(
          "⚠️  Async migration failed, falling back to standard migration:",
        ),
        error,
      );
      // Fall through to standard migration
    }
  }

  // Use enhanced migration with backup integration unless specifically skipped
  if (!shouldSkipBackup && (isYoloMode || !runArgs.dryRun)) {
    try {
      await migrateComponentsWithBackup(migrationMapper, migr8Spec, changeCode);
      return;
    } catch (error) {
      console.warn(
        chalk.yellow(
          "⚠️  Backup integration failed, falling back to standard migration:",
        ),
        error,
      );
      // Fall through to standard migration
    }
  }

    // Standard migration logic (kept for backward compatibility and fallback)
    const successMigrated: string[] = [];
    const couldMigrate: string[] = [];
    const migrationErrors: string[] = [];

    Object.entries(migrationMapper).forEach((migrationObj) => {
      try {
        const [fileAbsPath, fileCompleteData] = migrationObj;
        
        // Validate file before any operations
        const fileValidation = validateFileForMigration(fileAbsPath, changeCode);
        if (!fileValidation.valid) {
          lError(`File validation failed for ${fileAbsPath}: ${fileValidation.error}`);
          if (fileValidation.suggestions.length > 0) {
            console.error(chalk.yellow('💡 Suggestions:'));
            fileValidation.suggestions.forEach(suggestion => {
              console.error(chalk.gray(`   • ${suggestion}`));
            });
          }
          migrationErrors.push(`Validation failed: ${fileAbsPath}`);
          return;
        }
        
        // Show warnings if any
        if (fileValidation.suggestions.length > 0) {
          fileValidation.suggestions.forEach(suggestion => {
            console.warn(chalk.yellow(`⚠️ ${fileAbsPath}: ${suggestion}`));
          });
        }
        
        const changed = applyRemapRule(changeCode, migrationObj, migr8Spec);
        if (!changed) {
          return;
        }
        const { codeCompare, elements, importNode } = fileCompleteData;

        const locName = getCompName(
          importNode.local,
          importNode.imported,
          importNode.importedType,
        );

        // const fileAbsPath = fileCompleteData.importNode.fileAbsPath;
        const oldCode = codeCompare!.old || "1 N/A";
        let newCode: string;
        
        try {
          newCode = print(codeCompare.ast!).code || "2 N/A";
        } catch (error) {
          lError(`Failed to print AST for ${fileAbsPath}:`, error as any);
          migrationErrors.push(`Print AST failed: ${fileAbsPath}`);
          return;
        }

        if (changeCode) {
          try {
            writeFileSync(fileAbsPath, newCode);
            successMigrated.push(
              [
                "migrated",
                " (",
                chalk.yellow(elements.length),
                ") ",
                chalk.yellow(locName),
                " in ",
                chalk.yellow(fileAbsPath),
              ].join(""),
            );
          } catch (error) {
            lError(`Failed to write file ${fileAbsPath}:`, error as any);
            migrationErrors.push(`Write failed: ${fileAbsPath}`);
          }
        } else {
          couldMigrate.push(
            [
              "would migrate",
              chalk.yellow(locName),
              " in ",
              chalk.yellow(fileAbsPath),
            ].join(""),
          );

          try {
            console.info("🎉", makeDiff(fileAbsPath, oldCode, newCode, 2));
          } catch (error) {
            lWarning(`Failed to generate diff for ${fileAbsPath}:`, error as any);
          }
        }
      } catch (error) {
        const [fileAbsPath] = migrationObj;
        lError(`Migration failed for ${fileAbsPath}:`, error as any);
        migrationErrors.push(`Migration failed: ${fileAbsPath}`);
      }
    });

    if (migrationErrors.length > 0) {
      lWarning(
        `Migration completed with ${migrationErrors.length} errors. Some files may not have been processed.`
      );
    }

    if (!changeCode) {
      couldMigrate.forEach((e) => {
        const str = e.split(" migrate");
        lSuccess(str[0] + " migrate", str[1]);
      });
    }

    if (changeCode || runArgs.debug) {
      successMigrated.forEach((e) => {
        const str = e.split(" (");
        lSuccess(str[0], " (" + str[1]);
      });
      process.exit(0);
    }

    const action = await secureSelect({
      message: chalk.cyanBright("What would you like to do?"),
      choices: [
        {
          name: "🧪  Dry-run migration (diff only)",
          value: "dryRun",
        },
        {
          name: "🚀  Migrate code for real (YOLO)",
          value: "migrate",
        },
      ],
      default: "dry",
    });

    if (action === "dryRun") {
      await migrateComponents(false);
    }
    if (action === "migrate") {
      const confirm = await secureConfirmationInput(
        chalk.redBright("This will MODIFY your files - type 'yes' to continue:")
      );
      if (confirm) {
        logSecurityEvent(
          'migration-final-confirmation',
          'info',
          'User provided final confirmation for file modification'
        );
        migrateComponents(true /* change files */);
      } else {
        console.info(chalk.yellow("Migration aborted."));
        logSecurityEvent(
          'migration-final-aborted',
          'info',
          'User aborted migration at final confirmation'
        );
        process.exit(0);
      }
    }
  } catch (error) {
    lError("Critical error in migration process:", error as any);
    console.error(chalk.red("Migration failed. Check the logs above for details."));
    process.exit(1);
  }
};

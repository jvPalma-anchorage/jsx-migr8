import { readFileSync, writeFileSync, existsSync } from "node:fs";
/* ------------------------------------------------------------------------- */
/*  File-by-file migrate + comprehensive diff                                */
/* ------------------------------------------------------------------------- */
import { print, parse } from "recast";

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

// File-by-file migration imports
import { FileMigrationProcessor } from "./file-migration-processor";
import { FileAggregator } from "./utils/file-aggregator";
import { EnhancedDiffGenerator } from "./utils/enhanced-diff";
import { FileImpactAnalyzer } from "./utils/file-impact-analyzer";

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
 * New file-by-file migration approach
 */
export const migrateComponentsFileByFile = async (changeCode = false) => {
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
      return `⚠ Failed to load Migr8 files. Check file permissions and format.`;
    }

    if (!migr8RuleFiles || migr8RuleFiles.length === 0) {
      return `⚠ No Migr8 files found to use.\nPlease create one in "🔍  Inspect components"`;
    }

    let fileOptions;
    try {
      fileOptions = transformFileIntoOptions();
    } catch (error) {
      lError("Failed to transform file options:", error as any);
      return `⚠ Failed to process migration rule files.`;
    }

    const migr8Spec = await secureSelect({
      message: "🔗  Pick a Migration Rule Set:",
      choices: fileOptions,
    });

    // Validate the selected migration rules structure with more lenient checks
    if (!migr8Spec) {
      lError("Migration rules validation failed: No migration spec provided");
      console.error(chalk.red(`❌ No migration rules selected.`));
      return `⚠ No migration rules selected.`;
    }

    // Allow partial rules - some sections might be optional
    if (!migr8Spec.lookup) {
      lWarning("Migration rules have no lookup section - using defaults");
      migr8Spec.lookup = {
        rootPath: process.cwd(),
        packages: [],
        components: []
      };
    }

    if (!migr8Spec.migr8rules) {
      lWarning("Migration rules have no migr8rules section - initializing empty");
      migr8Spec.migr8rules = [];
    }

    if (migr8Spec.migr8rules.length === 0) {
      console.warn(chalk.yellow('⚠️  Migration rules are empty - will analyze components but no transformations will be applied'));
      console.warn(chalk.gray('   This is useful for testing file detection and analysis'));
    } else {
      const validRules = migr8Spec.migr8rules.filter(rule => {
        // Basic validation - must have package and component
        return rule.package && rule.component;
      });
      
      if (validRules.length < migr8Spec.migr8rules.length) {
        console.warn(chalk.yellow(`⚠️  ${migr8Spec.migr8rules.length - validRules.length} rules skipped due to missing package or component names`));
      }
      
      console.log(chalk.green(`✅ Loaded ${validRules.length} valid migration rules`));
    }

    // Use file aggregator to group changes by file
    const fileAggregator = new FileAggregator();
    let fileInputs;
    
    try {
      const { graph } = getContext();
      fileInputs = fileAggregator.aggregateFromComponentSummary(summary, migr8Spec, {
        includeStats: true,
        includeLineNumbers: true,
        generateDiffs: !changeCode
      }, graph);
    } catch (error) {
      lError("Failed to aggregate files for migration:", error as any);
      return `⚠ Failed to prepare file-by-file migration.`;
    }

    if (fileInputs.length === 0) {
      lWarning("No files found to migrate");
      return;
    }

    // Validate file inputs
    const { valid: validFileInputs, invalid: invalidFileInputs } = FileAggregator.validateFileInputs(fileInputs);
    
    if (invalidFileInputs.length > 0) {
      console.warn(chalk.yellow(`\n⚠️  ${invalidFileInputs.length} files have validation issues:`));
      invalidFileInputs.forEach(({ fileInput, errors }) => {
        console.warn(chalk.gray(`   • ${fileInput.filePath}:`));
        errors.forEach(error => {
          // Provide more helpful context for each error type
          if (error.includes('No components to migrate')) {
            console.warn(chalk.gray(`     - No matching components found (looking for: ${migr8Spec.lookup.components.join(', ')})`));
          } else if (error.includes('No JSX elements found')) {
            console.warn(chalk.gray(`     - Component imported but not used in JSX (import-only transformation may still apply)`));
          } else {
            console.warn(chalk.gray(`     - ${error}`));
          }
        });
      });
      console.warn(chalk.gray(`\n   💡 Tip: These files will be skipped. To include them, ensure they contain the target components.`));
    }

    if (validFileInputs.length === 0) {
      lError("No valid files to migrate after validation");
      return;
    }

    lSuccess(`📄 Prepared ${validFileInputs.length} files for migration`);

    // Create file migration processor
    const processor = new FileMigrationProcessor({
      showProgress: !runArgs.quiet,
      includeStats: true,
      includeLineNumbers: true,
      generateDiffs: !changeCode,
      validateSyntax: !runArgs.skipValidation,
      preserveFormatting: true,
      contextLines: 3
    });

    // Process files
    const migrationResult = await processor.processFiles(validFileInputs);

    // Display results
    if (!changeCode) {
      // Dry run - show diffs and summaries
      console.log(chalk.bold.cyan("\n🔍 Migration Preview (Dry Run)"));
      console.log(chalk.cyan("=" .repeat(50)));
      
      migrationResult.fileTransformations.forEach((fileTransform) => {
        if (fileTransform.stats.totalPropsModified > 0 || fileTransform.componentTransformations.length > 0) {
          processor.displayFileDiff(fileTransform);
        }
      });

      // Show overall report
      console.log(processor.generateReport(migrationResult));
      
      // Show rule application summary
      const appliedRulesMap = new Map<string, number>();
      migrationResult.fileTransformations.forEach(ft => {
        ft.appliedRules.forEach(rule => {
          const key = `${rule.ruleType}: ${rule.description}`;
          appliedRulesMap.set(key, (appliedRulesMap.get(key) || 0) + 1);
        });
      });
      
      if (appliedRulesMap.size > 0) {
        console.log(chalk.bold("\n🎯 Applied Rules Summary:"));
        Array.from(appliedRulesMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .forEach(([rule, count]) => {
            console.log(chalk.gray(`   • ${rule} (${count}x)`));
          });
      }

      // Ask user what to do next
      const action = await secureSelect({
        message: chalk.cyanBright("What would you like to do?"),
        choices: [
          {
            name: "🚀  Apply these changes (YOLO)",
            value: "migrate",
          },
          {
            name: "🧪  Run another dry-run with different rules",
            value: "retry",
          },
          {
            name: "❌  Cancel migration",
            value: "cancel",
          },
        ],
        default: "cancel",
      });

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
          return migrateComponentsFileByFile(true);
        } else {
          console.info(chalk.yellow("Migration aborted."));
          logSecurityEvent(
            'migration-final-aborted',
            'info',
            'User aborted migration at final confirmation'
          );
          return;
        }
      } else if (action === "retry") {
        return migrateComponentsFileByFile(false);
      } else {
        console.info(chalk.yellow("Migration cancelled."));
        return;
      }
    } else {
      // Real migration - apply changes
      console.log(chalk.bold.green("\n🚀 Applying File-by-File Migration"));
      console.log(chalk.green("=" .repeat(50)));

      const successFiles: string[] = [];
      const failedFiles: string[] = [];

      for (const fileTransform of migrationResult.fileTransformations) {
        if (!fileTransform.success) {
          failedFiles.push(fileTransform.filePath);
          continue;
        }

        // Skip files with no changes
        if (fileTransform.originalCode === fileTransform.transformedCode) {
          continue;
        }

        // Validate file before writing
        const fileValidation = validateFileForMigration(fileTransform.filePath, true);
        if (!fileValidation.valid) {
          lError(`File validation failed for ${fileTransform.filePath}: ${fileValidation.error}`);
          failedFiles.push(fileTransform.filePath);
          continue;
        }

        try {
          writeFileSync(fileTransform.filePath, fileTransform.transformedCode);
          successFiles.push(fileTransform.filePath);
          
          lSuccess(`✅ Migrated ${fileTransform.filePath}`);
          console.log(`   ${fileTransform.stats.componentsChanged} components, ${fileTransform.stats.totalPropsModified} props changed`);
          
        } catch (error) {
          lError(`Failed to write file ${fileTransform.filePath}:`, error as any);
          failedFiles.push(fileTransform.filePath);
        }
      }

      // Show final results
      console.log(processor.generateReport(migrationResult));
      
      if (successFiles.length > 0) {
        lSuccess(`🎉 Successfully migrated ${successFiles.length} files`);
      }
      
      if (failedFiles.length > 0) {
        lError(`❌ Failed to migrate ${failedFiles.length} files`);
        failedFiles.forEach(filePath => {
          console.error(chalk.red(`   • ${filePath}`));
        });
      }

      process.exit(failedFiles.length > 0 ? 1 : 0);
    }

  } catch (error) {
    lError("Critical error in file-by-file migration process:", error as any);
    console.error(chalk.red("Migration failed. Check the logs above for details."));
    process.exit(1);
  }
};

export const migrateComponents = async (changeCode = false) => {
  const { runArgs } = getContext();

  // Check if user wants to use the new file-by-file approach
  if (runArgs.fileByFile && !runArgs.legacy) {
    return migrateComponentsFileByFile(changeCode);
  }

  // Legacy rule-by-rule approach (kept for backward compatibility)  
  try {
    const { graph } = getContext();

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

    // Validate the selected migration rules structure (already parsed from file)
    if (!migr8Spec || !migr8Spec.lookup || !migr8Spec.migr8rules) {
      lError("Migration rules validation failed: Invalid migration rules structure");
      console.error(chalk.red(`❌ Invalid migration rules structure. Missing lookup or migr8rules section.`));
      console.error(chalk.yellow('💡 Suggestions:'));
      console.error(chalk.gray('   • Regenerate the rules file using the component inspector'));
      console.error(chalk.gray('   • Check that the file follows the migr8 rules format'));
      console.error(chalk.gray('   • Review the documentation for proper rules structure'));
      return `⚠ Migration rules validation failed. Please fix the rules file.`;
    }

    if (!migr8Spec.migr8rules.length) {
      console.warn(chalk.yellow('💡 Migration rules are empty - no migrations will be performed'));
    }

    // Check for incomplete migration rules (TODO placeholders)
    const hasIncompleteMigration = migr8Spec.migr8rules.some(rule => 
      rule.importType?.includes('TODO') || 
      rule.importTo?.importStm?.includes('TODO') ||
      rule.importTo?.component?.includes('TODO')
    );

    if (hasIncompleteMigration && !changeCode) {
      console.warn(chalk.yellow('⚠️  Migration rules contain TODO placeholders'));
      console.warn(chalk.yellow('   This is normal for rules generated from component inspection'));
      console.warn(chalk.yellow('   Dry-run will show what would be migrated when rules are complete'));
      console.log(chalk.blue('💡 To use interactive diff review, run with --experimental flag'));
    } else if (hasIncompleteMigration && changeCode) {
      console.error(chalk.red('❌ Cannot perform migration with incomplete rules'));
      console.error(chalk.yellow('💡 Complete the following in your migration rules file:'));
      migr8Spec.migr8rules.forEach((rule, index) => {
        if (rule.importType?.includes('TODO')) {
          console.error(chalk.gray(`   • Rule ${index + 1}: Set importType to "named" or "default"`));
        }
        if (rule.importTo?.importStm?.includes('TODO')) {
          console.error(chalk.gray(`   • Rule ${index + 1}: Set importTo.importStm to actual import statement`));
        }
        if (rule.importTo?.component?.includes('TODO')) {
          console.error(chalk.gray(`   • Rule ${index + 1}: Set importTo.component to target component name`));
        }
      });
      return `⚠ Migration rules incomplete. Please complete TODO placeholders before migrating.`;
    }

    let migrationMapper;
    try {
      migrationMapper = prepareReportToMigrate(migr8Spec, summary);
    } catch (error) {
      lError("Failed to prepare migration mapping:", error as any);
      return `
⚠ Failed to prepare migration. Check your migration rules.`;
    }

  // Debug: Check if migration mapper is empty
  const migrationEntries = Object.entries(migrationMapper);
  if (migrationEntries.length === 0) {
    console.warn(chalk.yellow('⚠️  Migration mapper is empty - no files to migrate'));
    console.warn(chalk.gray('   • Check if your migration rules match actual component usage'));
    console.warn(chalk.gray('   • Verify component names and package names in rules'));
    console.warn(chalk.gray('   • Ensure components exist in the analyzed files'));
    return "No files to migrate - migration mapper is empty";
  }

  // Debug: Show migration mapper contents for dry-run
  if (!changeCode && (runArgs.debug || runArgs.verbose)) {
    console.log(chalk.blue(`🔍 Found ${migrationEntries.length} files to migrate:`));
    migrationEntries.forEach(([filePath, fileData]) => {
      console.log(chalk.gray(`   • ${filePath} (${fileData.elements.length} elements)`));
    });
  }

  // Check if backup integration should be used
  const shouldSkipBackup = runArgs.skipBackup;
  const isYoloMode = runArgs.yolo || changeCode;

  // Temporarily disable async migration due to hanging issues - use standard migration
  const shouldUseAsyncMigration = false; // migrationEntries.length > 10 || runArgs.async;

  // Debug: Show which migration path will be taken
  if (!changeCode && (runArgs.debug || runArgs.verbose)) {
    console.log(chalk.blue('🛤️  Migration Path Debug:'));
    console.log(chalk.gray(`   • changeCode: ${changeCode}`));
    console.log(chalk.gray(`   • shouldUseAsyncMigration: ${shouldUseAsyncMigration}`));
    console.log(chalk.gray(`   • shouldSkipBackup: ${shouldSkipBackup}`));
    console.log(chalk.gray(`   • isYoloMode: ${isYoloMode}`));
    console.log(chalk.gray(`   • runArgs.experimental: ${runArgs.experimental}`));
  }

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

  // Check if interactive diff should be used for dry-run
  if (!changeCode && runArgs.experimental) {
    try {
      console.log(chalk.blue('🔍 Starting Interactive Diff Review'));
      const { showInteractiveDryRun } = await import('../cli/interactive-diff/jsx-migr8-integration');
      
      // Prepare migration data for interactive diff
      const migrationData = Object.entries(migrationMapper).map(([filePath, fileData]) => {
        const { codeCompare, elements, importNode } = fileData;
        const oldCode = codeCompare!.old || "";
        let newCode = "";
        
        try {
          // Clone AST to preserve original for interactive diff
          const workingAst = parse(print(codeCompare.ast!).code);
          
          // Create a working migration object with cloned AST
          const workingMigrationObj: [string, typeof fileData] = [
            filePath,
            {
              ...fileData,
              codeCompare: {
                ...codeCompare,
                ast: workingAst
              }
            }
          ];
          
          // Apply migration to cloned AST to generate new code
          const changed = applyRemapRule(false, workingMigrationObj, migr8Spec);
          if (changed) {
            newCode = print(workingAst).code || "";
          } else {
            newCode = oldCode; // No changes needed
          }
        } catch (error) {
          lWarning(`Failed to generate new code for ${filePath}:`, error as any);
          newCode = oldCode; // Fallback to old code
        }
        
        return {
          filePath,
          originalContent: oldCode,
          migratedContent: newCode,
          rule: {
            name: `${migr8Spec.migr8rules[0]?.component || 'Unknown'} Migration`,
            description: `Migrate ${migr8Spec.migr8rules[0]?.component || 'component'} usage`,
            sourcePackage: migr8Spec.migr8rules[0]?.package || 'unknown',
            targetPackage: migr8Spec.migr8rules[0]?.importTo?.importStm || 'unknown',
            componentName: migr8Spec.migr8rules[0]?.component || 'Unknown',
            propsChanged: [],
            importsChanged: [
              `${migr8Spec.migr8rules[0]?.package || 'unknown'} → ${migr8Spec.migr8rules[0]?.importTo?.importStm || 'unknown'}`
            ],
          },
        };
      });
      
      await showInteractiveDryRun(migrationData);
      return "Interactive diff completed";
    } catch (error) {
      console.warn(chalk.yellow("⚠️  Interactive diff failed, falling back to standard migration:"), error);
      // Fall through to standard migration
    }
  }

  // Use enhanced migration with backup integration - but only for actual migrations, not dry-runs
  if (!shouldSkipBackup && changeCode && !runArgs.experimental) {
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

    // Show dry-run banner
    if (!changeCode) {
      console.log(chalk.blue('🧪 DRY-RUN MODE: Previewing migrations without making changes'));
      console.log(chalk.gray('   Files will NOT be modified. Only showing potential changes.\n'));
    }

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
        
        const { codeCompare, elements, importNode } = fileCompleteData;
        
        // Clone AST to preserve original for diffs and re-runs
        const originalAst = codeCompare.ast!;
        const workingAst = !changeCode ? parse(print(originalAst).code) : originalAst; // Clone only in preview mode
        
        // Create a working migration object with cloned AST
        const workingMigrationObj: [string, typeof fileCompleteData] = [
          fileAbsPath,
          {
            ...fileCompleteData,
            codeCompare: {
              ...codeCompare,
              ast: workingAst
            }
          }
        ];
        
        const changed = applyRemapRule(changeCode, workingMigrationObj, migr8Spec);
        if (!changed) {
          return;
        }

        const locName = getCompName(
          importNode.local,
          importNode.imported,
          importNode.importedType,
        );

        // const fileAbsPath = fileCompleteData.importNode.fileAbsPath;
        const oldCode = codeCompare!.old || "1 N/A";
        let newCode: string;
        
        try {
          newCode = print(workingAst).code || "2 N/A";
          // Use transformedAst for preview mode if available, otherwise use the main AST
//          const astToUse = !changeCode && codeCompare.transformedAst ? codeCompare.transformedAst : codeCompare.ast!;
//          newCode = print(astToUse).code || "2 N/A";
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
          const migrateMessage = [
            "would migrate (",
            chalk.yellow(elements.length),
            ") ",
            chalk.yellow(locName),
            " in ",
            chalk.yellow(fileAbsPath),
          ].join("");
          
          couldMigrate.push(migrateMessage);
          
          // Show dry-run message immediately (not just store it)
          console.info(chalk.blue("📋"), migrateMessage);

          try {
            const diff = makeDiff(fileAbsPath, oldCode, newCode, 2);
            console.info("🎉", diff);
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
      // Dry-run summary (individual messages already shown during processing)
      console.log(chalk.blue(`\n🎯 DRY-RUN SUMMARY:`));
      console.log(chalk.green(`   ✅ Found ${couldMigrate.length} files that can be migrated`));
      if (migrationErrors.length > 0) {
        console.log(chalk.red(`   ❌ ${migrationErrors.length} files had errors during analysis`));
      }
      console.log(chalk.gray('   📝 No files were actually modified (this was a preview)\n'));
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

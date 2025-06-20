/**********************************************************************
 * src/cli/envSetup.ts – Interactive .env file generation
 *********************************************************************/
import { input, confirm } from "@inquirer/prompts";
import { default as chalk } from "chalk";
import { readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { 
  validateRootPath, 
  validateBlacklist, 
  PathValidationError, 
  formatPathError,
  expandHomePath,
  isPathSafeForScanning
} from "../utils/path-validation";

/**
 * Smart blacklist detection patterns - commonly ignored directories
 */
const COMMON_BLACKLIST_PATTERNS = [
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "coverage",
  ".nyc_output",
  ".git",
  ".svn",
  ".hg",
  "tmp",
  "temp",
  "cache",
  ".cache",
  "logs",
  "*.log",
  ".DS_Store",
  "Thumbs.db",
  "storybook-static",
  "bundle-stats",
  "generated",
  ".template",
  "storybook",
  "devdebug",
] as const;

/**
 * Detect common blacklist directories in the given root path
 */
function detectBlacklistDirectories(rootPath: string): string[] {
  const detected: string[] = [];

  try {
    const entries = readdirSync(rootPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirName = entry.name;

        // Check if this directory matches any common patterns
        for (const pattern of COMMON_BLACKLIST_PATTERNS) {
          if (pattern.includes("*")) {
            // Simple glob pattern matching
            const regexPattern = pattern.replace(/\*/g, ".*");
            if (new RegExp(`^${regexPattern}$`).test(dirName)) {
              detected.push(dirName);
              break;
            }
          } else if (dirName === pattern) {
            detected.push(dirName);
            break;
          }
        }
      }
    }
  } catch (error) {
    // If we can't read the directory, just return empty array
    console.warn(
      chalk.yellow(
        `Warning: Could not scan directory ${rootPath} for blacklist detection`,
      ),
    );
  }

  return detected.sort();
}

/**
 * Enhanced path validation for environment setup
 */
function validatePathForSetup(inputPath: string): boolean | string {
  try {
    // Expand home directory if needed
    const expandedPath = expandHomePath(inputPath.trim());
    
    // Check if path is safe for scanning
    if (!isPathSafeForScanning(expandedPath)) {
      return "Path is not safe for scanning (system directory detected). Please choose a project directory.";
    }
    
    // Use comprehensive path validation
    const validation = validateRootPath(expandedPath);
    
    if (!validation.valid) {
      return validation.error!.message;
    }
    
    return true;
  } catch (error) {
    if (error instanceof PathValidationError) {
      return error.message;
    }
    return `Path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Generate .env file content based on user configuration
 */
function generateEnvContent(rootPath: string, blacklist: string[]): string {
  const content = `# Root folder of the monorepo or project to scan
ROOT_PATH=${rootPath}

# Comma-separated list of folders to ignore
BLACKLIST=${blacklist.join(",")}
`;

  return content;
}

/**
 * Interactive setup for .env configuration
 */
export async function setupEnvironment(): Promise<void> {
  console.log(chalk.blueBright("\n🔧 Environment Setup"));
  console.log(chalk.gray("Let's configure your project settings...\n"));

  // Step 1: Get root path
  let rootPath: string;

  try {
    rootPath = await input({
      message: "Enter the root path to scan for JSX components:",
      default: process.cwd(),
      validate: validatePathForSetup,
      transformer: (input: string) => {
        // Show the expanded/resolved path preview
        if (input.trim()) {
          const expanded = expandHomePath(input.trim());
          const resolved = resolve(expanded);
          return `${input} → ${resolved}`;
        }
        return input;
      }
    });
  } catch (error) {
    console.error(chalk.red("\n❌ Setup cancelled by user"));
    console.error(chalk.gray("You can run jsx-migr8 again to retry setup or create a .env file manually."));
    console.error(chalk.gray("Example .env file content:"));
    console.error(chalk.gray("ROOT_PATH=/path/to/your/project"));
    console.error(chalk.gray("BLACKLIST=node_modules,.git,dist,build"));
    process.exit(1);
  }

  // Expand and resolve the root path
  const expandedRootPath = expandHomePath(rootPath);
  const resolvedRootPath = resolve(expandedRootPath);

  // Step 2: Detect common blacklist directories with enhanced validation
  console.log(chalk.gray("\n🔍 Detecting common directories to ignore..."));
  const detectedBlacklist = detectBlacklistDirectories(resolvedRootPath);
  
  // Validate the detected blacklist
  const blacklistValidation = validateBlacklist(detectedBlacklist, resolvedRootPath);
  if (!blacklistValidation.valid) {
    console.warn(chalk.yellow("⚠️ Some detected directories may have issues:"));
    blacklistValidation.invalidEntries.forEach(invalid => {
      console.warn(chalk.gray(`   • "${invalid.entry}": ${invalid.reason}`));
    });
  }

  let blacklistDirs: string[];

  if (detectedBlacklist.length > 0) {
    console.log(
      chalk.green(
        `\nFound ${detectedBlacklist.length} common directories to ignore:`,
      ),
    );
    detectedBlacklist.forEach((dir) => console.log(chalk.gray(`  • ${dir}`)));

    const useDetected = await confirm({
      message: "Use these detected directories in your blacklist?",
      default: true,
    });

    if (useDetected) {
      blacklistDirs = [...detectedBlacklist];
    } else {
      blacklistDirs = [];
    }
  } else {
    console.log(chalk.yellow("No common directories detected to ignore."));
    blacklistDirs = [];
  }

  // Step 3: Allow manual addition of blacklist directories
  const addCustom = await confirm({
    message: "Would you like to add any additional directories to ignore?",
    default: false,
  });

  if (addCustom) {
    const customBlacklist = await input({
      message: "Enter additional directories to ignore (comma-separated):",
      validate: (input: string) => {
        if (!input.trim()) {
          return true; // Empty input is allowed
        }
        
        const dirs = input
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d.length > 0);
          
        if (dirs.length === 0) {
          return "Please provide valid directory names separated by commas";
        }
        
        // Validate the custom blacklist entries
        const customValidation = validateBlacklist(dirs);
        if (!customValidation.valid) {
          const firstError = customValidation.invalidEntries[0];
          return `Invalid entry "${firstError.entry}": ${firstError.reason}`;
        }
        
        return true;
      },
    });

    if (customBlacklist.trim()) {
      const customDirs = customBlacklist
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0);
        
      // Validate the custom directories before adding
      const customValidation = validateBlacklist(customDirs);
      if (customValidation.valid) {
        blacklistDirs = [...blacklistDirs, ...customValidation.validEntries];
      } else {
        console.warn(chalk.yellow("⚠️ Some custom entries were invalid and ignored:"));
        customValidation.invalidEntries.forEach(invalid => {
          console.warn(chalk.gray(`   • "${invalid.entry}": ${invalid.reason}`));
        });
        blacklistDirs = [...blacklistDirs, ...customValidation.validEntries];
      }
    }
  }

  // Step 4: Remove duplicates and sort
  blacklistDirs = Array.from(new Set(blacklistDirs)).sort();

  // Step 5: Show final configuration
  console.log(chalk.blueBright("\n📋 Final Configuration:"));
  console.log(chalk.green(`  Root Path: ${resolvedRootPath}`));
  console.log(
    chalk.green(
      `  Blacklist: ${blacklistDirs.length > 0 ? blacklistDirs.join(", ") : "none"}`,
    ),
  );

  // Step 6: Confirm and write .env file
  const confirmWrite = await confirm({
    message: "Create .env file with these settings?",
    default: true,
  });

  if (!confirmWrite) {
    console.log(
      chalk.yellow("Setup cancelled. You can run the setup again later."),
    );
    process.exit(1);
  }

  try {
    const envContent = generateEnvContent(resolvedRootPath, blacklistDirs);
    writeFileSync(".env", envContent, "utf8");

    console.log(chalk.green("\n✅ .env file created successfully!"));
    console.log(
      chalk.gray(
        "You can edit the .env file manually at any time to adjust these settings.",
      ),
    );
  } catch (error) {
    console.error(chalk.red("Failed to create .env file:"), error);
    process.exit(1);
  }
}

/**
 * Check if environment setup is needed and run it if required
 */
export async function ensureEnvironmentSetup(): Promise<void> {
  const envPath = ".env";

  // Check if .env file exists
  if (existsSync(envPath)) {
    // .env file exists, no setup needed
    return;
  }

  console.log(chalk.yellow("⚠️  No .env file found"));
  console.log(
    chalk.gray(
      "jsx-migr8 requires a .env file to configure your project settings.",
    ),
  );

  const shouldSetup = await confirm({
    message: "Would you like to create a .env file now?",
    default: true,
  });

  if (!shouldSetup) {
    console.log(chalk.red("\n❌ .env file is required to continue."));
    console.log(chalk.gray("You can create one manually with the following content:"));
    console.log(chalk.gray("\n# Example .env file"));
    console.log(chalk.cyan("ROOT_PATH=/path/to/your/project"));
    console.log(chalk.cyan("BLACKLIST=node_modules,.git,dist,build,out,.next,.cache"));
    console.log(chalk.gray("\nOr run jsx-migr8 again to use the interactive setup."));
    process.exit(1);
  }

  await setupEnvironment();
}

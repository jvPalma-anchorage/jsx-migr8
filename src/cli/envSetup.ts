/**********************************************************************
 * src/cli/envSetup.ts – Interactive .env file generation
 *********************************************************************/
import { input, confirm } from "@inquirer/prompts";
import { default as chalk } from "chalk";
import { readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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
 * Validate that the provided path exists and is a directory
 */
function validatePath(inputPath: string): boolean | string {
  try {
    const resolvedPath = resolve(inputPath);
    const stats = statSync(resolvedPath);

    if (!stats.isDirectory()) {
      return "Path must be a directory";
    }

    return true;
  } catch (error) {
    return "Path does not exist or is not accessible";
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
      validate: validatePath,
    });
  } catch (error) {
    console.error(chalk.red("Setup cancelled by user"));
    process.exit(1);
  }

  const resolvedRootPath = resolve(rootPath);

  // Step 2: Detect common blacklist directories
  console.log(chalk.gray("\n🔍 Detecting common directories to ignore..."));
  const detectedBlacklist = detectBlacklistDirectories(resolvedRootPath);

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
        const dirs = input
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d.length > 0);
        if (dirs.length === 0 && input.trim().length > 0) {
          return "Please provide valid directory names separated by commas";
        }
        return true;
      },
    });

    if (customBlacklist.trim()) {
      const customDirs = customBlacklist
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0);
      blacklistDirs = [...blacklistDirs, ...customDirs];
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
    console.log(
      chalk.gray("You can create one manually or run the setup later."),
    );
    process.exit(1);
  }

  await setupEnvironment();
}

#!/usr/bin/env tsx
/**
 * Test script for backup CLI integration
 * Verifies that all backup CLI flags work correctly
 */
import { execSync } from "child_process";
import chalk from "chalk";

interface TestCase {
  name: string;
  command: string;
  expectOutput?: string[];
  expectError?: boolean;
}

const testCases: TestCase[] = [
  {
    name: "List backups flag",
    command: "yarn cli --listBackups",
    expectOutput: ["Listing all backups", "No backups found"],
  },
  {
    name: "Backup management flag",
    command: "yarn cli --backup",
    expectOutput: ["backup operation"],
  },
  {
    name: "Verify backup flag (should error for non-existent backup)",
    command: "yarn cli --verifyBackup non-existent-backup",
    expectError: true,
  },
  {
    name: "Cleanup backups flag",
    command: "yarn cli --cleanupBackups",
    expectOutput: ["Cleaning up old backups", "No backups need cleanup"],
  },
  {
    name: "Interactive rollback flag",
    command: "yarn cli --rollback",
    expectOutput: ["No backups available"],
  },
];

async function runTest(testCase: TestCase): Promise<boolean> {
  console.log(chalk.blue(`\n🧪 Testing: ${testCase.name}`));
  console.log(chalk.gray(`   Command: ${testCase.command}`));

  try {
    const output = execSync(testCase.command, {
      encoding: "utf8",
      timeout: 10000,
      stdio: "pipe",
    });

    if (testCase.expectError) {
      console.log(chalk.red(`   ❌ Expected error but command succeeded`));
      return false;
    }

    if (testCase.expectOutput) {
      const hasExpectedOutput = testCase.expectOutput.some((expected) =>
        output.includes(expected),
      );

      if (hasExpectedOutput) {
        console.log(chalk.green(`   ✅ Output contains expected text`));
        return true;
      } else {
        console.log(
          chalk.yellow(`   ⚠️  Output doesn't contain expected text`),
        );
        console.log(chalk.gray(`   Actual output: ${output.slice(0, 200)}...`));
        return false;
      }
    }

    console.log(chalk.green(`   ✅ Command executed successfully`));
    return true;
  } catch (error: any) {
    if (testCase.expectError) {
      console.log(chalk.green(`   ✅ Expected error occurred`));
      return true;
    }

    console.log(chalk.red(`   ❌ Command failed: ${error.message}`));
    return false;
  }
}

async function runAllTests(): Promise<void> {
  console.log(chalk.bold("\n🚀 Running backup CLI integration tests\n"));

  let passed = 0;
  let total = testCases.length;

  for (const testCase of testCases) {
    const success = await runTest(testCase);
    if (success) passed++;
  }

  console.log(chalk.bold(`\n📊 Test Results: ${passed}/${total} passed`));

  if (passed === total) {
    console.log(chalk.green("🎉 All tests passed!"));
  } else {
    console.log(chalk.yellow(`⚠️  ${total - passed} test(s) failed`));
  }
}

async function main() {
  try {
    await runAllTests();
  } catch (error) {
    console.error(chalk.red("Test runner failed:"), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

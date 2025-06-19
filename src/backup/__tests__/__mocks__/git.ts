/**
 * Mock implementation for Git operations
 * Simulates git commands and repository state for testing
 */
import { errorSimulator } from "../helpers/jest-setup";
import { GitState } from "../../types";

interface MockGitConfig {
  hasRepo: boolean;
  branch: string;
  commitHash: string;
  commitMessage: string;
  author: { name: string; email: string };
  hasChanges: boolean;
  stagedFiles: number;
  unstagedFiles: number;
  untrackedFiles: number;
  remote?: {
    name: string;
    url: string;
    status: "up-to-date" | "ahead" | "behind" | "diverged" | "no-remote";
    aheadBy?: number;
    behindBy?: number;
  };
}

class MockGitRepository {
  private config: MockGitConfig = {
    hasRepo: true,
    branch: "main",
    commitHash: "a1b2c3d4e5f6789012345678901234567890abcd",
    commitMessage: "feat: implement backup system",
    author: {
      name: "Test User",
      email: "test@example.com",
    },
    hasChanges: false,
    stagedFiles: 0,
    unstagedFiles: 0,
    untrackedFiles: 0,
    remote: {
      name: "origin",
      url: "git@github.com:test/jsx-migr8.git",
      status: "up-to-date",
      aheadBy: 0,
      behindBy: 0,
    },
  };

  setConfig(newConfig: Partial<MockGitConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): MockGitConfig {
    return { ...this.config };
  }

  reset(): void {
    this.config = {
      hasRepo: true,
      branch: "main",
      commitHash: "a1b2c3d4e5f6789012345678901234567890abcd",
      commitMessage: "feat: implement backup system",
      author: {
        name: "Test User",
        email: "test@example.com",
      },
      hasChanges: false,
      stagedFiles: 0,
      unstagedFiles: 0,
      untrackedFiles: 0,
      remote: {
        name: "origin",
        url: "git@github.com:test/jsx-migr8.git",
        status: "up-to-date",
        aheadBy: 0,
        behindBy: 0,
      },
    };
  }

  async executeCommand(command: string, args: string[]): Promise<string> {
    const error = errorSimulator.shouldFail("git");
    if (error) throw error;

    if (!this.config.hasRepo) {
      throw new Error("fatal: not a git repository");
    }

    const fullCommand = `${command} ${args.join(" ")}`.trim();

    switch (fullCommand) {
      case "rev-parse --is-inside-work-tree":
        return "true";

      case "branch --show-current":
        return this.config.branch;

      case "rev-parse HEAD":
        return this.config.commitHash;

      case "rev-parse --short HEAD":
        return this.config.commitHash.substring(0, 7);

      case "log -1 --pretty=format:%s":
        return this.config.commitMessage;

      case "log -1 --pretty=format:%an":
        return this.config.author.name;

      case "log -1 --pretty=format:%ae":
        return this.config.author.email;

      case "status --porcelain":
        const statusLines: string[] = [];

        // Add staged files
        for (let i = 0; i < this.config.stagedFiles; i++) {
          statusLines.push(`M  staged-file-${i}.ts`);
        }

        // Add unstaged files
        for (let i = 0; i < this.config.unstagedFiles; i++) {
          statusLines.push(` M unstaged-file-${i}.ts`);
        }

        // Add untracked files
        for (let i = 0; i < this.config.untrackedFiles; i++) {
          statusLines.push(`?? untracked-file-${i}.ts`);
        }

        return statusLines.join("\n");

      case "remote":
        return this.config.remote ? this.config.remote.name : "";

      case "remote get-url origin":
        return this.config.remote?.url || "";

      case "status --ahead-behind origin/main":
        if (!this.config.remote) {
          throw new Error("fatal: no upstream configured");
        }
        const ahead = this.config.remote.aheadBy || 0;
        const behind = this.config.remote.behindBy || 0;
        return `ahead ${ahead}, behind ${behind}`;

      case "diff --name-only":
        const diffFiles: string[] = [];
        for (let i = 0; i < this.config.unstagedFiles; i++) {
          diffFiles.push(`unstaged-file-${i}.ts`);
        }
        return diffFiles.join("\n");

      case "diff --cached --name-only":
        const cachedFiles: string[] = [];
        for (let i = 0; i < this.config.stagedFiles; i++) {
          cachedFiles.push(`staged-file-${i}.ts`);
        }
        return cachedFiles.join("\n");

      case 'stash push -m "Pre-migration backup stash"':
        return "Saved working directory and index state WIP on main: a1b2c3d Pre-migration backup stash";

      case "stash pop":
        return "On branch main\nChanges not staged for commit:\n  modified:   src/components/Button.tsx";

      case "add .":
        this.config.stagedFiles +=
          this.config.unstagedFiles + this.config.untrackedFiles;
        this.config.unstagedFiles = 0;
        this.config.untrackedFiles = 0;
        return "";

      case "reset --hard":
        this.config.hasChanges = false;
        this.config.stagedFiles = 0;
        this.config.unstagedFiles = 0;
        this.config.untrackedFiles = 0;
        return `HEAD is now at ${this.config.commitHash.substring(0, 7)} ${this.config.commitMessage}`;

      default:
        if (fullCommand.startsWith("commit -m")) {
          const message = fullCommand.match(/-m "(.+)"/)?.[1] || "test commit";
          this.config.commitMessage = message;
          this.config.stagedFiles = 0;
          return `[${this.config.branch} ${this.config.commitHash.substring(0, 7)}] ${message}`;
        }

        if (fullCommand.startsWith("tag")) {
          const tag = args[0] || "v1.0.0";
          return `Created tag ${tag}`;
        }

        throw new Error(`Unknown git command: ${fullCommand}`);
    }
  }

  getGitState(): GitState {
    if (!this.config.hasRepo) {
      throw new Error("Not a git repository");
    }

    return {
      branch: this.config.branch,
      commitHash: this.config.commitHash,
      shortHash: this.config.commitHash.substring(0, 7),
      commitMessage: this.config.commitMessage,
      author: this.config.author,
      workingDir: {
        hasChanges:
          this.config.hasChanges ||
          this.config.stagedFiles > 0 ||
          this.config.unstagedFiles > 0 ||
          this.config.untrackedFiles > 0,
        stagedFiles: this.config.stagedFiles,
        unstagedFiles: this.config.unstagedFiles,
        untrackedFiles: this.config.untrackedFiles,
      },
      remote: this.config.remote,
    };
  }
}

// Global mock git repository
const mockGitRepo = new MockGitRepository();

// Mock git integration class
export class MockGitIntegration {
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  async isGitRepository(projectRoot: string): Promise<boolean> {
    const error = errorSimulator.shouldFail("isGitRepository");
    if (error) throw error;

    return mockGitRepo.getConfig().hasRepo;
  }

  async captureGitState(projectRoot: string): Promise<GitState | null> {
    const error = errorSimulator.shouldFail("captureGitState");
    if (error) throw error;

    if (!this.enabled) {
      return null;
    }

    try {
      return mockGitRepo.getGitState();
    } catch {
      return null;
    }
  }

  async createRollbackCommit(
    backupId: string,
    restoredFiles: string[],
    projectRoot: string,
  ): Promise<string> {
    const error = errorSimulator.shouldFail("createRollbackCommit");
    if (error) throw error;

    if (!this.enabled) {
      throw new Error("Git integration is disabled");
    }

    const commitMessage = `rollback: restore from backup ${backupId}\n\nRestored files:\n${restoredFiles.map((f) => `- ${f}`).join("\n")}`;

    // Simulate git operations
    await mockGitRepo.executeCommand("add", ["."]);
    const result = await mockGitRepo.executeCommand("commit", [
      "-m",
      `"${commitMessage}"`,
    ]);

    return mockGitRepo.getConfig().commitHash;
  }

  async stashChanges(message: string, projectRoot: string): Promise<string> {
    const error = errorSimulator.shouldFail("stashChanges");
    if (error) throw error;

    return mockGitRepo.executeCommand("stash", ["push", "-m", `"${message}"`]);
  }

  async restoreStash(projectRoot: string): Promise<void> {
    const error = errorSimulator.shouldFail("restoreStash");
    if (error) throw error;

    await mockGitRepo.executeCommand("stash", ["pop"]);
  }

  async hasUncommittedChanges(projectRoot: string): Promise<boolean> {
    const error = errorSimulator.shouldFail("hasUncommittedChanges");
    if (error) throw error;

    const status = await mockGitRepo.executeCommand("status", ["--porcelain"]);
    return status.trim().length > 0;
  }

  async getCurrentBranch(projectRoot: string): Promise<string> {
    const error = errorSimulator.shouldFail("getCurrentBranch");
    if (error) throw error;

    return mockGitRepo.executeCommand("branch", ["--show-current"]);
  }

  async getLastCommitHash(projectRoot: string): Promise<string> {
    const error = errorSimulator.shouldFail("getLastCommitHash");
    if (error) throw error;

    return mockGitRepo.executeCommand("rev-parse", ["HEAD"]);
  }
}

// Mock utilities for testing
export const mockGit = {
  /**
   * Set git repository configuration
   */
  setConfig: (config: Partial<MockGitConfig>) => {
    mockGitRepo.setConfig(config);
  },

  /**
   * Get current git configuration
   */
  getConfig: () => {
    return mockGitRepo.getConfig();
  },

  /**
   * Reset git repository to default state
   */
  reset: () => {
    mockGitRepo.reset();
  },

  /**
   * Simulate git repository not existing
   */
  simulateNoRepo: () => {
    mockGitRepo.setConfig({ hasRepo: false });
  },

  /**
   * Simulate clean working directory
   */
  simulateCleanRepo: () => {
    mockGitRepo.setConfig({
      hasChanges: false,
      stagedFiles: 0,
      unstagedFiles: 0,
      untrackedFiles: 0,
    });
  },

  /**
   * Simulate dirty working directory
   */
  simulateDirtyRepo: (staged = 2, unstaged = 3, untracked = 1) => {
    mockGitRepo.setConfig({
      hasChanges: true,
      stagedFiles: staged,
      unstagedFiles: unstaged,
      untrackedFiles: untracked,
    });
  },

  /**
   * Simulate different branch
   */
  simulateBranch: (branch: string) => {
    mockGitRepo.setConfig({ branch });
  },

  /**
   * Simulate remote status
   */
  simulateRemoteStatus: (
    status: "up-to-date" | "ahead" | "behind" | "diverged" | "no-remote",
    aheadBy = 0,
    behindBy = 0,
  ) => {
    if (status === "no-remote") {
      mockGitRepo.setConfig({ remote: undefined });
    } else {
      mockGitRepo.setConfig({
        remote: {
          name: "origin",
          url: "git@github.com:test/jsx-migr8.git",
          status,
          aheadBy,
          behindBy,
        },
      });
    }
  },

  /**
   * Execute mock git command
   */
  executeCommand: (command: string, args: string[]) => {
    return mockGitRepo.executeCommand(command, args);
  },

  /**
   * Create mock Git integration instance
   */
  createGitIntegration: (enabled = true) => {
    return new MockGitIntegration(enabled);
  },
};

export default mockGit;

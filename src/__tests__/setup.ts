// Jest setup file for all tests
import "@jest/globals";

// Mock the CLI config to prevent yargs from parsing during tests
jest.mock("@/cli/config", () => ({
  argv: {
    root: '/test/root',
    blacklist: 'node_modules',
    interactive: false,
    showProps: false,
    yolo: false,
    dryRun: true,
    report: './report/props-usage.json',
    info: false,
    debug: false,
    backup: false,
    skipBackup: true,
    $0: 'test'
  }
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Keep error and warn, but silence others unless explicitly needed
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Increase timeout for integration tests
jest.setTimeout(30000);

// Add custom matchers if needed
expect.extend({
  toBeValidPath(received: string) {
    const pass = typeof received === "string" && received.length > 0;

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid path`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid path`,
        pass: false,
      };
    }
  },
});

// Global test utilities
export const testUtils = {
  createTempDir: () => `/tmp/jsx-migr8-test-${Date.now()}`,
  mockFs: () => {
    // Helper for mocking file system operations
    return {
      readFileSync: jest.fn(),
      writeFileSync: jest.fn(),
      existsSync: jest.fn(),
      mkdirSync: jest.fn(),
      readdirSync: jest.fn(),
    };
  },
};

// Type augmentation for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidPath(): R;
      toBeValidBackupId?(): R;
    }
  }
}

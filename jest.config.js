/** @type {import('jest').Config} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",

  // Test file patterns
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.test.ts",
    "<rootDir>/src/**/*.test.ts",
  ],

  // Coverage settings
  collectCoverage: true,
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "lcov", "html", "json"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/__mocks__/**",
    "!src/**/__fixtures__/**",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.d.ts",
    "!src/cli/index.ts", // CLI entry point
    "!src/types/**", // Type definitions
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "src/utils/": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "src/analyzer/": {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    "src/backup/": {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },

  // Module resolution
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],

  // TypeScript configuration - removed deprecated globals section

  // Test timeout
  testTimeout: 30000,

  // Mock settings
  clearMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Fail fast
  bail: false,

  // Workers
  maxWorkers: "50%",

  // Error handling
  errorOnDeprecated: true,

  // Watch settings
  watchPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/coverage/",
    "<rootDir>/\\.migr8-backups/",
  ],

  // Test results processor
  testResultsProcessor: undefined,

  // Custom matchers
  snapshotSerializers: [],

  // ES module support
  extensionsToTreatAsEsm: [".ts"],

  // Transform ignore patterns - don't transform chalk
  transformIgnorePatterns: [
    "node_modules/(?!(chalk|#ansi-styles|#supports-color)/)"
  ],

  // Update transform to handle ES modules
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "node",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
        },
      },
    ],
  },
};

#!/usr/bin/env node

/**
 * Main entry point for jsx-migr8 with dependency injection
 * This replaces the old CLI entry point with a DI-based approach
 */

import { runDICLI } from './cli/di-cli';

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Main execution
(async () => {
  try {
    await runDICLI();
  } catch (error) {
    console.error('jsx-migr8 failed:', error);
    process.exit(1);
  }
})();
/**
 * Mock implementation of @inquirer/prompts for testing CLI interactions
 */
import { errorSimulator } from "../helpers/jest-setup";

// Mock response queue for predictable testing
class MockResponseQueue {
  private responses: Array<{ type: string; response: any }> = [];
  private index = 0;

  addResponse(type: string, response: any): void {
    this.responses.push({ type, response });
  }

  getNextResponse(expectedType: string): any {
    if (this.index >= this.responses.length) {
      throw new Error(`No more mock responses available for ${expectedType}`);
    }

    const { type, response } = this.responses[this.index++];

    if (type !== expectedType) {
      throw new Error(
        `Expected mock response type ${expectedType}, got ${type}`,
      );
    }

    return response;
  }

  reset(): void {
    this.responses = [];
    this.index = 0;
  }

  hasMoreResponses(): boolean {
    return this.index < this.responses.length;
  }
}

const mockQueue = new MockResponseQueue();

// Mock prompt implementations
export async function select<T = string>(options: {
  message: string;
  choices: Array<{ name: string; value: T; description?: string }>;
  default?: T;
}): Promise<T> {
  const error = errorSimulator.shouldFail("select");
  if (error) throw error;

  const response = mockQueue.getNextResponse("select");

  // Validate that response is a valid choice
  const validValues = options.choices.map((choice) => choice.value);
  if (!validValues.includes(response)) {
    throw new Error(
      `Invalid mock response: ${response} not in valid choices: ${validValues.join(", ")}`,
    );
  }

  return response;
}

export async function input(options: {
  message: string;
  default?: string;
  validate?: (input: string) => boolean | string;
}): Promise<string> {
  const error = errorSimulator.shouldFail("input");
  if (error) throw error;

  const response = mockQueue.getNextResponse("input");

  // Run validation if provided
  if (options.validate) {
    const validationResult = options.validate(response);
    if (validationResult !== true) {
      throw new Error(`Validation failed: ${validationResult}`);
    }
  }

  return response;
}

export async function confirm(options: {
  message: string;
  default?: boolean;
}): Promise<boolean> {
  const error = errorSimulator.shouldFail("confirm");
  if (error) throw error;

  const response = mockQueue.getNextResponse("confirm");

  if (typeof response !== "boolean") {
    throw new Error(
      `Expected boolean response for confirm, got ${typeof response}: ${response}`,
    );
  }

  return response;
}

export async function checkbox<T = string>(options: {
  message: string;
  choices: Array<{ name: string; value: T; checked?: boolean }>;
}): Promise<T[]> {
  const error = errorSimulator.shouldFail("checkbox");
  if (error) throw error;

  const response = mockQueue.getNextResponse("checkbox");

  if (!Array.isArray(response)) {
    throw new Error(
      `Expected array response for checkbox, got ${typeof response}: ${response}`,
    );
  }

  // Validate that all responses are valid choices
  const validValues = options.choices.map((choice) => choice.value);
  for (const value of response) {
    if (!validValues.includes(value)) {
      throw new Error(
        `Invalid mock response: ${value} not in valid choices: ${validValues.join(", ")}`,
      );
    }
  }

  return response;
}

export async function password(options: {
  message: string;
  mask?: string;
  validate?: (input: string) => boolean | string;
}): Promise<string> {
  const error = errorSimulator.shouldFail("password");
  if (error) throw error;

  const response = mockQueue.getNextResponse("password");

  // Run validation if provided
  if (options.validate) {
    const validationResult = options.validate(response);
    if (validationResult !== true) {
      throw new Error(`Validation failed: ${validationResult}`);
    }
  }

  return response;
}

// Mock utilities for testing
export const mockInquirer = {
  /**
   * Queue a response for the next prompt of the specified type
   */
  queueResponse: (type: string, response: any) => {
    mockQueue.addResponse(type, response);
  },

  /**
   * Queue multiple responses at once
   */
  queueResponses: (responses: Array<{ type: string; response: any }>) => {
    responses.forEach(({ type, response }) => {
      mockQueue.addResponse(type, response);
    });
  },

  /**
   * Reset all queued responses
   */
  reset: () => {
    mockQueue.reset();
  },

  /**
   * Check if there are more responses in the queue
   */
  hasMoreResponses: () => {
    return mockQueue.hasMoreResponses();
  },

  /**
   * Create common response patterns for testing
   */
  createBackupWorkflow: () => {
    return [
      { type: "select", response: "create" },
      { type: "select", response: "current" },
      { type: "input", response: "test-backup" },
      { type: "input", response: "Test backup description" },
      { type: "confirm", response: false }, // No tags
    ];
  },

  createRestoreWorkflow: () => {
    return [
      { type: "select", response: "restore" },
      { type: "select", response: "test-backup-id" },
      { type: "confirm", response: true }, // Confirm restore
    ];
  },

  createCleanupWorkflow: () => {
    return [
      { type: "select", response: "cleanup" },
      { type: "confirm", response: true }, // Confirm cleanup
    ];
  },

  createVerificationWorkflow: () => {
    return [
      { type: "select", response: "verify" },
      { type: "select", response: "test-backup-id" },
    ];
  },
};

export default {
  select,
  input,
  confirm,
  checkbox,
  password,
  mockInquirer,
};

/**
 * TypeScript declarations for custom Jest matchers
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Checks if a string is a valid backup ID format
       */
      toBeValidBackupId(): R;

      /**
       * Checks if a string is a valid SHA-256 checksum
       */
      toBeValidChecksum(): R;

      /**
       * Checks if a backup is properly structured
       */
      toBeValidBackupStructure(): R;

      /**
       * Checks if a path is within safe boundaries
       */
      toBeSafePath(): R;

      /**
       * Checks if metadata contains required fields
       */
      toHaveValidMetadata(): R;
    }
  }
}

export {};

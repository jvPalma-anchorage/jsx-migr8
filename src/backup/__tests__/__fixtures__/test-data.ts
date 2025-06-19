/**
 * Test fixtures and sample data for backup system tests
 */
import crypto from "node:crypto";
import {
  BackupMetadata,
  MigrationContext,
  BackedUpFile,
  GitState,
  ActiveBackup,
} from "../../types";

/**
 * Generate deterministic test data for consistent testing
 */
export class TestDataGenerator {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  /**
   * Generate a pseudo-random number based on seed
   */
  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generate a random string of specified length
   */
  randomString(
    length: number,
    charset: string = "abcdefghijklmnopqrstuvwxyz0123456789",
  ): string {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(this.random() * charset.length)];
    }
    return result;
  }

  /**
   * Generate a random file path
   */
  randomFilePath(): string {
    const dirs = ["src", "components", "utils", "hooks", "pages", "styles"];
    const files = ["Button", "Card", "Modal", "Header", "Footer", "Layout"];
    const exts = [".tsx", ".ts", ".jsx", ".js", ".css", ".scss"];

    const dirCount = Math.floor(this.random() * 3) + 1;
    const pathParts = [];

    for (let i = 0; i < dirCount; i++) {
      pathParts.push(dirs[Math.floor(this.random() * dirs.length)]);
    }

    const fileName = files[Math.floor(this.random() * files.length)];
    const ext = exts[Math.floor(this.random() * exts.length)];

    return `${pathParts.join("/")}/${fileName}${ext}`;
  }

  /**
   * Generate sample file content
   */
  generateFileContent(filePath: string): string {
    const ext = filePath.split(".").pop();

    switch (ext) {
      case "tsx":
      case "jsx":
        return this.generateReactComponent(filePath);
      case "ts":
      case "js":
        return this.generateUtilityFile(filePath);
      case "css":
      case "scss":
        return this.generateStyleSheet(filePath);
      default:
        return this.generateGenericFile(filePath);
    }
  }

  private generateReactComponent(filePath: string): string {
    const componentName =
      filePath.split("/").pop()?.split(".")[0] || "Component";

    return `import React from 'react';
import { ${componentName}Props } from './types';

/**
 * ${componentName} component
 * Auto-generated test component
 */
export const ${componentName}: React.FC<${componentName}Props> = ({ 
  children,
  className,
  onClick,
  ...props 
}) => {
  return (
    <div className={\`${componentName.toLowerCase()} \${className || ''}\`} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

${componentName}.displayName = '${componentName}';

export default ${componentName};
`;
  }

  private generateUtilityFile(filePath: string): string {
    const fileName = filePath.split("/").pop()?.split(".")[0] || "utils";

    return `/**
 * ${fileName} utilities
 * Auto-generated test utilities
 */

export const ${fileName} = {
  /**
   * Convert string to title case
   */
  toTitleCase: (str: string): string => {
    return str.replace(/\\w\\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  /**
   * Generate random ID
   */
  generateId: (): string => {
    return Math.random().toString(36).substr(2, 9);
  },

  /**
   * Format date
   */
  formatDate: (date: Date): string => {
    return date.toISOString().split('T')[0];
  }
};

export default ${fileName};
`;
  }

  private generateStyleSheet(filePath: string): string {
    const componentName =
      filePath.split("/").pop()?.split(".")[0] || "component";

    return `.${componentName.toLowerCase()} {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  margin: 0.5rem;
  border-radius: 0.25rem;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  &--primary {
    background-color: #007bff;
    color: white;
  }
  
  &--secondary {
    background-color: #6c757d;
    color: white;
  }
}

.${componentName.toLowerCase()}__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.${componentName.toLowerCase()}__content {
  flex: 1;
  line-height: 1.5;
}
`;
  }

  private generateGenericFile(filePath: string): string {
    const lines = Math.floor(this.random() * 20) + 5;
    const content = [];

    for (let i = 0; i < lines; i++) {
      const lineLength = Math.floor(this.random() * 80) + 20;
      content.push(
        this.randomString(lineLength, "abcdefghijklmnopqrstuvwxyz "),
      );
    }

    return content.join("\n");
  }
}

/**
 * Predefined test data sets
 */
export const TEST_FILES = {
  SIMPLE_REACT_COMPONENT: {
    path: "src/components/Button.tsx",
    content: `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary' }) => {
  return (
    <button className={\`btn btn--\${variant}\`} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;`,
  },

  UTILITY_FUNCTIONS: {
    path: "src/utils/helpers.ts",
    content: `export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
};

export const isEmpty = (value: any): boolean => {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0);
};`,
  },

  STYLE_SHEET: {
    path: "src/styles/components.css",
    content: `.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn--primary {
  background-color: #3b82f6;
  color: white;
}

.btn--primary:hover {
  background-color: #2563eb;
}

.btn--secondary {
  background-color: #6b7280;
  color: white;
}

.btn--secondary:hover {
  background-color: #4b5563;
}`,
  },

  CONFIG_FILE: {
    path: "package.json",
    content: `{
  "name": "test-project",
  "version": "1.0.0",
  "description": "Test project for backup system",
  "main": "index.js",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "jest"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^4.9.0"
  }
}`,
  },
};

/**
 * Generate sample backed up files
 */
export function generateBackedUpFiles(count: number = 5): BackedUpFile[] {
  const generator = new TestDataGenerator();
  const files: BackedUpFile[] = [];

  for (let i = 0; i < count; i++) {
    const filePath = generator.randomFilePath();
    const content = generator.generateFileContent(filePath);
    const checksum = crypto
      .createHash("sha256")
      .update(content, "utf8")
      .digest("hex");

    files.push({
      originalPath: `/test/project/${filePath}`,
      relativePath: filePath,
      encodedPath: Buffer.from(filePath).toString("base64"),
      size: Buffer.byteLength(content, "utf8"),
      lastModified: new Date(Date.now() - Math.random() * 86400000), // Random date within last day
      checksum,
      status: "backed-up",
    });
  }

  return files;
}

/**
 * Generate sample migration context
 */
export function generateMigrationContext(): MigrationContext {
  return {
    migrationRuleFile: "test-migration-rule.json",
    componentSpec: {
      name: "TestComponent",
      description: "Test component for migration",
      sourcePackage: "@old/design-system",
      targetPackage: "@new/design-system",
    } as any,
    sourcePackage: "@old/design-system",
    targetPackage: "@new/design-system",
    componentName: "TestComponent",
    cliArgs: {
      root: "/test/project",
      dryRun: false,
      yolo: false,
      interactive: true,
    },
    timestamp: new Date(),
    user: "test-user",
    mode: "interactive",
  };
}

/**
 * Generate sample Git state
 */
export function generateGitState(hasChanges: boolean = false): GitState {
  return {
    branch: "feature/test-migration",
    commitHash: "a1b2c3d4e5f6789012345678901234567890abcd",
    shortHash: "a1b2c3d",
    commitMessage: "feat: add new component migration",
    author: {
      name: "Test User",
      email: "test@example.com",
    },
    workingDir: {
      hasChanges,
      stagedFiles: hasChanges ? 2 : 0,
      unstagedFiles: hasChanges ? 1 : 0,
      untrackedFiles: hasChanges ? 1 : 0,
    },
    remote: {
      name: "origin",
      url: "git@github.com:test/jsx-migr8.git",
      status: "up-to-date",
      aheadBy: 0,
      behindBy: 0,
    },
  };
}

/**
 * Generate complete backup metadata
 */
export function generateBackupMetadata(
  overrides: Partial<BackupMetadata> = {},
): BackupMetadata {
  const files = generateBackedUpFiles();
  const migration = generateMigrationContext();
  const gitState = generateGitState();

  const baseMetadata: BackupMetadata = {
    id: `${Date.now()}-test-component-12345678`,
    name: "Test Migration Backup",
    description: "Backup created for testing purposes",
    createdAt: new Date(),
    projectRoot: "/test/project",
    migration,
    gitState,
    files,
    stats: {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      successCount: files.length,
      failedCount: 0,
      durationMs: 1500,
    },
    version: "1.0.0",
    tags: ["test", "migration", "auto"],
    canAutoClean: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  };

  return { ...baseMetadata, ...overrides };
}

/**
 * Generate active backup entries
 */
export function generateActiveBackups(count: number = 3): ActiveBackup[] {
  const backups: ActiveBackup[] = [];

  for (let i = 0; i < count; i++) {
    const metadata = generateBackupMetadata({
      id: `${Date.now() - i * 1000}-backup-${i}-${crypto.randomBytes(4).toString("hex")}`,
      name: `Backup ${i + 1}`,
      createdAt: new Date(Date.now() - i * 86400000), // Each backup is one day older
    });

    backups.push({
      id: metadata.id,
      name: metadata.name,
      createdAt: metadata.createdAt,
      fileCount: metadata.stats.totalFiles,
      totalSize: metadata.stats.totalSize,
      migration: {
        componentName: metadata.migration.componentName,
        sourcePackage: metadata.migration.sourcePackage,
        targetPackage: metadata.migration.targetPackage,
        mode: metadata.migration.mode,
      },
      integrityValid: true,
      lastVerified: new Date(metadata.createdAt.getTime() + 60000), // Verified 1 minute after creation
      tags: metadata.tags,
    });
  }

  return backups;
}

/**
 * Test project structures
 */
export const TEST_PROJECT_STRUCTURES = {
  SIMPLE_REACT_APP: {
    "src/components/Button.tsx": TEST_FILES.SIMPLE_REACT_COMPONENT.content,
    "src/utils/helpers.ts": TEST_FILES.UTILITY_FUNCTIONS.content,
    "src/styles/components.css": TEST_FILES.STYLE_SHEET.content,
    "package.json": TEST_FILES.CONFIG_FILE.content,
    "README.md":
      "# Test Project\n\nThis is a test project for backup system testing.",
    "tsconfig.json": `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}`,
  },

  LARGE_PROJECT: (() => {
    const generator = new TestDataGenerator(54321);
    const structure: Record<string, string> = {};

    // Generate 50 random files
    for (let i = 0; i < 50; i++) {
      const filePath = generator.randomFilePath();
      const content = generator.generateFileContent(filePath);
      structure[filePath] = content;
    }

    return structure;
  })(),

  EMPTY_PROJECT: {
    "package.json": '{"name": "empty-project", "version": "1.0.0"}',
  },
};

/**
 * Error scenarios for testing
 */
export const ERROR_SCENARIOS = {
  FILE_NOT_FOUND: {
    code: "ENOENT",
    message: "ENOENT: no such file or directory",
  },

  PERMISSION_DENIED: {
    code: "EACCES",
    message: "EACCES: permission denied",
  },

  DISK_FULL: {
    code: "ENOSPC",
    message: "ENOSPC: no space left on device",
  },

  FILE_TOO_LARGE: {
    code: "EFBIG",
    message: "EFBIG: file too large",
  },

  TOO_MANY_FILES: {
    code: "EMFILE",
    message: "EMFILE: too many open files",
  },

  NETWORK_ERROR: {
    code: "ENETUNREACH",
    message: "ENETUNREACH: network is unreachable",
  },

  TIMEOUT_ERROR: {
    code: "ETIMEDOUT",
    message: "ETIMEDOUT: operation timed out",
  },
};

/**
 * Performance test data
 */
export const PERFORMANCE_TEST_DATA = {
  SMALL_FILES: generateBackedUpFiles(10),
  MEDIUM_FILES: generateBackedUpFiles(100),
  LARGE_FILES: generateBackedUpFiles(1000),

  // Generate files with different sizes
  MIXED_SIZE_FILES: (() => {
    const files = generateBackedUpFiles(20);
    files.forEach((file, index) => {
      // Simulate different file sizes
      const sizeFactor = Math.pow(10, index % 4); // 1B, 10B, 100B, 1KB patterns
      file.size = Math.floor(file.size * sizeFactor);
    });
    return files;
  })(),
};

// Named exports
export {
  TestDataGenerator,
  TEST_FILES,
  generateBackedUpFiles,
  generateMigrationContext,
  generateGitState,
  generateBackupMetadata,
  generateActiveBackups,
  TEST_PROJECT_STRUCTURES,
  ERROR_SCENARIOS,
  PERFORMANCE_TEST_DATA,
};

// Convenience functions for common patterns
export function generateTestProjectStructure(
  size: "small" | "medium" | "large" = "small",
): Record<string, string> {
  switch (size) {
    case "small":
      return TEST_PROJECT_STRUCTURES.SIMPLE_REACT_APP;
    case "medium":
      return {
        ...TEST_PROJECT_STRUCTURES.SIMPLE_REACT_APP,
        ...Object.fromEntries(
          Object.entries(TEST_PROJECT_STRUCTURES.LARGE_PROJECT).slice(0, 10),
        ),
      };
    case "large":
      return TEST_PROJECT_STRUCTURES.LARGE_PROJECT;
    default:
      return TEST_PROJECT_STRUCTURES.SIMPLE_REACT_APP;
  }
}

export function generateLargeTestData(fileCount: number = 100): {
  files: BackedUpFile[];
  structure: Record<string, string>;
} {
  const generator = new TestDataGenerator();
  const files: BackedUpFile[] = [];
  const structure: Record<string, string> = {};

  for (let i = 0; i < fileCount; i++) {
    const filePath = generator.randomFilePath();
    const content = generator.generateFileContent(filePath);
    const checksum = crypto
      .createHash("sha256")
      .update(content, "utf8")
      .digest("hex");

    files.push({
      originalPath: `/test/project/${filePath}`,
      relativePath: filePath,
      encodedPath: Buffer.from(filePath).toString("base64"),
      size: Buffer.byteLength(content, "utf8"),
      lastModified: new Date(Date.now() - Math.random() * 86400000),
      checksum,
      status: "backed-up",
    });

    structure[filePath] = content;
  }

  return { files, structure };
}

// Remove the default export to fix duplicate export errors

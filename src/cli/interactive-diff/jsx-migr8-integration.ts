/**********************************************************************
 *  src/cli/interactive-diff/jsx-migr8-integration.ts – jsx-migr8 CLI integration
 *********************************************************************/

import { 
  InteractiveMigrationProcessor, 
  MigrationCandidate, 
  runInteractiveDryRun,
  confirmMigrations 
} from './migration-integration';
import chalk from 'chalk';

/**
 * Integration point for jsx-migr8 dry run with interactive diff viewer
 * This can be called from the existing migrateComponents function
 */
export async function showInteractiveDryRun(
  migrationData: {
    filePath: string;
    originalContent: string;
    migratedContent: string;
    rule: {
      name: string;
      description: string;
      sourcePackage: string;
      targetPackage: string;
      componentName: string;
      propsChanged?: string[];
      importsChanged?: string[];
    };
  }[]
): Promise<void> {
  console.log(chalk.blue('\n🔍 Starting Interactive Dry Run'));
  console.log(chalk.gray('Review each change in the 4-quadrant matrix layout'));
  console.log(chalk.gray('Use Tab to navigate, h for help, y/n/s for actions\n'));

  // Convert migration data to candidates
  const candidates: MigrationCandidate[] = migrationData.map(data => 
    InteractiveMigrationProcessor.createMigrationCandidate(
      data.filePath,
      data.originalContent,
      data.migratedContent,
      data.rule
    )
  );

  // Run interactive dry run
  const results = await runInteractiveDryRun(candidates);

  // Show final summary
  console.log(chalk.blue('\n📊 Interactive Dry Run Complete'));
  console.log(`✅ Confirmed: ${results.confirmed.length} changes`);
  console.log(`🔧 Needs adjustment: ${results.needsAdjustment.length} changes`);
  console.log(`⏭️  Skipped: ${results.skipped.length} changes`);

  if (results.userQuit) {
    console.log(chalk.yellow('⚠️  Process was interrupted by user'));
  }
}

/**
 * Integration point for jsx-migr8 migration confirmation
 * This can be called before applying actual file changes
 */
export async function showInteractiveMigrationConfirmation(
  migrationData: {
    filePath: string;
    originalContent: string;
    migratedContent: string;
    rule: {
      name: string;
      description: string;
      sourcePackage: string;
      targetPackage: string;
      componentName: string;
      propsChanged?: string[];
      importsChanged?: string[];
    };
  }[]
): Promise<{
  confirmed: typeof migrationData;
  needsAdjustment: typeof migrationData;
  cancelled: boolean;
}> {
  console.log(chalk.yellow('\n⚠️  MIGRATION CONFIRMATION'));
  console.log(chalk.yellow('Review each change before applying to your files\n'));

  // Convert migration data to candidates
  const candidates: MigrationCandidate[] = migrationData.map(data => 
    InteractiveMigrationProcessor.createMigrationCandidate(
      data.filePath,
      data.originalContent,
      data.migratedContent,
      data.rule
    )
  );

  // Run confirmation process
  const confirmedCandidates = await confirmMigrations(candidates);

  if (confirmedCandidates.length === 0) {
    console.log(chalk.red('❌ No changes confirmed - migration cancelled'));
    return {
      confirmed: [],
      needsAdjustment: [],
      cancelled: true,
    };
  }

  // Convert back to original format
  const confirmedData = confirmedCandidates.map(candidate => {
    return migrationData.find(data => data.filePath === candidate.filePath)!;
  });

  const needsAdjustmentData = migrationData.filter(data => 
    !confirmedCandidates.some(candidate => candidate.filePath === data.filePath)
  );

  console.log(chalk.green(`✅ ${confirmedData.length} changes confirmed for migration`));
  
  return {
    confirmed: confirmedData,
    needsAdjustment: needsAdjustmentData,
    cancelled: false,
  };
}

/**
 * Helper function to add interactive diff to existing jsx-migr8 CLI options
 * This can be integrated into the main CLI menu
 */
export function addInteractiveDiffOptions() {
  return {
    interactiveDryRun: {
      name: '🔍 Interactive Dry Run',
      value: 'interactiveDryRun',
      description: 'Preview changes with 4-quadrant terminal diff viewer',
    },
    interactiveMigration: {
      name: '🚀 Interactive Migration',
      value: 'interactiveMigration', 
      description: 'Migrate with confirmation for each change',
    },
  };
}

/**
 * Example usage in jsx-migr8 CLI integration
 */
export async function handleInteractiveOption(
  option: string,
  migrationData: any[]
): Promise<void> {
  switch (option) {
    case 'interactiveDryRun':
      await showInteractiveDryRun(migrationData);
      break;
    case 'interactiveMigration':
      const result = await showInteractiveMigrationConfirmation(migrationData);
      if (!result.cancelled && result.confirmed.length > 0) {
        console.log(chalk.green('Proceeding with confirmed changes...'));
        // Apply confirmed changes here
      }
      break;
    default:
      console.log(chalk.red('Unknown interactive option'));
  }
}

/**
 * Quick demo function for testing the integration
 */
export async function demoIntegration(): Promise<void> {
  const sampleMigrationData = [
    {
      filePath: 'src/components/Button.tsx',
      originalContent: `import { Button } from '@material-ui/core';

export const MyButton = () => {
  return <Button variant="contained">Click me</Button>;
};`,
      migratedContent: `import { Button } from '@mui/material';

export const MyButton = () => {
  return <Button variant="contained">Click me</Button>;
};`,
      rule: {
        name: 'Material-UI v4 to v5 Import Migration',
        description: 'Update import paths from @material-ui/core to @mui/material',
        sourcePackage: '@material-ui/core',
        targetPackage: '@mui/material',
        componentName: 'Button',
        importsChanged: ['@material-ui/core → @mui/material'],
      },
    },
  ];

  console.log(chalk.blue('🚀 jsx-migr8 Interactive Diff Integration Demo'));
  console.log(chalk.blue(''.padEnd(50, '=')));
  
  await showInteractiveDryRun(sampleMigrationData);
}

// Run demo if this file is executed directly
if (require.main === module) {
  demoIntegration()
    .then(() => {
      console.log('\n✅ Integration demo completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Integration demo failed:', error);
      process.exit(1);
    });
}
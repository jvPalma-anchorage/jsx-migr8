/**********************************************************************
 *  src/cli/interactive-diff/example.ts – Example usage of interactive diff
 *********************************************************************/

import { 
  InteractiveDiffViewer, 
  QuadrantContent, 
  DiffContent, 
  RuleInfo,
  darkTheme 
} from './index';

/**
 * Example usage of the InteractiveDiffViewer
 * This demonstrates how to integrate the matrix layout system into jsx-migr8
 */
export async function exampleInteractiveDiff(): Promise<void> {
  // Create the interactive diff viewer with a theme
  const viewer = new InteractiveDiffViewer(darkTheme);

  // Example old code
  const oldCode = `import { Button, Card } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles({
  button: {
    color: 'primary',
    variant: 'contained',
  },
  card: {
    elevation: 2,
  },
});

export const MyComponent = () => {
  const classes = useStyles();
  
  return (
    <Card className={classes.card}>
      <Button 
        className={classes.button}
        color="primary"
        variant="contained"
      >
        Click me
      </Button>
    </Card>
  );
};`;

  // Example new code after migration
  const newCode = `import { Button, Card } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledButton = styled(Button)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const StyledCard = styled(Card)(({ theme }) => ({
  boxShadow: theme.shadows[2],
}));

export const MyComponent = () => {
  return (
    <StyledCard>
      <StyledButton 
        color="primary"
        variant="contained"
      >
        Click me
      </StyledButton>
    </StyledCard>
  );
};`;

  // Create diff content
  const oldDiff: DiffContent = {
    oldCode,
    newCode: oldCode, // For old quadrant, show original
    fileName: 'src/components/MyComponent.tsx',
    lineOffset: 1,
  };

  const newDiff: DiffContent = {
    oldCode,
    newCode, // For new quadrant, show migrated code
    fileName: 'src/components/MyComponent.tsx',
    lineOffset: 1,
  };

  // Create rule information
  const ruleInfo: RuleInfo = {
    name: 'Material-UI v4 to v5 Migration',
    description: 'Migrates Material-UI v4 imports and styling system to v5 (MUI)',
    sourcePackage: '@material-ui/core',
    targetPackage: '@mui/material',
    componentName: 'MyComponent',
    propsChanged: [
      'makeStyles → styled API',
      'className → styled components',
      'elevation → boxShadow',
    ],
    importsChanged: [
      '@material-ui/core → @mui/material',
      '@material-ui/core/styles → @mui/material/styles',
      'makeStyles → styled',
    ],
  };

  // Create complete quadrant content
  const content: QuadrantContent = {
    oldDiff,
    newDiff,
    ruleInfo,
    status: 'pending',
  };

  try {
    console.log('🚀 Starting interactive diff viewer...');
    console.log('Use Tab to navigate between quadrants, h for help, q to quit');
    
    // Show the interactive diff
    const result = await viewer.showDiff(content);
    
    // Handle the result
    console.log(`\n📋 Migration result: ${result.action}`);
    console.log(`Component: ${result.content.ruleInfo.componentName}`);
    console.log(`Status: ${result.content.status}`);
    
    switch (result.action) {
      case 'confirm':
        console.log('✅ Changes confirmed - proceeding with migration');
        break;
      case 'needs-adjust':
        console.log('🔧 Marked for manual adjustment - skipping automatic migration');
        break;
      case 'stop':
        console.log('⛔ Migration stopped by user');
        break;
      case 'quit':
        console.log('🚪 User quit the application');
        break;
    }
    
  } catch (error) {
    console.error('❌ Error during interactive diff:', error);
  } finally {
    // Clean up
    viewer.destroy();
  }
}

/**
 * Example of processing multiple diffs in sequence
 */
export async function exampleMultipleDiffs(): Promise<void> {
  const viewer = new InteractiveDiffViewer(darkTheme);

  // Create multiple diff contents
  const contents: QuadrantContent[] = [
    {
      oldDiff: {
        oldCode: 'import { Button } from "@material-ui/core";',
        newCode: 'import { Button } from "@mui/material";',
        fileName: 'Component1.tsx',
      },
      newDiff: {
        oldCode: 'import { Button } from "@material-ui/core";',
        newCode: 'import { Button } from "@mui/material";',
        fileName: 'Component1.tsx',
      },
      ruleInfo: {
        name: 'Import Migration',
        description: 'Update import paths',
        sourcePackage: '@material-ui/core',
        targetPackage: '@mui/material',
        componentName: 'Button',
        propsChanged: [],
        importsChanged: ['@material-ui/core → @mui/material'],
      },
      status: 'pending',
    },
    {
      oldDiff: {
        oldCode: '<TextField variant="outlined" />',
        newCode: '<TextField variant="outlined" />',
        fileName: 'Component2.tsx',
      },
      newDiff: {
        oldCode: '<TextField variant="outlined" />',
        newCode: '<TextField variant="outlined" />',
        fileName: 'Component2.tsx',
      },
      ruleInfo: {
        name: 'TextField Props',
        description: 'TextField component props remain the same',
        sourcePackage: '@material-ui/core',
        targetPackage: '@mui/material',
        componentName: 'TextField',
        propsChanged: [],
        importsChanged: ['@material-ui/core → @mui/material'],
      },
      status: 'pending',
    },
  ];

  try {
    console.log('🚀 Processing multiple diffs...');
    
    const results = await viewer.showMultipleDiffs(contents);
    const summary = InteractiveDiffViewer.getSummary(results);
    
    console.log('\n📊 Migration Summary:');
    console.log(`Total processed: ${summary.total}`);
    console.log(`Confirmed: ${summary.confirmed}`);
    console.log(`Needs adjustment: ${summary.needsAdjust}`);
    console.log(`Stopped: ${summary.stopped}`);
    
  } catch (error) {
    console.error('❌ Error during multiple diffs:', error);
  } finally {
    viewer.destroy();
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  exampleInteractiveDiff()
    .then(() => {
      console.log('✅ Example completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Example failed:', error);
      process.exit(1);
    });
}
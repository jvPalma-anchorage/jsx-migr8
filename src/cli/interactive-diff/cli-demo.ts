#!/usr/bin/env tsx
/**********************************************************************
 *  src/cli/interactive-diff/cli-demo.ts – CLI demonstration
 *********************************************************************/

import { 
  InteractiveMigrationProcessor, 
  MigrationCandidate, 
  runInteractiveDryRun 
} from './migration-integration';
import chalk from 'chalk';

// Sample migration candidates for demonstration
const sampleCandidates: MigrationCandidate[] = [
  {
    filePath: 'src/components/Button.tsx',
    originalContent: `import { Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles({
  button: {
    backgroundColor: 'blue',
    color: 'white',
    padding: '10px 20px',
  },
});

export const MyButton = ({ onClick, children }) => {
  const classes = useStyles();
  
  return (
    <Button 
      className={classes.button}
      onClick={onClick}
      variant="contained"
    >
      {children}
    </Button>
  );
};`,
    migratedContent: `import { Button } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: 'blue',
  color: 'white',
  padding: '10px 20px',
}));

export const MyButton = ({ onClick, children }) => {
  return (
    <StyledButton 
      onClick={onClick}
      variant="contained"
    >
      {children}
    </StyledButton>
  );
};`,
    ruleName: 'Material-UI v4 to v5 Button Migration',
    ruleDescription: 'Migrates Button component from Material-UI v4 to v5 with styled API',
    sourcePackage: '@material-ui/core',
    targetPackage: '@mui/material',
    componentName: 'Button',
    propsChanged: ['makeStyles → styled', 'className → styled component'],
    importsChanged: ['@material-ui/core → @mui/material', '@material-ui/core/styles → @mui/material/styles'],
    lineNumber: 1,
  },
  {
    filePath: 'src/components/Card.tsx',
    originalContent: `import { Card, CardContent } from '@material-ui/core';

export const InfoCard = ({ title, content }) => {
  return (
    <Card elevation={3}>
      <CardContent>
        <h3>{title}</h3>
        <p>{content}</p>
      </CardContent>
    </Card>
  );
};`,
    migratedContent: `import { Card, CardContent } from '@mui/material';

export const InfoCard = ({ title, content }) => {
  return (
    <Card elevation={3}>
      <CardContent>
        <h3>{title}</h3>
        <p>{content}</p>
      </CardContent>
    </Card>
  );
};`,
    ruleName: 'Material-UI v4 to v5 Card Migration',
    ruleDescription: 'Updates Card component imports from Material-UI v4 to v5',
    sourcePackage: '@material-ui/core',
    targetPackage: '@mui/material',
    componentName: 'Card',
    propsChanged: [],
    importsChanged: ['@material-ui/core → @mui/material'],
    lineNumber: 1,
  },
  {
    filePath: 'src/components/Form.tsx',
    originalContent: `import { TextField, FormControl } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  textField: {
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  formControl: {
    marginBottom: theme.spacing(1),
  },
}));

export const ContactForm = () => {
  const classes = useStyles();
  
  return (
    <form>
      <FormControl className={classes.formControl}>
        <TextField 
          className={classes.textField}
          label="Name"
          variant="outlined"
          fullWidth
        />
      </FormControl>
      <FormControl className={classes.formControl}>
        <TextField 
          className={classes.textField}
          label="Email"
          type="email"
          variant="outlined"
          fullWidth
        />
      </FormControl>
    </form>
  );
};`,
    migratedContent: `import { TextField, FormControl } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  width: '100%',
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));

export const ContactForm = () => {
  return (
    <form>
      <StyledFormControl>
        <StyledTextField 
          label="Name"
          variant="outlined"
          fullWidth
        />
      </StyledFormControl>
      <StyledFormControl>
        <StyledTextField 
          label="Email"
          type="email"
          variant="outlined"
          fullWidth
        />
      </StyledFormControl>
    </form>
  );
};`,
    ruleName: 'Material-UI v4 to v5 Form Migration',
    ruleDescription: 'Migrates form components with makeStyles to styled API',
    sourcePackage: '@material-ui/core',
    targetPackage: '@mui/material',
    componentName: 'Form Components',
    propsChanged: ['makeStyles → styled', 'className → styled components'],
    importsChanged: ['@material-ui/core → @mui/material', '@material-ui/core/styles → @mui/material/styles'],
    lineNumber: 1,
  },
];

async function runDemo() {
  console.log(chalk.blue.bold('🚀 jsx-migr8 Interactive Diff Viewer Demo'));
  console.log(chalk.blue(''.padEnd(50, '=')));
  console.log();
  
  console.log(chalk.cyan('This demo shows the 4x4 matrix layout terminal interface:'));
  console.log(chalk.gray('• Top Left: Old code (before migration)'));
  console.log(chalk.gray('• Top Right: New code (after migration)'));
  console.log(chalk.gray('• Bottom Left: Interactive menu'));
  console.log(chalk.gray('• Bottom Right: Rule information'));
  console.log();
  
  console.log(chalk.yellow('Navigation:'));
  console.log(chalk.gray('• Tab/Shift+Tab: Switch between quadrants'));
  console.log(chalk.gray('• ↑/↓ or j/k: Scroll content'));
  console.log(chalk.gray('• y: Confirm changes'));
  console.log(chalk.gray('• n: Mark as needs adjustment'));
  console.log(chalk.gray('• s: Stop migration'));
  console.log(chalk.gray('• h: Show help'));
  console.log(chalk.gray('• q: Quit'));
  console.log();
  
  console.log(chalk.green('Starting interactive migration in 3 seconds...'));
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const results = await runInteractiveDryRun(sampleCandidates);
    
    console.log(chalk.blue('\n🎉 Demo completed!'));
    console.log(chalk.blue('Results:'));
    console.log(`• Confirmed: ${results.confirmed.length}`);
    console.log(`• Needs Adjustment: ${results.needsAdjustment.length}`);
    console.log(`• Skipped: ${results.skipped.length}`);
    
    if (results.userQuit) {
      console.log(chalk.yellow('• User quit the process'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Demo failed:'), error);
    process.exit(1);
  }
}

// Run the demo
runDemo()
  .then(() => {
    console.log(chalk.green('\n✅ Demo finished successfully!'));
    process.exit(0);
  })
  .catch((error) => {
    console.error(chalk.red('\n❌ Demo error:'), error);
    process.exit(1);
  });

export { runDemo };
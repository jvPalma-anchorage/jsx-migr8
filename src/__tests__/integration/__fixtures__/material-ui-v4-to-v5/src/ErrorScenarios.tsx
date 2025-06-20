import React from 'react';
// Intentionally problematic imports for testing error scenarios
import { Button, Typography, Box } from '@material-ui/core';
import { DatePicker } from '@material-ui/pickers';
import { makeStyles } from '@material-ui/core/styles';
import { fade } from '@material-ui/core/styles/colorManipulator';

// This file contains intentional errors and edge cases for migration testing

// 1. Malformed imports
import { NonExistentComponent } from '@material-ui/core';
import BadImport from '@material-ui/core/DoesNotExist';

// 2. Mixed import styles causing conflicts
import Button2 from '@material-ui/core/Button';
import { Button as AliasedButton } from '@material-ui/core';

// 3. Dynamic imports that might break
const DynamicComponent = React.lazy(() => import('@material-ui/core/Dialog'));

// 4. Circular references or complex dependencies
import * as Everything from '@material-ui/core';

// 5. makeStyles with problematic syntax
const useProblematicStyles = makeStyles((theme) => ({
  // Missing theme type
  broken: {
    color: fade(theme.palette.primary.main, 0.5),
    // Accessing non-existent theme properties
    margin: theme.spacing.nonExistent,
    padding: theme.doesNotExist?.someProperty,
  },
  // Malformed CSS
  malformedCSS: {
    'invalid-property': 'value',
    background: 'gradient(invalid-syntax)',
  },
  // Complex nested selectors that might break
  complexNesting: {
    '&': {
      '& > & + &': {
        '&:not(:last-child)': {
          '&[data-something="complex"]': {
            color: 'red',
          },
        },
      },
    },
  },
}));

// 6. Component with problematic props
const ErrorScenarios: React.FC = () => {
  const classes = useProblematicStyles();

  return (
    <Box>
      <Typography variant="h4">Error Scenarios for Migration Testing</Typography>
      
      {/* 1. Non-existent component usage */}
      {/* <NonExistentComponent>This will cause an error</NonExistentComponent> */}
      
      {/* 2. Component with deprecated/removed props */}
      <Button 
        color="default" // Removed in v5
        variant="round" // Never existed
        size="tiny" // Non-standard size
        invalidProp="test" // Invalid prop
      >
        Button with problematic props
      </Button>
      
      {/* 3. Multiple button imports used incorrectly */}
      <Button2>Button 2</Button2>
      <AliasedButton>Aliased Button</AliasedButton>
      
      {/* 4. DatePicker with old API */}
      <DatePicker
        label="Problematic Date Picker"
        renderInput={() => null} // Wrong render prop signature
        invalidDatePickerProp="test"
        onChange={() => {}}
      />
      
      {/* 5. Using namespace import incorrectly */}
      <Everything.Button>Everything Button</Everything.Button>
      <Everything.NonExistentComponent>Should fail</Everything.NonExistentComponent>
      
      {/* 6. Deeply nested components with mixed imports */}
      <Box className={classes.broken}>
        <Box className={classes.malformedCSS}>
          <Box className={classes.complexNesting}>
            <Typography>Nested problematic styling</Typography>
          </Box>
        </Box>
      </Box>
      
      {/* 7. Component with JSX spread causing issues */}
      <Button {...{
        'data-invalid': true,
        'onClick': () => {},
        'color': 'nonexistent',
        'variant': 'also-nonexistent'
      }}>
        Button with spread props
      </Button>
      
      {/* 8. Conditional rendering with problematic components */}
      {Math.random() > 0.5 && (
        <BadImport>This should cause an error</BadImport>
      )}
      
      {/* 9. Function components as children with errors */}
      <Box>
        {() => <NonExistentComponent />}
      </Box>
      
      {/* 10. Complex prop expressions */}
      <Button
        color={Math.random() > 0.5 ? 'primary' : 'nonexistent' as any}
        onClick={() => {
          // Code that might access removed APIs
          const theme = { palette: { type: 'light' } }; // v4 API
          console.log(theme.palette.type); // Should be mode in v5
        }}
      >
        Complex prop button
      </Button>
      
      {/* 11. Self-closing vs non-self-closing inconsistencies */}
      <Button></Button>
      <Button />
      <Typography></Typography>
      <Typography />
      
      {/* 12. Comments that might interfere with parsing */}
      <Button /* inline comment */ color="primary">
        Button with inline comment
      </Button>
      
      {/* 13. String templates in props */}
      <Button color={`${'prim'}${'ary'}`}>
        Template literal color
      </Button>
      
      {/* 14. Array/object props that might cause issues */}
      <Button 
        style={{
          color: fade('#000', 0.5), // Should be alpha in v5
          background: ['red', 'blue'], // Invalid CSS
          margin: { top: 10, bottom: 10 }, // Invalid CSS object
        }}
      >
        Complex style object
      </Button>
    </Box>
  );
};

export default ErrorScenarios;
/**
 * Syntax Errors Test Fixtures
 * Various malformed JSX patterns for testing error recovery capabilities
 */

import React from 'react';
import { Button, TextField, Grid, Paper, Card, CardContent } from '@mui/material';

// 1. Unclosed JSX tags
export const UnclosedTags = () => (
  <div>
    <Button variant="contained">Click me
    <TextField label="Input field"
    <Paper elevation={3}>
      <p>Missing closing tags everywhere
    </Paper>
  </div>
);

// 2. Malformed JSX attributes
export const MalformedAttributes = () => (
  <div>
    <Button 
      variant="contained
      color=primary
      size={large}
      onClick={handleClick}
      disabled="true
      className=button-class
    >
      Button with malformed attributes
    </Button>
    <TextField 
      label="Field"
      value={value
      onChange={handleChange
      required=true
      multiline={true
    />
  </div>
);

// 3. Invalid JSX expressions
export const InvalidExpressions = () => {
  const incomplete = ;
  const malformed = {
    prop:
  };
  const array = [1, 2, 3,];
  
  return (
    <div>
      <Button onClick={() => {}>
        {incomplete.map(item => 
          <span key={item.id}>{item.name</span>
        )}
      </Button>
      <TextField value={malformed.} />
      <Grid container>
        {array.map(item => 
          <Grid item key={item}>
            {item}
          </Grid>
        }
      </Grid>
    </div>
  );
};

// 4. Mixed JavaScript and JSX syntax errors
export const MixedSyntaxErrors = () => {
  const [state, setState] = useState(;
  
  useEffect(() => {
    console.log('Effect');
  }, [state);
  
  const handleClick = () => {
    setState(prev => ({
      ...prev,
      clicked: true
    }; // Missing closing parenthesis
  };
  
  if (condition {
    return <div>Conditional</div>;
  }
  
  return (
    <div>
      <Button onClick={handleClick>Click</Button>
    </div>
  );
};

// 5. Invalid JSX nesting
export const InvalidNesting = () => (
  <div>
    <Button>
      <TextField label="Invalid nesting" />
      <Button>Nested button inside button</Button>
    </Button>
    <p>
      <div>Block element inside inline element</div>
    </p>
    <table>
      <Button>Button inside table without proper structure</Button>
    </table>
    <ul>
      <Button>Button as direct child of ul</Button>
    </ul>
  </div>
);

// 6. Missing required attributes
export const MissingRequiredAttributes = () => (
  <div>
    <img /> {/* Missing alt attribute */}
    <label></label> {/* Missing htmlFor */}
    <input type="text" /> {/* Missing name/id */}
    <Button></Button> {/* Empty button */}
    <TextField /> {/* Missing label */}
    <form>
      <input type="submit" /> {/* Missing value */}
    </form>
  </div>
);

// 7. Conflicting attributes
export const ConflictingAttributes = () => (
  <div>
    <Button 
      disabled={true}
      disabled={false}
      onClick={handleClick}
    >
      Conflicting disabled attributes
    </Button>
    <TextField 
      value="controlled"
      defaultValue="uncontrolled"
      label="Conflicting control"
    />
    <input 
      type="text"
      type="email"
      value="value"
      defaultValue="default"
    />
  </div>
);

// 8. Unicode and encoding issues
export const UnicodeIssues = () => (
  <div>
    <Button>
      Invalid Unicode: \uXXXX \u123 \uZZZZ
      Incomplete: \u12
      Mixed: Valid \u0041 and invalid \uGGGG
    </Button>
    <TextField 
      label="Field with unicode: 🚀 ñ ü ç"
      value="∑ ∏ ∫ √ ∞"
    />
  </div>
);

// 9. Deeply nested malformed structure
export const DeeplyNestedErrors = () => (
  <Grid container>
    <Grid item xs={12}>
      <Paper elevation={3}>
        <Card>
          <CardContent>
            <Button variant="contained>
              <Grid container>
                <Grid item xs={6}>
                  <TextField label="Field 1 value={value1} />
                  <Button color="primary>
                    Nested Button 1
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Field 2 value={value2} />
                  <Button color="secondary>
                    Nested Button 2
                  </Button>
                </Grid>
              </Grid>
            </Button>
          </CardContent>
        </Card>
      </Paper>
    </Grid>
  </Grid>
);

// 10. Circular component references with errors
export const CircularWithErrors = () => (
  <div>
    <CircularWithErrors>
      <CircularWithErrors>
        <CircularWithErrors>
          <Button variant="contained>Circular</Button>
        </CircularWithErrors>
      </CircularWithErrors>
    </CircularWithErrors>
  </div>
);

// 11. Dynamic expressions with syntax errors
export const DynamicExpressionErrors = () => {
  const props = {
    variant: 'contained',
    color: 'primary'
  };
  
  const getAttributes = () => ({
    disabled: true,
    onClick: handleClick
  }
  
  return (
    <div>
      <Button {...props} {...getAttributes()}>
        Dynamic Props
      </Button>
      <Button {...{
        variant: 'outlined',
        color: primary // Missing quotes
      }}>
        Object Props
      </Button>
    </div>
  );
};

// 12. Conditional rendering with errors
export const ConditionalRenderingErrors = () => {
  const condition = true;
  const items = [1, 2, 3];
  
  return (
    <div>
      {condition && 
        <Button>Conditional Button</Button>
      }
      {condition ? 
        <TextField label="True" /> :
        <TextField label="False"
      }
      {items.map(item => 
        <Button key={item}>
          Item {item}
        </Button>
      }
    </div>
  );
};

// 13. Event handlers with syntax errors
export const EventHandlerErrors = () => (
  <div>
    <Button onClick={() => {
      console.log('Click');
      // Missing closing brace
    >
      Handler Error 1
    </Button>
    <Button onClick={(event) => 
      event.preventDefault();
      console.log('Click');
    }>
      Handler Error 2
    </Button>
    <TextField 
      onChange={(e) => {
        setValue(e.target.value;
      }}
      onBlur={handleBlur(}
    />
  </div>
);

// 14. Import/Export with JSX errors
import { NonExistentComponent } from './non-existent';
import MalformedImport from @mui/material/Button'; // Missing quotes

export const ImportExportErrors = () => (
  <div>
    <NonExistentComponent />
    <MalformedImport>Malformed Import</MalformedImport>
    <Button>Regular Button</Button>
  </div>
);

// 15. Comments causing parsing issues
export const CommentIssues = () => (
  <div>
    <Button>
      {/* Unclosed comment
    </Button>
    <TextField 
      // Comment in wrong place
      label="Field"
      /* Another comment */ value="value"
    />
    <Button>
      /* Not JSX comment */
      Regular text
    </Button>
  </div>
);

// 16. Template literals with errors
export const TemplateLiteralErrors = () => {
  const name = 'User';
  const count = 5;
  
  return (
    <div>
      <Button>
        {`Hello ${name} // Missing closing backtick
      </Button>
      <TextField 
        label={`Count: ${count`}
        value="template"
      />
      <Button>
        {`Multi-line
          template ${name}
          with errors`
      </Button>
    </div>
  );
};

// 17. Spread operator errors
export const SpreadOperatorErrors = () => {
  const props = {
    variant: 'contained',
    color: 'primary'
  };
  
  return (
    <div>
      <Button {...props>
        Missing closing brace
      </Button>
      <TextField {...} />
      <Button {... props}>
        Wrong syntax
      </Button>
    </div>
  );
};

// 18. Fragment syntax errors
export const FragmentErrors = () => (
  <>
    <Button>Fragment Button</Button>
    <TextField label="Fragment Field" />
    <>
      <Button>Nested Fragment</Button>
    </>
    <React.Fragment>
      <Button>Mixed Fragment</Button>
    <React.Fragment>
  </>
);

// 19. Key prop errors
export const KeyPropErrors = () => {
  const items = [1, 2, 3];
  
  return (
    <div>
      {items.map(item => 
        <Button>No key</Button>
      )}
      {items.map(item => 
        <Button key={item.nonExistent}>Wrong key</Button>
      )}
      {items.map(item => 
        <Button key={}>Empty key</Button>
      )}
    </div>
  );
};

// 20. Complex combination of all error types
export const CombinedErrors = () => {
  const [state, setState] = useState(;
  const props = { variant: 'contained' };
  
  useEffect(() => {
    // Missing implementation
  }, [state);
  
  return (
    <div>
      <Button 
        {...props
        variant="outlined
        onClick={() => {
          setState(prev => ({ ...prev, clicked: true };
        }}
        disabled={true}
        disabled={false}
      >
        {`Complex ${name} button`
        <TextField label="Nested field />
      </Button>
      <img />
      <NonExistentComponent>
        {items.map(item => 
          <Button key={item.id>
            {item.name
          </Button>
        }
      </NonExistentComponent>
    </div>
  );
};
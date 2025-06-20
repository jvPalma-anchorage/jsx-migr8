/**
 * Complex Import Patterns Edge Cases
 * Tests jsx-migr8's ability to handle various import styles and transformations
 */

import React from 'react';

// Default imports
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// Named imports
import { Grid, Paper, Card, CardContent } from '@mui/material';
import { Table, Space, Divider } from 'antd';
import { useState, useEffect, useMemo, useCallback } from 'react';

// Namespace imports
import * as MaterialIcons from '@mui/icons-material';
import * as AntdIcons from '@ant-design/icons';
import * as ReactUtils from 'react';

// Mixed default and named imports
import Chip, { ChipProps } from '@mui/material/Chip';
import Switch, { SwitchProps } from '@mui/material/Switch';
import Slider, { SliderProps } from '@mui/material/Slider';

// Aliased imports
import { Button as MuiButton, TextField as MuiTextField } from '@mui/material';
import { Button as AntButton, Input as AntInput, Form as AntForm } from 'antd';
import { default as ReactDefault, Component as ReactComponent } from 'react';

// Side-effect imports
import '@mui/material/styles';
import 'antd/dist/antd.css';
import './custom-styles.css';

// Dynamic imports (should be ignored or handled gracefully)
const LazyComponent = React.lazy(() => import('./lazy-component'));
const DynamicImport = () => import('@mui/material/Dialog');

// Type-only imports
import type { Theme } from '@mui/material/styles';
import type { FormInstance } from 'antd/lib/form';
import type { ReactNode, ComponentProps } from 'react';

// Re-exports
export { Button, TextField } from '@mui/material';
export { default as ExportedButton } from '@mui/material/Button';
export type { Theme, FormInstance };

// Complex aliased re-exports
export { Button as ReexportedButton, TextField as ReexportedTextField } from '@mui/material';
export { default as DefaultReexport, Grid as GridReexport } from '@mui/material';

// Conditional imports (edge case)
let ConditionalImport: any;
if (process.env.NODE_ENV === 'development') {
  ConditionalImport = require('@mui/material/Button');
}

// Destructured imports with defaults
import { 
  Button: AdvancedButton = Button,
  TextField: AdvancedTextField = TextField,
  nonExistent = MaterialIcons.Add
} from '@mui/material';

// Imports with computed names (should be handled carefully)
const packageName = '@mui/material';
// import(`${packageName}/Button`); // This would be runtime

// Complex nested destructuring
import {
  unstable_createMuiStrictModeTheme as createTheme,
  experimental_sx as sx,
  alpha,
  styled
} from '@mui/material/styles';

export const ComplexImportPatterns: React.FC = () => {
  // Default import usage
  const [value, setValue] = useState('');
  
  // Named import usage
  const memoizedValue = useMemo(() => value.toUpperCase(), [value]);
  
  // Namespace import usage
  const AddIcon = MaterialIcons.Add;
  const PlusIcon = AntdIcons.PlusOutlined;
  
  // Aliased import usage
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);

  return (
    <div>
      {/* Default imports */}
      <Button variant="contained">Default Button</Button>
      <TextField label="Default TextField" value={value} onChange={(e) => setValue(e.target.value)} />
      <Typography variant="h1">Default Typography</Typography>

      {/* Named imports */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper elevation={3}>
            <Card>
              <CardContent>
                <Table dataSource={[]} columns={[]} />
                <Space>
                  <span>Antd Space</span>
                </Space>
                <Divider />
              </CardContent>
            </Card>
          </Paper>
        </Grid>
      </Grid>

      {/* Namespace imports */}
      <AddIcon />
      <PlusIcon />
      <ReactUtils.Fragment>
        <span>Namespace React Fragment</span>
      </ReactUtils.Fragment>

      {/* Aliased imports */}
      <MuiButton color="primary">Aliased MUI Button</MuiButton>
      <MuiTextField label="Aliased MUI TextField" />
      <AntButton type="primary">Aliased Ant Button</AntButton>
      <AntInput placeholder="Aliased Ant Input" />
      <AntForm>
        <AntForm.Item label="Form Item">
          <AntInput />
        </AntForm.Item>
      </AntForm>

      {/* Mixed imports with props */}
      <Chip 
        label="Chip with props" 
        color="primary" 
        variant="outlined"
      />
      <Switch 
        checked={Boolean(value)} 
        onChange={(e) => setValue(e.target.checked ? 'on' : 'off')}
      />
      <Slider 
        value={value.length} 
        min={0} 
        max={100}
        onChange={(_, newValue) => setValue('x'.repeat(newValue as number))}
      />

      {/* Advanced aliased imports */}
      <AdvancedButton onClick={handleClick}>
        Advanced Button with Default
      </AdvancedButton>
      <AdvancedTextField 
        label="Advanced TextField"
        value={memoizedValue}
      />

      {/* Conditional import usage */}
      {ConditionalImport && <ConditionalImport>Conditional</ConditionalImport>}

      {/* Re-exported component usage */}
      <ReexportedButton variant="outlined">Re-exported Button</ReexportedButton>
      <ReexportedTextField label="Re-exported TextField" />

      {/* Lazy component */}
      <React.Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </React.Suspense>

      {/* Complex prop spreading */}
      <Button
        {...({
          variant: 'contained',
          color: 'primary',
          size: 'large'
        } as ComponentProps<typeof Button>)}
      >
        Spread Props Button
      </Button>
    </div>
  );
};

// Complex HOC pattern with multiple imports
export const withComplexImports = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.forwardRef<any, P>((props, ref) => {
    return (
      <Grid container>
        <Grid item xs={12}>
          <Paper>
            <Component ref={ref} {...props} />
          </Paper>
        </Grid>
      </Grid>
    );
  });
};

// Factory function creating components with imports
export const createComponentWithImports = (iconType: keyof typeof MaterialIcons) => {
  const Icon = MaterialIcons[iconType];
  
  return ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
    <Button startIcon={<Icon />} {...props}>
      {children}
    </Button>
  );
};

// Render prop pattern with mixed imports
export const ComplexRenderProp: React.FC<{
  render: (props: { 
    Button: typeof MuiButton; 
    AntButton: typeof AntButton;
    icons: typeof MaterialIcons;
  }) => React.ReactNode;
}> = ({ render }) => {
  return (
    <div>
      {render({ 
        Button: MuiButton, 
        AntButton: AntButton, 
        icons: MaterialIcons 
      })}
    </div>
  );
};

// Context pattern with imported types
export const ImportedTypesContext = React.createContext<{
  theme: Theme | null;
  form: FormInstance | null;
}>({
  theme: null,
  form: null
});

// Component using all import types
export const AllImportTypesComponent: React.FC = () => {
  const context = React.useContext(ImportedTypesContext);
  
  return (
    <div>
      {/* Every import style used in a single component */}
      <Button>Default Import</Button>
      <Grid container><Grid item>Named Import</Grid></Grid>
      <MaterialIcons.Add />
      <MuiButton>Aliased Import</MuiButton>
      <Chip label="Mixed Import" />
      <ReexportedButton>Re-exported</ReexportedButton>
      
      {/* Complex nested usage */}
      <Paper>
        <Card>
          <CardContent>
            <Table 
              dataSource={[]} 
              columns={[
                {
                  title: 'Action',
                  render: () => <AntButton icon={<AntdIcons.EditOutlined />}>Edit</AntButton>
                }
              ]}
            />
          </CardContent>
        </Card>
      </Paper>
      
      {/* Styled component using imports */}
      <div
        style={{
          backgroundColor: context.theme ? alpha(context.theme.palette.primary.main, 0.1) : 'transparent'
        }}
      >
        Styled with imported theme
      </div>
    </div>
  );
};

export default ComplexImportPatterns;
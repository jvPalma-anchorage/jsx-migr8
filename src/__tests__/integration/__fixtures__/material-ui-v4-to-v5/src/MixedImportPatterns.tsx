import React from 'react';
// Default imports
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Checkbox from '@material-ui/core/Checkbox';

// Named imports
import { Typography, Box, Paper } from '@material-ui/core';
import { Card, CardContent, CardActions } from '@material-ui/core';
import { Grid, Container } from '@material-ui/core';

// Mixed imports
import Dialog, { DialogTitle, DialogContent, DialogActions } from '@material-ui/core/Dialog';
import Tabs, { TabsProps } from '@material-ui/core/Tabs';
import Tab, { TabProps } from '@material-ui/core/Tab';

// Aliased imports
import { Button as MuiButton } from '@material-ui/core';
import { TextField as MuiTextField } from '@material-ui/core';
import { default as MuiPaper } from '@material-ui/core/Paper';
import { Select as MuiSelect, MenuItem as MuiMenuItem } from '@material-ui/core';

// Re-exported imports
import { makeStyles, Theme } from '@material-ui/core/styles';
import { useTheme } from '@material-ui/core/styles';
import { styled } from '@material-ui/core/styles';

// Icon imports with various patterns
import HomeIcon from '@material-ui/icons/Home';
import { Settings, Dashboard, AccountCircle } from '@material-ui/icons';
import { Delete as DeleteIcon, Edit as EditIcon } from '@material-ui/icons';
import * as Icons from '@material-ui/icons';

// Lab component imports
import Alert from '@material-ui/lab/Alert';
import { Skeleton, Autocomplete } from '@material-ui/lab';
import TreeView, { TreeItem } from '@material-ui/lab/TreeView';

// System imports
import { spacing, palette, typography } from '@material-ui/system';
import Box2 from '@material-ui/core/Box';

// Pickers imports
import { DatePicker } from '@material-ui/pickers';
import { TimePicker as MuiTimePicker } from '@material-ui/pickers';

// Type imports
import type { ButtonProps } from '@material-ui/core/Button';
import type { TextFieldProps } from '@material-ui/core/TextField';
import type { Theme as MuiTheme } from '@material-ui/core/styles';

// Namespace imports
import * as MuiCore from '@material-ui/core';
import * as MuiLab from '@material-ui/lab';
import * as MuiStyles from '@material-ui/core/styles';

// Dynamic imports
const DynamicRating = React.lazy(() => import('@material-ui/lab/Rating'));
const DynamicSpeedDial = React.lazy(() => 
  import('@material-ui/lab').then(module => ({ default: module.SpeedDial }))
);

// Complex nested imports
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  ListSubheader,
  Divider,
} from '@material-ui/core';

// Style related imports with different patterns
import withStyles from '@material-ui/core/styles/withStyles';
import createStyles from '@material-ui/core/styles/createStyles';
import { fade, darken, lighten } from '@material-ui/core/styles/colorManipulator';

// Custom hook that uses Material-UI
const useCustomStyles = makeStyles((theme: Theme) => ({
  root: {
    padding: theme.spacing(2),
  },
  button: {
    margin: theme.spacing(1),
  },
}));

// Re-export pattern
export { Button, TextField, Typography };
export { HomeIcon, Settings as SettingsIcon };
export type { ButtonProps, TextFieldProps };

// Component with mixed import usage
const MixedImportPatterns: React.FC = () => {
  const classes = useCustomStyles();
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const [tabValue, setTabValue] = React.useState(0);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date());

  // Using namespace imports
  const NamespaceButton = MuiCore.Button;
  const NamespaceAlert = MuiLab.Alert;
  const NamespaceTheme = MuiStyles.useTheme();

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Mixed Import Patterns Test
      </Typography>

      {/* Using default imports */}
      <Box mb={3}>
        <Typography variant="h6">Default Imports</Typography>
        <Button variant="contained" color="primary">
          Default Import Button
        </Button>
        <TextField label="Default Import TextField" variant="outlined" />
        <Checkbox defaultChecked />
      </Box>

      {/* Using aliased imports */}
      <Box mb={3}>
        <Typography variant="h6">Aliased Imports</Typography>
        <MuiButton variant="outlined" color="secondary">
          Aliased Button
        </MuiButton>
        <MuiTextField label="Aliased TextField" />
        <MuiPaper elevation={3} style={{ padding: theme.spacing(2) }}>
          Aliased Paper Component
        </MuiPaper>
        <MuiSelect value="">
          <MuiMenuItem value="option1">Option 1</MuiMenuItem>
          <MuiMenuItem value="option2">Option 2</MuiMenuItem>
        </MuiSelect>
      </Box>

      {/* Using mixed imports */}
      <Box mb={3}>
        <Typography variant="h6">Mixed Import Pattern</Typography>
        <Dialog open={open} onClose={() => setOpen(false)}>
          <DialogTitle>Mixed Import Dialog</DialogTitle>
          <DialogContent>
            <Typography>Dialog content using mixed imports</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      </Box>

      {/* Using icon imports */}
      <Box mb={3}>
        <Typography variant="h6">Icon Imports</Typography>
        <Grid container spacing={2}>
          <Grid item>
            <HomeIcon />
          </Grid>
          <Grid item>
            <Settings />
          </Grid>
          <Grid item>
            <Dashboard />
          </Grid>
          <Grid item>
            <DeleteIcon />
          </Grid>
          <Grid item>
            <EditIcon />
          </Grid>
          <Grid item>
            <Icons.Favorite />
          </Grid>
          <Grid item>
            <Icons.Star />
          </Grid>
        </Grid>
      </Box>

      {/* Using lab components */}
      <Box mb={3}>
        <Typography variant="h6">Lab Components</Typography>
        <Alert severity="info">Lab Alert Component</Alert>
        <Skeleton variant="text" width={200} />
        <Autocomplete
          options={['Option 1', 'Option 2']}
          renderInput={(params) => <TextField {...params} label="Autocomplete" />}
        />
        <TreeView
          defaultCollapseIcon={<Icons.ExpandMore />}
          defaultExpandIcon={<Icons.ChevronRight />}
        >
          <TreeItem nodeId="1" label="Parent">
            <TreeItem nodeId="2" label="Child" />
          </TreeItem>
        </TreeView>
      </Box>

      {/* Using namespace imports */}
      <Box mb={3}>
        <Typography variant="h6">Namespace Imports</Typography>
        <NamespaceButton variant="contained">
          Namespace Button
        </NamespaceButton>
        <NamespaceAlert severity="success">
          Namespace Alert
        </NamespaceAlert>
        <MuiCore.Chip label="Namespace Chip" />
        <MuiCore.Avatar>NS</MuiCore.Avatar>
      </Box>

      {/* Using dynamic imports */}
      <Box mb={3}>
        <Typography variant="h6">Dynamic Imports</Typography>
        <React.Suspense fallback={<div>Loading...</div>}>
          <DynamicRating value={4} />
        </React.Suspense>
      </Box>

      {/* Using system imports */}
      <Box mb={3} p={spacing(2)} bgcolor={palette.grey[100]}>
        <Typography variant="h6">System Imports</Typography>
        <Box2 p={2} bgcolor="primary.main" color="primary.contrastText">
          Box with system props
        </Box2>
      </Box>

      {/* Using pickers */}
      <Box mb={3}>
        <Typography variant="h6">Date/Time Pickers</Typography>
        <DatePicker
          label="Date Picker"
          value={selectedDate}
          onChange={setSelectedDate}
          renderInput={(params) => <TextField {...params} />}
        />
        <MuiTimePicker
          label="Time Picker"
          value={selectedDate}
          onChange={setSelectedDate}
          renderInput={(params) => <TextField {...params} />}
        />
      </Box>

      {/* Complex nested structure */}
      <List>
        <ListSubheader>List with complex imports</ListSubheader>
        <ListItem>
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary="Home" />
          <ListItemSecondaryAction>
            <Checkbox />
          </ListItemSecondaryAction>
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
      </List>

      {/* Using tabs with type imports */}
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
        <Tab label="Tab 1" />
        <Tab label="Tab 2" />
        <Tab label="Tab 3" />
      </Tabs>

      {/* Style imports usage */}
      <Paper style={{ 
        backgroundColor: fade(theme.palette.primary.main, 0.1),
        '&:hover': {
          backgroundColor: darken(theme.palette.primary.main, 0.2),
        }
      }}>
        <Typography>
          Using color manipulation functions
        </Typography>
      </Paper>
    </Container>
  );
};

// Additional exports
export default MixedImportPatterns;
export { useCustomStyles };
export type { TabsProps, TabProps, MuiTheme };
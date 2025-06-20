import React from 'react';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Drawer, List, ListItem,
  ListItemIcon, ListItemText, Card, CardContent, CardActions, Grid, Paper,
  TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, Radio,
  RadioGroup, FormControlLabel, Switch, Slider, Chip, Avatar, Badge,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Tooltip,
  ExpansionPanel, ExpansionPanelSummary, ExpansionPanelDetails, Fab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Box, Container, Hidden, useMediaQuery
} from '@material-ui/core';
import {
  Menu as MenuIcon, Home as HomeIcon, Settings as SettingsIcon,
  Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon,
  ExpandMore as ExpandMoreIcon, Favorite as FavoriteIcon,
  Star as StarIcon, Close as CloseIcon
} from '@material-ui/icons';
import { 
  TreeView, TreeItem, Alert, AlertTitle, Skeleton, SpeedDial, SpeedDialAction, 
  SpeedDialIcon, Autocomplete, ToggleButton, ToggleButtonGroup, Rating,
  Pagination, Timeline, TimelineItem, TimelineSeparator, TimelineConnector,
  TimelineContent, TimelineDot, TimelineOppositeContent
} from '@material-ui/lab';
import { DatePicker, TimePicker, DateTimePicker } from '@material-ui/pickers';
import { makeStyles, createStyles, Theme, withStyles, styled } from '@material-ui/core/styles';
import { fade, darken, lighten } from '@material-ui/core/styles/colorManipulator';
import { spacing, palette } from '@material-ui/system';

// Complex makeStyles usage with theme
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
      backgroundColor: fade(theme.palette.primary.main, 0.1),
      padding: theme.spacing(2),
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1),
      },
      '&:hover': {
        backgroundColor: darken(theme.palette.primary.main, 0.1),
      },
    },
    appBar: {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: theme.shadows[4],
    },
    title: {
      flexGrow: 1,
      color: theme.palette.primary.contrastText,
      fontWeight: theme.typography.fontWeightBold,
    },
    card: {
      maxWidth: 345,
      margin: theme.spacing(2),
      transition: theme.transitions.create(['transform', 'box-shadow'], {
        duration: theme.transitions.duration.standard,
      }),
      '&:hover': {
        transform: 'scale(1.02)',
        boxShadow: theme.shadows[8],
      },
    },
    fab: {
      position: 'fixed',
      bottom: theme.spacing(2),
      right: theme.spacing(2),
      backgroundColor: theme.palette.secondary.main,
      '&:hover': {
        backgroundColor: lighten(theme.palette.secondary.main, 0.2),
      },
    },
    expansionPanel: {
      '&.Mui-expanded': {
        margin: theme.spacing(1, 0),
      },
    },
    customButton: {
      borderRadius: theme.shape.borderRadius * 2,
      textTransform: 'none',
      padding: theme.spacing(1, 3),
    },
  })
);

// withStyles HOC usage
const StyledPaper = withStyles((theme: Theme) => ({
  root: {
    padding: theme.spacing(3),
    backgroundColor: fade(theme.palette.background.paper, 0.9),
    border: `1px solid ${theme.palette.divider}`,
    '&:hover': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[2],
    },
  },
}))(Paper);

// styled-components style usage
const CustomBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  '& > *': {
    margin: theme.spacing(0.5),
  },
}));

// Complex component with multiple breaking changes
const ComplexMaterialUIApp: React.FC = () => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState('');
  const [checkboxValues, setCheckboxValues] = React.useState({
    option1: true,
    option2: false,
    option3: true,
  });
  const [radioValue, setRadioValue] = React.useState('option1');
  const [sliderValue, setSliderValue] = React.useState(30);
  const [switchValue, setSwitchValue] = React.useState(false);
  const [ratingValue, setRatingValue] = React.useState(4);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date());
  const [autocompleteValue, setAutocompleteValue] = React.useState(null);
  const [toggleValue, setToggleValue] = React.useState('left');

  const tableData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Moderator' },
  ];

  const autocompleteOptions = [
    { label: 'The Shawshank Redemption', year: 1994 },
    { label: 'The Godfather', year: 1972 },
    { label: 'The Dark Knight', year: 2008 },
    { label: 'Pulp Fiction', year: 1994 },
  ];

  const speedDialActions = [
    { icon: <EditIcon />, name: 'Edit', onClick: () => console.log('Edit') },
    { icon: <DeleteIcon />, name: 'Delete', onClick: () => console.log('Delete') },
    { icon: <StarIcon />, name: 'Favorite', onClick: () => console.log('Favorite') },
  ];

  return (
    <div className={classes.root}>
      {/* AppBar with complex styling */}
      <AppBar position="static" className={classes.appBar}>
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={() => setDrawerOpen(true)}
            aria-label="menu"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            Material-UI v4 Complex App
          </Typography>
          <Button 
            color="inherit" 
            className={classes.customButton}
            onClick={() => setDialogOpen(true)}
          >
            Open Dialog
          </Button>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Drawer 
        anchor="left" 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)}
      >
        <List style={{ width: 250 }}>
          <ListItem button>
            <ListItemIcon><HomeIcon /></ListItemIcon>
            <ListItemText primary="Home" />
          </ListItem>
          <ListItem button>
            <ListItemIcon><SettingsIcon /></ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItem>
        </List>
      </Drawer>

      <Container maxWidth="lg">
        {/* Grid Layout with Cards */}
        <Grid container spacing={3} style={{ marginTop: 16 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card className={classes.card}>
              <CardContent>
                <Typography gutterBottom variant="h5" component="h2">
                  User Profile
                </Typography>
                <Box display="flex" alignItems="center" mb={2}>
                  <Badge badgeContent={4} color="primary">
                    <Avatar src="/avatar.jpg">JD</Avatar>
                  </Badge>
                  <Box ml={2}>
                    <Typography variant="body1">John Doe</Typography>
                    <Chip label="Admin" color="primary" size="small" />
                  </Box>
                </Box>
                <Rating 
                  value={ratingValue} 
                  onChange={(event, newValue) => setRatingValue(newValue || 0)}
                />
              </CardContent>
              <CardActions>
                <Button size="small" color="primary" startIcon={<EditIcon />}>
                  Edit
                </Button>
                <Button size="small" color="secondary" startIcon={<DeleteIcon />}>
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Form Controls */}
          <Grid item xs={12} sm={6} md={8}>
            <StyledPaper>
              <Typography variant="h6" gutterBottom>
                Form Controls (v4 API)
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    variant="outlined"
                    margin="normal"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth variant="outlined" margin="normal">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={selectedValue}
                      onChange={(e) => setSelectedValue(e.target.value as string)}
                      label="Category"
                    >
                      <MenuItem value=""><em>None</em></MenuItem>
                      <MenuItem value="option1">Option 1</MenuItem>
                      <MenuItem value="option2">Option 2</MenuItem>
                      <MenuItem value="option3">Option 3</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Date Pickers - Major breaking change in v5 */}
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Date Picker"
                    value={selectedDate}
                    onChange={setSelectedDate}
                    renderInput={(params) => <TextField {...params} />}
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TimePicker
                    label="Time Picker"
                    value={selectedDate}
                    onChange={setSelectedDate}
                    renderInput={(params) => <TextField {...params} />}
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <DateTimePicker
                    label="DateTime Picker"
                    value={selectedDate}
                    onChange={setSelectedDate}
                    renderInput={(params) => <TextField {...params} />}
                  />
                </Grid>

                {/* Autocomplete */}
                <Grid item xs={12}>
                  <Autocomplete
                    options={autocompleteOptions}
                    getOptionLabel={(option) => option.label}
                    value={autocompleteValue}
                    onChange={(event, newValue) => setAutocompleteValue(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Movies" variant="outlined" />
                    )}
                  />
                </Grid>

                {/* Checkboxes and Radio Buttons */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">Checkboxes</Typography>
                  {Object.entries(checkboxValues).map(([key, value]) => (
                    <FormControlLabel
                      key={key}
                      control={
                        <Checkbox
                          checked={value}
                          onChange={(e) => setCheckboxValues({
                            ...checkboxValues,
                            [key]: e.target.checked
                          })}
                          color="primary"
                        />
                      }
                      label={`Option ${key.slice(-1)}`}
                    />
                  ))}
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">Radio Group</Typography>
                  <RadioGroup
                    value={radioValue}
                    onChange={(e) => setRadioValue(e.target.value)}
                  >
                    <FormControlLabel value="option1" control={<Radio color="primary" />} label="Option 1" />
                    <FormControlLabel value="option2" control={<Radio color="primary" />} label="Option 2" />
                    <FormControlLabel value="option3" control={<Radio color="primary" />} label="Option 3" />
                  </RadioGroup>
                </Grid>

                {/* Slider and Switch */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">Slider</Typography>
                  <Slider
                    value={sliderValue}
                    onChange={(event, newValue) => setSliderValue(newValue as number)}
                    valueLabelDisplay="auto"
                    min={0}
                    max={100}
                    color="primary"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">Switch</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={switchValue}
                        onChange={(e) => setSwitchValue(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Enable Notifications"
                  />
                </Grid>

                {/* Toggle Button Group */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1">Toggle Buttons</Typography>
                  <ToggleButtonGroup
                    value={toggleValue}
                    exclusive
                    onChange={(event, newValue) => setToggleValue(newValue)}
                  >
                    <ToggleButton value="left">Left</ToggleButton>
                    <ToggleButton value="center">Center</ToggleButton>
                    <ToggleButton value="right">Right</ToggleButton>
                  </ToggleButtonGroup>
                </Grid>
              </Grid>
            </StyledPaper>
          </Grid>
        </Grid>

        {/* ExpansionPanel (renamed to Accordion in v5) */}
        <Box mt={4}>
          <ExpansionPanel className={classes.expansionPanel}>
            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Advanced Settings</Typography>
            </ExpansionPanelSummary>
            <ExpansionPanelDetails>
              <Typography>
                This is the content of the expansion panel. In Material-UI v5, 
                ExpansionPanel becomes Accordion with different props.
              </Typography>
            </ExpansionPanelDetails>
          </ExpansionPanel>

          <ExpansionPanel>
            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">User Preferences</Typography>
            </ExpansionPanelSummary>
            <ExpansionPanelDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Theme Preference"
                    select
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Language"
                    select
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </TextField>
                </Grid>
              </Grid>
            </ExpansionPanelDetails>
          </ExpansionPanel>
        </Box>

        {/* Data Table */}
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            User Management Table
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={row.role} 
                        color={row.role === 'Admin' ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit User">
                        <IconButton size="small" color="primary">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete User">
                        <IconButton size="small" color="secondary">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box mt={2} display="flex" justifyContent="center">
            <Pagination count={10} color="primary" />
          </Box>
        </Box>

        {/* TreeView and Timeline (Lab components) */}
        <Grid container spacing={4} style={{ marginTop: 16 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              File Tree
            </Typography>
            <TreeView
              defaultCollapseIcon={<ExpandMoreIcon />}
              defaultExpandIcon={<AddIcon />}
            >
              <TreeItem nodeId="1" label="src">
                <TreeItem nodeId="2" label="components">
                  <TreeItem nodeId="3" label="App.tsx" />
                  <TreeItem nodeId="4" label="Header.tsx" />
                </TreeItem>
                <TreeItem nodeId="5" label="utils">
                  <TreeItem nodeId="6" label="helpers.ts" />
                </TreeItem>
              </TreeItem>
            </TreeView>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Project Timeline
            </Typography>
            <Timeline>
              <TimelineItem>
                <TimelineOppositeContent>
                  <Typography variant="body2" color="textSecondary">
                    9:30 am
                  </Typography>
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color="primary" />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="h6" component="h1">
                    Project Started
                  </Typography>
                  <Typography>Initial setup and configuration</Typography>
                </TimelineContent>
              </TimelineItem>
              <TimelineItem>
                <TimelineOppositeContent>
                  <Typography variant="body2" color="textSecondary">
                    10:00 am
                  </Typography>
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color="primary" variant="outlined" />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="h6" component="h1">
                    First Milestone
                  </Typography>
                  <Typography>Core features implemented</Typography>
                </TimelineContent>
              </TimelineItem>
            </Timeline>
          </Grid>
        </Grid>

        {/* Alert and Skeleton (Lab components) */}
        <Box mt={4}>
          <Alert severity="info" style={{ marginBottom: 16 }}>
            <AlertTitle>Information</AlertTitle>
            This is an info alert with a title. In v5, Alert moves to core.
          </Alert>
          
          <Alert severity="warning" style={{ marginBottom: 16 }}>
            Warning: Some features may not work as expected during migration.
          </Alert>

          <Typography variant="h6" gutterBottom>
            Loading Skeleton
          </Typography>
          <Card>
            <CardContent>
              <Skeleton variant="text" height={40} />
              <Skeleton variant="text" />
              <Skeleton variant="rect" height={118} style={{ marginTop: 16 }} />
            </CardContent>
          </Card>
        </Box>

        {/* Hidden component (deprecated in v5) */}
        <Hidden smDown>
          <Box mt={4}>
            <Alert severity="success">
              This content is hidden on small screens using the Hidden component,
              which is deprecated in v5 in favor of sx prop or useMediaQuery.
            </Alert>
          </Box>
        </Hidden>

        {/* SpeedDial */}
        <SpeedDial
          ariaLabel="SpeedDial Actions"
          className={classes.fab}
          icon={<SpeedDialIcon />}
          direction="up"
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={action.onClick}
            />
          ))}
        </SpeedDial>
      </Container>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Sample Dialog</Typography>
            <IconButton onClick={() => setDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            This dialog demonstrates various Material-UI components that have
            breaking changes in v5. The Close button positioning and DialogTitle
            structure need updates.
          </Typography>
          <Box mt={2}>
            <TextField
              fullWidth
              label="Enter some text"
              multiline
              rows={4}
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={() => {
              setDialogOpen(false);
              setSnackbarOpen(true);
            }} 
            color="primary" 
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message="Action completed successfully!"
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={() => setSnackbarOpen(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </div>
  );
};

export default ComplexMaterialUIApp;
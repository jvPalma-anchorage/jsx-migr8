import React from 'react';
import {
  Button,
  TextField,
  Chip,
  Avatar,
  Badge,
  CircularProgress,
  LinearProgress,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  StepButton,
  BottomNavigation,
  BottomNavigationAction,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Popover,
  Popper,
  Backdrop,
  Modal,
  Fade,
  Grow,
  Slide,
  Zoom,
  Collapse,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  FormHelperText,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
  Select,
  InputLabel,
  Input,
  FilledInput,
  OutlinedInput,
  InputAdornment,
  ListItemSecondaryAction,
  ListSubheader,
  GridList,
  GridListTile,
  GridListTileBar,
  Icon,
  SvgIcon,
  useScrollTrigger,
  Fab,
  ExpansionPanel,
  ExpansionPanelSummary,
  ExpansionPanelDetails,
  ExpansionPanelActions,
} from '@material-ui/core';
import {
  Home as HomeIcon,
  Favorite as FavoriteIcon,
  LocationOn as LocationIcon,
  Restore as RestoreIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AccountCircle,
  AttachFile,
  CloudUpload,
  KeyboardVoice,
  Save,
  Print,
  Share,
  Delete,
  Mail,
  Drafts,
  Inbox,
  Star,
  StarBorder,
} from '@material-ui/icons';
import { KeyboardDatePicker, KeyboardTimePicker } from '@material-ui/pickers';
import { DropzoneArea, DropzoneDialog } from 'material-ui-dropzone';
import { makeStyles, Theme } from '@material-ui/core/styles';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  section: {
    marginBottom: theme.spacing(4),
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  gridList: {
    width: '100%',
    height: 450,
  },
}));

const ComplexComponentAPIs: React.FC = () => {
  const classes = useStyles();
  
  // State for various components
  const [tabValue, setTabValue] = React.useState(0);
  const [stepperValue, setStepperValue] = React.useState(0);
  const [bottomNavValue, setBottomNavValue] = React.useState(0);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [popoverAnchorEl, setPopoverAnchorEl] = React.useState<null | HTMLElement>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [backdropOpen, setBackdropOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date());
  const [dropzoneOpen, setDropzoneOpen] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [expanded, setExpanded] = React.useState<string | false>(false);
  const [selectValue, setSelectValue] = React.useState('');
  const [checkboxState, setCheckboxState] = React.useState({
    checked1: true,
    checked2: false,
    checked3: true,
  });
  const [radioValue, setRadioValue] = React.useState('option1');
  const [switchState, setSwitchState] = React.useState({
    switch1: true,
    switch2: false,
  });

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setPopoverAnchorEl(event.currentTarget);
  };

  const handleExpansionChange = (panel: string) => (event: React.ChangeEvent<{}>, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const trigger = useScrollTrigger();

  const tileData = [
    { img: '/img1.jpg', title: 'Image 1', author: 'Author 1', cols: 2 },
    { img: '/img2.jpg', title: 'Image 2', author: 'Author 2', cols: 1 },
    { img: '/img3.jpg', title: 'Image 3', author: 'Author 3', cols: 1 },
    { img: '/img4.jpg', title: 'Image 4', author: 'Author 4', cols: 2 },
  ];

  return (
    <div className={classes.root}>
      {/* Button Component API Changes */}
      <section className={classes.section}>
        <h2>Button API Changes</h2>
        
        {/* v4 color prop values that change in v5 */}
        <Button color="default">Default Button (removed in v5)</Button>
        <Button color="primary" variant="contained">Primary</Button>
        <Button color="secondary" variant="outlined">Secondary</Button>
        
        {/* v4 size prop */}
        <Button size="small" variant="contained" color="primary">Small</Button>
        <Button size="medium" variant="contained" color="primary">Medium</Button>
        <Button size="large" variant="contained" color="primary">Large</Button>
        
        {/* Deprecated props */}
        <Button variant="contained" color="primary" disableRipple disableFocusRipple>
          Ripple Disabled
        </Button>
      </section>

      {/* TextField Component API Changes */}
      <section className={classes.section}>
        <h2>TextField API Changes</h2>
        
        {/* v4 variant that changes behavior */}
        <TextField
          variant="standard"
          label="Standard"
          helperText="Default variant in v4, not in v5"
        />
        <TextField
          variant="filled"
          label="Filled"
          helperText="FilledInput component changes"
        />
        <TextField
          variant="outlined"
          label="Outlined"
          helperText="OutlinedInput component changes"
        />
        
        {/* v4 specific props */}
        <TextField
          label="With Start Adornment"
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
        />
        
        {/* Multiline with rows */}
        <TextField
          label="Multiline"
          multiline
          rows={4}
          rowsMax={6} // Deprecated in v5, use maxRows
          variant="outlined"
        />
      </section>

      {/* Chip Component API Changes */}
      <section className={classes.section}>
        <h2>Chip API Changes</h2>
        
        {/* v4 variant prop removed in v5 */}
        <Chip label="Default Chip" variant="default" />
        <Chip label="Outlined Chip" variant="outlined" />
        
        {/* v4 size prop */}
        <Chip label="Small" size="small" />
        <Chip label="Medium" size="medium" />
        
        {/* onDelete with deleteIcon */}
        <Chip
          label="Deletable"
          onDelete={() => {}}
          deleteIcon={<Delete />}
          color="primary"
        />
        
        {/* clickable with onClick */}
        <Chip
          avatar={<Avatar>A</Avatar>}
          label="Clickable Avatar Chip"
          clickable
          onClick={() => {}}
          color="secondary"
        />
      </section>

      {/* Avatar Component API Changes */}
      <section className={classes.section}>
        <h2>Avatar API Changes</h2>
        
        {/* v4 variant (removed in v5) */}
        <Avatar variant="circle">C</Avatar>
        <Avatar variant="rounded">R</Avatar>
        <Avatar variant="square">S</Avatar>
        
        {/* With icon */}
        <Avatar>
          <AccountCircle />
        </Avatar>
        
        {/* Image avatar */}
        <Avatar alt="User Name" src="/avatar.jpg" />
        
        {/* Badge with Avatar */}
        <Badge
          overlap="circle" // Changed to "circular" in v5
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          badgeContent={4}
          color="primary"
        >
          <Avatar>U</Avatar>
        </Badge>
      </section>

      {/* Tabs Component API Changes */}
      <section className={classes.section}>
        <h2>Tabs API Changes</h2>
        
        <AppBar position="static" color="default">
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
            scrollButtons="auto" // Changed in v5
          >
            <Tab label="Tab 1" />
            <Tab label="Tab 2" />
            <Tab label="Tab 3" disabled />
            <Tab label="Tab 4" icon={<HomeIcon />} />
          </Tabs>
        </AppBar>
      </section>

      {/* ExpansionPanel (Accordion in v5) */}
      <section className={classes.section}>
        <h2>ExpansionPanel → Accordion</h2>
        
        <ExpansionPanel expanded={expanded === 'panel1'} onChange={handleExpansionChange('panel1')}>
          <ExpansionPanelSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            <h3>Panel 1</h3>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
            <p>ExpansionPanel becomes Accordion in v5</p>
          </ExpansionPanelDetails>
          <ExpansionPanelActions>
            <Button size="small">Cancel</Button>
            <Button size="small" color="primary">Save</Button>
          </ExpansionPanelActions>
        </ExpansionPanel>
        
        <ExpansionPanel expanded={expanded === 'panel2'} onChange={handleExpansionChange('panel2')}>
          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
            <h3>Panel 2</h3>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
            <p>ExpansionPanelActions becomes AccordionActions</p>
          </ExpansionPanelDetails>
        </ExpansionPanel>
      </section>

      {/* GridList (ImageList in v5) */}
      <section className={classes.section}>
        <h2>GridList → ImageList</h2>
        
        <GridList cellHeight={180} className={classes.gridList} cols={3}>
          {tileData.map((tile) => (
            <GridListTile key={tile.img} cols={tile.cols || 1}>
              <img src={tile.img} alt={tile.title} />
              <GridListTileBar
                title={tile.title}
                subtitle={<span>by: {tile.author}</span>}
                actionIcon={
                  <IconButton aria-label={`info about ${tile.title}`}>
                    <Star />
                  </IconButton>
                }
              />
            </GridListTile>
          ))}
        </GridList>
      </section>

      {/* Form Controls with breaking changes */}
      <section className={classes.section}>
        <h2>Form Control Changes</h2>
        
        <FormControl component="fieldset">
          <FormLabel component="legend">Radio Group</FormLabel>
          <RadioGroup value={radioValue} onChange={(e) => setRadioValue(e.target.value)}>
            <FormControlLabel value="option1" control={<Radio color="primary" />} label="Option 1" />
            <FormControlLabel value="option2" control={<Radio color="primary" />} label="Option 2" />
            <FormControlLabel value="option3" control={<Radio color="secondary" />} label="Option 3" />
          </RadioGroup>
        </FormControl>
        
        <FormControl variant="outlined" fullWidth margin="normal">
          <InputLabel id="select-label">Select Option</InputLabel>
          <Select
            labelId="select-label"
            value={selectValue}
            onChange={(e) => setSelectValue(e.target.value as string)}
            label="Select Option"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            <MenuItem value="option1">Option 1</MenuItem>
            <MenuItem value="option2">Option 2</MenuItem>
            <MenuItem value="option3">Option 3</MenuItem>
          </Select>
          <FormHelperText>Helper text for select</FormHelperText>
        </FormControl>
        
        {/* Native select */}
        <TextField
          select
          label="Native Select"
          value={selectValue}
          onChange={(e) => setSelectValue(e.target.value)}
          SelectProps={{
            native: true,
          }}
          variant="filled"
        >
          <option value="">None</option>
          <option value="option1">Option 1</option>
          <option value="option2">Option 2</option>
        </TextField>
      </section>

      {/* Progress indicators */}
      <section className={classes.section}>
        <h2>Progress Components</h2>
        
        {/* CircularProgress color values */}
        <CircularProgress color="primary" />
        <CircularProgress color="secondary" />
        <CircularProgress color="inherit" />
        
        {/* LinearProgress variants */}
        <LinearProgress variant="determinate" value={60} />
        <LinearProgress variant="indeterminate" />
        <LinearProgress variant="buffer" value={60} valueBuffer={80} />
        <LinearProgress variant="query" />
      </section>

      {/* Modal/Dialog related */}
      <section className={classes.section}>
        <h2>Modal and Backdrop</h2>
        
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          closeAfterTransition
          BackdropComponent={Backdrop}
          BackdropProps={{
            timeout: 500,
          }}
        >
          <Fade in={modalOpen}>
            <div style={{ backgroundColor: 'white', padding: 20, margin: '10% auto', width: 400 }}>
              <h2>Modal Title</h2>
              <p>Modal content with Fade transition</p>
            </div>
          </Fade>
        </Modal>
        
        <Button onClick={() => setBackdropOpen(true)}>Show Backdrop</Button>
        <Backdrop open={backdropOpen} onClick={() => setBackdropOpen(false)}>
          <CircularProgress color="inherit" />
        </Backdrop>
      </section>

      {/* Date/Time Pickers */}
      <section className={classes.section}>
        <h2>Date/Time Pickers (Major Changes)</h2>
        
        <KeyboardDatePicker
          disableToolbar
          variant="inline"
          format="MM/dd/yyyy"
          margin="normal"
          label="Date picker inline"
          value={selectedDate}
          onChange={setSelectedDate}
          KeyboardButtonProps={{
            'aria-label': 'change date',
          }}
        />
        
        <KeyboardTimePicker
          margin="normal"
          label="Time picker"
          value={selectedDate}
          onChange={setSelectedDate}
          KeyboardButtonProps={{
            'aria-label': 'change time',
          }}
        />
      </section>

      {/* Menu and Popover */}
      <section className={classes.section}>
        <h2>Menu and Popover</h2>
        
        <Button onClick={handleMenuClick}>Open Menu</Button>
        <Menu
          anchorEl={anchorEl}
          keepMounted
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          getContentAnchorEl={null} // Removed in v5
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <MenuItem onClick={() => setAnchorEl(null)}>Profile</MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>My account</MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>Logout</MenuItem>
        </Menu>
        
        <Button onClick={handlePopoverClick}>Open Popover</Button>
        <Popover
          open={Boolean(popoverAnchorEl)}
          anchorEl={popoverAnchorEl}
          onClose={() => setPopoverAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <div style={{ padding: 20 }}>
            <p>Popover content</p>
          </div>
        </Popover>
      </section>
    </div>
  );
};

export default ComplexComponentAPIs;
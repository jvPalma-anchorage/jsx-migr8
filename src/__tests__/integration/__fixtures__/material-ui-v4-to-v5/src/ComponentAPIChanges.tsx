import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
  Chip,
  Avatar,
  Badge,
  Slider,
  Switch,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  IconButton,
  Tooltip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Menu,
  Fade,
  Collapse,
  Alert,
  AlertTitle,
  Skeleton,
  Rating,
  Pagination,
  ToggleButton,
  ToggleButtonGroup,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Fab,
  Hidden,
  useMediaQuery,
  useTheme
} from '@material-ui/core';
import {
  ExpandMore as ExpandMoreIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Star as StarIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Menu as MenuIcon
} from '@material-ui/icons';
import { DatePicker, TimePicker, DateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import { TreeView, TreeItem } from '@material-ui/lab';
import DateFnsUtils from '@date-io/date-fns';
import { makeStyles, Theme } from '@material-ui/core/styles';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  section: {
    marginBottom: theme.spacing(4),
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
    color: theme.palette.primary.main,
  },
  componentGrid: {
    marginTop: theme.spacing(2),
  },
  demoCard: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
}));

const ComponentAPIChanges: React.FC = () => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State for various components
  const [textFieldValue, setTextFieldValue] = React.useState('');
  const [selectValue, setSelectValue] = React.useState('');
  const [autocompleteValue, setAutocompleteValue] = React.useState<any>(null);
  const [sliderValue, setSliderValue] = React.useState(30);
  const [switchChecked, setSwitchChecked] = React.useState(false);
  const [radioValue, setRadioValue] = React.useState('option1');
  const [checkboxChecked, setCheckboxChecked] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date());
  const [ratingValue, setRatingValue] = React.useState<number | null>(4);
  const [toggleValue, setToggleValue] = React.useState('left');
  const [speedDialOpen, setSpeedDialOpen] = React.useState(false);
  const [accordionExpanded, setAccordionExpanded] = React.useState<string | false>(false);

  const autocompleteOptions = [
    { title: 'The Shawshank Redemption', year: 1994 },
    { title: 'The Godfather', year: 1972 },
    { title: 'The Dark Knight', year: 2008 },
    { title: 'Pulp Fiction', year: 1994 },
    { title: 'Schindler\'s List', year: 1993 },
  ];

  const handleAccordionChange = (panel: string) => (
    event: React.ChangeEvent<{}>,
    isExpanded: boolean,
  ) => {
    setAccordionExpanded(isExpanded ? panel : false);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const speedDialActions = [
    { icon: <EditIcon />, name: 'Edit' },
    { icon: <DeleteIcon />, name: 'Delete' },
    { icon: <StarIcon />, name: 'Favorite' },
  ];

  return (
    <div className={classes.root}>
      <Typography variant="h3" className={classes.sectionTitle}>
        Component API Changes Testing
      </Typography>
      <Typography variant="body1" paragraph>
        This component demonstrates all major component API changes between Material-UI v4 and v5.
      </Typography>

      {/* Button Component Changes */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Button Component Changes
        </Typography>
        <Grid container spacing={2} className={classes.componentGrid}>
          <Grid item>
            <Button variant="contained" color="primary">
              Contained Primary
            </Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" color="secondary">
              Outlined Secondary
            </Button>
          </Grid>
          <Grid item>
            <Button variant="text" color="default">
              Text Default
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" disabled>
              Disabled
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" size="small">
              Small
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" size="large">
              Large
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" startIcon={<AddIcon />}>
              With Start Icon
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" endIcon={<EditIcon />}>
              With End Icon
            </Button>
          </Grid>
        </Grid>
      </div>

      {/* TextField Component Changes */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          TextField Component Changes
        </Typography>
        <Grid container spacing={2} className={classes.componentGrid}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Standard TextField"
              variant="standard"
              fullWidth
              value={textFieldValue}
              onChange={(e) => setTextFieldValue(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Filled TextField"
              variant="filled"
              fullWidth
              value={textFieldValue}
              onChange={(e) => setTextFieldValue(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Outlined TextField"
              variant="outlined"
              fullWidth
              value={textFieldValue}
              onChange={(e) => setTextFieldValue(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Multiline TextField"
              multiline
              rows={4}
              variant="outlined"
              fullWidth
              value={textFieldValue}
              onChange={(e) => setTextFieldValue(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="With Helper Text"
              helperText="This is helper text"
              variant="outlined"
              fullWidth
              value={textFieldValue}
              onChange={(e) => setTextFieldValue(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Error State"
              error
              helperText="This field has an error"
              variant="outlined"
              fullWidth
              value={textFieldValue}
              onChange={(e) => setTextFieldValue(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Disabled Field"
              disabled
              variant="outlined"
              fullWidth
              value="Disabled value"
            />
          </Grid>
        </Grid>
      </div>

      {/* Select Component Changes */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Select Component Changes
        </Typography>
        <Grid container spacing={2} className={classes.componentGrid}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl variant="outlined" fullWidth className={classes.formControl}>
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
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl variant="filled" fullWidth className={classes.formControl}>
              <InputLabel id="select-filled-label">Filled Select</InputLabel>
              <Select
                labelId="select-filled-label"
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value as string)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                <MenuItem value="option1">Option 1</MenuItem>
                <MenuItem value="option2">Option 2</MenuItem>
                <MenuItem value="option3">Option 3</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="Native Select"
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              variant="outlined"
              fullWidth
              SelectProps={{
                native: true,
              }}
            >
              <option value="">None</option>
              <option value="option1">Option 1</option>
              <option value="option2">Option 2</option>
              <option value="option3">Option 3</option>
            </TextField>
          </Grid>
        </Grid>
      </div>

      {/* Autocomplete Component Changes */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Autocomplete Component Changes
        </Typography>
        <Grid container spacing={2} className={classes.componentGrid}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={autocompleteOptions}
              getOptionLabel={(option) => option.title}
              value={autocompleteValue}
              onChange={(event, newValue) => setAutocompleteValue(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Movie" variant="outlined" />
              )}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              multiple
              options={autocompleteOptions}
              getOptionLabel={(option) => option.title}
              defaultValue={[autocompleteOptions[0]]}
              renderInput={(params) => (
                <TextField {...params} label="Multiple Movies" variant="outlined" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option.title}
                    {...getTagProps({ index })}
                  />
                ))
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              freeSolo
              options={autocompleteOptions.map((option) => option.title)}
              renderInput={(params) => (
                <TextField {...params} label="Free Solo" variant="outlined" />
              )}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              disabled
              options={autocompleteOptions}
              getOptionLabel={(option) => option.title}
              renderInput={(params) => (
                <TextField {...params} label="Disabled" variant="outlined" />
              )}
            />
          </Grid>
        </Grid>
      </div>

      {/* Date/Time Picker Changes */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Date/Time Picker Component Changes
        </Typography>
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <Grid container spacing={2} className={classes.componentGrid}>
            <Grid item xs={12} sm={6} md={4}>
              <DatePicker
                label="Date Picker"
                value={selectedDate}
                onChange={setSelectedDate}
                renderInput={(params) => <TextField {...params} variant="outlined" />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TimePicker
                label="Time Picker"
                value={selectedDate}
                onChange={setSelectedDate}
                renderInput={(params) => <TextField {...params} variant="outlined" />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DateTimePicker
                label="DateTime Picker"
                value={selectedDate}
                onChange={setSelectedDate}
                renderInput={(params) => <TextField {...params} variant="outlined" />}
              />
            </Grid>
          </Grid>
        </MuiPickersUtilsProvider>
      </div>

      {/* Form Control Components */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Form Control Component Changes
        </Typography>
        <Grid container spacing={2} className={classes.componentGrid}>
          <Grid item xs={12} sm={6} md={4}>
            <Card className={classes.demoCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Slider Component
                </Typography>
                <Slider
                  value={sliderValue}
                  onChange={(event, newValue) => setSliderValue(newValue as number)}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  color="primary"
                />
                <Slider
                  defaultValue={[20, 37]}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  color="secondary"
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card className={classes.demoCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Switch Component
                </Typography>
                <div className={classes.toggleContainer}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={switchChecked}
                        onChange={(e) => setSwitchChecked(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Primary Switch"
                  />
                </div>
                <div className={classes.toggleContainer}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!switchChecked}
                        onChange={(e) => setSwitchChecked(!e.target.checked)}
                        color="secondary"
                      />
                    }
                    label="Secondary Switch"
                  />
                </div>
                <div className={classes.toggleContainer}>
                  <FormControlLabel
                    control={<Switch disabled />}
                    label="Disabled Switch"
                  />
                </div>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card className={classes.demoCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Radio & Checkbox
                </Typography>
                <RadioGroup
                  value={radioValue}
                  onChange={(e) => setRadioValue(e.target.value)}
                >
                  <FormControlLabel
                    value="option1"
                    control={<Radio color="primary" />}
                    label="Option 1"
                  />
                  <FormControlLabel
                    value="option2"
                    control={<Radio color="primary" />}
                    label="Option 2"
                  />
                  <FormControlLabel
                    value="option3"
                    control={<Radio color="secondary" />}
                    label="Option 3"
                  />
                </RadioGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={checkboxChecked}
                      onChange={(e) => setCheckboxChecked(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Checkbox"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </div>

      {/* Chip and Avatar Changes */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Chip and Avatar Component Changes
        </Typography>
        <Grid container spacing={2} className={classes.componentGrid}>
          <Grid item xs={12} sm={6}>
            <Card className={classes.demoCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Chip Variants
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  <Chip label="Default" />
                  <Chip label="Primary" color="primary" />
                  <Chip label="Secondary" color="secondary" />
                  <Chip label="Outlined" variant="outlined" />
                  <Chip label="Outlined Primary" variant="outlined" color="primary" />
                  <Chip label="Clickable" clickable />
                  <Chip label="Deletable" onDelete={() => {}} />
                  <Chip label="With Avatar" avatar={<Avatar>M</Avatar>} />
                  <Chip label="With Icon" icon={<FavoriteIcon />} />
                  <Chip label="Small" size="small" />
                  <Chip label="Disabled" disabled />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card className={classes.demoCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Avatar and Badge
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
                  <Avatar>H</Avatar>
                  <Avatar src="/static/images/avatar/1.jpg">H</Avatar>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <FavoriteIcon />
                  </Avatar>
                  <Badge badgeContent={4} color="primary">
                    <Avatar>B</Avatar>
                  </Badge>
                  <Badge badgeContent={4} color="secondary">
                    <NotificationsIcon />
                  </Badge>
                  <Badge variant="dot" color="primary">
                    <Avatar>D</Avatar>
                  </Badge>
                  <Badge badgeContent={100} max={99} color="error">
                    <Avatar>99+</Avatar>
                  </Badge>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </div>

      {/* Rating and Pagination */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Rating and Pagination Components
        </Typography>
        <Grid container spacing={2} className={classes.componentGrid}>
          <Grid item xs={12} sm={6}>
            <Card className={classes.demoCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Rating Component
                </Typography>
                <Rating
                  value={ratingValue}
                  onChange={(event, newValue) => setRatingValue(newValue)}
                />
                <Rating
                  value={ratingValue}
                  onChange={(event, newValue) => setRatingValue(newValue)}
                  size="large"
                />
                <Rating
                  value={ratingValue}
                  onChange={(event, newValue) => setRatingValue(newValue)}
                  size="small"
                />
                <Rating
                  value={ratingValue}
                  onChange={(event, newValue) => setRatingValue(newValue)}
                  icon={<FavoriteIcon />}
                  emptyIcon={<FavoriteBorderIcon />}
                />
                <Rating
                  value={ratingValue}
                  onChange={(event, newValue) => setRatingValue(newValue)}
                  precision={0.5}
                />
                <Rating value={ratingValue} readOnly />
                <Rating value={ratingValue} disabled />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card className={classes.demoCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pagination Component
                </Typography>
                <Pagination count={10} />
                <Pagination count={10} color="primary" />
                <Pagination count={10} color="secondary" />
                <Pagination count={10} variant="outlined" />
                <Pagination count={10} variant="outlined" color="primary" />
                <Pagination count={10} size="small" />
                <Pagination count={10} size="large" />
                <Pagination count={10} disabled />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </div>

      {/* Toggle Button Group */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Toggle Button Group
        </Typography>
        <Card className={classes.demoCard}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Toggle Button Variants
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <ToggleButtonGroup
                value={toggleValue}
                exclusive
                onChange={(event, newValue) => setToggleValue(newValue)}
              >
                <ToggleButton value="left">Left</ToggleButton>
                <ToggleButton value="center">Center</ToggleButton>
                <ToggleButton value="right">Right</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                value={toggleValue}
                exclusive
                onChange={(event, newValue) => setToggleValue(newValue)}
                color="primary"
              >
                <ToggleButton value="left">Left</ToggleButton>
                <ToggleButton value="center">Center</ToggleButton>
                <ToggleButton value="right">Right</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                value={toggleValue}
                exclusive
                onChange={(event, newValue) => setToggleValue(newValue)}
                size="small"
              >
                <ToggleButton value="left">Left</ToggleButton>
                <ToggleButton value="center">Center</ToggleButton>
                <ToggleButton value="right">Right</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </CardContent>
        </Card>
      </div>

      {/* Accordion (was ExpansionPanel) */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Accordion Component (was ExpansionPanel)
        </Typography>
        <Accordion
          expanded={accordionExpanded === 'panel1'}
          onChange={handleAccordionChange('panel1')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Accordion 1</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
              malesuada lacus ex, sit amet blandit leo lobortis eget.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion
          expanded={accordionExpanded === 'panel2'}
          onChange={handleAccordionChange('panel2')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Accordion 2</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
              malesuada lacus ex, sit amet blandit leo lobortis eget.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </div>

      {/* Skeleton Component */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Skeleton Component
        </Typography>
        <Card className={classes.demoCard}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Skeleton Variants
            </Typography>
            <Skeleton variant="text" />
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="rect" width={210} height={118} />
            <Skeleton variant="circle" width={40} height={40} />
            <Skeleton variant="rect" width={210} height={118} animation="wave" />
            <Skeleton variant="rect" width={210} height={118} animation={false} />
          </CardContent>
        </Card>
      </div>

      {/* Alert Component */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Alert Component
        </Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            This is an error alert — check it out!
          </Alert>
          <Alert severity="warning">
            <AlertTitle>Warning</AlertTitle>
            This is a warning alert — check it out!
          </Alert>
          <Alert severity="info">
            <AlertTitle>Info</AlertTitle>
            This is an info alert — check it out!
          </Alert>
          <Alert severity="success">
            <AlertTitle>Success</AlertTitle>
            This is a success alert — check it out!
          </Alert>
          <Alert severity="error" variant="outlined">
            This is an outlined error alert — check it out!
          </Alert>
          <Alert severity="warning" variant="filled">
            This is a filled warning alert — check it out!
          </Alert>
        </Box>
      </div>

      {/* TreeView Component */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          TreeView Component
        </Typography>
        <Card className={classes.demoCard}>
          <CardContent>
            <TreeView
              defaultCollapseIcon={<ExpandMoreIcon />}
              defaultExpandIcon={<AddIcon />}
            >
              <TreeItem nodeId="1" label="Applications">
                <TreeItem nodeId="2" label="Calendar" />
                <TreeItem nodeId="3" label="Chrome" />
                <TreeItem nodeId="4" label="Webstorm" />
              </TreeItem>
              <TreeItem nodeId="5" label="Documents">
                <TreeItem nodeId="6" label="MUI">
                  <TreeItem nodeId="7" label="src">
                    <TreeItem nodeId="8" label="index.js" />
                    <TreeItem nodeId="9" label="tree-view.js" />
                  </TreeItem>
                </TreeItem>
              </TreeItem>
            </TreeView>
          </CardContent>
        </Card>
      </div>

      {/* Hidden Component (Deprecated) */}
      <Hidden smDown>
        <div className={classes.section}>
          <Typography variant="h5" className={classes.sectionTitle}>
            Hidden Component (Deprecated in v5)
          </Typography>
          <Alert severity="warning">
            The Hidden component is deprecated in v5. Use the sx prop or useMediaQuery hook instead.
          </Alert>
        </div>
      </Hidden>

      {/* Floating Action Button and SpeedDial */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Floating Action Button and SpeedDial
        </Typography>
        <Grid container spacing={2} className={classes.componentGrid}>
          <Grid item xs={12} sm={6}>
            <Card className={classes.demoCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Floating Action Button
                </Typography>
                <Box display="flex" gap={2}>
                  <Fab color="primary" aria-label="add">
                    <AddIcon />
                  </Fab>
                  <Fab color="secondary" aria-label="edit">
                    <EditIcon />
                  </Fab>
                  <Fab variant="extended">
                    <SearchIcon />
                    Search
                  </Fab>
                  <Fab disabled aria-label="like">
                    <FavoriteIcon />
                  </Fab>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card className={classes.demoCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  SpeedDial
                </Typography>
                <Box position="relative" height={100}>
                  <SpeedDial
                    ariaLabel="SpeedDial example"
                    icon={<SpeedDialIcon />}
                    open={speedDialOpen}
                    onClose={() => setSpeedDialOpen(false)}
                    onOpen={() => setSpeedDialOpen(true)}
                    direction="up"
                  >
                    {speedDialActions.map((action) => (
                      <SpeedDialAction
                        key={action.name}
                        icon={action.icon}
                        tooltipTitle={action.name}
                      />
                    ))}
                  </SpeedDial>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </div>

      {/* Dialog and Snackbar */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Dialog and Snackbar
        </Typography>
        <Box display="flex" gap={2}>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Open Dialog
          </Button>
          <Button variant="contained" onClick={() => setSnackbarOpen(true)}>
            Show Snackbar
          </Button>
        </Box>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogContent>
            <Typography>
              This is a dialog with various components that have API changes in v5.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => setDialogOpen(false)} variant="contained">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          message="This is a snackbar message"
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={() => setSnackbarOpen(false)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        />
      </div>

      {/* Menu Component */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Menu Component
        </Typography>
        <Button
          variant="contained"
          onClick={handleMenuClick}
          endIcon={<MenuIcon />}
        >
          Open Menu
        </Button>
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
          <MenuItem onClick={handleMenuClose}>My account</MenuItem>
          <MenuItem onClick={handleMenuClose}>Logout</MenuItem>
        </Menu>
      </div>

      {/* Summary */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Migration Summary
        </Typography>
        <Alert severity="info">
          <AlertTitle>Key API Changes</AlertTitle>
          <Typography variant="body2" component="div">
            <ul>
              <li>ExpansionPanel → Accordion (component rename)</li>
              <li>Hidden component deprecated (use sx prop or useMediaQuery)</li>
              <li>Skeleton variant "rect" → "rectangular", "circle" → "circular"</li>
              <li>DatePicker renderInput prop → slots.textField</li>
              <li>Alert and Skeleton moved from lab to core</li>
              <li>TreeView moved to separate package @mui/x-tree-view</li>
              <li>Many color prop values changed (e.g., "default" → "inherit")</li>
              <li>Some size prop values changed</li>
              <li>Event handler signatures may have changed</li>
            </ul>
          </Typography>
        </Alert>
      </div>
    </div>
  );
};

export default ComponentAPIChanges;
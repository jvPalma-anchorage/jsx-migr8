import React from 'react';
import {
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  Box,
  Chip,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  ListItemSecondaryAction,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormControlLabel,
  Switch,
  Slider,
  CircularProgress,
  LinearProgress,
  Badge,
  Tooltip,
  Fab,
  Divider,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Skeleton,
  ExpansionPanel,
  ExpansionPanelSummary,
  ExpansionPanelDetails,
} from '@material-ui/core';
import {
  Add,
  Delete,
  Edit,
  Save,
  Cancel,
  Home,
  Settings,
  Favorite,
  Star,
  Share,
  ExpandMore,
  MoreVert,
  Close,
  Check,
  Clear,
  ArrowBack,
  ArrowForward,
  KeyboardArrowUp,
  KeyboardArrowDown,
  FirstPage,
  LastPage,
  Refresh,
  Search,
  FilterList,
  Print,
  GetApp,
  CloudUpload,
  CloudDownload,
  Mail,
  Notifications,
  Person,
  Group,
  Work,
  School,
  LocalHospital,
  Restaurant,
  Hotel,
  Flight,
  Train,
  DirectionsCar,
  Phone,
  Email,
  LocationOn,
  Schedule,
  Today,
  Event,
  AlarmOn,
  Lock,
  LockOpen,
  Visibility,
  VisibilityOff,
  ThumbUp,
  ThumbDown,
  Comment,
  Forum,
  QuestionAnswer,
  LiveHelp,
  Announcement,
  Info,
  Warning,
  Error,
  CheckCircle,
  RadioButtonUnchecked,
  RadioButtonChecked,
  CheckBox,
  CheckBoxOutlineBlank,
  IndeterminateCheckBox,
  ToggleOff,
  ToggleOn,
  StarBorder,
  StarHalf,
  Grade,
  Bookmark,
  BookmarkBorder,
  PlayArrow,
  Pause,
  Stop,
  SkipNext,
  SkipPrevious,
  FastForward,
  FastRewind,
  VolumeUp,
  VolumeDown,
  VolumeMute,
  VolumeOff,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  PhotoCamera,
  Photo,
  Palette,
  Brush,
  ColorLens,
  FormatPaint,
  Create,
  Gesture,
  Highlight,
  BorderColor,
} from '@material-ui/icons';
import { makeStyles, Theme, fade, darken, lighten } from '@material-ui/core/styles';
import { DatePicker, TimePicker, DateTimePicker } from '@material-ui/pickers';
import { TreeView, TreeItem, Rating, Autocomplete, Pagination, SpeedDial, SpeedDialAction, SpeedDialIcon } from '@material-ui/lab';

// Generate large amounts of data for stress testing
const generateLargeDataset = (size: number) => {
  return Array.from({ length: size }, (_, index) => ({
    id: index,
    name: `Item ${index}`,
    description: `Description for item ${index}`,
    status: ['active', 'inactive', 'pending'][index % 3],
    priority: ['high', 'medium', 'low'][index % 3],
    date: new Date(2023, index % 12, (index % 28) + 1),
    value: Math.floor(Math.random() * 1000),
    checked: index % 2 === 0,
    rating: (index % 5) + 1,
    avatar: `/avatar-${index % 10}.jpg`,
    email: `user${index}@example.com`,
    phone: `+1-555-${String(index).padStart(4, '0')}`,
    address: `${index} Main St, City ${index % 50}, State`,
    tags: [`tag${index % 5}`, `tag${index % 7}`, `tag${index % 3}`],
    category: ['Electronics', 'Clothing', 'Food', 'Books', 'Sports'][index % 5],
    price: (Math.random() * 1000).toFixed(2),
    quantity: Math.floor(Math.random() * 100),
    discount: index % 4 === 0 ? 0.1 : index % 3 === 0 ? 0.2 : 0,
  }));
};

const LARGE_DATASET = generateLargeDataset(1000);
const HUGE_DATASET = generateLargeDataset(5000);

// Complex makeStyles with many classes
const useStyles = makeStyles((theme: Theme) => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(3),
    backgroundColor: fade(theme.palette.background.default, 0.8),
  },
  // Generate many style classes for stress testing
  ...Array.from({ length: 100 }, (_, i) => ({
    [`dynamicClass${i}`]: {
      padding: theme.spacing(i % 4),
      margin: theme.spacing(i % 3),
      backgroundColor: i % 2 === 0 
        ? fade(theme.palette.primary.main, (i % 10) / 10)
        : fade(theme.palette.secondary.main, (i % 10) / 10),
      borderRadius: theme.shape.borderRadius * (i % 3),
      transition: theme.transitions.create(['all'], {
        duration: theme.transitions.duration.standard,
      }),
      '&:hover': {
        transform: `scale(${1 + (i % 5) / 20})`,
        backgroundColor: i % 2 === 0
          ? darken(theme.palette.primary.main, (i % 10) / 20)
          : lighten(theme.palette.secondary.main, (i % 10) / 20),
      },
    },
  })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
  card: {
    margin: theme.spacing(1),
    transition: theme.transitions.create(['transform', 'box-shadow']),
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[8],
    },
  },
  tableContainer: {
    maxHeight: 600,
    '& .MuiTableCell-root': {
      padding: theme.spacing(1),
    },
  },
  nestedList: {
    paddingLeft: theme.spacing(4),
  },
}));

// Component with thousands of Material-UI elements
const PerformanceStressTest: React.FC = () => {
  const classes = useStyles();
  const [selectedItems, setSelectedItems] = React.useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());
  const [dialogStates, setDialogStates] = React.useState<{ [key: number]: boolean }>({});
  const [snackbarStates, setSnackbarStates] = React.useState<{ [key: number]: boolean }>({});

  const handleSelect = (id: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleExpand = (nodeId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Render large grid of cards
  const renderCardGrid = (dataset: typeof LARGE_DATASET) => (
    <Grid container spacing={2}>
      {dataset.map((item) => (
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={item.id}>
          <Card className={classes.card}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Badge badgeContent={item.value} color="primary" max={999}>
                  <Avatar src={item.avatar}>{item.name.charAt(0)}</Avatar>
                </Badge>
                <Box ml={2} flexGrow={1}>
                  <Typography variant="h6" noWrap>
                    {item.name}
                  </Typography>
                  <Chip 
                    label={item.status} 
                    size="small" 
                    color={item.status === 'active' ? 'primary' : 'default'}
                  />
                </Box>
                <IconButton size="small">
                  <MoreVert />
                </IconButton>
              </Box>
              <Typography variant="body2" color="textSecondary">
                {item.description}
              </Typography>
              <Box mt={1}>
                <Rating value={item.rating} size="small" />
              </Box>
              <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
                {item.tags.map((tag, idx) => (
                  <Chip key={idx} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
            </CardContent>
            <CardActions>
              <Button size="small" startIcon={<Edit />}>Edit</Button>
              <Button size="small" startIcon={<Delete />} color="secondary">Delete</Button>
              <IconButton size="small">
                <Favorite color={selectedItems.has(item.id) ? 'secondary' : 'disabled'} />
              </IconButton>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // Render large data table
  const renderDataTable = (dataset: typeof LARGE_DATASET) => (
    <TableContainer component={Paper} className={classes.tableContainer}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox />
            </TableCell>
            <TableCell>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Rating</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dataset.map((row) => (
            <TableRow key={row.id} hover selected={selectedItems.has(row.id)}>
              <TableCell padding="checkbox">
                <Checkbox 
                  checked={selectedItems.has(row.id)}
                  onChange={() => handleSelect(row.id)}
                />
              </TableCell>
              <TableCell>{row.id}</TableCell>
              <TableCell>
                <Box display="flex" alignItems="center">
                  <Avatar src={row.avatar} style={{ width: 24, height: 24, marginRight: 8 }}>
                    {row.name.charAt(0)}
                  </Avatar>
                  {row.name}
                </Box>
              </TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>
                <Chip 
                  label={row.status} 
                  size="small"
                  color={row.status === 'active' ? 'primary' : 'default'}
                />
              </TableCell>
              <TableCell>{row.category}</TableCell>
              <TableCell>${row.price}</TableCell>
              <TableCell>
                <Rating value={row.rating} size="small" readOnly />
              </TableCell>
              <TableCell>
                <IconButton size="small"><Edit /></IconButton>
                <IconButton size="small"><Delete /></IconButton>
                <IconButton size="small"><Share /></IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render nested lists
  const renderNestedList = (dataset: typeof LARGE_DATASET, depth: number = 0): JSX.Element => {
    if (depth > 3) return <></>;
    
    return (
      <List>
        {dataset.slice(0, 20).map((item) => (
          <React.Fragment key={`${depth}-${item.id}`}>
            <ListItem button onClick={() => handleExpand(`${depth}-${item.id}`)}>
              <ListItemIcon>
                {expandedItems.has(`${depth}-${item.id}`) ? <ExpandMore /> : <ChevronRight />}
              </ListItemIcon>
              <ListItemAvatar>
                <Avatar src={item.avatar}>{item.name.charAt(0)}</Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary={item.name}
                secondary={item.description}
              />
              <ListItemSecondaryAction>
                <IconButton edge="end">
                  <MoreVert />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
            {expandedItems.has(`${depth}-${item.id}`) && (
              <div className={classes.nestedList}>
                {renderNestedList(dataset.slice(item.id * 5, (item.id + 1) * 5), depth + 1)}
              </div>
            )}
          </React.Fragment>
        ))}
      </List>
    );
  };

  // Render many form controls
  const renderMassiveForm = () => (
    <Grid container spacing={2}>
      {LARGE_DATASET.slice(0, 100).map((item) => (
        <Grid item xs={12} sm={6} md={4} key={item.id}>
          <Paper style={{ padding: 16 }}>
            <TextField
              fullWidth
              label={`Field ${item.id}`}
              defaultValue={item.name}
              margin="normal"
              variant="outlined"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Category {item.id}</InputLabel>
              <Select defaultValue={item.category}>
                <MenuItem value="Electronics">Electronics</MenuItem>
                <MenuItem value="Clothing">Clothing</MenuItem>
                <MenuItem value="Food">Food</MenuItem>
                <MenuItem value="Books">Books</MenuItem>
                <MenuItem value="Sports">Sports</MenuItem>
              </Select>
            </FormControl>
            <Box mt={2}>
              <FormControlLabel
                control={<Checkbox defaultChecked={item.checked} />}
                label={`Checkbox ${item.id}`}
              />
              <FormControlLabel
                control={<Switch defaultChecked={item.checked} />}
                label={`Switch ${item.id}`}
              />
            </Box>
            <Box mt={2}>
              <Typography gutterBottom>Slider {item.id}</Typography>
              <Slider defaultValue={item.value % 100} />
            </Box>
            <Box mt={2}>
              <DatePicker
                label={`Date ${item.id}`}
                value={item.date}
                onChange={() => {}}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );

  // Render many dialogs
  const renderDialogs = () => (
    <>
      {LARGE_DATASET.slice(0, 50).map((item) => (
        <Dialog 
          key={item.id} 
          open={dialogStates[item.id] || false}
          onClose={() => setDialogStates(prev => ({ ...prev, [item.id]: false }))}
        >
          <DialogTitle>Dialog {item.id}</DialogTitle>
          <DialogContent>
            <Typography>{item.description}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogStates(prev => ({ ...prev, [item.id]: false }))}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      ))}
    </>
  );

  // Render expansion panels
  const renderExpansionPanels = () => (
    <>
      {LARGE_DATASET.slice(0, 100).map((item) => (
        <ExpansionPanel key={item.id} expanded={expandedItems.has(`panel-${item.id}`)}>
          <ExpansionPanelSummary
            expandIcon={<ExpandMore />}
            onClick={() => handleExpand(`panel-${item.id}`)}
          >
            <Typography>{item.name}</Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Nested Field 1" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Nested Field 2" />
              </Grid>
              <Grid item xs={12}>
                <RadioGroup row defaultValue={item.priority}>
                  <FormControlLabel value="high" control={<Radio />} label="High" />
                  <FormControlLabel value="medium" control={<Radio />} label="Medium" />
                  <FormControlLabel value="low" control={<Radio />} label="Low" />
                </RadioGroup>
              </Grid>
            </Grid>
          </ExpansionPanelDetails>
        </ExpansionPanel>
      ))}
    </>
  );

  return (
    <div className={classes.root}>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            Performance Stress Test - {HUGE_DATASET.length} Items
          </Typography>
          <IconButton color="inherit"><Search /></IconButton>
          <IconButton color="inherit"><FilterList /></IconButton>
          <IconButton color="inherit"><Refresh /></IconButton>
        </Toolbar>
      </AppBar>

      <Box mt={3}>
        <Typography variant="h4" gutterBottom>
          Massive Component Rendering Test
        </Typography>

        {/* Render different sections */}
        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Card Grid ({LARGE_DATASET.length} cards)
          </Typography>
          {renderCardGrid(LARGE_DATASET)}
        </Box>

        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Data Table ({HUGE_DATASET.length} rows)
          </Typography>
          {renderDataTable(HUGE_DATASET)}
        </Box>

        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Nested Lists
          </Typography>
          <Paper>
            {renderNestedList(LARGE_DATASET)}
          </Paper>
        </Box>

        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Massive Form (100 form groups)
          </Typography>
          {renderMassiveForm()}
        </Box>

        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Expansion Panels (100 panels)
          </Typography>
          {renderExpansionPanels()}
        </Box>

        {/* Hidden dialogs */}
        {renderDialogs()}

        {/* Many floating action buttons */}
        <Box position="fixed" bottom={16} right={16}>
          <SpeedDial
            ariaLabel="Speed Dial"
            icon={<SpeedDialIcon />}
            direction="up"
          >
            {[Save, Print, Share, Delete, Edit].map((Icon, index) => (
              <SpeedDialAction
                key={index}
                icon={<Icon />}
                tooltipTitle={`Action ${index + 1}`}
              />
            ))}
          </SpeedDial>
        </Box>
      </Box>
    </div>
  );
};

export default PerformanceStressTest;
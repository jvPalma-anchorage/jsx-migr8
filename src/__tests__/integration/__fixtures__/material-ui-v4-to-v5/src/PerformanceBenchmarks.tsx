import React from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Badge,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
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
  AppBar,
  Toolbar,
  Drawer,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Skeleton,
  CircularProgress,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Breadcrumbs,
  Link,
  Tooltip,
  Popper,
  ClickAwayListener,
  Menu,
  MenuList,
  Backdrop,
  Modal,
  Fade,
  Grow,
  Slide,
  Zoom,
  Collapse
} from '@material-ui/core';

import {
  Home as HomeIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Favorite as FavoriteIcon,
  Star as StarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  DateRange as CalendarIcon,
  AccessTime as TimeIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Menu as MenuIcon,
  MoreVert as MoreVertIcon,
  MoreHoriz as MoreHorizIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFile as InsertDriveFileIcon,
  Image as ImageIcon,
  Videocam as VideoIcon,
  AudioTrack as AudioIcon,
  AttachFile as AttachFileIcon,
  Link as LinkIcon,
  Launch as LaunchIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
  BugReport as BugReportIcon,
  Feedback as FeedbackIcon,
  Comment as CommentIcon,
  Chat as ChatIcon,
  Message as MessageIcon,
  Forum as ForumIcon,
  Group as GroupIcon,
  SupervisorAccount as SupervisorAccountIcon,
  AccountCircle as AccountCircleIcon,
  AccountBox as AccountBoxIcon,
  Contacts as ContactsIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  LocalHospital as LocalHospitalIcon,
  Restaurant as RestaurantIcon,
  ShoppingCart as ShoppingCartIcon,
  Payment as PaymentIcon,
  CreditCard as CreditCardIcon,
  MonetizationOn as MonetizationOnIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Dashboard as DashboardIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  ViewComfy as ViewComfyIcon,
  GridOn as GridOnIcon,
  TableChart as TableChartIcon,
  List as ListIcon,
  Reorder as ReorderIcon,
  Sort as SortIcon,
  FilterList as FilterListIcon
} from '@material-ui/icons';

import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import { fade, darken, lighten } from '@material-ui/core/styles/colorManipulator';

// Complex styling for performance testing
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      padding: theme.spacing(2),
      backgroundColor: theme.palette.background.default,
    },
    performanceSection: {
      marginBottom: theme.spacing(4),
      padding: theme.spacing(3),
      backgroundColor: theme.palette.background.paper,
      borderRadius: theme.shape.borderRadius * 2,
      boxShadow: theme.shadows[2],
    },
    largeGrid: {
      '& .MuiGrid-item': {
        padding: theme.spacing(1),
      },
    },
    stressCard: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: theme.transitions.create(['transform', 'box-shadow'], {
        duration: theme.transitions.duration.short,
      }),
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[4],
      },
    },
    complexButton: {
      background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
      border: 0,
      borderRadius: theme.shape.borderRadius * 2,
      boxShadow: theme.shadows[3],
      color: 'white',
      padding: theme.spacing(1, 3),
      '&:hover': {
        background: `linear-gradient(45deg, ${darken(theme.palette.primary.main, 0.1)} 30%, ${darken(theme.palette.secondary.main, 0.1)} 90%)`,
        boxShadow: theme.shadows[6],
      },
    },
    deeplyNestedItem: {
      backgroundColor: fade(theme.palette.primary.main, 0.05),
      border: `1px solid ${fade(theme.palette.primary.main, 0.2)}`,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(1),
      margin: theme.spacing(0.5),
      '&:nth-child(odd)': {
        backgroundColor: fade(theme.palette.secondary.main, 0.05),
        borderColor: fade(theme.palette.secondary.main, 0.2),
      },
      '&:hover': {
        backgroundColor: fade(theme.palette.primary.main, 0.1),
        borderColor: theme.palette.primary.main,
        '&:nth-child(odd)': {
          backgroundColor: fade(theme.palette.secondary.main, 0.1),
          borderColor: theme.palette.secondary.main,
        },
      },
    },
    massiveTable: {
      '& .MuiTableCell-root': {
        padding: theme.spacing(0.5, 1),
        borderBottom: `1px solid ${fade(theme.palette.divider, 0.5)}`,
      },
      '& .MuiTableRow-root': {
        '&:hover': {
          backgroundColor: fade(theme.palette.primary.main, 0.04),
        },
        '&:nth-child(even)': {
          backgroundColor: fade(theme.palette.background.default, 0.5),
        },
      },
    },
    complexList: {
      '& .MuiListItem-root': {
        borderBottom: `1px solid ${theme.palette.divider}`,
        '&:hover': {
          backgroundColor: fade(theme.palette.primary.main, 0.04),
        },
      },
    },
    heavyAnimation: {
      '@keyframes complexAnimation': {
        '0%': {
          transform: 'rotate(0deg) scale(1)',
          backgroundColor: theme.palette.primary.main,
        },
        '25%': {
          transform: 'rotate(90deg) scale(1.1)',
          backgroundColor: theme.palette.secondary.main,
        },
        '50%': {
          transform: 'rotate(180deg) scale(1.2)',
          backgroundColor: theme.palette.error.main,
        },
        '75%': {
          transform: 'rotate(270deg) scale(1.1)',
          backgroundColor: theme.palette.warning.main,
        },
        '100%': {
          transform: 'rotate(360deg) scale(1)',
          backgroundColor: theme.palette.success.main,
        },
      },
      animation: '$complexAnimation 4s infinite',
    },
  })
);

// Generate large amounts of test data
const generateMockData = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Item ${index + 1}`,
    description: `Description for item ${index + 1} with some longer text to test performance`,
    category: ['Electronics', 'Books', 'Clothing', 'Home', 'Sports'][index % 5],
    price: Math.random() * 1000,
    rating: Math.random() * 5,
    inStock: Math.random() > 0.5,
    image: `https://picsum.photos/100/100?random=${index}`,
    tags: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => `tag${i + 1}`),
    metadata: {
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      views: Math.floor(Math.random() * 10000),
      likes: Math.floor(Math.random() * 1000),
    }
  }));
};

// Component with deep nesting for stress testing
const DeeplyNestedComponent: React.FC<{ depth: number; data: any }> = ({ depth, data }) => {
  const classes = useStyles();
  
  if (depth === 0) {
    return (
      <div className={classes.deeplyNestedItem}>
        <Typography variant="caption">
          Leaf node: {data.name}
        </Typography>
      </div>
    );
  }

  return (
    <div className={classes.deeplyNestedItem}>
      <Typography variant="body2">
        Depth {depth}: {data.name}
      </Typography>
      <Box ml={2}>
        {Array.from({ length: 3 }, (_, index) => (
          <DeeplyNestedComponent
            key={index}
            depth={depth - 1}
            data={{ ...data, name: `${data.name}.${index}` }}
          />
        ))}
      </Box>
    </div>
  );
};

// Large form component for testing form performance
const MassiveForm: React.FC = () => {
  const classes = useStyles();
  const [formData, setFormData] = React.useState<Record<string, any>>({});

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  return (
    <form>
      <Grid container spacing={2}>
        {Array.from({ length: 100 }, (_, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <TextField
              label={`Field ${index + 1}`}
              variant="outlined"
              size="small"
              fullWidth
              value={formData[`field${index}`] || ''}
              onChange={handleChange(`field${index}`)}
              InputProps={{
                startAdornment: index % 5 === 0 ? <SearchIcon /> : undefined,
                endAdornment: index % 7 === 0 ? <ClearIcon /> : undefined,
              }}
            />
          </Grid>
        ))}
        {Array.from({ length: 50 }, (_, index) => (
          <Grid item xs={12} sm={6} md={4} key={`select-${index}`}>
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel>Select {index + 1}</InputLabel>
              <Select
                value={formData[`select${index}`] || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, [`select${index}`]: e.target.value }))}
                label={`Select ${index + 1}`}
              >
                {Array.from({ length: 20 }, (_, optIndex) => (
                  <MenuItem key={optIndex} value={`option${optIndex}`}>
                    Option {optIndex + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        ))}
      </Grid>
    </form>
  );
};

// Performance benchmark component
const PerformanceBenchmarks: React.FC = () => {
  const classes = useStyles();
  const [largeDataset] = React.useState(() => generateMockData(1000));
  const [mediumDataset] = React.useState(() => generateMockData(500));
  const [selectedItems, setSelectedItems] = React.useState<Set<number>>(new Set());
  const [accordionExpanded, setAccordionExpanded] = React.useState<string | false>(false);
  const [tabValue, setTabValue] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const handleItemSelect = (id: number) => {
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

  const handleAccordionChange = (panel: string) => (
    event: React.ChangeEvent<{}>,
    isExpanded: boolean,
  ) => {
    setAccordionExpanded(isExpanded ? panel : false);
  };

  return (
    <div className={classes.root}>
      <Typography variant="h3" gutterBottom>
        Performance Benchmark Testing
      </Typography>
      <Typography variant="body1" paragraph>
        This component tests jsx-migr8 performance with large component trees, 
        complex styling, and extensive Material-UI component usage.
      </Typography>

      {/* Large Grid Performance Test */}
      <Paper className={classes.performanceSection}>
        <Typography variant="h5" gutterBottom>
          Large Grid Performance Test (1000 Items)
        </Typography>
        <Grid container spacing={1} className={classes.largeGrid}>
          {largeDataset.slice(0, 200).map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={item.id}>
              <Card className={classes.stressCard}>
                <CardContent style={{ padding: 8 }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar style={{ width: 24, height: 24, marginRight: 8 }}>
                      {item.name.charAt(0)}
                    </Avatar>
                    <Typography variant="caption" noWrap>
                      {item.name}
                    </Typography>
                  </Box>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {item.tags.slice(0, 2).map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        variant="outlined"
                        style={{ fontSize: '0.6rem', height: 16 }}
                      />
                    ))}
                  </Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                    <Typography variant="caption" color="textSecondary">
                      ${item.price.toFixed(2)}
                    </Typography>
                    <Checkbox
                      size="small"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleItemSelect(item.id)}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Massive Table Performance Test */}
      <Paper className={classes.performanceSection}>
        <Typography variant="h5" gutterBottom>
          Large Table Performance Test (500 Rows)
        </Typography>
        <TableContainer style={{ maxHeight: 400 }}>
          <Table stickyHeader className={classes.massiveTable}>
            <TableHead>
              <TableRow>
                <TableCell>Select</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Views</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mediumDataset.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleItemSelect(item.id)}
                    />
                  </TableCell>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar style={{ width: 20, height: 20, marginRight: 8 }}>
                        {item.name.charAt(0)}
                      </Avatar>
                      {item.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={item.category} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <StarIcon style={{ fontSize: 14, marginRight: 4 }} />
                      {item.rating.toFixed(1)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.inStock ? 'In Stock' : 'Out'}
                      size="small"
                      color={item.inStock ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{item.metadata.views.toLocaleString()}</TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Complex List Performance Test */}
      <Paper className={classes.performanceSection}>
        <Typography variant="h5" gutterBottom>
          Complex List Performance Test (300 Items)
        </Typography>
        <List className={classes.complexList} style={{ maxHeight: 400, overflow: 'auto' }}>
          {largeDataset.slice(0, 300).map((item) => (
            <ListItem key={item.id} dense>
              <ListItemIcon>
                <Badge
                  badgeContent={item.metadata.likes > 500 ? item.metadata.likes : 0}
                  color="error"
                  max={999}
                >
                  <Avatar style={{ width: 32, height: 32 }}>
                    {item.name.charAt(0)}
                  </Avatar>
                </Badge>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">{item.name}</Typography>
                    <Chip label={item.category} size="small" />
                    {item.inStock && <Chip label="In Stock" size="small" color="primary" />}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      {item.description}
                    </Typography>
                    <Box display="flex" gap={0.5} mt={0.5}>
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          variant="outlined"
                          style={{ fontSize: '0.6rem', height: 16 }}
                        />
                      ))}
                    </Box>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Tooltip title="Favorite">
                  <IconButton size="small">
                    <FavoriteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="More actions">
                  <IconButton size="small">
                    <MoreVertIcon />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Deep Nesting Performance Test */}
      <Paper className={classes.performanceSection}>
        <Typography variant="h5" gutterBottom>
          Deep Nesting Performance Test (Depth 8)
        </Typography>
        <Box style={{ maxHeight: 300, overflow: 'auto' }}>
          {Array.from({ length: 5 }, (_, index) => (
            <DeeplyNestedComponent
              key={index}
              depth={8}
              data={{ name: `Root${index}` }}
            />
          ))}
        </Box>
      </Paper>

      {/* Massive Form Performance Test */}
      <Paper className={classes.performanceSection}>
        <Typography variant="h5" gutterBottom>
          Large Form Performance Test (150 Inputs)
        </Typography>
        <Box style={{ maxHeight: 400, overflow: 'auto' }}>
          <MassiveForm />
        </Box>
      </Paper>

      {/* Multiple Accordions Performance Test */}
      <Paper className={classes.performanceSection}>
        <Typography variant="h5" gutterBottom>
          Multiple Accordions Performance Test (50 Accordions)
        </Typography>
        <Box style={{ maxHeight: 400, overflow: 'auto' }}>
          {Array.from({ length: 50 }, (_, index) => (
            <Accordion
              key={index}
              expanded={accordionExpanded === `panel${index}`}
              onChange={handleAccordionChange(`panel${index}`)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Accordion {index + 1}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="body2" paragraph>
                    Content for accordion {index + 1} with complex nested elements.
                  </Typography>
                  <Grid container spacing={1}>
                    {Array.from({ length: 6 }, (_, i) => (
                      <Grid item xs={6} sm={4} md={3} key={i}>
                        <Card variant="outlined">
                          <CardContent style={{ padding: 8 }}>
                            <Typography variant="caption">
                              Nested Card {i + 1}
                            </Typography>
                            <Box display="flex" gap={0.5} mt={1}>
                              <Button size="small" variant="outlined">
                                Action
                              </Button>
                              <IconButton size="small">
                                <EditIcon />
                              </IconButton>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Paper>

      {/* Complex Tabs Performance Test */}
      <Paper className={classes.performanceSection}>
        <Typography variant="h5" gutterBottom>
          Complex Tabs Performance Test (20 Tabs)
        </Typography>
        <AppBar position="static" color="default">
          <Tabs
            value={tabValue}
            onChange={(event, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {Array.from({ length: 20 }, (_, index) => (
              <Tab
                key={index}
                label={`Tab ${index + 1}`}
                icon={
                  [
                    <HomeIcon />, <SettingsIcon />, <PersonIcon />, <SearchIcon />,
                    <NotificationsIcon />, <FavoriteIcon />, <StarIcon />, <EditIcon />,
                    <DeleteIcon />, <AddIcon />, <SaveIcon />, <EmailIcon />,
                    <PhoneIcon />, <LocationIcon />, <CalendarIcon />, <TimeIcon />,
                    <LockIcon />, <VisibilityIcon />, <MenuIcon />, <HelpIcon />
                  ][index % 20]
                }
              />
            ))}
          </Tabs>
        </AppBar>
        <Box p={2}>
          <Typography variant="h6">Tab {tabValue + 1} Content</Typography>
          <Grid container spacing={2}>
            {Array.from({ length: 12 }, (_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Item {index + 1}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Content for tab {tabValue + 1}, item {index + 1}
                    </Typography>
                    <Box mt={1}>
                      <Chip label="Tag 1" size="small" />
                      <Chip label="Tag 2" size="small" style={{ marginLeft: 4 }} />
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button size="small" className={classes.complexButton}>
                      Action
                    </Button>
                    <IconButton size="small">
                      <FavoriteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>

      {/* Animation Heavy Components */}
      <Paper className={classes.performanceSection}>
        <Typography variant="h5" gutterBottom>
          Animation Heavy Components (100 Animated Elements)
        </Typography>
        <Grid container spacing={1}>
          {Array.from({ length: 100 }, (_, index) => (
            <Grid item xs={3} sm={2} md={1} key={index}>
              <Box
                className={classes.heavyAnimation}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  animationDelay: `${index * 0.1}s`,
                }}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Loading States Performance */}
      <Paper className={classes.performanceSection}>
        <Typography variant="h5" gutterBottom>
          Loading States Performance Test
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Skeleton Loading (50 Items)
            </Typography>
            {Array.from({ length: 50 }, (_, index) => (
              <Box key={index} mb={1}>
                <Skeleton variant="text" width={`${60 + Math.random() * 40}%`} />
                <Box display="flex" gap={1}>
                  <Skeleton variant="circular" width={24} height={24} />
                  <Skeleton variant="rect" width={60} height={24} />
                  <Skeleton variant="rect" width={80} height={24} />
                </Box>
              </Box>
            ))}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Progress Indicators (30 Items)
            </Typography>
            {Array.from({ length: 30 }, (_, index) => (
              <Box key={index} mb={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <CircularProgress size={20} value={(index + 1) * 3.33} variant="determinate" />
                  <LinearProgress
                    variant="determinate"
                    value={(index + 1) * 3.33}
                    style={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption">
                    {Math.round((index + 1) * 3.33)}%
                  </Typography>
                </Box>
              </Box>
            ))}
          </Grid>
        </Grid>
      </Paper>

      {/* Modal and Dialog Performance */}
      <Paper className={classes.performanceSection}>
        <Typography variant="h5" gutterBottom>
          Modal and Dialog Performance Test
        </Typography>
        <Box display="flex" gap={2}>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Open Complex Dialog
          </Button>
          <Button variant="contained" onClick={() => setDrawerOpen(true)}>
            Open Complex Drawer
          </Button>
        </Box>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Complex Dialog with Many Components</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              {Array.from({ length: 20 }, (_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6">Card {index + 1}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Dialog content card with various components
                      </Typography>
                      <Box mt={1} display="flex" gap={1}>
                        <Chip label="Tag" size="small" />
                        <IconButton size="small">
                          <FavoriteIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => setDialogOpen(false)} variant="contained">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <Box width={400} p={2}>
            <Typography variant="h6" gutterBottom>
              Complex Drawer Content
            </Typography>
            <List>
              {Array.from({ length: 30 }, (_, index) => (
                <ListItem key={index} divider>
                  <ListItemIcon>
                    <Avatar>{index + 1}</Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={`Drawer Item ${index + 1}`}
                    secondary={`Secondary text for item ${index + 1}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton>
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>
      </Paper>

      {/* Performance Summary */}
      <Alert severity="info">
        <Typography variant="h6">Performance Benchmark Summary</Typography>
        <Typography variant="body2">
          This component tests jsx-migr8 performance with:
        </Typography>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>1000+ Material-UI components in various configurations</li>
          <li>Complex nested component hierarchies (depth 8+)</li>
          <li>Large data sets (500-1000 items)</li>
          <li>Heavy styling with makeStyles and complex selectors</li>
          <li>Multiple animation and transition effects</li>
          <li>Extensive use of icons, themes, and Material-UI APIs</li>
          <li>Form components with many inputs and controls</li>
          <li>Table and List components with large datasets</li>
          <li>Modal and Dialog components with complex content</li>
        </ul>
      </Alert>
    </div>
  );
};

export default PerformanceBenchmarks;
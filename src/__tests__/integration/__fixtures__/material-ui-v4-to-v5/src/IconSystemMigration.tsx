import React from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Fab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  AppBar,
  Toolbar,
  TextField,
  InputAdornment,
  Paper,
  Badge,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
  Alert
} from '@material-ui/core';

// Individual icon imports (recommended approach)
import HomeIcon from '@material-ui/icons/Home';
import SettingsIcon from '@material-ui/icons/Settings';
import PersonIcon from '@material-ui/icons/Person';
import SearchIcon from '@material-ui/icons/Search';
import NotificationsIcon from '@material-ui/icons/Notifications';
import FavoriteIcon from '@material-ui/icons/Favorite';
import StarIcon from '@material-ui/icons/Star';
import ThumbUpIcon from '@material-ui/icons/ThumbUp';
import ShareIcon from '@material-ui/icons/Share';
import DownloadIcon from '@material-ui/icons/GetApp';
import UploadIcon from '@material-ui/icons/Publish';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import CloseIcon from '@material-ui/icons/Close';
import CheckIcon from '@material-ui/icons/Check';
import ClearIcon from '@material-ui/icons/Clear';
import SaveIcon from '@material-ui/icons/Save';
import PrintIcon from '@material-ui/icons/Print';
import EmailIcon from '@material-ui/icons/Email';
import PhoneIcon from '@material-ui/icons/Phone';
import LocationIcon from '@material-ui/icons/LocationOn';
import CalendarIcon from '@material-ui/icons/DateRange';
import TimeIcon from '@material-ui/icons/AccessTime';
import LockIcon from '@material-ui/icons/Lock';
import UnlockIcon from '@material-ui/icons/LockOpen';
import VisibilityIcon from '@material-ui/icons/Visibility';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';
import MenuIcon from '@material-ui/icons/Menu';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import RefreshIcon from '@material-ui/icons/Refresh';
import SyncIcon from '@material-ui/icons/Sync';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import FolderIcon from '@material-ui/icons/Folder';
import FolderOpenIcon from '@material-ui/icons/FolderOpen';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import ImageIcon from '@material-ui/icons/Image';
import VideoIcon from '@material-ui/icons/Videocam';
import AudioIcon from '@material-ui/icons/AudioTrack';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import LinkIcon from '@material-ui/icons/Link';
import LaunchIcon from '@material-ui/icons/Launch';
import InfoIcon from '@material-ui/icons/Info';
import WarningIcon from '@material-ui/icons/Warning';
import ErrorIcon from '@material-ui/icons/Error';
import HelpIcon from '@material-ui/icons/Help';
import BugReportIcon from '@material-ui/icons/BugReport';
import FeedbackIcon from '@material-ui/icons/Feedback';
import CommentIcon from '@material-ui/icons/Comment';
import ChatIcon from '@material-ui/icons/Chat';
import MessageIcon from '@material-ui/icons/Message';
import ForumIcon from '@material-ui/icons/Forum';
import GroupIcon from '@material-ui/icons/Group';
import SupervisorAccountIcon from '@material-ui/icons/SupervisorAccount';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import AccountBoxIcon from '@material-ui/icons/AccountBox';
import ContactsIcon from '@material-ui/icons/Contacts';
import BusinessIcon from '@material-ui/icons/Business';
import WorkIcon from '@material-ui/icons/Work';
import SchoolIcon from '@material-ui/icons/School';
import LocalHospitalIcon from '@material-ui/icons/LocalHospital';
import RestaurantIcon from '@material-ui/icons/Restaurant';
import ShoppingCartIcon from '@material-ui/icons/ShoppingCart';
import PaymentIcon from '@material-ui/icons/Payment';
import CreditCardIcon from '@material-ui/icons/CreditCard';
import MonetizationOnIcon from '@material-ui/icons/MonetizationOn';
import TrendingUpIcon from '@material-ui/icons/TrendingUp';
import TrendingDownIcon from '@material-ui/icons/TrendingDown';
import BarChartIcon from '@material-ui/icons/BarChart';
import PieChartIcon from '@material-ui/icons/PieChart';
import TimelineIcon from '@material-ui/icons/Timeline';
import AssessmentIcon from '@material-ui/icons/Assessment';
import DashboardIcon from '@material-ui/icons/Dashboard';
import ViewListIcon from '@material-ui/icons/ViewList';
import ViewModuleIcon from '@material-ui/icons/ViewModule';
import ViewComfyIcon from '@material-ui/icons/ViewComfy';
import GridOnIcon from '@material-ui/icons/GridOn';
import TableChartIcon from '@material-ui/icons/TableChart';
import ListIcon from '@material-ui/icons/List';
import ReorderIcon from '@material-ui/icons/Reorder';
import SortIcon from '@material-ui/icons/Sort';
import FilterListIcon from '@material-ui/icons/FilterList';
import SearchOffIcon from '@material-ui/icons/SearchOff';
import ZoomInIcon from '@material-ui/icons/ZoomIn';
import ZoomOutIcon from '@material-ui/icons/ZoomOut';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import CropIcon from '@material-ui/icons/Crop';
import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import RotateRightIcon from '@material-ui/icons/RotateRight';
import FlipIcon from '@material-ui/icons/Flip';
import ColorLensIcon from '@material-ui/icons/ColorLens';
import PaletteIcon from '@material-ui/icons/Palette';
import BrushIcon from '@material-ui/icons/Brush';
import FormatPaintIcon from '@material-ui/icons/FormatPaint';
import FontDownloadIcon from '@material-ui/icons/FontDownload';
import TextFieldsIcon from '@material-ui/icons/TextFields';
import FormatBoldIcon from '@material-ui/icons/FormatBold';
import FormatItalicIcon from '@material-ui/icons/FormatItalic';
import FormatUnderlinedIcon from '@material-ui/icons/FormatUnderlined';
import FormatStrikethroughIcon from '@material-ui/icons/FormatStrikethrough';
import FormatAlignLeftIcon from '@material-ui/icons/FormatAlignLeft';
import FormatAlignCenterIcon from '@material-ui/icons/FormatAlignCenter';
import FormatAlignRightIcon from '@material-ui/icons/FormatAlignRight';
import FormatAlignJustifyIcon from '@material-ui/icons/FormatAlignJustify';
import FormatListBulletedIcon from '@material-ui/icons/FormatListBulleted';
import FormatListNumberedIcon from '@material-ui/icons/FormatListNumbered';
import FormatIndentIncreaseIcon from '@material-ui/icons/FormatIndentIncrease';
import FormatIndentDecreaseIcon from '@material-ui/icons/FormatIndentDecrease';
import InsertLinkIcon from '@material-ui/icons/InsertLink';
import InsertPhotoIcon from '@material-ui/icons/InsertPhoto';
import InsertChartIcon from '@material-ui/icons/InsertChart';
import InsertCommentIcon from '@material-ui/icons/InsertComment';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import StopIcon from '@material-ui/icons/Stop';
import ReplayIcon from '@material-ui/icons/Replay';
import FastForwardIcon from '@material-ui/icons/FastForward';
import FastRewindIcon from '@material-ui/icons/FastRewind';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious';
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import VolumeDownIcon from '@material-ui/icons/VolumeDown';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import VideocamIcon from '@material-ui/icons/Videocam';
import VideocamOffIcon from '@material-ui/icons/VideocamOff';
import CameraAltIcon from '@material-ui/icons/CameraAlt';
import PhotoCameraIcon from '@material-ui/icons/PhotoCamera';
import ScreenShareIcon from '@material-ui/icons/ScreenShare';
import StopScreenShareIcon from '@material-ui/icons/StopScreenShare';

// Namespace import (not recommended but sometimes used)
import * as Icons from '@material-ui/icons';

// Barrel imports (performance concerns)
import {
  Home,
  Settings,
  Person,
  Search,
  Notifications,
  Favorite,
  Star,
  ThumbUp,
  Share
} from '@material-ui/icons';

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
  iconGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  iconCard: {
    padding: theme.spacing(2),
    textAlign: 'center',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  iconName: {
    marginTop: theme.spacing(1),
    fontSize: '0.75rem',
    wordBreak: 'break-word',
  },
  usageExample: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius,
  },
  codeBlock: {
    backgroundColor: theme.palette.grey[900],
    color: theme.palette.common.white,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    overflow: 'auto',
    marginTop: theme.spacing(1),
  },
  speedDialContainer: {
    position: 'relative',
    height: 200,
  },
}));

const IconSystemMigration: React.FC = () => {
  const classes = useStyles();
  const [speedDialOpen, setSpeedDialOpen] = React.useState(false);

  // Common icons used in applications
  const commonIcons = [
    { icon: <HomeIcon />, name: 'HomeIcon', component: 'Home' },
    { icon: <SettingsIcon />, name: 'SettingsIcon', component: 'Settings' },
    { icon: <PersonIcon />, name: 'PersonIcon', component: 'Person' },
    { icon: <SearchIcon />, name: 'SearchIcon', component: 'Search' },
    { icon: <NotificationsIcon />, name: 'NotificationsIcon', component: 'Notifications' },
    { icon: <FavoriteIcon />, name: 'FavoriteIcon', component: 'Favorite' },
    { icon: <StarIcon />, name: 'StarIcon', component: 'Star' },
    { icon: <EditIcon />, name: 'EditIcon', component: 'Edit' },
    { icon: <DeleteIcon />, name: 'DeleteIcon', component: 'Delete' },
    { icon: <AddIcon />, name: 'AddIcon', component: 'Add' },
    { icon: <RemoveIcon />, name: 'RemoveIcon', component: 'Remove' },
    { icon: <CloseIcon />, name: 'CloseIcon', component: 'Close' },
    { icon: <CheckIcon />, name: 'CheckIcon', component: 'Check' },
    { icon: <SaveIcon />, name: 'SaveIcon', component: 'Save' },
    { icon: <EmailIcon />, name: 'EmailIcon', component: 'Email' },
    { icon: <PhoneIcon />, name: 'PhoneIcon', component: 'Phone' },
    { icon: <MenuIcon />, name: 'MenuIcon', component: 'Menu' },
    { icon: <MoreVertIcon />, name: 'MoreVertIcon', component: 'MoreVert' },
    { icon: <ArrowBackIcon />, name: 'ArrowBackIcon', component: 'ArrowBack' },
    { icon: <ArrowForwardIcon />, name: 'ArrowForwardIcon', component: 'ArrowForward' },
  ];

  // Navigation and Action Icons
  const navigationIcons = [
    { icon: <ChevronLeftIcon />, name: 'ChevronLeftIcon', component: 'ChevronLeft' },
    { icon: <ChevronRightIcon />, name: 'ChevronRightIcon', component: 'ChevronRight' },
    { icon: <ExpandMoreIcon />, name: 'ExpandMoreIcon', component: 'ExpandMore' },
    { icon: <ExpandLessIcon />, name: 'ExpandLessIcon', component: 'ExpandLess' },
    { icon: <ArrowUpwardIcon />, name: 'ArrowUpwardIcon', component: 'ArrowUpward' },
    { icon: <ArrowDownwardIcon />, name: 'ArrowDownwardIcon', component: 'ArrowDownward' },
    { icon: <RefreshIcon />, name: 'RefreshIcon', component: 'Refresh' },
    { icon: <SyncIcon />, name: 'SyncIcon', component: 'Sync' },
    { icon: <LaunchIcon />, name: 'LaunchIcon', component: 'Launch' },
    { icon: <LinkIcon />, name: 'LinkIcon', component: 'Link' },
  ];

  // Media and Content Icons
  const mediaIcons = [
    { icon: <PlayArrowIcon />, name: 'PlayArrowIcon', component: 'PlayArrow' },
    { icon: <PauseIcon />, name: 'PauseIcon', component: 'Pause' },
    { icon: <StopIcon />, name: 'StopIcon', component: 'Stop' },
    { icon: <VolumeUpIcon />, name: 'VolumeUpIcon', component: 'VolumeUp' },
    { icon: <VolumeOffIcon />, name: 'VolumeOffIcon', component: 'VolumeOff' },
    { icon: <MicIcon />, name: 'MicIcon', component: 'Mic' },
    { icon: <MicOffIcon />, name: 'MicOffIcon', component: 'MicOff' },
    { icon: <VideocamIcon />, name: 'VideocamIcon', component: 'Videocam' },
    { icon: <CameraAltIcon />, name: 'CameraAltIcon', component: 'CameraAlt' },
    { icon: <ImageIcon />, name: 'ImageIcon', component: 'Image' },
  ];

  // File and Folder Icons
  const fileIcons = [
    { icon: <FolderIcon />, name: 'FolderIcon', component: 'Folder' },
    { icon: <FolderOpenIcon />, name: 'FolderOpenIcon', component: 'FolderOpen' },
    { icon: <InsertDriveFileIcon />, name: 'InsertDriveFileIcon', component: 'InsertDriveFile' },
    { icon: <AttachFileIcon />, name: 'AttachFileIcon', component: 'AttachFile' },
    { icon: <CloudUploadIcon />, name: 'CloudUploadIcon', component: 'CloudUpload' },
    { icon: <CloudDownloadIcon />, name: 'CloudDownloadIcon', component: 'CloudDownload' },
    { icon: <UploadIcon />, name: 'UploadIcon', component: 'Publish' },
    { icon: <DownloadIcon />, name: 'DownloadIcon', component: 'GetApp' },
  ];

  // Status and Communication Icons
  const statusIcons = [
    { icon: <InfoIcon />, name: 'InfoIcon', component: 'Info' },
    { icon: <WarningIcon />, name: 'WarningIcon', component: 'Warning' },
    { icon: <ErrorIcon />, name: 'ErrorIcon', component: 'Error' },
    { icon: <HelpIcon />, name: 'HelpIcon', component: 'Help' },
    { icon: <CheckIcon />, name: 'CheckIcon', component: 'Check' },
    { icon: <CloseIcon />, name: 'CloseIcon', component: 'Close' },
    { icon: <LockIcon />, name: 'LockIcon', component: 'Lock' },
    { icon: <UnlockIcon />, name: 'UnlockIcon', component: 'LockOpen' },
    { icon: <VisibilityIcon />, name: 'VisibilityIcon', component: 'Visibility' },
    { icon: <VisibilityOffIcon />, name: 'VisibilityOffIcon', component: 'VisibilityOff' },
  ];

  const speedDialActions = [
    { icon: <EditIcon />, name: 'Edit' },
    { icon: <DeleteIcon />, name: 'Delete' },
    { icon: <ShareIcon />, name: 'Share' },
    { icon: <FavoriteIcon />, name: 'Favorite' },
  ];

  const renderIconGrid = (icons: Array<{ icon: React.ReactNode; name: string; component: string }>) => (
    <div className={classes.iconGrid}>
      {icons.map((iconData, index) => (
        <Card key={index} className={classes.iconCard}>
          <CardContent>
            {iconData.icon}
            <Typography className={classes.iconName} variant="caption">
              {iconData.name}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className={classes.root}>
      <Typography variant="h3" className={classes.sectionTitle}>
        Icon System Migration Testing
      </Typography>
      <Typography variant="body1" paragraph>
        This component demonstrates comprehensive icon usage patterns that need migration from 
        @material-ui/icons to @mui/icons-material in Material-UI v5.
      </Typography>

      {/* Migration Overview */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Migration Overview
        </Typography>
        <Alert severity="info" style={{ marginBottom: 16 }}>
          <Typography variant="body2">
            All Material-UI icons need to be migrated from <code>@material-ui/icons</code> to <code>@mui/icons-material</code>.
            The component names remain the same, only the package import path changes.
          </Typography>
        </Alert>
        <Paper className={classes.codeBlock}>
          <Typography variant="body2" component="pre">
{`// v4 (old)
import HomeIcon from '@material-ui/icons/Home';
import { Settings, Person } from '@material-ui/icons';

// v5 (new)
import HomeIcon from '@mui/icons-material/Home';
import { Settings, Person } from '@mui/icons-material';`}
          </Typography>
        </Paper>
      </div>

      {/* Individual Icon Imports */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Individual Icon Imports (Recommended)
        </Typography>
        <Typography variant="body2" paragraph>
          Individual icon imports are recommended for better tree-shaking and bundle size optimization.
        </Typography>
        {renderIconGrid(commonIcons)}
        <Paper className={classes.codeBlock}>
          <Typography variant="body2" component="pre">
{`// Individual imports (recommended)
import HomeIcon from '@material-ui/icons/Home';
import SettingsIcon from '@material-ui/icons/Settings';
import PersonIcon from '@material-ui/icons/Person';

// Usage
<HomeIcon />
<SettingsIcon color="primary" />
<PersonIcon fontSize="large" />`}
          </Typography>
        </Paper>
      </div>

      {/* Navigation Icons */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Navigation Icons
        </Typography>
        <Typography variant="body2" paragraph>
          Icons commonly used for navigation, arrows, and directional controls.
        </Typography>
        {renderIconGrid(navigationIcons)}
      </div>

      {/* Media Icons */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Media Control Icons
        </Typography>
        <Typography variant="body2" paragraph>
          Icons for media players, audio/video controls, and multimedia applications.
        </Typography>
        {renderIconGrid(mediaIcons)}
      </div>

      {/* File System Icons */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          File System Icons
        </Typography>
        <Typography variant="body2" paragraph>
          Icons for file management, folders, uploads, and downloads.
        </Typography>
        {renderIconGrid(fileIcons)}
      </div>

      {/* Status Icons */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Status and Communication Icons
        </Typography>
        <Typography variant="body2" paragraph>
          Icons for status indicators, alerts, and user feedback.
        </Typography>
        {renderIconGrid(statusIcons)}
      </div>

      {/* Icon Usage in Components */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Icons in Material-UI Components
        </Typography>
        <Grid container spacing={3}>
          {/* Button Icons */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Button Icons
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button variant="contained" startIcon={<AddIcon />}>
                    Add Item
                  </Button>
                  <Button variant="outlined" startIcon={<EditIcon />}>
                    Edit
                  </Button>
                  <Button variant="text" startIcon={<DeleteIcon />} color="error">
                    Delete
                  </Button>
                  <Button variant="contained" endIcon={<SaveIcon />}>
                    Save Changes
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* IconButton Examples */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Icon Buttons
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  <IconButton>
                    <FavoriteIcon />
                  </IconButton>
                  <IconButton color="primary">
                    <ShareIcon />
                  </IconButton>
                  <IconButton color="secondary">
                    <ThumbUpIcon />
                  </IconButton>
                  <IconButton disabled>
                    <DeleteIcon />
                  </IconButton>
                  <Tooltip title="Settings">
                    <IconButton>
                      <SettingsIcon />
                    </IconButton>
                  </Tooltip>
                  <Badge badgeContent={4} color="error">
                    <IconButton>
                      <NotificationsIcon />
                    </IconButton>
                  </Badge>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* AppBar with Icons */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  AppBar with Icons
                </Typography>
                <AppBar position="static">
                  <Toolbar>
                    <IconButton edge="start" color="inherit">
                      <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                      Application Title
                    </Typography>
                    <IconButton color="inherit">
                      <SearchIcon />
                    </IconButton>
                    <IconButton color="inherit">
                      <NotificationsIcon />
                    </IconButton>
                    <IconButton color="inherit">
                      <AccountCircleIcon />
                    </IconButton>
                  </Toolbar>
                </AppBar>
              </CardContent>
            </Card>
          </Grid>

          {/* List with Icons */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  List with Icons
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <HomeIcon />
                    </ListItemIcon>
                    <ListItemText primary="Home" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText primary="Profile" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <HelpIcon />
                    </ListItemIcon>
                    <ListItemText primary="Help" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* TextField with Icons */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Text Fields with Icons
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    label="Search"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Email"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Password"
                    type="password"
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton>
                            <VisibilityIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Chips with Icons */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Chips with Icons
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  <Chip icon={<FavoriteIcon />} label="Favorite" />
                  <Chip icon={<StarIcon />} label="Star" color="primary" />
                  <Chip icon={<PersonIcon />} label="User" color="secondary" />
                  <Chip
                    avatar={<Avatar><HomeIcon /></Avatar>}
                    label="Home"
                    variant="outlined"
                  />
                  <Chip
                    icon={<DeleteIcon />}
                    label="Delete"
                    onDelete={() => {}}
                    color="error"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Floating Action Buttons */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Floating Action Buttons
                </Typography>
                <Box display="flex" gap={2} alignItems="center">
                  <Fab color="primary">
                    <AddIcon />
                  </Fab>
                  <Fab color="secondary">
                    <EditIcon />
                  </Fab>
                  <Fab variant="extended">
                    <SearchIcon style={{ marginRight: 8 }} />
                    Search
                  </Fab>
                  <Fab disabled>
                    <FavoriteIcon />
                  </Fab>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* SpeedDial */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  SpeedDial with Icons
                </Typography>
                <div className={classes.speedDialContainer}>
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
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </div>

      {/* Import Patterns */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Import Pattern Examples
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main" gutterBottom>
                  ✅ Recommended: Individual Imports
                </Typography>
                <Paper className={classes.codeBlock}>
                  <Typography variant="body2" component="pre">
{`import HomeIcon from '@material-ui/icons/Home';
import SettingsIcon from '@material-ui/icons/Settings';
import PersonIcon from '@material-ui/icons/Person';`}
                  </Typography>
                </Paper>
                <Typography variant="body2" style={{ marginTop: 8 }}>
                  Best for tree-shaking and bundle size optimization.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="warning.main" gutterBottom>
                  ⚠️ Caution: Named Imports
                </Typography>
                <Paper className={classes.codeBlock}>
                  <Typography variant="body2" component="pre">
{`import {
  Home,
  Settings,
  Person
} from '@material-ui/icons';`}
                  </Typography>
                </Paper>
                <Typography variant="body2" style={{ marginTop: 8 }}>
                  May include more code than needed in bundle.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="error.main" gutterBottom>
                  ❌ Avoid: Namespace Imports
                </Typography>
                <Paper className={classes.codeBlock}>
                  <Typography variant="body2" component="pre">
{`import * as Icons from '@material-ui/icons';

// Usage
<Icons.Home />
<Icons.Settings />`}
                  </Typography>
                </Paper>
                <Typography variant="body2" style={{ marginTop: 8 }}>
                  Imports entire icon library, increases bundle size significantly.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </div>

      {/* Migration Checklist */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Migration Checklist
        </Typography>
        <Alert severity="success">
          <Typography variant="body2" component="div">
            <strong>Icon Migration Steps:</strong>
            <ol style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>Update package import from <code>@material-ui/icons</code> to <code>@mui/icons-material</code></li>
              <li>Keep component names exactly the same (no renaming required)</li>
              <li>Verify all icon props remain compatible (color, fontSize, etc.)</li>
              <li>Test icon rendering in all usage contexts</li>
              <li>Update any custom icon themes or styling</li>
              <li>Check for any dynamic icon imports that need updating</li>
              <li>Validate bundle size impact after migration</li>
            </ol>
          </Typography>
        </Alert>
      </div>

      {/* Edge Cases */}
      <div className={classes.section}>
        <Typography variant="h5" className={classes.sectionTitle}>
          Edge Cases and Special Considerations
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dynamic Icon Imports
                </Typography>
                <Paper className={classes.codeBlock}>
                  <Typography variant="body2" component="pre">
{`// v4
const iconName = 'Home';
const IconComponent = require(\`@material-ui/icons/\${iconName}\`).default;

// v5
const IconComponent = require(\`@mui/icons-material/\${iconName}\`).default;`}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Icon Theme Customization
                </Typography>
                <Paper className={classes.codeBlock}>
                  <Typography variant="body2" component="pre">
{`// Custom icon sizes and colors
<HomeIcon 
  fontSize="large" 
  color="primary" 
  style={{ fontSize: 40 }}
/>

// Custom styling
<SettingsIcon 
  sx={{ 
    color: 'warning.main',
    fontSize: 32 
  }} 
/>`}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </div>
    </div>
  );
};

export default IconSystemMigration;
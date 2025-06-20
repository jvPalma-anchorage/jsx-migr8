import React from 'react';
import { createMuiTheme, ThemeProvider, MuiThemeProvider } from '@material-ui/core/styles';
import { fade, darken, lighten, emphasize, deemphasize } from '@material-ui/core/styles/colorManipulator';
import { useTheme, withTheme, makeStyles, createStyles } from '@material-ui/core/styles';
import { Button, Typography, Box, Paper } from '@material-ui/core';
import { Theme } from '@material-ui/core/styles';

// Complex theme creation with v4 API
const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: lighten('#1976d2', 0.2),
      dark: darken('#1976d2', 0.2),
      contrastText: '#fff',
    },
    secondary: {
      main: '#dc004e',
      light: fade('#dc004e', 0.5),
      dark: emphasize('#dc004e', 0.3),
    },
    action: {
      hover: fade('#000', 0.04),
      selected: fade('#000', 0.08),
      disabled: fade('#000', 0.26),
      disabledBackground: fade('#000', 0.12),
    },
    text: {
      primary: fade('#000', 0.87),
      secondary: fade('#000', 0.54),
      disabled: fade('#000', 0.38),
    },
    background: {
      default: '#fafafa',
      paper: '#fff',
      elevated: lighten('#fafafa', 0.1),
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  spacing: 8, // v4 uses a number multiplier
  shape: {
    borderRadius: 4,
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.2)',
    // ... other shadows
  ],
  transitions: {
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
  },
  overrides: {
    MuiButton: {
      root: {
        borderRadius: 8,
        padding: '8px 16px',
      },
      containedPrimary: {
        backgroundColor: fade('#1976d2', 0.9),
        '&:hover': {
          backgroundColor: darken('#1976d2', 0.2),
        },
      },
    },
    MuiPaper: {
      root: {
        backgroundColor: fade('#fff', 0.95),
      },
      elevation1: {
        boxShadow: '0 2px 4px ' + fade('#000', 0.1),
      },
    },
  },
  props: {
    MuiButton: {
      disableElevation: true,
    },
    MuiTextField: {
      variant: 'outlined',
    },
  },
});

// Custom theme with additional properties
const customTheme = createMuiTheme({
  ...theme,
  custom: {
    drawer: {
      width: 240,
      miniWidth: 56,
    },
    header: {
      height: 64,
      mobileHeight: 56,
    },
    gradients: {
      primary: `linear-gradient(45deg, ${fade('#1976d2', 0.8)} 30%, ${lighten('#1976d2', 0.3)} 90%)`,
      secondary: `linear-gradient(45deg, ${fade('#dc004e', 0.8)} 30%, ${lighten('#dc004e', 0.3)} 90%)`,
    },
  },
});

// Complex makeStyles with theme dependencies
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default,
    },
    header: {
      height: theme.custom?.header?.height || 64,
      backgroundColor: fade(theme.palette.primary.main, 0.1),
      backdropFilter: 'blur(10px)',
      borderBottom: `1px solid ${fade(theme.palette.divider, 0.1)}`,
      [theme.breakpoints.down('sm')]: {
        height: theme.custom?.header?.mobileHeight || 56,
      },
    },
    button: {
      background: theme.custom?.gradients?.primary,
      border: 0,
      borderRadius: theme.shape.borderRadius * 2,
      boxShadow: `0 3px 5px 2px ${fade(theme.palette.primary.main, 0.3)}`,
      color: 'white',
      height: 48,
      padding: theme.spacing(0, 4),
      margin: theme.spacing(2),
      transition: theme.transitions.create(['transform', 'box-shadow'], {
        duration: theme.transitions.duration.short,
      }),
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: `0 6px 10px 4px ${fade(theme.palette.primary.main, 0.3)}`,
      },
    },
    paper: {
      padding: theme.spacing(3),
      margin: theme.spacing(2),
      backgroundColor: fade(theme.palette.background.paper, 0.9),
      backdropFilter: 'blur(5px)',
      border: `1px solid ${fade(theme.palette.divider, 0.1)}`,
      borderRadius: theme.shape.borderRadius * 2,
      transition: theme.transitions.create(['box-shadow', 'transform'], {
        duration: theme.transitions.duration.standard,
        easing: theme.transitions.easing.easeInOut,
      }),
      '&:hover': {
        boxShadow: theme.shadows[8],
        transform: 'translateY(-4px)',
      },
    },
    text: {
      color: fade(theme.palette.text.primary, 0.87),
      marginBottom: theme.spacing(2),
      '& .highlight': {
        color: theme.palette.primary.main,
        backgroundColor: fade(theme.palette.primary.main, 0.1),
        padding: theme.spacing(0.5, 1),
        borderRadius: theme.shape.borderRadius,
      },
    },
    complexGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: theme.spacing(3),
      padding: theme.spacing(3),
      [theme.breakpoints.down('sm')]: {
        gridTemplateColumns: '1fr',
        gap: theme.spacing(2),
        padding: theme.spacing(2),
      },
    },
    glassmorphism: {
      background: `linear-gradient(135deg, ${fade(theme.palette.primary.light, 0.1)} 0%, ${fade(theme.palette.secondary.light, 0.1)} 100%)`,
      backdropFilter: 'blur(10px) saturate(180%)',
      '-webkit-backdrop-filter': 'blur(10px) saturate(180%)',
      backgroundColor: fade(theme.palette.background.paper, 0.75),
      border: `1px solid ${fade(theme.palette.common.white, 0.18)}`,
      borderRadius: theme.shape.borderRadius * 3,
      padding: theme.spacing(4),
      boxShadow: `0 8px 32px 0 ${fade(theme.palette.common.black, 0.1)}`,
    },
    animatedElement: {
      animation: '$pulse 2s ease-in-out infinite',
      backgroundColor: theme.palette.secondary.main,
      width: 100,
      height: 100,
      borderRadius: '50%',
      margin: theme.spacing(2),
    },
    '@keyframes pulse': {
      '0%': {
        transform: 'scale(1)',
        opacity: 1,
      },
      '50%': {
        transform: 'scale(1.1)',
        opacity: 0.7,
      },
      '100%': {
        transform: 'scale(1)',
        opacity: 1,
      },
    },
    darkModeToggle: {
      position: 'fixed',
      top: theme.spacing(2),
      right: theme.spacing(2),
      backgroundColor: theme.palette.mode === 'dark' 
        ? fade(theme.palette.common.white, 0.1) 
        : fade(theme.palette.common.black, 0.1),
      '&:hover': {
        backgroundColor: theme.palette.mode === 'dark'
          ? fade(theme.palette.common.white, 0.2)
          : fade(theme.palette.common.black, 0.2),
      },
    },
  })
);

// Component using withTheme HOC
const ThemedComponent = withTheme(({ theme }: { theme: Theme }) => {
  const customColor = fade(theme.palette.primary.main, 0.5);
  const hoverColor = darken(theme.palette.primary.main, 0.2);
  const lightColor = lighten(theme.palette.primary.main, 0.3);
  const emphasizedColor = emphasize(theme.palette.primary.main, 0.4);
  const deemphasizedColor = deemphasize(theme.palette.primary.main, 0.4);

  return (
    <Box
      sx={{
        padding: theme.spacing(3),
        backgroundColor: customColor,
        '&:hover': {
          backgroundColor: hoverColor,
        },
        border: `2px solid ${lightColor}`,
        boxShadow: `0 4px 8px ${fade(emphasizedColor, 0.3)}`,
      }}
    >
      <Typography variant="h6" style={{ color: deemphasizedColor }}>
        This component uses withTheme HOC
      </Typography>
    </Box>
  );
});

// Main component
const ComplexThemeUsage: React.FC = () => {
  const classes = useStyles();
  const theme = useTheme();

  // Direct theme usage in component
  const dynamicStyles = {
    dynamicBox: {
      backgroundColor: fade(theme.palette.secondary.main, 0.1),
      padding: theme.spacing(2, 3),
      borderRadius: theme.shape.borderRadius,
      border: `1px solid ${darken(theme.palette.secondary.main, 0.2)}`,
      marginBottom: theme.spacing(2),
    },
    dynamicText: {
      color: fade(theme.palette.text.primary, 0.87),
      fontSize: theme.typography.body1.fontSize,
      lineHeight: theme.typography.body1.lineHeight,
    },
  };

  return (
    <ThemeProvider theme={customTheme}>
      <div className={classes.root}>
        <Box className={classes.header}>
          <Typography variant="h4" className={classes.text}>
            Complex Theme Usage Example
          </Typography>
        </Box>

        <Box className={classes.complexGrid}>
          <Paper className={classes.paper}>
            <Typography variant="h6" gutterBottom>
              Color Manipulation Functions
            </Typography>
            <Typography className={classes.text}>
              This example uses fade, darken, lighten, emphasize, and deemphasize functions
              <span className="highlight">which are renamed/changed in v5</span>
            </Typography>
            <Button className={classes.button}>
              Gradient Button with Hover
            </Button>
          </Paper>

          <Paper className={classes.glassmorphism}>
            <Typography variant="h6" gutterBottom>
              Glassmorphism Effect
            </Typography>
            <Typography className={classes.text}>
              Using complex backdrop filters and color manipulation
            </Typography>
            <div className={classes.animatedElement} />
          </Paper>

          <Box style={dynamicStyles.dynamicBox}>
            <Typography style={dynamicStyles.dynamicText}>
              Dynamic inline styles using theme
            </Typography>
          </Box>

          <ThemedComponent />
        </Box>

        {/* Using MuiThemeProvider (deprecated in v5) */}
        <MuiThemeProvider theme={theme}>
          <Paper className={classes.paper}>
            <Typography variant="h6">
              Using deprecated MuiThemeProvider
            </Typography>
            <Typography>
              This should be migrated to ThemeProvider
            </Typography>
          </Paper>
        </MuiThemeProvider>
      </div>
    </ThemeProvider>
  );
};

export default ComplexThemeUsage;
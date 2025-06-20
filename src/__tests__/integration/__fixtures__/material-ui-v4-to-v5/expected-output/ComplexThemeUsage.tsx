import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { alpha, darken, lighten, emphasize, deemphasize } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
// MIGRATION WARNING: makeStyles is deprecated in MUI v5
// Consider migrating to emotion/styled or sx prop instead
import { makeStyles } from '@mui/styles';
import { styled } from '@mui/material/styles';
import { Button, Typography, Box, Paper } from '@mui/material';
import { Theme } from '@mui/material/styles';

// Complex theme creation with v5 API
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: lighten('#1976d2', 0.2),
      dark: darken('#1976d2', 0.2),
      contrastText: '#fff',
    },
    secondary: {
      main: '#dc004e',
      light: alpha('#dc004e', 0.5),
      dark: emphasize('#dc004e', 0.3),
    },
    action: {
      hover: alpha('#000', 0.04),
      selected: alpha('#000', 0.08),
      disabled: alpha('#000', 0.26),
      disabledBackground: alpha('#000', 0.12),
    },
    text: {
      primary: alpha('#000', 0.87),
      secondary: alpha('#000', 0.54),
      disabled: alpha('#000', 0.38),
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
  spacing: 8, // v5 still supports number but function is preferred: (factor) => factor * 8
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
  components: { // overrides → components
    MuiButton: {
      styleOverrides: { // root level styles
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        containedPrimary: {
          backgroundColor: alpha('#1976d2', 0.9),
          '&:hover': {
            backgroundColor: darken('#1976d2', 0.2),
          },
        },
      },
      defaultProps: { // props → defaultProps
        disableElevation: true,
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#fff', 0.95),
        },
        elevation1: {
          boxShadow: '0 2px 4px ' + alpha('#000', 0.1),
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
  },
});

// Custom theme with additional properties
const customTheme = createTheme({
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
      primary: `linear-gradient(45deg, ${alpha('#1976d2', 0.8)} 30%, ${lighten('#1976d2', 0.3)} 90%)`,
      secondary: `linear-gradient(45deg, ${alpha('#dc004e', 0.8)} 30%, ${lighten('#dc004e', 0.3)} 90%)`,
    },
  },
});

// MIGRATION WARNING: makeStyles is deprecated in MUI v5
// Consider using emotion/styled or sx prop instead
const useStyles = makeStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: theme.palette.background.default,
  },
  header: {
    height: theme.custom?.header?.height || 64,
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    backdropFilter: 'blur(10px)',
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    [theme.breakpoints.down('sm')]: {
      height: theme.custom?.header?.mobileHeight || 56,
    },
  },
  button: {
    background: theme.custom?.gradients?.primary,
    border: 0,
    borderRadius: theme.shape.borderRadius * 2,
    boxShadow: `0 3px 5px 2px ${alpha(theme.palette.primary.main, 0.3)}`,
    color: 'white',
    height: 48,
    padding: theme.spacing(0, 4),
    margin: theme.spacing(2),
    transition: theme.transitions.create(['transform', 'box-shadow'], {
      duration: theme.transitions.duration.short,
    }),
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: `0 6px 10px 4px ${alpha(theme.palette.primary.main, 0.3)}`,
    },
  },
  // ... other styles remain the same but use alpha instead of fade
}));

// MIGRATION WARNING: withStyles is deprecated in MUI v5
// Consider using styled() API instead
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: alpha(theme.palette.background.paper, 0.9),
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[2],
  },
}));

// styled() API (already compatible with v5)
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

// Component using theme directly (no HOC needed in v5)
const ThemedComponent: React.FC = () => {
  const theme = useTheme();
  const customColor = alpha(theme.palette.primary.main, 0.5);
  const hoverColor = darken(theme.palette.primary.main, 0.2);
  const lightColor = lighten(theme.palette.primary.main, 0.3);
  const emphasizedColor = emphasize(theme.palette.primary.main, 0.4);
  const deemphasizedColor = deemphasize(theme.palette.primary.main, 0.4);

  return (
    <Box
      sx={{
        padding: 3,
        backgroundColor: customColor,
        '&:hover': {
          backgroundColor: hoverColor,
        },
        border: `2px solid ${lightColor}`,
        boxShadow: `0 4px 8px ${alpha(emphasizedColor, 0.3)}`,
      }}
    >
      <Typography variant="h6" style={{ color: deemphasizedColor }}>
        This component now uses sx prop instead of withTheme HOC
      </Typography>
    </Box>
  );
};

// Main component
const ComplexThemeUsage: React.FC = () => {
  const classes = useStyles();
  const theme = useTheme();

  // Direct theme usage in component
  const dynamicStyles = {
    dynamicBox: {
      backgroundColor: alpha(theme.palette.secondary.main, 0.1),
      padding: theme.spacing(2, 3),
      borderRadius: theme.shape.borderRadius,
      border: `1px solid ${darken(theme.palette.secondary.main, 0.2)}`,
      marginBottom: theme.spacing(2),
    },
    dynamicText: {
      color: alpha(theme.palette.text.primary, 0.87),
      fontSize: theme.typography.body1.fontSize,
      lineHeight: theme.typography.body1.lineHeight,
    },
  };

  return (
    <ThemeProvider theme={customTheme}>
      <div className={classes.root}>
        <Box className={classes.header}>
          <Typography variant="h4" className={classes.text}>
            Complex Theme Usage Example (Migrated to v5)
          </Typography>
        </Box>

        <Box className={classes.complexGrid}>
          <Paper className={classes.paper}>
            <Typography variant="h6" gutterBottom>
              Color Manipulation Functions
            </Typography>
            <Typography className={classes.text}>
              This example now uses alpha, darken, lighten, emphasize, and deemphasize functions
              <span className="highlight">migrated from v4 fade function</span>
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

        {/* Using ThemeProvider (MuiThemeProvider migrated) */}
        <ThemeProvider theme={theme}>
          <Paper className={classes.paper}>
            <Typography variant="h6">
              Using ThemeProvider (migrated from MuiThemeProvider)
            </Typography>
            <Typography>
              MuiThemeProvider has been migrated to ThemeProvider
            </Typography>
          </Paper>
        </ThemeProvider>
      </div>
    </ThemeProvider>
  );
};

export default ComplexThemeUsage;
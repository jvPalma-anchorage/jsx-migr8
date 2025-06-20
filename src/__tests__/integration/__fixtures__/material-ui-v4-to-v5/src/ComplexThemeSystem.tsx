import React from 'react';
import {
  createMuiTheme,
  ThemeProvider,
  responsiveFontSizes,
  useTheme,
  makeStyles,
  withStyles,
  styled
} from '@material-ui/core/styles';
import {
  Button,
  Typography,
  Paper,
  Box,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  CssBaseline,
  useMediaQuery
} from '@material-ui/core';
import { fade, darken, lighten } from '@material-ui/core/styles/colorManipulator';

// Complex theme definition with v4 API
const baseTheme = createMuiTheme({
  palette: {
    type: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6', 
      dark: '#1976d2',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.54)',
      disabled: 'rgba(0, 0, 0, 0.38)',
      hint: 'rgba(0, 0, 0, 0.38)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    action: {
      active: 'rgba(0, 0, 0, 0.54)',
      hover: fade('#000000', 0.04),
      selected: fade('#000000', 0.08),
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontSize: '6rem',
      fontWeight: 300,
      lineHeight: 1.167,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontSize: '3.75rem',
      fontWeight: 300,
      lineHeight: 1.2,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontSize: '3rem',
      fontWeight: 400,
      lineHeight: 1.167,
      letterSpacing: '0em',
    },
    h4: {
      fontSize: '2.125rem',
      fontWeight: 400,
      lineHeight: 1.235,
      letterSpacing: '0.00735em',
    },
    h5: {
      fontSize: '1.5rem',
      fontWeight: 400,
      lineHeight: 1.334,
      letterSpacing: '0em',
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.6,
      letterSpacing: '0.0075em',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.75,
      letterSpacing: '0.00938em',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
      letterSpacing: '0.00714em',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
      letterSpacing: '0.01071em',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.75,
      letterSpacing: '0.02857em',
      textTransform: 'uppercase',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.66,
      letterSpacing: '0.03333em',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 2.66,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 4,
  },
  spacing: (factor: number) => `${0.25 * factor}rem`,
  breakpoints: {
    keys: ['xs', 'sm', 'md', 'lg', 'xl'],
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
    '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
    '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
    '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
    '0px 3px 5px -1px rgba(0,0,0,0.2),0px 5px 8px 0px rgba(0,0,0,0.14),0px 1px 14px 0px rgba(0,0,0,0.12)',
    '0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)',
  ] as any,
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
  zIndex: {
    mobileStepper: 1000,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
  overrides: {
    MuiButton: {
      root: {
        borderRadius: 8,
        textTransform: 'none',
        fontWeight: 500,
      },
      containedPrimary: {
        backgroundColor: '#1976d2',
        '&:hover': {
          backgroundColor: darken('#1976d2', 0.1),
        },
      },
      outlinedSecondary: {
        borderColor: fade('#dc004e', 0.5),
        '&:hover': {
          borderColor: '#dc004e',
          backgroundColor: fade('#dc004e', 0.04),
        },
      },
    },
    MuiCard: {
      root: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.12)',
        '&:hover': {
          boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.16)',
        },
      },
    },
    MuiTypography: {
      h1: {
        '@media (max-width:600px)': {
          fontSize: '4rem',
        },
      },
      h2: {
        '@media (max-width:600px)': {
          fontSize: '2.5rem',
        },
      },
    },
    MuiPaper: {
      root: {
        backgroundColor: fade('#ffffff', 0.95),
      },
      elevation1: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  props: {
    MuiButtonBase: {
      disableRipple: false,
    },
    MuiButton: {
      disableElevation: false,
    },
    MuiTextField: {
      variant: 'outlined',
    },
    MuiPaper: {
      elevation: 1,
    },
  },
});

// Apply responsive font sizes
const theme = responsiveFontSizes(baseTheme);

// Custom dark theme variant
const darkTheme = createMuiTheme({
  ...baseTheme,
  palette: {
    ...baseTheme.palette,
    type: 'dark',
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.5)',
      hint: 'rgba(255, 255, 255, 0.5)',
    },
  },
});

// Complex makeStyles usage with extensive theme usage
const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: theme.palette.background.default,
    minHeight: '100vh',
    color: theme.palette.text.primary,
    fontFamily: theme.typography.fontFamily,
  },
  header: {
    backgroundColor: fade(theme.palette.primary.main, 0.1),
    padding: theme.spacing(3),
    borderBottom: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
    },
    [theme.breakpoints.up('md')]: {
      padding: theme.spacing(4),
    },
  },
  content: {
    maxWidth: theme.breakpoints.values.lg,
    margin: '0 auto',
    padding: theme.spacing(3),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
    },
  },
  card: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius * 2,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    boxShadow: theme.shadows[2],
    transition: theme.transitions.create(['transform', 'box-shadow'], {
      duration: theme.transitions.duration.standard,
      easing: theme.transitions.easing.easeInOut,
    }),
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[8],
    },
    '&:active': {
      transform: 'translateY(0)',
      boxShadow: theme.shadows[4],
    },
  },
  primaryButton: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: darken(theme.palette.primary.main, 0.1),
    },
    '&:focus': {
      backgroundColor: darken(theme.palette.primary.main, 0.2),
    },
    '&:disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
      color: theme.palette.action.disabled,
    },
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: theme.palette.secondary.main,
    border: `2px solid ${theme.palette.secondary.main}`,
    '&:hover': {
      backgroundColor: fade(theme.palette.secondary.main, 0.08),
      borderColor: darken(theme.palette.secondary.main, 0.1),
    },
  },
  textWithGradient: {
    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: theme.typography.fontWeightBold,
  },
  responsiveText: {
    fontSize: theme.typography.h4.fontSize,
    [theme.breakpoints.down('md')]: {
      fontSize: theme.typography.h5.fontSize,
    },
    [theme.breakpoints.down('sm')]: {
      fontSize: theme.typography.h6.fontSize,
    },
    [theme.breakpoints.down('xs')]: {
      fontSize: theme.typography.body1.fontSize,
    },
  },
  complexLayout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      gridTemplateColumns: '1fr',
    },
  },
  customZIndex: {
    position: 'relative',
    zIndex: theme.zIndex.appBar + 1,
  },
  animatedElement: {
    transition: theme.transitions.create(['all'], {
      duration: theme.transitions.duration.complex,
      easing: theme.transitions.easing.easeInOut,
    }),
    '&.animate-enter': {
      opacity: 0,
      transform: 'scale(0.8)',
    },
    '&.animate-enter-active': {
      opacity: 1,
      transform: 'scale(1)',
    },
  },
}));

// withStyles HOC with complex theme usage
const StyledPaper = withStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    backgroundColor: lighten(theme.palette.background.paper, 0.02),
    border: `1px solid ${fade(theme.palette.divider, 0.3)}`,
    borderRadius: theme.shape.borderRadius * 1.5,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    },
    '&:hover': {
      backgroundColor: lighten(theme.palette.background.paper, 0.05),
      boxShadow: theme.shadows[4],
    },
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
      borderRadius: theme.shape.borderRadius,
    },
  },
}))(Paper);

// styled-components style with theme
const CustomBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  backgroundColor: fade(theme.palette.background.default, 0.5),
  borderRadius: theme.shape.borderRadius * 2,
  backdropFilter: 'blur(10px)',
  border: `1px solid ${fade(theme.palette.primary.main, 0.2)}`,
  minHeight: 200,
  textAlign: 'center',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '80%',
    height: '80%',
    transform: 'translate(-50%, -50%)',
    border: `2px dashed ${fade(theme.palette.primary.main, 0.3)}`,
    borderRadius: theme.shape.borderRadius,
    pointerEvents: 'none',
  },
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(3),
    minHeight: 150,
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    minHeight: 100,
  },
}));

// Component with extensive theme usage
const ComplexThemedComponent: React.FC = () => {
  const theme = useTheme();
  const classes = useStyles();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  const currentTheme = isDarkMode ? darkTheme : theme;

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <div className={classes.root}>
        <AppBar position="sticky" color="primary">
          <Toolbar>
            <Typography variant="h6" style={{ flexGrow: 1 }}>
              Complex Theme System Test
            </Typography>
            <Button
              color="inherit"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              Toggle {isDarkMode ? 'Light' : 'Dark'} Mode
            </Button>
          </Toolbar>
        </AppBar>

        <div className={classes.header}>
          <Typography variant="h2" className={classes.textWithGradient}>
            Theme System Migration
          </Typography>
          <Typography variant="h5" className={classes.responsiveText}>
            Comprehensive v4 to v5 Theme Testing
          </Typography>
        </div>

        <div className={classes.content}>
          <div className={classes.complexLayout}>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Palette Colors
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  <Box
                    width={40}
                    height={40}
                    bgcolor="primary.main"
                    borderRadius={1}
                    title="Primary"
                  />
                  <Box
                    width={40}
                    height={40}
                    bgcolor="secondary.main"
                    borderRadius={1}
                    title="Secondary"
                  />
                  <Box
                    width={40} 
                    height={40}
                    bgcolor="error.main"
                    borderRadius={1}
                    title="Error"
                  />
                  <Box
                    width={40}
                    height={40}
                    bgcolor="warning.main"
                    borderRadius={1}
                    title="Warning"
                  />
                  <Box
                    width={40}
                    height={40}
                    bgcolor="info.main"
                    borderRadius={1}
                    title="Info"
                  />
                  <Box
                    width={40}
                    height={40}
                    bgcolor="success.main"
                    borderRadius={1}
                    title="Success"
                  />
                </Box>
              </CardContent>
            </Card>

            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Typography Variants
                </Typography>
                <Typography variant="h1">H1 Heading</Typography>
                <Typography variant="h2">H2 Heading</Typography>
                <Typography variant="h3">H3 Heading</Typography>
                <Typography variant="h4">H4 Heading</Typography>
                <Typography variant="h5">H5 Heading</Typography>
                <Typography variant="h6">H6 Heading</Typography>
                <Typography variant="subtitle1">Subtitle 1</Typography>
                <Typography variant="subtitle2">Subtitle 2</Typography>
                <Typography variant="body1">Body 1 text</Typography>
                <Typography variant="body2">Body 2 text</Typography>
                <Typography variant="button">Button text</Typography>
                <Typography variant="caption">Caption text</Typography>
                <Typography variant="overline">Overline text</Typography>
              </CardContent>
            </Card>

            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Button Variants
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    className={classes.primaryButton}
                  >
                    Primary Button
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    className={classes.secondaryButton}
                  >
                    Secondary Button
                  </Button>
                  <Button variant="text" color="default">
                    Text Button
                  </Button>
                  <Button variant="contained" disabled>
                    Disabled Button
                  </Button>
                </Box>
              </CardContent>
            </Card>

            <StyledPaper>
              <Typography variant="h6" gutterBottom>
                Custom Styled Paper
              </Typography>
              <Typography variant="body1">
                This paper uses withStyles HOC with complex theme integration.
                It includes custom styling, hover effects, and responsive design.
              </Typography>
            </StyledPaper>

            <CustomBox>
              <Typography variant="h6" gutterBottom>
                Styled Box Component
              </Typography>
              <Typography variant="body2">
                This box uses the styled() API with advanced theming,
                including backdrop filters and complex selectors.
              </Typography>
            </CustomBox>

            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Breakpoints & Responsive
                </Typography>
                <Typography variant="body2">
                  Current breakpoint: {isMobile ? 'Mobile (sm or below)' : 'Desktop (md or above)'}
                </Typography>
                <Box mt={2}>
                  <Typography variant="body2">
                    XS: {theme.breakpoints.values.xs}px
                  </Typography>
                  <Typography variant="body2">
                    SM: {theme.breakpoints.values.sm}px
                  </Typography>
                  <Typography variant="body2">
                    MD: {theme.breakpoints.values.md}px
                  </Typography>
                  <Typography variant="body2">
                    LG: {theme.breakpoints.values.lg}px
                  </Typography>
                  <Typography variant="body2">
                    XL: {theme.breakpoints.values.xl}px
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Shadow & Elevation
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  {[1, 2, 4, 8, 12, 16, 24].map((elevation) => (
                    <Paper
                      key={elevation}
                      elevation={elevation}
                      style={{
                        padding: theme.spacing(1),
                        textAlign: 'center',
                      }}
                    >
                      Elevation {elevation}
                    </Paper>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </div>

          <Box mt={4} className={classes.animatedElement}>
            <Typography variant="h4" gutterBottom>
              Theme Migration Summary
            </Typography>
            <Typography variant="body1">
              This component demonstrates complex theme usage in Material-UI v4 that requires
              comprehensive migration to v5, including:
            </Typography>
            <Box component="ul" mt={2}>
              <Typography component="li" variant="body2">
                createMuiTheme → createTheme migration
              </Typography>
              <Typography component="li" variant="body2">
                palette.type → palette.mode changes
              </Typography>
              <Typography component="li" variant="body2">
                fade() → alpha() function migration
              </Typography>
              <Typography component="li" variant="body2">
                makeStyles → styled() or sx prop migration
              </Typography>
              <Typography component="li" variant="body2">
                withStyles → styled() component migration
              </Typography>
              <Typography component="li" variant="body2">
                theme.overrides → theme.components migration
              </Typography>
              <Typography component="li" variant="body2">
                theme.props → theme.defaultProps migration
              </Typography>
              <Typography component="li" variant="body2">
                Responsive font sizes and breakpoint handling
              </Typography>
            </Box>
          </Box>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default ComplexThemedComponent;
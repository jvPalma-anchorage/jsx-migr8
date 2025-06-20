import React from 'react';
import {
  makeStyles,
  createStyles,
  withStyles,
  styled,
  Theme,
  useTheme,
  StylesProvider,
  jssPreset,
  createGenerateClassName
} from '@material-ui/core/styles';
import {
  Box,
  Button,
  Paper,
  Typography,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Chip,
  Avatar,
  Grid,
  TextField,
  Container
} from '@material-ui/core';
import { fade, darken, lighten } from '@material-ui/core/styles/colorManipulator';
import { create } from 'jss';

// JSS setup for custom styling
const jss = create({
  ...jssPreset(),
  insertionPoint: 'jss-insertion-point',
});

const generateClassName = createGenerateClassName({
  disableGlobal: false,
  productionPrefix: 'c',
});

// Complex makeStyles with extensive theme usage
const useHeaderStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing(2, 3),
      backgroundColor: fade(theme.palette.primary.main, 0.1),
      borderBottom: `2px solid ${theme.palette.primary.main}`,
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
      },
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1, 2),
        flexDirection: 'column',
        gap: theme.spacing(1),
      },
      [theme.breakpoints.up('lg')]: {
        padding: theme.spacing(3, 4),
      },
    },
    title: {
      fontWeight: theme.typography.fontWeightBold,
      color: theme.palette.primary.dark,
      textShadow: `1px 1px 2px ${fade(theme.palette.common.black, 0.1)}`,
      '&:hover': {
        color: theme.palette.primary.main,
        transform: 'scale(1.02)',
        transition: theme.transitions.create(['color', 'transform'], {
          duration: theme.transitions.duration.short,
        }),
      },
    },
    actions: {
      display: 'flex',
      gap: theme.spacing(1),
      [theme.breakpoints.down('sm')]: {
        width: '100%',
        justifyContent: 'center',
      },
    },
  })
);

// Nested makeStyles with complex selectors
const useCardStyles = makeStyles((theme: Theme) => ({
  root: {
    position: 'relative',
    overflow: 'hidden',
    transition: theme.transitions.create(['transform', 'box-shadow'], {
      duration: theme.transitions.duration.standard,
      easing: theme.transitions.easing.easeInOut,
    }),
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[8],
      '& $overlay': {
        opacity: 1,
      },
      '& $title': {
        color: theme.palette.primary.main,
      },
      '& $chip': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
      },
    },
    '&:active': {
      transform: 'translateY(-2px)',
    },
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(135deg, ${fade(theme.palette.primary.main, 0.8)}, ${fade(theme.palette.secondary.main, 0.6)})`,
    opacity: 0,
    transition: theme.transitions.create('opacity', {
      duration: theme.transitions.duration.short,
    }),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.palette.common.white,
    fontWeight: theme.typography.fontWeightBold,
    fontSize: theme.typography.h5.fontSize,
    pointerEvents: 'none',
  },
  title: {
    marginBottom: theme.spacing(1),
    transition: theme.transitions.create('color', {
      duration: theme.transitions.duration.short,
    }),
  },
  chip: {
    marginTop: theme.spacing(1),
    transition: theme.transitions.create(['background-color', 'color'], {
      duration: theme.transitions.duration.short,
    }),
  },
  content: {
    padding: theme.spacing(2),
    '&:last-child': {
      paddingBottom: theme.spacing(2),
    },
  },
}));

// Form styles with complex validation states
const useFormStyles = makeStyles((theme: Theme) =>
  createStyles({
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2),
      padding: theme.spacing(3),
      backgroundColor: theme.palette.background.paper,
      borderRadius: theme.shape.borderRadius * 2,
      boxShadow: theme.shadows[2],
    },
    fieldGroup: {
      display: 'flex',
      gap: theme.spacing(2),
      [theme.breakpoints.down('sm')]: {
        flexDirection: 'column',
      },
    },
    textField: {
      '& .MuiOutlinedInput-root': {
        '&:hover fieldset': {
          borderColor: theme.palette.primary.main,
        },
        '&.Mui-focused fieldset': {
          borderColor: theme.palette.primary.main,
          borderWidth: 2,
        },
        '&.Mui-error fieldset': {
          borderColor: theme.palette.error.main,
        },
      },
      '& .MuiInputLabel-root': {
        '&.Mui-focused': {
          color: theme.palette.primary.main,
        },
        '&.Mui-error': {
          color: theme.palette.error.main,
        },
      },
    },
    submitButton: {
      marginTop: theme.spacing(2),
      padding: theme.spacing(1.5, 4),
      fontSize: theme.typography.button.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
      '&:hover': {
        background: `linear-gradient(45deg, ${darken(theme.palette.primary.main, 0.1)} 30%, ${darken(theme.palette.primary.dark, 0.1)} 90%)`,
      },
      '&:disabled': {
        background: theme.palette.action.disabledBackground,
        color: theme.palette.action.disabled,
      },
    },
  })
);

// Button styles with multiple variants
const useButtonStyles = makeStyles((theme: Theme) => ({
  primaryGradient: {
    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
    border: 0,
    borderRadius: theme.shape.borderRadius * 2,
    boxShadow: theme.shadows[3],
    color: 'white',
    height: 48,
    padding: theme.spacing(0, 4),
    '&:hover': {
      background: `linear-gradient(45deg, ${darken(theme.palette.primary.main, 0.1)} 30%, ${darken(theme.palette.primary.dark, 0.1)} 90%)`,
      boxShadow: theme.shadows[6],
    },
  },
  secondaryOutlined: {
    border: `2px solid ${theme.palette.secondary.main}`,
    color: theme.palette.secondary.main,
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: fade(theme.palette.secondary.main, 0.08),
      borderColor: darken(theme.palette.secondary.main, 0.1),
    },
    '&:active': {
      backgroundColor: fade(theme.palette.secondary.main, 0.16),
    },
  },
  glowButton: {
    position: 'relative',
    backgroundColor: theme.palette.info.main,
    color: theme.palette.info.contrastText,
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: -2,
      padding: 2,
      background: `linear-gradient(45deg, ${theme.palette.info.main}, ${theme.palette.info.light})`,
      borderRadius: 'inherit',
      mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      maskComposite: 'exclude',
    },
    '&:hover::before': {
      background: `linear-gradient(45deg, ${lighten(theme.palette.info.main, 0.2)}, ${lighten(theme.palette.info.light, 0.2)})`,
    },
  },
}));

// withStyles HOC examples
const StyledPaper = withStyles((theme: Theme) => ({
  root: {
    padding: theme.spacing(3),
    backgroundColor: fade(theme.palette.background.paper, 0.95),
    backdropFilter: 'blur(10px)',
    border: `1px solid ${fade(theme.palette.divider, 0.2)}`,
    borderRadius: theme.shape.borderRadius * 2,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: -50,
      left: -50,
      width: 100,
      height: 100,
      background: `radial-gradient(circle, ${fade(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
      pointerEvents: 'none',
    },
    '&:hover': {
      backgroundColor: fade(theme.palette.background.paper, 1),
      boxShadow: theme.shadows[4],
      transform: 'scale(1.02)',
      transition: theme.transitions.create(['background-color', 'box-shadow', 'transform'], {
        duration: theme.transitions.duration.short,
      }),
    },
  },
}))(Paper);

const StyledButton = withStyles((theme: Theme) => ({
  root: {
    borderRadius: theme.shape.borderRadius * 3,
    textTransform: 'none',
    fontWeight: theme.typography.fontWeightMedium,
    fontSize: theme.typography.body1.fontSize,
    padding: theme.spacing(1, 3),
    minWidth: 120,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 0,
      height: 0,
      borderRadius: '50%',
      background: fade(theme.palette.common.white, 0.3),
      transition: theme.transitions.create(['width', 'height'], {
        duration: theme.transitions.duration.short,
      }),
      transform: 'translate(-50%, -50%)',
    },
    '&:hover::before': {
      width: '300%',
      height: '300%',
    },
  },
  containedPrimary: {
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    '&:hover': {
      background: `linear-gradient(135deg, ${darken(theme.palette.primary.main, 0.1)} 0%, ${darken(theme.palette.primary.dark, 0.1)} 100%)`,
    },
  },
  containedSecondary: {
    background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
    '&:hover': {
      background: `linear-gradient(135deg, ${darken(theme.palette.secondary.main, 0.1)} 0%, ${darken(theme.palette.secondary.dark, 0.1)} 100%)`,
    },
  },
}))(Button);

const StyledCard = withStyles((theme: Theme) => ({
  root: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius * 3,
    overflow: 'hidden',
    position: 'relative',
    border: `1px solid ${fade(theme.palette.divider, 0.1)}`,
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.info.main})`,
    },
    '&:hover': {
      boxShadow: theme.shadows[8],
      transform: 'translateY(-2px)',
      transition: theme.transitions.create(['box-shadow', 'transform'], {
        duration: theme.transitions.duration.standard,
      }),
    },
  },
}))(Card);

// styled() API examples
const CustomBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  backgroundColor: fade(theme.palette.background.default, 0.8),
  borderRadius: theme.shape.borderRadius * 2,
  border: `2px dashed ${fade(theme.palette.primary.main, 0.3)}`,
  minHeight: 200,
  position: 'relative',
  '&::before': {
    content: '"Styled Component"',
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    fontSize: theme.typography.caption.fontSize,
    color: theme.palette.text.secondary,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
  },
  '&:hover': {
    backgroundColor: fade(theme.palette.primary.main, 0.05),
    borderColor: theme.palette.primary.main,
    transform: 'scale(1.02)',
    transition: theme.transitions.create(['background-color', 'border-color', 'transform'], {
      duration: theme.transitions.duration.short,
    }),
  },
}));

const GradientTypography = styled(Typography)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  fontWeight: theme.typography.fontWeightBold,
  textAlign: 'center',
  marginBottom: theme.spacing(2),
  '&:hover': {
    background: `linear-gradient(45deg, ${lighten(theme.palette.primary.main, 0.2)} 30%, ${lighten(theme.palette.secondary.main, 0.2)} 90%)`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
  },
}));

const AnimatedAvatar = styled(Avatar)(({ theme }) => ({
  width: theme.spacing(8),
  height: theme.spacing(8),
  backgroundColor: theme.palette.primary.main,
  border: `3px solid ${theme.palette.background.paper}`,
  boxShadow: theme.shadows[3],
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.standard,
  }),
  '&:hover': {
    transform: 'scale(1.1) rotate(5deg)',
    boxShadow: theme.shadows[6],
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
}));

// Complex component showcasing all styling approaches
const StyleSystemShowcase: React.FC = () => {
  const theme = useTheme();
  const headerClasses = useHeaderStyles();
  const cardClasses = useCardStyles();
  const formClasses = useFormStyles();
  const buttonClasses = useButtonStyles();

  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    message: '',
  });

  const handleInputChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  return (
    <StylesProvider jss={jss} generateClassName={generateClassName}>
      <Container maxWidth="lg">
        {/* Header with makeStyles */}
        <div className={headerClasses.root}>
          <Typography variant="h4" className={headerClasses.title}>
            Style System Migration Test
          </Typography>
          <div className={headerClasses.actions}>
            <Button variant="contained" color="primary">
              Action 1
            </Button>
            <Button variant="outlined" color="secondary">
              Action 2
            </Button>
          </div>
        </div>

        <Grid container spacing={3} style={{ marginTop: 16 }}>
          {/* makeStyles Card Examples */}
          <Grid item xs={12} md={6} lg={4}>
            <Card className={cardClasses.root}>
              <div className={cardClasses.overlay}>Hover Effect</div>
              <CardContent className={cardClasses.content}>
                <Typography variant="h6" className={cardClasses.title}>
                  makeStyles Card
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  This card uses makeStyles with complex hover effects,
                  nested selectors, and theme integration.
                </Typography>
                <Chip
                  label="makeStyles"
                  size="small"
                  className={cardClasses.chip}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* withStyles Examples */}
          <Grid item xs={12} md={6} lg={4}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  withStyles Card
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  This card uses withStyles HOC with advanced theming
                  and pseudo-elements for visual effects.
                </Typography>
                <Box mt={2}>
                  <StyledButton variant="contained" color="primary">
                    Primary
                  </StyledButton>
                  <Box ml={1} component="span">
                    <StyledButton variant="contained" color="secondary">
                      Secondary
                    </StyledButton>
                  </Box>
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>

          {/* styled() API Examples */}
          <Grid item xs={12} md={6} lg={4}>
            <CustomBox>
              <AnimatedAvatar>ST</AnimatedAvatar>
              <GradientTypography variant="h6">
                Styled Components
              </GradientTypography>
              <Typography variant="body2" color="textSecondary" align="center">
                This section uses the styled() API with theme integration
                and advanced CSS features.
              </Typography>
            </CustomBox>
          </Grid>

          {/* Button Showcase */}
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <Typography variant="h6" gutterBottom>
                Button Style Variations
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button className={buttonClasses.primaryGradient}>
                  Gradient Primary
                </Button>
                <Button className={buttonClasses.secondaryOutlined}>
                  Outlined Secondary
                </Button>
                <Button className={buttonClasses.glowButton}>
                  Glow Effect Button
                </Button>
                <Button
                  variant="contained"
                  disabled
                  style={{
                    background: theme.palette.action.disabledBackground,
                    color: theme.palette.action.disabled,
                  }}
                >
                  Disabled Button
                </Button>
              </Box>
            </StyledPaper>
          </Grid>

          {/* Form Showcase */}
          <Grid item xs={12} md={6}>
            <form className={formClasses.form}>
              <Typography variant="h6" gutterBottom>
                Form with Custom Styles
              </Typography>
              <div className={formClasses.fieldGroup}>
                <TextField
                  label="Full Name"
                  variant="outlined"
                  fullWidth
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  className={formClasses.textField}
                />
                <TextField
                  label="Email"
                  variant="outlined"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  className={formClasses.textField}
                />
              </div>
              <TextField
                label="Message"
                variant="outlined"
                multiline
                rows={4}
                fullWidth
                value={formData.message}
                onChange={handleInputChange('message')}
                className={formClasses.textField}
              />
              <Button
                type="submit"
                variant="contained"
                className={formClasses.submitButton}
                disabled={!formData.name || !formData.email}
              >
                Submit Form
              </Button>
            </form>
          </Grid>

          {/* Migration Notes */}
          <Grid item xs={12}>
            <Paper style={{ padding: theme.spacing(3) }}>
              <Typography variant="h5" gutterBottom>
                Style System Migration Notes
              </Typography>
              <Typography variant="body1" paragraph>
                This component demonstrates various styling approaches in Material-UI v4
                that require migration to v5:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    makeStyles → styled()
                  </Typography>
                  <Typography variant="body2">
                    • Replace makeStyles with styled() API
                    • Convert theme function parameter
                    • Update class name references
                    • Handle nested selectors
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="h6" color="secondary" gutterBottom>
                    withStyles → styled()
                  </Typography>
                  <Typography variant="body2">
                    • Convert HOC to styled component
                    • Update theme parameter handling
                    • Preserve component inheritance
                    • Maintain prop forwarding
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="h6" color="textPrimary" gutterBottom>
                    Color Functions
                  </Typography>
                  <Typography variant="body2">
                    • fade() → alpha()
                    • Update import paths
                    • Preserve alpha values
                    • Handle color manipulation
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </StylesProvider>
  );
};

export default StyleSystemShowcase;
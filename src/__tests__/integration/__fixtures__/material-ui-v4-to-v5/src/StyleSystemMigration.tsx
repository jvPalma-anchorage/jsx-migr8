import React from 'react';
import {
  makeStyles,
  createStyles,
  withStyles,
  styled,
  useTheme,
  Theme,
  ThemeProvider,
} from '@material-ui/core/styles';
import {
  Box,
  Button,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Avatar,
  TextField,
  Select,
  MenuItem,
} from '@material-ui/core';
import { fade, darken, lighten } from '@material-ui/core/styles/colorManipulator';
import clsx from 'clsx';

// Complex makeStyles with multiple style scenarios
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    // Basic styles
    root: {
      padding: theme.spacing(3),
      backgroundColor: theme.palette.background.default,
    },
    
    // Nested selectors
    container: {
      '& .MuiButton-root': {
        margin: theme.spacing(1),
      },
      '& > div': {
        padding: theme.spacing(2),
        '&:first-child': {
          borderTop: `2px solid ${theme.palette.primary.main}`,
        },
        '&:last-child': {
          borderBottom: `2px solid ${theme.palette.secondary.main}`,
        },
      },
      '&$active': {
        backgroundColor: fade(theme.palette.primary.main, 0.1),
      },
    },
    
    // Pseudo-classes and pseudo-elements
    button: {
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        backgroundColor: theme.palette.primary.dark,
        '& $buttonIcon': {
          transform: 'rotate(180deg)',
        },
      },
      '&:before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `linear-gradient(45deg, ${fade(theme.palette.primary.main, 0.3)} 30%, ${fade(theme.palette.secondary.main, 0.3)} 90%)`,
        opacity: 0,
        transition: theme.transitions.create('opacity'),
      },
      '&:hover:before': {
        opacity: 1,
      },
      '&:active': {
        transform: 'scale(0.98)',
      },
      '&:focus-visible': {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: 2,
      },
    },
    
    buttonIcon: {
      transition: theme.transitions.create('transform'),
    },
    
    // State classes
    active: {},
    disabled: {
      opacity: 0.5,
      pointerEvents: 'none',
    },
    selected: {
      backgroundColor: fade(theme.palette.primary.main, 0.2),
      borderColor: theme.palette.primary.main,
    },
    
    // Complex animations
    animated: {
      animation: '$slideIn 0.5s ease-out, $fadeIn 0.3s ease-in',
      '&$active': {
        animation: '$pulse 2s infinite',
      },
    },
    
    '@keyframes slideIn': {
      from: {
        transform: 'translateX(-100%)',
      },
      to: {
        transform: 'translateX(0)',
      },
    },
    
    '@keyframes fadeIn': {
      from: {
        opacity: 0,
      },
      to: {
        opacity: 1,
      },
    },
    
    '@keyframes pulse': {
      '0%': {
        boxShadow: `0 0 0 0 ${fade(theme.palette.primary.main, 0.7)}`,
      },
      '70%': {
        boxShadow: `0 0 0 10px ${fade(theme.palette.primary.main, 0)}`,
      },
      '100%': {
        boxShadow: `0 0 0 0 ${fade(theme.palette.primary.main, 0)}`,
      },
    },
    
    // Media queries
    responsive: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: theme.spacing(2),
      [theme.breakpoints.down('md')]: {
        gridTemplateColumns: 'repeat(2, 1fr)',
      },
      [theme.breakpoints.down('sm')]: {
        gridTemplateColumns: '1fr',
      },
      [theme.breakpoints.only('lg')]: {
        gap: theme.spacing(3),
      },
      [theme.breakpoints.between('sm', 'md')]: {
        padding: theme.spacing(2),
      },
    },
    
    // Complex selectors
    complexCard: {
      '&:nth-child(odd)': {
        backgroundColor: fade(theme.palette.primary.light, 0.1),
      },
      '&:nth-child(even)': {
        backgroundColor: fade(theme.palette.secondary.light, 0.1),
      },
      '&:hover:not($disabled)': {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[8],
      },
      '& + &': {
        marginTop: theme.spacing(2),
      },
    },
    
    // CSS Grid
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: '200px 1fr 200px',
      gridTemplateRows: 'auto 1fr auto',
      gridTemplateAreas: `
        "header header header"
        "sidebar content aside"
        "footer footer footer"
      `,
      gap: theme.spacing(2),
      minHeight: '100vh',
    },
    
    gridHeader: {
      gridArea: 'header',
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      padding: theme.spacing(2),
    },
    
    gridSidebar: {
      gridArea: 'sidebar',
      backgroundColor: fade(theme.palette.background.paper, 0.8),
    },
    
    gridContent: {
      gridArea: 'content',
      padding: theme.spacing(3),
    },
    
    // Advanced hover effects
    hoverCard: {
      position: 'relative',
      cursor: 'pointer',
      transformStyle: 'preserve-3d',
      transition: 'transform 0.6s',
      '&:hover': {
        transform: 'rotateY(180deg)',
      },
      '& $cardFront, & $cardBack': {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
      },
      '& $cardBack': {
        transform: 'rotateY(180deg)',
      },
    },
    
    cardFront: {},
    cardBack: {},
    
    // Dynamic classes with props
    dynamicButton: (props: { color?: string; size?: 'small' | 'medium' | 'large' }) => ({
      backgroundColor: props.color || theme.palette.primary.main,
      padding: props.size === 'small' 
        ? theme.spacing(1, 2) 
        : props.size === 'large' 
        ? theme.spacing(2, 4) 
        : theme.spacing(1.5, 3),
      '&:hover': {
        backgroundColor: darken(props.color || theme.palette.primary.main, 0.2),
      },
    }),
  })
);

// HOC with withStyles
const StyledPaper = withStyles((theme: Theme) => ({
  root: {
    padding: theme.spacing(3),
    backgroundColor: fade(theme.palette.background.paper, 0.9),
    backdropFilter: 'blur(10px)',
    border: `1px solid ${fade(theme.palette.divider, 0.1)}`,
    borderRadius: theme.shape.borderRadius * 2,
    transition: theme.transitions.create(['box-shadow', 'background-color'], {
      duration: theme.transitions.duration.short,
    }),
    '&:hover': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[4],
    },
    '& .MuiTypography-root': {
      marginBottom: theme.spacing(2),
    },
  },
  elevated: {
    boxShadow: theme.shadows[8],
    transform: 'translateY(-4px)',
  },
}))(Paper);

// styled() API usage (already in v5 style but from v4 import)
const StyledButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
  border: 0,
  borderRadius: theme.shape.borderRadius * 3,
  boxShadow: `0 3px 5px 2px ${fade(theme.palette.primary.main, 0.3)}`,
  color: 'white',
  height: 48,
  padding: '0 30px',
  '&:hover': {
    background: `linear-gradient(45deg, ${darken(theme.palette.primary.main, 0.2)} 30%, ${darken(theme.palette.secondary.main, 0.2)} 90%)`,
  },
}));

// Custom styled component with complex logic
const ComplexStyledBox = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(3),
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 20% 80%, ${fade(theme.palette.primary.light, 0.3)} 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, ${fade(theme.palette.secondary.light, 0.3)} 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, ${fade(theme.palette.info.light, 0.2)} 0%, transparent 50%)
    `,
    filter: 'blur(40px)',
    zIndex: -1,
  },
}));

// Component using all style approaches
const StyleSystemMigration: React.FC = () => {
  const classes = useStyles({ color: '#9c27b0', size: 'medium' });
  const theme = useTheme();
  const [isActive, setIsActive] = React.useState(false);
  const [isSelected, setIsSelected] = React.useState(false);

  return (
    <div className={classes.root}>
      <Typography variant="h4" gutterBottom>
        Style System Migration Examples
      </Typography>

      {/* makeStyles usage */}
      <section>
        <Typography variant="h5" gutterBottom>
          makeStyles Examples
        </Typography>
        
        <Box className={clsx(classes.container, { [classes.active]: isActive })}>
          <Button 
            className={classes.button}
            onClick={() => setIsActive(!isActive)}
          >
            <span className={classes.buttonIcon}>→</span>
            Hover and Click Me
          </Button>

          <div className={classes.responsive}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Card 
                key={item} 
                className={clsx(classes.complexCard, {
                  [classes.disabled]: item === 3,
                  [classes.selected]: item === isSelected,
                })}
                onClick={() => setIsSelected(item)}
              >
                <CardContent>
                  <Typography>Card {item}</Typography>
                </CardContent>
              </Card>
            ))}
          </div>
        </Box>

        <Box className={clsx(classes.animated, { [classes.active]: isActive })} mt={2}>
          <Typography>Animated Box</Typography>
        </Box>

        <Button className={classes.dynamicButton} variant="contained">
          Dynamic Styled Button
        </Button>
      </section>

      {/* withStyles usage */}
      <section style={{ marginTop: theme.spacing(4) }}>
        <Typography variant="h5" gutterBottom>
          withStyles Examples
        </Typography>
        
        <StyledPaper>
          <Typography variant="h6">
            Basic Styled Paper
          </Typography>
          <Typography>
            This uses withStyles HOC which needs migration
          </Typography>
        </StyledPaper>

        <StyledPaper className="elevated" style={{ marginTop: theme.spacing(2) }}>
          <Typography variant="h6">
            Elevated Styled Paper
          </Typography>
          <Typography>
            With additional className
          </Typography>
        </StyledPaper>
      </section>

      {/* styled() API usage */}
      <section style={{ marginTop: theme.spacing(4) }}>
        <Typography variant="h5" gutterBottom>
          styled() API Examples
        </Typography>
        
        <StyledButton>
          Gradient Button
        </StyledButton>

        <ComplexStyledBox mt={2}>
          <Typography variant="h6">
            Complex Styled Box
          </Typography>
          <Typography>
            With pseudo-elements and gradients
          </Typography>
        </ComplexStyledBox>
      </section>

      {/* CSS Grid example */}
      <section style={{ marginTop: theme.spacing(4) }}>
        <Typography variant="h5" gutterBottom>
          CSS Grid Layout
        </Typography>
        
        <Box className={classes.gridContainer}>
          <Box className={classes.gridHeader}>
            <Typography variant="h6">Header</Typography>
          </Box>
          <Box className={classes.gridSidebar}>
            <Typography>Sidebar</Typography>
          </Box>
          <Box className={classes.gridContent}>
            <Typography>Main Content</Typography>
          </Box>
          <Box style={{ gridArea: 'aside' }}>
            <Typography>Aside</Typography>
          </Box>
          <Box style={{ gridArea: 'footer', backgroundColor: theme.palette.grey[800], color: 'white', padding: theme.spacing(2) }}>
            <Typography>Footer</Typography>
          </Box>
        </Box>
      </section>

      {/* 3D Hover Card */}
      <section style={{ marginTop: theme.spacing(4) }}>
        <Typography variant="h5" gutterBottom>
          3D Flip Card
        </Typography>
        
        <Box className={classes.hoverCard} style={{ width: 300, height: 200 }}>
          <Paper className={classes.cardFront} style={{ padding: theme.spacing(2) }}>
            <Typography variant="h6">Front Side</Typography>
            <Typography>Hover to flip</Typography>
          </Paper>
          <Paper className={classes.cardBack} style={{ padding: theme.spacing(2), backgroundColor: theme.palette.secondary.light }}>
            <Typography variant="h6">Back Side</Typography>
            <Typography>Hidden content</Typography>
          </Paper>
        </Box>
      </section>
    </div>
  );
};

export default StyleSystemMigration;
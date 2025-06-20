import React from 'react';
import {
  Typography,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Slider,
  Switch,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Alert
} from '@material-ui/core';
import {
  Theme,
  makeStyles,
  createStyles,
  withStyles,
  styled,
  useTheme,
  ThemeProvider,
  createMuiTheme
} from '@material-ui/core/styles';
import {
  fade,
  darken,
  lighten
} from '@material-ui/core/styles/colorManipulator';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Check as CheckIcon
} from '@material-ui/icons';
import { Autocomplete } from '@material-ui/lab';

// v4 Type definitions that need migration
interface MaterialUIV4Theme extends Theme {
  customProperty?: string;
}

// Custom theme interface with v4 specific properties
interface CustomThemeV4 {
  palette: {
    type: 'light' | 'dark'; // v4 uses 'type', v5 uses 'mode'
    primary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    secondary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    error: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    warning: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    info: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    success: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    background: {
      default: string;
      paper: string;
    };
    text: {
      primary: string;
      secondary: string;
      disabled: string;
      hint: string; // v4 specific, removed in v5
    };
    divider: string;
    action: {
      active: string;
      hover: string;
      selected: string;
      disabled: string;
      disabledBackground: string;
    };
  };
  typography: {
    fontFamily: string;
    fontSize: number;
    fontWeightLight: number;
    fontWeightRegular: number;
    fontWeightMedium: number;
    fontWeightBold: number;
    h1: React.CSSProperties;
    h2: React.CSSProperties;
    h3: React.CSSProperties;
    h4: React.CSSProperties;
    h5: React.CSSProperties;
    h6: React.CSSProperties;
    subtitle1: React.CSSProperties;
    subtitle2: React.CSSProperties;
    body1: React.CSSProperties;
    body2: React.CSSProperties;
    button: React.CSSProperties;
    caption: React.CSSProperties;
    overline: React.CSSProperties;
  };
  spacing: (factor: number) => string | number;
  breakpoints: {
    keys: string[];
    values: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    up: (key: string) => string;
    down: (key: string) => string;
    between: (start: string, end: string) => string;
    only: (key: string) => string;
  };
  shadows: string[];
  transitions: {
    easing: {
      easeInOut: string;
      easeOut: string;
      easeIn: string;
      sharp: string;
    };
    duration: {
      shortest: number;
      shorter: number;
      short: number;
      standard: number;
      complex: number;
      enteringScreen: number;
      leavingScreen: number;
    };
    create: (props: string[], options?: object) => string;
  };
  zIndex: {
    mobileStepper: number;
    speedDial: number;
    appBar: number;
    drawer: number;
    modal: number;
    snackbar: number;
    tooltip: number;
  };
  shape: {
    borderRadius: number;
  };
  // v4 specific properties that need migration
  overrides?: {
    [key: string]: {
      [key: string]: React.CSSProperties;
    };
  };
  props?: {
    [key: string]: {
      [key: string]: any;
    };
  };
}

// Generic interfaces for components with TypeScript constraints
interface DataItem<T = any> {
  id: number;
  name: string;
  value: T;
  category: string;
  metadata?: Record<string, any>;
}

interface ListProps<T> {
  items: T[];
  onItemSelect?: (item: T) => void;
  onItemEdit?: (item: T) => void;
  onItemDelete?: (item: T) => void;
  renderItem?: (item: T) => React.ReactNode;
}

interface FormData {
  textField: string;
  selectField: string;
  autocompleteField: any;
  sliderValue: number;
  switchValue: boolean;
  checkboxValue: boolean;
  radioValue: string;
}

// Type-safe event handlers with Material-UI v4 signatures
interface EventHandlers {
  handleTextFieldChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (event: React.ChangeEvent<{ value: unknown }>) => void;
  handleAutocompleteChange: (event: React.ChangeEvent<{}>, value: any) => void;
  handleSliderChange: (event: React.ChangeEvent<{}>, value: number | number[]) => void;
  handleSwitchChange: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  handleCheckboxChange: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  handleRadioChange: (event: React.ChangeEvent<HTMLInputElement>, value: string) => void;
  handleButtonClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleDialogClose: (event: {}, reason: 'backdropClick' | 'escapeKeyDown') => void;
}

// Custom hook with TypeScript generics
function useTypedState<T>(initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  return React.useState<T>(initialValue);
}

// Generic form hook with Material-UI v4 specific types
function useFormData<T extends Record<string, any>>(
  initialData: T
): {
  formData: T;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  resetForm: () => void;
  isValid: boolean;
} {
  const [formData, setFormData] = React.useState<T>(initialData);

  const updateField = React.useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = React.useCallback(() => {
    setFormData(initialData);
  }, [initialData]);

  const isValid = React.useMemo(() => {
    return Object.values(formData).every(value => 
      value !== null && value !== undefined && value !== ''
    );
  }, [formData]);

  return { formData, updateField, resetForm, isValid };
}

// Typed styles with makeStyles and v4 theme
const useTypedStyles = makeStyles<MaterialUIV4Theme, { color?: string; size?: number }>((theme) =>
  createStyles({
    root: {
      padding: theme.spacing(2),
      backgroundColor: theme.palette.background.default,
    },
    coloredCard: {
      backgroundColor: (props) => props.color || theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      padding: theme.spacing(2),
      borderRadius: theme.shape.borderRadius,
      transition: theme.transitions.create(['background-color', 'transform'], {
        duration: theme.transitions.duration.standard,
      }),
      '&:hover': {
        backgroundColor: (props) => darken(props.color || theme.palette.primary.main, 0.1),
        transform: 'scale(1.02)',
      },
    },
    sizedComponent: {
      width: (props) => props.size || 100,
      height: (props) => props.size || 100,
      backgroundColor: fade(theme.palette.secondary.main, 0.1),
      border: `2px solid ${theme.palette.secondary.main}`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    responsiveText: {
      fontSize: theme.typography.h4.fontSize,
      fontWeight: theme.typography.fontWeightBold,
      color: theme.palette.text.primary,
      [theme.breakpoints.down('md')]: {
        fontSize: theme.typography.h5.fontSize,
      },
      [theme.breakpoints.down('sm')]: {
        fontSize: theme.typography.h6.fontSize,
      },
    },
    complexButton: {
      background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
      border: 0,
      borderRadius: theme.shape.borderRadius * 2,
      boxShadow: theme.shadows[3],
      color: 'white',
      height: 48,
      padding: theme.spacing(0, 4),
      '&:hover': {
        background: `linear-gradient(45deg, ${darken(theme.palette.primary.main, 0.1)} 30%, ${darken(theme.palette.secondary.main, 0.1)} 90%)`,
        boxShadow: theme.shadows[6],
      },
      '&:disabled': {
        background: theme.palette.action.disabledBackground,
        color: theme.palette.action.disabled,
      },
    },
  })
);

// withStyles with TypeScript and v4 theme
const StyledPaper = withStyles<MaterialUIV4Theme, React.ComponentProps<typeof Paper>, string>(
  (theme: MaterialUIV4Theme) => ({
    root: {
      padding: theme.spacing(3),
      backgroundColor: fade(theme.palette.background.paper, 0.95),
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
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[4],
        transform: 'scale(1.01)',
        transition: theme.transitions.create(['background-color', 'box-shadow', 'transform'], {
          duration: theme.transitions.duration.short,
        }),
      },
    },
  })
)(Paper);

// Styled component with TypeScript and theme
const TypedStyledBox = styled(Box)<{ bgcolor?: string; borderColor?: string }>(
  ({ theme, bgcolor, borderColor }) => ({
    backgroundColor: bgcolor || fade(theme.palette.primary.main, 0.1),
    border: `2px solid ${borderColor || theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    margin: theme.spacing(1),
    transition: theme.transitions.create(['background-color', 'border-color'], {
      duration: theme.transitions.duration.short,
    }),
    '&:hover': {
      backgroundColor: bgcolor ? darken(bgcolor, 0.1) : fade(theme.palette.primary.main, 0.2),
      borderColor: borderColor ? darken(borderColor, 0.1) : theme.palette.primary.dark,
    },
  })
);

// Generic data table component with TypeScript
interface DataTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    render?: (value: T[keyof T], item: T) => React.ReactNode;
  }>;
  onRowClick?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

function DataTable<T extends { id: number | string }>({
  data,
  columns,
  onRowClick,
  onEdit,
  onDelete,
}: DataTableProps<T>) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <TableCell key={String(column.key)}>{column.label}</TableCell>
          ))}
          {(onEdit || onDelete) && <TableCell>Actions</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((item) => (
          <TableRow
            key={item.id}
            hover
            onClick={() => onRowClick?.(item)}
            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
          >
            {columns.map((column) => (
              <TableCell key={String(column.key)}>
                {column.render
                  ? column.render(item[column.key], item)
                  : String(item[column.key])
                }
              </TableCell>
            ))}
            {(onEdit || onDelete) && (
              <TableCell>
                {onEdit && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                )}
                {onDelete && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Form component with strict TypeScript typing
interface TypedFormProps {
  initialData: FormData;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  validation?: Partial<Record<keyof FormData, (value: any) => string | null>>;
}

const TypedForm: React.FC<TypedFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  validation = {},
}) => {
  const { formData, updateField, resetForm, isValid } = useFormData(initialData);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormData, string>>>({});

  const autocompleteOptions = [
    { label: 'Option 1', value: 'opt1' },
    { label: 'Option 2', value: 'opt2' },
    { label: 'Option 3', value: 'opt3' },
  ];

  const validateField = React.useCallback((field: keyof FormData, value: any) => {
    const validator = validation[field];
    if (validator) {
      const error = validator(value);
      setErrors(prev => ({ ...prev, [field]: error }));
      return error;
    }
    return null;
  }, [validation]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate all fields
    let hasErrors = false;
    Object.keys(formData).forEach((key) => {
      const field = key as keyof FormData;
      const error = validateField(field, formData[field]);
      if (error) hasErrors = true;
    });

    if (!hasErrors && isValid) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Text Field"
            value={formData.textField}
            onChange={(e) => {
              updateField('textField', e.target.value);
              validateField('textField', e.target.value);
            }}
            error={!!errors.textField}
            helperText={errors.textField}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant="outlined" error={!!errors.selectField}>
            <InputLabel>Select Field</InputLabel>
            <Select
              value={formData.selectField}
              onChange={(e) => {
                updateField('selectField', e.target.value as string);
                validateField('selectField', e.target.value);
              }}
              label="Select Field"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="option1">Option 1</MenuItem>
              <MenuItem value="option2">Option 2</MenuItem>
              <MenuItem value="option3">Option 3</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <Autocomplete
            options={autocompleteOptions}
            getOptionLabel={(option) => option.label}
            value={formData.autocompleteField}
            onChange={(e, value) => {
              updateField('autocompleteField', value);
              validateField('autocompleteField', value);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Autocomplete Field"
                variant="outlined"
                error={!!errors.autocompleteField}
                helperText={errors.autocompleteField}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography gutterBottom>Slider: {formData.sliderValue}</Typography>
          <Slider
            value={formData.sliderValue}
            onChange={(e, value) => {
              updateField('sliderValue', value as number);
              validateField('sliderValue', value);
            }}
            min={0}
            max={100}
            valueLabelDisplay="auto"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.switchValue}
                onChange={(e, checked) => {
                  updateField('switchValue', checked);
                  validateField('switchValue', checked);
                }}
                color="primary"
              />
            }
            label="Switch Field"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.checkboxValue}
                onChange={(e, checked) => {
                  updateField('checkboxValue', checked);
                  validateField('checkboxValue', checked);
                }}
                color="primary"
              />
            }
            label="Checkbox Field"
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1">Radio Field</Typography>
          <RadioGroup
            value={formData.radioValue}
            onChange={(e, value) => {
              updateField('radioValue', value);
              validateField('radioValue', value);
            }}
          >
            <FormControlLabel value="radio1" control={<Radio />} label="Radio 1" />
            <FormControlLabel value="radio2" control={<Radio />} label="Radio 2" />
            <FormControlLabel value="radio3" control={<Radio />} label="Radio 3" />
          </RadioGroup>
        </Grid>
        <Grid item xs={12}>
          <Box display="flex" gap={2}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!isValid}
              startIcon={<SaveIcon />}
            >
              Submit
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={onCancel}
              startIcon={<CancelIcon />}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="text"
              onClick={resetForm}
              startIcon={<RefreshIcon />}
            >
              Reset
            </Button>
          </Box>
        </Grid>
      </Grid>
    </form>
  );
};

// Main component showcasing TypeScript integration
const TypeScriptIntegration: React.FC = () => {
  const theme = useTheme<MaterialUIV4Theme>();
  const classes = useTypedStyles({ color: theme.palette.secondary.main, size: 80 });
  
  // Typed state management
  const [selectedItem, setSelectedItem] = useTypedState<DataItem | null>(null);
  const [dialogOpen, setDialogOpen] = useTypedState<boolean>(false);
  const [formData, setFormData] = useTypedState<FormData>({
    textField: '',
    selectField: '',
    autocompleteField: null,
    sliderValue: 50,
    switchValue: false,
    checkboxValue: false,
    radioValue: 'radio1',
  });

  // Sample data with TypeScript
  const sampleData: DataItem[] = [
    { id: 1, name: 'Item 1', value: 'Value 1', category: 'Category A' },
    { id: 2, name: 'Item 2', value: 42, category: 'Category B' },
    { id: 3, name: 'Item 3', value: true, category: 'Category C' },
    { id: 4, name: 'Item 4', value: { nested: 'object' }, category: 'Category A' },
  ];

  // Type-safe event handlers
  const eventHandlers: EventHandlers = {
    handleTextFieldChange: (event) => {
      setFormData(prev => ({ ...prev, textField: event.target.value }));
    },
    handleSelectChange: (event) => {
      setFormData(prev => ({ ...prev, selectField: event.target.value as string }));
    },
    handleAutocompleteChange: (event, value) => {
      setFormData(prev => ({ ...prev, autocompleteField: value }));
    },
    handleSliderChange: (event, value) => {
      setFormData(prev => ({ ...prev, sliderValue: value as number }));
    },
    handleSwitchChange: (event, checked) => {
      setFormData(prev => ({ ...prev, switchValue: checked }));
    },
    handleCheckboxChange: (event, checked) => {
      setFormData(prev => ({ ...prev, checkboxValue: checked }));
    },
    handleRadioChange: (event, value) => {
      setFormData(prev => ({ ...prev, radioValue: value }));
    },
    handleButtonClick: (event) => {
      console.log('Button clicked:', event.currentTarget);
    },
    handleDialogClose: (event, reason) => {
      if (reason !== 'backdropClick') {
        setDialogOpen(false);
      }
    },
  };

  // Table columns configuration
  const tableColumns: DataTableProps<DataItem>['columns'] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    {
      key: 'value',
      label: 'Value',
      render: (value) => (
        <Chip
          label={typeof value === 'object' ? JSON.stringify(value) : String(value)}
          size="small"
          variant="outlined"
        />
      ),
    },
    { key: 'category', label: 'Category' },
  ];

  // Form validation
  const formValidation: TypedFormProps['validation'] = {
    textField: (value) => (value.length < 3 ? 'Must be at least 3 characters' : null),
    selectField: (value) => (!value ? 'Please select an option' : null),
    autocompleteField: (value) => (!value ? 'Please select an option' : null),
  };

  return (
    <div className={classes.root}>
      <Typography variant="h3" className={classes.responsiveText} gutterBottom>
        TypeScript Integration Testing
      </Typography>
      
      <Alert severity="info" style={{ marginBottom: 24 }}>
        <Typography variant="body2">
          This component demonstrates TypeScript integration with Material-UI v4, including
          type-safe themes, styled components, event handlers, and generic components that
          need careful migration to v5.
        </Typography>
      </Alert>

      {/* Styled Components Section */}
      <StyledPaper>
        <Typography variant="h5" gutterBottom>
          Styled Components with TypeScript
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card className={classes.coloredCard}>
              <CardContent>
                <Typography variant="h6" style={{ color: 'inherit' }}>
                  Typed makeStyles Card
                </Typography>
                <Typography variant="body2" style={{ color: 'inherit', opacity: 0.8 }}>
                  This card uses makeStyles with TypeScript props and theme typing.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" justifyContent="center">
              <div className={classes.sizedComponent}>
                <Typography variant="h4">80</Typography>
              </div>
            </Box>
          </Grid>
        </Grid>
        
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Styled Components with Props
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TypedStyledBox bgcolor={theme.palette.primary.main}>
              Primary Background
            </TypedStyledBox>
            <TypedStyledBox 
              bgcolor={theme.palette.secondary.main}
              borderColor={theme.palette.secondary.dark}
            >
              Secondary Background
            </TypedStyledBox>
            <TypedStyledBox 
              bgcolor={fade(theme.palette.error.main, 0.1)}
              borderColor={theme.palette.error.main}
            >
              Error Background
            </TypedStyledBox>
          </Box>
        </Box>
      </StyledPaper>

      {/* Generic Data Table */}
      <Paper style={{ padding: 24, marginTop: 24 }}>
        <Typography variant="h5" gutterBottom>
          Generic TypeScript Data Table
        </Typography>
        <DataTable
          data={sampleData}
          columns={tableColumns}
          onRowClick={(item) => {
            setSelectedItem(item);
            setDialogOpen(true);
          }}
          onEdit={(item) => console.log('Edit:', item)}
          onDelete={(item) => console.log('Delete:', item)}
        />
      </Paper>

      {/* Type-Safe Form */}
      <Paper style={{ padding: 24, marginTop: 24 }}>
        <Typography variant="h5" gutterBottom>
          Type-Safe Form Component
        </Typography>
        <TypedForm
          initialData={formData}
          onSubmit={(data) => {
            console.log('Form submitted:', data);
            setFormData(data);
          }}
          onCancel={() => console.log('Form cancelled')}
          validation={formValidation}
        />
      </Paper>

      {/* Event Handlers Testing */}
      <Paper style={{ padding: 24, marginTop: 24 }}>
        <Typography variant="h5" gutterBottom>
          Type-Safe Event Handlers
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Text Input"
              value={formData.textField}
              onChange={eventHandlers.handleTextFieldChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Select</InputLabel>
              <Select
                value={formData.selectField}
                onChange={eventHandlers.handleSelectChange}
                label="Select"
              >
                <MenuItem value="option1">Option 1</MenuItem>
                <MenuItem value="option2">Option 2</MenuItem>
                <MenuItem value="option3">Option 3</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Slider
              value={formData.sliderValue}
              onChange={eventHandlers.handleSliderChange}
              valueLabelDisplay="auto"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" flexDirection="column" gap={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.switchValue}
                    onChange={eventHandlers.handleSwitchChange}
                  />
                }
                label="Switch"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.checkboxValue}
                    onChange={eventHandlers.handleCheckboxChange}
                  />
                }
                label="Checkbox"
              />
            </Box>
          </Grid>
        </Grid>
        
        <Box mt={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={eventHandlers.handleButtonClick}
            className={classes.complexButton}
          >
            Test Button Click
          </Button>
        </Box>
      </Paper>

      {/* Theme Integration */}
      <Paper style={{ padding: 24, marginTop: 24 }}>
        <Typography variant="h5" gutterBottom>
          Theme TypeScript Integration
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Theme Properties (v4)
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Palette Type"
                  secondary={theme.palette.type}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Primary Color"
                  secondary={theme.palette.primary.main}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Font Family"
                  secondary={theme.typography.fontFamily}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Border Radius"
                  secondary={`${theme.shape.borderRadius}px`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Text Hint Color (v4 specific)"
                  secondary={theme.palette.text.hint}
                />
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Breakpoint Values
            </Typography>
            <List dense>
              {Object.entries(theme.breakpoints.values).map(([key, value]) => (
                <ListItem key={key}>
                  <ListItemText
                    primary={key.toUpperCase()}
                    secondary={`${value}px`}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
        </Grid>
      </Paper>

      {/* TypeScript Migration Notes */}
      <Paper style={{ padding: 24, marginTop: 24 }}>
        <Typography variant="h5" gutterBottom>
          TypeScript Migration Notes
        </Typography>
        <Alert severity="warning" style={{ marginBottom: 16 }}>
          <Typography variant="body2">
            Key TypeScript changes when migrating from Material-UI v4 to v5:
          </Typography>
        </Alert>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" color="error" gutterBottom>
              Breaking Changes
            </Typography>
            <ul style={{ paddingLeft: 20 }}>
              <li>Theme interface changes (palette.type → palette.mode)</li>
              <li>Event handler signatures may change</li>
              <li>Component prop types updated</li>
              <li>makeStyles typing changes</li>
              <li>withStyles typing updates</li>
              <li>Text.hint palette color removed</li>
              <li>Some component default props changed</li>
            </ul>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" color="primary" gutterBottom>
              Required Updates
            </Typography>
            <ul style={{ paddingLeft: 20 }}>
              <li>Update theme type definitions</li>
              <li>Fix event handler type signatures</li>
              <li>Update styled component props</li>
              <li>Migrate makeStyles to styled or sx</li>
              <li>Update generic constraints</li>
              <li>Fix component prop type errors</li>
              <li>Update theme palette references</li>
            </ul>
          </Grid>
        </Grid>
      </Paper>

      {/* Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={eventHandlers.handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Item Details</Typography>
            <IconButton onClick={() => setDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box>
              <Typography variant="body1" paragraph>
                <strong>ID:</strong> {selectedItem.id}
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Name:</strong> {selectedItem.name}
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Value:</strong> {typeof selectedItem.value === 'object' 
                  ? JSON.stringify(selectedItem.value) 
                  : String(selectedItem.value)
                }
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Category:</strong> {selectedItem.category}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          <Button onClick={() => setDialogOpen(false)} variant="contained" color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default TypeScriptIntegration;
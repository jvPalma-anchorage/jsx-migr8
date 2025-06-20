/**
 * Custom Hooks with Complex Dependencies Test Cases
 * Tests jsx-migr8's ability to handle complex custom hook patterns, dependency chains, and state management
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef, 
  useReducer,
  useContext,
  createContext,
  useImperativeHandle,
  forwardRef,
  useLayoutEffect,
  useSyncExternalStore
} from 'react';
import { Button as MuiButton, Typography, Box, TextField, List, ListItem } from '@mui/material';
import { Button as AntdButton, Input, Card, Space } from 'antd';

// ======================
// 1. Basic Custom Hooks with Dependencies
// ======================

// Hook with simple dependencies
const useCounter = (initialValue: number = 0, step: number = 1) => {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => {
    setCount(prev => prev + step);
  }, [step]);
  
  const decrement = useCallback(() => {
    setCount(prev => prev - step);
  }, [step]);
  
  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  return { count, increment, decrement, reset };
};

// Hook with complex object dependencies  
const useComplexState = <T extends Record<string, any>>(
  initialState: T,
  validator?: (state: T) => boolean
) => {
  const [state, setState] = useState<T>(initialState);
  const [errors, setErrors] = useState<string[]>([]);
  
  const updateState = useCallback((updates: Partial<T>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      
      if (validator && !validator(newState)) {
        setErrors(prev => [...prev, `Invalid state update: ${JSON.stringify(updates)}`]);
        return prev;
      }
      
      setErrors([]);
      return newState;
    });
  }, [validator]);
  
  const resetState = useCallback(() => {
    setState(initialState);
    setErrors([]);
  }, [initialState]);
  
  return { 
    state, 
    updateState, 
    resetState, 
    errors, 
    isValid: errors.length === 0 
  };
};

// Hook with async dependencies
const useAsyncData = <T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcher();
      if (!abortControllerRef.current.signal.aborted) {
        setData(result);
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError(err as Error);
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetcher, ...dependencies]);
  
  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);
  
  return { data, loading, error, refetch: fetchData };
};

// ======================
// 2. Complex Hook Compositions
// ======================

// Hook that uses other hooks
const useFormWithValidation = <T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, (value: any) => string | null>
) => {
  const { 
    state: values, 
    updateState: updateValues, 
    resetState: resetValues 
  } = useComplexState(initialValues);
  
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as any);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const errors = useMemo(() => {
    const errorMap: Record<keyof T, string | null> = {} as any;
    
    for (const field in validationRules) {
      const value = values[field];
      const validator = validationRules[field];
      errorMap[field] = validator(value);
    }
    
    return errorMap;
  }, [values, validationRules]);
  
  const isValid = useMemo(() => {
    return Object.values(errors).every(error => error === null);
  }, [errors]);
  
  const handleFieldChange = useCallback((field: keyof T, value: any) => {
    updateValues({ [field]: value } as Partial<T>);
    setTouched(prev => ({ ...prev, [field]: true }));
  }, [updateValues]);
  
  const handleSubmit = useCallback(async (onSubmit: (values: T) => Promise<void>) => {
    setTouched(() => {
      const allTouched: Record<keyof T, boolean> = {} as any;
      for (const field in values) {
        allTouched[field] = true;
      }
      return allTouched;
    });
    
    if (!isValid) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, isValid]);
  
  const getFieldProps = useCallback((field: keyof T) => ({
    value: values[field],
    onChange: (e: any) => handleFieldChange(field, e.target?.value ?? e),
    error: touched[field] && errors[field],
    onBlur: () => setTouched(prev => ({ ...prev, [field]: true }))
  }), [values, handleFieldChange, touched, errors]);
  
  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    handleFieldChange,
    handleSubmit,
    getFieldProps,
    resetForm: resetValues
  };
};

// Hook with reducer pattern
interface DataAction {
  type: 'FETCH_START' | 'FETCH_SUCCESS' | 'FETCH_ERROR' | 'ADD_ITEM' | 'REMOVE_ITEM' | 'UPDATE_ITEM';
  payload?: any;
}

interface DataState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  lastUpdate: number;
}

const dataReducer = <T>(state: DataState<T>, action: DataAction): DataState<T> => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { 
        ...state, 
        loading: false, 
        items: action.payload, 
        lastUpdate: Date.now() 
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'ADD_ITEM':
      return { 
        ...state, 
        items: [...state.items, action.payload],
        lastUpdate: Date.now()
      };
    case 'REMOVE_ITEM':
      return { 
        ...state, 
        items: state.items.filter((_, index) => index !== action.payload),
        lastUpdate: Date.now()
      };
    case 'UPDATE_ITEM':
      return { 
        ...state, 
        items: state.items.map((item, index) => 
          index === action.payload.index ? action.payload.item : item
        ),
        lastUpdate: Date.now()
      };
    default:
      return state;
  }
};

const useDataManager = <T>(
  initialItems: T[] = [],
  fetchFunction?: () => Promise<T[]>
) => {
  const [state, dispatch] = useReducer(dataReducer<T>, {
    items: initialItems,
    loading: false,
    error: null,
    lastUpdate: Date.now()
  });
  
  const fetchItems = useCallback(async () => {
    if (!fetchFunction) return;
    
    dispatch({ type: 'FETCH_START' });
    try {
      const items = await fetchFunction();
      dispatch({ type: 'FETCH_SUCCESS', payload: items });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: (error as Error).message });
    }
  }, [fetchFunction]);
  
  const addItem = useCallback((item: T) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  }, []);
  
  const removeItem = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: index });
  }, []);
  
  const updateItem = useCallback((index: number, item: T) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { index, item } });
  }, []);
  
  return {
    ...state,
    fetchItems,
    addItem,
    removeItem,
    updateItem
  };
};

// ======================
// 3. Advanced Hook Patterns
// ======================

// Hook with external store integration
const createExternalStore = <T>(initialValue: T) => {
  let state = initialValue;
  let listeners: (() => void)[] = [];
  
  return {
    getState: () => state,
    setState: (newState: T) => {
      state = newState;
      listeners.forEach(listener => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter(l => l !== listener);
      };
    }
  };
};

const globalCounterStore = createExternalStore(0);

const useExternalStore = <T>(store: {
  getState: () => T;
  subscribe: (listener: () => void) => () => void;
}) => {
  return useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
  );
};

const useGlobalCounter = () => {
  const count = useExternalStore(globalCounterStore);
  
  const increment = useCallback(() => {
    globalCounterStore.setState(globalCounterStore.getState() + 1);
  }, []);
  
  const decrement = useCallback(() => {
    globalCounterStore.setState(globalCounterStore.getState() - 1);
  }, []);
  
  return { count, increment, decrement };
};

// Hook with context dependencies
interface AppContextType {
  user: { id: string; name: string } | null;
  theme: 'light' | 'dark';
  settings: Record<string, any>;
}

const AppContext = createContext<AppContextType>({
  user: null,
  theme: 'light',
  settings: {}
});

const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

const useUserPreferences = () => {
  const { user, theme, settings } = useAppContext();
  const [preferences, setPreferences] = useState(() => ({
    ...settings,
    theme,
    userId: user?.id || null
  }));
  
  useEffect(() => {
    setPreferences(prev => ({
      ...prev,
      theme,
      userId: user?.id || null
    }));
  }, [user, theme]);
  
  const updatePreference = useCallback((key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);
  
  return { preferences, updatePreference };
};

// ======================
// 4. Performance-Optimized Hooks
// ======================

// Hook with memoized complex calculations
const useComplexCalculation = (
  data: number[],
  operations: Array<'sum' | 'average' | 'median' | 'variance'>
) => {
  const calculations = useMemo(() => {
    console.log('Performing complex calculations...');
    
    const results: Record<string, number> = {};
    
    if (operations.includes('sum')) {
      results.sum = data.reduce((acc, val) => acc + val, 0);
    }
    
    if (operations.includes('average')) {
      results.average = data.length > 0 ? results.sum / data.length : 0;
    }
    
    if (operations.includes('median')) {
      const sorted = [...data].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      results.median = sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
    }
    
    if (operations.includes('variance')) {
      const mean = results.average || data.reduce((acc, val) => acc + val, 0) / data.length;
      results.variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    }
    
    return results;
  }, [data, operations]);
  
  return calculations;
};

// Hook with debounced effects
const useDebounce = <T>(value: T, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  dependencies: any[] = []
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay, ...dependencies]);
};

// ======================
// 5. Component Examples Using Custom Hooks
// ======================

// Component using basic hooks
export const CounterWithHooks = () => {
  const { count, increment, decrement, reset } = useCounter(0, 2);
  const globalCounter = useGlobalCounter();
  
  return (
    <Box p={2} border={1} borderColor="gray.300">
      <Typography variant="h6">Counter with Custom Hooks</Typography>
      <Typography>Local Count: {count}</Typography>
      <Typography>Global Count: {globalCounter.count}</Typography>
      <Space>
        <MuiButton onClick={increment} variant="contained">Local +2</MuiButton>
        <MuiButton onClick={decrement} variant="outlined">Local -2</MuiButton>
        <MuiButton onClick={reset}>Reset Local</MuiButton>
        <AntdButton onClick={globalCounter.increment} type="primary">Global +1</AntdButton>
        <AntdButton onClick={globalCounter.decrement}>Global -1</AntdButton>
      </Space>
    </Box>
  );
};

// Component using form hook
export const FormWithValidation = () => {
  const form = useFormWithValidation(
    { name: '', email: '', age: 0 },
    {
      name: (value) => value.length < 2 ? 'Name must be at least 2 characters' : null,
      email: (value) => !/\S+@\S+\.\S+/.test(value) ? 'Invalid email format' : null,
      age: (value) => value < 18 ? 'Must be at least 18 years old' : null
    }
  );
  
  const handleSubmit = async (values: typeof form.values) => {
    console.log('Submitting:', values);
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Form submitted successfully!');
  };
  
  return (
    <Box p={2} border={1} borderColor="gray.300">
      <Typography variant="h6">Form with Validation Hook</Typography>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(handleSubmit); }}>
        <div style={{ margin: '10px 0' }}>
          <TextField
            label="Name"
            {...form.getFieldProps('name')}
            error={!!form.getFieldProps('name').error}
            helperText={form.getFieldProps('name').error}
            fullWidth
          />
        </div>
        <div style={{ margin: '10px 0' }}>
          <TextField
            label="Email"
            type="email"
            {...form.getFieldProps('email')}
            error={!!form.getFieldProps('email').error}
            helperText={form.getFieldProps('email').error}
            fullWidth
          />
        </div>
        <div style={{ margin: '10px 0' }}>
          <TextField
            label="Age"
            type="number"
            {...form.getFieldProps('age')}
            error={!!form.getFieldProps('age').error}
            helperText={form.getFieldProps('age').error}
            fullWidth
          />
        </div>
        <Space>
          <MuiButton 
            type="submit" 
            variant="contained" 
            disabled={!form.isValid || form.isSubmitting}
          >
            {form.isSubmitting ? 'Submitting...' : 'Submit'}
          </MuiButton>
          <AntdButton onClick={form.resetForm}>Reset</AntdButton>
        </Space>
      </form>
    </Box>
  );
};

// Component using data manager hook
export const DataManagerExample = () => {
  const dataManager = useDataManager<string>(
    ['Initial Item 1', 'Initial Item 2'],
    async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return [`Fetched Item ${Date.now()}`, `Another Item ${Date.now() + 1}`];
    }
  );
  
  const [newItem, setNewItem] = useState('');
  
  return (
    <Box p={2} border={1} borderColor="gray.300">
      <Typography variant="h6">Data Manager Hook Example</Typography>
      <Typography variant="caption">Last Update: {new Date(dataManager.lastUpdate).toLocaleTimeString()}</Typography>
      
      {dataManager.loading && <Typography>Loading...</Typography>}
      {dataManager.error && <Typography color="error">Error: {dataManager.error}</Typography>}
      
      <List>
        {dataManager.items.map((item, index) => (
          <ListItem key={index}>
            <Typography>{item}</Typography>
            <MuiButton 
              onClick={() => dataManager.removeItem(index)}
              size="small"
              color="error"
            >
              Remove
            </MuiButton>
          </ListItem>
        ))}
      </List>
      
      <div style={{ margin: '10px 0' }}>
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="New item"
          onPressEnter={() => {
            if (newItem.trim()) {
              dataManager.addItem(newItem.trim());
              setNewItem('');
            }
          }}
        />
        <AntdButton 
          onClick={() => {
            if (newItem.trim()) {
              dataManager.addItem(newItem.trim());
              setNewItem('');
            }
          }}
        >
          Add Item
        </AntdButton>
      </div>
      
      <MuiButton onClick={dataManager.fetchItems} disabled={dataManager.loading}>
        Fetch New Items
      </MuiButton>
    </Box>
  );
};

// Component using performance-optimized hooks
export const PerformanceOptimizedComponent = () => {
  const [numbers, setNumbers] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const calculations = useComplexCalculation(numbers, ['sum', 'average', 'median', 'variance']);
  
  const debouncedLog = useDebouncedCallback((term: string) => {
    console.log('Debounced search:', term);
  }, 300);
  
  useEffect(() => {
    debouncedLog(debouncedSearchTerm);
  }, [debouncedSearchTerm, debouncedLog]);
  
  const addRandomNumber = () => {
    setNumbers(prev => [...prev, Math.floor(Math.random() * 100)]);
  };
  
  const removeLastNumber = () => {
    setNumbers(prev => prev.slice(0, -1));
  };
  
  return (
    <Box p={2} border={1} borderColor="gray.300">
      <Typography variant="h6">Performance Optimized Component</Typography>
      
      <div style={{ margin: '10px 0' }}>
        <TextField
          label="Search (debounced)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type to see debounced effect"
        />
        <Typography variant="caption">
          Debounced: "{debouncedSearchTerm}"
        </Typography>
      </div>
      
      <Typography>Numbers: {numbers.join(', ')}</Typography>
      
      <div style={{ margin: '10px 0' }}>
        <Typography>Calculations:</Typography>
        <Typography>Sum: {calculations.sum}</Typography>
        <Typography>Average: {calculations.average?.toFixed(2)}</Typography>
        <Typography>Median: {calculations.median}</Typography>
        <Typography>Variance: {calculations.variance?.toFixed(2)}</Typography>
      </div>
      
      <Space>
        <MuiButton onClick={addRandomNumber} variant="contained">
          Add Random Number
        </MuiButton>
        <AntdButton onClick={removeLastNumber} danger disabled={numbers.length === 0}>
          Remove Last
        </AntdButton>
      </Space>
    </Box>
  );
};

// Main test component
export const CustomHooksComplexDepsTests = () => {
  const [contextState, setContextState] = useState<AppContextType>({
    user: { id: '1', name: 'Test User' },
    theme: 'light',
    settings: { notifications: true }
  });
  
  return (
    <AppContext.Provider value={contextState}>
      <div style={{ padding: '20px' }}>
        <Typography variant="h4">Custom Hooks with Complex Dependencies Tests</Typography>
        
        <div style={{ margin: '20px 0' }}>
          <MuiButton 
            onClick={() => setContextState(prev => ({ 
              ...prev, 
              theme: prev.theme === 'light' ? 'dark' : 'light' 
            }))}
          >
            Toggle Theme: {contextState.theme}
          </MuiButton>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <CounterWithHooks />
          <FormWithValidation />
          <DataManagerExample />
          <PerformanceOptimizedComponent />
        </div>
      </div>
    </AppContext.Provider>
  );
};

export default CustomHooksComplexDepsTests;
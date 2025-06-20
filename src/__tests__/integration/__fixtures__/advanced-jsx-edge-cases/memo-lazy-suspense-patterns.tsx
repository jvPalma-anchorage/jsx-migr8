/**
 * Memo, Lazy, and Suspense Pattern Test Cases
 * Tests jsx-migr8's ability to handle React.memo, React.lazy, Suspense, and performance optimization patterns
 */

import React, { 
  memo, 
  lazy, 
  Suspense, 
  useState, 
  useCallback, 
  useMemo, 
  useEffect, 
  startTransition,
  useDeferredValue,
  useTransition,
  forwardRef,
  createContext,
  useContext
} from 'react';
import { Button as MuiButton, CircularProgress, Typography, Box, Card } from '@mui/material';
import { Button as AntdButton, Spin, Alert } from 'antd';

// ======================
// 1. React.memo Patterns
// ======================

// Basic memo component
const BasicMemoComponent = memo(({ 
  title, 
  count, 
  onIncrement 
}: { 
  title: string; 
  count: number; 
  onIncrement: () => void; 
}) => {
  console.log(`BasicMemoComponent rendered: ${title}`);
  
  return (
    <div style={{ padding: '10px', border: '1px solid blue', margin: '5px' }}>
      <Typography variant="h6">{title}</Typography>
      <Typography>Count: {count}</Typography>
      <MuiButton onClick={onIncrement} variant="contained">
        Increment
      </MuiButton>
    </div>
  );
});

// Memo with custom comparison
const CustomMemoComponent = memo(({ 
  data, 
  theme, 
  onAction 
}: { 
  data: { id: number; value: string; metadata?: any }; 
  theme: 'light' | 'dark'; 
  onAction: (id: number) => void; 
}) => {
  console.log(`CustomMemoComponent rendered: ${data.id}`);
  
  return (
    <Card 
      style={{ 
        margin: '5px', 
        backgroundColor: theme === 'dark' ? '#333' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      }}
    >
      <Typography>ID: {data.id}</Typography>
      <Typography>Value: {data.value}</Typography>
      <AntdButton 
        onClick={() => onAction(data.id)}
        type={theme === 'dark' ? 'primary' : 'default'}
      >
        Action
      </AntdButton>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if id or value changes
  return (
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.value === nextProps.data.value &&
    prevProps.theme === nextProps.theme
  );
});

// Memo with forwardRef
const MemoForwardRefComponent = memo(forwardRef<HTMLDivElement, { 
  children: React.ReactNode; 
  className?: string; 
}>((
  { children, className }, 
  ref
) => {
  console.log('MemoForwardRefComponent rendered');
  
  return (
    <div ref={ref} className={className} style={{ padding: '10px', border: '2px solid green' }}>
      {children}
    </div>
  );
}));

// Complex memo with multiple props
const ComplexMemoComponent = memo(({ 
  config,
  handlers,
  data,
  render
}: {
  config: { theme: string; size: string; variant: string };
  handlers: { onClick: () => void; onHover: () => void };
  data: Array<{ id: string; label: string; active: boolean }>;
  render?: (item: any) => React.ReactNode;
}) => {
  console.log('ComplexMemoComponent rendered with', data.length, 'items');
  
  const defaultRender = useCallback((item: any) => (
    <MuiButton 
      key={item.id}
      variant={item.active ? 'contained' : 'outlined'}
      size={config.size as any}
      onClick={handlers.onClick}
      onMouseEnter={handlers.onHover}
    >
      {item.label}
    </MuiButton>
  ), [config.size, handlers.onClick, handlers.onHover]);

  return (
    <Box sx={{ p: 2, border: '1px solid orange' }} data-theme={config.theme}>
      {data.map(render || defaultRender)}
    </Box>
  );
});

// ======================
// 2. React.lazy Patterns
// ======================

// Simple lazy component
const SimpleLazyComponent = lazy(() => 
  new Promise(resolve => {
    setTimeout(() => {
      resolve({
        default: () => (
          <div style={{ padding: '20px', background: 'lightblue' }}>
            <Typography>Simple Lazy Component Loaded!</Typography>
            <MuiButton variant="contained">Lazy Button</MuiButton>
          </div>
        )
      });
    }, 1000);
  })
);

// Lazy component with props
const LazyComponentWithProps = lazy(() => 
  Promise.resolve({
    default: ({ title, items }: { title: string; items: string[] }) => (
      <div style={{ padding: '15px', background: 'lightgreen' }}>
        <Typography variant="h5">{title}</Typography>
        {items.map((item, index) => (
          <AntdButton key={index} style={{ margin: '2px' }}>
            {item}
          </AntdButton>
        ))}
      </div>
    )
  })
);

// Conditional lazy loading
const ConditionalLazyComponent = lazy(() => {
  const shouldLoadAlternative = Math.random() > 0.5;
  
  if (shouldLoadAlternative) {
    return Promise.resolve({
      default: () => (
        <div style={{ padding: '15px', background: 'yellow' }}>
          <Typography>Alternative Lazy Component</Typography>
          <MuiButton color="warning">Alternative Action</MuiButton>
        </div>
      )
    });
  }
  
  return Promise.resolve({
    default: () => (
      <div style={{ padding: '15px', background: 'pink' }}>
        <Typography>Primary Lazy Component</Typography>
        <AntdButton type="primary">Primary Action</AntdButton>
      </div>
    )
  });
});

// Lazy component with error simulation
const ErrorPronelazyComponent = lazy(() => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.7) {
        reject(new Error('Simulated lazy loading error'));
      } else {
        resolve({
          default: () => (
            <div style={{ padding: '15px', background: 'lightcoral' }}>
              <Typography>Error-Prone Component Loaded Successfully!</Typography>
              <MuiButton variant="outlined">Success Button</MuiButton>
            </div>
          )
        });
      }
    }, 1500);
  });
});

// ======================
// 3. Suspense Patterns
// ======================

// Basic Suspense wrapper
export const BasicSuspenseWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <CircularProgress />
        <Typography>Loading component...</Typography>
      </div>
    }>
      {children}
    </Suspense>
  );
};

// Nested Suspense boundaries
export const NestedSuspenseBoundaries = () => {
  const [showInner, setShowInner] = useState(false);
  
  return (
    <Suspense fallback={<Spin size="large" tip="Loading outer..." />}>
      <div style={{ padding: '15px', border: '2px solid purple' }}>
        <Typography variant="h6">Outer Suspense Boundary</Typography>
        <SimpleLazyComponent />
        
        <MuiButton 
          onClick={() => setShowInner(!showInner)}
          style={{ margin: '10px 0' }}
        >
          Toggle Inner Suspense
        </MuiButton>
        
        {showInner && (
          <Suspense fallback={<Alert message="Loading inner component..." type="info" />}>
            <div style={{ border: '1px solid green', padding: '10px' }}>
              <Typography>Inner Suspense Boundary</Typography>
              <LazyComponentWithProps 
                title="Inner Lazy Component" 
                items={['Item 1', 'Item 2', 'Item 3']} 
              />
            </div>
          </Suspense>
        )}
      </div>
    </Suspense>
  );
};

// Suspense with error boundary
class SuspenseErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Suspense Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Alert 
          message="Component failed to load" 
          description={this.state.error?.message}
          type="error" 
          showIcon
          action={
            <AntdButton 
              size="small" 
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Retry
            </AntdButton>
          }
        />
      );
    }

    return this.props.children;
  }
}

export const SuspenseWithErrorBoundary = () => {
  const [key, setKey] = useState(0);
  
  return (
    <SuspenseErrorBoundary>
      <Suspense fallback={<Spin tip="Loading error-prone component..." />}>
        <ErrorPronelazyComponent key={key} />
        <MuiButton 
          onClick={() => setKey(prev => prev + 1)}
          style={{ margin: '10px' }}
        >
          Retry Loading ({key})
        </MuiButton>
      </Suspense>
    </SuspenseErrorBoundary>
  );
};

// ======================
// 4. Performance Optimization Patterns
// ======================

// Combined memo and suspense
const HeavyMemoComponent = memo(({ 
  computationInput,
  onResult
}: { 
  computationInput: number;
  onResult?: (result: number) => void;
}) => {
  console.log('HeavyMemoComponent computing...');
  
  const heavyComputation = useMemo(() => {
    // Simulate heavy computation
    let result = 0;
    for (let i = 0; i < computationInput * 1000000; i++) {
      result += Math.random();
    }
    return Math.floor(result);
  }, [computationInput]);

  useEffect(() => {
    onResult?.(heavyComputation);
  }, [heavyComputation, onResult]);

  return (
    <div style={{ padding: '15px', background: 'lightyellow' }}>
      <Typography>Heavy Computation Result: {heavyComputation}</Typography>
      <MuiButton variant="contained">Computed Component</MuiButton>
    </div>
  );
});

const LazyHeavyComponent = lazy(() => 
  Promise.resolve({
    default: HeavyMemoComponent
  })
);

export const OptimizedHeavyComponent = ({ input }: { input: number }) => {
  const [result, setResult] = useState<number | null>(null);
  
  return (
    <div>
      <Typography>Input: {input}</Typography>
      <Suspense fallback={<Spin tip="Loading heavy computation..." />}>
        <LazyHeavyComponent 
          computationInput={input}
          onResult={setResult}
        />
      </Suspense>
      {result && <Typography>Callback Result: {result}</Typography>}
    </div>
  );
};

// useTransition with Suspense
export const TransitionSuspensePattern = () => {
  const [isPending, startTransition] = useTransition();
  const [activeComponent, setActiveComponent] = useState<'simple' | 'props' | 'conditional'>('simple');
  
  const handleComponentChange = (component: typeof activeComponent) => {
    startTransition(() => {
      setActiveComponent(component);
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '10px' }}>
        <MuiButton 
          onClick={() => handleComponentChange('simple')}
          variant={activeComponent === 'simple' ? 'contained' : 'outlined'}
          disabled={isPending}
        >
          Simple
        </MuiButton>
        <MuiButton 
          onClick={() => handleComponentChange('props')}
          variant={activeComponent === 'props' ? 'contained' : 'outlined'}
          disabled={isPending}
        >
          With Props
        </MuiButton>
        <MuiButton 
          onClick={() => handleComponentChange('conditional')}
          variant={activeComponent === 'conditional' ? 'contained' : 'outlined'}
          disabled={isPending}
        >
          Conditional
        </MuiButton>
      </div>
      
      {isPending && <Typography>Transitioning...</Typography>}
      
      <Suspense fallback={<Spin tip="Loading component..." />}>
        {activeComponent === 'simple' && <SimpleLazyComponent />}
        {activeComponent === 'props' && (
          <LazyComponentWithProps 
            title="Transition Component" 
            items={['Transition', 'Item', 'List']} 
          />
        )}
        {activeComponent === 'conditional' && <ConditionalLazyComponent />}
      </Suspense>
    </div>
  );
};

// useDeferredValue with memo
const DeferredMemoList = memo(({ 
  items, 
  filter 
}: { 
  items: Array<{ id: string; name: string; category: string }>; 
  filter: string; 
}) => {
  const deferredFilter = useDeferredValue(filter);
  
  const filteredItems = useMemo(() => {
    console.log('Filtering items with:', deferredFilter);
    return items.filter(item => 
      item.name.toLowerCase().includes(deferredFilter.toLowerCase()) ||
      item.category.toLowerCase().includes(deferredFilter.toLowerCase())
    );
  }, [items, deferredFilter]);

  return (
    <div style={{ border: '1px solid gray', padding: '10px' }}>
      <Typography>Filtered Items ({deferredFilter !== filter ? 'updating...' : 'current'}):</Typography>
      {filteredItems.map(item => (
        <div key={item.id} style={{ margin: '2px' }}>
          <AntdButton size="small">{item.name} - {item.category}</AntdButton>
        </div>
      ))}
    </div>
  );
});

export const DeferredValuePattern = () => {
  const [filter, setFilter] = useState('');
  const items = useMemo(() => 
    Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      category: i % 3 === 0 ? 'Category A' : i % 3 === 1 ? 'Category B' : 'Category C'
    })), []
  );

  return (
    <div>
      <input 
        type="text"
        placeholder="Filter items..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: '10px', padding: '5px' }}
      />
      <DeferredMemoList items={items} filter={filter} />
    </div>
  );
};

// ======================
// 5. Context with Memo and Suspense
// ======================

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {}
});

const ThemedMemoComponent = memo(({ children }: { children: React.ReactNode }) => {
  const { theme } = useContext(ThemeContext);
  console.log('ThemedMemoComponent rendered with theme:', theme);
  
  return (
    <div style={{ 
      background: theme === 'dark' ? '#333' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
      padding: '15px',
      border: '1px solid gray'
    }}>
      {children}
    </div>
  );
});

const LazyThemedComponent = lazy(() => 
  Promise.resolve({
    default: () => {
      const { theme, toggleTheme } = useContext(ThemeContext);
      return (
        <ThemedMemoComponent>
          <Typography>Lazy Themed Component</Typography>
          <Typography>Current Theme: {theme}</Typography>
          <MuiButton onClick={toggleTheme} variant="contained">
            Toggle Theme
          </MuiButton>
        </ThemedMemoComponent>
      );
    }
  })
);

export const ContextMemoSuspensePattern = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const themeValue = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }), [theme]);

  return (
    <ThemeContext.Provider value={themeValue}>
      <div style={{ padding: '20px' }}>
        <Typography variant="h5">Context + Memo + Suspense Pattern</Typography>
        <Suspense fallback={<Spin tip="Loading themed component..." />}>
          <LazyThemedComponent />
        </Suspense>
      </div>
    </ThemeContext.Provider>
  );
};

// ======================
// 6. Main Test Component
// ======================

export const MemoLazySuspenseTests = () => {
  const [basicCount, setBasicCount] = useState(0);
  const [customData, setCustomData] = useState({ id: 1, value: 'initial', metadata: {} });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [heavyInput, setHeavyInput] = useState(1);
  const [showLazy, setShowLazy] = useState(false);

  const handleBasicIncrement = useCallback(() => {
    setBasicCount(prev => prev + 1);
  }, []);

  const handleCustomAction = useCallback((id: number) => {
    console.log('Custom action for:', id);
  }, []);

  const complexConfig = useMemo(() => ({
    theme: theme,
    size: 'medium',
    variant: 'contained'
  }), [theme]);

  const complexHandlers = useMemo(() => ({
    onClick: () => console.log('Complex click'),
    onHover: () => console.log('Complex hover')
  }), []);

  const complexData = useMemo(() => [
    { id: 'btn1', label: 'Button 1', active: true },
    { id: 'btn2', label: 'Button 2', active: false },
    { id: 'btn3', label: 'Button 3', active: true }
  ], []);

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4">Memo, Lazy, and Suspense Pattern Tests</Typography>
      
      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">1. React.memo Patterns</Typography>
        
        <BasicMemoComponent 
          title="Basic Memo Component"
          count={basicCount}
          onIncrement={handleBasicIncrement}
        />
        
        <CustomMemoComponent 
          data={customData} 
          theme={theme}
          onAction={handleCustomAction}
        />
        
        <MemoForwardRefComponent className="memo-forward-ref">
          <Typography>Memo with ForwardRef</Typography>
          <AntdButton>Inside ForwardRef</AntdButton>
        </MemoForwardRefComponent>
        
        <ComplexMemoComponent 
          config={complexConfig}
          handlers={complexHandlers}
          data={complexData}
        />
        
        <div style={{ margin: '10px 0' }}>
          <MuiButton onClick={() => setCustomData(prev => ({ ...prev, value: `updated-${Date.now()}` }))}>
            Update Custom Data
          </MuiButton>
          <MuiButton onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}>
            Toggle Theme: {theme}
          </MuiButton>
        </div>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">2. Lazy Loading with Suspense</Typography>
        
        <MuiButton onClick={() => setShowLazy(!showLazy)}>
          {showLazy ? 'Hide' : 'Show'} Lazy Components
        </MuiButton>
        
        {showLazy && (
          <>
            <BasicSuspenseWrapper>
              <SimpleLazyComponent />
            </BasicSuspenseWrapper>
            
            <NestedSuspenseBoundaries />
            
            <SuspenseWithErrorBoundary />
          </>
        )}
      </section>

      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">3. Performance Optimization</Typography>
        
        <div>
          <Typography>Heavy Computation Input: {heavyInput}</Typography>
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={heavyInput}
            onChange={(e) => setHeavyInput(Number(e.target.value))}
          />
          <OptimizedHeavyComponent input={heavyInput} />
        </div>
        
        <TransitionSuspensePattern />
        
        <DeferredValuePattern />
      </section>

      <section>
        <Typography variant="h5">4. Context Integration</Typography>
        <ContextMemoSuspensePattern />
      </section>
    </div>
  );
};

export default MemoLazySuspenseTests;
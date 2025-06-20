/**
 * Spread Operators with Computed Props Test Cases
 * Tests jsx-migr8's ability to handle complex spread patterns, computed properties, and dynamic prop generation
 */

import React, { useState, useMemo, useCallback, useRef, ReactNode } from 'react';
import { Button as MuiButton, Typography, Box, TextField, Slider, Card } from '@mui/material';
import { Button as AntdButton, Input, Space, Tag, Tooltip } from 'antd';

// ======================
// 1. Basic Spread Patterns
// ======================

// Simple object spread
export const BasicSpreadPattern = ({ baseProps, overrideProps }: {
  baseProps: Record<string, any>;
  overrideProps: Record<string, any>;
}) => {
  return (
    <div>
      <MuiButton {...baseProps} {...overrideProps}>
        Basic Spread
      </MuiButton>
      <AntdButton {...{ ...baseProps, ...overrideProps }}>
        Nested Spread
      </AntdButton>
    </div>
  );
};

// Conditional spread
export const ConditionalSpread = ({ 
  condition, 
  baseProps, 
  conditionalProps 
}: {
  condition: boolean;
  baseProps: Record<string, any>;
  conditionalProps: Record<string, any>;
}) => {
  return (
    <div>
      <MuiButton 
        {...baseProps} 
        {...(condition ? conditionalProps : {})}
      >
        Conditional Spread
      </MuiButton>
      
      <AntdButton 
        {...baseProps}
        {...(condition && conditionalProps)}
      >
        Logical AND Spread
      </AntdButton>
      
      <MuiButton
        {...baseProps}
        {...(condition ? conditionalProps : { disabled: true })}
      >
        Ternary Spread
      </MuiButton>
    </div>
  );
};

// Destructuring with spread
export const DestructuringSpread = ({ 
  props 
}: { 
  props: { 
    variant: string; 
    color: string; 
    size: string; 
    onClick: () => void; 
    children: ReactNode;
    [key: string]: any; 
  } 
}) => {
  const { variant, color, children, ...restProps } = props;
  const { size, onClick, ...otherProps } = restProps;
  
  return (
    <div>
      <MuiButton 
        variant={variant as any} 
        color={color as any} 
        {...restProps}
      >
        Destructured Props
      </MuiButton>
      
      <AntdButton 
        size={size as any} 
        onClick={onClick}
        {...otherProps}
      >
        {children}
      </AntdButton>
    </div>
  );
};

// ======================
// 2. Computed Properties
// ======================

// Dynamic property names
export const ComputedPropertyNames = ({ 
  prefix, 
  suffix, 
  values 
}: {
  prefix: string;
  suffix: string;
  values: Record<string, any>;
}) => {
  const computedProps = useMemo(() => {
    const props: Record<string, any> = {};
    
    Object.entries(values).forEach(([key, value]) => {
      props[`${prefix}${key}${suffix}`] = value;
    });
    
    return props;
  }, [prefix, suffix, values]);
  
  const dynamicDataAttributes = useMemo(() => {
    return Object.keys(values).reduce((acc, key) => {
      acc[`data-${key.toLowerCase()}`] = values[key];
      return acc;
    }, {} as Record<string, any>);
  }, [values]);
  
  return (
    <div>
      <MuiButton {...computedProps}>
        Computed Property Names
      </MuiButton>
      
      <AntdButton {...dynamicDataAttributes}>
        Dynamic Data Attributes
      </AntdButton>
      
      <div 
        {...Object.fromEntries(
          Object.entries(values).map(([key, value]) => [`aria-${key}`, value])
        )}
      >
        Computed ARIA attributes
      </div>
    </div>
  );
};

// Complex computed props
export const ComplexComputedProps = ({ 
  theme, 
  size, 
  state, 
  permissions 
}: {
  theme: 'light' | 'dark';
  size: 'small' | 'medium' | 'large';
  state: 'idle' | 'loading' | 'success' | 'error';
  permissions: string[];
}) => {
  const computedStyles = useMemo(() => {
    const baseSize = size === 'small' ? 8 : size === 'medium' ? 16 : 24;
    const themeColors = theme === 'dark' 
      ? { background: '#333', color: '#fff', border: '1px solid #666' }
      : { background: '#fff', color: '#333', border: '1px solid #ccc' };
    
    const stateStyles = {
      idle: {},
      loading: { opacity: 0.7, cursor: 'wait' },
      success: { backgroundColor: '#4caf50', color: 'white' },
      error: { backgroundColor: '#f44336', color: 'white' }
    };
    
    return {
      padding: `${baseSize / 2}px ${baseSize}px`,
      margin: '4px',
      borderRadius: baseSize / 4,
      ...themeColors,
      ...stateStyles[state]
    };
  }, [theme, size, state]);
  
  const computedAttributes = useMemo(() => {
    return {
      'data-theme': theme,
      'data-size': size,
      'data-state': state,
      'aria-disabled': state === 'loading',
      'aria-label': `${size} ${theme} button in ${state} state`,
      role: 'button',
      tabIndex: state === 'loading' ? -1 : 0,
      ...permissions.reduce((acc, permission) => {
        acc[`data-permission-${permission}`] = 'true';
        return acc;
      }, {} as Record<string, any>)
    };
  }, [theme, size, state, permissions]);
  
  const eventHandlers = useMemo(() => {
    if (state === 'loading') return {};
    
    return {
      onClick: () => console.log('Computed click'),
      onMouseEnter: () => console.log('Computed hover'),
      onFocus: () => console.log('Computed focus'),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          console.log('Computed keyboard activation');
        }
      }
    };
  }, [state]);
  
  return (
    <div>
      <div 
        style={computedStyles}
        {...computedAttributes}
        {...eventHandlers}
      >
        Complex Computed Props Component
      </div>
      
      <MuiButton
        {...computedAttributes}
        style={computedStyles}
        {...eventHandlers}
      >
        MUI with Computed Props
      </MuiButton>
    </div>
  );
};

// ======================
// 3. Dynamic Prop Generation
// ======================

// Props from configuration
export const PropsFromConfig = ({ 
  config 
}: { 
  config: {
    component: 'mui' | 'antd';
    props: Record<string, any>;
    styles: Record<string, any>;
    events: Record<string, () => void>;
    conditions: Record<string, boolean>;
  }
}) => {
  const generateProps = useCallback(() => {
    const { props, styles, events, conditions } = config;
    
    // Apply conditional props
    const conditionalProps = Object.entries(conditions).reduce((acc, [key, condition]) => {
      if (condition && props[key]) {
        acc[key] = props[key];
      }
      return acc;
    }, {} as Record<string, any>);
    
    // Merge all props
    return {
      ...props,
      ...conditionalProps,
      style: { ...styles, ...props.style },
      ...events
    };
  }, [config]);
  
  const finalProps = generateProps();
  
  return (
    <div>
      {config.component === 'mui' ? (
        <MuiButton {...finalProps}>
          Config-driven MUI Button
        </MuiButton>
      ) : (
        <AntdButton {...finalProps}>
          Config-driven Antd Button
        </AntdButton>
      )}
    </div>
  );
};

// Factory pattern with spread
const createPropsFactory = (baseProps: Record<string, any>) => {
  return (overrides: Record<string, any> = {}) => ({
    ...baseProps,
    ...overrides,
    style: { ...baseProps.style, ...overrides.style },
    className: [baseProps.className, overrides.className].filter(Boolean).join(' ')
  });
};

export const PropsFactoryPattern = () => {
  const buttonFactory = useMemo(() => createPropsFactory({
    variant: 'contained',
    color: 'primary',
    style: { margin: '4px', textTransform: 'none' },
    className: 'factory-button'
  }), []);
  
  const antdFactory = useMemo(() => createPropsFactory({
    type: 'primary',
    style: { margin: '4px' },
    className: 'factory-antd-button'
  }), []);
  
  return (
    <div>
      <MuiButton {...buttonFactory()}>
        Default Factory
      </MuiButton>
      
      <MuiButton {...buttonFactory({ color: 'secondary', size: 'small' })}>
        Custom Factory
      </MuiButton>
      
      <AntdButton {...antdFactory()}>
        Antd Default
      </AntdButton>
      
      <AntdButton {...antdFactory({ danger: true, ghost: true })}>
        Antd Custom
      </AntdButton>
    </div>
  );
};

// ======================
// 4. Complex Spread Combinations
// ======================

// Multiple spread sources
export const MultipleSpreadSources = ({ 
  baseConfig, 
  themeConfig, 
  userConfig, 
  runtimeConfig 
}: {
  baseConfig: Record<string, any>;
  themeConfig: Record<string, any>;
  userConfig: Record<string, any>;
  runtimeConfig: Record<string, any>;
}) => {
  // Spread priority: base < theme < user < runtime
  const mergedProps = useMemo(() => {
    return {
      ...baseConfig,
      ...themeConfig,
      ...userConfig,
      ...runtimeConfig,
      // Special handling for nested objects
      style: {
        ...baseConfig.style,
        ...themeConfig.style,
        ...userConfig.style,
        ...runtimeConfig.style
      },
      // Array merging for className
      className: [
        baseConfig.className,
        themeConfig.className,
        userConfig.className,
        runtimeConfig.className
      ].filter(Boolean).join(' ')
    };
  }, [baseConfig, themeConfig, userConfig, runtimeConfig]);
  
  // Alternative merge with explicit control
  const controlledMerge = useMemo(() => {
    const merge = (...configs: Record<string, any>[]) => {
      return configs.reduce((acc, config) => {
        Object.keys(config).forEach(key => {
          if (key === 'style') {
            acc[key] = { ...acc[key], ...config[key] };
          } else if (key === 'className') {
            acc[key] = [acc[key], config[key]].filter(Boolean).join(' ');
          } else if (Array.isArray(config[key])) {
            acc[key] = [...(acc[key] || []), ...config[key]];
          } else {
            acc[key] = config[key];
          }
        });
        return acc;
      }, {});
    };
    
    return merge(baseConfig, themeConfig, userConfig, runtimeConfig);
  }, [baseConfig, themeConfig, userConfig, runtimeConfig]);
  
  return (
    <div>
      <MuiButton {...mergedProps}>
        Standard Merge
      </MuiButton>
      
      <AntdButton {...controlledMerge}>
        Controlled Merge
      </AntdButton>
      
      <div 
        {...baseConfig}
        {...themeConfig}
        {...userConfig}
        {...runtimeConfig}
        style={{
          ...baseConfig.style,
          ...themeConfig.style,
          ...userConfig.style,
          ...runtimeConfig.style
        }}
      >
        Inline Multi-Spread
      </div>
    </div>
  );
};

// Nested object spread patterns
export const NestedObjectSpread = ({ 
  config 
}: { 
  config: {
    ui: {
      theme: Record<string, any>;
      layout: Record<string, any>;
      components: Record<string, any>;
    };
    behavior: {
      interactions: Record<string, any>;
      animations: Record<string, any>;
    };
    data: {
      attributes: Record<string, any>;
      meta: Record<string, any>;
    };
  }
}) => {
  const flattenedProps = useMemo(() => {
    return {
      ...config.ui.theme,
      ...config.ui.layout,
      ...config.ui.components,
      ...config.behavior.interactions,
      ...config.behavior.animations,
      ...config.data.attributes,
      ...config.data.meta
    };
  }, [config]);
  
  const categorizedProps = useMemo(() => {
    return {
      style: {
        ...config.ui.theme,
        ...config.ui.layout,
        ...config.behavior.animations
      },
      ...config.ui.components,
      ...config.behavior.interactions,
      ...config.data.attributes,
      'data-meta': JSON.stringify(config.data.meta)
    };
  }, [config]);
  
  return (
    <div>
      <MuiButton {...flattenedProps}>
        Flattened Nested
      </MuiButton>
      
      <AntdButton {...categorizedProps}>
        Categorized Nested
      </AntdButton>
      
      <div 
        {...{
          ...config.ui.theme,
          ...config.behavior.interactions,
          style: {
            ...config.ui.layout,
            ...config.behavior.animations
          }
        }}
      >
        Selective Nested Spread
      </div>
    </div>
  );
};

// ======================
// 5. Performance Optimizations
// ======================

// Memoized spread operations
export const MemoizedSpreadOperations = ({ 
  expensiveProps, 
  frequentProps 
}: {
  expensiveProps: Record<string, any>;
  frequentProps: Record<string, any>;
}) => {
  // Memoize expensive prop calculations
  const memoizedExpensiveProps = useMemo(() => {
    console.log('Computing expensive props...');
    return Object.keys(expensiveProps).reduce((acc, key) => {
      // Simulate expensive computation
      const value = typeof expensiveProps[key] === 'number' 
        ? expensiveProps[key] * Math.random() 
        : expensiveProps[key];
      
      acc[`computed-${key}`] = value;
      return acc;
    }, {} as Record<string, any>);
  }, [expensiveProps]);
  
  // Use callback for stable references
  const memoizedEventHandlers = useMemo(() => ({
    onClick: () => console.log('Memoized click'),
    onMouseEnter: () => console.log('Memoized hover'),
    onFocus: () => console.log('Memoized focus')
  }), []);
  
  // Combine with frequent props
  const combinedProps = useMemo(() => ({
    ...memoizedExpensiveProps,
    ...frequentProps,
    ...memoizedEventHandlers
  }), [memoizedExpensiveProps, frequentProps, memoizedEventHandlers]);
  
  return (
    <div>
      <MuiButton {...combinedProps}>
        Memoized Props
      </MuiButton>
      
      <AntdButton 
        {...memoizedExpensiveProps}
        {...frequentProps}
        {...memoizedEventHandlers}
      >
        Separate Memoized Spreads
      </AntdButton>
    </div>
  );
};

// Lazy prop evaluation
export const LazyPropEvaluation = ({ 
  shouldComputeExpensive 
}: { 
  shouldComputeExpensive: boolean 
}) => {
  const lazyProps = useMemo(() => {
    if (!shouldComputeExpensive) return {};
    
    console.log('Computing lazy props...');
    return {
      'data-expensive': 'computed',
      'aria-label': 'Expensive computation result',
      style: {
        background: `linear-gradient(${Math.random() * 360}deg, red, blue)`,
        transform: `rotate(${Math.random() * 360}deg)`
      }
    };
  }, [shouldComputeExpensive]);
  
  const baseProps = {
    variant: 'contained' as const,
    color: 'primary' as const
  };
  
  return (
    <div>
      <MuiButton 
        {...baseProps}
        {...(shouldComputeExpensive ? lazyProps : {})}
      >
        Conditional Lazy Props
      </MuiButton>
      
      <AntdButton 
        {...baseProps}
        {...lazyProps}
      >
        Always Spread Lazy Props
      </AntdButton>
    </div>
  );
};

// ======================
// 6. Advanced Patterns
// ======================

// HOC with spread patterns
const withSpreadEnhancement = <P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  enhancementConfig: {
    addProps?: Record<string, any>;
    transformProps?: (props: P) => Partial<P>;
    wrapperProps?: Record<string, any>;
  }
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const transformedProps = enhancementConfig.transformProps?.(props) || {};
    const finalProps = {
      ...props,
      ...enhancementConfig.addProps,
      ...transformedProps,
      ref
    };
    
    const element = <Component {...finalProps} />;
    
    return enhancementConfig.wrapperProps ? (
      <div {...enhancementConfig.wrapperProps}>
        {element}
      </div>
    ) : element;
  });
};

const EnhancedMuiButton = withSpreadEnhancement(MuiButton, {
  addProps: { 'data-enhanced': true },
  transformProps: (props) => ({
    variant: props.variant || 'outlined',
    size: 'small'
  }),
  wrapperProps: { style: { padding: '4px' } }
});

export const HOCSpreadPattern = () => {
  return (
    <div>
      <EnhancedMuiButton color="primary">
        Enhanced Button
      </EnhancedMuiButton>
      
      <EnhancedMuiButton variant="contained" color="secondary">
        Enhanced with Override
      </EnhancedMuiButton>
    </div>
  );
};

// Render props with spread
export const RenderPropsSpread = ({ 
  children 
}: { 
  children: (props: Record<string, any>) => ReactNode 
}) => {
  const [state, setState] = useState({
    count: 0,
    theme: 'light',
    active: false
  });
  
  const renderProps = useMemo(() => ({
    ...state,
    increment: () => setState(prev => ({ ...prev, count: prev.count + 1 })),
    toggleTheme: () => setState(prev => ({ 
      ...prev, 
      theme: prev.theme === 'light' ? 'dark' : 'light' 
    })),
    toggleActive: () => setState(prev => ({ ...prev, active: !prev.active })),
    style: {
      backgroundColor: state.theme === 'dark' ? '#333' : '#fff',
      color: state.theme === 'dark' ? '#fff' : '#333',
      opacity: state.active ? 1 : 0.7,
      padding: '8px',
      border: '1px solid gray'
    }
  }), [state]);
  
  return <div>{children(renderProps)}</div>;
};

// ======================
// 7. Main Test Component
// ======================

export const SpreadComputedPropsTests = () => {
  const [testState, setTestState] = useState({
    condition: true,
    theme: 'light' as const,
    size: 'medium' as const,
    state: 'idle' as const,
    shouldComputeExpensive: false
  });
  
  const baseProps = { variant: 'outlined', style: { margin: '4px' } };
  const overrideProps = { color: 'primary', size: 'small' };
  const conditionalProps = { variant: 'contained', color: 'secondary' };
  
  const sampleConfig = {
    component: 'mui' as const,
    props: { variant: 'contained', color: 'primary' },
    styles: { margin: '8px', borderRadius: '8px' },
    events: { onClick: () => console.log('Config click') },
    conditions: { showSpecial: testState.condition }
  };
  
  const complexConfig = {
    ui: {
      theme: { backgroundColor: testState.theme === 'dark' ? '#333' : '#fff' },
      layout: { padding: '12px', margin: '4px' },
      components: { variant: 'contained' }
    },
    behavior: {
      interactions: { onClick: () => console.log('Nested click') },
      animations: { transition: 'all 0.3s ease' }
    },
    data: {
      attributes: { 'data-testid': 'nested-button' },
      meta: { version: '1.0', component: 'NestedButton' }
    }
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4">Spread Operators with Computed Props Tests</Typography>
      
      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">1. Basic Spread Patterns</Typography>
        <BasicSpreadPattern baseProps={baseProps} overrideProps={overrideProps} />
        <ConditionalSpread 
          condition={testState.condition}
          baseProps={baseProps}
          conditionalProps={conditionalProps}
        />
        <DestructuringSpread props={{
          variant: 'outlined',
          color: 'primary',
          size: 'medium',
          onClick: () => console.log('Destructured click'),
          children: 'Destructured Button',
          'data-custom': 'value'
        }} />
      </section>

      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">2. Computed Properties</Typography>
        <ComputedPropertyNames 
          prefix="data-"
          suffix="-computed"
          values={{ theme: testState.theme, size: testState.size }}
        />
        <ComplexComputedProps 
          theme={testState.theme}
          size={testState.size}
          state={testState.state}
          permissions={['read', 'write']}
        />
      </section>

      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">3. Dynamic Prop Generation</Typography>
        <PropsFromConfig config={sampleConfig} />
        <PropsFactoryPattern />
      </section>

      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">4. Complex Combinations</Typography>
        <MultipleSpreadSources 
          baseConfig={{ variant: 'outlined' }}
          themeConfig={{ style: { backgroundColor: testState.theme === 'dark' ? '#333' : '#fff' } }}
          userConfig={{ size: testState.size }}
          runtimeConfig={{ 'data-runtime': Date.now() }}
        />
        <NestedObjectSpread config={complexConfig} />
      </section>

      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">5. Performance Optimizations</Typography>
        <MemoizedSpreadOperations 
          expensiveProps={{ computation: 100, calculation: 200 }}
          frequentProps={{ 'data-frequent': testState.condition }}
        />
        <LazyPropEvaluation shouldComputeExpensive={testState.shouldComputeExpensive} />
      </section>

      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">6. Advanced Patterns</Typography>
        <HOCSpreadPattern />
        <RenderPropsSpread>
          {(props) => (
            <div>
              <MuiButton {...props}>
                Render Props: Count {props.count}
              </MuiButton>
              <div style={{ margin: '8px 0' }}>
                <AntdButton onClick={props.increment} size="small">+</AntdButton>
                <AntdButton onClick={props.toggleTheme} size="small">Theme</AntdButton>
                <AntdButton onClick={props.toggleActive} size="small">Active</AntdButton>
              </div>
            </div>
          )}
        </RenderPropsSpread>
      </section>

      <section>
        <Typography variant="h5">Controls</Typography>
        <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
          <AntdButton 
            onClick={() => setTestState(prev => ({ ...prev, condition: !prev.condition }))}
            type={testState.condition ? 'primary' : 'default'}
          >
            Toggle Condition
          </AntdButton>
          
          <AntdButton 
            onClick={() => setTestState(prev => ({ 
              ...prev, 
              theme: prev.theme === 'light' ? 'dark' : 'light' 
            }))}
          >
            Theme: {testState.theme}
          </AntdButton>
          
          <AntdButton 
            onClick={() => setTestState(prev => ({ 
              ...prev, 
              size: prev.size === 'small' ? 'medium' : prev.size === 'medium' ? 'large' : 'small' 
            }))}
          >
            Size: {testState.size}
          </AntdButton>
          
          <AntdButton 
            onClick={() => setTestState(prev => ({ 
              ...prev, 
              state: prev.state === 'idle' ? 'loading' : prev.state === 'loading' ? 'success' : prev.state === 'success' ? 'error' : 'idle' 
            }))}
          >
            State: {testState.state}
          </AntdButton>
          
          <AntdButton 
            onClick={() => setTestState(prev => ({ 
              ...prev, 
              shouldComputeExpensive: !prev.shouldComputeExpensive 
            }))}
            type={testState.shouldComputeExpensive ? 'primary' : 'default'}
          >
            Expensive Computation
          </AntdButton>
        </Box>
      </section>
    </div>
  );
};

export default SpreadComputedPropsTests;
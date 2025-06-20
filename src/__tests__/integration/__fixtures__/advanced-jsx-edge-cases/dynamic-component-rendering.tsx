/**
 * Advanced Dynamic Component Rendering Test Cases
 * Tests jsx-migr8's ability to handle complex dynamic component patterns
 * including React.createElement, variable components, and computed component types
 */

import React, { 
  createElement, 
  ComponentType, 
  ReactElement, 
  useMemo, 
  useCallback,
  useState,
  useRef,
  forwardRef,
  ImperativeMethods
} from 'react';
import { Button as MuiButton, TextField, Chip, Avatar, List, ListItem } from '@mui/material';
import { Button as AntdButton, Input, Tag, Avatar as AntdAvatar, Table } from 'antd';
import { styled } from '@emotion/react';

// ======================
// 1. React.createElement patterns
// ======================

// Basic createElement usage
export const CreateElementBasic = () => {
  return createElement(MuiButton, { variant: 'contained', color: 'primary' }, 'Created Element');
};

// Dynamic createElement with computed props
export const CreateElementDynamic = ({ componentType, ...props }: { componentType: 'mui' | 'antd' } & any) => {
  const ComponentMap = {
    mui: MuiButton,
    antd: AntdButton
  };

  const computedProps = {
    ...props,
    'data-created': Date.now(),
    onClick: useCallback((e: any) => {
      console.log('Dynamic click:', componentType, e);
      props.onClick?.(e);
    }, [componentType, props.onClick])
  };

  return createElement(
    ComponentMap[componentType],
    computedProps,
    `Dynamic ${componentType} Element`
  );
};

// createElement with complex children computation
export const CreateElementComplexChildren = ({ items }: { items: string[] }) => {
  const children = items.map((item, index) => 
    createElement(
      'span',
      { key: index, style: { margin: '0 4px' } },
      item
    )
  );

  return createElement(
    MuiButton,
    { 
      variant: 'outlined',
      startIcon: createElement('span', { children: '🚀' })
    },
    ...children
  );
};

// Nested createElement calls
export const CreateElementNested = () => {
  return createElement(
    'div',
    { className: 'container' },
    createElement(
      MuiButton,
      { variant: 'contained' },
      createElement('strong', null, 'Bold Text'),
      createElement('em', null, ' Italic Text')
    ),
    createElement(
      AntdButton,
      { type: 'primary' },
      createElement('span', { style: { textDecoration: 'underline' } }, 'Underlined')
    )
  );
};

// ======================
// 2. Variable Component Patterns
// ======================

// Simple variable component
export const VariableComponentSimple = ({ useAntd }: { useAntd: boolean }) => {
  const ButtonComponent = useAntd ? AntdButton : MuiButton;
  
  return <ButtonComponent>Variable Component</ButtonComponent>;
};

// Complex variable component with prop transformation
export const VariableComponentComplex = ({ 
  provider, 
  variant, 
  ...rest 
}: { 
  provider: 'mui' | 'antd'; 
  variant: string; 
} & any) => {
  const { Component, transformedProps } = useMemo(() => {
    if (provider === 'mui') {
      return {
        Component: MuiButton,
        transformedProps: {
          variant: variant as 'text' | 'outlined' | 'contained',
          color: rest.danger ? 'error' : 'primary',
          ...rest
        }
      };
    } else {
      return {
        Component: AntdButton,
        transformedProps: {
          type: variant === 'contained' ? 'primary' : 'default',
          danger: rest.danger,
          ...rest
        }
      };
    }
  }, [provider, variant, rest]);

  return <Component {...transformedProps}>Complex Variable</Component>;
};

// Variable component with conditional rendering
export const VariableComponentConditional = ({ 
  components,
  activeIndex 
}: { 
  components: Array<{ type: 'mui' | 'antd'; label: string; props?: any }>; 
  activeIndex: number;
}) => {
  return (
    <div>
      {components.map((config, index) => {
        const Component = config.type === 'mui' ? MuiButton : AntdButton;
        const isActive = index === activeIndex;
        
        const props = {
          ...config.props,
          variant: isActive ? 'contained' : 'outlined',
          style: { 
            ...config.props?.style,
            opacity: isActive ? 1 : 0.7,
            transform: isActive ? 'scale(1.05)' : 'scale(1)'
          }
        };

        return (
          <Component key={index} {...props}>
            {config.label}
          </Component>
        );
      })}
    </div>
  );
};

// ======================
// 3. Computed Component Types
// ======================

// Component registry pattern
class ComponentRegistry {
  private static instance: ComponentRegistry;
  private components = new Map<string, ComponentType<any>>();

  static getInstance() {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  register(name: string, component: ComponentType<any>) {
    this.components.set(name, component);
  }

  get(name: string): ComponentType<any> | undefined {
    return this.components.get(name);
  }

  create(name: string, props: any = {}, children?: React.ReactNode): ReactElement | null {
    const Component = this.get(name);
    return Component ? <Component {...props}>{children}</Component> : null;
  }
}

// Initialize registry
const registry = ComponentRegistry.getInstance();
registry.register('MuiButton', MuiButton);
registry.register('AntdButton', AntdButton);
registry.register('TextField', TextField);
registry.register('Input', Input);

export const ComputedComponentRegistry = ({ componentName, ...props }: { componentName: string } & any) => {
  return registry.create(componentName, props, 'Registry Component') || <div>Unknown Component</div>;
};

// Factory pattern with complex logic
export const ComponentFactory = ({ 
  config 
}: { 
  config: {
    library: 'mui' | 'antd';
    type: 'button' | 'input' | 'display';
    variant?: string;
    size?: string;
    interactive?: boolean;
  }
}) => {
  const createComponent = useCallback(() => {
    const { library, type, variant, size, interactive } = config;
    
    // Complex decision tree
    if (library === 'mui') {
      switch (type) {
        case 'button':
          return {
            Component: MuiButton,
            props: {
              variant: variant as 'text' | 'outlined' | 'contained',
              size: size as 'small' | 'medium' | 'large',
              disabled: !interactive
            }
          };
        case 'input':
          return {
            Component: TextField,
            props: {
              variant: variant as 'standard' | 'filled' | 'outlined',
              size: size as 'small' | 'medium',
              disabled: !interactive
            }
          };
        case 'display':
          return {
            Component: Chip,
            props: {
              variant: variant as 'filled' | 'outlined',
              size: size as 'small' | 'medium',
              clickable: interactive
            }
          };
        default:
          return { Component: 'div', props: {} };
      }
    } else {
      switch (type) {
        case 'button':
          return {
            Component: AntdButton,
            props: {
              type: variant === 'contained' ? 'primary' : 'default',
              size: size as 'small' | 'middle' | 'large',
              disabled: !interactive
            }
          };
        case 'input':
          return {
            Component: Input,
            props: {
              size: size as 'small' | 'middle' | 'large',
              disabled: !interactive
            }
          };
        case 'display':
          return {
            Component: Tag,
            props: {
              color: variant === 'filled' ? 'blue' : undefined
            }
          };
        default:
          return { Component: 'div', props: {} };
      }
    }
  }, [config]);

  const { Component, props } = createComponent();
  
  return <Component {...props}>Factory Component</Component>;
};

// ======================
// 4. Meta-programming Patterns
// ======================

// Proxy-based component access
export const ProxyComponentAccess = new Proxy({} as any, {
  get(target, prop: string) {
    // Dynamic component resolution
    const componentMap: Record<string, ComponentType<any>> = {
      MuiButton,
      AntdButton,
      TextField,
      Input,
      Chip,
      Tag
    };

    if (componentMap[prop]) {
      return componentMap[prop];
    }

    // Fallback to creating wrapper components
    return (props: any) => (
      <div data-unknown-component={prop} {...props}>
        Unknown: {prop}
      </div>
    );
  }
});

export const ProxyComponentUsage = () => {
  const Button1 = ProxyComponentAccess.MuiButton;
  const Button2 = ProxyComponentAccess.AntdButton;
  const Unknown = ProxyComponentAccess.NonExistentComponent;

  return (
    <div>
      <Button1 variant="contained">Proxy MUI</Button1>
      <Button2 type="primary">Proxy Antd</Button2>
      <Unknown>Unknown Component</Unknown>
    </div>
  );
};

// Function-based component generation
export const FunctionComponentGenerator = ({ 
  templates 
}: { 
  templates: Array<{
    name: string;
    baseComponent: 'MuiButton' | 'AntdButton';
    wrappers?: string[];
    props?: Record<string, any>;
  }>
}) => {
  const generateComponent = useCallback((template: typeof templates[0]) => {
    const baseComponents = {
      MuiButton,
      AntdButton
    };

    const BaseComponent = baseComponents[template.baseComponent];
    let component = <BaseComponent {...template.props}>{template.name}</BaseComponent>;

    // Apply wrappers
    if (template.wrappers) {
      template.wrappers.forEach(wrapper => {
        switch (wrapper) {
          case 'styled':
            const StyledWrapper = styled.div`
              padding: 8px;
              border: 1px solid #ccc;
            `;
            component = <StyledWrapper>{component}</StyledWrapper>;
            break;
          case 'tooltip':
            component = <div title={`Tooltip for ${template.name}`}>{component}</div>;
            break;
          case 'loading':
            component = (
              <div style={{ position: 'relative' }}>
                {component}
                <div style={{ position: 'absolute', top: 0, left: 0 }}>⏳</div>
              </div>
            );
            break;
        }
      });
    }

    return component;
  }, []);

  return (
    <div>
      {templates.map((template, index) => (
        <div key={index}>
          {generateComponent(template)}
        </div>
      ))}
    </div>
  );
};

// ======================
// 5. Advanced Composition Patterns
// ======================

// Higher-order component with dynamic injection
export function withDynamicInjection<P extends object>(
  BaseComponent: ComponentType<P>,
  injectionConfig: {
    injectProps?: (props: P) => Partial<P>;
    wrapWith?: ComponentType<any>;
    transformChildren?: (children: React.ReactNode) => React.ReactNode;
  }
) {
  return forwardRef<any, P>((props, ref) => {
    const injectedProps = injectionConfig.injectProps?.(props) || {};
    const finalProps = { ...props, ...injectedProps, ref };
    
    let element = <BaseComponent {...finalProps} />;
    
    if (injectionConfig.transformChildren && finalProps.children) {
      element = React.cloneElement(element, {
        children: injectionConfig.transformChildren(finalProps.children)
      });
    }
    
    if (injectionConfig.wrapWith) {
      const Wrapper = injectionConfig.wrapWith;
      element = <Wrapper>{element}</Wrapper>;
    }
    
    return element;
  });
}

// Usage of HOC with dynamic injection
const EnhancedMuiButton = withDynamicInjection(MuiButton, {
  injectProps: (props) => ({
    'data-enhanced': true,
    onClick: (e: any) => {
      console.log('Enhanced click');
      props.onClick?.(e);
    }
  }),
  wrapWith: ({ children }) => <div className="enhanced-wrapper">{children}</div>,
  transformChildren: (children) => <><span>🚀 </span>{children}</>
});

export const HOCUsageExample = () => {
  return <EnhancedMuiButton variant="contained">Enhanced Button</EnhancedMuiButton>;
};

// Compound component pattern with dynamic children
export const CompoundComponentPattern = ({ 
  items 
}: { 
  items: Array<{ type: 'header' | 'item' | 'footer'; content: string; props?: any }> 
}) => {
  const renderItem = useCallback((item: typeof items[0], index: number) => {
    const commonProps = { key: index, ...item.props };
    
    switch (item.type) {
      case 'header':
        return createElement('h3', commonProps, item.content);
      case 'item':
        const ItemComponent = index % 2 === 0 ? MuiButton : AntdButton;
        return createElement(ItemComponent, { ...commonProps, variant: 'outlined' }, item.content);
      case 'footer':
        return createElement('footer', commonProps, item.content);
      default:
        return createElement('div', commonProps, item.content);
    }
  }, []);

  return <div>{items.map(renderItem)}</div>;
};

// ======================
// 6. Performance-Critical Dynamic Rendering
// ======================

// Memoized component factory
export const MemoizedComponentFactory = React.memo(({ 
  componentSpecs 
}: { 
  componentSpecs: Array<{
    id: string;
    type: 'mui' | 'antd';
    component: 'button' | 'input';
    props: Record<string, any>;
  }>
}) => {
  const createComponent = useMemo(() => {
    return componentSpecs.map(spec => {
      const componentMap = {
        mui: { button: MuiButton, input: TextField },
        antd: { button: AntdButton, input: Input }
      };
      
      const Component = componentMap[spec.type][spec.component];
      
      return {
        id: spec.id,
        element: <Component key={spec.id} {...spec.props}>{spec.id}</Component>
      };
    });
  }, [componentSpecs]);

  return <>{createComponent.map(item => item.element)}</>;
});

// Virtualized dynamic component rendering
export const VirtualizedDynamicComponents = ({ 
  componentCount = 1000 
}: { 
  componentCount?: number 
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  
  const components = useMemo(() => {
    return Array.from({ length: componentCount }, (_, i) => ({
      id: i,
      type: i % 2 === 0 ? 'mui' : 'antd' as const,
      component: i % 3 === 0 ? 'button' : 'input' as const,
      props: {
        variant: i % 4 === 0 ? 'contained' : 'outlined',
        'data-index': i
      }
    }));
  }, [componentCount]);

  const visibleComponents = useMemo(() => {
    return components.slice(visibleRange.start, visibleRange.end).map(spec => {
      const componentMap = {
        mui: { button: MuiButton, input: TextField },
        antd: { button: AntdButton, input: Input }
      };
      
      const Component = componentMap[spec.type][spec.component];
      return <Component key={spec.id} {...spec.props}>Item {spec.id}</Component>;
    });
  }, [components, visibleRange]);

  return (
    <div>
      <div>
        Showing {visibleRange.start} - {visibleRange.end} of {componentCount}
      </div>
      <div>
        <button onClick={() => setVisibleRange(prev => ({ 
          start: Math.max(0, prev.start - 50), 
          end: Math.max(50, prev.end - 50) 
        }))}>
          Previous
        </button>
        <button onClick={() => setVisibleRange(prev => ({ 
          start: Math.min(componentCount - 50, prev.start + 50), 
          end: Math.min(componentCount, prev.end + 50) 
        }))}>
          Next
        </button>
      </div>
      <div>{visibleComponents}</div>
    </div>
  );
};

// ======================
// 7. Error Handling in Dynamic Components
// ======================

// Safe dynamic component with error boundary
export const SafeDynamicComponent = ({ 
  componentName, 
  fallback, 
  ...props 
}: { 
  componentName: string; 
  fallback?: React.ReactNode; 
} & any) => {
  const [error, setError] = useState<Error | null>(null);
  
  const component = useMemo(() => {
    try {
      const Component = registry.get(componentName);
      if (!Component) {
        throw new Error(`Component "${componentName}" not found`);
      }
      return <Component {...props}>Safe Dynamic</Component>;
    } catch (err) {
      setError(err as Error);
      return fallback || <div>Failed to render component: {componentName}</div>;
    }
  }, [componentName, props, fallback]);

  if (error) {
    console.error('SafeDynamicComponent error:', error);
  }

  return component;
};

// Main test component combining all patterns
export const AdvancedDynamicComponentTests = () => {
  const [dynamicConfig, setDynamicConfig] = useState({
    useAntd: false,
    provider: 'mui' as 'mui' | 'antd',
    variant: 'contained'
  });

  return (
    <div>
      <h2>Advanced Dynamic Component Rendering Tests</h2>
      
      <section>
        <h3>1. React.createElement</h3>
        <CreateElementBasic />
        <CreateElementDynamic componentType={dynamicConfig.provider} />
        <CreateElementComplexChildren items={['Item 1', 'Item 2', 'Item 3']} />
        <CreateElementNested />
      </section>

      <section>
        <h3>2. Variable Components</h3>
        <VariableComponentSimple useAntd={dynamicConfig.useAntd} />
        <VariableComponentComplex 
          provider={dynamicConfig.provider} 
          variant={dynamicConfig.variant}
          danger={false}
        />
      </section>

      <section>
        <h3>3. Computed Components</h3>
        <ComputedComponentRegistry componentName="MuiButton" />
        <ComponentFactory config={{
          library: dynamicConfig.provider,
          type: 'button',
          variant: dynamicConfig.variant,
          interactive: true
        }} />
      </section>

      <section>
        <h3>4. Meta-programming</h3>
        <ProxyComponentUsage />
        <HOCUsageExample />
      </section>

      <section>
        <h3>5. Performance Critical</h3>
        <VirtualizedDynamicComponents componentCount={100} />
      </section>

      <section>
        <h3>6. Error Handling</h3>
        <SafeDynamicComponent componentName="MuiButton" />
        <SafeDynamicComponent componentName="NonExistent" fallback={<div>Custom Fallback</div>} />
      </section>

      <div>
        <button onClick={() => setDynamicConfig(prev => ({ ...prev, useAntd: !prev.useAntd }))}>
          Toggle Library
        </button>
        <button onClick={() => setDynamicConfig(prev => ({ 
          ...prev, 
          provider: prev.provider === 'mui' ? 'antd' : 'mui' 
        }))}>
          Switch Provider
        </button>
      </div>
    </div>
  );
};

export default AdvancedDynamicComponentTests;
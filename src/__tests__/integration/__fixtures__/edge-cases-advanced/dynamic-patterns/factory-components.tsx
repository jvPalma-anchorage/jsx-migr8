/**
 * Dynamic component patterns: Factories, computed names, and runtime generation
 * Tests handling of dynamic component creation and usage
 */

import React, { ComponentType, ReactElement, createElement } from 'react';
import * as MUI from '@mui/material';
import * as Antd from 'antd';
import { styled } from '@emotion/react';
import dynamic from 'next/dynamic';

// Component factory with dynamic imports
export function createDynamicComponent(library: 'mui' | 'antd', component: string) {
  const componentMap = {
    mui: MUI,
    antd: Antd
  };

  const lib = componentMap[library];
  return lib[component as keyof typeof lib] as ComponentType<any>;
}

// Higher-order component factory
export function withDynamicProps<P extends object>(
  Component: ComponentType<P>,
  propGenerator: () => Partial<P>
) {
  return (props: P) => {
    const dynamicProps = propGenerator();
    return <Component {...props} {...dynamicProps} />;
  };
}

// Runtime JSX generation with template literals
export const TemplateJSXFactory = ({ components }: { components: string[] }) => {
  return (
    <>
      {components.map(comp => {
        const Component = createDynamicComponent('mui', comp);
        const jsxString = `<${comp} variant="contained">Dynamic ${comp}</${comp}>`;
        
        // Using Function constructor (dangerous pattern)
        const createJSX = new Function('React', 'Component', 
          `return React.createElement(Component, {variant: 'contained'}, 'Dynamic ${comp}')`
        );
        
        return (
          <div key={comp}>
            <Component>Regular: {comp}</Component>
            {createJSX(React, Component)}
          </div>
        );
      })}
    </>
  );
};

// Component registry pattern
class ComponentRegistry {
  private components = new Map<string, ComponentType<any>>();

  register(name: string, component: ComponentType<any>) {
    this.components.set(name, component);
  }

  create(name: string, props?: any): ReactElement | null {
    const Component = this.components.get(name);
    return Component ? <Component {...props} /> : null;
  }

  createMany(configs: Array<{ name: string; props?: any }>) {
    return configs.map(({ name, props }, index) => {
      const Component = this.components.get(name);
      return Component ? <Component key={index} {...props} /> : null;
    });
  }
}

export const registry = new ComponentRegistry();
registry.register('MuiButton', MUI.Button);
registry.register('AntButton', Antd.Button);

// Proxy-based component creation
export const ProxyComponentFactory = new Proxy({}, {
  get(target, prop: string) {
    // Try to find component in MUI first, then Antd
    if (prop in MUI) {
      return MUI[prop as keyof typeof MUI];
    }
    if (prop in Antd) {
      return Antd[prop as keyof typeof Antd];
    }
    
    // Fallback to creating a wrapper
    return (props: any) => <div {...props}>{`Unknown component: ${prop}`}</div>;
  }
}) as any;

// Dynamic styled components
export function createStyledComponent(baseComponent: ComponentType<any>, styles: string) {
  return styled(baseComponent)`${styles}`;
}

// Meta-programming component generator
export const MetaComponent = ({ 
  componentType, 
  props, 
  children,
  wrappers = []
}: {
  componentType: string;
  props: Record<string, any>;
  children?: any;
  wrappers?: Array<{ component: string; props?: any }>;
}) => {
  let Component = createDynamicComponent('mui', componentType);
  let element = <Component {...props}>{children}</Component>;

  // Apply wrappers dynamically
  for (const wrapper of wrappers) {
    const Wrapper = createDynamicComponent('mui', wrapper.component);
    element = <Wrapper {...(wrapper.props || {})}>{element}</Wrapper>;
  }

  return element;
};

// Async component factory with error boundaries
export const AsyncComponentFactory = dynamic(
  () => import('./async-component-generator').then(mod => {
    // Generate component based on runtime conditions
    const config = { type: 'Button', library: 'mui' };
    return mod.generateComponent(config);
  }),
  {
    loading: () => <div>Loading component...</div>,
    ssr: false
  }
);

// Component composition with computed properties
export const ComputedPropsFactory = () => {
  const computeProps = (index: number) => ({
    [`data-index-${index}`]: true,
    [`aria-label-${index % 2 === 0 ? 'even' : 'odd'}`]: `Item ${index}`,
    ...Object.fromEntries(
      Array.from({ length: 3 }, (_, i) => [`prop${i}`, `value${i}-${index}`])
    )
  });

  return (
    <div>
      {Array.from({ length: 5 }, (_, i) => {
        const Component = i % 2 === 0 ? MUI.Button : Antd.Button;
        const props = computeProps(i);
        
        return <Component key={i} {...props}>Computed {i}</Component>;
      })}
    </div>
  );
};

// Self-modifying component
export const SelfModifyingComponent = () => {
  const [ComponentType, setComponentType] = React.useState<ComponentType<any>>(MUI.Button);
  
  const modifyComponent = () => {
    setComponentType(() => {
      // Create new component on the fly
      return (props: any) => (
        <div style={{ border: '1px solid red' }}>
          <MUI.Button {...props} />
          <Antd.Button {...props} />
        </div>
      );
    });
  };

  return (
    <div>
      <ComponentType onClick={modifyComponent}>
        Click to modify component
      </ComponentType>
    </div>
  );
};

// Recursive component generator
export function generateRecursiveComponent(depth: number): ComponentType<any> {
  if (depth === 0) {
    return () => <MUI.Button>Leaf</MUI.Button>;
  }

  const ChildComponent = generateRecursiveComponent(depth - 1);
  
  return () => (
    <MUI.Paper>
      <MUI.Typography>Level {depth}</MUI.Typography>
      <ChildComponent />
      <ChildComponent />
    </MUI.Paper>
  );
}

// Component with variable JSX depth
export const VariableDepthComponent = ({ depth = 5 }: { depth?: number }) => {
  const createNested = (level: number): ReactElement => {
    if (level === 0) {
      return <MUI.Button>Bottom</MUI.Button>;
    }

    const Component = level % 2 === 0 ? MUI.Box : Antd.Card;
    return (
      <Component>
        {createNested(level - 1)}
      </Component>
    );
  };

  return createNested(depth);
};

// Mixin-style component creation
export const mixinComponents = (...components: ComponentType<any>[]) => {
  return (props: any) => (
    <>
      {components.map((Component, index) => (
        <Component key={index} {...props} />
      ))}
    </>
  );
};

export const MixedButton = mixinComponents(MUI.Button, Antd.Button);
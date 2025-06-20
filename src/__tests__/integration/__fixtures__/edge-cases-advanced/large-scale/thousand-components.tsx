/**
 * Large-scale edge case: File with 1000+ components and complex import graph
 * Tests memory efficiency, parsing performance, and transformation accuracy
 */

// Complex import graph with multiple levels of dependencies
import React, { useState, useEffect, useMemo, useCallback, useRef, memo, lazy, Suspense } from 'react';
import { Button as MuiButton, TextField, Dialog, Grid, Paper, Typography } from '@mui/material';
import { Button as AntButton, Input, Modal, Row, Col, Card } from 'antd';
import { styled } from '@emotion/react';
import * as SC from 'styled-components';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import loadable from '@loadable/component';
import _ from 'lodash';

// Re-exports creating circular-like patterns
export { MuiButton, AntButton };
export * from '@mui/material/styles';

// Dynamic imports
const DynamicComponent = lazy(() => import('./dynamic-module'));
const AsyncComponent = loadable(() => import('./async-module'));

// Component factory pattern
function createComponent(index: number) {
  const ComponentName = `GeneratedComponent${index}`;
  
  return function Component(props: any) {
    return (
      <div>
        <MuiButton variant="contained" color="primary" {...props}>
          {ComponentName}
        </MuiButton>
        <AntButton type="primary" danger={index % 2 === 0}>
          Alternative {index}
        </AntButton>
      </div>
    );
  };
}

// Generate 1000 components programmatically
const components: React.FC<any>[] = [];
for (let i = 0; i < 1000; i++) {
  components.push(createComponent(i));
}

// Export all generated components
export const GeneratedComponents = components;

// Complex nested component with deep prop spreading
export const DeepNestedComponent: React.FC<any> = memo(({
  level1 = {},
  level2 = {},
  level3 = {},
  ...restProps
}) => {
  const {
    prop1,
    prop2,
    nested: {
      deep: {
        value = 'default',
        ...deepRest
      } = {},
      ...nestedRest
    } = {},
    ...level1Rest
  } = level1;

  return (
    <div {...restProps}>
      <MuiButton
        {...level1Rest}
        {...level2}
        {...level3}
        {...deepRest}
        onClick={(e) => {
          console.log({ prop1, prop2, value });
        }}
      >
        Deep Nested
      </MuiButton>
    </div>
  );
});

// Template literal JSX generation
export const TemplateLiteralComponents = () => {
  const componentType = 'Button';
  const DynamicTag = componentType === 'Button' ? MuiButton : AntButton;
  
  return (
    <>
      {[1, 2, 3, 4, 5].map(i => {
        const Component = components[i];
        const jsxString = `<${componentType} key="${i}" variant="contained">Item ${i}</${componentType}>`;
        
        return (
          <React.Fragment key={i}>
            <DynamicTag variant={i % 2 === 0 ? 'contained' : 'outlined'}>
              Dynamic {i}
            </DynamicTag>
            <Component customProp={`value-${i}`} />
            {/* Dangerous pattern: eval-like JSX generation */}
            <div dangerouslySetInnerHTML={{ __html: jsxString }} />
          </React.Fragment>
        );
      })}
    </>
  );
};

// Computed component names with dynamic properties
export const ComputedComponents = () => {
  const components = {
    Primary: MuiButton,
    Secondary: AntButton,
    Custom: styled(MuiButton)`
      background: linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%);
    `
  };

  const componentNames = Object.keys(components) as Array<keyof typeof components>;

  return (
    <>
      {componentNames.map(name => {
        const Component = components[name];
        const props = {
          [`data-${name.toLowerCase()}`]: true,
          [name === 'Primary' ? 'variant' : 'type']: 'primary'
        };

        return <Component key={name} {...props}>{name}</Component>;
      })}
    </>
  );
};

// Internationalization with dynamic content
export const I18nDynamicContent = () => {
  const intl = useIntl();
  const [locale, setLocale] = useState('en');

  const messages = {
    en: { button: 'Click me' },
    es: { button: 'Haz clic' },
    fr: { button: 'Cliquez' }
  };

  const ButtonComponent = locale === 'en' ? MuiButton : AntButton;

  return (
    <div>
      <ButtonComponent
        onClick={() => setLocale(prev => prev === 'en' ? 'es' : 'en')}
      >
        <FormattedMessage
          id="dynamic.button"
          defaultMessage={messages[locale as keyof typeof messages]?.button}
          values={{
            count: Math.floor(Math.random() * 100),
            action: intl.formatMessage({ id: 'action.click' })
          }}
        />
      </ButtonComponent>
    </div>
  );
};

// Code splitting with dynamic imports and error boundaries
export const CodeSplitComponents = () => {
  const [components, setComponents] = useState<any[]>([]);

  useEffect(() => {
    // Dynamic import based on runtime conditions
    const loadComponents = async () => {
      const modules = await Promise.all([
        import('@mui/material/Accordion'),
        import('antd/es/collapse'),
        import('./heavy-component-1'),
        import('./heavy-component-2'),
        import('./heavy-component-3')
      ]);

      setComponents(modules.map(m => m.default));
    };

    loadComponents();
  }, []);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {components.map((Component, index) => (
        <ErrorBoundary key={index}>
          <Component />
        </ErrorBoundary>
      ))}
    </Suspense>
  );
};

// Mixed styled-components and emotion
export const MixedStylingPatterns = () => {
  // Styled-components
  const SCButton = SC.default.button`
    background: ${props => props.theme?.primary || 'blue'};
    color: white;
    ${props => props.disabled && SC.css`
      opacity: 0.5;
      cursor: not-allowed;
    `}
  `;

  // Emotion
  const EmotionButton = styled.button`
    background: ${props => props.theme?.primary || 'red'};
    color: white;
    ${props => props.disabled && `
      opacity: 0.5;
      cursor: not-allowed;
    `}
  `;

  // Template literal with component interpolation
  const MixedButton = SC.default(MuiButton)`
    ${EmotionButton} {
      margin-left: 10px;
    }
  `;

  return (
    <div>
      <SCButton>Styled Components</SCButton>
      <EmotionButton>Emotion</EmotionButton>
      <MixedButton>Mixed Styling</MixedButton>
    </div>
  );
};

// Monorepo package imports with aliases
import { SharedButton } from '@company/ui-kit/buttons';
import { utils } from '@company/shared/utils';
import UIComponents from '@company/legacy-ui';

export const MonorepoComponents = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div>
      <SharedButton onClick={() => navigate(`/item/${id}`)}>
        Shared UI Kit
      </SharedButton>
      <UIComponents.Button variant="legacy">
        Legacy Component
      </UIComponents.Button>
    </div>
  );
};

// Performance stress test component
export const PerformanceStressTest = () => {
  // Create deeply nested JSX
  let element = <div>Base</div>;
  
  for (let i = 0; i < 100; i++) {
    const Component = i % 2 === 0 ? MuiButton : AntButton;
    element = (
      <Component key={i} {...{ [`prop${i}`]: i }}>
        {element}
        <span>{`Level ${i}`}</span>
      </Component>
    );
  }

  return element;
};

// Error boundary for catching render errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Component failed to render</div>;
    }
    return this.props.children;
  }
}

// Main app component using all patterns
export default function LargeScaleApp() {
  return (
    <Routes>
      <Route path="/" element={
        <div>
          <h1>Large Scale Test: 1000+ Components</h1>
          {components.slice(0, 10).map((Component, i) => (
            <Component key={i} testProp={`test-${i}`} />
          ))}
          <DeepNestedComponent
            level1={{ prop1: 'value1', nested: { deep: { value: 'deep' } } }}
            level2={{ spread: true }}
            level3={{ more: 'props' }}
          />
          <TemplateLiteralComponents />
          <ComputedComponents />
          <I18nDynamicContent />
          <CodeSplitComponents />
          <MixedStylingPatterns />
          <MonorepoComponents />
          <PerformanceStressTest />
        </div>
      } />
    </Routes>
  );
}
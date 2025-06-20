/**
 * TypeScript configuration variations
 * Tests handling of different TS compiler settings and module resolutions
 */

// Testing different module resolution strategies
import { Button } from '@mui/material'; // node_modules resolution
import { LocalButton } from './components/Button'; // relative import
import { AliasButton } from '@/components/Button'; // path alias
import { MonorepoButton } from '@company/ui/Button'; // monorepo package
import SharedButton from 'shared/Button'; // baseUrl resolution
import * as UIKit from 'uikit'; // namespace import

// Testing different JSX factories
/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from 'preact';

// Declare module augmentation
declare module '@mui/material' {
  interface ButtonProps {
    customProp?: string;
  }
}

// Global augmentation
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'custom-element': any;
    }
  }
}

// Different TypeScript syntaxes
export const TypeScriptVariations = () => {
  // Type assertions
  const button1 = <Button /> as JSX.Element;
  const button2 = (<Button />) as any;
  const button3 = <Button /> satisfies JSX.Element; // TS 4.9+

  // Non-null assertion
  const ref = useRef<HTMLButtonElement>(null);
  const element = ref.current!;

  // Type predicates with JSX
  const isButton = (el: any): el is typeof Button => {
    return el === Button;
  };

  // Const assertions
  const props = {
    variant: 'contained',
    color: 'primary'
  } as const;

  return (
    <>
      <Button {...props} customProp="test">
        Augmented Props
      </Button>
      <custom-element>Custom Element</custom-element>
      {button1}
      {button2}
      {button3}
    </>
  );
};

// Namespace imports and exports
namespace Components {
  export const NamespacedButton = () => <Button>Namespaced</Button>;
}

// Enum-based component selection
enum ComponentType {
  MUI = 'MUI',
  ANT = 'ANT',
  CUSTOM = 'CUSTOM'
}

const componentMap = {
  [ComponentType.MUI]: Button,
  [ComponentType.ANT]: require('antd').Button,
  [ComponentType.CUSTOM]: LocalButton
} as const;

// Triple-slash directives
/// <reference types="react" />
/// <reference path="./types.d.ts" />
/// <amd-module name="EdgeCaseModule" />

// Abstract class components (legacy)
abstract class AbstractComponent extends React.Component {
  abstract render(): JSX.Element;
}

class ConcreteComponent extends AbstractComponent {
  render() {
    return <Button>Concrete</Button>;
  }
}

// Decorators (if enabled)
function withLogging(target: any) {
  return target;
}

@withLogging
class DecoratedComponent extends React.Component {
  render() {
    return <Button>Decorated</Button>;
  }
}

// Type-only imports/exports
import type { ButtonProps } from '@mui/material';
export type { ButtonProps };

// Ambient module declarations
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// Testing different JSX modes
export const JSXModes = {
  // React.createElement mode
  CreateElement: () => React.createElement(Button, null, 'createElement'),
  
  // JSX preserve mode (would need different tsconfig)
  Preserve: () => <Button>Preserve</Button>,
  
  // Custom JSX factory
  Custom: () => h(Button, null, 'Preact')
};

// Complex generic components
export const GenericComponent = <T extends { id: string }>({
  items,
  renderItem
}: {
  items: T[];
  renderItem: (item: T) => JSX.Element;
}) => {
  return (
    <div>
      {items.map(item => (
        <Button key={item.id}>
          {renderItem(item)}
        </Button>
      ))}
    </div>
  );
};

// Mapped types with components
type ComponentMap = {
  [K in keyof typeof componentMap]: React.ComponentType;
};

// Conditional types
type ExtractButtonProps<T> = T extends React.ComponentType<infer P> ? P : never;
type MUIButtonProps = ExtractButtonProps<typeof Button>;

// Template literal types with components
type ComponentVariant = `${ComponentType}-${'primary' | 'secondary'}`;

// Module declaration with re-exports
declare module 'custom-ui' {
  export * from '@mui/material';
  export { Button as CustomButton } from '@mui/material';
}
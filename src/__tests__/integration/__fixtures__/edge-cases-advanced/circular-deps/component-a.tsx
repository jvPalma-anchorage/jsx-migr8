/**
 * Circular dependency test - Component A
 * Tests handling of circular import dependencies
 */

import React from 'react';
import { Button } from '@mui/material';
import { ComponentB } from './component-b';
import { ComponentC } from './component-c';

export const ComponentA: React.FC<{ depth?: number }> = ({ depth = 0 }) => {
  if (depth > 5) {
    return <Button>Max depth reached</Button>;
  }

  return (
    <div>
      <Button>Component A (depth: {depth})</Button>
      <ComponentB depth={depth + 1} />
      <ComponentC depth={depth + 1} />
    </div>
  );
};

// Circular type dependency
export interface AProps {
  b?: BProps;
  c?: CProps;
}

import type { BProps } from './component-b';
import type { CProps } from './component-c';

// Re-export creating more circular patterns
export { ComponentB, ComponentC } from './component-b';

// Default export creating additional complexity
export default ComponentA;
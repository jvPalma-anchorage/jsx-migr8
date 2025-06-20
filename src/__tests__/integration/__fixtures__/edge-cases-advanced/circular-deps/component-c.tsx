/**
 * Circular dependency test - Component C
 * Tests handling of circular import dependencies
 */

import React from 'react';
import { Button } from '@mui/material';
import { ComponentA, ComponentB } from './component-a'; // Importing both
import type { BProps } from './component-b';

export interface CProps {
  depth?: number;
  b?: BProps;
}

export const ComponentC: React.FC<CProps> = ({ depth = 0 }) => {
  if (depth > 2) {
    return <Button variant="outlined">C - Max depth</Button>;
  }

  return (
    <div>
      <Button variant="outlined">Component C (depth: {depth})</Button>
      <ComponentB depth={depth + 1} />
    </div>
  );
};

// More circular complexity
export * from './component-a';
export { ComponentB as AliasB } from './component-b';
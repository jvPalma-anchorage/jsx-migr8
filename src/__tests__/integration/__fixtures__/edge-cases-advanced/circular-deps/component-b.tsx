/**
 * Circular dependency test - Component B
 * Tests handling of circular import dependencies
 */

import React from 'react';
import { Button } from '@mui/material';
import ComponentA from './component-a'; // Default import
import type { AProps } from './component-a';

export interface BProps {
  depth?: number;
  a?: AProps;
}

export const ComponentB: React.FC<BProps> = ({ depth = 0 }) => {
  if (depth > 3) {
    return <Button color="secondary">B - Max depth</Button>;
  }

  return (
    <div>
      <Button color="secondary">Component B (depth: {depth})</Button>
      <ComponentA depth={depth + 1} />
    </div>
  );
};

// Export ComponentC from here to create more complex circular pattern
export { ComponentC } from './component-c';
/**
 * Monorepo workspace A component
 * Tests complex package dependencies in monorepo setup
 */

import React from 'react';
import { Button } from '@mui/material';
import { SharedButton, SharedDialog } from '@company/shared-ui';
import { WorkspaceBComponent } from '@company/workspace-b';
import { utils } from '@company/shared-utils';

// Import from parent workspace
import { ParentComponent } from '../../../shared-ui/components/parent';

// Path alias imports
import { LocalComponent } from '@/components/local';
import { UtilityFunction } from '~/utils/helper';

// Barrel export import
import * as SharedComponents from '@company/shared-ui';

export const WorkspaceAComponent: React.FC = () => {
  const handleClick = utils.debounce(() => {
    console.log('Clicked from workspace A');
  }, 300);

  return (
    <div>
      <Button onClick={handleClick}>
        MUI Button in Workspace A
      </Button>
      
      <SharedButton variant="workspace-a">
        Shared Button
      </SharedButton>
      
      <WorkspaceBComponent />
      
      <SharedDialog
        open={true}
        title="Workspace A Dialog"
      >
        Cross-workspace communication
      </SharedDialog>
      
      <ParentComponent>
        Parent from shared UI
      </ParentComponent>
      
      <LocalComponent />
      
      {/* Using barrel exports */}
      <SharedComponents.Header />
      <SharedComponents.Footer />
    </div>
  );
};

// Complex re-export patterns
export { SharedButton as AliasedSharedButton } from '@company/shared-ui';
export type { SharedButtonProps } from '@company/shared-ui';

// Default export with workspace dependency
export default WorkspaceAComponent;
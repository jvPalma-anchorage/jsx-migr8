import React from 'react';
import { Button, Text, Card } from '@old-ui/components';

export const TestOldUIComponents: React.FC = () => {
  return (
    <div>
      <h2>Old UI Components for Testing</h2>
      
      <Button variant="primary" size="large">
        Primary Button
      </Button>
      
      <Button variant="secondary" disabled>
        Secondary Button
      </Button>
      
      <Text size="large" weight="bold">
        Large Bold Text
      </Text>
      
      <Text size="medium">
        Medium Text
      </Text>
      
      <Text size="small">
        Small Text
      </Text>
      
      <Card elevated>
        <Text>This is inside an elevated card</Text>
      </Card>
      
      <Card>
        <Text>This is inside a regular card</Text>
      </Card>
    </div>
  );
};
import React from 'react';
import { Button, Text, Card } from '@old-ui/components';

const TestComponent: React.FC = () => {
  return (
    <div>
      <Card elevated className="main-card">
        <Text size="large" weight="bold">
          Welcome to Our App
        </Text>
        <Text size="medium">
          This is a test component to demonstrate migration.
        </Text>
        <Button variant="primary" onClick={() => console.log('Primary clicked')}>
          Primary Action
        </Button>
        <Button variant="secondary" onClick={() => console.log('Secondary clicked')}>
          Secondary Action
        </Button>
      </Card>
      
      <Card>
        <Text size="small">
          Another card without elevation
        </Text>
      </Card>
    </div>
  );
};

export default TestComponent;
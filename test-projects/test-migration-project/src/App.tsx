import React from 'react';
import { Button, Text, Card } from '@old-ui/components';

function App() {
  return (
    <div className="App">
      <h1>Test Migration Project</h1>
      
      <div className="button-examples">
        <Button variant="primary" size="large">
          Primary Button
        </Button>
        
        <Button variant="secondary" disabled>
          Secondary Button
        </Button>
        
        <Button variant="primary">
          Regular Primary
        </Button>
      </div>
      
      <div className="text-examples">
        <Text size="large" weight="bold">
          Large Bold Text
        </Text>
        
        <Text size="medium">
          Medium Text
        </Text>
        
        <Text size="small">
          Small Text
        </Text>
        
        <Text size="large">
          Large Regular Text
        </Text>
      </div>
      
      <div className="card-examples">
        <Card elevated>
          <Text size="medium">This is inside an elevated card</Text>
          <Button variant="primary">Card Button</Button>
        </Card>
        
        <Card>
          <Text size="small">This is inside a regular card</Text>
          <Button variant="secondary">Another Button</Button>
        </Card>
        
        <Card elevated>
          <Text size="large" weight="bold">Another elevated card</Text>
        </Card>
      </div>
    </div>
  );
}

export default App;
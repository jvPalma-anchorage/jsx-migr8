import React from 'react';
import { Button, Text, Card, Input, Select } from '@ui-library/components';

// Large component with many instances for performance testing
const LargeComponent = () => {
  return (
    <div>
      {/* Generate 100+ component instances for performance testing */}
      {Array.from({ length: 50 }, (_, i) => (
        <Card key={i} padding="medium" border="subtle">
          <Text size="large" weight="bold">
            Item {i + 1}
          </Text>
          <Text size="medium" color="secondary">
            Description for item {i + 1}
          </Text>
          
          <div className="actions">
            <Button variant="primary" size="small">
              Primary Action {i + 1}
            </Button>
            <Button variant="secondary" size="small">
              Secondary Action {i + 1}
            </Button>
            <Button variant="outline" size="small">
              Outline Action {i + 1}
            </Button>
          </div>
          
          <div className="form-fields">
            <Input 
              placeholder={`Input ${i + 1}`}
              size="medium"
              variant="outlined"
            />
            <Select 
              placeholder={`Select ${i + 1}`}
              size="medium"
              variant="outlined"
              options={[
                { value: '1', label: 'Option 1' },
                { value: '2', label: 'Option 2' },
                { value: '3', label: 'Option 3' }
              ]}
            />
          </div>
          
          {/* Nested components */}
          <Card padding="small" border="none">
            <Text size="small" color="muted">
              Nested card {i + 1}
            </Text>
            <Button variant="ghost" size="small">
              Nested Button {i + 1}
            </Button>
          </Card>
        </Card>
      ))}
    </div>
  );
};

export default LargeComponent;
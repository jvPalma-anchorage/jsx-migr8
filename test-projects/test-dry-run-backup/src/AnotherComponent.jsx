import React from 'react';
import { Button } from '@old-ui/components';
import { Text } from '@old-ui/components';

function AnotherComponent() {
  const handleClick = () => {
    console.log('Clicked!');
  };

  return (
    <>
      <Text size="large" weight="bold">
        Header Text
      </Text>
      <Text size="medium" color="gray">
        Body text with color
      </Text>
      <Button 
        variant="primary" 
        disabled={false}
        onClick={handleClick}
      >
        Click Me
      </Button>
      <Button variant="tertiary">
        Tertiary Button (no rule for this)
      </Button>
    </>
  );
}

export default AnotherComponent;
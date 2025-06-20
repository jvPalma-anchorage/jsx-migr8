import React from 'react';
import { Button, Text } from '@ui-library/components';

// This file contains various edge cases and potentially problematic JSX patterns

const MalformedJSX = () => {
  // Self-closing component with props
  const selfClosing = <Button variant="primary" />;
  
  // Component with spread props
  const spreadProps = { variant: 'secondary', size: 'large' };
  const withSpread = <Button {...spreadProps} onClick={() => {}} />;
  
  // Nested components with complex expressions
  const complexNesting = (
    <div>
      <Text size={`${Math.random() > 0.5 ? 'large' : 'small'}`}>
        {Math.random() > 0.5 ? (
          <Button variant="primary">
            Dynamic {new Date().getFullYear()}
          </Button>
        ) : (
          <Text size="medium">No button</Text>
        )}
      </Text>
    </div>
  );
  
  // Component with function as children
  const functionAsChildren = (
    <Text size="large">
      {(props) => <Button {...props} variant="outline" />}
    </Text>
  );
  
  // Component with conditional rendering
  const conditionalProps = (
    <Button 
      variant={Math.random() > 0.5 ? 'primary' : 'secondary'}
      size={undefined}
      {...(Math.random() > 0.5 && { disabled: true })}
    >
      Conditional
    </Button>
  );
  
  // Component with template literals in props
  const templateLiterals = (
    <Text 
      size={`large`}
      className={`text-${Math.random() > 0.5 ? 'primary' : 'secondary'}`}
    >
      Template literals
    </Text>
  );
  
  // Component with no children (self-closing vs explicit)
  const noChildren1 = <Button variant="primary" />;
  const noChildren2 = <Button variant="primary"></Button>;
  
  // Component with complex object props
  const complexObject = {
    style: { color: 'red' },
    data: { test: true }
  };
  
  const objectProps = (
    <Button 
      variant="primary"
      style={complexObject.style}
      data-testid={complexObject.data.test ? 'test-button' : 'normal-button'}
    >
      Object props
    </Button>
  );
  
  return (
    <div>
      {selfClosing}
      {withSpread}
      {complexNesting}
      {functionAsChildren}
      {conditionalProps}
      {templateLiterals}
      {noChildren1}
      {noChildren2}
      {objectProps}
    </div>
  );
};

export default MalformedJSX;
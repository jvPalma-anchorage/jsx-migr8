import React from 'react';
import { Button, Text, Card } from '@ui-library-v2/components';
import { Typography, Container } from '@design-system/core';
import UserProfile from './components/UserProfile';
import './App.css';

interface AppProps {
  theme?: 'light' | 'dark';
}

const App: React.FC<AppProps> = ({ theme = 'light' }) => {
  const [count, setCount] = React.useState(0);

  return (
    <Container maxWidth="lg" theme={theme}>
      <Typography variant="h1" color="primary">
        jsx-migr8 Test App
      </Typography>
      
      <Card elevation="raised" shadow="medium">
        <Text variant="headingLarge">
          Welcome to the test app!
        </Text>
        
        <Text variant="bodyMedium" color="secondary">
          This is a sample React application used for testing jsx-migr8 migrations.
        </Text>
        
        <Button 
          appearance="primary" 
          size="large"
          onClick={() => setCount(count + 1)}
          disabled={false}
        >
          Count: {count}
        </Button>
        
        <Button 
          appearance="secondary" 
          size="small"
          onClick={() => setCount(0)}
        >
          Reset
        </Button>
      </Card>
      
      <UserProfile 
        name="John Doe" 
        email="john@example.com"
        avatar="/images/avatar.jpg"
      />
    </Container>
  );
};

export default App;
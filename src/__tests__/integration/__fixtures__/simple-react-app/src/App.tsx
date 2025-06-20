import React from 'react';
import { Button, Text, Card } from '@ui-library/components';
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
      
      <Card elevated shadow="medium">
        <Text size="large" weight="bold">
          Welcome to the test app!
        </Text>
        
        <Text size="medium" color="secondary">
          This is a sample React application used for testing jsx-migr8 migrations.
        </Text>
        
        <Button 
          variant="primary" 
          size="large"
          onClick={() => setCount(count + 1)}
          disabled={false}
        >
          Count: {count}
        </Button>
        
        <Button 
          variant="secondary" 
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
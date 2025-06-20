import React from 'react';
import { Card as MuiCard, CardContent, CardActions, Button, Typography } from '@mui/material';
import { Card as AntCard } from 'antd';
import { Box, Heading, Text } from '@chakra-ui/react';

export const CardExample: React.FC = () => {
  return (
    <div>
      <h2>Material-UI Cards</h2>
      <MuiCard sx={{ maxWidth: 345 }}>
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            MUI Card Title
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This is a Material-UI card with some content.
          </Typography>
        </CardContent>
        <CardActions>
          <Button size="small">Share</Button>
          <Button size="small">Learn More</Button>
        </CardActions>
      </MuiCard>
      
      <h2>Ant Design Cards</h2>
      <AntCard 
        title="Ant Design Card" 
        extra={<a href="#">More</a>} 
        style={{ width: 300 }}
        hoverable
      >
        <p>Card content</p>
        <p>Card content</p>
        <p>Card content</p>
      </AntCard>
      
      <h2>Chakra UI Cards (Box-based)</h2>
      <Box maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden" p={6}>
        <Heading size="md" mb={2}>Chakra Card Title</Heading>
        <Text>
          This is a Chakra UI card-like component built with Box.
        </Text>
      </Box>
    </div>
  );
};
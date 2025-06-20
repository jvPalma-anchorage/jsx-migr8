import React from 'react';
import { Button as MuiButton } from '@mui/material';
import { Button as AntButton } from 'antd';
import { Button as ChakraButton } from '@chakra-ui/react';

export const ButtonExample: React.FC = () => {
  return (
    <div>
      <h2>Material-UI Buttons</h2>
      <MuiButton variant="contained" color="primary" size="large">
        Primary MUI Button
      </MuiButton>
      <MuiButton variant="outlined" color="secondary" disabled>
        Disabled MUI Button
      </MuiButton>
      
      <h2>Ant Design Buttons</h2>
      <AntButton type="primary" size="large" danger>
        Danger Ant Button
      </AntButton>
      <AntButton type="default" loading>
        Loading Ant Button
      </AntButton>
      
      <h2>Chakra UI Buttons</h2>
      <ChakraButton colorScheme="blue" size="md" variant="solid">
        Chakra Blue Button
      </ChakraButton>
      <ChakraButton colorScheme="red" size="sm" variant="outline">
        Chakra Red Outline
      </ChakraButton>
    </div>
  );
};
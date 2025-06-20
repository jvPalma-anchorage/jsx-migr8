import React from 'react';
import { Button as MuiButton, TextField, Chip, Alert } from '@mui/material';
import { Button as AntButton, Input, Tag, notification } from 'antd';
import { Button as ChakraButton, Input as ChakraInput, Badge, Alert as ChakraAlert } from '@chakra-ui/react';

// Complex component with various prop patterns for thorough testing
export const AdvancedPropsExample: React.FC = () => {
  const [value, setValue] = React.useState('');
  const handleClick = () => notification.info({ message: 'Clicked!' });

  return (
    <div>
      <h2>Advanced Props Testing</h2>
      
      {/* Material-UI Components with Complex Props */}
      <MuiButton 
        variant="contained" 
        color="primary" 
        size="large"
        startIcon={<span>🚀</span>}
        onClick={handleClick}
        disabled={false}
        fullWidth={true}
        sx={{ margin: 2 }}
      >
        Complex MUI Button
      </MuiButton>
      
      <TextField
        label="Advanced Text Field"
        variant="outlined"
        fullWidth
        required
        error={false}
        helperText="This is helper text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        InputProps={{
          startAdornment: '🔍'
        }}
        inputProps={{
          'data-testid': 'advanced-input'
        }}
      />
      
      <Chip 
        label="Status Chip" 
        color="success" 
        variant="filled" 
        size="medium"
        onDelete={() => {}}
        deleteIcon={<span>✕</span>}
      />
      
      <Alert 
        severity="info" 
        variant="standard"
        action={<MuiButton size="small">Action</MuiButton>}
        onClose={() => {}}
      >
        This is an info alert
      </Alert>

      {/* Ant Design Components with Complex Props */}
      <AntButton 
        type="primary" 
        size="large" 
        shape="round"
        loading={false}
        danger={false}
        ghost={false}
        block={true}
        onClick={handleClick}
        style={{ marginTop: 16 }}
        data-testid="ant-button"
      >
        Complex Ant Button
      </AntButton>
      
      <Input
        placeholder="Advanced Ant Input"
        size="large"
        allowClear
        disabled={false}
        maxLength={100}
        showCount
        prefix="🔍"
        suffix="📝"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ margin: '8px 0' }}
      />
      
      <Tag 
        color="blue" 
        closable
        onClose={() => {}}
        style={{ margin: 4 }}
      >
        Closable Tag
      </Tag>
      
      <Tag 
        color="red" 
        closable={false}
        style={{ margin: 4 }}
      >
        Non-closable Tag
      </Tag>

      {/* Chakra UI Components with Complex Props */}
      <ChakraButton 
        colorScheme="blue" 
        size="lg" 
        variant="solid"
        leftIcon={<span>⭐</span>}
        rightIcon={<span>🎯</span>}
        isLoading={false}
        isDisabled={false}
        loadingText="Loading..."
        onClick={handleClick}
        _hover={{ bg: 'blue.600' }}
        _active={{ bg: 'blue.700' }}
      >
        Complex Chakra Button
      </ChakraButton>
      
      <ChakraInput
        placeholder="Advanced Chakra Input"
        size="lg"
        variant="filled"
        isRequired
        isDisabled={false}
        isInvalid={false}
        errorBorderColor="red.300"
        focusBorderColor="blue.400"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        bg="gray.50"
        _hover={{ bg: 'gray.100' }}
        _focus={{ bg: 'white' }}
      />
      
      <Badge 
        colorScheme="green" 
        variant="solid"
        fontSize="0.8em"
        px={2}
        py={1}
        borderRadius="full"
      >
        Success Badge
      </Badge>
      
      <ChakraAlert 
        status="warning" 
        variant="left-accent"
        borderRadius="md"
        boxShadow="md"
      >
        This is a warning alert
      </ChakraAlert>

      {/* Edge Cases and Special Props */}
      <MuiButton
        {...{ 'data-cy': 'cypress-button' }}
        aria-label="Accessible button"
        tabIndex={0}
        role="button"
      >
        Accessibility Props
      </MuiButton>
      
      <AntButton
        htmlType="submit"
        form="my-form"
        target="_blank"
      >
        HTML Props
      </AntButton>
      
      <ChakraButton
        as="a"
        href="#"
        textDecoration="none"
        _hover={{ textDecoration: 'underline' }}
      >
        Polymorphic Component
      </ChakraButton>
    </div>
  );
};
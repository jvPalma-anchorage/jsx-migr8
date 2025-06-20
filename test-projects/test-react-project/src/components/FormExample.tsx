import React from 'react';
import { TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Input, Select as AntSelect, Form } from 'antd';
import { Input as ChakraInput, Select as ChakraSelect } from '@chakra-ui/react';

const { Option } = AntSelect;

export const FormExample: React.FC = () => {
  return (
    <div>
      <h2>Material-UI Form Elements</h2>
      <TextField 
        label="Email" 
        variant="outlined" 
        fullWidth 
        required 
        type="email"
      />
      <FormControl fullWidth>
        <InputLabel>Age</InputLabel>
        <Select label="Age">
          <MenuItem value={10}>Ten</MenuItem>
          <MenuItem value={20}>Twenty</MenuItem>
          <MenuItem value={30}>Thirty</MenuItem>
        </Select>
      </FormControl>
      
      <h2>Ant Design Form Elements</h2>
      <Form>
        <Form.Item label="Username" name="username" rules={[{ required: true }]}>
          <Input placeholder="Enter username" size="large" />
        </Form.Item>
        <Form.Item label="Country">
          <AntSelect defaultValue="usa" style={{ width: 200 }}>
            <Option value="usa">United States</Option>
            <Option value="uk">United Kingdom</Option>
            <Option value="ca">Canada</Option>
          </AntSelect>
        </Form.Item>
      </Form>
      
      <h2>Chakra UI Form Elements</h2>
      <ChakraInput placeholder="Enter your name" size="lg" variant="filled" />
      <ChakraSelect placeholder="Select option" size="md">
        <option value="option1">Option 1</option>
        <option value="option2">Option 2</option>
        <option value="option3">Option 3</option>
      </ChakraSelect>
    </div>
  );
};
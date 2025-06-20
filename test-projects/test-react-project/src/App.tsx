import React from 'react';
import { ButtonExample } from './components/ButtonExample';
import { FormExample } from './components/FormExample';
import { CardExample } from './components/CardExample';
import { DialogExample } from './components/DialogExample';
import { TestOldUIComponents } from './components/TestOldUIComponents';
import { AdvancedPropsExample } from './components/AdvancedPropsExample';

function App() {
  return (
    <div className="App">
      <h1>Test React Project for jsx-migr8</h1>
      <ButtonExample />
      <FormExample />
      <CardExample />
      <DialogExample />
      <TestOldUIComponents />
      <AdvancedPropsExample />
    </div>
  );
}

export default App;
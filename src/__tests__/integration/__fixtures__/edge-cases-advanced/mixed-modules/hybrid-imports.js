/**
 * Mixed module systems: CommonJS + ES modules in same file
 * Tests handling of different import/export patterns
 */

// CommonJS require
const React = require('react');
const { Button: MuiButton } = require('@mui/material');
const antd = require('antd');

// ES6 imports mixed with CommonJS
import { TextField } from '@mui/material';
import * as styled from 'styled-components';

// Dynamic requires
const dynamicModule = require(`./${process.env.MODULE_NAME || 'default'}`);

// Conditional requires
let ConditionalComponent;
if (process.env.USE_ANTD) {
  ConditionalComponent = require('antd').Button;
} else {
  ConditionalComponent = require('@mui/material').Button;
}

// Mixed exports
module.exports.CommonJSComponent = function(props) {
  return React.createElement(MuiButton, props, 'CommonJS Button');
};

// ES6 export with CommonJS component
export const ES6Component = () => {
  const AntButton = antd.Button;
  
  return (
    <div>
      <MuiButton>MUI Button</MuiButton>
      <AntButton>Ant Button</AntButton>
      <ConditionalComponent>Conditional</ConditionalComponent>
    </div>
  );
};

// Factory pattern with mixed modules
function createComponent(type) {
  switch(type) {
    case 'mui':
      return require('@mui/material').Button;
    case 'antd':
      return require('antd').Button;
    default:
      return function DefaultButton(props) {
        return React.createElement('button', props);
      };
  }
}

module.exports.createComponent = createComponent;

// Weird edge case: module.exports and export default
export default function DefaultComponent() {
  return <MuiButton>Default Export</MuiButton>;
}

module.exports.default = DefaultComponent;

// Re-exporting with mixed syntax
module.exports.MuiButton = MuiButton;
export { antd };
export * from '@mui/material/styles';

// IIFE with mixed modules
(function() {
  const LocalButton = require('@mui/material').IconButton;
  module.exports.LocalButton = LocalButton;
})();

// AMD-style define (for completeness)
if (typeof define === 'function' && define.amd) {
  define(['react', '@mui/material'], function(React, mui) {
    return {
      AMDComponent: function() {
        return React.createElement(mui.Button, null, 'AMD');
      }
    };
  });
}

// Global variable assignment (legacy pattern)
if (typeof window !== 'undefined') {
  window.GlobalComponent = function() {
    return React.createElement(MuiButton, null, 'Global');
  };
}

// Circular dependency pattern
const circularModule = require('./hybrid-imports');
exports.circular = circularModule;

// Prototype modification (dangerous pattern)
if (MuiButton.prototype) {
  MuiButton.prototype.customMethod = function() {
    console.log('Modified prototype');
  };
}

// Module.exports assignment variations
exports = module.exports = {
  variant1: MuiButton,
  variant2: antd.Button
};

exports.variant3 = TextField;

// Runtime module resolution
const runtimeImport = (name) => {
  try {
    return require(name);
  } catch (e) {
    return require('./' + name);
  }
};

// JSX with CommonJS
const CommonJSXComponent = React.createClass({
  render: function() {
    return React.createElement(
      'div',
      null,
      React.createElement(MuiButton, { variant: 'contained' }, 'Legacy'),
      React.createElement(antd.Button, { type: 'primary' }, 'CommonJS JSX')
    );
  }
});

// Export both ways
module.exports.CommonJSXComponent = CommonJSXComponent;
export { CommonJSXComponent as LegacyComponent };
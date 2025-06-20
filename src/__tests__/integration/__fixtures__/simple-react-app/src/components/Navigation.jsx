import React from 'react';
import { Button, Text } from '@ui-library/components';
import { Link, Icon } from '@design-system/core';

const Navigation = ({ items = [], onItemClick }) => {
  return (
    <nav className="navigation">
      <div className="nav-brand">
        <Text size="large" weight="bold">
          MyApp
        </Text>
      </div>
      
      <ul className="nav-items">
        {items.map((item, index) => (
          <li key={index} className="nav-item">
            <Link 
              href={item.href}
              onClick={() => onItemClick?.(item)}
              active={item.active}
            >
              {item.icon && (
                <Icon 
                  name={item.icon} 
                  size="small" 
                  color="inherit"
                />
              )}
              <Text size="medium">
                {item.label}
              </Text>
            </Link>
          </li>
        ))}
      </ul>
      
      <div className="nav-actions">
        <Button variant="ghost" size="small">
          <Icon name="search" size="small" />
          Search
        </Button>
        
        <Button variant="primary" size="small">
          Login
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;
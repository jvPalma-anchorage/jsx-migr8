import React from 'react';
import { Button, Text, Card } from '@old-ui/components';

export const UserProfile: React.FC<{ name: string; role: string }> = ({ name, role }) => {
  return (
    <Card elevated>
      <Text size="large" weight="bold">{name}</Text>
      <Text size="medium">{role}</Text>
      <div className="actions">
        <Button variant="primary" size="large">
          Edit Profile
        </Button>
        <Button variant="secondary">
          View Details
        </Button>
      </div>
    </Card>
  );
};
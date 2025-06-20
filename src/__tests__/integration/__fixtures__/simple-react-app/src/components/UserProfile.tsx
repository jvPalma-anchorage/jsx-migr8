import React from 'react';
import { Card, Text, Button } from '@ui-library/components';
import { Avatar, Badge } from '@design-system/core';

interface UserProfileProps {
  name: string;
  email: string;
  avatar: string;
  status?: 'online' | 'offline' | 'away';
  isVerified?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({
  name,
  email,
  avatar,
  status = 'offline',
  isVerified = false,
}) => {
  return (
    <Card padding="large" border="subtle">
      <div className="profile-header">
        <Avatar 
          src={avatar} 
          alt={`${name}'s avatar`} 
          size="large"
          status={status}
        />
        
        <div className="profile-info">
          <Text size="large" weight="bold">
            {name}
            {isVerified && (
              <Badge variant="success" size="small">
                Verified
              </Badge>
            )}
          </Text>
          
          <Text size="medium" color="muted">
            {email}
          </Text>
        </div>
      </div>
      
      <div className="profile-actions">
        <Button variant="outline" size="medium">
          Edit Profile
        </Button>
        
        <Button variant="ghost" size="medium">
          View Settings
        </Button>
      </div>
    </Card>
  );
};

export default UserProfile;
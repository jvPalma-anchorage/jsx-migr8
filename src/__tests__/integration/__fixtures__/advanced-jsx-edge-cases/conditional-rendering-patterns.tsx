/**
 * Conditional Rendering with Ternary Operators Test Cases
 * Tests jsx-migr8's ability to handle complex conditional rendering patterns, nested ternaries, and logical operators
 */

import React, { useState, useMemo, useCallback, ReactNode } from 'react';
import { Button as MuiButton, Typography, Box, Chip, Alert, Card, Switch } from '@mui/material';
import { Button as AntdButton, Tag, Badge, Tooltip, Space, Dropdown } from 'antd';

// ======================
// 1. Basic Ternary Patterns
// ======================

// Simple ternary component rendering
export const SimpleTernaryComponent = ({ condition }: { condition: boolean }) => {
  return (
    <div>
      {condition ? (
        <MuiButton variant="contained" color="primary">
          Condition is True
        </MuiButton>
      ) : (
        <AntdButton type="primary" danger>
          Condition is False
        </AntdButton>
      )}
    </div>
  );
};

// Ternary with component types
export const TernaryComponentTypes = ({ 
  useFirstType, 
  text 
}: { 
  useFirstType: boolean; 
  text: string; 
}) => {
  const Component = useFirstType ? MuiButton : AntdButton;
  const props = useFirstType 
    ? { variant: 'outlined' as const, color: 'secondary' as const }
    : { type: 'default' as const, ghost: true };
  
  return (
    <Component {...props}>
      {text}
    </Component>
  );
};

// Ternary with null/undefined values
export const TernaryNullValues = ({ 
  showComponent, 
  showNull, 
  showUndefined 
}: { 
  showComponent: boolean; 
  showNull: boolean; 
  showUndefined: boolean; 
}) => {
  return (
    <div>
      {showComponent ? (
        <MuiButton>Component Shown</MuiButton>
      ) : showNull ? (
        null
      ) : showUndefined ? (
        undefined
      ) : (
        <AntdButton>Default Fallback</AntdButton>
      )}
    </div>
  );
};

// ======================
// 2. Nested Ternary Patterns
// ======================

// Deeply nested ternary operators
export const DeeplyNestedTernary = ({ 
  level, 
  type, 
  variant 
}: { 
  level: number; 
  type: 'primary' | 'secondary' | 'tertiary'; 
  variant: 'light' | 'dark' | 'auto'; 
}) => {
  return (
    <div>
      {level > 0 ? (
        type === 'primary' ? (
          variant === 'light' ? (
            <MuiButton variant="contained" color="primary">
              Primary Light
            </MuiButton>
          ) : variant === 'dark' ? (
            <MuiButton variant="contained" color="primary" sx={{ bgcolor: 'primary.dark' }}>
              Primary Dark
            </MuiButton>
          ) : (
            <MuiButton variant="contained" color="primary" sx={{ bgcolor: 'primary.main' }}>
              Primary Auto
            </MuiButton>
          )
        ) : type === 'secondary' ? (
          variant === 'light' ? (
            <AntdButton type="default">
              Secondary Light
            </AntdButton>
          ) : variant === 'dark' ? (
            <AntdButton type="primary" ghost>
              Secondary Dark
            </AntdButton>
          ) : (
            <AntdButton type="dashed">
              Secondary Auto
            </AntdButton>
          )
        ) : (
          variant === 'light' ? (
            <Chip label="Tertiary Light" variant="outlined" />
          ) : variant === 'dark' ? (
            <Tag color="volcano">Tertiary Dark</Tag>
          ) : (
            <Badge count={level} color="blue">
              <span>Tertiary Auto</span>
            </Badge>
          )
        )
      ) : (
        <Typography variant="caption">Level is zero or negative</Typography>
      )}
    </div>
  );
};

// Complex nested ternary with multiple conditions
export const ComplexNestedTernary = ({ 
  user, 
  permissions, 
  featureFlags 
}: { 
  user: { id: string; role: 'admin' | 'user' | 'guest' } | null;
  permissions: string[];
  featureFlags: Record<string, boolean>;
}) => {
  return (
    <div>
      {user ? (
        user.role === 'admin' ? (
          permissions.includes('write') ? (
            featureFlags.newUI ? (
              <MuiButton variant="contained" color="success" startIcon={<span>🔧</span>}>
                Admin Write (New UI)
              </MuiButton>
            ) : (
              <AntdButton type="primary" icon={<span>⚙️</span>}>
                Admin Write (Old UI)
              </AntdButton>
            )
          ) : (
            featureFlags.readOnlyMode ? (
              <MuiButton variant="outlined" disabled>
                Admin Read-Only
              </MuiButton>
            ) : (
              <AntdButton disabled>
                Admin No Permissions
              </AntdButton>
            )
          )
        ) : user.role === 'user' ? (
          permissions.includes('read') ? (
            featureFlags.userDashboard ? (
              <Card sx={{ p: 1 }}>
                <Typography>User Dashboard</Typography>
                <MuiButton size="small">User Actions</MuiButton>
              </Card>
            ) : (
              <AntdButton type="default">
                User Basic View
              </AntdButton>
            )
          ) : (
            <Alert severity="warning">
              User has no read permissions
            </Alert>
          )
        ) : (
          permissions.length > 0 ? (
            <Tooltip title="Guest with limited access">
              <AntdButton type="link">Guest Access</AntdButton>
            </Tooltip>
          ) : (
            <Typography color="error">
              Guest - No Access
            </Typography>
          )
        )
      ) : (
        featureFlags.allowAnonymous ? (
          <MuiButton variant="text" href="/login">
            Login to Access
          </MuiButton>
        ) : (
          <Alert severity="error">
            Authentication Required
          </Alert>
        )
      )}
    </div>
  );
};

// ======================
// 3. Logical Operators in Conditional Rendering
// ======================

// Logical AND operator patterns
export const LogicalAndPatterns = ({ 
  isLoggedIn, 
  hasPermission, 
  isLoading, 
  data 
}: { 
  isLoggedIn: boolean; 
  hasPermission: boolean; 
  isLoading: boolean; 
  data: any[] | null; 
}) => {
  return (
    <div>
      {isLoggedIn && (
        <div>
          <Typography>User is logged in</Typography>
          {hasPermission && (
            <MuiButton variant="contained">
              Access Granted
            </MuiButton>
          )}
        </div>
      )}
      
      {isLoggedIn && hasPermission && !isLoading && (
        <div>
          <Typography>All conditions met</Typography>
          {data && data.length > 0 && (
            <div>
              {data.map((item, index) => (
                <AntdButton key={index} size="small" style={{ margin: '2px' }}>
                  {String(item)}
                </AntdButton>
              ))}
            </div>
          )}
        </div>
      )}
      
      {!isLoggedIn && (
        <Alert severity="info">
          Please log in to continue
        </Alert>
      )}
    </div>
  );
};

// Logical OR operator patterns
export const LogicalOrPatterns = ({ 
  primaryButton, 
  secondaryButton, 
  fallbackText 
}: { 
  primaryButton?: ReactNode; 
  secondaryButton?: ReactNode; 
  fallbackText?: string; 
}) => {
  return (
    <div>
      {primaryButton || secondaryButton || (
        <MuiButton variant="outlined">
          Default Button
        </MuiButton>
      )}
      
      <Typography>
        {fallbackText || 'Default fallback text'}
      </Typography>
      
      {(primaryButton && secondaryButton) ? (
        <div>
          <div>Primary: {primaryButton}</div>
          <div>Secondary: {secondaryButton}</div>
        </div>
      ) : primaryButton ? (
        <div>Only Primary: {primaryButton}</div>
      ) : secondaryButton ? (
        <div>Only Secondary: {secondaryButton}</div>
      ) : (
        <Typography color="warning.main">
          No buttons provided
        </Typography>
      )}
    </div>
  );
};

// Complex logical combinations
export const ComplexLogicalCombinations = ({ 
  state 
}: { 
  state: {
    user: { isAdmin: boolean; isPremium: boolean } | null;
    feature: { enabled: boolean; betaAccess: boolean };
    system: { maintenance: boolean; errors: string[] };
  }
}) => {
  const { user, feature, system } = state;
  
  return (
    <div>
      {/* Complex AND conditions */}
      {user && user.isAdmin && !system.maintenance && (
        <Alert severity="success" icon={<span>👑</span>}>
          Admin access available
        </Alert>
      )}
      
      {/* Complex OR with AND conditions */}
      {(user?.isPremium || (user?.isAdmin && feature.betaAccess)) && !system.maintenance && (
        <Card sx={{ p: 2, m: 1, bgcolor: 'primary.light' }}>
          <Typography>Premium features enabled</Typography>
          <MuiButton variant="contained" size="small">
            Access Premium
          </MuiButton>
        </Card>
      )}
      
      {/* Nested logical conditions */}
      {feature.enabled ? (
        user ? (
          (user.isAdmin || user.isPremium) ? (
            system.errors.length === 0 ? (
              <MuiButton variant="contained" color="success">
                Full Access
              </MuiButton>
            ) : (
              <Alert severity="warning">
                System has {system.errors.length} error(s)
              </Alert>
            )
          ) : (
            <AntdButton type="default">
              Basic Access
            </AntdButton>
          )
        ) : (
          <Typography>Login required</Typography>
        )
      ) : (
        <Alert severity="info">
          Feature is disabled
        </Alert>
      )}
      
      {/* Complex condition with multiple operators */}
      {(!system.maintenance && feature.enabled) || (user?.isAdmin && feature.betaAccess) ? (
        <div>
          {system.errors.length > 0 && (
            <Alert severity="error">
              Errors: {system.errors.join(', ')}
            </Alert>
          )}
          <Space>
            <AntdButton type="primary">
              Service Available
            </AntdButton>
            {user?.isAdmin && (
              <AntdButton type="dashed">
                Admin Tools
              </AntdButton>
            )}
          </Space>
        </div>
      ) : (
        <Alert severity="error">
          Service unavailable
        </Alert>
      )}
    </div>
  );
};

// ======================
// 4. Conditional Props and Attributes
// ======================

// Conditional props based on state
export const ConditionalProps = ({ 
  mode, 
  disabled, 
  loading 
}: { 
  mode: 'primary' | 'secondary' | 'danger'; 
  disabled: boolean; 
  loading: boolean; 
}) => {
  return (
    <div>
      <MuiButton
        variant={mode === 'primary' ? 'contained' : mode === 'secondary' ? 'outlined' : 'text'}
        color={mode === 'danger' ? 'error' : mode === 'primary' ? 'primary' : 'secondary'}
        disabled={disabled || loading}
        size={mode === 'primary' ? 'large' : 'medium'}
        startIcon={loading ? <span>⏳</span> : mode === 'danger' ? <span>⚠️</span> : undefined}
        {...(mode === 'primary' && !disabled ? { elevation: 3 } : {})}
        style={{
          ...(mode === 'danger' ? { backgroundColor: '#ff4444' } : {}),
          ...(loading ? { opacity: 0.7 } : {}),
          margin: '4px'
        }}
      >
        {loading ? 'Loading...' : mode === 'danger' ? 'Dangerous Action' : 'Regular Action'}
      </MuiButton>
      
      <AntdButton
        type={mode === 'primary' ? 'primary' : mode === 'danger' ? 'primary' : 'default'}
        danger={mode === 'danger'}
        loading={loading}
        disabled={disabled}
        size={mode === 'primary' ? 'large' : 'middle'}
        {...(mode === 'secondary' ? { ghost: true } : {})}
      >
        {mode === 'primary' ? 'Primary Antd' : mode === 'secondary' ? 'Secondary Antd' : 'Danger Antd'}
      </AntdButton>
    </div>
  );
};

// Conditional class names and styles
export const ConditionalStyling = ({ 
  theme, 
  size, 
  active, 
  error 
}: { 
  theme: 'light' | 'dark'; 
  size: 'small' | 'medium' | 'large'; 
  active: boolean; 
  error: boolean; 
}) => {
  const baseStyles = {
    padding: size === 'small' ? '4px 8px' : size === 'medium' ? '8px 16px' : '12px 24px',
    borderRadius: '4px',
    border: '1px solid',
    margin: '4px'
  };
  
  const themeStyles = theme === 'dark' 
    ? { backgroundColor: '#333', color: '#fff', borderColor: '#666' }
    : { backgroundColor: '#fff', color: '#333', borderColor: '#ccc' };
  
  const stateStyles = {
    ...(active ? { 
      boxShadow: '0 0 0 2px blue',
      borderColor: 'blue'
    } : {}),
    ...(error ? { 
      backgroundColor: theme === 'dark' ? '#660000' : '#ffeeee',
      borderColor: 'red',
      color: theme === 'dark' ? '#ffaaaa' : 'red'
    } : {})
  };
  
  return (
    <div
      style={{
        ...baseStyles,
        ...themeStyles,
        ...stateStyles,
        cursor: active ? 'pointer' : 'default'
      }}
      className={`
        ${theme === 'dark' ? 'dark-theme' : 'light-theme'}
        ${size === 'small' ? 'size-small' : size === 'medium' ? 'size-medium' : 'size-large'}
        ${active ? 'active' : ''}
        ${error ? 'error' : ''}
      `.trim()}
    >
      <Typography variant={size === 'large' ? 'h6' : 'body2'}>
        {error ? '❌ Error State' : active ? '✅ Active' : '⭕ Inactive'} - {theme} theme, {size} size
      </Typography>
    </div>
  );
};

// ======================
// 5. Dynamic Conditional Rendering
// ======================

// State-based conditional rendering
export const StatefulConditionalRendering = () => {
  const [mode, setMode] = useState<'view' | 'edit' | 'loading' | 'error'>('view');
  const [data, setData] = useState({ name: 'John Doe', email: 'john@example.com' });
  
  const renderContent = useCallback(() => {
    switch (mode) {
      case 'loading':
        return (
          <Box display="flex" alignItems="center" gap={2}>
            <span>🔄</span>
            <Typography>Loading...</Typography>
          </Box>
        );
        
      case 'error':
        return (
          <Alert 
            severity="error" 
            action={
              <AntdButton size="small" onClick={() => setMode('view')}>
                Retry
              </AntdButton>
            }
          >
            Something went wrong!
          </Alert>
        );
        
      case 'edit':
        return (
          <Card sx={{ p: 2 }}>
            <Typography variant="h6">Edit Mode</Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <input 
                value={data.name} 
                onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Name"
              />
              <input 
                value={data.email} 
                onChange={(e) => setData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
              />
              <Space>
                <MuiButton 
                  variant="contained" 
                  onClick={() => setMode('view')}
                  size="small"
                >
                  Save
                </MuiButton>
                <AntdButton 
                  onClick={() => setMode('view')}
                  size="small"
                >
                  Cancel
                </AntdButton>
              </Space>
            </Box>
          </Card>
        );
        
      case 'view':
      default:
        return (
          <Card sx={{ p: 2 }}>
            <Typography variant="h6">View Mode</Typography>
            <Typography>Name: {data.name}</Typography>
            <Typography>Email: {data.email}</Typography>
            <MuiButton 
              variant="outlined" 
              onClick={() => setMode('edit')}
              size="small"
              style={{ marginTop: '8px' }}
            >
              Edit
            </MuiButton>
          </Card>
        );
    }
  }, [mode, data]);
  
  return (
    <div>
      <Typography variant="h6">Dynamic Conditional Rendering</Typography>
      <Box mb={2}>
        <Space>
          <AntdButton 
            type={mode === 'view' ? 'primary' : 'default'}
            onClick={() => setMode('view')}
            size="small"
          >
            View
          </AntdButton>
          <AntdButton 
            type={mode === 'edit' ? 'primary' : 'default'}
            onClick={() => setMode('edit')}
            size="small"
          >
            Edit
          </AntdButton>
          <AntdButton 
            type={mode === 'loading' ? 'primary' : 'default'}
            onClick={() => setMode('loading')}
            size="small"
          >
            Loading
          </AntdButton>
          <AntdButton 
            type={mode === 'error' ? 'primary' : 'default'}
            onClick={() => setMode('error')}
            size="small"
          >
            Error
          </AntdButton>
        </Space>
      </Box>
      {renderContent()}
    </div>
  );
};

// Computed conditional rendering
export const ComputedConditionalRendering = ({ 
  items 
}: { 
  items: Array<{ id: string; type: 'success' | 'warning' | 'error'; value: number }> 
}) => {
  const stats = useMemo(() => {
    const total = items.length;
    const byType = items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalValue = items.reduce((sum, item) => sum + item.value, 0);
    const avgValue = total > 0 ? totalValue / total : 0;
    
    return { total, byType, totalValue, avgValue };
  }, [items]);
  
  return (
    <div>
      <Typography variant="h6">Computed Conditional Rendering</Typography>
      
      {/* Conditional rendering based on computed stats */}
      {stats.total === 0 ? (
        <Alert severity="info">
          No items to display
        </Alert>
      ) : stats.total < 5 ? (
        <Alert severity="warning">
          Few items ({stats.total}) - consider adding more
        </Alert>
      ) : stats.total > 20 ? (
        <Alert severity="error">
          Too many items ({stats.total}) - performance may be affected
        </Alert>
      ) : (
        <Alert severity="success">
          Good number of items ({stats.total})
        </Alert>
      )}
      
      {/* Conditional rendering based on item types */}
      {stats.byType.error > 0 && (
        <Box bgcolor="error.light" p={1} m={1}>
          <Typography color="error.dark">
            ⚠️ {stats.byType.error} error item(s) detected
          </Typography>
        </Box>
      )}
      
      {stats.byType.warning > stats.byType.success && (
        <Box bgcolor="warning.light" p={1} m={1}>
          <Typography color="warning.dark">
            More warnings than successes ({stats.byType.warning} vs {stats.byType.success || 0})
          </Typography>
        </Box>
      )}
      
      {/* Conditional rendering based on values */}
      {stats.avgValue > 100 ? (
        <Card sx={{ bgcolor: 'success.light', p: 1, m: 1 }}>
          <Typography>🎉 High average value: {stats.avgValue.toFixed(2)}</Typography>
        </Card>
      ) : stats.avgValue < 10 ? (
        <Card sx={{ bgcolor: 'error.light', p: 1, m: 1 }}>
          <Typography>📉 Low average value: {stats.avgValue.toFixed(2)}</Typography>
        </Card>
      ) : (
        <Card sx={{ bgcolor: 'info.light', p: 1, m: 1 }}>
          <Typography>📊 Average value: {stats.avgValue.toFixed(2)}</Typography>
        </Card>
      )}
      
      {/* Render items with conditional styling */}
      <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
        {items.map(item => (
          <Chip
            key={item.id}
            label={`${item.type}: ${item.value}`}
            color={item.type === 'success' ? 'success' : item.type === 'warning' ? 'warning' : 'error'}
            variant={item.value > stats.avgValue ? 'filled' : 'outlined'}
            size={item.value > 50 ? 'medium' : 'small'}
          />
        ))}
      </Box>
    </div>
  );
};

// ======================
// 6. Main Test Component
// ======================

export const ConditionalRenderingTests = () => {
  const [simpleTernary, setSimpleTernary] = useState(true);
  const [componentType, setComponentType] = useState(true);
  const [showComponent, setShowComponent] = useState(true);
  const [nullFlags, setNullFlags] = useState({ showNull: false, showUndefined: false });
  
  // Complex state for nested examples
  const [complexState, setComplexState] = useState({
    user: { id: '1', role: 'admin' as const },
    permissions: ['read', 'write'],
    featureFlags: { newUI: true, readOnlyMode: false, userDashboard: true, allowAnonymous: false }
  });
  
  const [logicalState, setLogicalState] = useState({
    isLoggedIn: true,
    hasPermission: true,
    isLoading: false,
    data: ['Item 1', 'Item 2', 'Item 3']
  });
  
  const [systemState, setSystemState] = useState({
    user: { isAdmin: true, isPremium: false },
    feature: { enabled: true, betaAccess: true },
    system: { maintenance: false, errors: [] as string[] }
  });
  
  const [conditionalProps, setConditionalProps] = useState({
    mode: 'primary' as const,
    disabled: false,
    loading: false
  });
  
  const [stylingState, setStylingState] = useState({
    theme: 'light' as const,
    size: 'medium' as const,
    active: false,
    error: false
  });
  
  const [testItems, setTestItems] = useState([
    { id: '1', type: 'success' as const, value: 75 },
    { id: '2', type: 'warning' as const, value: 45 },
    { id: '3', type: 'error' as const, value: 120 },
    { id: '4', type: 'success' as const, value: 90 }
  ]);
  
  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4">Conditional Rendering Pattern Tests</Typography>
      
      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">1. Basic Ternary Patterns</Typography>
        
        <Box mb={2}>
          <Switch 
            checked={simpleTernary} 
            onChange={(e) => setSimpleTernary(e.target.checked)}
          />
          <Typography component="span">Simple Ternary Condition</Typography>
        </Box>
        <SimpleTernaryComponent condition={simpleTernary} />
        
        <Box mb={2} mt={2}>
          <Switch 
            checked={componentType} 
            onChange={(e) => setComponentType(e.target.checked)}
          />
          <Typography component="span">Component Type Toggle</Typography>
        </Box>
        <TernaryComponentTypes useFirstType={componentType} text="Dynamic Type" />
        
        <Box mb={2} mt={2}>
          <Space>
            <Switch 
              checked={showComponent} 
              onChange={(e) => setShowComponent(e.target.checked)}
            />
            <Typography>Show Component</Typography>
            <Switch 
              checked={nullFlags.showNull} 
              onChange={(e) => setNullFlags(prev => ({ ...prev, showNull: e.target.checked }))}
            />
            <Typography>Show Null</Typography>
            <Switch 
              checked={nullFlags.showUndefined} 
              onChange={(e) => setNullFlags(prev => ({ ...prev, showUndefined: e.target.checked }))}
            />
            <Typography>Show Undefined</Typography>
          </Space>
        </Box>
        <TernaryNullValues 
          showComponent={showComponent} 
          showNull={nullFlags.showNull} 
          showUndefined={nullFlags.showUndefined} 
        />
      </section>

      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">2. Nested Ternary Patterns</Typography>
        <DeeplyNestedTernary level={2} type="primary" variant="dark" />
        <ComplexNestedTernary 
          user={complexState.user}
          permissions={complexState.permissions}
          featureFlags={complexState.featureFlags}
        />
      </section>

      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">3. Logical Operators</Typography>
        <LogicalAndPatterns {...logicalState} />
        <LogicalOrPatterns 
          primaryButton={<MuiButton>Primary</MuiButton>}
          secondaryButton={undefined}
          fallbackText="Custom fallback"
        />
        <ComplexLogicalCombinations state={systemState} />
      </section>

      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">4. Conditional Props</Typography>
        <ConditionalProps {...conditionalProps} />
        <ConditionalStyling {...stylingState} />
      </section>

      <section style={{ marginBottom: '30px' }}>
        <Typography variant="h5">5. Dynamic Conditional Rendering</Typography>
        <StatefulConditionalRendering />
        <ComputedConditionalRendering items={testItems} />
      </section>

      <section>
        <Typography variant="h5">Controls</Typography>
        <Box display="flex" flexWrap="wrap" gap={1}>
          <AntdButton onClick={() => setComplexState(prev => ({
            ...prev,
            user: prev.user.role === 'admin' ? { id: '1', role: 'user' } : { id: '1', role: 'admin' }
          }))}>
            Toggle User Role
          </AntdButton>
          
          <AntdButton onClick={() => setLogicalState(prev => ({
            ...prev,
            isLoggedIn: !prev.isLoggedIn
          }))}>
            Toggle Login
          </AntdButton>
          
          <AntdButton onClick={() => setSystemState(prev => ({
            ...prev,
            system: { ...prev.system, maintenance: !prev.system.maintenance }
          }))}>
            Toggle Maintenance
          </AntdButton>
          
          <AntdButton onClick={() => setConditionalProps(prev => ({
            ...prev,
            mode: prev.mode === 'primary' ? 'secondary' : prev.mode === 'secondary' ? 'danger' : 'primary'
          }))}>
            Cycle Mode
          </AntdButton>
          
          <AntdButton onClick={() => setStylingState(prev => ({
            ...prev,
            theme: prev.theme === 'light' ? 'dark' : 'light'
          }))}>
            Toggle Theme
          </AntdButton>
        </Box>
      </section>
    </div>
  );
};

export default ConditionalRenderingTests;
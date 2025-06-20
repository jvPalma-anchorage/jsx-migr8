import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';

// Auth hook
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  permissions: string[];
  isLoading: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  permissions: string[];
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkPermission: (permission: string) => boolean;
  requirePermissions: (requiredPermissions: string[]) => {
    hasPermission: boolean;
    missingPermissions: string[];
  };
}

const useAuth = (): UseAuthReturn => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, permissions } = useSelector((state: any) => ({
    user: state.auth.user,
    isAuthenticated: state.auth.isAuthenticated,
    permissions: state.auth.permissions
  }));

  const login = useCallback(async (credentials: LoginCredentials) => {
    dispatch({ type: 'LOGIN', payload: credentials });
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, [dispatch]);

  const checkPermission = useCallback((permission: string): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const requirePermissions = useCallback((requiredPermissions: string[]) => {
    const missingPermissions = requiredPermissions.filter(
      permission => !permissions.includes(permission)
    );
    
    return {
      hasPermission: missingPermissions.length === 0,
      missingPermissions
    };
  }, [permissions]);

  return {
    user,
    isAuthenticated,
    permissions,
    login,
    logout,
    checkPermission,
    requirePermissions
  };
};

// Data fetching hook
interface UseDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface DataFetcherConfig {
  endpoint: string;
  dependencies?: any[];
  pollInterval?: number;
  cache?: boolean;
  enabled?: boolean;
}

const useData = <T,>(config: DataFetcherConfig): UseDataReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef(new Map<string, { data: T; timestamp: number }>());
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (config.enabled === false) return;

    try {
      setIsLoading(true);
      setError(null);

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Check cache first
      if (config.cache) {
        const cached = cacheRef.current.get(config.endpoint);
        if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
          setData(cached.data);
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch(config.endpoint, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: T = await response.json();

      if (config.cache) {
        cacheRef.current.set(config.endpoint, { data: result, timestamp: Date.now() });
      }

      setData(result);
      setIsLoading(false);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }
      
      setError(error instanceof Error ? error.message : 'An error occurred');
      setIsLoading(false);
    }
  }, [config.endpoint, config.cache, config.enabled]);

  // Effect for initial fetch and dependencies
  useEffect(() => {
    fetchData();
  }, [fetchData, ...(config.dependencies || [])]);

  // Effect for polling
  useEffect(() => {
    if (config.pollInterval && config.enabled !== false) {
      pollTimerRef.current = setInterval(() => {
        fetchData();
      }, config.pollInterval);

      return () => {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
        }
      };
    }
  }, [config.pollInterval, fetchData, config.enabled]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
};

// Theme hook
interface Theme {
  type: ThemeType;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  spacing: {
    small: string;
    medium: string;
    large: string;
  };
}

type ThemeType = 'light' | 'dark';

interface UseThemeReturn {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

const useTheme = (): UseThemeReturn => {
  const getThemeConfig = useCallback((type: ThemeType): Theme => {
    const themes = {
      light: {
        type: 'light' as ThemeType,
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#000000'
        },
        spacing: {
          small: '8px',
          medium: '16px',
          large: '24px'
        }
      },
      dark: {
        type: 'dark' as ThemeType,
        colors: {
          primary: '#0d6efd',
          secondary: '#6c757d',
          background: '#121212',
          text: '#ffffff'
        },
        spacing: {
          small: '8px',
          medium: '16px',
          large: '24px'
        }
      }
    };

    return themes[type];
  }, []);

  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeType || 'light';
    return getThemeConfig(savedTheme);
  });

  const setTheme = useCallback((type: ThemeType) => {
    const newTheme = getThemeConfig(type);
    setThemeState(newTheme);
    localStorage.setItem('theme', type);
  }, [getThemeConfig]);

  const toggleTheme = useCallback(() => {
    const newType = theme.type === 'light' ? 'dark' : 'light';
    setTheme(newType);
  }, [theme.type, setTheme]);

  return {
    theme,
    toggleTheme,
    setTheme
  };
};

// Permission guard hook
interface UsePermissionGuardOptions {
  requiredPermissions: string[];
  redirectTo?: string;
  fallbackComponent?: React.ComponentType;
}

const usePermissionGuard = (options: UsePermissionGuardOptions) => {
  const { checkPermission, requirePermissions } = useAuth();
  
  const { hasPermission, missingPermissions } = requirePermissions(options.requiredPermissions);
  
  useEffect(() => {
    if (!hasPermission) {
      console.warn('User lacks required permissions:', missingPermissions);
    }
  }, [hasPermission, missingPermissions]);

  return {
    hasPermission,
    missingPermissions,
    PermissionGuard: ({ children }: { children: React.ReactNode }) => {
      if (!hasPermission) {
        if (options.fallbackComponent) {
          const FallbackComponent = options.fallbackComponent;
          return <FallbackComponent />;
        }
        return <UnauthorizedMessage permissions={options.requiredPermissions} />;
      }
      return <>{children}</>;
    }
  };
};

// Example usage components with hooks
interface UserProfileProps {
  userId: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const { user, isAuthenticated } = useAuth();
  const { data: userData, isLoading, error, refetch } = useData<User>({
    endpoint: `/api/user/${userId}`,
    dependencies: [userId],
    cache: true
  });
  const { theme, toggleTheme } = useTheme();
  const { PermissionGuard } = usePermissionGuard({
    requiredPermissions: ['READ_PROFILE']
  });

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <PermissionGuard>
      <div style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}>
        <h1>User Profile</h1>
        {isLoading && <div>Loading...</div>}
        {error && <div>Error: {error}</div>}
        {userData && (
          <>
            <p>Current User: {user?.name}</p>
            <p>Profile Data: {userData.name}</p>
            <button onClick={toggleTheme}>Toggle Theme</button>
            <button onClick={refetch}>Refresh Data</button>
          </>
        )}
      </div>
    </PermissionGuard>
  );
};

const AdminPanel: React.FC = () => {
  const { user, checkPermission, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { PermissionGuard } = usePermissionGuard({
    requiredPermissions: ['ADMIN', 'WRITE_USERS']
  });

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <PermissionGuard>
      <div style={{ backgroundColor: theme.colors.background }}>
        <h1>Admin Panel</h1>
        <p>Welcome, {user?.name}</p>
        {checkPermission('ADMIN') && <button>Admin Actions</button>}
      </div>
    </PermissionGuard>
  );
};

// Login and error components
const LoginForm: React.FC = () => {
  const { login } = useAuth();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email: 'test@example.com', password: 'password' });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );
};

const UnauthorizedMessage: React.FC<{ permissions: string[] }> = ({ permissions }) => (
  <div>
    <h2>Unauthorized</h2>
    <p>You need the following permissions: {permissions.join(', ')}</p>
  </div>
);

export { 
  useAuth, 
  useData, 
  useTheme, 
  usePermissionGuard, 
  UserProfile, 
  AdminPanel 
};
export type { UseAuthReturn, UseDataReturn, UseThemeReturn };
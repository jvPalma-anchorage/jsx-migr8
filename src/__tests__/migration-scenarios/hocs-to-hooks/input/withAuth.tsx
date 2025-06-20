import React, { Component, ComponentType } from 'react';
import { connect } from 'react-redux';

// Auth HOC
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

interface WithAuthProps {
  user: User | null;
  isAuthenticated: boolean;
  permissions: string[];
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkPermission: (permission: string) => boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

// HOC that provides authentication
function withAuth<P extends object>(
  WrappedComponent: ComponentType<P & WithAuthProps>,
  requiredPermissions?: string[]
) {
  class WithAuthComponent extends Component<P & Partial<WithAuthProps>> {
    componentDidMount() {
      if (requiredPermissions && this.props.checkPermission) {
        const hasPermission = requiredPermissions.every(permission =>
          this.props.checkPermission!(permission)
        );
        
        if (!hasPermission) {
          console.warn('User lacks required permissions:', requiredPermissions);
        }
      }
    }

    render() {
      const { user, isAuthenticated, permissions, login, logout, checkPermission, ...rest } = this.props;

      if (!isAuthenticated) {
        return <LoginForm onLogin={login!} />;
      }

      if (requiredPermissions) {
        const hasPermission = requiredPermissions.every(permission =>
          checkPermission!(permission)
        );

        if (!hasPermission) {
          return <UnauthorizedMessage permissions={requiredPermissions} />;
        }
      }

      return (
        <WrappedComponent
          {...(rest as P)}
          user={user!}
          isAuthenticated={isAuthenticated!}
          permissions={permissions!}
          login={login!}
          logout={logout!}
          checkPermission={checkPermission!}
        />
      );
    }
  }

  const mapStateToProps = (state: any) => ({
    user: state.auth.user,
    isAuthenticated: state.auth.isAuthenticated,
    permissions: state.auth.permissions
  });

  const mapDispatchToProps = {
    login: (credentials: LoginCredentials) => ({ type: 'LOGIN', payload: credentials }),
    logout: () => ({ type: 'LOGOUT' }),
    checkPermission: (permission: string) => ({ type: 'CHECK_PERMISSION', payload: permission })
  };

  return connect(mapStateToProps, mapDispatchToProps)(WithAuthComponent);
}

// Data fetching HOC
interface WithDataProps<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface DataFetcherConfig {
  endpoint: string;
  dependencies?: any[];
  pollInterval?: number;
  cache?: boolean;
}

function withData<T, P extends object>(
  config: DataFetcherConfig
) {
  return function(WrappedComponent: ComponentType<P & WithDataProps<T>>) {
    class WithDataComponent extends Component<P, { data: T | null; isLoading: boolean; error: string | null }> {
      private pollTimer: NodeJS.Timeout | null = null;
      private cache = new Map<string, { data: T; timestamp: number }>();

      constructor(props: P) {
        super(props);
        this.state = {
          data: null,
          isLoading: true,
          error: null
        };
      }

      componentDidMount() {
        this.fetchData();
        
        if (config.pollInterval) {
          this.pollTimer = setInterval(() => {
            this.fetchData();
          }, config.pollInterval);
        }
      }

      componentDidUpdate(prevProps: P) {
        if (config.dependencies) {
          const depsChanged = config.dependencies.some((dep, index) => {
            const currentDep = this.getDependencyValue(dep);
            const prevDep = this.getDependencyValue(dep, prevProps);
            return currentDep !== prevDep;
          });

          if (depsChanged) {
            this.fetchData();
          }
        }
      }

      componentWillUnmount() {
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
        }
      }

      getDependencyValue = (dep: string, props: P = this.props) => {
        return (props as any)[dep];
      };

      fetchData = async () => {
        try {
          this.setState({ isLoading: true, error: null });

          // Check cache first
          if (config.cache) {
            const cached = this.cache.get(config.endpoint);
            if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
              this.setState({ data: cached.data, isLoading: false });
              return;
            }
          }

          const response = await fetch(config.endpoint);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data: T = await response.json();

          if (config.cache) {
            this.cache.set(config.endpoint, { data, timestamp: Date.now() });
          }

          this.setState({ data, isLoading: false });
        } catch (error) {
          this.setState({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false
          });
        }
      };

      render() {
        const { data, isLoading, error } = this.state;

        return (
          <WrappedComponent
            {...this.props}
            data={data}
            isLoading={isLoading}
            error={error}
            refetch={this.fetchData}
          />
        );
      }
    }

    return WithDataComponent;
  };
}

// Theme HOC
interface WithThemeProps {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

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

function withTheme<P extends object>(WrappedComponent: ComponentType<P & WithThemeProps>) {
  class WithThemeComponent extends Component<P, { theme: Theme }> {
    constructor(props: P) {
      super(props);
      
      const savedTheme = localStorage.getItem('theme') as ThemeType || 'light';
      this.state = {
        theme: this.getThemeConfig(savedTheme)
      };
    }

    getThemeConfig = (type: ThemeType): Theme => {
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
    };

    toggleTheme = () => {
      const newType = this.state.theme.type === 'light' ? 'dark' : 'light';
      this.setTheme(newType);
    };

    setTheme = (type: ThemeType) => {
      const newTheme = this.getThemeConfig(type);
      this.setState({ theme: newTheme });
      localStorage.setItem('theme', type);
    };

    render() {
      return (
        <WrappedComponent
          {...this.props}
          theme={this.state.theme}
          toggleTheme={this.toggleTheme}
          setTheme={this.setTheme}
        />
      );
    }
  }

  return WithThemeComponent;
}

// Example usage components
interface UserProfileProps {
  userId: string;
}

const UserProfile: React.FC<UserProfileProps & WithAuthProps & WithDataProps<User> & WithThemeProps> = ({
  userId,
  user,
  isAuthenticated,
  permissions,
  data: userData,
  isLoading,
  error,
  refetch,
  theme,
  toggleTheme
}) => {
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}>
      <h1>User Profile</h1>
      <p>Current User: {user?.name}</p>
      <p>Profile Data: {userData?.name}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={refetch}>Refresh Data</button>
    </div>
  );
};

const AdminPanel: React.FC<WithAuthProps & WithThemeProps> = ({
  user,
  permissions,
  checkPermission,
  theme
}) => {
  return (
    <div style={{ backgroundColor: theme.colors.background }}>
      <h1>Admin Panel</h1>
      <p>Welcome, {user?.name}</p>
      {checkPermission('ADMIN') && <button>Admin Actions</button>}
    </div>
  );
};

// Enhanced components with multiple HOCs
const EnhancedUserProfile = withAuth(
  withData<User, UserProfileProps & WithAuthProps>({
    endpoint: '/api/user',
    dependencies: ['userId'],
    cache: true
  })(
    withTheme(UserProfile)
  ),
  ['READ_PROFILE']
);

const EnhancedAdminPanel = withAuth(
  withTheme(AdminPanel),
  ['ADMIN', 'WRITE_USERS']
);

// Simple withData usage
const SomeComponent: React.FC = () => <div>Some Component</div>;
const DataComponent = withData({
  endpoint: '/api/data'
})(SomeComponent);

// More HOC usage examples
const AuthedComponent = withAuth(SomeComponent);
const ThemedComponent = withTheme(SomeComponent);

// Login and error components
const LoginForm: React.FC<{ onLogin: (credentials: LoginCredentials) => Promise<void> }> = ({ onLogin }) => (
  <form onSubmit={(e) => {
    e.preventDefault();
    onLogin({ email: 'test@example.com', password: 'password' });
  }}>
    <input type="email" placeholder="Email" />
    <input type="password" placeholder="Password" />
    <button type="submit">Login</button>
  </form>
);

const UnauthorizedMessage: React.FC<{ permissions: string[] }> = ({ permissions }) => (
  <div>
    <h2>Unauthorized</h2>
    <p>You need the following permissions: {permissions.join(', ')}</p>
  </div>
);

export { withAuth, withData, withTheme, EnhancedUserProfile, EnhancedAdminPanel };
export type { WithAuthProps, WithDataProps, WithThemeProps };
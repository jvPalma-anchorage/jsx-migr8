import React, { 
  createContext, 
  useContext, 
  useState, 
  useReducer, 
  useCallback, 
  useMemo,
  ReactNode 
} from 'react';

// Modern Context API with hooks and TypeScript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

interface Theme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

interface AppState {
  notifications: string[];
  settings: {
    language: string;
    timezone: string;
    autoSave: boolean;
  };
}

interface AppAction {
  type: 'ADD_NOTIFICATION' | 'REMOVE_NOTIFICATION' | 'UPDATE_SETTINGS';
  payload?: any;
}

// User Context
interface UserContextType {
  user: User;
  updateUser: (updates: Partial<User>) => void;
  isAdmin: () => boolean;
}

const UserContext = createContext<UserContextType | null>(null);

const UserProvider: React.FC<{ children: ReactNode; initialUser: User }> = ({ 
  children, 
  initialUser 
}) => {
  const [user, setUser] = useState<User>(initialUser);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prevUser => ({ ...prevUser, ...updates }));
  }, []);

  const isAdmin = useCallback(() => {
    return user.role === 'admin';
  }, [user.role]);

  const value = useMemo(() => ({
    user,
    updateUser,
    isAdmin
  }), [user, updateUser, isAdmin]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Theme Context
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const ThemeProvider: React.FC<{ children: ReactNode; initialTheme: Theme }> = ({ 
  children, 
  initialTheme 
}) => {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const toggleTheme = useCallback(() => {
    setThemeState(currentTheme => ({
      primary: currentTheme.primary === '#007bff' ? '#28a745' : '#007bff',
      secondary: '#6c757d',
      background: currentTheme.background === '#ffffff' ? '#121212' : '#ffffff',
      text: currentTheme.text === '#000000' ? '#ffffff' : '#000000'
    }));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const value = useMemo(() => ({
    theme,
    toggleTheme,
    setTheme
  }), [theme, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// App State Context with Reducer
const appStateReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((_, index) => index !== action.payload)
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    default:
      return state;
  }
};

interface AppStateContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addNotification: (message: string) => void;
  removeNotification: (index: number) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, {
    notifications: [],
    settings: {
      language: 'en',
      timezone: 'UTC',
      autoSave: true
    }
  });

  const addNotification = useCallback((message: string) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: message });
  }, []);

  const removeNotification = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: index });
  }, []);

  const updateSettings = useCallback((settings: Partial<AppState['settings']>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const value = useMemo(() => ({
    state,
    dispatch,
    addNotification,
    removeNotification,
    updateSettings
  }), [state, addNotification, removeNotification, updateSettings]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

// Combined Context Provider for better DX
const AppProviders: React.FC<{ 
  children: ReactNode;
  initialUser: User;
  initialTheme: Theme;
}> = ({ children, initialUser, initialTheme }) => {
  return (
    <UserProvider initialUser={initialUser}>
      <ThemeProvider initialTheme={initialTheme}>
        <AppStateProvider>
          {children}
        </AppStateProvider>
      </ThemeProvider>
    </UserProvider>
  );
};

// Modern component using hooks
const UserProfile: React.FC = () => {
  const { user, updateUser, isAdmin } = useUser();
  const { theme, toggleTheme } = useTheme();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateUser({ name: e.target.value });
  };

  return (
    <div style={{ backgroundColor: theme.background, color: theme.text }}>
      <h2>Modern User Profile</h2>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      {isAdmin() && <p>Admin privileges active</p>}
      
      <input
        type="text"
        value={user.name}
        onChange={handleNameChange}
        placeholder="Update name"
      />
      
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};

// Modern component with multiple contexts
const AppComponent: React.FC = () => {
  const { state, addNotification, removeNotification } = useAppState();

  const handleAddNotification = () => {
    addNotification(`Notification ${Date.now()}`);
  };

  const handleRemoveNotification = (index: number) => {
    removeNotification(index);
  };

  return (
    <div>
      <h3>Modern Context Component</h3>
      <p>Notifications: {state.notifications.length}</p>
      <p>Language: {state.settings.language}</p>
      <button onClick={handleAddNotification}>Add Notification</button>
      
      <ul>
        {state.notifications.map((notification, index) => (
          <li key={index}>
            {notification}
            <button onClick={() => handleRemoveNotification(index)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Custom hook combining multiple contexts
const useAppData = () => {
  const user = useUser();
  const theme = useTheme();
  const appState = useAppState();

  return {
    ...user,
    ...theme,
    ...appState
  };
};

// Modern component using combined hook
const EnhancedComponent: React.FC<{ title: string }> = ({ title }) => {
  const { user, theme, state } = useAppData();

  return (
    <div style={{ backgroundColor: theme.background, color: theme.text }}>
      <h2>{title}</h2>
      <p>User: {user.name}</p>
      <p>Notifications: {state.notifications.length}</p>
    </div>
  );
};

// Optimized context with selectors
interface OptimizedContextType<T> {
  subscribe: (selector: (state: T) => any, callback: () => void) => () => void;
  getSnapshot: (selector: (state: T) => any) => any;
}

const createOptimizedContext = <T,>() => {
  return createContext<OptimizedContextType<T> | null>(null);
};

// Context with performance optimizations
const OptimizedUserContext = createContext<{
  user: User;
  updateUser: (updates: Partial<User>) => void;
  isAdmin: () => boolean;
} | null>(null);

const OptimizedUserProvider: React.FC<{ 
  children: ReactNode; 
  initialUser: User 
}> = ({ children, initialUser }) => {
  const [user, setUser] = useState<User>(initialUser);
  
  // Memoize callbacks to prevent unnecessary re-renders
  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prevUser => ({ ...prevUser, ...updates }));
  }, []);

  const isAdmin = useCallback(() => {
    return user.role === 'admin';
  }, [user.role]);

  // Memoize the entire context value
  const contextValue = useMemo(() => ({
    user,
    updateUser,
    isAdmin
  }), [user, updateUser, isAdmin]);

  return (
    <OptimizedUserContext.Provider value={contextValue}>
      {children}
    </OptimizedUserContext.Provider>
  );
};

// Selector-based hook for fine-grained subscriptions
const useUserSelector = <T,>(selector: (user: User) => T): T => {
  const context = useContext(OptimizedUserContext);
  if (!context) {
    throw new Error('useUserSelector must be used within OptimizedUserProvider');
  }
  
  return useMemo(() => selector(context.user), [selector, context.user]);
};

// Example of selector usage
const UserName: React.FC = () => {
  const userName = useUserSelector(user => user.name);
  
  return <span>Welcome, {userName}!</span>;
};

// Main application component
const ModernApp: React.FC = () => {
  const initialUser: User = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin'
  };

  const initialTheme: Theme = {
    primary: '#007bff',
    secondary: '#6c757d',
    background: '#ffffff',
    text: '#000000'
  };

  return (
    <AppProviders initialUser={initialUser} initialTheme={initialTheme}>
      <div>
        <h1>Modern Context Application</h1>
        <UserProfile />
        <AppComponent />
        <EnhancedComponent title="Enhanced Component" />
        
        <OptimizedUserProvider initialUser={initialUser}>
          <UserName />
        </OptimizedUserProvider>
      </div>
    </AppProviders>
  );
};

export default ModernApp;
export {
  UserProvider,
  ThemeProvider,
  AppStateProvider,
  AppProviders,
  UserProfile,
  AppComponent,
  EnhancedComponent,
  OptimizedUserProvider,
  useUser,
  useTheme,
  useAppState,
  useAppData,
  useUserSelector
};
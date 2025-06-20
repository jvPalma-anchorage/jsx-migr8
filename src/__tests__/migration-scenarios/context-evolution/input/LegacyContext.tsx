import React, { Component, createContext } from 'react';
import PropTypes from 'prop-types';

// Legacy Context API (React < 16.3)
interface LegacyUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

interface LegacyTheme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

// Legacy context using getChildContext (deprecated)
class LegacyUserProvider extends Component<
  { children: React.ReactNode; user: LegacyUser },
  {}
> {
  static childContextTypes = {
    user: PropTypes.object,
    updateUser: PropTypes.func,
    isAdmin: PropTypes.func
  };

  getChildContext() {
    return {
      user: this.props.user,
      updateUser: this.updateUser,
      isAdmin: this.isAdmin
    };
  }

  updateUser = (updates: Partial<LegacyUser>) => {
    // Legacy update logic
    console.log('Updating user:', updates);
  };

  isAdmin = () => {
    return this.props.user.role === 'admin';
  };

  render() {
    return <div>{this.props.children}</div>;
  }
}

class LegacyThemeProvider extends Component<
  { children: React.ReactNode; theme: LegacyTheme },
  { currentTheme: LegacyTheme }
> {
  static childContextTypes = {
    theme: PropTypes.object,
    toggleTheme: PropTypes.func
  };

  constructor(props: any) {
    super(props);
    this.state = {
      currentTheme: props.theme
    };
  }

  getChildContext() {
    return {
      theme: this.state.currentTheme,
      toggleTheme: this.toggleTheme
    };
  }

  toggleTheme = () => {
    const { currentTheme } = this.state;
    const newTheme: LegacyTheme = {
      primary: currentTheme.primary === '#007bff' ? '#28a745' : '#007bff',
      secondary: '#6c757d',
      background: currentTheme.background === '#ffffff' ? '#121212' : '#ffffff',
      text: currentTheme.text === '#000000' ? '#ffffff' : '#000000'
    };
    this.setState({ currentTheme: newTheme });
  };

  render() {
    return <div>{this.props.children}</div>;
  }
}

// Legacy context consumer using contextTypes
class LegacyUserProfile extends Component<{}, {}> {
  static contextTypes = {
    user: PropTypes.object,
    updateUser: PropTypes.func,
    isAdmin: PropTypes.func,
    theme: PropTypes.object,
    toggleTheme: PropTypes.func
  };

  context!: {
    user: LegacyUser;
    updateUser: (updates: Partial<LegacyUser>) => void;
    isAdmin: () => boolean;
    theme: LegacyTheme;
    toggleTheme: () => void;
  };

  handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.context.updateUser({ name: e.target.value });
  };

  render() {
    const { user, isAdmin, theme, toggleTheme } = this.context;

    return (
      <div style={{ backgroundColor: theme.background, color: theme.text }}>
        <h2>Legacy User Profile</h2>
        <p>Name: {user.name}</p>
        <p>Email: {user.email}</p>
        <p>Role: {user.role}</p>
        {isAdmin() && <p>Admin privileges active</p>}
        
        <input
          type="text"
          value={user.name}
          onChange={this.handleNameChange}
          placeholder="Update name"
        />
        
        <button onClick={toggleTheme}>Toggle Theme</button>
      </div>
    );
  }
}

// Mixed approach - Old context + New Context API (React 16.3+)
interface AppState {
  notifications: string[];
  settings: {
    language: string;
    timezone: string;
    autoSave: boolean;
  };
}

const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<any>;
} | null>(null);

interface AppAction {
  type: 'ADD_NOTIFICATION' | 'REMOVE_NOTIFICATION' | 'UPDATE_SETTINGS';
  payload?: any;
}

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

class MixedAppProvider extends Component<
  { children: React.ReactNode },
  { appState: AppState }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      appState: {
        notifications: [],
        settings: {
          language: 'en',
          timezone: 'UTC',
          autoSave: true
        }
      }
    };
  }

  dispatch = (action: AppAction) => {
    this.setState(prevState => ({
      appState: appStateReducer(prevState.appState, action)
    }));
  };

  render() {
    return (
      <AppStateContext.Provider 
        value={{ 
          state: this.state.appState, 
          dispatch: this.dispatch 
        }}
      >
        {this.props.children}
      </AppStateContext.Provider>
    );
  }
}

// Component using mixed context patterns
class MixedComponent extends Component {
  static contextTypes = {
    user: PropTypes.object,
    theme: PropTypes.object
  };

  static contextType = AppStateContext;
  context!: { state: AppState; dispatch: React.Dispatch<any> } | null;

  addNotification = () => {
    if (this.context) {
      this.context.dispatch({
        type: 'ADD_NOTIFICATION',
        payload: `Notification ${Date.now()}`
      });
    }
  };

  render() {
    if (!this.context) return null;

    const { state } = this.context;

    return (
      <div>
        <h3>Mixed Context Component</h3>
        <p>Notifications: {state.notifications.length}</p>
        <p>Language: {state.settings.language}</p>
        <button onClick={this.addNotification}>Add Notification</button>
        
        <ul>
          {state.notifications.map((notification, index) => (
            <li key={index}>{notification}</li>
          ))}
        </ul>
      </div>
    );
  }
}

// Higher-Order Component using context
function withLegacyContext<P extends object>(
  WrappedComponent: React.ComponentType<P & {
    user: LegacyUser;
    theme: LegacyTheme;
    appState: AppState;
  }>
) {
  class WithLegacyContext extends Component<P> {
    static contextTypes = {
      user: PropTypes.object,
      theme: PropTypes.object
    };

    static contextType = AppStateContext;
    context!: { state: AppState; dispatch: React.Dispatch<any> } | null;

    render() {
      const legacyContext = this.context as any; // Legacy context
      const newContext = this.context; // New context

      if (!newContext) return null;

      return (
        <WrappedComponent
          {...(this.props as P)}
          user={legacyContext.user}
          theme={legacyContext.theme}
          appState={newContext.state}
        />
      );
    }
  }

  return WithLegacyContext;
}

// Example usage
const EnhancedComponent = withLegacyContext<{ title: string }>(
  ({ title, user, theme, appState }) => (
    <div style={{ backgroundColor: theme.background }}>
      <h2>{title}</h2>
      <p>User: {user.name}</p>
      <p>Notifications: {appState.notifications.length}</p>
    </div>
  )
);

// Main application component
class LegacyApp extends Component {
  render() {
    const user: LegacyUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin'
    };

    const theme: LegacyTheme = {
      primary: '#007bff',
      secondary: '#6c757d',
      background: '#ffffff',
      text: '#000000'
    };

    return (
      <LegacyUserProvider user={user}>
        <LegacyThemeProvider theme={theme}>
          <MixedAppProvider>
            <div>
              <h1>Legacy Context Application</h1>
              <LegacyUserProfile />
              <MixedComponent />
              <EnhancedComponent title="Enhanced Component" />
            </div>
          </MixedAppProvider>
        </LegacyThemeProvider>
      </LegacyUserProvider>
    );
  }
}

export default LegacyApp;
export {
  LegacyUserProvider,
  LegacyThemeProvider,
  LegacyUserProfile,
  MixedAppProvider,
  MixedComponent,
  withLegacyContext,
  EnhancedComponent,
  AppStateContext
};
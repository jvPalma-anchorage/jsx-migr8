import React, { Component, PureComponent, createRef, RefObject } from 'react';

// Type definitions
interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

interface ApiResponse<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

// Context for theme
const ThemeContext = React.createContext({
  theme: 'light',
  toggleTheme: () => {}
});

// Higher-Order Component
function withAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return class WithAuthComponent extends Component<P> {
    state = {
      isAuthenticated: false,
      user: null as User | null
    };

    componentDidMount() {
      // Simulate auth check
      setTimeout(() => {
        this.setState({
          isAuthenticated: true,
          user: { id: 1, name: 'John Doe', email: 'john@example.com', active: true }
        });
      }, 1000);
    }

    render() {
      if (!this.state.isAuthenticated) {
        return <div>Authenticating...</div>;
      }

      return <WrappedComponent {...this.props} user={this.state.user} />;
    }
  };
}

// Class component with complex lifecycle methods
class UserProfile extends Component<{ userId: number }> {
  state = {
    user: null as User | null,
    loading: true,
    error: null as string | null,
    editing: false,
    formData: {
      name: '',
      email: ''
    }
  };

  private inputRef: RefObject<HTMLInputElement> = createRef();
  private timeoutId: number | null = null;

  componentDidMount() {
    this.fetchUser();
    window.addEventListener('keydown', this.handleKeyDown);
  }

  componentDidUpdate(prevProps: { userId: number }) {
    if (prevProps.userId !== this.props.userId) {
      this.fetchUser();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  fetchUser = async () => {
    this.setState({ loading: true, error: null });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user: User = {
        id: this.props.userId,
        name: `User ${this.props.userId}`,
        email: `user${this.props.userId}@example.com`,
        active: true
      };
      
      this.setState({ 
        user, 
        loading: false,
        formData: {
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      this.setState({ 
        loading: false, 
        error: 'Failed to fetch user' 
      });
    }
  };

  handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.state.editing) {
      this.setState({ editing: false });
    }
  };

  handleEdit = () => {
    this.setState({ editing: true }, () => {
      if (this.inputRef.current) {
        this.inputRef.current.focus();
      }
    });
  };

  handleSave = () => {
    const { formData } = this.state;
    
    // Simulate save delay
    this.timeoutId = window.setTimeout(() => {
      this.setState(prevState => ({
        user: prevState.user ? {
          ...prevState.user,
          name: formData.name,
          email: formData.email
        } : null,
        editing: false
      }));
    }, 500);
  };

  handleCancel = () => {
    const { user } = this.state;
    this.setState({
      editing: false,
      formData: {
        name: user?.name || '',
        email: user?.email || ''
      }
    });
  };

  handleInputChange = (field: string, value: string) => {
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        [field]: value
      }
    }));
  };

  render() {
    const { user, loading, error, editing, formData } = this.state;

    if (loading) {
      return <div style={{ padding: '20px' }}>Loading user...</div>;
    }

    if (error) {
      return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
    }

    if (!user) {
      return <div style={{ padding: '20px' }}>No user found</div>;
    }

    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
        <h3>User Profile</h3>
        {editing ? (
          <div>
            <div style={{ marginBottom: '10px' }}>
              <label>Name: </label>
              <input
                ref={this.inputRef}
                type="text"
                value={formData.name}
                onChange={(e) => this.handleInputChange('name', e.target.value)}
                style={{ padding: '5px', marginLeft: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Email: </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => this.handleInputChange('email', e.target.value)}
                style={{ padding: '5px', marginLeft: '5px' }}
              />
            </div>
            <button onClick={this.handleSave} style={{ marginRight: '5px' }}>
              Save
            </button>
            <button onClick={this.handleCancel}>
              Cancel
            </button>
          </div>
        ) : (
          <div>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Status:</strong> {user.active ? 'Active' : 'Inactive'}</p>
            <button onClick={this.handleEdit}>Edit</button>
          </div>
        )}
      </div>
    );
  }
}

// PureComponent with shallow comparison optimization
class OptimizedCounter extends PureComponent<{ 
  initialValue: number;
  onCountChange: (count: number) => void;
}> {
  state = {
    count: this.props.initialValue,
    history: [] as number[]
  };

  static getDerivedStateFromProps(props: { initialValue: number }, state: { count: number }) {
    // Reset count if initialValue changes
    if (props.initialValue !== state.count && state.history.length === 0) {
      return {
        count: props.initialValue
      };
    }
    return null;
  }

  componentDidUpdate(prevProps: { initialValue: number }, prevState: { count: number }) {
    if (prevState.count !== this.state.count) {
      this.props.onCountChange(this.state.count);
    }
  }

  increment = () => {
    this.setState(prevState => ({
      count: prevState.count + 1,
      history: [...prevState.history, prevState.count]
    }));
  };

  decrement = () => {
    this.setState(prevState => ({
      count: prevState.count - 1,
      history: [...prevState.history, prevState.count]
    }));
  };

  reset = () => {
    this.setState({
      count: this.props.initialValue,
      history: []
    });
  };

  render() {
    const { count, history } = this.state;
    
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
        <h3>Optimized Counter (PureComponent)</h3>
        <p><strong>Count:</strong> {count}</p>
        <div style={{ marginBottom: '10px' }}>
          <button onClick={this.increment} style={{ marginRight: '5px' }}>+</button>
          <button onClick={this.decrement} style={{ marginRight: '5px' }}>-</button>
          <button onClick={this.reset}>Reset</button>
        </div>
        {history.length > 0 && (
          <div>
            <strong>History:</strong> {history.join(' → ')} → {count}
          </div>
        )}
      </div>
    );
  }
}

// Class component with error boundary
class ErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '20px', border: '2px solid red', margin: '10px' }}>
          <h3>Something went wrong!</h3>
          <p>Error: {this.state.error?.message}</p>
          <button onClick={this.handleReset}>Try Again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Component that can trigger errors for testing
class ErrorProneComponent extends Component<{}, { shouldError: boolean }> {
  state = { shouldError: false };

  triggerError = () => {
    this.setState({ shouldError: true });
  };

  render() {
    if (this.state.shouldError) {
      throw new Error('Intentional error for testing error boundary');
    }

    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
        <h3>Error Prone Component</h3>
        <button onClick={this.triggerError}>Trigger Error</button>
      </div>
    );
  }
}

// Class component using context
class ThemedComponent extends Component {
  static contextType = ThemeContext;
  context!: React.ContextType<typeof ThemeContext>;

  render() {
    const { theme, toggleTheme } = this.context;
    
    return (
      <div style={{ 
        padding: '20px', 
        border: '1px solid #ccc', 
        margin: '10px',
        backgroundColor: theme === 'light' ? '#fff' : '#333',
        color: theme === 'light' ? '#000' : '#fff'
      }}>
        <h3>Themed Component</h3>
        <p>Current theme: {theme}</p>
        <button onClick={toggleTheme}>Toggle Theme</button>
      </div>
    );
  }
}

// Class component with complex state and multiple refs
class FormComponent extends Component<{}, {
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    message: string;
  };
  errors: Record<string, string>;
  submitting: boolean;
  submitted: boolean;
}> {
  state = {
    formData: {
      firstName: '',
      lastName: '',
      email: '',
      message: ''
    },
    errors: {} as Record<string, string>,
    submitting: false,
    submitted: false
  };

  private firstNameRef: RefObject<HTMLInputElement> = createRef();
  private lastNameRef: RefObject<HTMLInputElement> = createRef();
  private emailRef: RefObject<HTMLInputElement> = createRef();
  private messageRef: RefObject<HTMLTextAreaElement> = createRef();

  componentDidMount() {
    // Focus first input on mount
    if (this.firstNameRef.current) {
      this.firstNameRef.current.focus();
    }
  }

  validateForm = (): boolean => {
    const { formData } = this.state;
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.message.trim()) {
      errors.message = 'Message is required';
    }

    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  handleInputChange = (field: string, value: string) => {
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        [field]: value
      },
      errors: {
        ...prevState.errors,
        [field]: '' // Clear error when user starts typing
      }
    }));
  };

  handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!this.validateForm()) {
      return;
    }

    this.setState({ submitting: true });

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.setState({ 
        submitting: false, 
        submitted: true,
        formData: {
          firstName: '',
          lastName: '',
          email: '',
          message: ''
        }
      });

      // Focus back to first input
      if (this.firstNameRef.current) {
        this.firstNameRef.current.focus();
      }

      // Reset submitted status after 3 seconds
      setTimeout(() => {
        this.setState({ submitted: false });
      }, 3000);

    } catch (error) {
      this.setState({ 
        submitting: false,
        errors: { submit: 'Failed to submit form. Please try again.' }
      });
    }
  };

  render() {
    const { formData, errors, submitting, submitted } = this.state;

    if (submitted) {
      return (
        <div style={{ padding: '20px', border: '1px solid green', margin: '10px' }}>
          <h3>Form Submitted Successfully!</h3>
          <p>Thank you for your message. We'll get back to you soon.</p>
        </div>
      );
    }

    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
        <h3>Contact Form</h3>
        <form onSubmit={this.handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label>First Name:</label>
            <input
              ref={this.firstNameRef}
              type="text"
              value={formData.firstName}
              onChange={(e) => this.handleInputChange('firstName', e.target.value)}
              style={{ 
                padding: '5px', 
                marginLeft: '5px', 
                width: '200px',
                border: errors.firstName ? '2px solid red' : '1px solid #ccc'
              }}
              disabled={submitting}
            />
            {errors.firstName && (
              <div style={{ color: 'red', fontSize: '12px' }}>{errors.firstName}</div>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Last Name:</label>
            <input
              ref={this.lastNameRef}
              type="text"
              value={formData.lastName}
              onChange={(e) => this.handleInputChange('lastName', e.target.value)}
              style={{ 
                padding: '5px', 
                marginLeft: '5px', 
                width: '200px',
                border: errors.lastName ? '2px solid red' : '1px solid #ccc'
              }}
              disabled={submitting}
            />
            {errors.lastName && (
              <div style={{ color: 'red', fontSize: '12px' }}>{errors.lastName}</div>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Email:</label>
            <input
              ref={this.emailRef}
              type="email"
              value={formData.email}
              onChange={(e) => this.handleInputChange('email', e.target.value)}
              style={{ 
                padding: '5px', 
                marginLeft: '5px', 
                width: '200px',
                border: errors.email ? '2px solid red' : '1px solid #ccc'
              }}
              disabled={submitting}
            />
            {errors.email && (
              <div style={{ color: 'red', fontSize: '12px' }}>{errors.email}</div>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Message:</label>
            <textarea
              ref={this.messageRef}
              value={formData.message}
              onChange={(e) => this.handleInputChange('message', e.target.value)}
              style={{ 
                padding: '5px', 
                marginLeft: '5px', 
                width: '300px', 
                height: '100px',
                border: errors.message ? '2px solid red' : '1px solid #ccc'
              }}
              disabled={submitting}
            />
            {errors.message && (
              <div style={{ color: 'red', fontSize: '12px' }}>{errors.message}</div>
            )}
          </div>

          {errors.submit && (
            <div style={{ color: 'red', marginBottom: '15px' }}>{errors.submit}</div>
          )}

          <button 
            type="submit" 
            disabled={submitting}
            style={{ 
              padding: '10px 20px',
              backgroundColor: submitting ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    );
  }
}

// Theme provider component
class ThemeProvider extends Component<
  { children: React.ReactNode },
  { theme: 'light' | 'dark' }
> {
  state = { theme: 'light' as 'light' | 'dark' };

  toggleTheme = () => {
    this.setState(prevState => ({
      theme: prevState.theme === 'light' ? 'dark' : 'light'
    }));
  };

  render() {
    return (
      <ThemeContext.Provider 
        value={{ 
          theme: this.state.theme, 
          toggleTheme: this.toggleTheme 
        }}
      >
        {this.props.children}
      </ThemeContext.Provider>
    );
  }
}

// Main App component using HOC
const AuthenticatedUserProfile = withAuth(UserProfile);

class App extends Component<{}, { 
  currentUserId: number;
  counterValue: number;
}> {
  state = {
    currentUserId: 1,
    counterValue: 0
  };

  handleUserChange = () => {
    this.setState(prevState => ({
      currentUserId: prevState.currentUserId === 1 ? 2 : 1
    }));
  };

  handleCounterChange = (count: number) => {
    this.setState({ counterValue: count });
  };

  render() {
    const { currentUserId, counterValue } = this.state;

    return (
      <ThemeProvider>
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
          <h1>Class Components Migration Demo</h1>
          <p>
            This application demonstrates various class component patterns that need 
            migration to hooks:
          </p>
          <ul>
            <li>Lifecycle methods (componentDidMount, componentDidUpdate, componentWillUnmount)</li>
            <li>State management with this.setState</li>
            <li>Refs with createRef</li>
            <li>Context consumption with static contextType</li>
            <li>PureComponent optimizations</li>
            <li>Error boundaries</li>
            <li>Higher-order components (HOCs)</li>
            <li>getDerivedStateFromProps</li>
          </ul>

          <div style={{ marginTop: '30px' }}>
            <h2>Demo Components</h2>
            
            <ErrorBoundary>
              <AuthenticatedUserProfile userId={currentUserId} />
              <button onClick={this.handleUserChange} style={{ margin: '10px' }}>
                Switch User (ID: {currentUserId === 1 ? 2 : 1})
              </button>
            </ErrorBoundary>

            <OptimizedCounter 
              initialValue={0} 
              onCountChange={this.handleCounterChange}
            />
            <p style={{ margin: '10px', fontWeight: 'bold' }}>
              Counter value from parent: {counterValue}
            </p>

            <ThemedComponent />

            <FormComponent />

            <ErrorBoundary>
              <ErrorProneComponent />
            </ErrorBoundary>
          </div>
        </div>
      </ThemeProvider>
    );
  }
}

export default App;
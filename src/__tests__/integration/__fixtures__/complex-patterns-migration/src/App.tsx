import React, { Component, useState, useEffect, createContext, useContext, cloneElement } from 'react';

// Type definitions
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Context for authentication
const AuthContext = createContext<{
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
} | null>(null);

// =============================================================================
// 1. HIGHER-ORDER COMPONENTS (HOCs)
// =============================================================================

// HOC for data fetching
function withDataFetching<T, P extends object>(
  WrappedComponent: React.ComponentType<P & { data: T | null; loading: boolean; error: string | null }>,
  fetchUrl: string
) {
  return function WithDataFetchingComponent(props: P) {
    const [state, setState] = useState<DataState<T>>({
      data: null,
      loading: true,
      error: null
    });

    useEffect(() => {
      const fetchData = async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock data based on URL
          let mockData: T;
          if (fetchUrl.includes('users')) {
            mockData = [
              { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
              { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' }
            ] as T;
          } else {
            mockData = { message: 'Hello from API' } as T;
          }
          
          setState({ data: mockData, loading: false, error: null });
        } catch (error) {
          setState({ data: null, loading: false, error: 'Failed to fetch data' });
        }
      };

      fetchData();
    }, [fetchUrl]);

    return <WrappedComponent {...props} {...state} />;
  };
}

// HOC for authentication
function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P & { user: User | null }>
) {
  return function WithAuthComponent(props: P) {
    const authContext = useContext(AuthContext);
    
    if (!authContext) {
      throw new Error('withAuth must be used within AuthProvider');
    }

    const { user } = authContext;

    if (!user) {
      return (
        <div style={{ padding: '20px', border: '2px solid red' }}>
          <h3>Access Denied</h3>
          <p>You must be logged in to view this content.</p>
        </div>
      );
    }

    return <WrappedComponent {...props} user={user} />;
  };
}

// HOC for role-based access control
function withRoleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: Array<'admin' | 'user' | 'guest'>
) {
  return function WithRoleGuardComponent(props: P & { user?: User }) {
    const { user, ...restProps } = props;

    if (!user || !allowedRoles.includes(user.role)) {
      return (
        <div style={{ padding: '20px', border: '2px solid orange' }}>
          <h3>Insufficient Permissions</h3>
          <p>You don't have permission to access this content.</p>
          <p>Required roles: {allowedRoles.join(', ')}</p>
          <p>Your role: {user?.role || 'none'}</p>
        </div>
      );
    }

    return <WrappedComponent {...(restProps as P)} />;
  };
}

// HOC for loading states
function withLoadingSpinner<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithLoadingSpinnerComponent(props: P & { loading?: boolean }) {
    const { loading, ...restProps } = props;

    if (loading) {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          border: '1px solid #ccc' 
        }}>
          <div style={{ 
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p>Loading...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

    return <WrappedComponent {...(restProps as P)} />;
  };
}

// HOC composition example
const UserList: React.FC<{ 
  data: User[] | null; 
  loading: boolean; 
  error: string | null;
  user: User | null;
}> = ({ data, loading, error, user }) => {
  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>User List (HOC Pattern)</h3>
      <p>Logged in as: {user?.name} ({user?.role})</p>
      {data && (
        <ul>
          {data.map((user) => (
            <li key={user.id}>
              {user.name} - {user.email} ({user.role})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Compose multiple HOCs
const EnhancedUserList = withAuth(
  withRoleGuard(
    withLoadingSpinner(
      withDataFetching<User[]>(UserList, '/api/users')
    ),
    ['admin', 'user']
  )
);

// =============================================================================
// 2. RENDER PROPS PATTERN
// =============================================================================

// Mouse tracker with render props
class MouseTracker extends Component<{
  children: (mousePosition: { x: number; y: number }) => React.ReactNode;
}> {
  state = { x: 0, y: 0 };

  handleMouseMove = (event: MouseEvent) => {
    this.setState({
      x: event.clientX,
      y: event.clientY
    });
  };

  componentDidMount() {
    window.addEventListener('mousemove', this.handleMouseMove);
  }

  componentWillUnmount() {
    window.removeEventListener('mousemove', this.handleMouseMove);
  }

  render() {
    return this.props.children(this.state);
  }
}

// Data fetcher with render props
class DataFetcher extends Component<{
  url: string;
  children: (data: {
    data: any;
    loading: boolean;
    error: string | null;
    refetch: () => void;
  }) => React.ReactNode;
}> {
  state = {
    data: null,
    loading: true,
    error: null as string | null
  };

  fetchData = async () => {
    this.setState({ loading: true, error: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data based on URL
      const mockData = this.props.url.includes('posts') 
        ? [
            { id: 1, title: 'First Post', content: 'This is the first post' },
            { id: 2, title: 'Second Post', content: 'This is the second post' }
          ]
        : { message: 'Data fetched successfully' };
      
      this.setState({ data: mockData, loading: false });
    } catch (error) {
      this.setState({ 
        loading: false, 
        error: 'Failed to fetch data' 
      });
    }
  };

  componentDidMount() {
    this.fetchData();
  }

  render() {
    return this.props.children({
      ...this.state,
      refetch: this.fetchData
    });
  }
}

// Toggle component with render props
class Toggle extends Component<{
  initial?: boolean;
  children: (toggleState: {
    on: boolean;
    toggle: () => void;
    setOn: (value: boolean) => void;
    setOff: () => void;
  }) => React.ReactNode;
}> {
  state = { on: this.props.initial || false };

  toggle = () => {
    this.setState(prevState => ({ on: !prevState.on }));
  };

  setOn = (value: boolean) => {
    this.setState({ on: value });
  };

  setOff = () => {
    this.setState({ on: false });
  };

  render() {
    return this.props.children({
      on: this.state.on,
      toggle: this.toggle,
      setOn: this.setOn,
      setOff: this.setOff
    });
  }
}

// Form validation with render props
class FormValidator extends Component<{
  validationRules: Record<string, (value: any) => string | null>;
  children: (formProps: {
    values: Record<string, any>;
    errors: Record<string, string>;
    setValue: (field: string, value: any) => void;
    validate: () => boolean;
    reset: () => void;
  }) => React.ReactNode;
}> {
  state = {
    values: {} as Record<string, any>,
    errors: {} as Record<string, string>
  };

  setValue = (field: string, value: any) => {
    this.setState(prevState => ({
      values: { ...prevState.values, [field]: value },
      errors: { ...prevState.errors, [field]: '' }
    }));
  };

  validate = (): boolean => {
    const { validationRules } = this.props;
    const { values } = this.state;
    const errors: Record<string, string> = {};

    Object.keys(validationRules).forEach(field => {
      const error = validationRules[field](values[field]);
      if (error) {
        errors[field] = error;
      }
    });

    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  reset = () => {
    this.setState({ values: {}, errors: {} });
  };

  render() {
    return this.props.children({
      values: this.state.values,
      errors: this.state.errors,
      setValue: this.setValue,
      validate: this.validate,
      reset: this.reset
    });
  }
}

// =============================================================================
// 3. COMPOUND COMPONENTS PATTERN
// =============================================================================

// Modal compound component
const Modal = {
  Root: ({ children, isOpen, onClose }: {
    children: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
  }) => {
    if (!isOpen) return null;

    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={onClose}
      >
        <div 
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            minWidth: '400px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );
  },

  Header: ({ children }: { children: React.ReactNode }) => (
    <div style={{
      padding: '20px',
      borderBottom: '1px solid #eee',
      fontWeight: 'bold',
      fontSize: '1.2em'
    }}>
      {children}
    </div>
  ),

  Body: ({ children }: { children: React.ReactNode }) => (
    <div style={{ padding: '20px' }}>
      {children}
    </div>
  ),

  Footer: ({ children }: { children: React.ReactNode }) => (
    <div style={{
      padding: '20px',
      borderTop: '1px solid #eee',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px'
    }}>
      {children}
    </div>
  )
};

// Accordion compound component
const Accordion = {
  Root: ({ children }: { children: React.ReactNode }) => (
    <div style={{ border: '1px solid #ccc', borderRadius: '4px' }}>
      {children}
    </div>
  ),

  Item: ({ children, isOpen, onToggle }: {
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
  }) => {
    const items = React.Children.toArray(children);
    const header = items.find(child => 
      React.isValidElement(child) && child.type === Accordion.Header
    );
    const content = items.find(child => 
      React.isValidElement(child) && child.type === Accordion.Content
    );

    return (
      <div style={{ borderBottom: '1px solid #eee' }}>
        {header && cloneElement(header as React.ReactElement, { 
          isOpen, 
          onToggle 
        })}
        {content && isOpen && content}
      </div>
    );
  },

  Header: ({ children, isOpen, onToggle }: {
    children: React.ReactNode;
    isOpen?: boolean;
    onToggle?: () => void;
  }) => (
    <div 
      style={{
        padding: '15px',
        backgroundColor: '#f5f5f5',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
      onClick={onToggle}
    >
      {children}
      <span>{isOpen ? '−' : '+'}</span>
    </div>
  ),

  Content: ({ children }: { children: React.ReactNode }) => (
    <div style={{ padding: '15px' }}>
      {children}
    </div>
  )
};

// Tabs compound component
const Tabs = {
  Root: ({ children, activeTab, onTabChange }: {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
  }) => {
    const childrenArray = React.Children.toArray(children);
    const tabList = childrenArray.find(child => 
      React.isValidElement(child) && child.type === Tabs.List
    );
    const panels = childrenArray.filter(child => 
      React.isValidElement(child) && child.type === Tabs.Panel
    );

    return (
      <div>
        {tabList && cloneElement(tabList as React.ReactElement, {
          activeTab,
          onTabChange
        })}
        {panels.map(panel => 
          cloneElement(panel as React.ReactElement, {
            key: (panel as React.ReactElement).props.value,
            isActive: (panel as React.ReactElement).props.value === activeTab
          })
        )}
      </div>
    );
  },

  List: ({ children, activeTab, onTabChange }: {
    children: React.ReactNode;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
  }) => (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid #ccc'
    }}>
      {React.Children.map(children, child => 
        React.isValidElement(child) && child.type === Tabs.Tab
          ? cloneElement(child, { activeTab, onTabChange })
          : child
      )}
    </div>
  ),

  Tab: ({ children, value, activeTab, onTabChange }: {
    children: React.ReactNode;
    value: string;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
  }) => (
    <button
      style={{
        padding: '10px 20px',
        border: 'none',
        backgroundColor: activeTab === value ? '#007bff' : 'transparent',
        color: activeTab === value ? 'white' : 'black',
        cursor: 'pointer'
      }}
      onClick={() => onTabChange?.(value)}
    >
      {children}
    </button>
  ),

  Panel: ({ children, value, isActive }: {
    children: React.ReactNode;
    value: string;
    isActive?: boolean;
  }) => (
    isActive ? (
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    ) : null
  )
};

// =============================================================================
// 4. FUNCTION AS CHILDREN / CHILD AS FUNCTION
// =============================================================================

// Window size tracker
const WindowSizeTracker: React.FC<{
  children: (size: { width: number; height: number }) => React.ReactNode;
}> = ({ children }) => {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <>{children(size)}</>;
};

// Local storage sync
const LocalStorageSync: React.FC<{
  storageKey: string;
  initialValue: any;
  children: (value: any, setValue: (value: any) => void) => React.ReactNode;
}> = ({ storageKey, initialValue, children }) => {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const updateValue = (newValue: any) => {
    setValue(newValue);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newValue));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  return <>{children(value, updateValue)}</>;
};

// =============================================================================
// 5. MAIN APPLICATION COMPONENT
// =============================================================================

const ComplexPatternsApp: React.FC = () => {
  const [user, setUser] = useState<User | null>({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin'
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tab1');
  const [accordionStates, setAccordionStates] = useState({
    item1: false,
    item2: false
  });

  const login = (newUser: User) => setUser(newUser);
  const logout = () => setUser(null);

  const toggleAccordion = (item: string) => {
    setAccordionStates(prev => ({
      ...prev,
      [item]: !prev[item as keyof typeof prev]
    }));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <h1>Complex React Patterns Migration Demo</h1>
        
        <div style={{ marginBottom: '30px' }}>
          <p>Current user: {user ? `${user.name} (${user.role})` : 'Not logged in'}</p>
          <button onClick={logout} disabled={!user} style={{ marginRight: '10px' }}>
            Logout
          </button>
          <button onClick={() => login({
            id: 2,
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'user'
          })}>
            Login as User
          </button>
        </div>

        {/* HOC Pattern Example */}
        <section>
          <h2>1. Higher-Order Components (HOCs)</h2>
          <EnhancedUserList />
        </section>

        {/* Render Props Pattern Examples */}
        <section>
          <h2>2. Render Props Pattern</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <h3>Mouse Tracker</h3>
            <MouseTracker>
              {({ x, y }) => (
                <div style={{ 
                  padding: '20px', 
                  border: '1px solid #ccc',
                  backgroundColor: '#f9f9f9'
                }}>
                  Mouse position: ({x}, {y})
                </div>
              )}
            </MouseTracker>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Data Fetcher</h3>
            <DataFetcher url="/api/posts">
              {({ data, loading, error, refetch }) => (
                <div style={{ padding: '20px', border: '1px solid #ccc' }}>
                  <button onClick={refetch} style={{ marginBottom: '10px' }}>
                    Refetch Data
                  </button>
                  {loading && <p>Loading posts...</p>}
                  {error && <p style={{ color: 'red' }}>{error}</p>}
                  {data && (
                    <ul>
                      {data.map((post: any) => (
                        <li key={post.id}>
                          <strong>{post.title}</strong>: {post.content}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </DataFetcher>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Toggle Component</h3>
            <Toggle initial={false}>
              {({ on, toggle, setOn, setOff }) => (
                <div style={{ padding: '20px', border: '1px solid #ccc' }}>
                  <p>Toggle is {on ? 'ON' : 'OFF'}</p>
                  <button onClick={toggle} style={{ marginRight: '5px' }}>
                    Toggle
                  </button>
                  <button onClick={() => setOn(true)} style={{ marginRight: '5px' }}>
                    Turn On
                  </button>
                  <button onClick={setOff}>Turn Off</button>
                </div>
              )}
            </Toggle>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Form Validator</h3>
            <FormValidator
              validationRules={{
                email: (value) => {
                  if (!value) return 'Email is required';
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return 'Invalid email format';
                  }
                  return null;
                },
                password: (value) => {
                  if (!value) return 'Password is required';
                  if (value.length < 6) return 'Password must be at least 6 characters';
                  return null;
                }
              }}
            >
              {({ values, errors, setValue, validate, reset }) => (
                <form 
                  style={{ padding: '20px', border: '1px solid #ccc' }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (validate()) {
                      alert('Form is valid!');
                    }
                  }}
                >
                  <div style={{ marginBottom: '10px' }}>
                    <input
                      type="email"
                      placeholder="Email"
                      value={values.email || ''}
                      onChange={(e) => setValue('email', e.target.value)}
                      style={{ 
                        padding: '5px',
                        border: errors.email ? '2px solid red' : '1px solid #ccc'
                      }}
                    />
                    {errors.email && <div style={{ color: 'red', fontSize: '12px' }}>
                      {errors.email}
                    </div>}
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <input
                      type="password"
                      placeholder="Password"
                      value={values.password || ''}
                      onChange={(e) => setValue('password', e.target.value)}
                      style={{ 
                        padding: '5px',
                        border: errors.password ? '2px solid red' : '1px solid #ccc'
                      }}
                    />
                    {errors.password && <div style={{ color: 'red', fontSize: '12px' }}>
                      {errors.password}
                    </div>}
                  </div>
                  
                  <button type="submit" style={{ marginRight: '5px' }}>Submit</button>
                  <button type="button" onClick={reset}>Reset</button>
                </form>
              )}
            </FormValidator>
          </div>
        </section>

        {/* Compound Components Examples */}
        <section>
          <h2>3. Compound Components</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <h3>Modal</h3>
            <button onClick={() => setModalOpen(true)}>Open Modal</button>
            <Modal.Root isOpen={modalOpen} onClose={() => setModalOpen(false)}>
              <Modal.Header>Modal Title</Modal.Header>
              <Modal.Body>
                <p>This is the modal content. It demonstrates the compound component pattern.</p>
              </Modal.Body>
              <Modal.Footer>
                <button onClick={() => setModalOpen(false)}>Cancel</button>
                <button onClick={() => setModalOpen(false)}>Save</button>
              </Modal.Footer>
            </Modal.Root>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Accordion</h3>
            <Accordion.Root>
              <Accordion.Item 
                isOpen={accordionStates.item1} 
                onToggle={() => toggleAccordion('item1')}
              >
                <Accordion.Header>First Section</Accordion.Header>
                <Accordion.Content>
                  This is the content of the first accordion section.
                </Accordion.Content>
              </Accordion.Item>
              
              <Accordion.Item 
                isOpen={accordionStates.item2} 
                onToggle={() => toggleAccordion('item2')}
              >
                <Accordion.Header>Second Section</Accordion.Header>
                <Accordion.Content>
                  This is the content of the second accordion section.
                </Accordion.Content>
              </Accordion.Item>
            </Accordion.Root>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Tabs</h3>
            <Tabs.Root activeTab={activeTab} onTabChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
                <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
                <Tabs.Tab value="tab3">Tab 3</Tabs.Tab>
              </Tabs.List>
              
              <Tabs.Panel value="tab1">
                Content for Tab 1. This demonstrates compound components.
              </Tabs.Panel>
              
              <Tabs.Panel value="tab2">
                Content for Tab 2. Each panel is conditionally rendered.
              </Tabs.Panel>
              
              <Tabs.Panel value="tab3">
                Content for Tab 3. The active tab state is managed by the parent.
              </Tabs.Panel>
            </Tabs.Root>
          </div>
        </section>

        {/* Function as Children Examples */}
        <section>
          <h2>4. Function as Children / Child as Function</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <h3>Window Size Tracker</h3>
            <WindowSizeTracker>
              {({ width, height }) => (
                <div style={{ 
                  padding: '20px', 
                  border: '1px solid #ccc',
                  backgroundColor: '#f0f8ff'
                }}>
                  Window size: {width} × {height}
                </div>
              )}
            </WindowSizeTracker>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Local Storage Sync</h3>
            <LocalStorageSync storageKey="demo-counter" initialValue={0}>
              {(count, setCount) => (
                <div style={{ padding: '20px', border: '1px solid #ccc' }}>
                  <p>Count: {count} (synced with localStorage)</p>
                  <button onClick={() => setCount(count + 1)} style={{ marginRight: '5px' }}>
                    Increment
                  </button>
                  <button onClick={() => setCount(count - 1)} style={{ marginRight: '5px' }}>
                    Decrement
                  </button>
                  <button onClick={() => setCount(0)}>Reset</button>
                </div>
              )}
            </LocalStorageSync>
          </div>
        </section>

        <section style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa' }}>
          <h2>Migration Considerations</h2>
          <ul>
            <li><strong>HOCs</strong> → Custom hooks or component composition</li>
            <li><strong>Render props</strong> → Custom hooks</li>
            <li><strong>Compound components</strong> → Context + compound pattern or custom hooks</li>
            <li><strong>Function as children</strong> → Custom hooks</li>
            <li><strong>Class components</strong> → Functional components with hooks</li>
          </ul>
        </section>
      </div>
    </AuthContext.Provider>
  );
};

export default ComplexPatternsApp;
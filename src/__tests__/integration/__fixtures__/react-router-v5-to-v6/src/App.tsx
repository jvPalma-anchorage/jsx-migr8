import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  NavLink,
  Redirect,
  useHistory,
  useLocation,
  useParams,
  useRouteMatch,
  withRouter,
  RouteComponentProps,
  Prompt
} from 'react-router-dom';
import { createBrowserHistory } from 'history';

// Custom history instance (v5 pattern)
const customHistory = createBrowserHistory();

// HOC component using withRouter
interface WithRouterProps extends RouteComponentProps {
  title: string;
}

const LegacyComponent: React.FC<WithRouterProps> = ({ 
  history, 
  location, 
  match, 
  title 
}) => {
  const handleNavigation = () => {
    history.push('/dashboard');
  };

  return (
    <div>
      <h2>{title}</h2>
      <p>Current path: {location.pathname}</p>
      <p>Match URL: {match.url}</p>
      <button onClick={handleNavigation}>Go to Dashboard</button>
    </div>
  );
};

const WrappedLegacyComponent = withRouter(LegacyComponent);

// Component using useHistory hook
const NavigationComponent: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  const handleGoBack = () => {
    history.goBack();
  };

  const handleGoForward = () => {
    history.goForward();
  };

  const handleReplace = () => {
    history.replace('/profile');
  };

  const handlePush = () => {
    history.push('/settings', { from: location.pathname });
  };

  const handlePushWithSearch = () => {
    history.push({
      pathname: '/search',
      search: '?q=react+router',
      state: { fromNavigation: true }
    });
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>Navigation Controls</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={handleGoBack}>Go Back</button>
        <button onClick={handleGoForward}>Go Forward</button>
        <button onClick={handleReplace}>Replace with Profile</button>
        <button onClick={handlePush}>Push to Settings</button>
        <button onClick={handlePushWithSearch}>Search Page</button>
      </div>
      <p>Current location: {location.pathname}</p>
      {location.state && (
        <p>State: {JSON.stringify(location.state)}</p>
      )}
    </div>
  );
};

// Component using useParams and useRouteMatch
const UserProfile: React.FC = () => {
  const { userId, tab } = useParams<{ userId: string; tab?: string }>();
  const match = useRouteMatch();
  const history = useHistory();

  const tabs = ['overview', 'settings', 'activity', 'billing'];

  const handleTabChange = (newTab: string) => {
    history.push(`/user/${userId}/${newTab}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>User Profile - ID: {userId}</h2>
      <p>Match URL: {match.url}</p>
      <p>Match Path: {match.path}</p>
      <p>Is Exact: {match.isExact ? 'Yes' : 'No'}</p>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {tabs.map((tabName) => (
          <button
            key={tabName}
            onClick={() => handleTabChange(tabName)}
            style={{
              padding: '8px 16px',
              backgroundColor: tab === tabName ? '#007bff' : '#f8f9fa',
              color: tab === tabName ? 'white' : 'black',
              border: '1px solid #ccc',
              cursor: 'pointer'
            }}
          >
            {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px', border: '1px solid #ddd' }}>
        <Switch>
          <Route exact path={`${match.path}`}>
            <div>
              <h3>User Overview</h3>
              <p>Welcome to your profile overview!</p>
            </div>
          </Route>
          <Route path={`${match.path}/overview`}>
            <div>
              <h3>Overview Tab</h3>
              <p>User details and statistics go here.</p>
            </div>
          </Route>
          <Route path={`${match.path}/settings`}>
            <div>
              <h3>Settings Tab</h3>
              <p>User preferences and account settings.</p>
            </div>
          </Route>
          <Route path={`${match.path}/activity`}>
            <div>
              <h3>Activity Tab</h3>
              <p>Recent user activity and history.</p>
            </div>
          </Route>
          <Route path={`${match.path}/billing`}>
            <div>
              <h3>Billing Tab</h3>
              <p>Subscription and payment information.</p>
            </div>
          </Route>
        </Switch>
      </div>
    </div>
  );
};

// Component with nested routing
const Dashboard: React.FC = () => {
  const match = useRouteMatch();
  const location = useLocation();

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dashboard</h2>
      <p>Match URL: {match.url}</p>
      
      <nav style={{ marginBottom: '20px' }}>
        <Link 
          to={`${match.url}/analytics`}
          style={{ marginRight: '15px', textDecoration: 'none', color: '#007bff' }}
        >
          Analytics
        </Link>
        <Link 
          to={`${match.url}/reports`}
          style={{ marginRight: '15px', textDecoration: 'none', color: '#007bff' }}
        >
          Reports
        </Link>
        <Link 
          to={`${match.url}/users`}
          style={{ marginRight: '15px', textDecoration: 'none', color: '#007bff' }}
        >
          Users
        </Link>
      </nav>

      <Switch>
        <Route exact path={match.path}>
          <div>
            <h3>Dashboard Home</h3>
            <p>Select a section from the navigation above.</p>
          </div>
        </Route>
        <Route path={`${match.path}/analytics`}>
          <div>
            <h3>Analytics</h3>
            <p>Site analytics and performance metrics.</p>
          </div>
        </Route>
        <Route path={`${match.path}/reports`}>
          <div>
            <h3>Reports</h3>
            <p>Generated reports and data exports.</p>
          </div>
        </Route>
        <Route path={`${match.path}/users`}>
          <div>
            <h3>User Management</h3>
            <p>Manage system users and permissions.</p>
          </div>
        </Route>
      </Switch>
    </div>
  );
};

// Component with query parameters
const SearchPage: React.FC = () => {
  const location = useLocation();
  const history = useHistory();
  
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';
  const sort = searchParams.get('sort') || 'relevance';

  const updateSearch = (newQuery: string) => {
    const newParams = new URLSearchParams(location.search);
    newParams.set('q', newQuery);
    history.push({
      pathname: location.pathname,
      search: newParams.toString()
    });
  };

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(location.search);
    newParams.set(key, value);
    history.push({
      pathname: location.pathname,
      search: newParams.toString()
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Search Results</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => updateSearch(e.target.value)}
          style={{ padding: '8px', marginRight: '10px', width: '300px' }}
        />
        
        <select
          value={category}
          onChange={(e) => updateFilter('category', e.target.value)}
          style={{ padding: '8px', marginRight: '10px' }}
        >
          <option value="all">All Categories</option>
          <option value="products">Products</option>
          <option value="articles">Articles</option>
          <option value="users">Users</option>
        </select>
        
        <select
          value={sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          style={{ padding: '8px' }}
        >
          <option value="relevance">Relevance</option>
          <option value="date">Date</option>
          <option value="popularity">Popularity</option>
        </select>
      </div>

      <div>
        <p><strong>Query:</strong> {query}</p>
        <p><strong>Category:</strong> {category}</p>
        <p><strong>Sort:</strong> {sort}</p>
        <p><strong>Full Search:</strong> {location.search}</p>
      </div>

      {location.state && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa' }}>
          <p><strong>Page State:</strong> {JSON.stringify(location.state)}</p>
        </div>
      )}
    </div>
  );
};

// Form component with navigation blocking
const ContactForm: React.FC = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    message: ''
  });
  const [isFormDirty, setIsFormDirty] = React.useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsFormDirty(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setIsFormDirty(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Prompt
        when={isFormDirty}
        message="You have unsaved changes. Are you sure you want to leave?"
      />
      
      <h2>Contact Form</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Name:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            style={{ padding: '8px', marginLeft: '10px', width: '200px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            style={{ padding: '8px', marginLeft: '10px', width: '200px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Message:</label>
          <textarea
            value={formData.message}
            onChange={(e) => handleInputChange('message', e.target.value)}
            style={{ padding: '8px', marginLeft: '10px', width: '300px', height: '100px' }}
          />
        </div>
        
        <button type="submit" style={{ padding: '10px 20px' }}>
          Send Message
        </button>
      </form>
      
      {isFormDirty && (
        <p style={{ color: 'orange', marginTop: '10px' }}>
          ⚠️ You have unsaved changes
        </p>
      )}
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <Router history={customHistory}>
      <div style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Navigation Header */}
        <header style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderBottom: '1px solid #ddd' 
        }}>
          <nav>
            <h1 style={{ margin: '0 0 15px 0' }}>React Router v5 Demo App</h1>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <NavLink 
                to="/" 
                exact
                style={{ textDecoration: 'none', color: '#007bff' }}
                activeStyle={{ fontWeight: 'bold', color: '#0056b3' }}
              >
                Home
              </NavLink>
              <NavLink 
                to="/dashboard"
                style={{ textDecoration: 'none', color: '#007bff' }}
                activeStyle={{ fontWeight: 'bold', color: '#0056b3' }}
              >
                Dashboard
              </NavLink>
              <NavLink 
                to="/user/123"
                style={{ textDecoration: 'none', color: '#007bff' }}
                activeStyle={{ fontWeight: 'bold', color: '#0056b3' }}
              >
                User Profile
              </NavLink>
              <NavLink 
                to="/search?q=example&category=products"
                style={{ textDecoration: 'none', color: '#007bff' }}
                activeStyle={{ fontWeight: 'bold', color: '#0056b3' }}
              >
                Search
              </NavLink>
              <NavLink 
                to="/contact"
                style={{ textDecoration: 'none', color: '#007bff' }}
                activeStyle={{ fontWeight: 'bold', color: '#0056b3' }}
              >
                Contact
              </NavLink>
              <NavLink 
                to="/admin"
                style={{ textDecoration: 'none', color: '#007bff' }}
                activeStyle={{ fontWeight: 'bold', color: '#0056b3' }}
              >
                Admin
              </NavLink>
            </div>
          </nav>
        </header>

        {/* Navigation Component */}
        <NavigationComponent />

        {/* Main Content */}
        <main style={{ padding: '20px' }}>
          <Switch>
            {/* Exact home route */}
            <Route exact path="/">
              <div>
                <h2>Welcome to React Router v5 Demo</h2>
                <p>This application demonstrates various React Router v5 patterns that need migration to v6:</p>
                <ul>
                  <li>Switch component and Route rendering patterns</li>
                  <li>useHistory, useLocation, useParams, useRouteMatch hooks</li>
                  <li>withRouter HOC usage</li>
                  <li>Nested routing with dynamic URLs</li>
                  <li>Query parameter handling</li>
                  <li>Navigation blocking with Prompt</li>
                  <li>Redirects and route guards</li>
                  <li>Custom history usage</li>
                </ul>
                <WrappedLegacyComponent title="Legacy Component with withRouter" />
              </div>
            </Route>

            {/* Dashboard with nested routes */}
            <Route path="/dashboard">
              <Dashboard />
            </Route>

            {/* User profile with params and nested routes */}
            <Route path="/user/:userId/:tab?">
              <UserProfile />
            </Route>

            {/* Search page with query parameters */}
            <Route path="/search">
              <SearchPage />
            </Route>

            {/* Contact form with navigation blocking */}
            <Route path="/contact">
              <ContactForm />
            </Route>

            {/* Protected admin route with redirect */}
            <Route path="/admin">
              {/* Simulate authentication check */}
              {false ? (
                <div>
                  <h2>Admin Panel</h2>
                  <p>Welcome to the admin panel!</p>
                </div>
              ) : (
                <Redirect to="/login" />
              )}
            </Route>

            {/* Login page */}
            <Route path="/login">
              <div style={{ padding: '20px' }}>
                <h2>Login Required</h2>
                <p>You need to log in to access the admin panel.</p>
                <button style={{ padding: '10px 20px' }}>
                  Login
                </button>
              </div>
            </Route>

            {/* Profile redirect */}
            <Route path="/profile">
              <Redirect to="/user/current/overview" />
            </Route>

            {/* Settings page */}
            <Route path="/settings">
              <div style={{ padding: '20px' }}>
                <h2>Settings</h2>
                <p>Application settings and preferences.</p>
              </div>
            </Route>

            {/* Catch-all 404 route */}
            <Route path="*">
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>404 - Page Not Found</h2>
                <p>The page you're looking for doesn't exist.</p>
                <Link to="/" style={{ color: '#007bff', textDecoration: 'none' }}>
                  Go Back Home
                </Link>
              </div>
            </Route>
          </Switch>
        </main>

        {/* Footer */}
        <footer style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderTop: '1px solid #ddd',
          marginTop: '40px',
          textAlign: 'center'
        }}>
          <p>React Router v5 Demo Application - Migration Test Case</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
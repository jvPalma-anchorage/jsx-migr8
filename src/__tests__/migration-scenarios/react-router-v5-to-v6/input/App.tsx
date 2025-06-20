import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, useHistory, useLocation, useParams, Redirect } from 'react-router-dom';
import { withRouter, RouteComponentProps } from 'react-router-dom';

// Main App component with nested routing
const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <nav>
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
          <Link to="/about">About</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
        
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/products" component={ProductsSection} />
          <Route path="/about" component={About} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/user/:id" component={UserProfile} />
          <Redirect from="/old-home" to="/" />
          <Route component={NotFound} />
        </Switch>
      </div>
    </Router>
  );
};

// Component using useHistory hook
const Home: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  const handleNavigate = () => {
    history.push('/products', { from: 'home' });
  };

  const handleReplace = () => {
    history.replace('/about');
  };

  const handleGoBack = () => {
    history.goBack();
  };

  return (
    <div>
      <h1>Home Page</h1>
      <p>Current path: {location.pathname}</p>
      <button onClick={handleNavigate}>Go to Products</button>
      <button onClick={handleReplace}>Replace with About</button>
      <button onClick={handleGoBack}>Go Back</button>
    </div>
  );
};

// Nested routing component
const ProductsSection: React.FC = () => {
  return (
    <div>
      <h2>Products</h2>
      <Switch>
        <Route exact path="/products" component={ProductList} />
        <Route path="/products/:category" component={ProductCategory} />
        <Route path="/products/:category/:id" component={ProductDetail} />
      </Switch>
    </div>
  );
};

const ProductList: React.FC = () => {
  const history = useHistory();
  
  const categories = ['electronics', 'clothing', 'books'];
  
  return (
    <div>
      <h3>Product Categories</h3>
      {categories.map(category => (
        <button 
          key={category} 
          onClick={() => history.push(`/products/${category}`)}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

const ProductCategory: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const history = useHistory();
  
  const products = [1, 2, 3, 4, 5];
  
  return (
    <div>
      <h3>Category: {category}</h3>
      {products.map(id => (
        <button 
          key={id} 
          onClick={() => history.push(`/products/${category}/${id}`)}
        >
          Product {id}
        </button>
      ))}
    </div>
  );
};

const ProductDetail: React.FC = () => {
  const { category, id } = useParams<{ category: string; id: string }>();
  const location = useLocation();
  
  return (
    <div>
      <h3>Product Detail</h3>
      <p>Category: {category}</p>
      <p>ID: {id}</p>
      <p>Search: {location.search}</p>
    </div>
  );
};

// Component with withRouter HOC
interface WithRouterProps extends RouteComponentProps {
  title: string;
}

const About: React.FC<WithRouterProps> = ({ history, location, match, title = "About Us" }) => {
  const handleNavigation = () => {
    history.push('/');
  };

  return (
    <div>
      <h2>{title}</h2>
      <p>Current location: {location.pathname}</p>
      <p>Match URL: {match.url}</p>
      <button onClick={handleNavigation}>Back to Home</button>
    </div>
  );
};

const AboutWithRouter = withRouter(About);

// Class component with router props
interface DashboardProps extends RouteComponentProps {
  userId?: string;
}

class Dashboard extends React.Component<DashboardProps> {
  handleRedirect = () => {
    this.props.history.push('/user/123');
  };

  render() {
    const { location, match } = this.props;
    
    return (
      <div>
        <h2>Dashboard</h2>
        <p>Path: {location.pathname}</p>
        <p>Match: {match.path}</p>
        <button onClick={this.handleRedirect}>View User Profile</button>
        
        <Switch>
          <Route path={`${match.path}/settings`} component={Settings} />
          <Route path={`${match.path}/profile`} component={Profile} />
        </Switch>
      </div>
    );
  }
}

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation<{ from?: string }>();
  
  return (
    <div>
      <h2>User Profile</h2>
      <p>User ID: {id}</p>
      {location.state?.from && <p>Came from: {location.state.from}</p>}
    </div>
  );
};

const Settings: React.FC = () => <div>Settings Component</div>;
const Profile: React.FC = () => <div>Profile Component</div>;
const NotFound: React.FC = () => <div>404 - Page Not Found</div>;

export default App;
export { AboutWithRouter, Dashboard };
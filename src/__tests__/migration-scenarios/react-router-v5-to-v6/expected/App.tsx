import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';

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
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/*" element={<ProductsSection />} />
          <Route path="/about" element={<About title="About Us" />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/old-home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
};

// Component using useNavigate hook
const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = () => {
    navigate('/products', { state: { from: 'home' } });
  };

  const handleReplace = () => {
    navigate('/about', { replace: true });
  };

  const handleGoBack = () => {
    navigate(-1);
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
      <Routes>
        <Route index element={<ProductList />} />
        <Route path=":category" element={<ProductCategory />} />
        <Route path=":category/:id" element={<ProductDetail />} />
      </Routes>
    </div>
  );
};

const ProductList: React.FC = () => {
  const navigate = useNavigate();
  
  const categories = ['electronics', 'clothing', 'books'];
  
  return (
    <div>
      <h3>Product Categories</h3>
      {categories.map(category => (
        <button 
          key={category} 
          onClick={() => navigate(`/products/${category}`)}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

const ProductCategory: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  
  const products = [1, 2, 3, 4, 5];
  
  return (
    <div>
      <h3>Category: {category}</h3>
      {products.map(id => (
        <button 
          key={id} 
          onClick={() => navigate(`/products/${category}/${id}`)}
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

// Modern component using hooks
interface AboutProps {
  title: string;
}

const About: React.FC<AboutProps> = ({ title = "About Us" }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = () => {
    navigate('/');
  };

  return (
    <div>
      <h2>{title}</h2>
      <p>Current location: {location.pathname}</p>
      <button onClick={handleNavigation}>Back to Home</button>
    </div>
  );
};

// Class component converted to function component with hooks
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleRedirect = () => {
    navigate('/user/123');
  };

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Path: {location.pathname}</p>
      <button onClick={handleRedirect}>View User Profile</button>
      
      <Routes>
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Routes>
    </div>
  );
};

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  
  return (
    <div>
      <h2>User Profile</h2>
      <p>User ID: {id}</p>
      {state?.from && <p>Came from: {state.from}</p>}
    </div>
  );
};

const Settings: React.FC = () => <div>Settings Component</div>;
const Profile: React.FC = () => <div>Profile Component</div>;
const NotFound: React.FC = () => <div>404 - Page Not Found</div>;

export default App;
export { About, Dashboard };
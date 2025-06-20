import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

// Complex functional component with hooks
interface UserDashboardProps {
  userId: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  preferences: UserPreferences;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
}

interface FormData {
  name: string;
  email: string;
  preferences: UserPreferences;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ userId }) => {
  // Redux hooks
  const userProfile = useSelector((state: any) => state.user.profile);
  const theme = useSelector((state: any) => state.ui.theme);
  const permissions = useSelector((state: any) => state.user.permissions);
  const dispatch = useDispatch();

  // Router hooks
  const navigate = useNavigate();
  const location = useLocation();

  // State hooks
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    preferences: {
      theme: 'light',
      notifications: true,
      language: 'en'
    }
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Refs for cleanup
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized functions
  const fetchUserProfile = useCallback((id: string) => {
    dispatch({ type: 'FETCH_USER_PROFILE', payload: id });
  }, [dispatch]);

  const updateUserPreferences = useCallback((prefs: UserPreferences) => {
    dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: prefs });
  }, [dispatch]);

  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await fetchUserProfile(userId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch user data');
      setIsLoading(false);
    }
  }, [userId, fetchUserProfile]);

  const handleResize = useCallback(() => {
    setWindowWidth(window.innerWidth);
  }, []);

  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  }, [hasUnsavedChanges]);

  // Effect for component mount
  useEffect(() => {
    fetchUserData();
    window.addEventListener('resize', handleResize);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [fetchUserData, handleResize, handleBeforeUnload]);

  // Effect for userId changes
  useEffect(() => {
    fetchUserData();
  }, [userId, fetchUserData]);

  // Effect for userProfile changes
  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name,
        email: userProfile.email,
        preferences: { ...userProfile.preferences }
      });
      setIsLoading(false);
    }
  }, [userProfile]);

  // Effect for form data changes (auto-save)
  useEffect(() => {
    if (!isLoading && formData.name) {
      setHasUnsavedChanges(true);
      
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      
      saveTimerRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    }
  }, [formData, isLoading]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prevState => ({
      ...prevState,
      [field]: value
    }));
  }, []);

  const handlePreferenceChange = useCallback((key: string, value: any) => {
    setFormData(prevState => ({
      ...prevState,
      preferences: {
        ...prevState.preferences,
        [key]: value
      }
    }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updateUserPreferences(formData.preferences);
      setHasUnsavedChanges(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save changes');
    }
  }, [formData.preferences, updateUserPreferences]);

  const handleCancel = useCallback(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name,
        email: userProfile.email,
        preferences: { ...userProfile.preferences }
      });
      setHasUnsavedChanges(false);
    }
  }, [userProfile]);

  if (isLoading) {
    return <div className="loading">Loading user dashboard...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchUserData}>Retry</button>
      </div>
    );
  }

  const isMobile = windowWidth < 768;

  return (
    <div className={`dashboard dashboard--${theme} ${isMobile ? 'dashboard--mobile' : ''}`}>
      <header className="dashboard__header">
        <h1>User Dashboard</h1>
        {hasUnsavedChanges && (
          <div className="unsaved-indicator">
            Unsaved changes
          </div>
        )}
      </header>

      <nav className="dashboard__nav">
        {['profile', 'preferences', 'security'].map(tab => (
          <button
            key={tab}
            className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      <main className="dashboard__content">
        {activeTab === 'profile' && (
          <ProfileTab
            formData={formData}
            onInputChange={handleInputChange}
            permissions={permissions}
          />
        )}
        
        {activeTab === 'preferences' && (
          <PreferencesTab
            preferences={formData.preferences}
            onPreferenceChange={handlePreferenceChange}
          />
        )}
        
        {activeTab === 'security' && (
          <SecurityTab userId={userId} />
        )}
      </main>

      <footer className="dashboard__footer">
        <button 
          onClick={handleCancel}
          disabled={!hasUnsavedChanges}
          className="btn btn--secondary"
        >
          Cancel
        </button>
        <button 
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
          className="btn btn--primary"
        >
          Save Changes
        </button>
      </footer>
    </div>
  );
};

// Memoized component (React.memo replaces PureComponent)
interface ProfileTabProps {
  formData: FormData;
  onInputChange: (field: string, value: string) => void;
  permissions: string[];
}

const ProfileTab = React.memo<ProfileTabProps>(({ formData, onInputChange, permissions }) => {
  const canEdit = permissions.includes('EDIT_PROFILE');

  return (
    <div className="profile-tab">
      <h2>Profile Information</h2>
      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => onInputChange('name', e.target.value)}
          disabled={!canEdit}
        />
      </div>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => onInputChange('email', e.target.value)}
          disabled={!canEdit}
        />
      </div>
    </div>
  );
});

// Function components remain the same
const PreferencesTab: React.FC<{
  preferences: UserPreferences;
  onPreferenceChange: (key: string, value: any) => void;
}> = ({ preferences, onPreferenceChange }) => (
  <div className="preferences-tab">
    <h2>Preferences</h2>
    <div className="form-group">
      <label htmlFor="theme">Theme</label>
      <select
        id="theme"
        value={preferences.theme}
        onChange={(e) => onPreferenceChange('theme', e.target.value)}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
    <div className="form-group">
      <label>
        <input
          type="checkbox"
          checked={preferences.notifications}
          onChange={(e) => onPreferenceChange('notifications', e.target.checked)}
        />
        Enable notifications
      </label>
    </div>
  </div>
);

const SecurityTab: React.FC<{ userId: string }> = ({ userId }) => (
  <div className="security-tab">
    <h2>Security Settings</h2>
    <p>User ID: {userId}</p>
    <button className="btn btn--danger">Change Password</button>
  </div>
);

export default UserDashboard;
export { ProfileTab };
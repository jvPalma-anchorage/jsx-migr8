import React, { Component, PureComponent } from 'react';
import { connect } from 'react-redux';
import { withRouter, RouteComponentProps } from 'react-router-dom';

// Complex class component with lifecycle methods
interface UserDashboardProps extends RouteComponentProps {
  userId: string;
  userProfile?: UserProfile;
  permissions: string[];
  theme: 'light' | 'dark';
  fetchUserProfile: (id: string) => void;
  updateUserPreferences: (prefs: UserPreferences) => void;
}

interface UserDashboardState {
  isLoading: boolean;
  error: string | null;
  activeTab: string;
  formData: {
    name: string;
    email: string;
    preferences: UserPreferences;
  };
  hasUnsavedChanges: boolean;
  windowWidth: number;
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

class UserDashboard extends Component<UserDashboardProps, UserDashboardState> {
  private resizeListener: () => void;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(props: UserDashboardProps) {
    super(props);
    
    this.state = {
      isLoading: true,
      error: null,
      activeTab: 'profile',
      formData: {
        name: '',
        email: '',
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en'
        }
      },
      hasUnsavedChanges: false,
      windowWidth: window.innerWidth
    };

    this.resizeListener = this.handleResize.bind(this);
  }

  componentDidMount() {
    this.fetchUserData();
    window.addEventListener('resize', this.resizeListener);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  componentDidUpdate(prevProps: UserDashboardProps, prevState: UserDashboardState) {
    if (prevProps.userId !== this.props.userId) {
      this.fetchUserData();
    }

    if (prevProps.userProfile !== this.props.userProfile && this.props.userProfile) {
      this.setState({
        formData: {
          name: this.props.userProfile.name,
          email: this.props.userProfile.email,
          preferences: { ...this.props.userProfile.preferences }
        },
        isLoading: false
      });
    }

    if (prevState.formData !== this.state.formData && !this.state.isLoading) {
      this.setState({ hasUnsavedChanges: true });
      this.scheduleAutoSave();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeListener);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
  }

  fetchUserData = async () => {
    try {
      this.setState({ isLoading: true, error: null });
      await this.props.fetchUserProfile(this.props.userId);
    } catch (error) {
      this.setState({ 
        error: error instanceof Error ? error.message : 'Failed to fetch user data',
        isLoading: false 
      });
    }
  };

  handleResize = () => {
    this.setState({ windowWidth: window.innerWidth });
  };

  handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (this.state.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  };

  handleTabChange = (tab: string) => {
    this.setState({ activeTab: tab });
  };

  handleInputChange = (field: string, value: string) => {
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        [field]: value
      }
    }));
  };

  handlePreferenceChange = (key: string, value: any) => {
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        preferences: {
          ...prevState.formData.preferences,
          [key]: value
        }
      }
    }));
  };

  scheduleAutoSave = () => {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      this.handleSave();
    }, 2000);
  };

  handleSave = async () => {
    try {
      await this.props.updateUserPreferences(this.state.formData.preferences);
      this.setState({ hasUnsavedChanges: false });
    } catch (error) {
      this.setState({ 
        error: error instanceof Error ? error.message : 'Failed to save changes' 
      });
    }
  };

  handleCancel = () => {
    if (this.props.userProfile) {
      this.setState({
        formData: {
          name: this.props.userProfile.name,
          email: this.props.userProfile.email,
          preferences: { ...this.props.userProfile.preferences }
        },
        hasUnsavedChanges: false
      });
    }
  };

  render() {
    const { theme, permissions } = this.props;
    const { isLoading, error, activeTab, formData, hasUnsavedChanges, windowWidth } = this.state;

    if (isLoading) {
      return <div className="loading">Loading user dashboard...</div>;
    }

    if (error) {
      return (
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={this.fetchUserData}>Retry</button>
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
              onClick={() => this.handleTabChange(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        <main className="dashboard__content">
          {activeTab === 'profile' && (
            <ProfileTab
              formData={formData}
              onInputChange={this.handleInputChange}
              permissions={permissions}
            />
          )}
          
          {activeTab === 'preferences' && (
            <PreferencesTab
              preferences={formData.preferences}
              onPreferenceChange={this.handlePreferenceChange}
            />
          )}
          
          {activeTab === 'security' && (
            <SecurityTab userId={this.props.userId} />
          )}
        </main>

        <footer className="dashboard__footer">
          <button 
            onClick={this.handleCancel}
            disabled={!hasUnsavedChanges}
            className="btn btn--secondary"
          >
            Cancel
          </button>
          <button 
            onClick={this.handleSave}
            disabled={!hasUnsavedChanges}
            className="btn btn--primary"
          >
            Save Changes
          </button>
        </footer>
      </div>
    );
  }
}

// Pure component example
interface ProfileTabProps {
  formData: UserDashboardState['formData'];
  onInputChange: (field: string, value: string) => void;
  permissions: string[];
}

class ProfileTab extends PureComponent<ProfileTabProps> {
  render() {
    const { formData, onInputChange, permissions } = this.props;
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
  }
}

// Function components for other tabs
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

// Redux connection
const mapStateToProps = (state: any) => ({
  userProfile: state.user.profile,
  theme: state.ui.theme,
  permissions: state.user.permissions
});

const mapDispatchToProps = {
  fetchUserProfile: (id: string) => ({ type: 'FETCH_USER_PROFILE', payload: id }),
  updateUserPreferences: (prefs: UserPreferences) => ({ type: 'UPDATE_USER_PREFERENCES', payload: prefs })
};

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(UserDashboard));
export { ProfileTab };
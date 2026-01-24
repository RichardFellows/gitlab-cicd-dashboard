import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ControlPanel from './components/ControlPanel';
import ProjectDetails from './components/ProjectDetails';
import { DashboardMetrics, Project, ProjectMetrics, ProjectStatusFilter, STORAGE_KEYS, ViewType } from './types';
import GitLabApiService from './services/GitLabApiService';
import DashboardDataService from './services/DashboardDataService';
import './styles/index.css';

// Initialize services
const gitLabService = new GitLabApiService();
const dashboardService = new DashboardDataService(gitLabService);

const App = () => {
  const [gitlabUrl, setGitlabUrl] = useState('https://gitlab.com/api/v4');
  const [token, setToken] = useState('');
  const [groupId, setGroupId] = useState('');
  const [timeframe, setTimeframe] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [viewType, setViewType] = useState<ViewType>(ViewType.TABLE);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Apply dark mode class to body
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // Load saved settings on mount
  useEffect(() => {
    loadSavedSettings();
    checkUrlHash();

    // Add event listener for hash changes
    window.addEventListener('hashchange', checkUrlHash);
    return () => {
      window.removeEventListener('hashchange', checkUrlHash);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check URL hash for navigation
  const checkUrlHash = () => {
    const hash = window.location.hash;
    
    if (hash.startsWith('#project/')) {
      const projectId = parseInt(hash.replace('#project/', ''), 10);
      if (!isNaN(projectId)) {
        setSelectedProjectId(projectId);
      }
    } else {
      setSelectedProjectId(null);
    }
  };

  // Load settings from localStorage
  const loadSavedSettings = () => {
    const savedUrl = localStorage.getItem(STORAGE_KEYS.GITLAB_URL);
    const savedGroupId = localStorage.getItem(STORAGE_KEYS.GROUP_ID);
    const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const savedTimeframe = localStorage.getItem(STORAGE_KEYS.TIMEFRAME);
    const savedViewType = localStorage.getItem(STORAGE_KEYS.VIEW_TYPE) as ViewType || ViewType.TABLE;
    const savedDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true';
    const savedSettingsCollapsed = localStorage.getItem(STORAGE_KEYS.SETTINGS_COLLAPSED) === 'true';

    if (savedUrl) setGitlabUrl(savedUrl);
    if (savedGroupId) setGroupId(savedGroupId);
    if (savedToken) setToken(savedToken);
    if (savedTimeframe) setTimeframe(parseInt(savedTimeframe, 10));
    if (savedViewType) setViewType(savedViewType);
    setDarkMode(savedDarkMode);
    setSettingsCollapsed(savedSettingsCollapsed);

    // Auto-load dashboard if we have all required values
    if (savedUrl && savedGroupId && savedToken) {
      console.log('Auto-loading dashboard with saved settings');
      // Use setTimeout to ensure DOM is fully loaded before initiating API calls
      setTimeout(() => {
        loadDashboard(savedUrl, savedToken, savedGroupId, parseInt(savedTimeframe || '30', 10));
      }, 500);
    } else {
      console.log('Not auto-loading dashboard, missing required values:', {
        hasUrl: !!savedUrl,
        hasGroupId: !!savedGroupId,
        hasToken: !!savedToken
      });
    }
  };

  // Save settings to localStorage
  const saveSettings = (url: string, token: string, groupId: string, timeframe: number) => {
    localStorage.setItem(STORAGE_KEYS.GITLAB_URL, url);
    localStorage.setItem(STORAGE_KEYS.GROUP_ID, groupId);
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.TIMEFRAME, timeframe.toString());
  };

  // Load dashboard data
  const loadDashboard = async (
    baseUrl: string,
    privateToken: string,
    group: string,
    days: number
  ) => {
    console.log('Load Dashboard called with:', { 
      baseUrl, 
      tokenLength: privateToken ? privateToken.length : 0, 
      hasToken: !!privateToken,
      group, 
      days 
    });
    
    if (!baseUrl || !privateToken || !group) {
      setError('Please provide GitLab URL, token, and group ID');
      console.error('Missing required fields:', { hasUrl: !!baseUrl, hasToken: !!privateToken, hasGroup: !!group });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Starting dashboard loading process...');

      // Save settings to localStorage
      saveSettings(baseUrl, privateToken, group, days);
      console.log('Settings saved to localStorage');

      // Update GitLab API base URL and token
      gitLabService.baseUrl = baseUrl.endsWith('/api/v4') ? baseUrl : `${baseUrl}/api/v4`;
      
      // Clean up token (remove whitespace that might have been copied)
      const cleanToken = privateToken.trim();
      gitLabService.setPrivateToken(cleanToken);
      
      console.log('GitLab service configured with:', { 
        baseUrl: gitLabService.baseUrl,
        tokenLength: cleanToken.length,
        tokenFirstChars: cleanToken.substring(0, 4) + '...',
        useProxy: gitLabService.useProxy,
        proxyUrl: gitLabService.proxyUrl
      });

      // Fetch metrics
      console.log('Attempting to fetch metrics for group:', group);
      const dashboardMetrics = await dashboardService.getGroupMetrics(group, { days });

      // Validate metrics
      if (!dashboardMetrics || !dashboardMetrics.projects) {
        throw new Error('Invalid metrics data received from API');
      }

      // Ensure all projects have valid metrics
      const validatedProjects = dashboardMetrics.projects.map((project: Project) => {
        try {
          // Ensure the project has a metrics object
          if (!project.metrics) {
            console.warn(`Project ${project.name} has no metrics, creating empty object`);
            project.metrics = {} as ProjectMetrics;
          }

          // Ensure all required properties exist
          if (!project.metrics.mainBranchPipeline) {
            project.metrics.mainBranchPipeline = { id: 0, status: 'unknown', available: false, failedJobs: [], created_at: '', updated_at: '' };
          } else if (!project.metrics.mainBranchPipeline.failedJobs) {
            project.metrics.mainBranchPipeline.failedJobs = [];
          }
          
          if (!project.metrics.codeCoverage) {
            project.metrics.codeCoverage = { coverage: null, available: false };
          }
          
          if (!project.metrics.mergeRequestCounts) {
            project.metrics.mergeRequestCounts = { totalOpen: 0, drafts: 0 };
          }
          
          if (!project.metrics.testMetrics) {
            project.metrics.testMetrics = { total: 0, success: 0, failed: 0, skipped: 0, available: false };
          }
          
          if (!project.metrics.recentCommits) {
            project.metrics.recentCommits = [];
          }
          
          // Provide default values for numerical properties
          project.metrics.successRate = project.metrics.successRate || 0;
          project.metrics.avgDuration = project.metrics.avgDuration || 0;
          
          return project;
        } catch (err) {
          console.error(`Error processing project ${project.name || 'unknown'}:`, err);
          // Return a minimal valid project to avoid breaking the dashboard
          return {
            id: project.id || 0,
            name: project.name || 'Unknown Project',
            web_url: project.web_url || '#',
            metrics: {
              mainBranchPipeline: { id: 0, status: 'unknown', available: false, created_at: '', updated_at: '', failedJobs: [] },
              codeCoverage: { coverage: null, available: false },
              testMetrics: { total: 0, success: 0, failed: 0, skipped: 0, available: false },
              recentCommits: [],
              successRate: 0,
              avgDuration: 0,
              totalPipelines: 0,
              successfulPipelines: 0,
              failedPipelines: 0,
              canceledPipelines: 0,
              runningPipelines: 0,
              mergeRequestCounts: { totalOpen: 0, drafts: 0 }
            }
          };
        }
      });

      // Update metrics state with validated projects
      const validatedMetrics = {
        ...dashboardMetrics,
        projects: validatedProjects
      };

      setMetrics(validatedMetrics);
      setLastUpdated(new Date());
      // Auto-collapse settings after successful load
      setSettingsCollapsed(true);
      localStorage.setItem(STORAGE_KEYS.SETTINGS_COLLAPSED, 'true');
    } catch (error) {
      console.error('Dashboard loading error:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Not an Error object',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      setError(`Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log('Finished loadDashboard function, loading state:', !loading);
      setLoading(false);
    }
  };

  // Handle view type change
  const handleViewTypeChange = (type: ViewType) => {
    setViewType(type);
    localStorage.setItem(STORAGE_KEYS.VIEW_TYPE, type);
  };

  // Handle project selection
  const handleProjectSelect = (projectId: number) => {
    setSelectedProjectId(projectId);
    window.location.hash = `project/${projectId}`;
  };

  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(newDarkMode));
  };

  // Handle settings collapse toggle
  const handleSettingsToggle = () => {
    const newCollapsed = !settingsCollapsed;
    setSettingsCollapsed(newCollapsed);
    localStorage.setItem(STORAGE_KEYS.SETTINGS_COLLAPSED, String(newCollapsed));
  };

  // Handle refresh - reload data with current settings
  const handleRefresh = () => {
    if (gitlabUrl && token && groupId) {
      loadDashboard(gitlabUrl, token, groupId, timeframe);
    }
  };

  // Handle status filter change (from summary cards)
  const handleStatusFilterChange = (filter: ProjectStatusFilter) => {
    setStatusFilter(filter);
  };

  // Format last updated time
  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  // Clear saved settings
  const clearSettings = () => {
    localStorage.removeItem(STORAGE_KEYS.GITLAB_URL);
    localStorage.removeItem(STORAGE_KEYS.GROUP_ID);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TIMEFRAME);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS_COLLAPSED);

    setGitlabUrl('https://gitlab.com/api/v4');
    setToken('');
    setGroupId('');
    setTimeframe(30);
    setMetrics(null);
    setSettingsCollapsed(false);
    setLastUpdated(null);
    setStatusFilter('all');
    setSearchQuery('');

    alert('Saved settings have been cleared.');
  };

  return (
    <div className={`container ${darkMode ? 'dark-mode' : ''}`}>
      <header>
        <h1>GitLab CI/CD Dashboard</h1>
        <div className="header-actions">
          {metrics && (
            <>
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewType === ViewType.CARD ? 'active' : ''}`}
                  onClick={() => handleViewTypeChange(ViewType.CARD)}
                  title="Card View"
                >
                  Cards
                </button>
                <button
                  className={`view-btn ${viewType === ViewType.TABLE ? 'active' : ''}`}
                  onClick={() => handleViewTypeChange(ViewType.TABLE)}
                  title="Table View"
                >
                  Table
                </button>
              </div>
              <button
                className="icon-btn refresh-btn"
                onClick={handleRefresh}
                disabled={loading}
                title="Refresh data"
              >
                &#8635;
              </button>
              {lastUpdated && (
                <span className="last-updated" title={lastUpdated.toLocaleString()}>
                  {formatLastUpdated()}
                </span>
              )}
            </>
          )}
          <button
            className="icon-btn settings-btn"
            onClick={handleSettingsToggle}
            title={settingsCollapsed ? 'Show settings' : 'Hide settings'}
          >
            &#9881;
          </button>
          <button
            className="icon-btn theme-btn"
            onClick={handleDarkModeToggle}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className={`settings-panel ${settingsCollapsed ? 'collapsed' : ''}`}>
        <ControlPanel
          gitlabUrl={gitlabUrl}
          token={token}
          groupId={groupId}
          timeframe={timeframe}
          onGitlabUrlChange={setGitlabUrl}
          onTokenChange={setToken}
          onGroupIdChange={setGroupId}
          onTimeframeChange={setTimeframe}
          onLoad={loadDashboard}
          loading={loading}
        />
        <div className="settings-footer">
          <button className="text-btn danger" onClick={clearSettings}>
            Clear Saved Data
          </button>
        </div>
      </div>

      {error && <div className="error-container">{error}</div>}

      {loading && <div className="loading-indicator">Loading dashboard data...</div>}

      {!loading && !error && metrics && !selectedProjectId && (
        <>
          <div className="filter-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="status-filters">
              <button
                className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('all')}
              >
                All
              </button>
              <button
                className={`filter-chip success ${statusFilter === 'success' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('success')}
              >
                Success
              </button>
              <button
                className={`filter-chip warning ${statusFilter === 'warning' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('warning')}
              >
                Warning
              </button>
              <button
                className={`filter-chip danger ${statusFilter === 'failed' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('failed')}
              >
                Failed
              </button>
              <button
                className={`filter-chip inactive ${statusFilter === 'inactive' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('inactive')}
              >
                Inactive
              </button>
            </div>
          </div>
          <Dashboard
            metrics={metrics}
            viewType={viewType}
            onProjectSelect={handleProjectSelect}
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            onStatusFilterChange={handleStatusFilterChange}
          />
        </>
      )}

      {!loading && !error && metrics && selectedProjectId && (
        <ProjectDetails
          project={metrics.projects.find(p => p.id === selectedProjectId)}
          onBack={() => {
            setSelectedProjectId(null);
            window.location.hash = '';
          }}
          gitLabService={gitLabService}
        />
      )}
    </div>
  );
};

export default App;
import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ControlPanel from './components/ControlPanel';
import ProjectDetails from './components/ProjectDetails';
import { DashboardMetrics, Project, STORAGE_KEYS, ViewType } from './types';
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

  // Load saved settings on mount
  useEffect(() => {
    loadSavedSettings();
    checkUrlHash();

    // Add event listener for hash changes
    window.addEventListener('hashchange', checkUrlHash);
    return () => {
      window.removeEventListener('hashchange', checkUrlHash);
    };
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
    
    if (savedUrl) setGitlabUrl(savedUrl);
    if (savedGroupId) setGroupId(savedGroupId);
    if (savedToken) setToken(savedToken);
    if (savedTimeframe) setTimeframe(parseInt(savedTimeframe, 10));
    if (savedViewType) setViewType(savedViewType);
    
    // Auto-load dashboard if we have all required values
    if (savedUrl && savedGroupId && savedToken) {
      loadDashboard(savedUrl, savedToken, savedGroupId, parseInt(savedTimeframe || '30', 10));
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
    if (!baseUrl || !privateToken || !group) {
      setError('Please provide GitLab URL, token, and group ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Save settings to localStorage
      saveSettings(baseUrl, privateToken, group, days);

      // Update GitLab API base URL and token
      gitLabService.baseUrl = baseUrl.endsWith('/api/v4') ? baseUrl : `${baseUrl}/api/v4`;
      gitLabService.setPrivateToken(privateToken);

      // Fetch metrics
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
            project.metrics = {} as any;
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
    } catch (error) {
      console.error('Dashboard loading error:', error);
      setError(`Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
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

  // Clear saved settings
  const clearSettings = () => {
    localStorage.removeItem(STORAGE_KEYS.GITLAB_URL);
    localStorage.removeItem(STORAGE_KEYS.GROUP_ID);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TIMEFRAME);
    
    setGitlabUrl('https://gitlab.com/api/v4');
    setToken('');
    setGroupId('');
    setTimeframe(30);
    setMetrics(null);
    
    alert('Saved settings have been cleared.');
  };

  return (
    <div className="container">
      <header>
        <h1>GitLab CI/CD Dashboard</h1>
        <div className="header-actions">
          {metrics && (
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewType === ViewType.CARD ? 'active' : ''}`}
                onClick={() => handleViewTypeChange(ViewType.CARD)}
              >
                Card View
              </button>
              <button 
                className={`view-btn ${viewType === ViewType.TABLE ? 'active' : ''}`}
                onClick={() => handleViewTypeChange(ViewType.TABLE)}
              >
                Table View
              </button>
            </div>
          )}
          <button className="secondary-button" onClick={clearSettings}>
            Clear Saved Data
          </button>
        </div>
      </header>

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

      {error && <div className="error-container">{error}</div>}
      
      {loading && <div className="loading-indicator">Loading dashboard data...</div>}

      {!loading && !error && metrics && !selectedProjectId && (
        <Dashboard
          metrics={metrics}
          viewType={viewType}
          onProjectSelect={handleProjectSelect}
        />
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
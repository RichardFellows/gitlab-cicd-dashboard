import { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import ControlPanel from './components/ControlPanel';
import ProjectDetails from './components/ProjectDetails';
import { DashboardMetrics, Project, ProjectMetrics, ProjectStatusFilter, STORAGE_KEYS, ViewType, DashboardConfig, GroupSource, ProjectSource } from './types';
import GitLabApiService from './services/GitLabApiService';
import DashboardDataService from './services/DashboardDataService';
import { loadConfig, saveConfig, clearConfig, isConfigReady, createDefaultConfig } from './utils/configMigration';
import './styles/index.css';

// Initialize services
const gitLabService = new GitLabApiService();
const dashboardService = new DashboardDataService(gitLabService);

const App = () => {
  // Config state
  const [config, setConfig] = useState<DashboardConfig>(createDefaultConfig);

  // Loading states for resolving names
  const [loadingGroups, setLoadingGroups] = useState<Set<string>>(new Set());
  const [loadingProjects, setLoadingProjects] = useState<Set<string>>(new Set());

  // Dashboard state
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
    const savedConfig = loadConfig();
    setConfig(savedConfig);

    const savedViewType = localStorage.getItem(STORAGE_KEYS.VIEW_TYPE) as ViewType || ViewType.TABLE;
    const savedDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true';
    const savedSettingsCollapsed = localStorage.getItem(STORAGE_KEYS.SETTINGS_COLLAPSED) === 'true';

    if (savedViewType) setViewType(savedViewType);
    setDarkMode(savedDarkMode);
    setSettingsCollapsed(savedSettingsCollapsed);

    // Auto-load dashboard if config is ready
    if (isConfigReady(savedConfig)) {
      console.log('Auto-loading dashboard with saved config');
      setTimeout(() => {
        loadDashboard(savedConfig);
      }, 500);
    } else {
      console.log('Not auto-loading dashboard, config not ready');
    }
  };

  // Configure GitLab service with current config
  const configureGitLabService = useCallback((cfg: DashboardConfig) => {
    const baseUrl = cfg.gitlabUrl.endsWith('/api/v4')
      ? cfg.gitlabUrl
      : `${cfg.gitlabUrl}/api/v4`;
    gitLabService.baseUrl = baseUrl;
    gitLabService.setPrivateToken(cfg.token.trim());
  }, []);

  // Resolve group name
  const resolveGroupName = useCallback(async (groupId: string, currentConfig: DashboardConfig): Promise<void> => {
    if (!currentConfig.token) return;

    setLoadingGroups(prev => new Set(prev).add(groupId));
    configureGitLabService(currentConfig);

    try {
      const groupInfo = await gitLabService.getGroupInfo(groupId);
      setConfig(prev => {
        const updated = {
          ...prev,
          groups: prev.groups.map(g =>
            g.id === groupId
              ? { ...g, name: groupInfo?.name }
              : g
          )
        };
        saveConfig(updated);
        return updated;
      });
    } catch (error) {
      console.error(`Failed to resolve group name for ${groupId}:`, error);
    } finally {
      setLoadingGroups(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  }, [configureGitLabService]);

  // Resolve project name
  const resolveProjectName = useCallback(async (projectId: string, currentConfig: DashboardConfig): Promise<void> => {
    if (!currentConfig.token) return;

    setLoadingProjects(prev => new Set(prev).add(projectId));
    configureGitLabService(currentConfig);

    try {
      const projectInfo = await gitLabService.getProjectInfo(projectId);
      setConfig(prev => {
        const updated = {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === projectId
              ? { ...p, name: projectInfo?.name, path: projectInfo?.path_with_namespace }
              : p
          )
        };
        saveConfig(updated);
        return updated;
      });
    } catch (error) {
      console.error(`Failed to resolve project name for ${projectId}:`, error);
    } finally {
      setLoadingProjects(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  }, [configureGitLabService]);

  // Handle config field changes
  const handleGitlabUrlChange = useCallback((url: string) => {
    setConfig(prev => {
      const updated = { ...prev, gitlabUrl: url };
      saveConfig(updated);
      return updated;
    });
  }, []);

  const handleTokenChange = useCallback((token: string) => {
    setConfig(prev => {
      const updated = { ...prev, token };
      saveConfig(updated);
      return updated;
    });
  }, []);

  const handleTimeframeChange = useCallback((timeframe: number) => {
    setConfig(prev => {
      const updated = { ...prev, timeframe };
      saveConfig(updated);
      return updated;
    });
  }, []);

  // Handle adding/removing groups
  const handleAddGroup = useCallback((id: string) => {
    setConfig(prev => {
      if (prev.groups.some(g => g.id === id)) return prev;

      const newGroup: GroupSource = {
        id,
        addedAt: new Date().toISOString()
      };
      const updated = { ...prev, groups: [...prev.groups, newGroup] };
      saveConfig(updated);

      // Resolve group name if we have a token
      if (updated.token) {
        resolveGroupName(id, updated);
      }

      return updated;
    });
  }, [resolveGroupName]);

  const handleRemoveGroup = useCallback((id: string) => {
    setConfig(prev => {
      const updated = { ...prev, groups: prev.groups.filter(g => g.id !== id) };
      saveConfig(updated);
      return updated;
    });
  }, []);

  // Handle adding/removing projects
  const handleAddProject = useCallback((id: string) => {
    setConfig(prev => {
      if (prev.projects.some(p => p.id === id)) return prev;

      const newProject: ProjectSource = {
        id,
        addedAt: new Date().toISOString()
      };
      const updated = { ...prev, projects: [...prev.projects, newProject] };
      saveConfig(updated);

      // Resolve project name if we have a token
      if (updated.token) {
        resolveProjectName(id, updated);
      }

      return updated;
    });
  }, [resolveProjectName]);

  const handleRemoveProject = useCallback((id: string) => {
    setConfig(prev => {
      const updated = { ...prev, projects: prev.projects.filter(p => p.id !== id) };
      saveConfig(updated);
      return updated;
    });
  }, []);

  // Load dashboard data
  const loadDashboard = async (cfg: DashboardConfig) => {
    console.log('Load Dashboard called with config:', {
      gitlabUrl: cfg.gitlabUrl,
      tokenLength: cfg.token ? cfg.token.length : 0,
      groups: cfg.groups.length,
      projects: cfg.projects.length,
      timeframe: cfg.timeframe
    });

    if (!cfg.token || (cfg.groups.length === 0 && cfg.projects.length === 0)) {
      setError('Please provide a GitLab token and at least one group or project');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Configure GitLab service
      configureGitLabService(cfg);

      console.log('GitLab service configured, fetching metrics...');

      // Fetch metrics using multi-source method
      const dashboardMetrics = await dashboardService.getMultiSourceMetrics(cfg);

      // Validate metrics
      if (!dashboardMetrics || !dashboardMetrics.projects) {
        throw new Error('Invalid metrics data received from API');
      }

      // Log source stats
      if (dashboardMetrics.sourceStats) {
        console.log('Source stats:', dashboardMetrics.sourceStats);
        if (dashboardMetrics.sourceStats.failedGroups.length > 0) {
          console.warn('Failed to load groups:', dashboardMetrics.sourceStats.failedGroups);
        }
        if (dashboardMetrics.sourceStats.failedProjects.length > 0) {
          console.warn('Failed to load projects:', dashboardMetrics.sourceStats.failedProjects);
        }
      }

      // Ensure all projects have valid metrics
      const validatedProjects = dashboardMetrics.projects.map((project: Project) => {
        try {
          if (!project.metrics) {
            console.warn(`Project ${project.name} has no metrics, creating empty object`);
            project.metrics = {} as ProjectMetrics;
          }

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

          project.metrics.successRate = project.metrics.successRate || 0;
          project.metrics.avgDuration = project.metrics.avgDuration || 0;

          return project;
        } catch (err) {
          console.error(`Error processing project ${project.name || 'unknown'}:`, err);
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

      const validatedMetrics = {
        ...dashboardMetrics,
        projects: validatedProjects
      };

      setMetrics(validatedMetrics);
      setLastUpdated(new Date());
      setSettingsCollapsed(true);
      localStorage.setItem(STORAGE_KEYS.SETTINGS_COLLAPSED, 'true');
    } catch (error) {
      console.error('Dashboard loading error:', error);
      setError(`Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle load button click
  const handleLoad = useCallback(() => {
    loadDashboard(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, configureGitLabService]);

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

  // Handle refresh
  const handleRefresh = () => {
    if (isConfigReady(config)) {
      loadDashboard(config);
    }
  };

  // Handle status filter change
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
    clearConfig();
    localStorage.removeItem(STORAGE_KEYS.VIEW_TYPE);
    localStorage.removeItem(STORAGE_KEYS.DARK_MODE);

    setConfig(createDefaultConfig());
    setMetrics(null);
    setSettingsCollapsed(false);
    setLastUpdated(null);
    setStatusFilter('all');
    setSearchQuery('');

    alert('Saved settings have been cleared.');
  };

  const canLoad = isConfigReady(config);

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
            {darkMode ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
        </div>
      </header>

      <div className={`settings-panel ${settingsCollapsed ? 'collapsed' : ''}`}>
        <ControlPanel
          gitlabUrl={config.gitlabUrl}
          token={config.token}
          groups={config.groups}
          projects={config.projects}
          timeframe={config.timeframe}
          onGitlabUrlChange={handleGitlabUrlChange}
          onTokenChange={handleTokenChange}
          onAddGroup={handleAddGroup}
          onRemoveGroup={handleRemoveGroup}
          onAddProject={handleAddProject}
          onRemoveProject={handleRemoveProject}
          onTimeframeChange={handleTimeframeChange}
          onLoad={handleLoad}
          loading={loading}
          loadingGroups={loadingGroups}
          loadingProjects={loadingProjects}
          canLoad={canLoad}
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

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import ControlPanel from './components/ControlPanel';
import SaveConfigDialog from './components/SaveConfigDialog';
import ConfigManager from './components/ConfigManager';
import ProjectDetails from './components/ProjectDetails';
import EnvironmentMatrixView from './components/EnvironmentMatrixView';
import RefreshStatusBar from './components/RefreshStatusBar';
import StaleDataBanner from './components/StaleDataBanner';
import ShortcutsOverlay from './components/ShortcutsOverlay';
import { logger } from './utils/logger';
import ReadinessView from './components/ReadinessView';
import ComparisonView from './components/ComparisonView';
import NotificationBell from './components/NotificationBell';
import NotificationSettings from './components/NotificationSettings';
import MRBoardView from './components/MRBoardView';
import ExportButton from './components/ExportButton';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import { useKeyboardShortcuts, ShortcutHandler } from './hooks/useKeyboardShortcuts';
import { AUTO_REFRESH_OPTIONS } from './utils/constants';
import { evaluateRules, sendBrowserNotification } from './utils/notificationEngine';
import * as notificationStorage from './utils/notificationStorage';
import { DashboardMetrics, Project, ProjectMetrics, ProjectStatusFilter, STORAGE_KEYS, ViewType, DashboardConfig, GroupSource, ProjectSource, AggregatedTrend, DeploymentsByEnv, SavedConfigEntry, NotificationRule, NotificationEntry, ChartRefMap } from './types';
import { categorizeProject } from './utils/formatting';
import GitLabApiService from './services/GitLabApiService';
import DashboardDataService from './services/DashboardDataService';
import { loadConfig, saveConfig, clearConfig, isConfigReady, createDefaultConfig } from './utils/configMigration';
import { getSavedConfigs, getActiveConfigId, setActiveConfigId, saveNewConfig, updateConfigEntry, renameConfigEntry, deleteConfigEntry, exportConfig, importConfig, hasUnsavedChanges as checkUnsavedChanges } from './utils/configStorage';
import { themes, getThemeById, applyTheme, Theme } from './themes';
import ThemeSelector from './components/ThemeSelector';
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
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);
  const darkMode = currentTheme.isDark;
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Keyboard shortcuts state
  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(-1);
  const [showShortcutsOverlay, setShowShortcutsOverlay] = useState(false);

  // Trend data state
  const [aggregateTrends, setAggregateTrends] = useState<AggregatedTrend[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // Environment view state - deployment cache
  const [deploymentCache, setDeploymentCache] = useState<Map<number, DeploymentsByEnv>>(new Map());

  // Chart refs for PDF export
  const [chartRefs, setChartRefs] = useState<ChartRefMap>({});

  // Comparison view state
  const [selectedForComparison, setSelectedForComparison] = useState<Set<number>>(new Set());
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  // Auto-refresh state
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0);
  const staleDismissedRef = useRef(false);
  const [staleDismissed, setStaleDismissed] = useState(false);

  // Notification state
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationEntry[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationMuted, setNotificationMuted] = useState(false);
  const previousMetricsRef = useRef<DashboardMetrics | null>(null);

  // Saved config state
  const [savedConfigs, setSavedConfigs] = useState<SavedConfigEntry[]>([]);
  const [activeConfigId, setActiveConfigIdState] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showConfigManager, setShowConfigManager] = useState(false);

  // Compute filtered projects at App level for keyboard navigation
  const filteredProjects = useMemo(() => {
    if (!metrics) return [];
    return metrics.projects.filter((project: Project) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!project.name.toLowerCase().includes(query)) return false;
      }
      if (statusFilter !== 'all') {
        const category = categorizeProject(project);
        const mappedCategory = category === 'no-pipeline' ? 'inactive' : category;
        
        // Handle "needs-attention" filter (failed + warning combined)
        if (statusFilter === 'needs-attention') {
          if (mappedCategory !== 'failed' && mappedCategory !== 'warning') return false;
        } else {
          if (mappedCategory !== statusFilter) return false;
        }
      }
      return true;
    });
  }, [metrics, searchQuery, statusFilter]);

  // Reset keyboard selection when filters/view change
  useEffect(() => {
    setKeyboardSelectedIndex(-1);
  }, [searchQuery, statusFilter, viewType]);

  // Sync filter state with URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get('filter');
    if (filterParam && filterParam !== statusFilter) {
      const validFilters: ProjectStatusFilter[] = ['all', 'success', 'warning', 'failed', 'inactive', 'needs-attention'];
      if (validFilters.includes(filterParam as ProjectStatusFilter)) {
        setStatusFilter(filterParam as ProjectStatusFilter);
      }
    }
  }, [statusFilter]);

  // Update URL when filter changes
  const handleStatusFilterChange = (filter: ProjectStatusFilter) => {
    setStatusFilter(filter);
    const params = new URLSearchParams(window.location.search);
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  };

  // Compute status counts for filter badges
  const statusCounts = useMemo(() => {
    if (!metrics) return { failed: 0, warning: 0, success: 0, inactive: 0, needsAttention: 0 };
    
    const counts = { failed: 0, warning: 0, success: 0, inactive: 0, needsAttention: 0 };
    
    metrics.projects.forEach((project: Project) => {
      const category = categorizeProject(project);
      const mappedCategory = category === 'no-pipeline' ? 'inactive' : category;
      
      if (mappedCategory === 'failed') {
        counts.failed++;
        counts.needsAttention++;
      } else if (mappedCategory === 'warning') {
        counts.warning++;
        counts.needsAttention++;
      } else if (mappedCategory === 'success') {
        counts.success++;
      } else if (mappedCategory === 'inactive') {
        counts.inactive++;
      }
    });
    
    return counts;
  }, [metrics]);

  // Stable ref to current config for auto-refresh callback
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  // Auto-refresh callback — wraps loadDashboard with current config
  const autoRefreshCallback = useCallback(async () => {
    await loadDashboardAsync(configRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useAutoRefresh hook
  const {
    nextRefreshIn,
    isOffline,
    isRateLimited,
    resetTimer: resetAutoRefreshTimer,
    reportRateLimit,
  } = useAutoRefresh({
    interval: autoRefreshInterval,
    onRefresh: autoRefreshCallback,
    enabled: metrics !== null, // only auto-refresh after first load
    loading,
  });

  // --- Keyboard Shortcuts ---
  const shortcuts: ShortcutHandler[] = useMemo(() => [
    // View navigation (1-5)
    { key: '1', handler: () => { handleViewTypeChange(ViewType.CARD); } },
    { key: '2', handler: () => { handleViewTypeChange(ViewType.TABLE); } },
    { key: '3', handler: () => { handleViewTypeChange(ViewType.ENVIRONMENT); } },
    { key: '4', handler: () => { handleViewTypeChange(ViewType.READINESS); } },
    { key: '5', handler: () => { handleViewTypeChange(ViewType.MR_BOARD); } },

    // Actions
    {
      key: 'r',
      handler: () => {
        if (!loading && metrics && isConfigReady(config)) {
          loadDashboard(config);
          resetAutoRefreshTimer();
        }
      },
    },
    {
      key: '/',
      handler: (event: KeyboardEvent) => {
        event.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) (searchInput as HTMLInputElement).focus();
      },
    },
    {
      key: 'd',
      handler: () => {
        const idx = themes.findIndex((t) => t.id === currentTheme.id);
        const next = themes[(idx + 1) % themes.length];
        setCurrentTheme(next);
        localStorage.setItem(STORAGE_KEYS.THEME, next.id);
      },
    },
    { key: '?', handler: () => { setShowShortcutsOverlay(true); } },

    // Project navigation
    {
      key: 'j',
      handler: () => {
        if (!metrics || filteredProjects.length === 0) return;
        setKeyboardSelectedIndex(prev => {
          const maxIndex = filteredProjects.length - 1;
          return prev >= maxIndex ? 0 : prev + 1;
        });
      },
    },
    {
      key: 'k',
      handler: () => {
        if (!metrics || filteredProjects.length === 0) return;
        setKeyboardSelectedIndex(prev => {
          const maxIndex = filteredProjects.length - 1;
          return prev <= 0 ? maxIndex : prev - 1;
        });
      },
    },
    {
      key: 'Enter',
      handler: () => {
        if (keyboardSelectedIndex >= 0 && filteredProjects[keyboardSelectedIndex]) {
          handleProjectSelect(filteredProjects[keyboardSelectedIndex].id);
        }
      },
    },
    {
      key: 'Escape',
      handler: () => {
        if (showShortcutsOverlay) {
          setShowShortcutsOverlay(false);
        } else if (selectedProjectId) {
          setSelectedProjectId(null);
          window.location.hash = '';
        } else if (searchQuery) {
          setSearchQuery('');
          // Blur search input if focused
          const searchInput = document.getElementById('search-input');
          if (searchInput && document.activeElement === searchInput) {
            (searchInput as HTMLInputElement).blur();
          }
        } else {
          setKeyboardSelectedIndex(-1);
        }
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [loading, metrics, config, darkMode, filteredProjects, keyboardSelectedIndex, selectedProjectId, searchQuery, showShortcutsOverlay]);

  useKeyboardShortcuts({
    enabled: true,
    shortcuts,
  });

  // Apply theme
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

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

    // Load saved configurations
    setSavedConfigs(getSavedConfigs());
    setActiveConfigIdState(getActiveConfigId());

    const savedViewType = localStorage.getItem(STORAGE_KEYS.VIEW_TYPE) as ViewType || ViewType.TABLE;
    const savedThemeId = localStorage.getItem(STORAGE_KEYS.THEME);
    const savedDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true';
    const savedSettingsCollapsed = localStorage.getItem(STORAGE_KEYS.SETTINGS_COLLAPSED) === 'true';

    // Load auto-refresh interval
    const savedInterval = localStorage.getItem(STORAGE_KEYS.AUTO_REFRESH_INTERVAL);
    if (savedInterval !== null) {
      const parsed = Number(savedInterval);
      if (AUTO_REFRESH_OPTIONS.some(opt => opt.value === parsed)) {
        setAutoRefreshInterval(parsed);
      }
    }

    if (savedViewType) setViewType(savedViewType);
    // Migrate: if they had dark mode saved but no theme, use 'dark'
    if (savedThemeId) {
      setCurrentTheme(getThemeById(savedThemeId));
    } else if (savedDarkMode) {
      setCurrentTheme(getThemeById('dark'));
    }
    setSettingsCollapsed(savedSettingsCollapsed);

    // Load notification settings
    setNotificationRules(notificationStorage.getRules());
    setNotificationHistory(notificationStorage.getHistory());
    setNotificationsEnabled(notificationStorage.isEnabled());
    setNotificationMuted(notificationStorage.isMuted());

    // Auto-load dashboard if config is ready
    if (isConfigReady(savedConfig)) {
      logger.debug('Auto-loading dashboard with saved config');
      setTimeout(() => {
        loadDashboard(savedConfig);
      }, 500);
    } else {
      logger.debug('Not auto-loading dashboard, config not ready');
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
      logger.error(`Failed to resolve group name for ${groupId}:`, error);
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
      logger.error(`Failed to resolve project name for ${projectId}:`, error);
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

  // Load dashboard data (async — also used by auto-refresh)
  const loadDashboardAsync = async (cfg: DashboardConfig) => {
    await loadDashboard(cfg);
  };

  // Load dashboard data
  const loadDashboard = async (cfg: DashboardConfig) => {
    logger.debug('Load Dashboard called with config:', {
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

      logger.debug('GitLab service configured, fetching metrics...');

      // Fetch metrics using multi-source method
      const dashboardMetrics = await dashboardService.getMultiSourceMetrics(cfg);

      // Validate metrics
      if (!dashboardMetrics || !dashboardMetrics.projects) {
        throw new Error('Invalid metrics data received from API');
      }

      // Log source stats
      if (dashboardMetrics.sourceStats) {
        logger.debug('Source stats:', dashboardMetrics.sourceStats);
        if (dashboardMetrics.sourceStats.failedGroups.length > 0) {
          logger.warn('Failed to load groups:', dashboardMetrics.sourceStats.failedGroups);
        }
        if (dashboardMetrics.sourceStats.failedProjects.length > 0) {
          logger.warn('Failed to load projects:', dashboardMetrics.sourceStats.failedProjects);
        }
      }

      // Ensure all projects have valid metrics
      const validatedProjects = dashboardMetrics.projects.map((project: Project) => {
        try {
          if (!project.metrics) {
            logger.warn(`Project ${project.name} has no metrics, creating empty object`);
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
          logger.error(`Error processing project ${project.name || 'unknown'}:`, err);
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

      // Evaluate notification rules
      if (notificationsEnabled) {
        try {
          const currentRules = notificationStorage.getRules();
          const fired = evaluateRules(
            currentRules,
            validatedMetrics,
            previousMetricsRef.current,
            deploymentCache
          );
          if (fired.length > 0) {
            const currentMuted = notificationStorage.isMuted();
            for (const entry of fired) {
              sendBrowserNotification(entry, currentMuted);
            }
            notificationStorage.appendHistory(fired);
            setNotificationHistory(notificationStorage.getHistory());
          }
        } catch (err) {
          logger.error('Notification evaluation error:', err);
        }
      }
      previousMetricsRef.current = validatedMetrics;

      // Fetch aggregate trends after main metrics
      fetchAggregateTrends(validatedMetrics.projects, cfg.timeframe);
    } catch (error) {
      logger.error('Dashboard loading error:', error);

      // Detect rate limiting (HTTP 429)
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit')) {
        reportRateLimit();
        setError('Rate limited by GitLab API — next auto-refresh will be delayed.');
      } else {
        setError(`Failed to load dashboard data: ${errMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch aggregate trends for the dashboard
  const fetchAggregateTrends = async (projects: Project[], timeframe: number) => {
    try {
      setTrendsLoading(true);

      const endDate = new Date().toISOString();
      const startDate = new Date(
        Date.now() - timeframe * 24 * 60 * 60 * 1000
      ).toISOString();

      const projectIds = projects.map(p => p.id);
      const trends = await dashboardService.getAggregatedTrends(
        projectIds,
        { startDate, endDate }
      );

      setAggregateTrends(trends);
      logger.debug(`Loaded ${trends.length} aggregate trend data points`);
    } catch (error) {
      logger.error('Failed to fetch aggregate trends:', error);
      // Don't set error state - trends are optional
    } finally {
      setTrendsLoading(false);
    }
  };

  // Fetch deployments for a project (for Environment view)
  const fetchProjectDeployments = useCallback(async (projectId: number) => {
    // Skip if already cached or loading
    const cached = deploymentCache.get(projectId);
    if (cached && !cached.loading) return;

    // Set loading state
    setDeploymentCache(prev => {
      const newMap = new Map(prev);
      newMap.set(projectId, { projectId, deployments: {}, loading: true });
      return newMap;
    });

    try {
      const data = await dashboardService.getProjectDeployments(projectId);
      setDeploymentCache(prev => {
        const newMap = new Map(prev);
        newMap.set(projectId, data);
        return newMap;
      });
    } catch (error) {
      setDeploymentCache(prev => {
        const newMap = new Map(prev);
        newMap.set(projectId, {
          projectId,
          deployments: {},
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return newMap;
      });
    }
  }, [deploymentCache]);

  // Compute unsaved changes
  const unsavedChanges = (() => {
    if (!activeConfigId) return false;
    const activeEntry = savedConfigs.find(c => c.id === activeConfigId);
    if (!activeEntry) return false;
    return checkUnsavedChanges(config, activeEntry.config);
  })();

  // Saved config handlers
  const handleSelectConfig = useCallback((id: string) => {
    if (unsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Switch without saving?');
      if (!confirmed) return;
    }
    const entry = savedConfigs.find(c => c.id === id);
    if (!entry) return;

    const newConfig = { ...entry.config };
    setConfig(newConfig);
    saveConfig(newConfig);
    setActiveConfigIdState(id);
    setActiveConfigId(id);

    // Auto-load if config is ready
    if (isConfigReady(newConfig)) {
      setDeploymentCache(new Map());
      loadDashboard(newConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedConfigs, unsavedChanges]);

  const handleSaveConfig = useCallback((name: string) => {
    try {
      const entry = saveNewConfig(name, config);
      setSavedConfigs(getSavedConfigs());
      setActiveConfigIdState(entry.id);
      setActiveConfigId(entry.id);
      setShowSaveDialog(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save configuration.');
    }
  }, [config]);

  const handleUpdateConfig = useCallback(() => {
    if (!activeConfigId) return;
    try {
      updateConfigEntry(activeConfigId, config);
      setSavedConfigs(getSavedConfigs());
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update configuration.');
    }
  }, [activeConfigId, config]);

  const handleDeleteConfig = useCallback((id: string) => {
    deleteConfigEntry(id);
    setSavedConfigs(getSavedConfigs());
    if (activeConfigId === id) {
      setActiveConfigIdState(null);
    }
  }, [activeConfigId]);

  const handleRenameConfig = useCallback((id: string, newName: string) => {
    renameConfigEntry(id, newName);
    setSavedConfigs(getSavedConfigs());
  }, []);

  const handleExportConfig = useCallback((id: string, includeToken: boolean) => {
    const entry = savedConfigs.find(c => c.id === id);
    if (!entry) return;

    const blob = exportConfig(entry, includeToken);
    const safeName = entry.name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.gitlab-dashboard.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [savedConfigs]);

  const handleImportConfig = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const entry = importConfig(jsonString);
        saveNewConfig(entry.name, entry.config);
        setSavedConfigs(getSavedConfigs());

        if (!entry.config.token) {
          alert('This configuration does not include a token. Please enter your GitLab token after loading it.');
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to import configuration.');
      }
    };
    reader.readAsText(file);
  }, []);

  // Comparison handlers
  const toggleComparisonSelection = useCallback((projectId: number) => {
    setSelectedForComparison(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else if (next.size < 4) {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const enterComparisonMode = useCallback(() => {
    if (selectedForComparison.size >= 2) {
      setComparisonMode(true);
    }
  }, [selectedForComparison.size]);

  const exitComparisonMode = useCallback(() => {
    setComparisonMode(false);
    setSelectedForComparison(new Set());
    setSelectionMode(false);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) {
        // Exiting selection mode clears selection
        setSelectedForComparison(new Set());
      }
      return !prev;
    });
  }, []);

  const clearComparisonSelection = useCallback(() => {
    setSelectedForComparison(new Set());
  }, []);

  // Handle removing a project from comparison view
  const removeProjectFromComparison = useCallback((projectId: number) => {
    setSelectedForComparison(prev => {
      const next = new Set(prev);
      next.delete(projectId);
      return next;
    });
  }, []);

  // Handle load button click
  const handleLoad = useCallback(() => {
    // Clear deployment cache on new load
    setDeploymentCache(new Map());
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

  // Handle theme change
  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme.id);
  };

  // Handle chart canvas refs for PDF export
  const handleChartCanvasReady = useCallback((name: string, canvas: HTMLCanvasElement | null) => {
    setChartRefs(prev => ({ ...prev, [name]: canvas }));
  }, []);

  // Handle settings collapse toggle
  const handleSettingsToggle = () => {
    const newCollapsed = !settingsCollapsed;
    setSettingsCollapsed(newCollapsed);
    localStorage.setItem(STORAGE_KEYS.SETTINGS_COLLAPSED, String(newCollapsed));
  };

  // Handle refresh (manual)
  const handleRefresh = () => {
    if (isConfigReady(config)) {
      loadDashboard(config);
      resetAutoRefreshTimer(); // Reset auto-refresh countdown
    }
  };

  // Handle auto-refresh interval change
  const handleAutoRefreshIntervalChange = (interval: number) => {
    setAutoRefreshInterval(interval);
    localStorage.setItem(STORAGE_KEYS.AUTO_REFRESH_INTERVAL, String(interval));
    // Reset stale dismissed when enabling auto-refresh
    if (interval > 0) {
      staleDismissedRef.current = false;
      setStaleDismissed(false);
    }
  };

  // Handle stale banner dismiss
  const handleStaleDismiss = () => {
    staleDismissedRef.current = true;
    setStaleDismissed(true);
  };

  // Handle "Enable Auto-Refresh" from stale banner (default 5 min)
  const handleEnableAutoRefreshFromBanner = () => {
    const fiveMin = 5 * 60 * 1000;
    handleAutoRefreshIntervalChange(fiveMin);
  };

  // Notification handlers
  const handleToggleNotificationsEnabled = useCallback(() => {
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    notificationStorage.setEnabled(newVal);
  }, [notificationsEnabled]);

  const handleToggleNotificationMuted = useCallback(() => {
    const newVal = !notificationMuted;
    setNotificationMuted(newVal);
    notificationStorage.setMuted(newVal);
  }, [notificationMuted]);

  const handleAddNotificationRule = useCallback((rule: Omit<NotificationRule, 'id'>) => {
    const created = notificationStorage.addRule(rule);
    if (created) {
      setNotificationRules(notificationStorage.getRules());
    }
  }, []);

  const handleUpdateNotificationRule = useCallback((id: string, updates: Partial<NotificationRule>) => {
    notificationStorage.updateRule(id, updates);
    setNotificationRules(notificationStorage.getRules());
  }, []);

  const handleDeleteNotificationRule = useCallback((id: string) => {
    notificationStorage.deleteRule(id);
    setNotificationRules(notificationStorage.getRules());
  }, []);

  const handleMarkAllNotificationsRead = useCallback(() => {
    notificationStorage.markAllRead();
    setNotificationHistory(notificationStorage.getHistory());
  }, []);

  const handleNotificationEntryClick = useCallback((entry: NotificationEntry) => {
    setSelectedProjectId(entry.projectId);
    window.location.hash = `project/${entry.projectId}`;
  }, []);

  const unreadNotificationCount = notificationHistory.filter(e => !e.read).length;

  // Clear saved settings
  const clearSettings = () => {
    clearConfig();
    localStorage.removeItem(STORAGE_KEYS.VIEW_TYPE);
    localStorage.removeItem(STORAGE_KEYS.DARK_MODE);
    localStorage.removeItem(STORAGE_KEYS.THEME);
    localStorage.removeItem(STORAGE_KEYS.AUTO_REFRESH_INTERVAL);

    setConfig(createDefaultConfig());
    setMetrics(null);
    setSettingsCollapsed(false);
    setLastUpdated(null);
    setStatusFilter('all');
    setSearchQuery('');
    setAutoRefreshInterval(0);
    staleDismissedRef.current = false;
    setStaleDismissed(false);

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
                  title="Card View (1)"
                  aria-keyshortcuts="1"
                >
                  Cards
                </button>
                <button
                  className={`view-btn ${viewType === ViewType.TABLE ? 'active' : ''}`}
                  onClick={() => handleViewTypeChange(ViewType.TABLE)}
                  title="Table View (2)"
                  aria-keyshortcuts="2"
                >
                  Table
                </button>
                <button
                  className={`view-btn ${viewType === ViewType.ENVIRONMENT ? 'active' : ''}`}
                  onClick={() => handleViewTypeChange(ViewType.ENVIRONMENT)}
                  title="Environment Matrix View (3)"
                  aria-keyshortcuts="3"
                >
                  Envs
                </button>
                <button
                  className={`view-btn ${viewType === ViewType.READINESS ? 'active' : ''}`}
                  onClick={() => handleViewTypeChange(ViewType.READINESS)}
                  title="Promotion Readiness View (4)"
                  aria-keyshortcuts="4"
                >
                  Ready
                </button>
                <button
                  className={`view-btn ${viewType === ViewType.MR_BOARD ? 'active' : ''}`}
                  onClick={() => handleViewTypeChange(ViewType.MR_BOARD)}
                  title="MR Pipeline Board (5)"
                  aria-keyshortcuts="5"
                >
                  MRs
                </button>
              </div>
              {/* Manual refresh + data age moved to RefreshStatusBar */}
            </>
          )}
          {metrics && (
            <RefreshStatusBar
              lastUpdated={lastUpdated}
              loading={loading}
              autoRefreshInterval={autoRefreshInterval}
              nextRefreshIn={nextRefreshIn}
              onIntervalChange={handleAutoRefreshIntervalChange}
              onManualRefresh={handleRefresh}
              isOffline={isOffline}
              isRateLimited={isRateLimited}
              darkMode={darkMode}
            />
          )}
          {metrics && notificationsEnabled && (
            <NotificationBell
              history={notificationHistory}
              unreadCount={unreadNotificationCount}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onClickEntry={handleNotificationEntryClick}
              darkMode={darkMode}
            />
          )}
          <ExportButton
            metrics={metrics}
            projects={filteredProjects}
            deploymentCache={deploymentCache}
            config={config}
            chartRefs={chartRefs}
            darkMode={darkMode}
            disabled={!metrics}
          />
          <button
            className="icon-btn settings-btn"
            onClick={handleSettingsToggle}
            title={settingsCollapsed ? 'Show settings' : 'Hide settings'}
          >
            &#9881;
          </button>
          <button
            className="icon-btn shortcuts-hint-btn"
            onClick={() => setShowShortcutsOverlay(true)}
            title="Keyboard shortcuts (?)"
            aria-keyshortcuts="?"
          >
            <kbd>?</kbd>
          </button>
          <ThemeSelector currentTheme={currentTheme} onThemeChange={handleThemeChange} />
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
          savedConfigs={savedConfigs}
          activeConfigId={activeConfigId}
          currentConfig={config}
          hasUnsavedChanges={unsavedChanges}
          onSelectConfig={handleSelectConfig}
          onSaveConfig={() => setShowSaveDialog(true)}
          onUpdateConfig={handleUpdateConfig}
          onManageConfigs={() => setShowConfigManager(true)}
        />
        <NotificationSettings
          enabled={notificationsEnabled}
          muted={notificationMuted}
          rules={notificationRules}
          projects={metrics?.projects || []}
          onToggleEnabled={handleToggleNotificationsEnabled}
          onToggleMuted={handleToggleNotificationMuted}
          onAddRule={handleAddNotificationRule}
          onUpdateRule={handleUpdateNotificationRule}
          onDeleteRule={handleDeleteNotificationRule}
        />
        <div className="settings-footer">
          <button className="text-btn danger" onClick={clearSettings}>
            Clear Saved Data
          </button>
        </div>
      </div>

      {error && <div className="error-container">{error}</div>}

      {!staleDismissed && metrics && (
        <StaleDataBanner
          lastUpdated={lastUpdated}
          autoRefreshEnabled={autoRefreshInterval > 0}
          onRefreshNow={handleRefresh}
          onEnableAutoRefresh={handleEnableAutoRefreshFromBanner}
          onDismiss={handleStaleDismiss}
        />
      )}

      {loading && <div className="loading-indicator">Loading dashboard data...</div>}

      {!loading && !error && metrics && !selectedProjectId && (
        <>
          {viewType !== ViewType.ENVIRONMENT && viewType !== ViewType.READINESS && viewType !== ViewType.MR_BOARD && !comparisonMode && (
            <div className="filter-bar">
              <input
                id="search-input"
                type="text"
                className="search-input"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-keyshortcuts="/"
              />
              <div className="status-filters">
                <button
                  className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => handleStatusFilterChange('all')}
                >
                  All
                </button>
                <button
                  className={`filter-chip needs-attention ${statusFilter === 'needs-attention' ? 'active' : ''}`}
                  onClick={() => handleStatusFilterChange('needs-attention')}
                >
                  Needs Attention ({statusCounts.needsAttention})
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
          )}
          
          {viewType === ViewType.ENVIRONMENT && (
            <EnvironmentMatrixView
              projects={metrics.projects}
              deploymentCache={deploymentCache}
              fetchProjectDeployments={fetchProjectDeployments}
              jiraBaseUrl={config.jiraBaseUrl}
              dashboardService={dashboardService}
              darkMode={darkMode}
            />
          )}

          {viewType === ViewType.READINESS && (
            <ReadinessView
              projects={metrics.projects}
              deploymentCache={deploymentCache}
              dashboardService={dashboardService}
              jiraBaseUrl={config.jiraBaseUrl}
            />
          )}

          {viewType === ViewType.MR_BOARD && (
            <MRBoardView
              projects={metrics.projects}
              dashboardService={dashboardService}
              darkMode={darkMode}
            />
          )}

          {viewType !== ViewType.ENVIRONMENT && viewType !== ViewType.READINESS && viewType !== ViewType.MR_BOARD && !comparisonMode && (
            <Dashboard
              metrics={metrics}
              viewType={viewType}
              onProjectSelect={handleProjectSelect}
              statusFilter={statusFilter}
              searchQuery={searchQuery}
              onStatusFilterChange={handleStatusFilterChange}
              aggregateTrends={aggregateTrends}
              trendsLoading={trendsLoading}
              darkMode={darkMode}
              gitLabService={gitLabService}
              selectionMode={selectionMode}
              selectedForComparison={selectedForComparison}
              onToggleSelectionMode={toggleSelectionMode}
              onToggleComparisonSelection={toggleComparisonSelection}
              onCompare={enterComparisonMode}
              onClearSelection={clearComparisonSelection}
              keyboardSelectedIndex={keyboardSelectedIndex}
              onChartCanvasReady={handleChartCanvasReady}
            />
          )}

          {comparisonMode && (
            <ComparisonView
              projects={metrics.projects.filter(p => selectedForComparison.has(p.id))}
              dashboardService={dashboardService}
              deploymentCache={deploymentCache}
              timeframe={config.timeframe}
              darkMode={darkMode}
              onBack={exitComparisonMode}
              onRemoveProject={removeProjectFromComparison}
            />
          )}
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
          dashboardService={dashboardService}
          timeframe={config.timeframe}
          darkMode={darkMode}
        />
      )}

      {showSaveDialog && (
        <SaveConfigDialog
          existingNames={savedConfigs.map(c => c.name)}
          defaultName={
            config.groups.length > 0 && config.groups[0].name
              ? config.groups[0].name
              : ''
          }
          onSave={handleSaveConfig}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}

      {showConfigManager && (
        <ConfigManager
          savedConfigs={savedConfigs}
          activeConfigId={activeConfigId}
          onRename={handleRenameConfig}
          onDelete={handleDeleteConfig}
          onExport={handleExportConfig}
          onImport={handleImportConfig}
          onClose={() => setShowConfigManager(false)}
        />
      )}

      {showShortcutsOverlay && (
        <ShortcutsOverlay
          onClose={() => setShowShortcutsOverlay(false)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default App;

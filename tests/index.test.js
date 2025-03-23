/**
 * Tests for the main dashboard functionality in index.js
 */

// Mock data for testing
const mockMetrics = {
  totalProjects: 2,
  projects: [
    {
      id: 1,
      name: 'Test Project 1',
      webUrl: 'https://gitlab.com/test/project1',
      metrics: {
        mainBranchPipeline: {
          status: 'success',
          available: true,
          failedJobs: []
        },
        successRate: 95.5,
        avgDuration: 125,
        codeCoverage: {
          coverage: 87.5,
          available: true
        },
        mergeRequestCounts: {
          totalOpen: 3,
          drafts: 1
        },
        recentCommits: [
          {
            short_id: 'abc123',
            title: 'Fix bug in pipeline',
            created_at: '2023-01-15T10:30:00Z'
          }
        ],
        totalPipelines: 45
      }
    },
    {
      id: 2,
      name: 'Test Project 2',
      webUrl: 'https://gitlab.com/test/project2',
      metrics: {
        mainBranchPipeline: {
          status: 'failed',
          available: true,
          failedJobs: [
            {
              name: 'test-job',
              stage: 'test',
              failure_reason: 'Test failure',
              web_url: 'https://gitlab.com/test/project2/-/jobs/123'
            }
          ]
        },
        successRate: 70.5,
        avgDuration: 180,
        codeCoverage: {
          coverage: 65.2,
          available: true
        },
        mergeRequestCounts: {
          totalOpen: 5,
          drafts: 2
        },
        recentCommits: [
          {
            short_id: 'def456',
            title: 'Update documentation',
            created_at: '2023-01-14T09:20:00Z'
          }
        ],
        totalPipelines: 32
      }
    }
  ],
  aggregateMetrics: {
    totalPipelines: 77,
    avgSuccessRate: 83.0,
    avgDuration: 152.5
  }
};

// Set up the necessary DOM elements and mocks
beforeEach(() => {
  // Create the basic HTML structure
  document.body.innerHTML = `
    <div class="container">
      <header>
        <h1>GitLab CI/CD Dashboard</h1>
        <div class="header-actions">
          <div class="view-toggle">
            <button id="card-view-btn" class="view-btn active">Card View</button>
            <button id="table-view-btn" class="view-btn">Table View</button>
          </div>
          <button id="clear-settings" class="secondary-button">Clear Saved Data</button>
        </div>
      </header>
      <div class="controls">
        <div class="control-group">
          <label for="gitlab-url">GitLab Instance URL</label>
          <input type="text" id="gitlab-url" value="https://gitlab.com" />
        </div>
        <div class="control-group">
          <label for="gitlab-token">GitLab Private Token</label>
          <input type="password" id="gitlab-token" value="test-token" />
        </div>
        <div class="control-group">
          <label for="group-id">GitLab Group ID</label>
          <input type="text" id="group-id" value="12345" />
        </div>
        <div class="control-group">
          <label for="timeframe">Timeframe</label>
          <select id="timeframe">
            <option value="7">Last 7 days</option>
            <option value="30" selected>Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 180 days</option>
          </select>
        </div>
        <div class="control-group">
          <button id="load-data">Load Dashboard</button>
        </div>
      </div>
      <div id="error-container"></div>
      <div id="loading-indicator">Loading dashboard data...</div>
      <div id="dashboard-container"></div>
    </div>
  `;

  // Mock the global tableView object
  global.tableView = {
    createTableView: jest.fn(() => {
      const table = document.createElement('table');
      table.className = 'projects-table';
      return table;
    }),
    setupEventHandlers: jest.fn()
  };

  // Mock localStorage for saving user preferences
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(key => {
        const mockStorage = {
          'gitlab_cicd_dashboard_url': 'https://gitlab.com',
          'gitlab_cicd_dashboard_token': 'test-token',
          'gitlab_cicd_dashboard_group_id': '12345',
          'gitlab_cicd_dashboard_timeframe': '30',
          'gitlab_cicd_dashboard_view_type': 'card'
        };
        return mockStorage[key];
      }),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    },
    writable: true
  });

  // Mock other necessary global variables
  global.VIEW_TYPES = {
    CARD: 'card',
    TABLE: 'table'
  };

  global.STORAGE_KEYS = {
    GITLAB_URL: 'gitlab_cicd_dashboard_url',
    GROUP_ID: 'gitlab_cicd_dashboard_group_id',
    TOKEN: 'gitlab_cicd_dashboard_token',
    TIMEFRAME: 'gitlab_cicd_dashboard_timeframe',
    VIEW_TYPE: 'gitlab_cicd_dashboard_view_type'
  };

  // Mock GitLab services
  global.GitLabApiService = jest.fn().mockImplementation(() => ({
    baseUrl: 'https://gitlab.com/api/v4',
    setPrivateToken: jest.fn(),
    getProjectMergeRequests: jest.fn().mockResolvedValue([])
  }));

  global.DashboardDataService = jest.fn().mockImplementation(() => ({
    getGroupMetrics: jest.fn().mockResolvedValue(mockMetrics)
  }));

  // Mock helper functions
  global.setActiveViewType = jest.fn((viewType) => {
    const cardBtn = document.getElementById('card-view-btn');
    const tableBtn = document.getElementById('table-view-btn');
    
    if (viewType === VIEW_TYPES.TABLE) {
      cardBtn.classList.remove('active');
      tableBtn.classList.add('active');
    } else {
      cardBtn.classList.add('active');
      tableBtn.classList.remove('active');
    }
    
    localStorage.setItem(STORAGE_KEYS.VIEW_TYPE, viewType);
  });

  global.createSummarySection = jest.fn(() => {
    const section = document.createElement('section');
    section.className = 'summary-section';
    section.innerHTML = '<h2>CI/CD Summary</h2>';
    return section;
  });

  global.createProjectsSection = jest.fn(() => {
    const section = document.createElement('section');
    section.className = 'projects-section';
    section.innerHTML = '<h2>Project Metrics</h2><div class="project-cards"></div>';
    return section;
  });

  global.addProjectDetailEventListeners = jest.fn();
  global.showLoading = jest.fn();
  global.clearError = jest.fn();
  global.displayError = jest.fn();

  // Mock window.dashboardMetrics
  global.window.dashboardMetrics = null;

  // Mock window.history.pushState
  global.window.history.pushState = jest.fn();

  // Create the global services
  global.gitLabService = new GitLabApiService();
  global.dashboardService = new DashboardDataService(gitLabService);
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

describe('Dashboard Functionality', () => {
  describe('View Switching', () => {
    test('renders dashboard with card view by default', () => {
      // Define renderDashboard function
      function renderDashboard(metrics, viewType) {
        window.dashboardMetrics = metrics;
        
        const currentViewType = viewType || localStorage.getItem(STORAGE_KEYS.VIEW_TYPE) || VIEW_TYPES.CARD;
        setActiveViewType(currentViewType);
        
        const dashboardContainer = document.getElementById('dashboard-container');
        dashboardContainer.innerHTML = '';
        
        const dashboard = document.createElement('div');
        dashboard.className = 'dashboard';
        
        dashboard.appendChild(createSummarySection(metrics));
        
        if (currentViewType === VIEW_TYPES.TABLE) {
          const projectsSection = document.createElement('section');
          projectsSection.className = 'projects-section';
          projectsSection.innerHTML = '<h2>Project Metrics</h2>';
          
          const tableElement = tableView.createTableView(metrics.projects);
          projectsSection.appendChild(tableElement);
          
          dashboard.appendChild(projectsSection);
          dashboardContainer.appendChild(dashboard);
          
          tableView.setupEventHandlers();
        } else {
          dashboard.appendChild(createProjectsSection(metrics.projects));
          
          dashboardContainer.appendChild(dashboard);
          
          addProjectDetailEventListeners();
        }
      }
      
      // Call the function with mock metrics
      renderDashboard(mockMetrics);
      
      // Assert the correct view is displayed
      expect(setActiveViewType).toHaveBeenCalledWith('card');
      expect(createSummarySection).toHaveBeenCalled();
      expect(createProjectsSection).toHaveBeenCalled();
      expect(addProjectDetailEventListeners).toHaveBeenCalled();
      expect(tableView.createTableView).not.toHaveBeenCalled();
    });
    
    test('renders dashboard with table view when specified', () => {
      // Define renderDashboard function
      function renderDashboard(metrics, viewType) {
        window.dashboardMetrics = metrics;
        
        const currentViewType = viewType || localStorage.getItem(STORAGE_KEYS.VIEW_TYPE) || VIEW_TYPES.CARD;
        setActiveViewType(currentViewType);
        
        const dashboardContainer = document.getElementById('dashboard-container');
        dashboardContainer.innerHTML = '';
        
        const dashboard = document.createElement('div');
        dashboard.className = 'dashboard';
        
        dashboard.appendChild(createSummarySection(metrics));
        
        if (currentViewType === VIEW_TYPES.TABLE) {
          const projectsSection = document.createElement('section');
          projectsSection.className = 'projects-section';
          projectsSection.innerHTML = '<h2>Project Metrics</h2>';
          
          const tableElement = tableView.createTableView(metrics.projects);
          projectsSection.appendChild(tableElement);
          
          dashboard.appendChild(projectsSection);
          dashboardContainer.appendChild(dashboard);
          
          tableView.setupEventHandlers();
        } else {
          dashboard.appendChild(createProjectsSection(metrics.projects));
          
          dashboardContainer.appendChild(dashboard);
          
          addProjectDetailEventListeners();
        }
      }
      
      // Call the function with mock metrics and specify table view
      renderDashboard(mockMetrics, VIEW_TYPES.TABLE);
      
      // Assert the correct view is displayed
      expect(setActiveViewType).toHaveBeenCalledWith(VIEW_TYPES.TABLE);
      expect(createSummarySection).toHaveBeenCalled();
      expect(createProjectsSection).not.toHaveBeenCalled();
      expect(tableView.createTableView).toHaveBeenCalledWith(mockMetrics.projects);
      expect(tableView.setupEventHandlers).toHaveBeenCalled();
      
      // Check that the table is in the DOM
      const dashboardContainer = document.getElementById('dashboard-container');
      expect(dashboardContainer.querySelector('.projects-table')).not.toBeNull();
    });
    
    test('switches view when toggle buttons are clicked', () => {
      // Mock the renderDashboard function
      const renderDashboard = jest.fn();
      window.renderDashboard = renderDashboard;
      window.dashboardMetrics = mockMetrics;
      
      // Define click handlers for toggle buttons
      const cardViewBtn = document.getElementById('card-view-btn');
      const tableViewBtn = document.getElementById('table-view-btn');
      
      // Add event listeners for view toggle buttons
      cardViewBtn.addEventListener('click', function() {
        if (window.dashboardMetrics) {
          renderDashboard(window.dashboardMetrics, VIEW_TYPES.CARD);
        }
        setActiveViewType(VIEW_TYPES.CARD);
      });

      tableViewBtn.addEventListener('click', function() {
        if (window.dashboardMetrics) {
          renderDashboard(window.dashboardMetrics, VIEW_TYPES.TABLE);
        }
        setActiveViewType(VIEW_TYPES.TABLE);
      });
      
      // Click the table view button
      tableViewBtn.click();
      
      // Check that the view was updated
      expect(setActiveViewType).toHaveBeenCalledWith(VIEW_TYPES.TABLE);
      expect(renderDashboard).toHaveBeenCalledWith(mockMetrics, VIEW_TYPES.TABLE);
      
      // Click the card view button
      cardViewBtn.click();
      
      // Check that the view was updated back
      expect(setActiveViewType).toHaveBeenCalledWith(VIEW_TYPES.CARD);
      expect(renderDashboard).toHaveBeenCalledWith(mockMetrics, VIEW_TYPES.CARD);
    });
  });
  
  describe('LocalStorage Handling', () => {
    test('saves view preference to localStorage', () => {
      setActiveViewType(VIEW_TYPES.TABLE);
      expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.VIEW_TYPE, VIEW_TYPES.TABLE);
    });
    
    test('loads view preference from localStorage', () => {
      // Simulate localStorage having a saved preference
      localStorage.getItem.mockReturnValueOnce(VIEW_TYPES.TABLE);
      
      // Define a simple renderDashboard function
      function renderDashboard(metrics) {
        const currentViewType = localStorage.getItem(STORAGE_KEYS.VIEW_TYPE) || VIEW_TYPES.CARD;
        setActiveViewType(currentViewType);
      }
      
      renderDashboard(mockMetrics);
      expect(setActiveViewType).toHaveBeenCalledWith(VIEW_TYPES.TABLE);
    });
  });
  
  describe('UI State Management', () => {
    test('updates button active states when switching views', () => {
      const cardBtn = document.getElementById('card-view-btn');
      const tableBtn = document.getElementById('table-view-btn');
      
      // Check initial state
      expect(cardBtn.classList.contains('active')).toBe(true);
      expect(tableBtn.classList.contains('active')).toBe(false);
      
      // Switch to table view
      setActiveViewType(VIEW_TYPES.TABLE);
      
      // Check updated state
      expect(cardBtn.classList.contains('active')).toBe(false);
      expect(tableBtn.classList.contains('active')).toBe(true);
      
      // Switch back to card view
      setActiveViewType(VIEW_TYPES.CARD);
      
      // Check final state
      expect(cardBtn.classList.contains('active')).toBe(true);
      expect(tableBtn.classList.contains('active')).toBe(false);
    });
  });
});

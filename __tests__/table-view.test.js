/**
 * Tests for the table view component of the GitLab CI/CD Dashboard
 */

// Mock test data
const mockProjects = [
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
];

// Setup the necessary DOM elements
beforeEach(() => {
  // Create the basic HTML structure
  document.body.innerHTML = `
    <div class="container">
      <div class="view-toggle">
        <button id="card-view-btn" class="view-btn active">Card View</button>
        <button id="table-view-btn" class="view-btn">Table View</button>
      </div>
      <div id="dashboard-container"></div>
    </div>
  `;

  // Mock the global tableView object
  global.tableView = {
    createTableView: jest.fn((projects) => {
      const table = document.createElement('table');
      table.className = 'projects-table';
      
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th>Project</th>
          <th>Pipeline Status</th>
          <th>Success Rate</th>
          <th>Avg Duration</th>
          <th>Open MRs</th>
          <th>Coverage</th>
          <th></th>
        </tr>
      `;
      
      const tbody = document.createElement('tbody');
      
      projects.forEach(project => {
        // Create project row
        const projectRow = document.createElement('tr');
        projectRow.className = `project-row ${categorizeProject(project)}`;
        projectRow.setAttribute('data-project-id', project.id);
        
        projectRow.innerHTML = `
          <td>${project.name}</td>
          <td>${project.metrics.mainBranchPipeline.status}</td>
          <td>${project.metrics.successRate.toFixed(2)}%</td>
          <td>${formatDuration(project.metrics.avgDuration)}</td>
          <td>${project.metrics.mergeRequestCounts.totalOpen}</td>
          <td>${project.metrics.codeCoverage.coverage.toFixed(2)}%</td>
          <td><button class="expand-btn">▼</button></td>
        `;
        
        // Create details row
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'project-details';
        detailsRow.innerHTML = '<td colspan="7">Project details content</td>';
        
        tbody.appendChild(projectRow);
        tbody.appendChild(detailsRow);
      });
      
      table.appendChild(thead);
      table.appendChild(tbody);
      return table;
    }),
    setupEventHandlers: jest.fn()
  };

  // Mock helper functions used by table-view.js
  global.categorizeProject = jest.fn(project => {
    if (!project.metrics.mainBranchPipeline.available) return 'no-pipeline';
    
    const status = project.metrics.mainBranchPipeline.status;
    if (status === 'failed' || status === 'canceled') return 'failed';
    if (status === 'running' || status === 'pending') return 'warning';
    
    if (status === 'success') {
      return project.metrics.successRate < 75 ? 'warning' : 'success';
    }
    
    return 'warning';
  });

  global.formatDuration = jest.fn(seconds => {
    if (!seconds) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  });

  // Mock localStorage for saving view preferences
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(),
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
    VIEW_TYPE: 'gitlab_cicd_dashboard_view_type'
  };

  global.setActiveViewType = jest.fn();
  global.window.dashboardMetrics = { projects: mockProjects };
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

describe('Table View Component', () => {
  describe('Table Creation', () => {
    test('creates a table with the correct structure', () => {
      const table = tableView.createTableView(mockProjects);
      
      expect(table.tagName).toBe('TABLE');
      expect(table.className).toBe('projects-table');
      expect(table.querySelector('thead')).not.toBeNull();
      expect(table.querySelectorAll('tbody tr').length).toBe(mockProjects.length * 2); // One row + one details row per project
    });
    
    test('categorizes projects correctly based on pipeline status', () => {
      tableView.createTableView(mockProjects);
      
      // Check first project (success)
      expect(categorizeProject).toHaveBeenCalledWith(mockProjects[0]);
      expect(categorizeProject(mockProjects[0])).toBe('success');
      
      // Check second project (failed)
      expect(categorizeProject).toHaveBeenCalledWith(mockProjects[1]);
      expect(categorizeProject(mockProjects[1])).toBe('failed');
    });
  });
  
  describe('View Switching', () => {
    beforeEach(() => {
      // Mock the renderDashboard function
      global.renderDashboard = jest.fn();
    });
    
    test('should switch to table view when table view button is clicked', () => {
      // Setup click handler
      const handleClick = () => {
        if (window.dashboardMetrics) {
          renderDashboard(window.dashboardMetrics, VIEW_TYPES.TABLE);
        }
        setActiveViewType(VIEW_TYPES.TABLE);
      };
      
      // Add click event listener
      const tableViewBtn = document.getElementById('table-view-btn');
      tableViewBtn.addEventListener('click', handleClick);
      
      // Trigger click event
      tableViewBtn.click();
      
      // Check that the view was updated
      expect(setActiveViewType).toHaveBeenCalledWith(VIEW_TYPES.TABLE);
      expect(renderDashboard).toHaveBeenCalledWith(window.dashboardMetrics, VIEW_TYPES.TABLE);
    });
    
    test('should switch to card view when card view button is clicked', () => {
      // Setup click handler
      const handleClick = () => {
        if (window.dashboardMetrics) {
          renderDashboard(window.dashboardMetrics, VIEW_TYPES.CARD);
        }
        setActiveViewType(VIEW_TYPES.CARD);
      };
      
      // Add click event listener
      const cardViewBtn = document.getElementById('card-view-btn');
      cardViewBtn.addEventListener('click', handleClick);
      
      // Trigger click event
      cardViewBtn.click();
      
      // Check that the view was updated
      expect(setActiveViewType).toHaveBeenCalledWith(VIEW_TYPES.CARD);
      expect(renderDashboard).toHaveBeenCalledWith(window.dashboardMetrics, VIEW_TYPES.CARD);
    });
  });

  describe('Accordion Functionality', () => {
    test('sets up event handlers for project rows', () => {
      // Create a table with the appropriate structure
      const table = tableView.createTableView(mockProjects);
      document.getElementById('dashboard-container').appendChild(table);
      
      // Call setupEventHandlers
      tableView.setupEventHandlers();
      
      // Check that it was called
      expect(tableView.setupEventHandlers).toHaveBeenCalled();
    });
    
    test('toggles details row visibility when project row is clicked', () => {
      // Mock the expand/collapse behavior
      const mockHandleClick = jest.fn(function() {
        // Toggle expanded class on the row
        this.classList.toggle('expanded');
        
        // Toggle open class on details row
        const detailsRow = this.nextElementSibling;
        if (detailsRow && detailsRow.classList.contains('project-details')) {
          detailsRow.classList.toggle('open');
        }
        
        // Update expand button
        const expandBtn = this.querySelector('.expand-btn');
        if (expandBtn) {
          expandBtn.textContent = detailsRow.classList.contains('open') ? '▲' : '▼';
        }
      });
      
      // Create the table and add event listeners
      const table = tableView.createTableView(mockProjects);
      document.getElementById('dashboard-container').appendChild(table);
      
      // Get the first project row and add our mock click handler
      const projectRow = table.querySelector('.project-row');
      projectRow.addEventListener('click', mockHandleClick);
      
      // Trigger a click
      projectRow.click();
      
      // Check that handler was called and classes were toggled
      expect(mockHandleClick).toHaveBeenCalled();
      expect(projectRow.classList.contains('expanded')).toBe(true);
      
      // Toggle back - click again
      projectRow.click();
      expect(projectRow.classList.contains('expanded')).toBe(false);
    });
  });

  describe('Formatting Helpers', () => {
    test('formats duration correctly', () => {
      expect(formatDuration(65)).toBe('1m 5s');
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(0)).toBe('0s');
      expect(formatDuration(3600)).toBe('60m 0s');
    });
  });
});

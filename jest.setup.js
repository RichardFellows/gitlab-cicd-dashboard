// Import Jest DOM matchers
require('@testing-library/jest-dom');

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: function(key) {
      return store[key] || null;
    },
    setItem: function(key, value) {
      store[key] = value.toString();
    },
    removeItem: function(key) {
      delete store[key];
    },
    clear: function() {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock Chart.js to avoid canvas errors
jest.mock('chart.js', () => {
  return {
    Chart: jest.fn().mockImplementation(() => ({
      destroy: jest.fn(),
    })),
  };
});

// Create stubs for HTML elements that would be created by code
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
        <input type="password" id="gitlab-token" />
      </div>
      <div class="control-group">
        <label for="group-id">GitLab Group ID</label>
        <input type="text" id="group-id" />
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
        <label>&nbsp;</label>
        <button id="load-data">Load Dashboard</button>
      </div>
    </div>
    <div id="error-container"></div>
    <div id="loading-indicator">Loading dashboard data...</div>
    <div id="dashboard-container"></div>
  </div>
`;

// Mock fetch
global.fetch = jest.fn();

// Mock the GitLab API Service
global.GitLabApiService = jest.fn().mockImplementation(() => ({
  baseUrl: 'https://gitlab.com/api/v4',
  setPrivateToken: jest.fn(),
  getProjectMergeRequests: jest.fn().mockResolvedValue([]),
}));

// Mock the Dashboard Data Service
global.DashboardDataService = jest.fn().mockImplementation(() => ({
  getGroupMetrics: jest.fn().mockResolvedValue({
    totalProjects: 0,
    projects: [],
    aggregateMetrics: {
      totalPipelines: 0,
      avgSuccessRate: 0,
      avgDuration: 0
    }
  }),
}));

// Make global variables available that would be created at runtime
global.window.dashboardMetrics = null;

// Mock Canvas
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  save: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  restore: jest.fn(),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
}));

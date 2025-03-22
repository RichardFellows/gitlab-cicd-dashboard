// Initialize services
const gitLabService = new GitLabApiService();
const dashboardService = new DashboardDataService(gitLabService);

// LocalStorage keys
const STORAGE_KEYS = {
  GITLAB_URL: 'gitlab_cicd_dashboard_url',
  GROUP_ID: 'gitlab_cicd_dashboard_group_id',
  TOKEN: 'gitlab_cicd_dashboard_token',
  TIMEFRAME: 'gitlab_cicd_dashboard_timeframe'
};

// DOM elements
const gitlabUrlInput = document.getElementById('gitlab-url');
const tokenInput = document.getElementById('gitlab-token');
const groupIdInput = document.getElementById('group-id');
const timeframeSelect = document.getElementById('timeframe');
const loadButton = document.getElementById('load-data');
const dashboardContainer = document.getElementById('dashboard-container');
const loadingIndicator = document.getElementById('loading-indicator');
const errorContainer = document.getElementById('error-container');

// Load saved values from localStorage
loadSavedSettings();

/**
 * Load saved settings from localStorage
 */
function loadSavedSettings() {
  // Load values if they exist
  const savedUrl = localStorage.getItem(STORAGE_KEYS.GITLAB_URL);
  const savedGroupId = localStorage.getItem(STORAGE_KEYS.GROUP_ID);
  const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const savedTimeframe = localStorage.getItem(STORAGE_KEYS.TIMEFRAME);
  
  if (savedUrl) {
    gitlabUrlInput.value = savedUrl;
  }
  
  if (savedGroupId) {
    groupIdInput.value = savedGroupId;
  }
  
  if (savedToken) {
    tokenInput.value = savedToken;
  }
  
  if (savedTimeframe) {
    timeframeSelect.value = savedTimeframe;
  }
  
  // Auto-load dashboard if we have all required values
  if (savedUrl && savedGroupId && savedToken) {
    loadDashboard();
  }
}

/**
 * Save current settings to localStorage
 */
function saveSettings() {
  const baseUrl = gitlabUrlInput.value.trim();
  const token = tokenInput.value.trim();
  const groupId = groupIdInput.value.trim();
  const timeframe = timeframeSelect.value;
  
  localStorage.setItem(STORAGE_KEYS.GITLAB_URL, baseUrl);
  localStorage.setItem(STORAGE_KEYS.GROUP_ID, groupId);
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.TIMEFRAME, timeframe);
}

/**
 * Load dashboard data using current input values
 */
async function loadDashboard() {
  const baseUrl = gitlabUrlInput.value.trim();
  const token = tokenInput.value.trim();
  const groupId = groupIdInput.value.trim();
  const timeframe = parseInt(timeframeSelect.value, 10);

  if (!baseUrl || !token || !groupId) {
    displayError('Please provide GitLab URL, token, and group ID');
    return;
  }

  try {
    showLoading(true);
    clearError();

    // Save settings to localStorage
    saveSettings();

    // Update GitLab API base URL and token
    gitLabService.baseUrl = baseUrl.endsWith('/api/v4') ? baseUrl : `${baseUrl}/api/v4`;
    gitLabService.setPrivateToken(token);

    // Fetch metrics
    const metrics = await dashboardService.getGroupMetrics(groupId, { days: timeframe });

    // Render dashboard
    renderDashboard(metrics);
  } catch (error) {
    displayError(`Failed to load dashboard data: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

// Event listeners
loadButton.addEventListener('click', loadDashboard);

// Add event handler for clearing saved settings
const clearSettingsButton = document.getElementById('clear-settings');
if (clearSettingsButton) {
  clearSettingsButton.addEventListener('click', () => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.GITLAB_URL);
    localStorage.removeItem(STORAGE_KEYS.GROUP_ID);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TIMEFRAME);
    
    // Clear input fields
    gitlabUrlInput.value = 'https://gitlab.com';
    tokenInput.value = '';
    groupIdInput.value = '';
    timeframeSelect.value = '30';
    
    // Clear dashboard
    dashboardContainer.innerHTML = '';
    
    // Show confirmation
    alert('Saved settings have been cleared.');
  });
}

// Helper functions
function showLoading(isLoading) {
  loadingIndicator.style.display = isLoading ? 'block' : 'none';
  loadButton.disabled = isLoading;
}

function displayError(message) {
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';
}

function clearError() {
  errorContainer.textContent = '';
  errorContainer.style.display = 'none';
}

function renderDashboard(metrics) {
  // Clear previous content
  dashboardContainer.innerHTML = '';

  // Create dashboard elements
  const dashboard = document.createElement('div');
  dashboard.className = 'dashboard';

  // Add summary section
  dashboard.appendChild(createSummarySection(metrics));

  // Add project cards
  dashboard.appendChild(createProjectsSection(metrics.projects));

  // Append to container
  dashboardContainer.appendChild(dashboard);
}

function createSummarySection(metrics) {
  const aggregate = metrics.aggregateMetrics;

  const section = document.createElement('section');
  section.className = 'summary-section';

  section.innerHTML = `
    <h2>CI/CD Summary</h2>
    <div class="summary-cards">
      <div class="summary-card">
        <h3>Projects</h3>
        <div class="metric">${metrics.totalProjects}</div>
      </div>
      <div class="summary-card">
        <h3>Total Pipelines</h3>
        <div class="metric">${aggregate.totalPipelines}</div>
      </div>
      <div class="summary-card">
        <h3>Success Rate</h3>
        <div class="metric">${aggregate.avgSuccessRate.toFixed(2)}%</div>
      </div>
      <div class="summary-card">
        <h3>Avg Duration</h3>
        <div class="metric">${formatDuration(aggregate.avgDuration)}</div>
      </div>
    </div>
    <div class="chart-container">
      <canvas id="pipeline-status-chart"></canvas>
    </div>
  `;

  // Add chart after the section is added to the DOM
  setTimeout(() => {
    const ctx = document.getElementById('pipeline-status-chart').getContext('2d');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Successful', 'Failed', 'Canceled', 'Running'],
        datasets: [{
          data: [
            aggregate.successfulPipelines,
            aggregate.failedPipelines,
            aggregate.canceledPipelines,
            aggregate.runningPipelines
          ],
          backgroundColor: [
            '#28a745', // green
            '#dc3545', // red
            '#6c757d', // gray
            '#17a2b8'  // blue
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }, 0);

  return section;
}

function createProjectsSection(projects) {
  const section = document.createElement('section');
  section.className = 'projects-section';

  section.innerHTML = `
    <h2>Project Metrics</h2>
    <div class="project-cards">
      ${projects.map(project => `
        <div class="project-card">
          <div class="project-header">
            <h3>${project.name}</h3>
            <a href="${project.webUrl}" target="_blank" rel="noopener noreferrer">View on GitLab</a>
          </div>
          <div class="project-metrics">
            <div class="metric-section">
              <h4>Pipeline Status</h4>
              <div class="metric-item">
                <span class="metric-label">Main Branch:</span>
                <span class="metric-value ${project.metrics.mainBranchPipeline.available ? getPipelineStatusClass(project.metrics.mainBranchPipeline.status) : ''}">
                  ${formatPipelineStatus(project.metrics.mainBranchPipeline.status, project.metrics.mainBranchPipeline.available)}
                  ${project.metrics.mainBranchPipeline.available && project.metrics.mainBranchPipeline.web_url ? 
                    `<a href="${project.metrics.mainBranchPipeline.web_url}" target="_blank" title="View pipeline">
                      <i class="icon">🔍</i>
                     </a>` : ''}
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Success Rate:</span>
                <span class="metric-value ${getSuccessRateClass(project.metrics.successRate)}">${project.metrics.successRate.toFixed(2)}%</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Avg Duration:</span>
                <span class="metric-value">${formatDuration(project.metrics.avgDuration)}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Code Coverage:</span>
                <span class="metric-value">${formatCoverage(project.metrics.codeCoverage.coverage, project.metrics.codeCoverage.available)}</span>
              </div>
            </div>
            
            <div class="metric-section">
              <h4>Recent Commits</h4>
              <div class="recent-commits">
                ${project.metrics.recentCommits.length > 0 ? 
                  project.metrics.recentCommits.map(commit => `
                    <div class="commit-item">
                      <div class="commit-header">
                        <span class="commit-id">${commit.short_id}</span>
                        <span class="commit-date">${formatDate(commit.created_at)}</span>
                      </div>
                      <div class="commit-message">${escapeHtml(commit.title)}</div>
                    </div>
                  `).join('') : 
                  '<div class="no-data">No recent commits found</div>'
                }
              </div>
            </div>
            
            <div class="metric-section">
              <h4>Test Results</h4>
              <div class="metric-item">
                <span class="metric-label">Tests:</span>
                ${project.metrics.testMetrics.available ?
                  `<span class="metric-value">${project.metrics.testMetrics.total}</span>
                   <span class="test-details">
                     (${project.metrics.testMetrics.success} passed,
                     ${project.metrics.testMetrics.failed} failed)
                   </span>` :
                  `<span class="metric-value">No Test Data Available</span>`
                }
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  return section;
}

function getSuccessRateClass(rate) {
  if (rate >= 90) return 'success';
  if (rate >= 75) return 'warning';
  return 'danger';
}

function formatDuration(seconds) {
  if (!seconds) return '0s';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function getPipelineStatusClass(status) {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'danger';
    case 'running':
      return 'warning';
    case 'canceled':
      return 'danger';
    case 'pending':
      return 'warning';
    default:
      return '';
  }
}

function formatPipelineStatus(status, available) {
  if (!status || status === 'unknown' || available === false) return 'No Pipeline Data';
  
  // Capitalize first letter
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatCoverage(coverage, available) {
  if (available === false) return 'Not Available';
  if (coverage === null || coverage === undefined) return 'No Coverage Data';
  return `${coverage.toFixed(2)}%`;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleString();
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
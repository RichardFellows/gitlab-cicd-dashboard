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

    // Add more validation for the metrics data
    if (!metrics || !metrics.projects) {
      throw new Error('Invalid metrics data received from API');
    }

    // Ensure all projects have valid metrics
    metrics.projects = metrics.projects.map(project => {
      try {
        // Ensure the project has a metrics object
        if (!project.metrics) {
          console.warn(`Project ${project.name} has no metrics, creating empty object`);
          project.metrics = {};
        }

        // Ensure all required properties exist
        if (!project.metrics.mainBranchPipeline) {
          project.metrics.mainBranchPipeline = { available: false, failedJobs: [] };
        } else if (!project.metrics.mainBranchPipeline.failedJobs) {
          project.metrics.mainBranchPipeline.failedJobs = [];
        }
        
        if (!project.metrics.codeCoverage) {
          project.metrics.codeCoverage = { coverage: null, available: false };
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
          name: project.name || 'Unknown Project',
          webUrl: project.webUrl || '#',
          metrics: {
            mainBranchPipeline: { available: false },
            codeCoverage: { coverage: null, available: false },
            testMetrics: { total: 0, success: 0, failed: 0, skipped: 0, available: false },
            recentCommits: [],
            successRate: 0,
            avgDuration: 0
          }
        };
      }
    });

    // Render dashboard
    renderDashboard(metrics);
  } catch (error) {
    console.error('Dashboard loading error:', error);
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

  // Store metrics in a global variable for later use
  window.dashboardMetrics = metrics;

  // Add summary section
  dashboard.appendChild(createSummarySection(metrics));

  // Add project cards
  dashboard.appendChild(createProjectsSection(metrics.projects));

  // Append to container
  dashboardContainer.appendChild(dashboard);

  // Add event listeners for project detail links
  addProjectDetailEventListeners();
}

function createSummarySection(metrics) {
  const aggregate = metrics.aggregateMetrics;
  
  // Count projects by their pipeline status
  const projectStatusCounts = {
    success: 0,
    warning: 0,
    failed: 0,
    'no-pipeline': 0
  };
  
  // Categorize each project
  metrics.projects.forEach(project => {
    const category = categorizeProject(project);
    projectStatusCounts[category]++;
  });

  const section = document.createElement('section');
  section.className = 'summary-section';

  section.innerHTML = `
    <h2>CI/CD Summary</h2>
    <div class="summary-cards">
      <div class="summary-card">
        <h3>Total Projects</h3>
        <div class="metric">${metrics.totalProjects}</div>
      </div>
      <div class="summary-card success">
        <h3>Successful</h3>
        <div class="metric">${projectStatusCounts.success}</div>
      </div>
      <div class="summary-card warning">
        <h3>Warning</h3>
        <div class="metric">${projectStatusCounts.warning}</div>
      </div>
      <div class="summary-card danger">
        <h3>Failed</h3>
        <div class="metric">${projectStatusCounts.failed}</div>
      </div>
      <div class="summary-card no-pipeline">
        <h3>No Pipeline</h3>
        <div class="metric">${projectStatusCounts['no-pipeline']}</div>
      </div>
    </div>
    <div class="summary-metrics">
      <div class="summary-metric-row">
        <div class="summary-metric">
          <span class="metric-label">Total Pipelines:</span>
          <span class="metric-value">${aggregate.totalPipelines}</span>
        </div>
        <div class="summary-metric">
          <span class="metric-label">Success Rate:</span>
          <span class="metric-value ${getSuccessRateClass(aggregate.avgSuccessRate)}">${aggregate.avgSuccessRate.toFixed(2)}%</span>
        </div>
        <div class="summary-metric">
          <span class="metric-label">Avg Duration:</span>
          <span class="metric-value">${formatDuration(aggregate.avgDuration)}</span>
        </div>
      </div>
    </div>
    <div class="chart-container">
      <canvas id="project-status-chart"></canvas>
    </div>
  `;

  // Add chart after the section is added to the DOM
  setTimeout(() => {
    const ctx = document.getElementById('project-status-chart').getContext('2d');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Successful', 'Warning', 'Failed', 'No Pipeline'],
        datasets: [{
          data: [
            projectStatusCounts.success,
            projectStatusCounts.warning,
            projectStatusCounts.failed,
            projectStatusCounts['no-pipeline']
          ],
          backgroundColor: [
            '#28a745', // green
            '#ffc107', // yellow
            '#dc3545', // red
            '#6c757d'  // gray
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }, 0);

  return section;
}

function createProjectsSection(projects) {
  const section = document.createElement('section');
  section.className = 'projects-section';
  
  // Group projects by status
  const groupedProjects = {
    failed: [],
    warning: [],
    'no-pipeline': [],
    success: []
  };
  
  // Categorize and group each project
  projects.forEach(project => {
    const category = categorizeProject(project);
    groupedProjects[category].push(project);
  });
  
  // Function to render a single project card
  const renderProjectCard = (project) => {
    const category = categorizeProject(project);
    
    return `
      <div class="project-card ${category}">
        <div class="project-header">
          <h3><a href="#project/${project.id}" class="project-name-link" data-project-id="${project.id}">${project.name}</a></h3>
          <a href="${project.webUrl}" target="_blank" rel="noopener noreferrer" class="gitlab-link" title="Open in GitLab">
            <i class="gitlab-icon">🔍</i>
          </a>
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
            ${project.metrics.mainBranchPipeline.failedJobs && project.metrics.mainBranchPipeline.failedJobs.length > 0 ? `
              <div class="failed-jobs">
                <details>
                  <summary class="failed-jobs-summary">Failed Jobs (${project.metrics.mainBranchPipeline.failedJobs.length})</summary>
                  <div class="failed-jobs-list">
                    ${project.metrics.mainBranchPipeline.failedJobs.map(job => `
                      <div class="job-item failed">
                        <div class="job-header">
                          <span class="job-name">${job.name}</span>
                          <span class="job-stage">${job.stage}</span>
                        </div>
                        <div class="job-details">
                          <div class="job-reason">${job.failure_reason || 'Unknown failure'}</div>
                          <div class="job-actions">
                            <a href="${job.web_url}" target="_blank" class="job-link">View Job</a>
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </details>
              </div>
            ` : ''}
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
    `;
  };
  
  // Render project groups with headers
  const renderProjectGroup = (title, projects, className) => {
    if (projects.length === 0) return '';
    
    return `
      <div class="project-group ${className}">
        <h3 class="group-header">${title} (${projects.length})</h3>
        <div class="project-cards">
          ${projects.map(project => renderProjectCard(project)).join('')}
        </div>
      </div>
    `;
  };

  section.innerHTML = `
    <h2>Project Metrics</h2>
    
    ${renderProjectGroup('Failed Pipelines', groupedProjects.failed, 'failed-group')}
    ${renderProjectGroup('Warning', groupedProjects.warning, 'warning-group')}
    ${renderProjectGroup('No Pipelines', groupedProjects['no-pipeline'], 'no-pipeline-group')}
    ${renderProjectGroup('Successful', groupedProjects.success, 'success-group')}
  `;

  return section;
}

function getSuccessRateClass(rate) {
  if (rate >= 90) return 'success';
  if (rate >= 75) return 'warning';
  return 'danger';
}

/**
 * Categorize a project based on its pipeline status
 * @param {Object} project - The project object with metrics
 * @returns {string} - Category ('failed', 'warning', 'no-pipeline', 'success')
 */
function categorizeProject(project) {
  // Check if pipeline exists
  if (!project.metrics.mainBranchPipeline.available) {
    return 'no-pipeline';
  }
  
  // Check pipeline status
  const status = project.metrics.mainBranchPipeline.status;
  if (status === 'failed' || status === 'canceled') {
    return 'failed';
  }
  
  if (status === 'running' || status === 'pending') {
    return 'warning';
  }
  
  if (status === 'success') {
    // Even if pipeline is successful, we may want to warn about low success rates
    if (project.metrics.successRate < 75) {
      return 'warning';
    }
    return 'success';
  }
  
  // Default case for unknown statuses
  return 'warning';
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
  
  // Make sure coverage is a number
  let coverageNum = parseFloat(coverage);
  if (isNaN(coverageNum)) {
    console.warn('Invalid coverage value:', coverage);
    return 'Invalid Data';
  }
  
  return `${coverageNum.toFixed(2)}%`;
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

/**
 * Add event listeners to project detail links
 */
function addProjectDetailEventListeners() {
  const projectLinks = document.querySelectorAll('.project-name-link');
  
  projectLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const projectId = this.getAttribute('data-project-id');
      showProjectDetails(projectId);
    });
  });
}

/**
 * Show detailed view for a specific project
 * @param {string} projectId - The project ID
 */
async function showProjectDetails(projectId) {
  try {
    showLoading(true);
    
    // Find the project in our metrics data
    const project = window.dashboardMetrics.projects.find(p => p.id.toString() === projectId.toString());
    
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    
    // Fetch the project's merge requests with pipeline info
    const mergeRequests = await gitLabService.getProjectMergeRequests(projectId);
    
    // Create the project detail view
    const detailView = createProjectDetailView(project, mergeRequests);
    
    // Clear the dashboard and show the detail view
    dashboardContainer.innerHTML = '';
    dashboardContainer.appendChild(detailView);
    
    // Add event listeners for back button
    const backButton = document.getElementById('back-to-dashboard');
    if (backButton) {
      backButton.addEventListener('click', function(e) {
        e.preventDefault();
        renderDashboard(window.dashboardMetrics);
      });
    }
  } catch (error) {
    console.error('Error showing project details:', error);
    displayError(`Failed to load project details: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

/**
 * Create the project detail view
 * @param {Object} project - The project data
 * @param {Array} mergeRequests - The project's merge requests
 * @returns {HTMLElement} - The detail view element
 */
function createProjectDetailView(project, mergeRequests) {
  const detailView = document.createElement('div');
  detailView.className = 'project-detail-view';
  
  detailView.innerHTML = `
    <div class="detail-header">
      <div class="back-button-container">
        <a href="#" id="back-to-dashboard" class="back-button">← Back to Dashboard</a>
      </div>
      <div class="project-title">
        <h2>${project.name}</h2>
        <a href="${project.webUrl}" target="_blank" rel="noopener noreferrer" class="gitlab-link" title="Open in GitLab">
          <i class="gitlab-icon">🔍</i>
        </a>
      </div>
    </div>
    
    <div class="detail-content">
      <div class="detail-section pipeline-status">
        <h3>Pipeline Status</h3>
        <div class="detail-card">
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
          ${project.metrics.mainBranchPipeline.failedJobs && project.metrics.mainBranchPipeline.failedJobs.length > 0 ? `
            <div class="failed-jobs">
              <details open>
                <summary class="failed-jobs-summary">Failed Jobs (${project.metrics.mainBranchPipeline.failedJobs.length})</summary>
                <div class="failed-jobs-list">
                  ${project.metrics.mainBranchPipeline.failedJobs.map(job => `
                    <div class="job-item failed">
                      <div class="job-header">
                        <span class="job-name">${job.name}</span>
                        <span class="job-stage">${job.stage}</span>
                      </div>
                      <div class="job-details">
                        <div class="job-reason">${job.failure_reason || 'Unknown failure'}</div>
                        <div class="job-actions">
                          <a href="${job.web_url}" target="_blank" class="job-link">View Job</a>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </details>
            </div>
          ` : ''}
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
      </div>
      
      <div class="detail-section merge-requests">
        <h3>Active Merge Requests</h3>
        <div class="merge-requests-container">
          ${mergeRequests.length > 0 ? `
            <div class="merge-requests-list">
              ${mergeRequests.map(mr => `
                <div class="mr-card">
                  <div class="mr-header">
                    <div class="mr-title">
                      <a href="${mr.web_url}" target="_blank" rel="noopener noreferrer">${escapeHtml(mr.title)}</a>
                    </div>
                    <div class="mr-meta">
                      <span class="mr-branch">Source: ${mr.source_branch}</span>
                      <span class="mr-author">${mr.author?.name || 'Unknown'}</span>
                      <span class="mr-date">${formatDate(mr.created_at)}</span>
                    </div>
                  </div>
                  ${mr.head_pipeline ? `
                    <div class="mr-pipeline">
                      <div class="pipeline-status ${getPipelineStatusClass(mr.head_pipeline.status)}">
                        <span class="status-label">Pipeline:</span>
                        <span class="status-value">${formatPipelineStatus(mr.head_pipeline.status, true)}</span>
                        <a href="${mr.head_pipeline.web_url}" target="_blank" class="pipeline-link">View Pipeline</a>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : '<div class="no-data">No active merge requests</div>'}
        </div>
      </div>
      
      <div class="detail-section recent-activity">
        <h3>Recent Commits</h3>
        <div class="detail-card">
          <div class="recent-commits">
            ${project.metrics.recentCommits.length > 0 ? 
              project.metrics.recentCommits.map(commit => `
                <div class="commit-item">
                  <div class="commit-header">
                    <span class="commit-id">${commit.short_id}</span>
                    <span class="commit-date">${formatDate(commit.created_at)}</span>
                  </div>
                  <div class="commit-message">${escapeHtml(commit.title)}</div>
                  <div class="commit-author">
                    ${commit.author_name || 'Unknown'}
                  </div>
                </div>
              `).join('') : 
              '<div class="no-data">No recent commits found</div>'
            }
          </div>
        </div>
      </div>
    </div>
  `;
  
  return detailView;
}
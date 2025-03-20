// Initialize services
const gitLabService = new GitLabApiService();
const dashboardService = new DashboardDataService(gitLabService);

// DOM elements
const tokenInput = document.getElementById('gitlab-token');
const groupIdInput = document.getElementById('group-id');
const timeframeSelect = document.getElementById('timeframe');
const loadButton = document.getElementById('load-data');
const dashboardContainer = document.getElementById('dashboard-container');
const loadingIndicator = document.getElementById('loading-indicator');
const errorContainer = document.getElementById('error-container');

// Event listeners
loadButton.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  const groupId = groupIdInput.value.trim();
  const timeframe = parseInt(timeframeSelect.value, 10);
  
  if (!token || !groupId) {
    displayError('Please provide both a GitLab token and a group ID');
    return;
  }
  
  try {
    showLoading(true);
    clearError();
    
    // Set the token
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
});

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
            <div class="metric-item">
              <span class="metric-label">Pipelines:</span>
              <span class="metric-value">${project.metrics.totalPipelines}</span>
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
              <span class="metric-label">Tests:</span>
              <span class="metric-value">${project.metrics.testMetrics.total}</span>
              <span class="test-details">
                (${project.metrics.testMetrics.success} passed, 
                ${project.metrics.testMetrics.failed} failed)
              </span>
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
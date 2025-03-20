/**
 * Pipeline Performance Analysis UI Module
 * This module handles the UI for the pipeline performance analysis feature
 */

// Initialize module
const pipelinePerformance = (() => {
  // DOM element references
  let container = null;
  let projectSelector = null;
  let analyzeButton = null;
  let limitSelector = null;
  let resultsContainer = null;
  let loadingIndicator = null;
  
  /**
   * Initialize the module
   * @param {HTMLElement} containerElement - Container for the pipeline performance UI
   */
  function init(containerElement) {
    container = containerElement;
    
    // Create UI elements
    createUIElements();
    
    // Add event listeners
    bindEvents();
  }
  
  /**
   * Create UI elements for pipeline performance analysis
   */
  function createUIElements() {
    container.innerHTML = `
      <div class="performance-analysis">
        <h2>Pipeline Performance Analysis</h2>
        
        <div class="controls">
          <div class="control-group">
            <label for="project-selector">Select Project</label>
            <select id="project-selector" disabled>
              <option value="">Select a project...</option>
            </select>
          </div>
          
          <div class="control-group">
            <label for="limit-selector">Number of Pipelines</label>
            <select id="limit-selector">
              <option value="5">5 pipelines</option>
              <option value="10" selected>10 pipelines</option>
              <option value="20">20 pipelines</option>
              <option value="50">50 pipelines</option>
            </select>
          </div>
          
          <div class="control-group">
            <label>&nbsp;</label>
            <button id="analyze-button" disabled>Analyze Performance</button>
          </div>
        </div>
        
        <div id="performance-loading" class="loading-indicator">
          Analyzing pipeline performance...
        </div>
        
        <div id="performance-results" class="results-container">
          <!-- Results will be dynamically inserted here -->
        </div>
      </div>
    `;
    
    // Get references to DOM elements
    projectSelector = document.getElementById('project-selector');
    analyzeButton = document.getElementById('analyze-button');
    limitSelector = document.getElementById('limit-selector');
    resultsContainer = document.getElementById('performance-results');
    loadingIndicator = document.getElementById('performance-loading');
    
    // Hide loading indicator initially
    loadingIndicator.style.display = 'none';
  }
  
  /**
   * Bind event listeners
   */
  function bindEvents() {
    projectSelector.addEventListener('change', function() {
      analyzeButton.disabled = !this.value;
    });
    
    analyzeButton.addEventListener('click', function() {
      const projectId = projectSelector.value;
      const limit = parseInt(limitSelector.value, 10);
      
      if (projectId) {
        analyzePipelinePerformance(projectId, limit);
      }
    });
  }
  
  /**
   * Analyze pipeline performance for a specific project
   * @param {string|number} projectId - The GitLab project ID
   * @param {number} limit - Number of pipelines to analyze
   */
  async function analyzePipelinePerformance(projectId, limit) {
    try {
      // Show loading indicator
      loadingIndicator.style.display = 'block';
      resultsContainer.innerHTML = '';
      
      // Get performance analysis data
      const analysisData = await dashboardService.getPipelinePerformanceAnalysis(projectId, limit);
      
      // Render results
      renderAnalysisResults(analysisData);
    } catch (error) {
      resultsContainer.innerHTML = `
        <div class="error-message">
          Failed to analyze pipeline performance: ${error.message}
        </div>
      `;
    } finally {
      // Hide loading indicator
      loadingIndicator.style.display = 'none';
    }
  }
  
  /**
   * Render pipeline performance analysis results
   * @param {Object} data - Performance analysis data
   */
  function renderAnalysisResults(data) {
    if (data.pipelineCount === 0) {
      resultsContainer.innerHTML = `
        <div class="info-message">
          No pipeline data available for analysis. Please ensure that the selected project has CI/CD pipelines.
        </div>
      `;
      return;
    }
    
    // Create results HTML
    const resultsHTML = `
      <div class="performance-summary">
        <h3>Performance Summary</h3>
        <div class="summary-cards">
          <div class="summary-card">
            <h4>Analyzed Pipelines</h4>
            <div class="metric">${data.pipelineCount}</div>
          </div>
          <div class="summary-card">
            <h4>Avg Pipeline Duration</h4>
            <div class="metric">${formatDuration(data.avgPipelineDuration)}</div>
          </div>
          <div class="summary-card">
            <h4>Slowest Stage</h4>
            <div class="metric">${data.slowestStage ? data.slowestStage.name : 'N/A'}</div>
            <div class="metric-detail">${data.slowestStage ? formatDuration(data.slowestStage.avgDuration) : ''}</div>
          </div>
        </div>
      </div>
      
      <div class="performance-details">
        <div class="chart-section">
          <h3>Stage Duration Analysis</h3>
          <div class="chart-container">
            <canvas id="stage-duration-chart"></canvas>
          </div>
        </div>
        
        <div class="bottlenecks-section">
          <h3>Pipeline Bottlenecks</h3>
          <div class="bottlenecks-table">
            <table>
              <thead>
                <tr>
                  <th>Job Name</th>
                  <th>Stage</th>
                  <th>Avg Duration</th>
                  <th>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                ${data.slowestJobs.map(job => `
                  <tr>
                    <td>${job.name}</td>
                    <td>${getStageForJob(data.stages, job.name)}</td>
                    <td>${formatDuration(job.avgDuration)}</td>
                    <td>
                      <div class="progress-bar">
                        <div class="progress" style="width: ${job.successRate}%; background-color: ${getSuccessRateColor(job.successRate)};"></div>
                      </div>
                      <span>${job.successRate.toFixed(1)}%</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="stages-section">
          <h3>Pipeline Stages</h3>
          ${data.stages.map(stage => `
            <div class="stage-card">
              <div class="stage-header">
                <h4>${stage.name}</h4>
                <div class="stage-metrics">
                  <span class="stage-duration">${formatDuration(stage.avgDuration)}</span>
                  <span class="stage-success-rate">${stage.successRate.toFixed(1)}% success</span>
                </div>
              </div>
              <div class="stage-jobs">
                ${stage.jobs.map(job => `
                  <div class="job-item">
                    <div class="job-name">${job.name}</div>
                    <div class="job-metrics">
                      <span class="job-duration">${formatDuration(job.avgDuration)}</span>
                      <div class="job-success-rate">
                        <div class="progress-bar small">
                          <div class="progress" style="width: ${job.successRate}%; background-color: ${getSuccessRateColor(job.successRate)};"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    // Set results HTML
    resultsContainer.innerHTML = resultsHTML;
    
    // Create stage duration chart
    createStageDurationChart(data.stages);
  }
  
  /**
   * Create a chart for stage durations
   * @param {Array} stages - Stage data
   */
  function createStageDurationChart(stages) {
    const ctx = document.getElementById('stage-duration-chart').getContext('2d');
    
    // Prepare chart data
    const labels = stages.map(stage => stage.name);
    const durations = stages.map(stage => stage.avgDuration);
    const successRates = stages.map(stage => stage.successRate);
    
    // Create chart
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Average Duration (seconds)',
            data: durations,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            yAxisID: 'y-axis-1'
          },
          {
            label: 'Success Rate (%)',
            data: successRates,
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            type: 'line',
            yAxisID: 'y-axis-2'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            id: 'y-axis-1',
            title: {
              display: true,
              text: 'Duration (seconds)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            id: 'y-axis-2',
            grid: {
              drawOnChartArea: false
            },
            title: {
              display: true,
              text: 'Success Rate (%)'
            },
            min: 0,
            max: 100
          }
        }
      }
    });
  }
  
  /**
   * Find the stage for a specific job
   * @param {Array} stages - Stage data
   * @param {string} jobName - Job name
   * @returns {string} - Stage name
   */
  function getStageForJob(stages, jobName) {
    for (const stage of stages) {
      for (const job of stage.jobs) {
        if (job.name === jobName) {
          return stage.name;
        }
      }
    }
    return 'Unknown';
  }
  
  /**
   * Get a color based on success rate
   * @param {number} rate - Success rate
   * @returns {string} - Color code
   */
  function getSuccessRateColor(rate) {
    if (rate >= 90) return '#28a745'; // Green
    if (rate >= 75) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  }
  
  /**
   * Update project selector with available projects
   * @param {Array} projects - List of projects
   */
  function updateProjectSelector(projects) {
    // Clear existing options except the first one
    while (projectSelector.options.length > 1) {
      projectSelector.remove(1);
    }
    
    // Add projects to selector
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      projectSelector.appendChild(option);
    });
    
    // Enable selector
    projectSelector.disabled = false;
  }
  
  // Public API
  return {
    init,
    updateProjectSelector
  };
})();

/**
 * Table View Module for GitLab CI/CD Dashboard
 * Provides a compact tabular view of project metrics with expandable details
 */

const tableView = (() => {
  /**
   * Create and return the table view for projects
   * @param {Array} projects - List of projects with their metrics
   * @returns {HTMLElement} - The table element with projects
   */
  function createTableView(projects) {
    const table = document.createElement('table');
    table.className = 'projects-table';

    // Add table header
    table.appendChild(createTableHeader());

    // Add table body with project rows
    const tbody = document.createElement('tbody');
    projects.forEach(project => {
      // Create the main project row
      const projectRow = createProjectRow(project);
      tbody.appendChild(projectRow);

      // Create the expandable details row
      const detailsRow = createProjectDetailsRow(project);
      tbody.appendChild(detailsRow);
    });

    table.appendChild(tbody);
    return table;
  }

  /**
   * Create the table header
   * @returns {HTMLTableSectionElement} - Table header element
   */
  function createTableHeader() {
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
    return thead;
  }

  /**
   * Create a table row for a project
   * @param {Object} project - Project data with metrics
   * @returns {HTMLTableRowElement} - Table row for the project
   */
  function createProjectRow(project) {
    const row = document.createElement('tr');

    // Determine project category based on pipeline status
    const category = categorizeProject(project);

    row.className = `project-row ${category}`;
    row.setAttribute('data-project-id', project.id);

    // Format the metrics for display
    const pipelineStatus = formatPipelineStatus(
      project.metrics.mainBranchPipeline.status,
      project.metrics.mainBranchPipeline.available
    );

    const successRate = project.metrics.successRate.toFixed(2) + '%';
    const duration = formatDuration(project.metrics.avgDuration);

    const mrCount = project.metrics.mergeRequestCounts.totalOpen;
    const draftCount = project.metrics.mergeRequestCounts.drafts;
    const mrDisplay = mrCount > 0
      ? `${mrCount} ${draftCount > 0 ? `(${draftCount} draft${draftCount !== 1 ? 's' : ''})` : ''}`
      : '0';

    const coverage = project.metrics.codeCoverage.available
      ? project.metrics.codeCoverage.coverage.toFixed(2) + '%'
      : 'N/A';

    // Create the row content
    row.innerHTML = `
      <td>
        <span class="status-indicator ${category}"></span>
        ${project.name}
      </td>
      <td>${pipelineStatus}</td>
      <td class="${getSuccessRateClass(project.metrics.successRate)}">${successRate}</td>
      <td>${duration}</td>
      <td>${mrDisplay}</td>
      <td>${coverage}</td>
      <td><button class="expand-btn" aria-label="Toggle details" title="Show details">↓</button></td>
    `;

    return row;
  }

  /**
   * Create a details row for a project (initially hidden)
   * @param {Object} project - Project data with metrics
   * @returns {HTMLTableRowElement} - Table row for project details
   */
  function createProjectDetailsRow(project) {
    const detailsRow = document.createElement('tr');
    detailsRow.className = 'project-details hidden';

    // Create metrics summary with only metrics not shown in the main row
    const metricsSummary = `
      <div class="metrics-bar">
        <div class="metric">
          <div class="metric-label">Total Pipelines</div>
          <div class="metric-value">${project.metrics.totalPipelines || 0}</div>
        </div>
      </div>
    `;

    // Create a container for all the details content
    const detailsContent = document.createElement('div');
    detailsContent.className = 'details-content';
    detailsContent.innerHTML = metricsSummary;

    // Add merge requests table if there are any open MRs
    if (project.metrics.mergeRequestCounts.totalOpen > 0) {
      const mrSection = document.createElement('div');
      mrSection.className = 'mr-section';
      mrSection.innerHTML = `
        <h3>Open Merge Requests</h3>
        <div id="mr-table-container-${project.id}" class="mr-table-container">
          <div class="loading-indicator">Loading merge requests...</div>
        </div>
      `;
      detailsContent.appendChild(mrSection);
    }

    // Create a failed jobs section if the main branch pipeline failed
    if (project.metrics.mainBranchPipeline.available &&
        (project.metrics.mainBranchPipeline.status === 'failed' ||
         project.metrics.mainBranchPipeline.status === 'canceled') &&
        project.metrics.mainBranchPipeline.failedJobs &&
        project.metrics.mainBranchPipeline.failedJobs.length > 0) {

      const failedJobsSection = document.createElement('div');
      failedJobsSection.className = 'failed-jobs-section';

      const failedJobsList = project.metrics.mainBranchPipeline.failedJobs.map(job => `
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
      `).join('');

      failedJobsSection.innerHTML = `
        <h3>Failed Jobs (${project.metrics.mainBranchPipeline.failedJobs.length})</h3>
        <div class="failed-jobs-list">
          ${failedJobsList}
        </div>
      `;

      detailsContent.appendChild(failedJobsSection);
    }

    // Create a recent commits section
    if (project.metrics.recentCommits && project.metrics.recentCommits.length > 0) {
      const commitsSection = document.createElement('div');
      commitsSection.className = 'commits-section';

      const commitsList = project.metrics.recentCommits.slice(0, 3).map(commit => `
        <div class="commit-item">
          <div class="commit-header">
            <span class="commit-id">${commit.short_id}</span>
            <span class="commit-date">${formatDate(commit.created_at)}</span>
          </div>
          <div class="commit-message">${escapeHtml(commit.title)}</div>
        </div>
      `).join('');

      commitsSection.innerHTML = `
        <h3>Recent Commits</h3>
        <div class="commits-list">
          ${commitsList}
        </div>
      `;

      detailsContent.appendChild(commitsSection);
    }

    // Add the details content to a cell that spans all columns
    detailsRow.innerHTML = `<td colspan="7"></td>`;
    detailsRow.firstChild.appendChild(detailsContent);

    return detailsRow;
  }

  /**
   * Create a table of merge requests for a project
   * @param {Array} mergeRequests - List of merge requests
   * @returns {HTMLElement} - Table of merge requests
   */
  function createMergeRequestsTable(mergeRequests) {
    if (!mergeRequests || mergeRequests.length === 0) {
      return '<div class="no-data">No open merge requests</div>';
    }

    const mrRows = mergeRequests.map(mr => {
      const pipelineStatus = mr.head_pipeline ?
        `<span class="status-indicator ${getPipelineStatusClass(mr.head_pipeline.status)}"></span> ${formatPipelineStatus(mr.head_pipeline.status, true)}` :
        'No pipeline';

      return `
        <tr>
          <td>
            <a href="${mr.web_url}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(mr.title)}
            </a>
          </td>
          <td>${mr.source_branch}</td>
          <td>${pipelineStatus}</td>
          <td>${formatDate(mr.updated_at)}</td>
        </tr>
      `;
    }).join('');

    return `
      <table class="mr-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Source Branch</th>
            <th>Pipeline Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          ${mrRows}
        </tbody>
      </table>
    `;
  }

  /**
   * Setup event handlers for the table view
   */
  function setupEventHandlers() {
    // Handle project row clicks to expand/collapse details
    document.querySelectorAll('.project-row').forEach(row => {
      row.addEventListener('click', function() {
        // Toggle expanded class on the row
        this.classList.toggle('expanded');

        // Toggle visibility of details row
        const detailsRow = this.nextElementSibling;
        if (detailsRow && detailsRow.classList.contains('project-details')) {
          // Toggle the hidden class
          detailsRow.classList.toggle('hidden');

          // Update expand button icon and attributes
          const expandBtn = this.querySelector('.expand-btn');
          if (expandBtn) {
            const isExpanded = !detailsRow.classList.contains('hidden');
            // No need to change textContent as we're using CSS transform now
            // Add aria-expanded attribute for accessibility
            expandBtn.setAttribute('aria-expanded', isExpanded);
            // Update the title for tooltip
            expandBtn.setAttribute('title', isExpanded ? 'Hide details' : 'Show details');
          }

          // Load merge requests for the project if needed
          if (!detailsRow.classList.contains('hidden')) {
            const projectId = this.getAttribute('data-project-id');
            const mrContainer = document.getElementById(`mr-table-container-${projectId}`);

            if (mrContainer && mrContainer.querySelector('.loading-indicator')) {
              loadMergeRequests(projectId, mrContainer);
            }
          }
        }
      });
    });

    // Prevent propagation when clicking directly on the expand button
    document.querySelectorAll('.expand-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        this.closest('.project-row').click();
      });
      // Initialize the aria-expanded attribute to false
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  /**
   * Load merge requests for a project and update the container
   * @param {string|number} projectId - The project ID
   * @param {HTMLElement} container - The container to update
   */
  async function loadMergeRequests(projectId, container) {
    try {
      const mergeRequests = await gitLabService.getProjectMergeRequests(projectId);
      container.innerHTML = createMergeRequestsTable(mergeRequests);
    } catch (error) {
      console.error(`Failed to load merge requests for project ${projectId}:`, error);
      container.innerHTML = '<div class="error-message">Failed to load merge requests</div>';
    }
  }

  // Helper functions (copied from index.js to make the module self-contained)
  
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

  // Return public API
  return {
    createTableView,
    setupEventHandlers
  };
})();
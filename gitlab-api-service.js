/**
 * Service to interact with GitLab API
 */

class GitLabApiService {
  constructor(baseUrl = "https://gitlab.com/api/v4", privateToken = "") {
    this.baseUrl = baseUrl;
    this.privateToken = privateToken;
  }

  /**
   * Set GitLab private token for authentication
   * @param {string} token - The private token
   */
  setPrivateToken(token) {
    this.privateToken = token;
  }

  /**
   * Fetch all projects under a specific group
   * @param {string|number} groupId - The GitLab group ID
   * @returns {Promise<Array>} - List of projects
   */
  async getGroupProjects(groupId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/groups/${groupId}/projects?include_subgroups=true&per_page=100`,
        {
          headers: {
            "PRIVATE-TOKEN": this.privateToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error fetching projects: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch group projects:", error);
      throw error;
    }
  }

  /**
   * Fetch pipelines for a specific project
   * @param {string|number} projectId - The GitLab project ID
   * @param {Object} params - Additional parameters like date range
   * @returns {Promise<Array>} - List of pipelines
   */
  async getProjectPipelines(projectId, params = {}) {
    const { startDate, endDate, status } = params;

    let url = `${this.baseUrl}/projects/${projectId}/pipelines?per_page=100`;
    if (startDate) url += `&updated_after=${startDate}`;
    if (endDate) url += `&updated_before=${endDate}`;
    if (status) url += `&status=${status}`;

    try {
      const response = await fetch(url, {
        headers: {
          "PRIVATE-TOKEN": this.privateToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching pipelines: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Failed to fetch pipelines for project ${projectId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Fetch jobs for a specific pipeline
   * @param {string|number} projectId - The GitLab project ID
   * @param {string|number} pipelineId - The pipeline ID
   * @returns {Promise<Array>} - List of jobs
   */
  async getPipelineJobs(projectId, pipelineId) {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/pipelines/${pipelineId}/jobs`, {
        headers: {
          'PRIVATE-TOKEN': this.privateToken
        }
      });

      if (!response.ok) {
        throw new Error(`Error fetching jobs: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch jobs for pipeline ${pipelineId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed pipeline information
   * @param {string|number} projectId - The GitLab project ID
   * @param {string|number} pipelineId - The pipeline ID
   * @returns {Promise<Object>} - Pipeline details
   */
  async getPipelineDetails(projectId, pipelineId) {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/pipelines/${pipelineId}`, {
        headers: {
          'PRIVATE-TOKEN': this.privateToken
        }
      });

      if (!response.ok) {
        throw new Error(`Error fetching pipeline details: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch details for pipeline ${pipelineId}:`, error);
      throw error;
    }
  }

  /**
   * Get test reports for a specific project
   * @param {string|number} projectId - The GitLab project ID
   * @returns {Promise<Object>} - Test metrics
   */
  async getTestReports(projectId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/projects/${projectId}/pipelines/latest/test_report`,
        {
          headers: {
            "PRIVATE-TOKEN": this.privateToken,
          },
        }
      );

      if (!response.ok) {
        // Test reports might not be enabled for all projects
        if (response.status === 404) {
          return { total: 0, success: 0, failed: 0, skipped: 0 };
        }
        throw new Error(`Error fetching test reports: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Failed to fetch test reports for project ${projectId}:`,
        error
      );
      // Return empty metrics in case of error
      return { total: 0, success: 0, failed: 0, skipped: 0 };
    }
  }
}
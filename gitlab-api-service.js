/**
 * Service to interact with GitLab API
 */

class GitLabApiService {
  constructor(baseUrl = "https://gitlab.com/api/v4", privateToken = "") {
    this.baseUrl = baseUrl;
    this.privateToken = privateToken;
    this.defaultBranch = 'main'; // Default branch name to use if not specified
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
  
  /**
   * Get main branch pipeline status
   * @param {string|number} projectId - The GitLab project ID
   * @returns {Promise<Object>} - Pipeline status
   */
  async getMainBranchPipeline(projectId) {
    try {
      // First get the default branch for the project
      const projectDetails = await this.getProjectDetails(projectId);
      const defaultBranch = projectDetails.default_branch || this.defaultBranch;
      
      // Get the latest pipeline for the default branch
      const response = await fetch(
        `${this.baseUrl}/projects/${projectId}/pipelines?ref=${defaultBranch}&per_page=1`,
        {
          headers: {
            "PRIVATE-TOKEN": this.privateToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error fetching main branch pipeline: ${response.statusText}`);
      }

      const pipelines = await response.json();
      
      if (pipelines.length === 0) {
        return {
          status: 'unknown',
          id: null,
          web_url: null,
          created_at: null,
          updated_at: null
        };
      }
      
      return pipelines[0];
    } catch (error) {
      console.error(
        `Failed to fetch main branch pipeline for project ${projectId}:`,
        error
      );
      return {
        status: 'unknown',
        id: null,
        web_url: null,
        created_at: null,
        updated_at: null
      };
    }
  }
  
  /**
   * Get project details including default branch
   * @param {string|number} projectId - The GitLab project ID
   * @returns {Promise<Object>} - Project details
   */
  async getProjectDetails(projectId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/projects/${projectId}`,
        {
          headers: {
            "PRIVATE-TOKEN": this.privateToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error fetching project details: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Failed to fetch project details for project ${projectId}:`,
        error
      );
      return { default_branch: this.defaultBranch };
    }
  }
  
  /**
   * Get code coverage data for a project
   * @param {string|number} projectId - The GitLab project ID
   * @returns {Promise<Object>} - Coverage data
   */
  async getCodeCoverage(projectId) {
    try {
      // First get the default branch for the project
      const projectDetails = await this.getProjectDetails(projectId);
      const defaultBranch = projectDetails.default_branch || this.defaultBranch;
      
      // Get the latest pipeline for the default branch
      const pipelines = await this.getProjectPipelines(projectId, { ref: defaultBranch, per_page: 1 });
      
      if (pipelines.length === 0) {
        return { coverage: null };
      }
      
      const pipelineId = pipelines[0].id;
      
      // Get pipeline details including coverage
      const pipelineDetails = await this.getPipelineDetails(projectId, pipelineId);
      
      return { 
        coverage: pipelineDetails.coverage || null,
        pipelineId: pipelineId,
        pipelineUrl: pipelines[0].web_url 
      };
    } catch (error) {
      console.error(
        `Failed to fetch code coverage for project ${projectId}:`,
        error
      );
      return { coverage: null };
    }
  }
  
  /**
   * Get the last N commits for a project
   * @param {string|number} projectId - The GitLab project ID
   * @param {number} limit - Number of commits to fetch
   * @returns {Promise<Array>} - List of commits
   */
  async getRecentCommits(projectId, limit = 3) {
    try {
      const response = await fetch(
        `${this.baseUrl}/projects/${projectId}/repository/commits?per_page=${limit}`,
        {
          headers: {
            "PRIVATE-TOKEN": this.privateToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error fetching commits: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Failed to fetch commits for project ${projectId}:`,
        error
      );
      return [];
    }
  }
}
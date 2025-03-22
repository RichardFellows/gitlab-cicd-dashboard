/**
 * Service to interact with GitLab API
 */

class GitLabApiService {
  constructor(baseUrl = "https://gitlab.com/api/v4", privateToken = "") {
    this.baseUrl = baseUrl;
    this.privateToken = privateToken;
    this.defaultBranch = 'main'; // Default branch name to use if not specified
    this.useProxy = this.shouldUseProxy();
    this.proxyUrl = 'http://localhost:3000/proxy'; // Default, may be overridden by start.js
  }
  
  /**
   * Determine if we should use the proxy based on the current environment
   * @returns {boolean} - Whether to use the proxy
   */
  shouldUseProxy() {
    // Check if we're running on localhost (with any port)
    // Our start.js script uses port 5050 for the HTTP server
    return window.location.hostname === 'localhost';
  }

  /**
   * Set GitLab private token for authentication
   * @param {string} token - The private token
   */
  setPrivateToken(token) {
    this.privateToken = token;
  }
  
  /**
   * Get the URL for an API request, using the proxy if needed
   * @param {string} path - The API path (without the baseUrl)
   * @param {string} queryParams - The query parameters to append
   * @returns {string} - The full URL to use for the request
   */
  getApiUrl(path, queryParams = '') {
    if (this.useProxy) {
      // When using the proxy, we send the full path as a query parameter
      // The proxy will extract the path and make the request to GitLab
      return `${this.proxyUrl}?path=${encodeURIComponent(path + queryParams)}`;
    } else {
      // Direct API call when not using the proxy
      return `${this.baseUrl}${path}${queryParams}`;
    }
  }

  /**
   * Fetch all projects under a specific group
   * @param {string|number} groupId - The GitLab group ID
   * @returns {Promise<Array>} - List of projects
   */
  async getGroupProjects(groupId) {
    try {
      const path = `/groups/${groupId}/projects`;
      const queryParams = '?include_subgroups=true&per_page=100';
      const url = this.getApiUrl(path, queryParams);
      
      console.log(`Fetching group projects from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          "PRIVATE-TOKEN": this.privateToken,
        },
      });

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
    const { startDate, endDate, status, ref, per_page } = params;

    let queryParams = '?per_page=' + (per_page || 100);
    if (startDate) queryParams += `&updated_after=${startDate}`;
    if (endDate) queryParams += `&updated_before=${endDate}`;
    if (status) queryParams += `&status=${status}`;
    if (ref) queryParams += `&ref=${ref}`;

    const path = `/projects/${projectId}/pipelines`;
    const url = this.getApiUrl(path, queryParams);

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
      const path = `/projects/${projectId}/pipelines/${pipelineId}/jobs`;
      const url = this.getApiUrl(path, '');
      
      const response = await fetch(url, {
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
      const path = `/projects/${projectId}/pipelines/${pipelineId}`;
      const url = this.getApiUrl(path, '');
      
      const response = await fetch(url, {
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
      // First check if project has any pipelines
      const pipelines = await this.getProjectPipelines(projectId, { per_page: 1 });
      if (!pipelines || pipelines.length === 0) {
        console.log(`No pipelines found for project ${projectId}, cannot fetch test reports`);
        return { total: 0, success: 0, failed: 0, skipped: 0, available: false };
      }

      const path = `/projects/${projectId}/pipelines/latest/test_report`;
      const url = this.getApiUrl(path, '');
      
      const response = await fetch(url, {
        headers: {
          "PRIVATE-TOKEN": this.privateToken,
        },
      });

      if (!response.ok) {
        // Test reports might not be enabled for all projects
        if (response.status === 404 || response.status === 400) {
          console.log(`Test reports not available for project ${projectId} (status ${response.status})`);
          return { total: 0, success: 0, failed: 0, skipped: 0, available: false };
        }
        throw new Error(`Error fetching test reports: ${response.statusText}`);
      }

      const data = await response.json();
      return { ...data, available: true };
    } catch (error) {
      console.error(
        `Failed to fetch test reports for project ${projectId}:`,
        error
      );
      // Return empty metrics in case of error
      return { total: 0, success: 0, failed: 0, skipped: 0, available: false };
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
      const path = `/projects/${projectId}/pipelines`;
      const queryParams = `?ref=${defaultBranch}&per_page=1`;
      const url = this.getApiUrl(path, queryParams);
      
      const response = await fetch(url, {
        headers: {
          "PRIVATE-TOKEN": this.privateToken,
        },
      });

      if (!response.ok) {
        console.log(`Error fetching main branch pipeline for project ${projectId}: ${response.statusText}`);
        return {
          status: 'unknown',
          id: null,
          web_url: null,
          created_at: null,
          updated_at: null,
          available: false,
          failedJobs: []
        };
      }

      const pipelines = await response.json();
      
      if (!pipelines || pipelines.length === 0) {
        console.log(`No pipelines found for the main branch of project ${projectId}`);
        return {
          status: 'unknown',
          id: null,
          web_url: null,
          created_at: null,
          updated_at: null,
          available: false,
          failedJobs: []
        };
      }
      
      const pipeline = pipelines[0];
      const pipelineWithData = {...pipeline, available: true, failedJobs: []};
      
      // If the pipeline failed, get the failed jobs
      if (pipeline.status === 'failed' || pipeline.status === 'canceled') {
        try {
          const jobs = await this.getPipelineJobs(projectId, pipeline.id);
          
          // Filter out failed jobs
          const failedJobs = jobs.filter(job => job.status === 'failed').map(job => ({
            id: job.id,
            name: job.name,
            stage: job.stage,
            web_url: job.web_url,
            created_at: job.created_at,
            started_at: job.started_at,
            finished_at: job.finished_at,
            failure_reason: job.failure_reason || 'Unknown'
          }));
          
          pipelineWithData.failedJobs = failedJobs;
        } catch (jobError) {
          console.error(`Failed to fetch jobs for pipeline ${pipeline.id}:`, jobError);
          // Don't fail if we can't get jobs, just continue with what we have
        }
      }
      
      return pipelineWithData;
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
        updated_at: null,
        available: false,
        failedJobs: []
      };
    }
  }
  
  /**
   * Get merge request counts for a project
   * @param {string|number} projectId - The GitLab project ID
   * @returns {Promise<Object>} - The MR count data
   */
  async getMergeRequestCounts(projectId) {
    try {
      // Get all open MRs
      const path = `/projects/${projectId}/merge_requests`;
      const queryParams = `?state=opened&per_page=100`;
      const url = this.getApiUrl(path, queryParams);
      
      const response = await fetch(url, {
        headers: {
          "PRIVATE-TOKEN": this.privateToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching merge requests: ${response.statusText}`);
      }

      const mergeRequests = await response.json();
      
      // Count draft MRs
      const draftMRs = mergeRequests.filter(mr => mr.draft || (mr.title && mr.title.toLowerCase().startsWith('draft:')));
      
      return {
        totalOpen: mergeRequests.length,
        drafts: draftMRs.length
      };
    } catch (error) {
      console.error(`Failed to fetch merge request counts for project ${projectId}:`, error);
      return {
        totalOpen: 0,
        drafts: 0
      };
    }
  }
  
  /**
   * Get commits for a specific merge request
   * @param {string|number} projectId - The GitLab project ID
   * @param {string|number} mrIid - The merge request IID
   * @returns {Promise<Array>} - List of commits
   */
  async getMergeRequestCommits(projectId, mrIid) {
    try {
      const path = `/projects/${projectId}/merge_requests/${mrIid}/commits`;
      const url = this.getApiUrl(path, '');
      
      const response = await fetch(url, {
        headers: {
          "PRIVATE-TOKEN": this.privateToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching merge request commits: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Failed to fetch commits for MR ${mrIid}:`,
        error
      );
      return [];
    }
  }
  
  /**
   * Get project details including default branch
   * @param {string|number} projectId - The GitLab project ID
   * @returns {Promise<Object>} - Project details
   */
  async getProjectDetails(projectId) {
    try {
      const path = `/projects/${projectId}`;
      const url = this.getApiUrl(path, '');
      
      const response = await fetch(url, {
        headers: {
          "PRIVATE-TOKEN": this.privateToken,
        },
      });

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
      
      if (!pipelines || pipelines.length === 0) {
        console.log(`No pipelines found for project ${projectId}, cannot fetch code coverage`);
        return { coverage: null, available: false };
      }
      
      const pipelineId = pipelines[0].id;
      
      // Get pipeline details including coverage
      const pipelineDetails = await this.getPipelineDetails(projectId, pipelineId);
      
      if (pipelineDetails && pipelineDetails.coverage !== undefined) {
        // Normalize coverage to be a number
        let coverageValue;
        try {
          // Coverage might be a string like "75.5%" or a number like 75.5
          coverageValue = parseFloat(pipelineDetails.coverage);
          if (isNaN(coverageValue)) {
            console.log(`Invalid coverage format for project ${projectId}: ${pipelineDetails.coverage}`);
            coverageValue = null;
          }
        } catch (e) {
          console.log(`Error parsing coverage for project ${projectId}: ${e.message}`);
          coverageValue = null;
        }
        
        return { 
          coverage: coverageValue,
          pipelineId: pipelineId,
          pipelineUrl: pipelines[0].web_url,
          available: coverageValue !== null
        };
      } else {
        console.log(`Code coverage not available for project ${projectId}`);
        return { 
          coverage: null, 
          pipelineId: pipelineId,
          pipelineUrl: pipelines[0].web_url,
          available: false 
        };
      }
    } catch (error) {
      console.error(
        `Failed to fetch code coverage for project ${projectId}:`,
        error
      );
      return { coverage: null, available: false };
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
      const path = `/projects/${projectId}/repository/commits`;
      const queryParams = `?per_page=${limit}`;
      const url = this.getApiUrl(path, queryParams);
      
      const response = await fetch(url, {
        headers: {
          "PRIVATE-TOKEN": this.privateToken,
        },
      });

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
  
  /**
   * Get merge requests for a project
   * @param {string|number} projectId - The GitLab project ID
   * @param {Object} params - Additional parameters
   * @returns {Promise<Array>} - List of merge requests
   */
  async getProjectMergeRequests(projectId, params = {}) {
    try {
      const { state = 'opened', scope = 'all', per_page = 10 } = params;
      
      // Build query parameters
      let queryParams = `?state=${state}&scope=${scope}&per_page=${per_page}`;
      
      // Add with_merge_status_recheck=true to get the latest pipeline status
      queryParams += '&with_merge_status_recheck=true';
      
      // Add with_labels_details=true to get label details
      queryParams += '&with_labels_details=true';
      
      // Add with_pipeline=true to include pipeline info
      queryParams += '&include_pipeline=true';
      
      const path = `/projects/${projectId}/merge_requests`;
      const url = this.getApiUrl(path, queryParams);
      
      const response = await fetch(url, {
        headers: {
          "PRIVATE-TOKEN": this.privateToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching merge requests: ${response.statusText}`);
      }

      // Get MRs with pipeline details
      const mergeRequests = await response.json();
      
      // For each MR, get the head pipeline details and recent commits if available
      const detailedMRs = await Promise.all(
        mergeRequests.map(async mr => {
          // Create an enhanced MR object
          const enhancedMR = {...mr, recent_commits: []};
          
          // Get recent commits for the MR
          try {
            const commits = await this.getMergeRequestCommits(projectId, mr.iid);
            // Add the commits to the MR object (limited to 3 most recent commits)
            enhancedMR.recent_commits = commits.slice(0, 3);
          } catch (error) {
            console.error(`Failed to fetch commits for MR ${mr.iid}:`, error);
          }
          
          // Get pipeline details if available
          if (mr.head_pipeline) {
            try {
              // Only fetch details if we have a pipeline
              const pipelineDetails = await this.getPipelineDetails(projectId, mr.head_pipeline.id);
              
              // Return MR with enhanced pipeline info
              enhancedMR.head_pipeline = {
                ...mr.head_pipeline,
                ...pipelineDetails
              };
              
              // Get failed jobs for the pipeline if it failed
              if (enhancedMR.head_pipeline.status === 'failed' || enhancedMR.head_pipeline.status === 'canceled') {
                try {
                  const jobs = await this.getPipelineJobs(projectId, enhancedMR.head_pipeline.id);
                  
                  // Filter out failed jobs
                  const failedJobs = jobs.filter(job => job.status === 'failed').map(job => ({
                    id: job.id,
                    name: job.name,
                    stage: job.stage,
                    web_url: job.web_url,
                    created_at: job.created_at,
                    started_at: job.started_at,
                    finished_at: job.finished_at,
                    failure_reason: job.failure_reason || 'Unknown'
                  }));
                  
                  enhancedMR.head_pipeline.jobs = jobs;
                  enhancedMR.head_pipeline.failedJobs = failedJobs;
                } catch (jobError) {
                  console.error(`Failed to fetch jobs for pipeline ${enhancedMR.head_pipeline.id}:`, jobError);
                }
              }
            } catch (error) {
              console.error(`Failed to fetch pipeline details for MR ${mr.iid}:`, error);
            }
          }
          
          return enhancedMR;
        })
      );
      
      return detailedMRs;
    } catch (error) {
      console.error(
        `Failed to fetch merge requests for project ${projectId}:`,
        error
      );
      return [];
    }
  }
}
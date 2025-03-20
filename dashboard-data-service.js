/**
 * Service to process data for the CI/CD dashboard
 */
class DashboardDataService {
  constructor(gitLabService) {
    this.gitLabService = gitLabService;
    this.metrics = {};
  }
  
  /**
   * Get all CI/CD metrics for projects in a group
   * @param {string|number} groupId - The GitLab group ID
   * @param {Object} timeframe - Time range for metrics
   * @returns {Promise<Object>} - Dashboard metrics
   */
  async getGroupMetrics(groupId, timeframe = { days: 30 }) {
    try {
      // Calculate date range
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - timeframe.days * 24 * 60 * 60 * 1000).toISOString();
      
      // Get all projects in the group
      const projects = await this.gitLabService.getGroupProjects(groupId);
      
      // Collect metrics for each project
      const projectMetrics = await Promise.all(
        projects.map(project => this.getProjectMetrics(project.id, { startDate, endDate }))
      );
      
      // Combine all project metrics
      const metrics = {
        totalProjects: projects.length,
        projects: projects.map((project, index) => ({
          id: project.id,
          name: project.name,
          path: project.path_with_namespace,
          webUrl: project.web_url,
          metrics: projectMetrics[index]
        })),
        aggregateMetrics: this.calculateAggregateMetrics(projectMetrics)
      };
      
      this.metrics = metrics;
      return metrics;
    } catch (error) {
      console.error('Failed to get group metrics:', error);
      throw error;
    }
  }
  
  /**
   * Get CI/CD metrics for a specific project
   * @param {string|number} projectId - The GitLab project ID
   * @param {Object} params - Parameters like date range
   * @returns {Promise<Object>} - Project metrics
   */
  async getProjectMetrics(projectId, params) {
    try {
      // Get pipelines
      const pipelines = await this.gitLabService.getProjectPipelines(projectId, params);
      
      // Get test metrics if available
      let testMetrics = { total: 0, success: 0, failed: 0, skipped: 0 };
      try {
        testMetrics = await this.gitLabService.getTestReports(projectId);
      } catch (error) {
        // Silently fail as test reports might not be available
      }
      
      // Calculate pipeline success rate
      const totalPipelines = pipelines.length;
      const successfulPipelines = pipelines.filter(p => p.status === 'success').length;
      const failedPipelines = pipelines.filter(p => p.status === 'failed').length;
      const canceledPipelines = pipelines.filter(p => p.status === 'canceled').length;
      const runningPipelines = pipelines.filter(p => p.status === 'running').length;
      
      const successRate = totalPipelines > 0 ? (successfulPipelines / totalPipelines) * 100 : 0;
      
      // Calculate average pipeline duration
      let totalDuration = 0;
      let pipelinesWithDuration = 0;
      
      for (const pipeline of pipelines) {
        if (pipeline.duration) {
          totalDuration += pipeline.duration;
          pipelinesWithDuration++;
        }
      }
      
      const avgDuration = pipelinesWithDuration > 0 ? totalDuration / pipelinesWithDuration : 0;
      
      return {
        totalPipelines,
        successfulPipelines,
        failedPipelines,
        canceledPipelines,
        runningPipelines,
        successRate,
        avgDuration,
        testMetrics
      };
    } catch (error) {
      console.error(`Failed to get metrics for project ${projectId}:`, error);
      // Return empty metrics in case of error
      return {
        totalPipelines: 0,
        successfulPipelines: 0,
        failedPipelines: 0,
        canceledPipelines: 0,
        runningPipelines: 0,
        successRate: 0,
        avgDuration: 0,
        testMetrics: { total: 0, success: 0, failed: 0, skipped: 0 }
      };
    }
  }
  
  /**
   * Calculate aggregate metrics across all projects
   * @param {Array} projectMetrics - Metrics from all projects
   * @returns {Object} - Aggregate metrics
   */
  calculateAggregateMetrics(projectMetrics) {
    const aggregate = {
      totalPipelines: 0,
      successfulPipelines: 0,
      failedPipelines: 0,
      canceledPipelines: 0,
      runningPipelines: 0,
      avgSuccessRate: 0,
      avgDuration: 0,
      testMetrics: {
        total: 0,
        success: 0,
        failed: 0,
        skipped: 0
      }
    };
    
    // Sum up all metrics
    for (const metrics of projectMetrics) {
      aggregate.totalPipelines += metrics.totalPipelines;
      aggregate.successfulPipelines += metrics.successfulPipelines;
      aggregate.failedPipelines += metrics.failedPipelines;
      aggregate.canceledPipelines += metrics.canceledPipelines;
      aggregate.runningPipelines += metrics.runningPipelines;
      
      aggregate.testMetrics.total += metrics.testMetrics.total;
      aggregate.testMetrics.success += metrics.testMetrics.success;
      aggregate.testMetrics.failed += metrics.testMetrics.failed;
      aggregate.testMetrics.skipped += metrics.testMetrics.skipped;
    }
    
    // Calculate averages
    const projectsWithPipelines = projectMetrics.filter(m => m.totalPipelines > 0).length;
    
    if (projectsWithPipelines > 0) {
      const totalSuccessRate = projectMetrics
        .filter(m => m.totalPipelines > 0)
        .reduce((sum, m) => sum + m.successRate, 0);
      
      aggregate.avgSuccessRate = totalSuccessRate / projectsWithPipelines;
    }
    
    if (aggregate.totalPipelines > 0) {
      aggregate.avgDuration = projectMetrics
        .filter(m => m.totalPipelines > 0)
        .reduce((sum, m) => sum + (m.avgDuration * m.totalPipelines), 0) / aggregate.totalPipelines;
    }
    
    return aggregate;
  }
  
  /**
   * Get time series data for pipeline trends
   * @param {string|number} projectId - The GitLab project ID
   * @param {Object} params - Parameters like date range
   * @returns {Promise<Object>} - Time series data
   */
  async getProjectPipelineTrends(projectId, params) {
    try {
      const pipelines = await this.gitLabService.getProjectPipelines(projectId, params);
      
      // Group pipelines by day
      const pipelinesByDay = {};
      
      for (const pipeline of pipelines) {
        const date = new Date(pipeline.created_at).toISOString().split('T')[0];
        
        if (!pipelinesByDay[date]) {
          pipelinesByDay[date] = {
            date,
            total: 0,
            successful: 0,
            failed: 0,
            duration: 0,
            pipelinesWithDuration: 0
          };
        }
        
        pipelinesByDay[date].total++;
        
        if (pipeline.status === 'success') {
          pipelinesByDay[date].successful++;
        } else if (pipeline.status === 'failed') {
          pipelinesByDay[date].failed++;
        }
        
        if (pipeline.duration) {
          pipelinesByDay[date].duration += pipeline.duration;
          pipelinesByDay[date].pipelinesWithDuration++;
        }
      }
      
      // Convert to array and calculate averages
      const trends = Object.values(pipelinesByDay).map(day => ({
        date: day.date,
        total: day.total,
        successful: day.successful,
        failed: day.failed,
        successRate: day.total > 0 ? (day.successful / day.total) * 100 : 0,
        avgDuration: day.pipelinesWithDuration > 0 ? day.duration / day.pipelinesWithDuration : 0
      }));
      
      // Sort by date
      return trends.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      console.error(`Failed to get pipeline trends for project ${projectId}:`, error);
      return [];
    }
  }
}
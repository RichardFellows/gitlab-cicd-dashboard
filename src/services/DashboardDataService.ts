import GitLabApiService from './GitLabApiService';
import { DashboardMetrics, PipelineTrend, PipelinePerformanceAnalysis } from '../types';

class DashboardDataService {
  gitLabService: GitLabApiService;
  metrics: DashboardMetrics | null;

  constructor(gitLabService: GitLabApiService) {
    this.gitLabService = gitLabService;
    this.metrics = null;
  }

  /**
   * Get all CI/CD metrics for projects in a group
   * @param {string|number} groupId - The GitLab group ID
   * @param {Object} timeframe - Time range for metrics
   * @returns {Promise<Object>} - Dashboard metrics
   */
  async getGroupMetrics(groupId: string | number, timeframe = { days: 30 }): Promise<DashboardMetrics> {
    try {
      // Calculate date range
      const endDate = new Date().toISOString();
      const startDate = new Date(
        Date.now() - timeframe.days * 24 * 60 * 60 * 1000
      ).toISOString();

      // Get all projects in the group
      const allProjects = await this.gitLabService.getGroupProjects(groupId);
      
      // Filter out projects starting with "DELETE-"
      const projects = allProjects.filter(project => !project.name.startsWith('DELETE-'));

      // Collect metrics for each project
      const projectMetrics = await Promise.all(
        projects.map((project) =>
          this.getProjectMetrics(project.id, { startDate, endDate })
        )
      );

      // Combine all project metrics
      const metrics: DashboardMetrics = {
        totalProjects: projects.length,
        projects: projects.map((project, index) => ({
          id: project.id,
          name: project.name,
          path: project.path_with_namespace,
          web_url: project.web_url,
          metrics: projectMetrics[index],
        })),
        aggregateMetrics: this.calculateAggregateMetrics(projectMetrics),
      };

      this.metrics = metrics;
      return metrics;
    } catch (error) {
      console.error("Failed to get group metrics:", error);
      throw error;
    }
  }

  /**
   * Get CI/CD metrics for a specific project
   * @param {string|number} projectId - The GitLab project ID
   * @param {Object} params - Parameters like date range
   * @returns {Promise<Object>} - Project metrics
   */
  async getProjectMetrics(projectId: string | number, params: { startDate?: string; endDate?: string }) {
    try {
      // Get pipelines
      const pipelines = await this.gitLabService.getProjectPipelines(
        projectId,
        params
      );

      // Get test metrics if available
      let testMetrics = { total: 0, success: 0, failed: 0, skipped: 0, available: false };

      try {
        testMetrics = await this.gitLabService.getTestReports(projectId);
      } catch (error) {
        // Silently fail as test reports might not be available
      }
      
      // Get main branch pipeline status
      let mainBranchPipeline = { 
        id: 0,
        status: 'unknown',
        web_url: undefined,
        created_at: '',
        updated_at: '',
        available: false,
        failedJobs: []
      };
      
      try {
        const pipeline = await this.gitLabService.getMainBranchPipeline(projectId);
        mainBranchPipeline = {
          ...pipeline,
          web_url: undefined,  // Explicitly set to undefined to match the type
          available: pipeline.available || false,
          failedJobs: (pipeline.failedJobs || []) as any
        };
      } catch (error) {
        // Silently fail if we can't get main branch pipeline
      }
      
      // Get code coverage
      let codeCoverage = { coverage: null, available: false, pipelineId: undefined, pipelineUrl: undefined };
      
      try {
        const coverage = await this.gitLabService.getCodeCoverage(projectId);
        codeCoverage = {
          coverage: coverage.coverage as null,
          available: coverage.available,
          pipelineId: coverage.pipelineId as undefined,
          pipelineUrl: coverage.pipelineUrl as undefined
        };
      } catch (error) {
        // Silently fail if we can't get code coverage
      }
      
      // Get merge request counts
      let mergeRequestCounts = { totalOpen: 0, drafts: 0 };
      
      try {
        mergeRequestCounts = await this.gitLabService.getMergeRequestCounts(projectId);
      } catch (error) {
        // Silently fail if we can't get MR counts
      }
      
      // Get recent commits
      let recentCommits: any[] = [];
      
      try {
        recentCommits = await this.gitLabService.getRecentCommits(projectId, 3);
      } catch (error) {
        // Silently fail if we can't get recent commits
      }

      // Calculate pipeline success rate
      const totalPipelines = pipelines.length;
      const successfulPipelines = pipelines.filter(
        (p) => p.status === "success"
      ).length;
      const failedPipelines = pipelines.filter(
        (p) => p.status === "failed"
      ).length;
      const canceledPipelines = pipelines.filter(
        (p) => p.status === "canceled"
      ).length;
      const runningPipelines = pipelines.filter(
        (p) => p.status === "running"
      ).length;

      const successRate =
        totalPipelines > 0 ? (successfulPipelines / totalPipelines) * 100 : 0;

      // Calculate average pipeline duration
      let totalDuration = 0;
      let pipelinesWithDuration = 0;
      
      console.log(`Calculating durations for ${pipelines.length} pipelines in project ${projectId}`);
      
      for (const pipeline of pipelines) {
        // First try using the duration field directly from the API
        if (pipeline.duration) {
          console.log(`Pipeline ${pipeline.id} has duration: ${pipeline.duration}s`);
          totalDuration += pipeline.duration;
          pipelinesWithDuration++;
        } 
        // Fallback: calculate duration from timestamps if available
        else if (pipeline.finished_at && pipeline.created_at && pipeline.status !== 'running') {
          try {
            const startTime = new Date(pipeline.created_at).getTime();
            const endTime = new Date(pipeline.finished_at || pipeline.updated_at).getTime();
            const calculatedDuration = (endTime - startTime) / 1000; // Convert to seconds
            
            if (calculatedDuration > 0) {
              console.log(`Pipeline ${pipeline.id} calculated duration: ${calculatedDuration.toFixed(2)}s (from timestamps)`);
              totalDuration += calculatedDuration;
              pipelinesWithDuration++;
            } else {
              console.log(`Pipeline ${pipeline.id} has invalid calculated duration: ${calculatedDuration}s`);
            }
          } catch (err) {
            console.error(`Error calculating duration for pipeline ${pipeline.id}:`, err);
          }
        } else {
          console.log(`Pipeline ${pipeline.id} (${pipeline.status}) has no duration data`);
        }
      }

      // Log summary of duration calculation
      console.log(`Project ${projectId}: Found ${pipelinesWithDuration} pipelines with duration out of ${pipelines.length} total`);
      
      const avgDuration =
        pipelinesWithDuration > 0 ? totalDuration / pipelinesWithDuration : 0;
      console.log(`Project ${projectId}: Average pipeline duration: ${avgDuration.toFixed(2)}s`);

      return {
        totalPipelines,
        successfulPipelines,
        failedPipelines,
        canceledPipelines,
        runningPipelines,
        successRate,
        avgDuration,
        testMetrics,
        mainBranchPipeline,
        codeCoverage,
        mergeRequestCounts,
        recentCommits,
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
        testMetrics: { total: 0, success: 0, failed: 0, skipped: 0, available: false },
        mainBranchPipeline: { 
          id: 0, 
          status: 'unknown', 
          web_url: undefined, 
          created_at: '', 
          updated_at: '', 
          available: false, 
          failedJobs: [] 
        },
        codeCoverage: { coverage: null, available: false },
        mergeRequestCounts: { totalOpen: 0, drafts: 0 },
        recentCommits: [],
      };
    }
  }

  /**
   * Calculate aggregate metrics across all projects
   * @param {Array} projectMetrics - Metrics from all projects
   * @returns {Object} - Aggregate metrics
   */
  calculateAggregateMetrics(projectMetrics: any[]) {
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
        skipped: 0,
        available: false,
      },
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
    const projectsWithPipelines = projectMetrics.filter(
      (m) => m.totalPipelines > 0
    ).length;

    if (projectsWithPipelines > 0) {
      const totalSuccessRate = projectMetrics
        .filter((m) => m.totalPipelines > 0)
        .reduce((sum, m) => sum + m.successRate, 0);
      aggregate.avgSuccessRate = totalSuccessRate / projectsWithPipelines;
    }

    // For average duration, we need to consider projects that actually have duration data
    const projectsWithDuration = projectMetrics
      .filter(m => m.totalPipelines > 0 && m.avgDuration > 0);
    
    if (projectsWithDuration.length > 0) {
      // Calculate weighted average based on pipeline count
      const totalDurationWeighted = projectsWithDuration
        .reduce((sum, m) => sum + m.avgDuration * m.totalPipelines, 0);
      
      const totalPipelinesWithDuration = projectsWithDuration
        .reduce((sum, m) => sum + m.totalPipelines, 0);
      
      aggregate.avgDuration = totalDurationWeighted / totalPipelinesWithDuration;
      
      console.log(`Aggregate avg duration: ${aggregate.avgDuration.toFixed(2)}s (from ${projectsWithDuration.length} projects with duration data)`);
    } else {
      aggregate.avgDuration = 0;
      console.log(`No projects with valid duration data found for aggregate calculation`);
    }
    return aggregate;
  }

  /**
   * Get time series data for pipeline trends
   * @param {string|number} projectId - The GitLab project ID
   * @param {Object} params - Parameters like date range
   * @returns {Promise<Object>} - Time series data
   */
  async getProjectPipelineTrends(
    projectId: string | number, 
    params: { startDate?: string; endDate?: string }
  ): Promise<PipelineTrend[]> {
    try {
      const pipelines = await this.gitLabService.getProjectPipelines(projectId, params);

      // Group pipelines by day
      const pipelinesByDay: Record<string, {
        date: string;
        total: number;
        successful: number;
        failed: number;
        duration: number;
        pipelinesWithDuration: number;
      }> = {};

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
      return trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error(`Failed to get pipeline trends for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Get pipeline performance analysis data
   * @param {string|number} projectId - The GitLab project ID
   * @param {number} limit - Number of pipelines to analyze
   * @returns {Promise<Object>} - Pipeline performance data
   */
  async getPipelinePerformanceAnalysis(
    projectId: string | number, 
    limit = 10
  ): Promise<PipelinePerformanceAnalysis> {
    try {
      // Get the most recent pipelines
      const pipelines = await this.gitLabService.getProjectPipelines(projectId);
      const recentPipelines = pipelines.slice(0, limit);

      // Get detailed information for each pipeline including jobs
      const pipelineDetails = await Promise.all(
        recentPipelines.map(async (pipeline) => {
          // Fetch pipeline details but use only what we need
          await this.gitLabService.getPipelineDetails(projectId, pipeline.id);
          const jobs = await this.gitLabService.getPipelineJobs(projectId, pipeline.id);

          return {
            id: pipeline.id,
            ref: pipeline.ref,
            status: pipeline.status,
            duration: pipeline.duration || 0,
            created_at: pipeline.created_at,
            updated_at: pipeline.updated_at,
            jobs
          };
        })
      );

      // Organize jobs by stage
      const stageAnalysis: Record<string, {
        name: string;
        totalDuration: number;
        jobCount: number;
        successCount: number;
        failureCount: number;
        jobs: Record<string, {
          name: string;
          durations: number[];
          statuses: string[];
        }>;
      }> = {};
      const stageOrder: string[] = [];

      pipelineDetails.forEach(pipeline => {
        pipeline.jobs.forEach(job => {
          if (!stageAnalysis[job.stage]) {
            stageAnalysis[job.stage] = {
              name: job.stage,
              totalDuration: 0,
              jobCount: 0,
              successCount: 0,
              failureCount: 0,
              jobs: {}
            };
            stageOrder.push(job.stage);
          }

          stageAnalysis[job.stage].jobCount++;

          if (job.status === 'success') {
            stageAnalysis[job.stage].successCount++;
          } else if (job.status === 'failed') {
            stageAnalysis[job.stage].failureCount++;
          }

          if (job.duration) {
            stageAnalysis[job.stage].totalDuration += job.duration;

            if (!stageAnalysis[job.stage].jobs[job.name]) {
              stageAnalysis[job.stage].jobs[job.name] = {
                name: job.name,
                durations: [],
                statuses: []
              };
            }

            stageAnalysis[job.stage].jobs[job.name].durations.push(job.duration);
            stageAnalysis[job.stage].jobs[job.name].statuses.push(job.status);
          }
        });
      });

      // Calculate average durations and success rates for each stage
      const uniqueStageOrder = [...new Set(stageOrder)];
      const stages = uniqueStageOrder.map(stageName => {
        const stage = stageAnalysis[stageName];
        const avgDuration = stage.jobCount > 0 ? stage.totalDuration / stage.jobCount : 0;
        const successRate = stage.jobCount > 0 ? (stage.successCount / stage.jobCount) * 100 : 0;

        // Calculate statistics for each job in the stage
        const jobs = Object.values(stage.jobs).map(job => {
          const totalDuration = job.durations.reduce((sum, duration) => sum + duration, 0);
          const avgJobDuration = job.durations.length > 0 ? totalDuration / job.durations.length : 0;
          const successCount = job.statuses.filter(status => status === 'success').length;
          const jobSuccessRate = job.statuses.length > 0 ? (successCount / job.statuses.length) * 100 : 0;

          return {
            name: job.name,
            avgDuration: avgJobDuration,
            successRate: jobSuccessRate,
            runs: job.durations.length
          };
        });

        return {
          name: stageName,
          avgDuration,
          successRate,
          jobCount: stage.jobCount,
          jobs: jobs.sort((a, b) => b.avgDuration - a.avgDuration) // Sort jobs by duration (descending)
        };
      });

      // Find the slowest stage and jobs
      const stagesCopy = [...stages];
      const slowestStage = stagesCopy.sort((a, b) => b.avgDuration - a.avgDuration)[0] || null;
      const slowestJobs = stages.flatMap(stage => stage.jobs)
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, 5);

      // Calculate overall statistics
      const totalDuration = pipelineDetails.reduce((sum, pipeline) => sum + (pipeline.duration || 0), 0);
      const avgPipelineDuration = pipelineDetails.length > 0 ? totalDuration / pipelineDetails.length : 0;

      return {
        pipelineCount: pipelineDetails.length,
        avgPipelineDuration,
        stages,
        slowestStage,
        slowestJobs,
        pipelineDetails // Include raw data for custom visualizations
      };
    } catch (error) {
      console.error(`Failed to get pipeline performance analysis for project ${projectId}:`, error);
      return {
        pipelineCount: 0,
        avgPipelineDuration: 0,
        stages: [],
        slowestStage: null,
        slowestJobs: [],
        pipelineDetails: []
      };
    }
  }
}

export default DashboardDataService;
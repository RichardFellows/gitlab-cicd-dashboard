import GitLabApiService from './GitLabApiService';
import { DashboardMetrics, PipelineTrend, PipelinePerformanceAnalysis, Commit, ProjectMetrics, Pipeline, Job, DashboardConfig, GitLabApiProject, MainBranchTrend, CoverageTrend, AggregatedTrend, CoverageStatus } from '../types';
import { METRICS_THRESHOLDS } from '../utils/constants';

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
   * Get CI/CD metrics from multiple groups and individual projects
   * @param {DashboardConfig} config - The dashboard configuration with groups and projects
   * @returns {Promise<DashboardMetrics>} - Aggregated dashboard metrics
   */
  async getMultiSourceMetrics(config: DashboardConfig): Promise<DashboardMetrics> {
    const timeframe = { days: config.timeframe || 30 };
    const endDate = new Date().toISOString();
    const startDate = new Date(
      Date.now() - timeframe.days * 24 * 60 * 60 * 1000
    ).toISOString();

    const sourceStats = {
      groupsLoaded: 0,
      projectsLoaded: 0,
      failedGroups: [] as string[],
      failedProjects: [] as string[]
    };

    // Collect all projects from groups
    const groupProjectPromises = config.groups.map(async (group) => {
      try {
        const projects = await this.gitLabService.getGroupProjects(group.id);
        sourceStats.groupsLoaded++;
        return projects.filter(project => !project.name.startsWith('DELETE-'));
      } catch (error) {
        console.error(`Failed to fetch projects from group ${group.id}:`, error);
        sourceStats.failedGroups.push(group.id);
        return [];
      }
    });

    // Fetch individual projects
    const individualProjectPromises = config.projects.map(async (projectSource) => {
      try {
        const details = await this.gitLabService.getProjectDetails(projectSource.id);
        if (details && details.default_branch !== undefined) {
          // Need to get full project info
          const path = `/projects/${projectSource.id}`;
          const url = this.gitLabService.getApiUrl(path, '');
          const response = await fetch(url, {
            headers: this.gitLabService.getAuthHeaders(),
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch project ${projectSource.id}`);
          }

          const fullProject = await response.json() as GitLabApiProject;
          sourceStats.projectsLoaded++;
          return fullProject;
        }
        throw new Error(`Project ${projectSource.id} not found`);
      } catch (error) {
        console.error(`Failed to fetch project ${projectSource.id}:`, error);
        sourceStats.failedProjects.push(projectSource.id);
        return null;
      }
    });

    // Wait for all group projects and individual projects
    const [groupProjectResults, individualProjectResults] = await Promise.all([
      Promise.all(groupProjectPromises),
      Promise.all(individualProjectPromises)
    ]);

    // Flatten group projects
    const groupProjects = groupProjectResults.flat();

    // Filter out null individual projects
    const individualProjects = individualProjectResults.filter(
      (p): p is GitLabApiProject => p !== null
    );

    // Deduplicate by project ID (keep first occurrence)
    const projectMap = new Map<number, GitLabApiProject>();

    // Add group projects first
    for (const project of groupProjects) {
      if (!projectMap.has(project.id)) {
        projectMap.set(project.id, project);
      }
    }

    // Add individual projects (they won't override group projects)
    for (const project of individualProjects) {
      if (!projectMap.has(project.id)) {
        projectMap.set(project.id, project);
      }
    }

    const uniqueProjects = Array.from(projectMap.values());
    console.log(`Fetching metrics for ${uniqueProjects.length} unique projects (from ${groupProjects.length} group projects + ${individualProjects.length} individual projects)`);

    // Collect metrics for each unique project
    const projectMetrics = await Promise.all(
      uniqueProjects.map((project) =>
        this.getProjectMetrics(project.id, { startDate, endDate })
      )
    );

    // Combine all project metrics
    const metrics: DashboardMetrics = {
      totalProjects: uniqueProjects.length,
      projects: uniqueProjects.map((project, index) => ({
        id: project.id,
        name: project.name,
        path: project.path_with_namespace,
        web_url: project.web_url,
        metrics: projectMetrics[index],
      })),
      aggregateMetrics: this.calculateAggregateMetrics(projectMetrics),
      sourceStats
    };

    this.metrics = metrics;
    return metrics;
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
      let mainBranchPipeline: Pipeline = {
        id: 0,
        status: 'unknown',
        web_url: undefined,
        created_at: '',
        updated_at: '',
        available: false,
        failedJobs: [] as Job[]
      };
      
      try {
        const pipeline = await this.gitLabService.getMainBranchPipeline(projectId);
        mainBranchPipeline = {
          ...pipeline,
          web_url: undefined,  // Explicitly set to undefined to match the type
          available: pipeline.available || false,
          failedJobs: pipeline.failedJobs || []
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
      let recentCommits: Commit[] = [];
      
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
      // The list API doesn't return duration, so we need to fetch details for completed pipelines
      let totalDuration = 0;
      let pipelinesWithDuration = 0;

      // Get completed pipelines (success, failed, canceled) - limit to recent 10 for efficiency
      const completedPipelines = pipelines
        .filter(p => ['success', 'failed', 'canceled'].includes(p.status))
        .slice(0, 10);

      console.log(`Fetching duration for ${completedPipelines.length} completed pipelines in project ${projectId}`);

      // Fetch details for completed pipelines to get duration
      const pipelineDetailsPromises = completedPipelines.map(async (pipeline) => {
        try {
          const details = await this.gitLabService.getPipelineDetails(projectId, pipeline.id);
          return details;
        } catch (error) {
          console.error(`Failed to get details for pipeline ${pipeline.id}:`, error);
          return null;
        }
      });

      const pipelineDetails = await Promise.all(pipelineDetailsPromises);

      for (const details of pipelineDetails) {
        if (details && details.duration && details.duration > 0) {
          totalDuration += details.duration;
          pipelinesWithDuration++;
        }
      }

      // Log summary of duration calculation
      console.log(`Project ${projectId}: Found ${pipelinesWithDuration} pipelines with duration out of ${completedPipelines.length} fetched`);

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
  calculateAggregateMetrics(projectMetrics: ProjectMetrics[]) {
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

  /**
   * Get main branch pipeline trends for a project
   * @param projectId - The GitLab project ID
   * @param params - Parameters like date range
   * @returns Main branch trend data grouped by day
   */
  async getMainBranchTrends(
    projectId: string | number,
    params: { startDate?: string; endDate?: string }
  ): Promise<MainBranchTrend[]> {
    try {
      // Get the project's default branch
      const projectDetails = await this.gitLabService.getProjectDetails(projectId);
      const defaultBranch = projectDetails.default_branch || 'main';

      // Get pipelines for the default branch only
      const pipelines = await this.gitLabService.getProjectPipelines(projectId, {
        ...params,
        ref: defaultBranch,
        per_page: 100
      });

      // Group pipelines by day
      const pipelinesByDay: Record<string, {
        date: string;
        total: number;
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
            failed: 0,
            duration: 0,
            pipelinesWithDuration: 0
          };
        }

        pipelinesByDay[date].total++;

        if (pipeline.status === 'failed') {
          pipelinesByDay[date].failed++;
        }

        if (pipeline.duration) {
          pipelinesByDay[date].duration += pipeline.duration;
          pipelinesByDay[date].pipelinesWithDuration++;
        }
      }

      // Convert to array and calculate rates
      const trends = Object.values(pipelinesByDay).map(day => ({
        date: day.date,
        total: day.total,
        failed: day.failed,
        failureRate: day.total > 0 ? (day.failed / day.total) * 100 : 0,
        avgDuration: day.pipelinesWithDuration > 0 ? day.duration / day.pipelinesWithDuration : 0
      }));

      return trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error(`Failed to get main branch trends for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Get code coverage trends for a project over time
   * @param projectId - The GitLab project ID
   * @param params - Parameters like date range
   * @returns Coverage trend data grouped by day
   */
  async getCoverageTrends(
    projectId: string | number,
    params: { startDate?: string; endDate?: string }
  ): Promise<CoverageTrend[]> {
    try {
      // Get the project's default branch
      const projectDetails = await this.gitLabService.getProjectDetails(projectId);
      const defaultBranch = projectDetails.default_branch || 'main';

      // Get pipelines for the default branch
      const pipelines = await this.gitLabService.getProjectPipelines(projectId, {
        ...params,
        ref: defaultBranch,
        per_page: 100
      });

      // Get coverage for each pipeline - we need pipeline details
      const coverageByDay: Record<string, { date: string; coverage: number | null; count: number }> = {};

      for (const pipeline of pipelines) {
        const date = new Date(pipeline.created_at).toISOString().split('T')[0];

        // Get pipeline details to get coverage
        try {
          const details = await this.gitLabService.getPipelineDetails(projectId, pipeline.id);

          if (!coverageByDay[date]) {
            coverageByDay[date] = { date, coverage: null, count: 0 };
          }

          if (details.coverage !== undefined && details.coverage !== null) {
            const coverageValue = typeof details.coverage === 'string'
              ? parseFloat(details.coverage)
              : details.coverage;

            if (!isNaN(coverageValue)) {
              if (coverageByDay[date].coverage === null) {
                coverageByDay[date].coverage = coverageValue;
                coverageByDay[date].count = 1;
              } else {
                // Average coverage for the day
                coverageByDay[date].coverage =
                  ((coverageByDay[date].coverage || 0) * coverageByDay[date].count + coverageValue) /
                  (coverageByDay[date].count + 1);
                coverageByDay[date].count++;
              }
            }
          }
        } catch (error) {
          // Skip pipelines where we can't get details
          console.debug(`Couldn't get details for pipeline ${pipeline.id}`);
        }
      }

      // Convert to array
      const trends = Object.values(coverageByDay).map(day => ({
        date: day.date,
        coverage: day.coverage
      }));

      return trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error(`Failed to get coverage trends for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Get aggregated trends across multiple projects
   * @param projectIds - Array of project IDs
   * @param params - Parameters like date range
   * @returns Aggregated trend data for dashboard-level charts
   */
  async getAggregatedTrends(
    projectIds: (string | number)[],
    params: { startDate?: string; endDate?: string }
  ): Promise<AggregatedTrend[]> {
    try {
      // Get trends for all projects in parallel
      const allTrends = await Promise.all(
        projectIds.map(projectId => this.getMainBranchTrends(projectId, params))
      );

      // Get coverage trends for all projects
      const allCoverageTrends = await Promise.all(
        projectIds.map(projectId => this.getCoverageTrends(projectId, params))
      );

      // Aggregate by date
      const aggregatedByDay: Record<string, {
        date: string;
        failureRates: number[];
        durations: number[];
        coverages: number[];
      }> = {};

      // Process main branch trends
      allTrends.forEach(projectTrends => {
        projectTrends.forEach(trend => {
          if (!aggregatedByDay[trend.date]) {
            aggregatedByDay[trend.date] = {
              date: trend.date,
              failureRates: [],
              durations: [],
              coverages: []
            };
          }

          if (trend.total > 0) {
            aggregatedByDay[trend.date].failureRates.push(trend.failureRate);
          }
          if (trend.avgDuration > 0) {
            aggregatedByDay[trend.date].durations.push(trend.avgDuration);
          }
        });
      });

      // Process coverage trends
      allCoverageTrends.forEach(projectCoverage => {
        projectCoverage.forEach(coverage => {
          if (!aggregatedByDay[coverage.date]) {
            aggregatedByDay[coverage.date] = {
              date: coverage.date,
              failureRates: [],
              durations: [],
              coverages: []
            };
          }

          if (coverage.coverage !== null) {
            aggregatedByDay[coverage.date].coverages.push(coverage.coverage);
          }
        });
      });

      // Calculate averages
      const trends = Object.values(aggregatedByDay).map(day => ({
        date: day.date,
        avgFailureRate: day.failureRates.length > 0
          ? day.failureRates.reduce((a, b) => a + b, 0) / day.failureRates.length
          : 0,
        avgDuration: day.durations.length > 0
          ? day.durations.reduce((a, b) => a + b, 0) / day.durations.length
          : 0,
        avgCoverage: day.coverages.length > 0
          ? day.coverages.reduce((a, b) => a + b, 0) / day.coverages.length
          : null
      }));

      return trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Failed to get aggregated trends:', error);
      return [];
    }
  }

  /**
   * Calculate coverage status relative to threshold
   * @param coverage - The coverage value
   * @returns Coverage status
   */
  getCoverageStatus(coverage: number | null): CoverageStatus {
    if (coverage === null) return 'none';
    return coverage >= METRICS_THRESHOLDS.COVERAGE_TARGET ? 'above' : 'below';
  }

  /**
   * Calculate main branch failure rate from metrics
   * @param metrics - Project metrics
   * @returns Failure rate percentage
   */
  getMainBranchFailureRate(metrics: ProjectMetrics): number {
    if (metrics.totalPipelines === 0) return 0;
    return (metrics.failedPipelines / metrics.totalPipelines) * 100;
  }
}

export default DashboardDataService;
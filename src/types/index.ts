// GitLab API Types

// Raw GitLab API project response (before adding metrics)
export interface GitLabApiProject {
  id: number;
  name: string;
  path_with_namespace?: string;
  path?: string;
  web_url: string;
  default_branch?: string;
}

// Partial project details (for error cases)
export type PartialGitLabApiProject = Partial<GitLabApiProject> & { default_branch?: string };

// Project with computed metrics (used in dashboard)
export interface Project {
  id: number;
  name: string;
  path_with_namespace?: string;
  path?: string;
  web_url: string;
  metrics: ProjectMetrics;
}

export interface Pipeline {
  id: number;
  status: string;
  ref?: string;
  web_url?: string;
  created_at: string;
  updated_at: string;
  finished_at?: string;
  duration?: number;
  coverage?: string | number;
  available?: boolean;
  failedJobs?: Job[];
  jobs?: Job[];
}

export interface Job {
  id: number;
  name: string;
  stage: string;
  status: string;
  web_url: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  duration?: number;
  failure_reason?: string;
}

export interface TestMetrics {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  available: boolean;
}

export interface CodeCoverage {
  coverage: number | null;
  available: boolean;
  pipelineId?: number | undefined;
  pipelineUrl?: string | undefined;
}

export interface MergeRequestCounts {
  totalOpen: number;
  drafts: number;
}

export interface Commit {
  id: string;
  short_id: string;
  title: string;
  message?: string;
  author_name?: string;
  committer_name?: string;
  created_at: string;
  web_url?: string;
}

export interface MergeRequest {
  id: number;
  iid: number;
  title: string;
  description?: string;
  state: string;
  created_at: string;
  updated_at: string;
  source_branch: string;
  target_branch: string;
  web_url: string;
  draft?: boolean;
  author?: {
    id: number;
    name: string;
    username: string;
  };
  head_pipeline?: Pipeline;
  recent_commits?: Commit[];
}

export interface ProjectMetrics {
  totalPipelines: number;
  successfulPipelines: number;
  failedPipelines: number;
  canceledPipelines: number;
  runningPipelines: number;
  successRate: number;
  avgDuration: number;
  testMetrics: TestMetrics;
  mainBranchPipeline: Pipeline;
  codeCoverage: CodeCoverage;
  mergeRequestCounts: MergeRequestCounts;
  recentCommits: Commit[];
  // Enhanced metrics for trends
  mainBranchFailureRate?: number;
  coverageStatus?: CoverageStatus;
  // Duration spike detection
  baselineDuration?: number;
  durationSpikePercent?: number;
}

export interface DashboardMetrics {
  totalProjects: number;
  projects: Project[];
  aggregateMetrics: {
    totalPipelines: number;
    successfulPipelines: number;
    failedPipelines: number;
    canceledPipelines: number;
    runningPipelines: number;
    avgSuccessRate: number;
    avgDuration: number;
    testMetrics: TestMetrics;
  };
  sourceStats?: {
    groupsLoaded: number;
    projectsLoaded: number;
    failedGroups: string[];
    failedProjects: string[];
  };
}

export interface PipelineTrend {
  date: string;
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  avgDuration: number;
}

// Main branch specific trend data
export interface MainBranchTrend {
  date: string;
  total: number;
  failed: number;
  failureRate: number;  // percentage
  avgDuration: number;  // seconds
}

// Coverage trend over time
export interface CoverageTrend {
  date: string;
  coverage: number | null;
}

// Aggregated trends across all projects
export interface AggregatedTrend {
  date: string;
  avgFailureRate: number;
  avgDuration: number;
  avgCoverage: number | null;
}

// Coverage status relative to threshold
export type CoverageStatus = 'above' | 'below' | 'none';

export interface PipelinePerformanceJob {
  name: string;
  avgDuration: number;
  successRate: number;
  runs: number;
}

export interface PipelinePerformanceStage {
  name: string;
  avgDuration: number;
  successRate: number;
  jobCount: number;
  jobs: PipelinePerformanceJob[];
}

export interface PipelinePerformanceAnalysis {
  pipelineCount: number;
  avgPipelineDuration: number;
  stages: PipelinePerformanceStage[];
  slowestStage: PipelinePerformanceStage | null;
  slowestJobs: PipelinePerformanceJob[];
  pipelineDetails: Pipeline[];
}

// Multi-source configuration types
export interface GroupSource {
  id: string;
  name?: string;        // Resolved name (cached)
  addedAt: string;      // ISO timestamp
}

export interface ProjectSource {
  id: string;
  name?: string;        // Resolved name (cached)
  path?: string;        // path_with_namespace (cached)
  addedAt: string;
}

export interface DashboardConfig {
  version: number;      // Schema version for migrations
  gitlabUrl: string;
  token: string;
  timeframe: number;
  groups: GroupSource[];
  projects: ProjectSource[];
}

// Storage keys for localStorage
export const STORAGE_KEYS = {
  GITLAB_URL: 'gitlab_cicd_dashboard_url',
  GROUP_ID: 'gitlab_cicd_dashboard_group_id',
  TOKEN: 'gitlab_cicd_dashboard_token',
  TIMEFRAME: 'gitlab_cicd_dashboard_timeframe',
  VIEW_TYPE: 'gitlab_cicd_dashboard_view_type',
  DARK_MODE: 'gitlab_cicd_dashboard_dark_mode',
  SETTINGS_COLLAPSED: 'gitlab_cicd_dashboard_settings_collapsed',
  DASHBOARD_CONFIG: 'gitlab_cicd_dashboard_config'
};

// View types enum
export enum ViewType {
  CARD = 'card',
  TABLE = 'table'
}

// Project status filter type
export type ProjectStatusFilter = 'all' | 'success' | 'warning' | 'failed' | 'inactive';
// GitLab API Types
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
  available?: boolean;
  failedJobs?: Job[];
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
  pipelineId?: number;
  pipelineUrl?: string;
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
}

export interface PipelineTrend {
  date: string;
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  avgDuration: number;
}

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

// Storage keys for localStorage
export const STORAGE_KEYS = {
  GITLAB_URL: 'gitlab_cicd_dashboard_url',
  GROUP_ID: 'gitlab_cicd_dashboard_group_id',
  TOKEN: 'gitlab_cicd_dashboard_token',
  TIMEFRAME: 'gitlab_cicd_dashboard_timeframe',
  VIEW_TYPE: 'gitlab_cicd_dashboard_view_type'
};

// View types enum
export enum ViewType {
  CARD = 'card',
  TABLE = 'table'
}
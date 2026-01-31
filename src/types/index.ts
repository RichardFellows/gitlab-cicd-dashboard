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
  jiraBaseUrl?: string;  // Optional JIRA base URL for linking (e.g., "https://jira.company.com/browse")
}

// Saved configuration entry wrapping a DashboardConfig with metadata
export interface SavedConfigEntry {
  id: string;                    // Unique identifier (timestamp + random suffix)
  name: string;                  // User-provided display name
  config: DashboardConfig;       // The actual configuration
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}

// Export format for sharing configurations (token optionally excluded)
export interface ExportedConfig {
  version: number;               // Schema version for forward compat
  name: string;
  config: DashboardConfig;       // Token may be empty string
  exportedAt: string;            // ISO timestamp
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
  DASHBOARD_CONFIG: 'gitlab_cicd_dashboard_config',
  HEALTH_SORT_ORDER: 'gitlab_cicd_dashboard_health_sort',
  SAVED_CONFIGS: 'gitlab_cicd_dashboard_saved_configs',
  ACTIVE_CONFIG_ID: 'gitlab_cicd_dashboard_active_config_id',
  AUTO_REFRESH_INTERVAL: 'gitlab_cicd_dashboard_auto_refresh_interval',
  NOTIFICATION_RULES: 'gitlab_cicd_dashboard_notification_rules',
  NOTIFICATION_HISTORY: 'gitlab_cicd_dashboard_notification_history',
  NOTIFICATIONS_ENABLED: 'gitlab_cicd_dashboard_notifications_enabled',
  NOTIFICATION_MUTED: 'gitlab_cicd_dashboard_notification_muted',
  MR_BOARD_FILTERS: 'gitlab_cicd_dashboard_mr_board_filters',
  MR_BOARD_SORT: 'gitlab_cicd_dashboard_mr_board_sort',
  MY_USERNAME: 'gitlab_cicd_dashboard_my_username',
  TIMELINE_FILTERS: 'gitlab_cicd_dashboard_timeline_filters',
  EXPORT_OPTIONS: 'gitlab_cicd_dashboard_export_options'
};

// View types enum
export enum ViewType {
  CARD = 'card',
  TABLE = 'table',
  ENVIRONMENT = 'environment',
  READINESS = 'readiness',
  MR_BOARD = 'mr-board'
}

// Project status filter type
export type ProjectStatusFilter = 'all' | 'success' | 'warning' | 'failed' | 'inactive';

// ============================================
// Environment Overview Types (Priority 2)
// ============================================

// Standard environment names
export type EnvironmentName = 'dev' | 'sit' | 'uat' | 'prod';

// Standard environment order for display (left to right)
export const ENVIRONMENT_ORDER: EnvironmentName[] = ['dev', 'sit', 'uat', 'prod'];

// Deployment status types
export type DeploymentStatus = 'success' | 'failed' | 'running' | 'pending' | 'canceled';

// Deployment info extracted from job + artifact
export interface Deployment {
  jobId: number;
  jobName: string;
  environment: EnvironmentName;
  version: string | null;        // From deploy-info.json or fallback to pipeline IID
  status: DeploymentStatus;
  timestamp: string;             // finished_at or created_at
  pipelineId: number;
  pipelineIid?: number;          // Pipeline internal ID (for fallback version)
  pipelineRef: string;           // Branch name
  jobUrl: string;
  pipelineUrl?: string;
  commitSha?: string;
  jiraKey?: string | null;       // Extracted from branch name
}

// Deployments grouped by environment for a project
export interface DeploymentsByEnv {
  projectId: number;
  deployments: Partial<Record<EnvironmentName, Deployment>>;
  loading: boolean;
  error?: string;
}

// Deploy artifact schema (what we write in CI)
export interface DeployInfoArtifact {
  version: string;
  // Future: could add more fields like buildTime, commit, etc.
}

// ============================================
// Promotion Readiness Types (Priority 3)
// ============================================

// MR Note from GitLab API
export interface MRNote {
  id: number;
  body: string;
  author: {
    id: number;
    username: string;
    name: string;
  };
  created_at: string;
  system: boolean;  // Filter out system notes
}

// Parsed sign-off from regex
export interface ParsedSignoff {
  version: string;
  environment: EnvironmentName;
}

// Sign-off parsed from MR comment
export interface Signoff {
  version: string;
  environment: EnvironmentName;
  author: string;           // GitLab username
  authorizedBy: string;     // CODEOWNERS match (if valid)
  timestamp: string;        // Comment created_at
  noteId: number;           // MR note ID for linking
  mrIid: number;            // MR IID
  isValid: boolean;         // Author in CODEOWNERS?
}

// Post-deploy test status
export interface PostDeployTestStatus {
  exists: boolean;          // Are there post-deploy jobs?
  passed: boolean | null;   // null if no tests
  jobId?: number;
  jobUrl?: string;
  jobName?: string;
}

// Readiness status enum
export type ReadinessStatus = 
  | 'ready'           // Deployed + signed off + tests passed (or no tests)
  | 'pending-signoff' // Deployed + tests passed, awaiting sign-off
  | 'tests-failed'    // Deployed but post-deploy tests failed
  | 'not-deployed';   // Not deployed to this environment

// Version readiness for an environment
export interface VersionReadiness {
  projectId: number;
  projectName: string;
  version: string;
  environment: EnvironmentName;
  deployment: Deployment | null;        // From Priority 2
  signoff: Signoff | null;              // Parsed from MR
  testStatus: PostDeployTestStatus;
  status: ReadinessStatus;
  mr?: {
    iid: number;
    webUrl: string;
    title: string;
  };
}

// ============================================
// Notification Rules Types (Priority 4)
// ============================================

// Notification rule types
export type NotificationRuleType =
  | 'pipeline-failure'      // Main branch pipeline failed
  | 'coverage-drop'         // Coverage below threshold
  | 'duration-spike'        // Duration increased above threshold %
  | 'deployment-failure';   // Failed deployment to specified environment

export interface NotificationRule {
  id: string;                           // Unique identifier
  type: NotificationRuleType;
  name: string;                         // Display name
  enabled: boolean;
  scope: 'all' | number[];             // 'all' projects or specific project IDs
  threshold?: number;                   // For coverage-drop (%) or duration-spike (%)
  environment?: EnvironmentName;        // For deployment-failure
  createdAt: string;
}

export interface NotificationEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleType: NotificationRuleType;
  projectId: number;
  projectName: string;
  message: string;
  value: number;                        // The metric value that triggered it
  timestamp: string;
  read: boolean;
}

// ============================================
// Failure Diagnosis Types (Priority 6)
// ============================================

/** Category types for pipeline failure classification */
export type FailureCategoryType =
  | 'dependency'       // npm/package/module errors
  | 'infrastructure'   // connection, memory, system errors
  | 'test-failure'     // assertion and test framework errors
  | 'timeout'          // execution time exceeded
  | 'unknown';         // no pattern matched

/** Detected failure category with metadata */
export interface FailureCategory {
  type: FailureCategoryType;
  icon: string;            // Emoji icon
  label: string;           // Human-readable label
  matchedPattern: string;  // The pattern that matched (for debugging)
  confidence: 'high' | 'medium' | 'low';
}

/** Failure frequency for a specific job */
export interface FailureFrequency {
  jobName: string;
  failedCount: number;
  totalCount: number;
  isFlaky: boolean;        // true if fails inconsistently (>0 but <80% failures)
}

/** A single highlighted log line with severity level */
export interface HighlightedLine {
  text: string;
  level: 'error' | 'warning' | 'info' | 'normal';
  lineNumber: number;
}

// ============================================
// MR Pipeline Status Board Types (Priority 7)
// ============================================

/** MR with project context for cross-project display */
export interface MRWithProject extends MergeRequest {
  projectId: number;
  projectName: string;
  projectPath?: string;
}

/** MR Board filter state */
export interface MRBoardFilters {
  projectIds: number[];           // Empty = all projects
  authorSearch: string;           // Username or name substring
  myMRsOnly: boolean;
  myUsername: string;              // Configured username for "My MRs"
}

/** MR sort options */
export type MRSortOption =
  | 'newest'
  | 'oldest'
  | 'last-activity'
  | 'project-name';

/** MR pipeline status for grouping */
export type MRPipelineGroup =
  | 'passing'
  | 'failing'
  | 'running'
  | 'draft'
  | 'no-pipeline';

// ============================================
// Deployment Timeline Types (Priority 8)
// ============================================

/** Extended deployment entry with history context */
export interface DeploymentHistoryEntry extends Deployment {
  projectId: number;
  projectName: string;
  isRollback: boolean;
  rolledBackFrom?: string;       // Previous version (if rollback)
}

/** Timeline filter state */
export interface TimelineFilters {
  projectIds: number[];            // Empty = all
  environments: EnvironmentName[]; // Empty = all
  statuses: ('success' | 'failed' | 'rollback')[];
  dateFrom: string | null;         // ISO date
  dateTo: string | null;           // ISO date
}

// ============================================
// Exportable Reports Types (Priority 10)
// ============================================

/** PDF export section options */
export interface PdfExportOptions {
  includeSummary: boolean;
  includeProjectTable: boolean;
  includeTrendCharts: boolean;
  includeEnvironmentMatrix: boolean;
  includeDetailedBreakdown: boolean;
}

/** Chart reference map for PDF image capture */
export interface ChartRefMap {
  successRate?: HTMLCanvasElement | null;
  duration?: HTMLCanvasElement | null;
  coverage?: HTMLCanvasElement | null;
  distribution?: HTMLCanvasElement | null;
}
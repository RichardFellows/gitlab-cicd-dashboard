/**
 * Regex for identifying deploy jobs and extracting environment
 * Matches job names like: "deploy-to-dev", "deploy_uat", "deploy prod", etc.
 * Captures environment name in group 1
 */
export const DEPLOY_JOB_REGEX = /deploy.*?(dev|sit|uat|prod)/i;

/**
 * Regex for parsing sign-off comments from MR notes
 * Strict format: SIGNOFF: v<version> <environment>
 * Examples:
 *   SIGNOFF: v2.3.45 UAT
 *   SIGNOFF: 1.0.12 DEV
 *   SIGNOFF: v3.0.0 PROD
 * Captures: group 1 = version (without v prefix), group 2 = environment
 */
export const SIGNOFF_REGEX = /^SIGNOFF:\s*v?([\d.]+)\s+(DEV|SIT|UAT|PROD)\s*$/im;

/**
 * Regex for extracting usernames from CODEOWNERS file
 * Matches @username patterns
 */
export const CODEOWNERS_USER_REGEX = /@([\w-]+)/g;

/**
 * Regex for extracting JIRA issue key from branch names
 * Matches patterns like: "feature/JIRA-123-description", "PROJ-456/fix-bug"
 * Captures the full issue key (e.g., "JIRA-123") in group 1
 */
export const JIRA_KEY_REGEX = /([A-Z]+-\d+)/;

/**
 * Metrics threshold constants for visual flagging
 */
export const METRICS_THRESHOLDS = {
  /** Coverage target percentage - below this shows as warning */
  COVERAGE_TARGET: 80,

  /** Failure rate warning threshold - projects above this get flagged */
  FAILURE_RATE_WARNING: 15,

  /** Failure rate critical threshold - projects above this get danger flagging */
  FAILURE_RATE_DANGER: 25,

  /** Duration spike threshold - percentage increase to flag as spike */
  DURATION_SPIKE_PERCENT: 50,
};

/**
 * Chart colors for consistent styling
 */
export const CHART_COLORS = {
  primary: '#6e49cb',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  inactive: '#6c757d',
  coverage: '#17a2b8',
  duration: '#fd7e14',
  failureRate: '#dc3545',
};

/**
 * Chart colors for dark mode
 */
export const CHART_COLORS_DARK = {
  primary: '#9d7fe8',
  success: '#4caf50',
  warning: '#ffca28',
  danger: '#f44336',
  inactive: '#9e9e9e',
  coverage: '#00bcd4',
  duration: '#ff9800',
  failureRate: '#f44336',
};

/**
 * Auto-refresh interval options (value in milliseconds, 0 = off)
 */
export const AUTO_REFRESH_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '2 min', value: 2 * 60 * 1000 },
  { label: '5 min', value: 5 * 60 * 1000 },
  { label: '15 min', value: 15 * 60 * 1000 },
] as const;

/** Threshold in ms — data older than this is considered "stale" (30 minutes) */
export const STALE_DATA_THRESHOLD = 30 * 60 * 1000;

/** Threshold in ms — data older than this shows aging indicator (5 minutes) */
export const AGING_DATA_THRESHOLD = 5 * 60 * 1000;

/**
 * Helper function to check if a project should show failure rate alert
 */
export const shouldShowFailureRateAlert = (failureRate: number): boolean => {
  return failureRate >= METRICS_THRESHOLDS.FAILURE_RATE_WARNING;
};

/**
 * Helper function to check if a project should show coverage alert
 */
export const shouldShowCoverageAlert = (coverage: number | null, available: boolean): boolean => {
  if (!available || coverage === null) return false;
  return coverage < METRICS_THRESHOLDS.COVERAGE_TARGET;
};

/**
 * Helper function to check if a project has a duration spike
 * @param currentDuration - Current average duration in seconds
 * @param baselineDuration - Baseline (historical average) duration in seconds
 * @returns true if current duration is significantly above baseline
 */
export const shouldShowDurationSpikeAlert = (currentDuration: number, baselineDuration: number): boolean => {
  if (baselineDuration <= 0 || currentDuration <= 0) return false;
  const percentageIncrease = ((currentDuration - baselineDuration) / baselineDuration) * 100;
  return percentageIncrease >= METRICS_THRESHOLDS.DURATION_SPIKE_PERCENT;
};

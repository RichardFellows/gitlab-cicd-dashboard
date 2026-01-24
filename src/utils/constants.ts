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

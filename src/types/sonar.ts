/**
 * SonarQube / SonarCloud API Types
 *
 * Compatible with both SonarCloud (sonarcloud.io) and on-prem SonarQube 9.x+.
 * API docs: https://sonarcloud.io/web_api
 */

// ─── Configuration ──────────────────────────────────────────────

export interface SonarConfig {
  /** Base URL (e.g. "https://sonarcloud.io" or "https://sonar.internal.corp") */
  baseUrl: string;
  /** User token (sonar API token or PAT) */
  token: string;
  /** SonarCloud organization key (required for Cloud, ignored for on-prem) */
  organization?: string;
}

// ─── Metrics ────────────────────────────────────────────────────

/** Standard metric keys the dashboard consumes */
export type SonarMetricKey =
  | 'coverage'
  | 'bugs'
  | 'vulnerabilities'
  | 'code_smells'
  | 'duplicated_lines_density'
  | 'ncloc'
  | 'reliability_rating'
  | 'security_rating'
  | 'sqale_rating'
  | 'sqale_index'
  | 'security_hotspots';

/** A single metric value from the measures API */
export interface SonarMeasure {
  metric: SonarMetricKey | string;
  value: string;
  /** Present when requesting periods (leak period) */
  period?: {
    value: string;
    bestValue: boolean;
  };
}

/** Project metrics snapshot */
export interface SonarProjectMetrics {
  projectKey: string;
  measures: SonarMeasure[];
  /** Parsed convenience fields */
  coverage: number | null;
  bugs: number;
  vulnerabilities: number;
  codeSmells: number;
  duplicatedLinesDensity: number | null;
  linesOfCode: number;
  reliabilityRating: number;
  securityRating: number;
  maintainabilityRating: number;
  technicalDebt: number;
  securityHotspots: number;
}

// ─── Quality Gate ───────────────────────────────────────────────

export type QualityGateStatus = 'OK' | 'WARN' | 'ERROR' | 'NONE';

export interface QualityGateCondition {
  status: QualityGateStatus;
  metricKey: string;
  comparator: 'GT' | 'LT';
  errorThreshold: string;
  actualValue: string;
}

export interface QualityGateResult {
  status: QualityGateStatus;
  conditions: QualityGateCondition[];
  /** Whether analysis was recent enough to trust */
  ignoredConditions: boolean;
}

// ─── Issues ─────────────────────────────────────────────────────

export type SonarIssueSeverity = 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
export type SonarIssueType = 'BUG' | 'VULNERABILITY' | 'CODE_SMELL' | 'SECURITY_HOTSPOT';
export type SonarIssueStatus = 'OPEN' | 'CONFIRMED' | 'REOPENED' | 'RESOLVED' | 'CLOSED';

export interface SonarIssue {
  key: string;
  rule: string;
  severity: SonarIssueSeverity;
  component: string;
  project: string;
  line?: number;
  message: string;
  type: SonarIssueType;
  status: SonarIssueStatus;
  creationDate: string;
  updateDate: string;
}

export interface SonarIssuesResponse {
  total: number;
  issues: SonarIssue[];
  /** Facet counts by severity */
  facets?: Array<{
    property: string;
    values: Array<{ val: string; count: number }>;
  }>;
}

/** Aggregated issue counts by severity */
export interface SonarIssueSeverityCounts {
  blocker: number;
  critical: number;
  major: number;
  minor: number;
  info: number;
  total: number;
}

// ─── Metric History ─────────────────────────────────────────────

export interface SonarMetricHistoryPoint {
  date: string;
  value: string;
}

export interface SonarMetricHistory {
  metric: string;
  history: SonarMetricHistoryPoint[];
}

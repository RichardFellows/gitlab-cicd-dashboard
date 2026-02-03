import { ProjectMetrics, Project } from '../types';
import { METRICS_THRESHOLDS } from './constants';

// ============================================
// Health Score Constants & Types
// ============================================

/** Health score signal weights (must sum to 1.0) */
export const HEALTH_WEIGHTS = {
  FAILURE_RATE: 0.30,
  COVERAGE: 0.25,
  DURATION_STABILITY: 0.15,
  MR_BACKLOG: 0.15,
  RECENT_ACTIVITY: 0.15,
} as const;

/** Health band thresholds */
export const HEALTH_BANDS = {
  HEALTHY: 80,   // score >= 80
  WARNING: 50,   // score >= 50
  // Below 50 = critical
} as const;

export type HealthBand = 'healthy' | 'warning' | 'critical';

export interface HealthSignalResult {
  name: string;
  weight: number;
  rawValue: number | null;
  score: number;        // 0-100 for this signal
  weighted: number;     // score * weight
  unit: string;         // '%', 'MRs', 'days', etc.
  description: string;  // Human-readable explanation
}

export interface HealthScore {
  total: number;        // 0-100
  band: HealthBand;
  signals: HealthSignalResult[];
}

export interface PortfolioHealth {
  averageScore: number;
  distribution: {
    healthy: number;
    warning: number;
    critical: number;
  };
  projectScores: Array<{ projectId: number; projectName: string; score: number; band: HealthBand }>;
}

// ============================================
// Individual Signal Scoring Functions
// ============================================

/**
 * Score main branch failure rate.
 * 0% failures = 100, ≥25% = 0, linear between.
 */
export function scoreFailureRate(failureRate: number): number {
  if (failureRate <= 0) return 100;
  if (failureRate >= METRICS_THRESHOLDS.FAILURE_RATE_DANGER) return 0;
  return Math.round(100 - (failureRate / METRICS_THRESHOLDS.FAILURE_RATE_DANGER) * 100);
}

/**
 * Score code coverage.
 * ≥80% = 100, 0% = 0, linear. null = 0.
 */
export function scoreCoverage(coverage: number | null): number {
  if (coverage === null) return 0;
  if (coverage >= METRICS_THRESHOLDS.COVERAGE_TARGET) return 100;
  return Math.round((coverage / METRICS_THRESHOLDS.COVERAGE_TARGET) * 100);
}

/**
 * Score duration stability.
 * No spike (0%) = 100, ≥50% spike = 0, linear between.
 */
export function scoreDurationStability(spikePercent: number): number {
  if (spikePercent <= 0) return 100;
  if (spikePercent >= METRICS_THRESHOLDS.DURATION_SPIKE_PERCENT) return 0;
  return Math.round(100 - (spikePercent / METRICS_THRESHOLDS.DURATION_SPIKE_PERCENT) * 100);
}

/**
 * Score open MR backlog.
 * 0-2 MRs = 100, ≥10 = 0, linear between.
 */
export function scoreMRBacklog(totalOpen: number): number {
  if (totalOpen <= 2) return 100;
  if (totalOpen >= 10) return 0;
  return Math.round(100 - ((totalOpen - 2) / 8) * 100);
}

/**
 * Score recent activity.
 * ≥10 pipelines = 100, 0 = 0, linear between.
 */
export function scoreRecentActivity(totalPipelines: number): number {
  if (totalPipelines >= 10) return 100;
  if (totalPipelines <= 0) return 0;
  return Math.round((totalPipelines / 10) * 100);
}

// ============================================
// Composite Score Functions
// ============================================

/**
 * Determine health band from a numeric score.
 */
export function getHealthBand(score: number): HealthBand {
  if (score >= HEALTH_BANDS.HEALTHY) return 'healthy';
  if (score >= HEALTH_BANDS.WARNING) return 'warning';
  return 'critical';
}

/**
 * Calculate the composite health score for a project's metrics.
 */
export function calculateHealthScore(metrics: ProjectMetrics): HealthScore {
  // Compute failure rate from raw data if not pre-computed
  const failureRate = metrics.mainBranchFailureRate ??
    (metrics.totalPipelines > 0
      ? (metrics.failedPipelines / metrics.totalPipelines) * 100
      : 0);

  const spikePercent = metrics.durationSpikePercent ?? 0;
  const coverage = metrics.codeCoverage?.coverage ?? null;
  const totalOpen = metrics.mergeRequestCounts?.totalOpen ?? 0;
  const totalPipelines = metrics.totalPipelines ?? 0;

  const failureRateScore = scoreFailureRate(failureRate);
  const coverageScore = scoreCoverage(coverage);
  const durationScore = scoreDurationStability(spikePercent);
  const mrScore = scoreMRBacklog(totalOpen);
  const activityScore = scoreRecentActivity(totalPipelines);

  const signals: HealthSignalResult[] = [
    {
      name: 'Failure Rate',
      weight: HEALTH_WEIGHTS.FAILURE_RATE,
      rawValue: failureRate,
      score: failureRateScore,
      weighted: failureRateScore * HEALTH_WEIGHTS.FAILURE_RATE,
      unit: '%',
      description: `Main branch failure rate: ${failureRate.toFixed(1)}%`,
    },
    {
      name: 'Code Coverage',
      weight: HEALTH_WEIGHTS.COVERAGE,
      rawValue: coverage,
      score: coverageScore,
      weighted: coverageScore * HEALTH_WEIGHTS.COVERAGE,
      unit: '%',
      description: coverage !== null
        ? `Code coverage: ${coverage.toFixed(1)}%`
        : 'Code coverage: N/A',
    },
    {
      name: 'Duration Stability',
      weight: HEALTH_WEIGHTS.DURATION_STABILITY,
      rawValue: spikePercent,
      score: durationScore,
      weighted: durationScore * HEALTH_WEIGHTS.DURATION_STABILITY,
      unit: '%',
      description: `Duration spike: ${spikePercent.toFixed(1)}%`,
    },
    {
      name: 'MR Backlog',
      weight: HEALTH_WEIGHTS.MR_BACKLOG,
      rawValue: totalOpen,
      score: mrScore,
      weighted: mrScore * HEALTH_WEIGHTS.MR_BACKLOG,
      unit: 'MRs',
      description: `Open merge requests: ${totalOpen}`,
    },
    {
      name: 'Recent Activity',
      weight: HEALTH_WEIGHTS.RECENT_ACTIVITY,
      rawValue: totalPipelines,
      score: activityScore,
      weighted: activityScore * HEALTH_WEIGHTS.RECENT_ACTIVITY,
      unit: 'pipelines',
      description: `Total pipelines: ${totalPipelines}`,
    },
  ];

  const total = Math.round(signals.reduce((sum, s) => sum + s.weighted, 0));

  return {
    total,
    band: getHealthBand(total),
    signals,
  };
}

/**
 * Calculate aggregate portfolio health across all projects.
 * Excludes zero-activity projects from the average but includes them in distribution as 'critical'.
 */
export function calculatePortfolioHealth(projects: Project[]): PortfolioHealth {
  const distribution = { healthy: 0, warning: 0, critical: 0 };
  const projectScores: PortfolioHealth['projectScores'] = [];
  let activeScoreSum = 0;
  let activeCount = 0;

  for (const project of projects) {
    const health = calculateHealthScore(project.metrics);
    projectScores.push({
      projectId: project.id,
      projectName: project.name,
      score: health.total,
      band: health.band,
    });

    distribution[health.band]++;

    // Only include active projects in average
    if (project.metrics.totalPipelines > 0) {
      activeScoreSum += health.total;
      activeCount++;
    }
  }

  return {
    averageScore: activeCount > 0 ? Math.round(activeScoreSum / activeCount) : 0,
    distribution,
    projectScores,
  };
}

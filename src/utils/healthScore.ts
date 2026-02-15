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

/** User-configurable weight overrides */
export interface HealthWeightConfig {
  failureRate?: number;
  coverage?: number;
  durationStability?: number;
  mrBacklog?: number;
  recentActivity?: number;
}

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
 * Resolve effective weights from optional user overrides.
 * Falls back to defaults for any unset weight.
 */
export function resolveWeights(overrides?: HealthWeightConfig): Record<string, number> {
  return {
    failureRate: overrides?.failureRate ?? HEALTH_WEIGHTS.FAILURE_RATE,
    coverage: overrides?.coverage ?? HEALTH_WEIGHTS.COVERAGE,
    durationStability: overrides?.durationStability ?? HEALTH_WEIGHTS.DURATION_STABILITY,
    mrBacklog: overrides?.mrBacklog ?? HEALTH_WEIGHTS.MR_BACKLOG,
    recentActivity: overrides?.recentActivity ?? HEALTH_WEIGHTS.RECENT_ACTIVITY,
  };
}

/**
 * Redistribute weights when a metric is unavailable.
 * Unavailable signals get weight 0; their share is distributed
 * proportionally among the remaining signals.
 */
function redistributeWeights(
  weights: Record<string, number>,
  available: Record<string, boolean>
): Record<string, number> {
  let unavailableTotal = 0;
  let availableTotal = 0;

  for (const key of Object.keys(weights)) {
    if (available[key] === false) {
      unavailableTotal += weights[key];
    } else {
      availableTotal += weights[key];
    }
  }

  // If nothing is unavailable, or everything is unavailable, return as-is
  if (unavailableTotal === 0 || availableTotal === 0) return { ...weights };

  const result: Record<string, number> = {};
  for (const key of Object.keys(weights)) {
    if (available[key] === false) {
      result[key] = 0;
    } else {
      // Scale up proportionally to absorb the unavailable weight
      result[key] = weights[key] * (1 + unavailableTotal / availableTotal);
    }
  }
  return result;
}

/**
 * Calculate the composite health score for a project's metrics.
 *
 * @param metrics - Project metrics data
 * @param weightOverrides - Optional custom weights (defaults to HEALTH_WEIGHTS)
 * @param gracefulDegradation - If true (default), redistribute weight from
 *   unavailable metrics to available ones instead of scoring missing as 0.
 */
export function calculateHealthScore(
  metrics: ProjectMetrics,
  weightOverrides?: HealthWeightConfig,
  gracefulDegradation = true
): HealthScore {
  // Compute failure rate from raw data if not pre-computed
  const failureRate = metrics.mainBranchFailureRate ??
    (metrics.totalPipelines > 0
      ? (metrics.failedPipelines / metrics.totalPipelines) * 100
      : 0);

  const spikePercent = metrics.durationSpikePercent ?? 0;
  const coverage = metrics.codeCoverage?.coverage ?? null;
  const totalOpen = metrics.mergeRequestCounts?.totalOpen ?? 0;
  const totalPipelines = metrics.totalPipelines ?? 0;

  const baseWeights = resolveWeights(weightOverrides);

  // Determine which metrics are available
  const availability: Record<string, boolean> = {
    failureRate: true, // Always available (defaults to 0)
    coverage: coverage !== null,
    durationStability: true, // Always available (defaults to 0)
    mrBacklog: true, // Always available (defaults to 0)
    recentActivity: true, // Always available (defaults to 0)
  };

  const weights = gracefulDegradation
    ? redistributeWeights(baseWeights, availability)
    : baseWeights;

  const failureRateScore = scoreFailureRate(failureRate);
  const coverageScore = coverage !== null ? scoreCoverage(coverage) : 0;
  const durationScore = scoreDurationStability(spikePercent);
  const mrScore = scoreMRBacklog(totalOpen);
  const activityScore = scoreRecentActivity(totalPipelines);

  const signals: HealthSignalResult[] = [
    {
      name: 'Failure Rate',
      weight: weights.failureRate,
      rawValue: failureRate,
      score: failureRateScore,
      weighted: failureRateScore * weights.failureRate,
      unit: '%',
      description: `Main branch failure rate: ${failureRate.toFixed(1)}%`,
    },
    {
      name: 'Code Coverage',
      weight: weights.coverage,
      rawValue: coverage,
      score: coverageScore,
      weighted: coverageScore * weights.coverage,
      unit: '%',
      description: coverage !== null
        ? `Code coverage: ${coverage.toFixed(1)}%`
        : 'Code coverage: N/A (weight redistributed)',
    },
    {
      name: 'Duration Stability',
      weight: weights.durationStability,
      rawValue: spikePercent,
      score: durationScore,
      weighted: durationScore * weights.durationStability,
      unit: '%',
      description: `Duration spike: ${spikePercent.toFixed(1)}%`,
    },
    {
      name: 'MR Backlog',
      weight: weights.mrBacklog,
      rawValue: totalOpen,
      score: mrScore,
      weighted: mrScore * weights.mrBacklog,
      unit: 'MRs',
      description: `Open merge requests: ${totalOpen}`,
    },
    {
      name: 'Recent Activity',
      weight: weights.recentActivity,
      rawValue: totalPipelines,
      score: activityScore,
      weighted: activityScore * weights.recentActivity,
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

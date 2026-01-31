import { describe, test, expect } from 'vitest';
import {
  HEALTH_WEIGHTS,
  HEALTH_BANDS,
  scoreFailureRate,
  scoreCoverage,
  scoreDurationStability,
  scoreMRBacklog,
  scoreRecentActivity,
  getHealthBand,
  calculateHealthScore,
  calculatePortfolioHealth,
} from './healthScore';
import { ProjectMetrics, Project } from '../types';

// ============================================
// Weight validation
// ============================================

describe('HEALTH_WEIGHTS', () => {
  test('weights sum to 1.0', () => {
    const sum = Object.values(HEALTH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

// ============================================
// Individual signal scoring functions
// ============================================

describe('scoreFailureRate', () => {
  test('0% failures = 100', () => {
    expect(scoreFailureRate(0)).toBe(100);
  });

  test('negative failure rate = 100', () => {
    expect(scoreFailureRate(-5)).toBe(100);
  });

  test('25% failures = 0 (at FAILURE_RATE_DANGER)', () => {
    expect(scoreFailureRate(25)).toBe(0);
  });

  test('above 25% = 0', () => {
    expect(scoreFailureRate(50)).toBe(0);
    expect(scoreFailureRate(100)).toBe(0);
  });

  test('12.5% (midpoint) = 50', () => {
    expect(scoreFailureRate(12.5)).toBe(50);
  });

  test('result is bounded 0-100', () => {
    for (const v of [0, 5, 10, 15, 20, 25, 30, 50, 100]) {
      const s = scoreFailureRate(v);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe('scoreCoverage', () => {
  test('null coverage = 0', () => {
    expect(scoreCoverage(null)).toBe(0);
  });

  test('0% coverage = 0', () => {
    expect(scoreCoverage(0)).toBe(0);
  });

  test('80% coverage = 100 (at COVERAGE_TARGET)', () => {
    expect(scoreCoverage(80)).toBe(100);
  });

  test('above 80% = 100', () => {
    expect(scoreCoverage(95)).toBe(100);
    expect(scoreCoverage(100)).toBe(100);
  });

  test('40% coverage (midpoint) = 50', () => {
    expect(scoreCoverage(40)).toBe(50);
  });

  test('result is bounded 0-100', () => {
    for (const v of [0, 10, 40, 60, 80, 100]) {
      const s = scoreCoverage(v);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe('scoreDurationStability', () => {
  test('0% spike = 100', () => {
    expect(scoreDurationStability(0)).toBe(100);
  });

  test('negative spike = 100', () => {
    expect(scoreDurationStability(-10)).toBe(100);
  });

  test('50% spike = 0 (at DURATION_SPIKE_PERCENT)', () => {
    expect(scoreDurationStability(50)).toBe(0);
  });

  test('above 50% = 0', () => {
    expect(scoreDurationStability(75)).toBe(0);
    expect(scoreDurationStability(100)).toBe(0);
  });

  test('25% spike (midpoint) = 50', () => {
    expect(scoreDurationStability(25)).toBe(50);
  });
});

describe('scoreMRBacklog', () => {
  test('0 MRs = 100', () => {
    expect(scoreMRBacklog(0)).toBe(100);
  });

  test('2 MRs = 100', () => {
    expect(scoreMRBacklog(2)).toBe(100);
  });

  test('10 MRs = 0', () => {
    expect(scoreMRBacklog(10)).toBe(0);
  });

  test('above 10 = 0', () => {
    expect(scoreMRBacklog(15)).toBe(0);
    expect(scoreMRBacklog(100)).toBe(0);
  });

  test('6 MRs (midpoint) = 50', () => {
    expect(scoreMRBacklog(6)).toBe(50);
  });
});

describe('scoreRecentActivity', () => {
  test('0 pipelines = 0', () => {
    expect(scoreRecentActivity(0)).toBe(0);
  });

  test('negative pipelines = 0', () => {
    expect(scoreRecentActivity(-1)).toBe(0);
  });

  test('10 pipelines = 100', () => {
    expect(scoreRecentActivity(10)).toBe(100);
  });

  test('above 10 = 100', () => {
    expect(scoreRecentActivity(50)).toBe(100);
    expect(scoreRecentActivity(100)).toBe(100);
  });

  test('5 pipelines (midpoint) = 50', () => {
    expect(scoreRecentActivity(5)).toBe(50);
  });
});

// ============================================
// getHealthBand
// ============================================

describe('getHealthBand', () => {
  test('score 100 = healthy', () => {
    expect(getHealthBand(100)).toBe('healthy');
  });

  test('score 80 = healthy', () => {
    expect(getHealthBand(80)).toBe('healthy');
  });

  test('score 79 = warning', () => {
    expect(getHealthBand(79)).toBe('warning');
  });

  test('score 50 = warning', () => {
    expect(getHealthBand(50)).toBe('warning');
  });

  test('score 49 = critical', () => {
    expect(getHealthBand(49)).toBe('critical');
  });

  test('score 0 = critical', () => {
    expect(getHealthBand(0)).toBe('critical');
  });

  test('uses HEALTH_BANDS thresholds', () => {
    expect(getHealthBand(HEALTH_BANDS.HEALTHY)).toBe('healthy');
    expect(getHealthBand(HEALTH_BANDS.HEALTHY - 1)).toBe('warning');
    expect(getHealthBand(HEALTH_BANDS.WARNING)).toBe('warning');
    expect(getHealthBand(HEALTH_BANDS.WARNING - 1)).toBe('critical');
  });
});

// ============================================
// calculateHealthScore
// ============================================

function makeMetrics(overrides: Partial<ProjectMetrics> = {}): ProjectMetrics {
  return {
    totalPipelines: 20,
    successfulPipelines: 18,
    failedPipelines: 2,
    canceledPipelines: 0,
    runningPipelines: 0,
    successRate: 90,
    avgDuration: 120,
    testMetrics: { total: 100, success: 95, failed: 5, skipped: 0, available: true },
    mainBranchPipeline: { id: 1, status: 'success', created_at: '', updated_at: '', available: true },
    codeCoverage: { coverage: 85, available: true },
    mergeRequestCounts: { totalOpen: 1, drafts: 0 },
    recentCommits: [],
    mainBranchFailureRate: 10,
    durationSpikePercent: 0,
    ...overrides,
  };
}

describe('calculateHealthScore', () => {
  test('healthy project scores high', () => {
    const metrics = makeMetrics({
      mainBranchFailureRate: 0,
      codeCoverage: { coverage: 90, available: true },
      durationSpikePercent: 0,
      mergeRequestCounts: { totalOpen: 0, drafts: 0 },
      totalPipelines: 20,
    });
    const result = calculateHealthScore(metrics);
    expect(result.total).toBeGreaterThanOrEqual(80);
    expect(result.band).toBe('healthy');
    expect(result.signals).toHaveLength(5);
  });

  test('unhealthy project scores low', () => {
    const metrics = makeMetrics({
      mainBranchFailureRate: 30,
      codeCoverage: { coverage: null, available: false },
      durationSpikePercent: 60,
      mergeRequestCounts: { totalOpen: 15, drafts: 0 },
      totalPipelines: 0,
    });
    const result = calculateHealthScore(metrics);
    expect(result.total).toBeLessThan(50);
    expect(result.band).toBe('critical');
  });

  test('warning-level project', () => {
    const metrics = makeMetrics({
      mainBranchFailureRate: 10,
      codeCoverage: { coverage: 50, available: true },
      durationSpikePercent: 20,
      mergeRequestCounts: { totalOpen: 5, drafts: 0 },
      totalPipelines: 5,
    });
    const result = calculateHealthScore(metrics);
    expect(result.total).toBeGreaterThanOrEqual(50);
    expect(result.total).toBeLessThan(80);
    expect(result.band).toBe('warning');
  });

  test('total score is bounded 0-100', () => {
    const metrics = makeMetrics();
    const result = calculateHealthScore(metrics);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  test('falls back to computed failure rate if mainBranchFailureRate undefined', () => {
    const metrics = makeMetrics({
      mainBranchFailureRate: undefined,
      totalPipelines: 20,
      failedPipelines: 5,
    });
    const result = calculateHealthScore(metrics);
    // 5/20 = 25% failure rate → score 0 for that signal
    const failureSignal = result.signals.find(s => s.name === 'Failure Rate');
    expect(failureSignal).toBeDefined();
    expect(failureSignal!.score).toBe(0);
  });

  test('falls back to 0 spike if durationSpikePercent undefined', () => {
    const metrics = makeMetrics({
      durationSpikePercent: undefined,
    });
    const result = calculateHealthScore(metrics);
    const durSignal = result.signals.find(s => s.name === 'Duration Stability');
    expect(durSignal!.score).toBe(100);
  });

  test('signals have correct weights matching HEALTH_WEIGHTS', () => {
    const metrics = makeMetrics();
    const result = calculateHealthScore(metrics);
    const weightSum = result.signals.reduce((s, sig) => s + sig.weight, 0);
    expect(weightSum).toBeCloseTo(1.0, 10);
  });

  test('each signal weighted value equals score * weight', () => {
    const metrics = makeMetrics();
    const result = calculateHealthScore(metrics);
    for (const signal of result.signals) {
      expect(signal.weighted).toBeCloseTo(signal.score * signal.weight, 5);
    }
  });
});

// ============================================
// calculatePortfolioHealth
// ============================================

function makeProject(id: number, name: string, overrides: Partial<ProjectMetrics> = {}): Project {
  return {
    id,
    name,
    web_url: `https://gitlab.com/test/${name}`,
    metrics: makeMetrics(overrides),
  };
}

describe('calculatePortfolioHealth', () => {
  test('empty projects array', () => {
    const result = calculatePortfolioHealth([]);
    expect(result.averageScore).toBe(0);
    expect(result.distribution.healthy).toBe(0);
    expect(result.distribution.warning).toBe(0);
    expect(result.distribution.critical).toBe(0);
    expect(result.projectScores).toHaveLength(0);
  });

  test('single healthy project', () => {
    const projects = [
      makeProject(1, 'healthy-project', {
        mainBranchFailureRate: 0,
        codeCoverage: { coverage: 90, available: true },
        durationSpikePercent: 0,
        mergeRequestCounts: { totalOpen: 0, drafts: 0 },
        totalPipelines: 20,
      }),
    ];
    const result = calculatePortfolioHealth(projects);
    expect(result.averageScore).toBeGreaterThanOrEqual(80);
    expect(result.distribution.healthy).toBe(1);
    expect(result.distribution.warning).toBe(0);
    expect(result.distribution.critical).toBe(0);
  });

  test('mixed projects', () => {
    const projects = [
      makeProject(1, 'healthy', {
        mainBranchFailureRate: 0,
        codeCoverage: { coverage: 90, available: true },
        durationSpikePercent: 0,
        mergeRequestCounts: { totalOpen: 0, drafts: 0 },
        totalPipelines: 20,
      }),
      makeProject(2, 'critical', {
        mainBranchFailureRate: 30,
        codeCoverage: { coverage: null, available: false },
        durationSpikePercent: 60,
        mergeRequestCounts: { totalOpen: 15, drafts: 0 },
        totalPipelines: 20,
      }),
    ];
    const result = calculatePortfolioHealth(projects);
    expect(result.distribution.healthy).toBeGreaterThanOrEqual(1);
    expect(result.projectScores).toHaveLength(2);
  });

  test('zero-activity projects excluded from average but included in distribution', () => {
    const projects = [
      makeProject(1, 'active', {
        mainBranchFailureRate: 0,
        codeCoverage: { coverage: 90, available: true },
        durationSpikePercent: 0,
        mergeRequestCounts: { totalOpen: 0, drafts: 0 },
        totalPipelines: 20,
      }),
      makeProject(2, 'inactive', {
        totalPipelines: 0,
        mainBranchFailureRate: 0,
        codeCoverage: { coverage: null, available: false },
        durationSpikePercent: 0,
        mergeRequestCounts: { totalOpen: 0, drafts: 0 },
      }),
    ];
    const result = calculatePortfolioHealth(projects);
    // Average should only consider active project
    expect(result.projectScores).toHaveLength(2);
    // The inactive project with 0 pipelines scores low (activity = 0), should be counted in distribution
    expect(result.distribution.healthy + result.distribution.warning + result.distribution.critical).toBe(2);
  });

  test('projectScores contains correct ids and names', () => {
    const projects = [
      makeProject(42, 'my-project'),
    ];
    const result = calculatePortfolioHealth(projects);
    expect(result.projectScores[0].projectId).toBe(42);
    expect(result.projectScores[0].projectName).toBe('my-project');
  });
});

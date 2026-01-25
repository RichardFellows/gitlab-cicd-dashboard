import { describe, it, expect } from 'vitest';
import {
  METRICS_THRESHOLDS,
  shouldShowFailureRateAlert,
  shouldShowCoverageAlert,
  shouldShowDurationSpikeAlert
} from './constants';

describe('METRICS_THRESHOLDS', () => {
  it('has correct default values', () => {
    expect(METRICS_THRESHOLDS.COVERAGE_TARGET).toBe(80);
    expect(METRICS_THRESHOLDS.FAILURE_RATE_WARNING).toBe(15);
    expect(METRICS_THRESHOLDS.FAILURE_RATE_DANGER).toBe(25);
    expect(METRICS_THRESHOLDS.DURATION_SPIKE_PERCENT).toBe(50);
  });
});

describe('shouldShowFailureRateAlert', () => {
  it('returns false for failure rate below warning threshold', () => {
    expect(shouldShowFailureRateAlert(0)).toBe(false);
    expect(shouldShowFailureRateAlert(10)).toBe(false);
    expect(shouldShowFailureRateAlert(14.9)).toBe(false);
  });

  it('returns true for failure rate at or above warning threshold', () => {
    expect(shouldShowFailureRateAlert(15)).toBe(true);
    expect(shouldShowFailureRateAlert(20)).toBe(true);
    expect(shouldShowFailureRateAlert(25)).toBe(true);
    expect(shouldShowFailureRateAlert(50)).toBe(true);
  });
});

describe('shouldShowCoverageAlert', () => {
  it('returns false when coverage is not available', () => {
    expect(shouldShowCoverageAlert(null, false)).toBe(false);
    expect(shouldShowCoverageAlert(50, false)).toBe(false);
  });

  it('returns false when coverage is null', () => {
    expect(shouldShowCoverageAlert(null, true)).toBe(false);
  });

  it('returns false when coverage is at or above target', () => {
    expect(shouldShowCoverageAlert(80, true)).toBe(false);
    expect(shouldShowCoverageAlert(90, true)).toBe(false);
    expect(shouldShowCoverageAlert(100, true)).toBe(false);
  });

  it('returns true when coverage is below target', () => {
    expect(shouldShowCoverageAlert(79.9, true)).toBe(true);
    expect(shouldShowCoverageAlert(50, true)).toBe(true);
    expect(shouldShowCoverageAlert(0, true)).toBe(true);
  });
});

describe('shouldShowDurationSpikeAlert', () => {
  it('returns false for zero baseline', () => {
    expect(shouldShowDurationSpikeAlert(100, 0)).toBe(false);
  });

  it('returns false for zero current duration', () => {
    expect(shouldShowDurationSpikeAlert(0, 100)).toBe(false);
  });

  it('returns false for duration below spike threshold', () => {
    // 49% increase (just below 50% threshold)
    expect(shouldShowDurationSpikeAlert(149, 100)).toBe(false);
    // No increase
    expect(shouldShowDurationSpikeAlert(100, 100)).toBe(false);
    // Decrease
    expect(shouldShowDurationSpikeAlert(80, 100)).toBe(false);
  });

  it('returns true for duration at or above spike threshold', () => {
    // Exactly 50% increase
    expect(shouldShowDurationSpikeAlert(150, 100)).toBe(true);
    // 100% increase
    expect(shouldShowDurationSpikeAlert(200, 100)).toBe(true);
    // Large increase
    expect(shouldShowDurationSpikeAlert(500, 100)).toBe(true);
  });
});

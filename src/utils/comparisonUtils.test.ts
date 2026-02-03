import { describe, test, expect } from 'vitest';
import { PipelineTrend } from '../types';
import { getUnionDateLabels, alignTrendData, formatDateLabels } from './comparisonUtils';

function makeTrend(date: string, successRate: number, avgDuration: number): PipelineTrend {
  return {
    date,
    total: 10,
    successful: Math.round(successRate / 10),
    failed: 10 - Math.round(successRate / 10),
    successRate,
    avgDuration,
  };
}

describe('getUnionDateLabels', () => {
  test('returns sorted union of dates from multiple projects', () => {
    const trendData = new Map<number, PipelineTrend[]>();
    trendData.set(1, [makeTrend('2026-01-03', 90, 120), makeTrend('2026-01-01', 85, 100)]);
    trendData.set(2, [makeTrend('2026-01-02', 80, 200), makeTrend('2026-01-03', 75, 150)]);

    const labels = getUnionDateLabels(trendData);
    expect(labels).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });

  test('returns empty array for empty trendData', () => {
    const trendData = new Map<number, PipelineTrend[]>();
    expect(getUnionDateLabels(trendData)).toEqual([]);
  });

  test('deduplicates shared dates', () => {
    const trendData = new Map<number, PipelineTrend[]>();
    trendData.set(1, [makeTrend('2026-01-01', 90, 100)]);
    trendData.set(2, [makeTrend('2026-01-01', 80, 200)]);

    const labels = getUnionDateLabels(trendData);
    expect(labels).toEqual(['2026-01-01']);
  });
});

describe('alignTrendData', () => {
  test('fills missing dates with null', () => {
    const trends = [makeTrend('2026-01-01', 90, 100), makeTrend('2026-01-03', 85, 120)];
    const labels = ['2026-01-01', '2026-01-02', '2026-01-03'];

    const aligned = alignTrendData(trends, labels, t => t.successRate);
    expect(aligned).toEqual([90, null, 85]);
  });

  test('returns all nulls for empty trends', () => {
    const labels = ['2026-01-01', '2026-01-02'];
    const aligned = alignTrendData([], labels, t => t.successRate);
    expect(aligned).toEqual([null, null]);
  });

  test('returns empty array for empty labels', () => {
    const trends = [makeTrend('2026-01-01', 90, 100)];
    const aligned = alignTrendData(trends, [], t => t.successRate);
    expect(aligned).toEqual([]);
  });

  test('works with duration accessor', () => {
    const trends = [makeTrend('2026-01-01', 90, 100), makeTrend('2026-01-02', 85, 200)];
    const labels = ['2026-01-01', '2026-01-02'];

    const aligned = alignTrendData(trends, labels, t => t.avgDuration);
    expect(aligned).toEqual([100, 200]);
  });
});

describe('formatDateLabels', () => {
  test('formats YYYY-MM-DD to "Mon DD"', () => {
    const labels = ['2026-01-15', '2026-12-03'];
    const formatted = formatDateLabels(labels);
    expect(formatted).toEqual(['Jan 15', 'Dec 3']);
  });

  test('passes through non-date strings unchanged', () => {
    const labels = ['not-a-date'];
    const formatted = formatDateLabels(labels);
    expect(formatted).toEqual(['not-a-date']);
  });

  test('handles empty array', () => {
    expect(formatDateLabels([])).toEqual([]);
  });
});

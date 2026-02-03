import { describe, it, expect, vi, afterEach } from 'vitest';
import { groupByDate, getDateLabel, filterTimeline, createDefaultFilters } from './timelineUtils';
import { DeploymentHistoryEntry, EnvironmentName, DeploymentStatus } from '../types';

// Helper to create test entries
function makeEntry(overrides: Partial<DeploymentHistoryEntry> = {}): DeploymentHistoryEntry {
  return {
    jobId: Math.floor(Math.random() * 10000),
    jobName: 'deploy-to-dev',
    environment: 'dev' as EnvironmentName,
    version: '1.0.0',
    status: 'success' as DeploymentStatus,
    timestamp: '2026-01-28T14:30:00Z',
    pipelineId: 100,
    pipelineRef: 'main',
    jobUrl: 'https://gitlab.com/job/1',
    projectId: 1,
    projectName: 'test-project',
    isRollback: false,
    rolledBackFrom: undefined,
    ...overrides,
  };
}

describe('groupByDate', () => {
  it('groups entries by date', () => {
    const entries = [
      makeEntry({ timestamp: '2026-01-28T14:30:00Z' }),
      makeEntry({ timestamp: '2026-01-28T10:00:00Z' }),
      makeEntry({ timestamp: '2026-01-27T16:00:00Z' }),
    ];

    const groups = groupByDate(entries);

    expect(groups.size).toBe(2);
    expect(groups.get('2026-01-28')!).toHaveLength(2);
    expect(groups.get('2026-01-27')!).toHaveLength(1);
  });

  it('returns groups sorted newest first', () => {
    const entries = [
      makeEntry({ timestamp: '2026-01-26T10:00:00Z' }),
      makeEntry({ timestamp: '2026-01-28T10:00:00Z' }),
      makeEntry({ timestamp: '2026-01-27T10:00:00Z' }),
    ];

    const groups = groupByDate(entries);
    const dates = Array.from(groups.keys());

    expect(dates).toEqual(['2026-01-28', '2026-01-27', '2026-01-26']);
  });

  it('handles empty array', () => {
    const groups = groupByDate([]);
    expect(groups.size).toBe(0);
  });
});

describe('getDateLabel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" for today\'s date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-28T12:00:00'));

    expect(getDateLabel('2026-01-28')).toBe('Today');
  });

  it('returns "Yesterday" for yesterday\'s date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-28T12:00:00'));

    expect(getDateLabel('2026-01-27')).toBe('Yesterday');
  });

  it('returns formatted date for older dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-28T12:00:00'));

    expect(getDateLabel('2026-01-20')).toBe('20 Jan 2026');
    expect(getDateLabel('2025-12-25')).toBe('25 Dec 2025');
  });

  it('returns "Unknown Date" for unknown dateStr', () => {
    expect(getDateLabel('unknown')).toBe('Unknown Date');
  });
});

describe('filterTimeline', () => {
  const entries = [
    makeEntry({ projectId: 1, projectName: 'alpha', environment: 'dev', status: 'success', isRollback: false, timestamp: '2026-01-28T10:00:00Z' }),
    makeEntry({ projectId: 1, projectName: 'alpha', environment: 'uat', status: 'failed', isRollback: false, timestamp: '2026-01-27T10:00:00Z' }),
    makeEntry({ projectId: 2, projectName: 'beta', environment: 'prod', status: 'success', isRollback: true, rolledBackFrom: '2.0.0', timestamp: '2026-01-26T10:00:00Z' }),
    makeEntry({ projectId: 2, projectName: 'beta', environment: 'dev', status: 'success', isRollback: false, timestamp: '2026-01-25T10:00:00Z' }),
  ];

  it('returns all entries with default filters', () => {
    const filtered = filterTimeline(entries, createDefaultFilters());
    expect(filtered).toHaveLength(4);
  });

  it('filters by project', () => {
    const filtered = filterTimeline(entries, {
      ...createDefaultFilters(),
      projectIds: [1],
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.every(e => e.projectId === 1)).toBe(true);
  });

  it('filters by environment', () => {
    const filtered = filterTimeline(entries, {
      ...createDefaultFilters(),
      environments: ['dev'],
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.every(e => e.environment === 'dev')).toBe(true);
  });

  it('filters by status including rollback', () => {
    const filtered = filterTimeline(entries, {
      ...createDefaultFilters(),
      statuses: ['rollback'],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].isRollback).toBe(true);
  });

  it('filters by failed status', () => {
    const filtered = filterTimeline(entries, {
      ...createDefaultFilters(),
      statuses: ['failed'],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].status).toBe('failed');
  });

  it('filters by date range (from)', () => {
    const filtered = filterTimeline(entries, {
      ...createDefaultFilters(),
      dateFrom: '2026-01-27',
    });
    expect(filtered).toHaveLength(2);
  });

  it('filters by date range (to)', () => {
    const filtered = filterTimeline(entries, {
      ...createDefaultFilters(),
      dateTo: '2026-01-26',
    });
    expect(filtered).toHaveLength(2);
  });

  it('filters by date range (from and to)', () => {
    const filtered = filterTimeline(entries, {
      ...createDefaultFilters(),
      dateFrom: '2026-01-26',
      dateTo: '2026-01-27',
    });
    expect(filtered).toHaveLength(2);
  });

  it('combines multiple filters', () => {
    const filtered = filterTimeline(entries, {
      projectIds: [1],
      environments: ['dev'],
      statuses: ['success'],
      dateFrom: null,
      dateTo: null,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].projectName).toBe('alpha');
    expect(filtered[0].environment).toBe('dev');
  });
});

describe('createDefaultFilters', () => {
  it('returns empty/null filters', () => {
    const filters = createDefaultFilters();
    expect(filters.projectIds).toEqual([]);
    expect(filters.environments).toEqual([]);
    expect(filters.statuses).toEqual([]);
    expect(filters.dateFrom).toBeNull();
    expect(filters.dateTo).toBeNull();
  });
});

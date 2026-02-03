import { describe, it, expect } from 'vitest';
import { groupMRsByPipelineStatus, filterMRs, sortMRs, getRelativeTime, getColumnConfig } from './mrBoardUtils';
import { MRWithProject, MRBoardFilters } from '../types';

// Helper to create a test MR
function makeMR(overrides: Partial<MRWithProject> = {}): MRWithProject {
  return {
    id: 1,
    iid: 1,
    title: 'Test MR',
    state: 'opened',
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-01-25T10:00:00Z',
    source_branch: 'feature/test',
    target_branch: 'main',
    web_url: 'https://gitlab.com/mr/1',
    projectId: 100,
    projectName: 'project-alpha',
    author: { id: 1, name: 'Alice', username: 'alice' },
    ...overrides,
  };
}

describe('groupMRsByPipelineStatus', () => {
  it('groups MRs by pipeline status', () => {
    const mrs: MRWithProject[] = [
      makeMR({ id: 1, head_pipeline: { id: 1, status: 'success', created_at: '', updated_at: '' } }),
      makeMR({ id: 2, head_pipeline: { id: 2, status: 'failed', created_at: '', updated_at: '' } }),
      makeMR({ id: 3, head_pipeline: { id: 3, status: 'running', created_at: '', updated_at: '' } }),
      makeMR({ id: 4, head_pipeline: { id: 4, status: 'pending', created_at: '', updated_at: '' } }),
      makeMR({ id: 5, head_pipeline: { id: 5, status: 'created', created_at: '', updated_at: '' } }),
      makeMR({ id: 6 }), // no pipeline
    ];

    const groups = groupMRsByPipelineStatus(mrs);

    expect(groups.passing).toHaveLength(1);
    expect(groups.failing).toHaveLength(1);
    expect(groups.running).toHaveLength(3); // running + pending + created
    expect(groups['no-pipeline']).toHaveLength(1);
    expect(groups.draft).toHaveLength(0);
  });

  it('puts draft MRs in draft group regardless of pipeline', () => {
    const mrs: MRWithProject[] = [
      makeMR({ id: 1, draft: true, head_pipeline: { id: 1, status: 'success', created_at: '', updated_at: '' } }),
      makeMR({ id: 2, title: 'Draft: Work in progress' }),
    ];

    const groups = groupMRsByPipelineStatus(mrs);

    expect(groups.draft).toHaveLength(2);
    expect(groups.passing).toHaveLength(0);
  });

  it('handles title-based draft detection (case insensitive)', () => {
    const mrs: MRWithProject[] = [
      makeMR({ id: 1, title: 'draft: lowercase test' }),
      makeMR({ id: 2, title: 'DRAFT: uppercase test' }),
    ];

    const groups = groupMRsByPipelineStatus(mrs);
    expect(groups.draft).toHaveLength(2);
  });

  it('puts unknown pipeline status in no-pipeline', () => {
    const mrs: MRWithProject[] = [
      makeMR({ id: 1, head_pipeline: { id: 1, status: 'canceled', created_at: '', updated_at: '' } }),
    ];

    const groups = groupMRsByPipelineStatus(mrs);
    expect(groups['no-pipeline']).toHaveLength(1);
  });

  it('handles empty MR list', () => {
    const groups = groupMRsByPipelineStatus([]);

    expect(groups.passing).toHaveLength(0);
    expect(groups.failing).toHaveLength(0);
    expect(groups.running).toHaveLength(0);
    expect(groups.draft).toHaveLength(0);
    expect(groups['no-pipeline']).toHaveLength(0);
  });
});

describe('filterMRs', () => {
  const allMRs: MRWithProject[] = [
    makeMR({ id: 1, projectId: 100, projectName: 'alpha', author: { id: 1, name: 'Alice', username: 'alice' } }),
    makeMR({ id: 2, projectId: 200, projectName: 'beta', author: { id: 2, name: 'Bob', username: 'bob' } }),
    makeMR({ id: 3, projectId: 100, projectName: 'alpha', author: { id: 3, name: 'Charlie', username: 'charlie' } }),
  ];

  const defaultFilters: MRBoardFilters = {
    projectIds: [],
    authorSearch: '',
    myMRsOnly: false,
    myUsername: '',
  };

  it('returns all MRs with no filters', () => {
    const result = filterMRs(allMRs, defaultFilters);
    expect(result).toHaveLength(3);
  });

  it('filters by project IDs', () => {
    const result = filterMRs(allMRs, { ...defaultFilters, projectIds: [100] });
    expect(result).toHaveLength(2);
    expect(result.every(mr => mr.projectId === 100)).toBe(true);
  });

  it('filters by author search (username)', () => {
    const result = filterMRs(allMRs, { ...defaultFilters, authorSearch: 'bob' });
    expect(result).toHaveLength(1);
    expect(result[0].author?.username).toBe('bob');
  });

  it('filters by author search (name)', () => {
    const result = filterMRs(allMRs, { ...defaultFilters, authorSearch: 'ali' });
    expect(result).toHaveLength(1);
    expect(result[0].author?.name).toBe('Alice');
  });

  it('filters by My MRs toggle', () => {
    const result = filterMRs(allMRs, { ...defaultFilters, myMRsOnly: true, myUsername: 'charlie' });
    expect(result).toHaveLength(1);
    expect(result[0].author?.username).toBe('charlie');
  });

  it('My MRs toggle does nothing without username', () => {
    const result = filterMRs(allMRs, { ...defaultFilters, myMRsOnly: true, myUsername: '' });
    expect(result).toHaveLength(3); // all returned since username is empty
  });

  it('handles MR with no author', () => {
    const mrs = [makeMR({ id: 1, author: undefined })];
    const result = filterMRs(mrs, { ...defaultFilters, authorSearch: 'alice' });
    expect(result).toHaveLength(0);
  });

  it('combines filters (project + author)', () => {
    const result = filterMRs(allMRs, { ...defaultFilters, projectIds: [100], authorSearch: 'charlie' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });
});

describe('sortMRs', () => {
  const mrs: MRWithProject[] = [
    makeMR({ id: 1, created_at: '2026-01-20T10:00:00Z', updated_at: '2026-01-25T10:00:00Z', projectName: 'charlie' }),
    makeMR({ id: 2, created_at: '2026-01-22T10:00:00Z', updated_at: '2026-01-23T10:00:00Z', projectName: 'alpha' }),
    makeMR({ id: 3, created_at: '2026-01-18T10:00:00Z', updated_at: '2026-01-28T10:00:00Z', projectName: 'beta' }),
  ];

  it('sorts by newest first', () => {
    const result = sortMRs(mrs, 'newest');
    expect(result.map(mr => mr.id)).toEqual([2, 1, 3]);
  });

  it('sorts by oldest first', () => {
    const result = sortMRs(mrs, 'oldest');
    expect(result.map(mr => mr.id)).toEqual([3, 1, 2]);
  });

  it('sorts by last activity', () => {
    const result = sortMRs(mrs, 'last-activity');
    expect(result.map(mr => mr.id)).toEqual([3, 1, 2]);
  });

  it('sorts by project name', () => {
    const result = sortMRs(mrs, 'project-name');
    expect(result.map(mr => mr.projectName)).toEqual(['alpha', 'beta', 'charlie']);
  });

  it('does not mutate original array', () => {
    const original = [...mrs];
    sortMRs(mrs, 'newest');
    expect(mrs.map(m => m.id)).toEqual(original.map(m => m.id));
  });

  it('handles empty array', () => {
    expect(sortMRs([], 'newest')).toEqual([]);
  });
});

describe('getRelativeTime', () => {
  it('returns relative time strings', () => {
    // Just test the function runs without crashing
    const result = getRelativeTime(new Date().toISOString());
    expect(typeof result).toBe('string');
  });

  it('returns "just now" for very recent dates', () => {
    const result = getRelativeTime(new Date().toISOString());
    expect(result).toBe('just now');
  });
});

describe('getColumnConfig', () => {
  it('returns correct config for each group', () => {
    expect(getColumnConfig('passing').title).toBe('Pipeline Passing');
    expect(getColumnConfig('failing').title).toBe('Pipeline Failing');
    expect(getColumnConfig('running').title).toBe('Pipeline Running');
    expect(getColumnConfig('draft').title).toBe('Draft');
    expect(getColumnConfig('no-pipeline').title).toBe('No Pipeline');
  });

  it('returns colorClass for each group', () => {
    expect(getColumnConfig('passing').colorClass).toBe('mr-col-passing');
    expect(getColumnConfig('failing').colorClass).toBe('mr-col-failing');
  });

  it('returns icon for each group', () => {
    expect(getColumnConfig('passing').icon).toBe('✅');
    expect(getColumnConfig('failing').icon).toBe('❌');
  });
});

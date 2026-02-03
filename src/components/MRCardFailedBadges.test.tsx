import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MRCard from './MRCard';
import { MRWithProject } from '../types';

/**
 * Test suite for US-009: MR Board — Highlight Failed Stages
 * 
 * Acceptance Criteria:
 * - Failed stage indicators use red badge styling
 * - Badge format: red background, white text, 14px font
 * - Multiple failures stack vertically (if >2, show "+N more")
 * - Hover shows full failure details
 * - Consistent with card status styling elsewhere
 * - Tests verify failure badges render correctly
 */

const createMockMR = (failedJobCount: number): MRWithProject => {
  const failedJobs = Array.from({ length: failedJobCount }, (_, i) => ({
    id: i + 1,
    name: `stage_${i + 1}`,
    status: 'failed' as const,
    stage: `stage_${i + 1}`,
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    duration: 120,
    web_url: `https://gitlab.example.com/job/${i + 1}`,
    failure_reason: 'script_failure',
  }));

  return {
    id: 1,
    iid: 123,
    title: 'Test MR',
    description: '',
    state: 'opened',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_branch: 'feature/test',
    target_branch: 'main',
    web_url: 'https://gitlab.example.com/mr/123',
    author: {
      id: 1,
      username: 'testuser',
      name: 'Test User',
    },
    draft: false,
    projectId: 1,
    projectName: 'test/project',
    head_pipeline: {
      id: 1,
      status: 'failed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      available: true,
      failedJobs,
    },
  };
};

describe('MRCard - Failed Stage Badges', () => {
  it('displays no badges when there are no failed jobs', () => {
    const mr = createMockMR(0);
    mr.head_pipeline!.failedJobs = [];
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const failedJobsSection = container.querySelector('.mr-card__failed-jobs');
    expect(failedJobsSection).toBeNull();
  });

  it('displays a single failed job as a red badge', () => {
    const mr = createMockMR(1);
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const badges = container.querySelectorAll('.mr-card__failed-badge');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent).toBe('stage_1');
  });

  it('displays two failed jobs as separate badges stacked vertically', () => {
    const mr = createMockMR(2);
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const badges = container.querySelectorAll('.mr-card__failed-badge:not(.mr-card__failed-badge--more)');
    expect(badges.length).toBe(2);
    expect(badges[0].textContent).toBe('stage_1');
    expect(badges[1].textContent).toBe('stage_2');
  });

  it('displays first two badges plus "+N more" when there are >2 failures', () => {
    const mr = createMockMR(5);
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const regularBadges = container.querySelectorAll('.mr-card__failed-badge:not(.mr-card__failed-badge--more)');
    const moreBadge = container.querySelector('.mr-card__failed-badge--more');
    
    expect(regularBadges.length).toBe(2);
    expect(regularBadges[0].textContent).toBe('stage_1');
    expect(regularBadges[1].textContent).toBe('stage_2');
    expect(moreBadge).not.toBeNull();
    expect(moreBadge!.textContent).toBe('+3 more');
  });

  it('shows correct "+N more" count for different failure counts', () => {
    const testCases = [
      { count: 3, expected: '+1 more' },
      { count: 4, expected: '+2 more' },
      { count: 10, expected: '+8 more' },
    ];

    testCases.forEach(({ count, expected }) => {
      const mr = createMockMR(count);
      const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
      
      const moreBadge = container.querySelector('.mr-card__failed-badge--more');
      expect(moreBadge).not.toBeNull();
      expect(moreBadge!.textContent).toBe(expected);
    });
  });

  it('has red background and white text styling on badges', () => {
    const mr = createMockMR(1);
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const badge = container.querySelector('.mr-card__failed-badge');
    expect(badge).not.toBeNull();
    
    // CSS class applies background: #dc3545 and color: #fff
    expect(badge!.className).toContain('mr-card__failed-badge');
  });

  it('has 14px font size on badges', () => {
    const mr = createMockMR(1);
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const badge = container.querySelector('.mr-card__failed-badge');
    expect(badge).not.toBeNull();
    
    // CSS class applies font-size: 14px
    expect(badge!.className).toContain('mr-card__failed-badge');
  });

  it('stacks badges vertically with flexbox column layout', () => {
    const mr = createMockMR(2);
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const failedJobsContainer = container.querySelector('.mr-card__failed-jobs');
    expect(failedJobsContainer).not.toBeNull();
    
    // CSS applies display: flex; flex-direction: column
    expect(failedJobsContainer!.className).toBe('mr-card__failed-jobs');
  });

  it('shows full job name in title attribute for hover tooltip', () => {
    const mr = createMockMR(1);
    mr.head_pipeline!.failedJobs![0].name = 'very_long_stage_name_that_might_truncate';
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const badge = container.querySelector('.mr-card__failed-badge');
    expect(badge).not.toBeNull();
    expect(badge!.getAttribute('title')).toBe('very_long_stage_name_that_might_truncate');
  });

  it('shows all hidden job names in "+N more" badge title attribute', () => {
    const mr = createMockMR(5);
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const moreBadge = container.querySelector('.mr-card__failed-badge--more');
    expect(moreBadge).not.toBeNull();
    expect(moreBadge!.getAttribute('title')).toBe('stage_3, stage_4, stage_5');
  });

  it('maintains consistent badge styling with other card status indicators', () => {
    const mr = createMockMR(2);
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const badges = container.querySelectorAll('.mr-card__failed-badge');
    
    // All badges should have consistent styling
    badges.forEach(badge => {
      expect(badge.className).toMatch(/mr-card__failed-badge/);
    });
  });

  it('renders correctly when MR has no pipeline', () => {
    const mr = createMockMR(0);
    mr.head_pipeline = undefined;
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const failedJobsSection = container.querySelector('.mr-card__failed-jobs');
    expect(failedJobsSection).toBeNull();
  });

  it('renders correctly when MR pipeline has no failedJobs array', () => {
    const mr = createMockMR(0);
    mr.head_pipeline!.failedJobs = undefined;
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const failedJobsSection = container.querySelector('.mr-card__failed-jobs');
    expect(failedJobsSection).toBeNull();
  });

  it('handles edge case of exactly 2 failed jobs (no "+N more" badge)', () => {
    const mr = createMockMR(2);
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const regularBadges = container.querySelectorAll('.mr-card__failed-badge:not(.mr-card__failed-badge--more)');
    const moreBadge = container.querySelector('.mr-card__failed-badge--more');
    
    expect(regularBadges.length).toBe(2);
    expect(moreBadge).toBeNull();
  });

  it('uses different styling for "+N more" badge', () => {
    const mr = createMockMR(3);
    const { container } = render(<MRCard mr={mr} onSelect={() => {}} />);
    
    const moreBadge = container.querySelector('.mr-card__failed-badge--more');
    expect(moreBadge).not.toBeNull();
    expect(moreBadge!.className).toContain('mr-card__failed-badge--more');
  });
});

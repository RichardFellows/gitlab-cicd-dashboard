import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FailureSummaryPanel from './FailureSummaryPanel';
import { Project } from '../types';

// Helper to create a test project
function makeProject(id: number, name: string, pipelineStatus: string, failedJobCount: number): Project {
  const failedJobs = Array.from({ length: failedJobCount }, (_, i) => ({
    id: id * 100 + i,
    name: `job-${i + 1}`,
    stage: 'test',
    status: 'failed',
    web_url: `https://gitlab.com/job/${id * 100 + i}`,
    created_at: '2025-01-01T00:00:00Z',
    failure_reason: 'script_failure',
  }));

  return {
    id,
    name,
    web_url: `https://gitlab.com/project/${id}`,
    metrics: {
      totalPipelines: 10,
      successfulPipelines: 8,
      failedPipelines: 2,
      canceledPipelines: 0,
      runningPipelines: 0,
      successRate: 80,
      avgDuration: 120,
      testMetrics: { total: 0, success: 0, failed: 0, skipped: 0, available: false },
      mainBranchPipeline: {
        id: id * 10,
        status: pipelineStatus,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        available: true,
        failedJobs,
      },
      codeCoverage: { coverage: null, available: false },
      mergeRequestCounts: { totalOpen: 0, drafts: 0 },
      recentCommits: [],
    },
  };
}

describe('FailureSummaryPanel', () => {
  it('renders "No failures" when no projects have failures', () => {
    const projects = [
      makeProject(1, 'Project A', 'success', 0),
      makeProject(2, 'Project B', 'success', 0),
    ];

    render(<FailureSummaryPanel projects={projects} onProjectSelect={vi.fn()} />);
    expect(screen.getByText('No failures 🎉')).toBeInTheDocument();
  });

  it('renders failed projects', () => {
    const projects = [
      makeProject(1, 'Broken App', 'failed', 2),
      makeProject(2, 'Working App', 'success', 0),
    ];

    render(<FailureSummaryPanel projects={projects} onProjectSelect={vi.fn()} />);
    expect(screen.getByText('Broken App')).toBeInTheDocument();
    expect(screen.getByText('2 failed jobs')).toBeInTheDocument();
    expect(screen.queryByText('Working App')).not.toBeInTheDocument();
  });

  it('shows failed job names', () => {
    const projects = [makeProject(1, 'Test Project', 'failed', 2)];

    render(<FailureSummaryPanel projects={projects} onProjectSelect={vi.fn()} />);
    expect(screen.getByText('job-1, job-2')).toBeInTheDocument();
  });

  it('sorts by number of failed jobs (descending)', () => {
    const projects = [
      makeProject(1, 'Few Failures', 'failed', 1),
      makeProject(2, 'Many Failures', 'failed', 3),
      makeProject(3, 'Some Failures', 'failed', 2),
    ];

    render(<FailureSummaryPanel projects={projects} onProjectSelect={vi.fn()} />);

    const items = screen.getAllByText(/Failures/);
    // Check order: Many, Some, Few
    expect(items[0].textContent).toContain('Many');
    expect(items[1].textContent).toContain('Some');
    expect(items[2].textContent).toContain('Few');
  });

  it('fires onProjectSelect when clicked', () => {
    const onSelect = vi.fn();
    const projects = [makeProject(42, 'Clickable Project', 'failed', 1)];

    render(<FailureSummaryPanel projects={projects} onProjectSelect={onSelect} />);
    fireEvent.click(screen.getByText('Clickable Project'));

    expect(onSelect).toHaveBeenCalledWith(42);
  });

  it('handles singular "1 failed job"', () => {
    const projects = [makeProject(1, 'Single Fail', 'failed', 1)];

    render(<FailureSummaryPanel projects={projects} onProjectSelect={vi.fn()} />);
    expect(screen.getByText('1 failed job')).toBeInTheDocument();
  });

  it('applies dark mode class', () => {
    const projects = [makeProject(1, 'Dark Project', 'failed', 1)];

    const { container } = render(
      <FailureSummaryPanel projects={projects} onProjectSelect={vi.fn()} darkMode={true} />
    );

    expect(container.querySelector('.failure-summary-panel.dark')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardMetrics, Project } from '../types';

// Mock chart.js
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn(), defaults: {} },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  BarElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
  registerables: [],
}));

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Doughnut: ({ data }: any) => (
    <div data-testid="mock-doughnut">
      {data.datasets[0].data.map((val: number, i: number) => (
        <span key={i} data-testid={`chart-value-${i}`}>{val}</span>
      ))}
    </div>
  ),
  Line: () => (
    <div data-testid="mock-line-chart">Mock Line Chart</div>
  ),
}));

// Import after mocks
import SummarySection from './SummarySection';

// Helper to create a test project
function makeProject(
  id: number,
  name: string,
  pipelineStatus: 'success' | 'failed' | 'running' | 'canceled',
  failedJobCount: number = 0
): Project {
  const failedJobs = Array.from({ length: failedJobCount }, (_, i) => ({
    id: id * 100 + i,
    name: `job-${i + 1}`,
    stage: 'test',
    status: 'failed' as const,
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
      successfulPipelines: pipelineStatus === 'success' ? 10 : 8,
      failedPipelines: pipelineStatus === 'failed' ? 2 : 0,
      canceledPipelines: 0,
      runningPipelines: pipelineStatus === 'running' ? 1 : 0,
      successRate: pipelineStatus === 'success' ? 100 : 80,
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

// Helper to create dashboard metrics
function makeDashboardMetrics(projects: Project[]): DashboardMetrics {
  const totalPipelines = projects.reduce((sum, p) => sum + p.metrics.totalPipelines, 0);
  const successfulPipelines = projects.reduce((sum, p) => sum + p.metrics.successfulPipelines, 0);
  const failedPipelines = projects.reduce((sum, p) => sum + p.metrics.failedPipelines, 0);
  const avgSuccessRate = projects.length > 0
    ? projects.reduce((sum, p) => sum + p.metrics.successRate, 0) / projects.length
    : 0;
  const avgDuration = projects.length > 0
    ? projects.reduce((sum, p) => sum + p.metrics.avgDuration, 0) / projects.length
    : 0;

  return {
    totalProjects: projects.length,
    projects,
    aggregateMetrics: {
      totalPipelines,
      successfulPipelines,
      failedPipelines,
      canceledPipelines: 0,
      runningPipelines: 0,
      avgSuccessRate,
      avgDuration,
    },
  };
}

describe('SummarySection - Failures Accordion', () => {
  it('hides Failures accordion when failure count is 0', () => {
    const projects = [
      makeProject(1, 'Project A', 'success'),
      makeProject(2, 'Project B', 'success'),
      makeProject(3, 'Project C', 'running'),
    ];
    const metrics = makeDashboardMetrics(projects);

    render(
      <SummarySection
        metrics={metrics}
        activeFilter="all"
        onFilterChange={vi.fn()}
        onProjectSelect={vi.fn()}
      />
    );

    // The entire Failures section should not be rendered
    expect(screen.queryByText(/Failures \(/)).not.toBeInTheDocument();
    expect(screen.queryByText('No failures 🎉')).not.toBeInTheDocument();
  });

  it('shows Failures accordion when failure count > 0', () => {
    const projects = [
      makeProject(1, 'Broken Project', 'failed', 2),
      makeProject(2, 'Working Project', 'success'),
    ];
    const metrics = makeDashboardMetrics(projects);

    render(
      <SummarySection
        metrics={metrics}
        activeFilter="all"
        onFilterChange={vi.fn()}
        onProjectSelect={vi.fn()}
      />
    );

    // The Failures accordion header should be visible
    expect(screen.getByText('Failures (1)')).toBeInTheDocument();
  });

  it('allows expanding/collapsing Failures accordion', () => {
    const projects = [
      makeProject(1, 'Broken Project', 'failed', 3),
    ];
    const metrics = makeDashboardMetrics(projects);

    render(
      <SummarySection
        metrics={metrics}
        activeFilter="all"
        onFilterChange={vi.fn()}
        onProjectSelect={vi.fn()}
      />
    );

    // Initially expanded (default state)
    expect(screen.getByText('Broken Project')).toBeInTheDocument();
    expect(screen.getByText('3 failed jobs')).toBeInTheDocument();

    // Click to collapse
    const toggleButton = screen.getByText(/Failures \(1\)/);
    fireEvent.click(toggleButton);

    // Content should be hidden
    expect(screen.queryByText('Broken Project')).not.toBeInTheDocument();
    expect(screen.queryByText('3 failed jobs')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(toggleButton);

    // Content should be visible again
    expect(screen.getByText('Broken Project')).toBeInTheDocument();
    expect(screen.getByText('3 failed jobs')).toBeInTheDocument();
  });

  it('hides Failures accordion when onProjectSelect is not provided', () => {
    const projects = [
      makeProject(1, 'Broken Project', 'failed', 2),
    ];
    const metrics = makeDashboardMetrics(projects);

    render(
      <SummarySection
        metrics={metrics}
        activeFilter="all"
        onFilterChange={vi.fn()}
        // onProjectSelect not provided
      />
    );

    // The Failures section should not render without onProjectSelect
    expect(screen.queryByText(/Failures \(/)).not.toBeInTheDocument();
  });

  it('shows correct count in Failures accordion header', () => {
    const projects = [
      makeProject(1, 'Broken A', 'failed', 1),
      makeProject(2, 'Broken B', 'failed', 2),
      makeProject(3, 'Broken C', 'failed', 3),
      makeProject(4, 'Working', 'success'),
    ];
    const metrics = makeDashboardMetrics(projects);

    render(
      <SummarySection
        metrics={metrics}
        activeFilter="all"
        onFilterChange={vi.fn()}
        onProjectSelect={vi.fn()}
      />
    );

    // Should show count of 3 failed projects
    expect(screen.getByText('Failures (3)')).toBeInTheDocument();
  });

  it('still shows FAILED count in summary cards when failures=0', () => {
    const projects = [
      makeProject(1, 'Project A', 'success'),
      makeProject(2, 'Project B', 'success'),
    ];
    const metrics = makeDashboardMetrics(projects);

    render(
      <SummarySection
        metrics={metrics}
        activeFilter="all"
        onFilterChange={vi.fn()}
        onProjectSelect={vi.fn()}
      />
    );

    // Summary card for Failed should still be visible showing 0
    const failedCard = screen.getByText('Failed').closest('button');
    expect(failedCard).toBeInTheDocument();
    expect(failedCard?.textContent).toContain('Failed');
    expect(failedCard?.textContent).toContain('0');
  });
});

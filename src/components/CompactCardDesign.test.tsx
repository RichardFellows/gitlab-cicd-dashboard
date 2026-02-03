import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';
import { ViewType } from '../types';
import type { DashboardMetrics, Project } from '../types';

// Mock chart.js and react-chartjs-2
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  registerables: [],
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  BarElement: vi.fn(),
  ArcElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
}));

vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>,
}));

const createMockProject = (
  id: number,
  name: string,
  pipelineStatus: 'success' | 'failed' | 'running' | 'canceled',
  successRate: number
): Project => ({
  id,
  name,
  web_url: `https://gitlab.example.com/test/${name}`,
  metrics: {
    mainBranchPipeline: {
      id: 1,
      status: pipelineStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      web_url: `https://gitlab.example.com/test/${name}/pipelines/1`,
      available: true,
      failedJobs: pipelineStatus === 'failed' ? [
        {
          id: 1,
          name: 'test-job',
          stage: 'test',
          status: 'failed',
          failure_reason: 'script_failure',
          web_url: `https://gitlab.example.com/test/${name}/jobs/1`,
          created_at: new Date().toISOString(),
        },
      ] : [],
    },
    successRate,
    avgDuration: 300,
    totalPipelines: 10,
    successfulPipelines: Math.floor(10 * (successRate / 100)),
    failedPipelines: Math.floor(10 * ((100 - successRate) / 100)),
    canceledPipelines: 0,
    runningPipelines: 0,
    codeCoverage: {
      coverage: 85,
      available: true,
    },
    mergeRequestCounts: {
      totalOpen: 2,
      drafts: 1,
    },
    recentCommits: [
      {
        id: 'abc123',
        short_id: 'abc123',
        title: 'Test commit 1',
        created_at: new Date().toISOString(),
        author_name: 'Test Author',
        web_url: `https://gitlab.example.com/test/${name}/commit/abc123`,
      },
      {
        id: 'def456',
        short_id: 'def456',
        title: 'Test commit 2',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        author_name: 'Test Author',
        web_url: `https://gitlab.example.com/test/${name}/commit/def456`,
      },
    ],
    testMetrics: {
      total: 100,
      success: 95,
      failed: 5,
      skipped: 0,
      available: true,
    },
  },
});

const createMockMetrics = (projects: Project[]): DashboardMetrics => ({
  totalProjects: projects.length,
  projects,
  aggregateMetrics: {
    totalPipelines: projects.reduce((sum, p) => sum + p.metrics.totalPipelines, 0),
    successfulPipelines: projects.reduce((sum, p) => sum + p.metrics.successfulPipelines, 0),
    failedPipelines: projects.reduce((sum, p) => sum + p.metrics.failedPipelines, 0),
    canceledPipelines: 0,
    runningPipelines: 0,
    avgSuccessRate: projects.reduce((sum, p) => sum + p.metrics.successRate, 0) / projects.length,
    avgDuration: projects.reduce((sum, p) => sum + p.metrics.avgDuration, 0) / projects.length,
    testMetrics: {
      total: 100,
      success: 95,
      failed: 5,
      skipped: 0,
      available: true,
    },
  },
});

describe('CompactCardDesign', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds toggle button in Cards view header', () => {
    const projects = [createMockProject(1, 'test-project', 'success', 90)];
    const metrics = createMockMetrics(projects);

    render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    const toggle = screen.getByRole('button', { name: /compact|expanded/i });
    expect(toggle).toBeInTheDocument();
  });

  it('toggle button shows correct text when in compact mode', () => {
    const projects = [createMockProject(1, 'test-project', 'success', 90)];
    const metrics = createMockMetrics(projects);

    render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    const toggle = screen.getByRole('button', { name: /compact/i });
    expect(toggle).toHaveTextContent(/📋 Compact/);
    expect(toggle).toHaveClass('active');
  });

  it('defaults to compact mode', () => {
    const projects = [createMockProject(1, 'test-project', 'success', 90)];
    const metrics = createMockMetrics(projects);

    render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    const projectCard = screen.getByText('test-project').closest('.project-card');
    expect(projectCard).toHaveClass('compact');

    // Recent Commits section should be hidden
    expect(screen.queryByText('Recent Commits')).not.toBeInTheDocument();
    
    // Test Results section should be hidden
    expect(screen.queryByText('Test Results')).not.toBeInTheDocument();
  });

  it('compact card shows all required information', () => {
    const projects = [createMockProject(1, 'test-project', 'success', 90)];
    const metrics = createMockMetrics(projects);

    render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    // Project name
    expect(screen.getByText('test-project')).toBeInTheDocument();

    // Health badge (should be visible)
    const projectCard = screen.getByText('test-project').closest('.project-card');
    expect(projectCard?.querySelector('.health-badge')).toBeInTheDocument();

    // Pipeline status
    expect(screen.getByText(/Main Branch:/i)).toBeInTheDocument();
    const pipelineValue = projectCard?.querySelector('.metric-value.success');
    expect(pipelineValue).toBeInTheDocument();

    // Success rate
    expect(screen.getByText(/90.00%/)).toBeInTheDocument();

    // Coverage
    expect(screen.getByText(/Code Coverage:/i)).toBeInTheDocument();
    expect(screen.getByText(/85\.00%/)).toBeInTheDocument();

    // Open MRs
    expect(screen.getByText(/Open MRs:/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('compact mode hides Recent Commits section', () => {
    const projects = [createMockProject(1, 'test-project', 'success', 90)];
    const metrics = createMockMetrics(projects);

    render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    // Recent Commits section should not be visible
    expect(screen.queryByText('Recent Commits')).not.toBeInTheDocument();
    expect(screen.queryByText('Test commit 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Test commit 2')).not.toBeInTheDocument();
  });

  it('compact mode hides Test Results details', () => {
    const projects = [createMockProject(1, 'test-project', 'success', 90)];
    const metrics = createMockMetrics(projects);

    render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    // Test Results section should not be visible
    expect(screen.queryByText('Test Results')).not.toBeInTheDocument();
    expect(screen.queryByText(/95 passed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/5 failed/)).not.toBeInTheDocument();
  });

  it('toggle switches between compact and expanded modes', async () => {
    const user = userEvent.setup();
    const projects = [createMockProject(1, 'test-project', 'success', 90)];
    const metrics = createMockMetrics(projects);

    render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    // Initially compact
    expect(screen.queryByText('Recent Commits')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Results')).not.toBeInTheDocument();

    // Click toggle to expand
    const toggle = screen.getByRole('button', { name: /compact/i });
    await user.click(toggle);

    // Now expanded - should show hidden sections
    expect(screen.getByText('Recent Commits')).toBeInTheDocument();
    expect(screen.getByText('Test Results')).toBeInTheDocument();
    expect(screen.getByText('Test commit 1')).toBeInTheDocument();
    expect(screen.getByText(/95 passed/)).toBeInTheDocument();

    // Toggle text should change
    expect(screen.getByRole('button', { name: /expanded/i })).toHaveTextContent(/📄 Expanded/);

    // Click again to compact
    await user.click(screen.getByRole('button', { name: /expanded/i }));

    // Back to compact - sections hidden again
    expect(screen.queryByText('Recent Commits')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Results')).not.toBeInTheDocument();
  });

  it('compact card has reduced height styling', () => {
    const projects = [createMockProject(1, 'test-project', 'success', 90)];
    const metrics = createMockMetrics(projects);

    render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    const projectCard = screen.getByText('test-project').closest('.project-card');
    expect(projectCard).toHaveClass('compact');
  });

  it('persists toggle state to localStorage', async () => {
    const user = userEvent.setup();
    const projects = [createMockProject(1, 'test-project', 'success', 90)];
    const metrics = createMockMetrics(projects);

    render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    // Initially compact (default)
    expect(localStorage.getItem('dashboard_card_compact_mode')).toBe('true');

    // Toggle to expanded
    const toggle = screen.getByRole('button', { name: /compact/i });
    await user.click(toggle);

    // Should persist to localStorage
    expect(localStorage.getItem('dashboard_card_compact_mode')).toBe('false');

    // Toggle back to compact
    await user.click(screen.getByRole('button', { name: /expanded/i }));

    // Should persist change
    expect(localStorage.getItem('dashboard_card_compact_mode')).toBe('true');
  });

  it('restores compact mode state from localStorage on mount', () => {
    // Pre-set localStorage to expanded mode
    localStorage.setItem('dashboard_card_compact_mode', 'false');

    const projects = [createMockProject(1, 'test-project', 'success', 90)];
    const metrics = createMockMetrics(projects);

    render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    // Should restore expanded mode
    expect(screen.getByText('Recent Commits')).toBeInTheDocument();
    expect(screen.getByText('Test Results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expanded/i })).toHaveTextContent(/📄 Expanded/);
  });

  it('toggle only appears in Cards view, not Table view', () => {
    const projects = [createMockProject(1, 'test-project', 'success', 90)];
    const metrics = createMockMetrics(projects);

    const { rerender } = render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.TABLE}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    // Toggle should not be present in table view
    expect(screen.queryByRole('button', { name: /compact|expanded/i })).not.toBeInTheDocument();

    // Switch to cards view
    rerender(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    // Now toggle should be present
    expect(screen.getByRole('button', { name: /compact|expanded/i })).toBeInTheDocument();
  });

  it('compact mode works correctly with multiple projects', () => {
    const projects = [
      createMockProject(1, 'project-1', 'failed', 60),
      createMockProject(2, 'project-2', 'running', 70),
      createMockProject(3, 'project-3', 'success', 95),
    ];
    const metrics = createMockMetrics(projects);

    render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    // All cards should have compact class
    const cards = screen.getAllByText(/project-/).filter(el => 
      el.classList.contains('project-name-link')
    ).map(el => el.closest('.project-card'));
    
    expect(cards.length).toBe(3);
    cards.forEach(card => {
      expect(card).toHaveClass('compact');
    });

    // None should show Recent Commits or Test Results
    expect(screen.queryByText('Recent Commits')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Results')).not.toBeInTheDocument();
  });

  it('expanded mode shows all sections for all projects', async () => {
    const user = userEvent.setup();
    const projects = [
      createMockProject(1, 'project-1', 'failed', 60),
      createMockProject(2, 'project-2', 'success', 95),
    ];
    const metrics = createMockMetrics(projects);

    render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.CARD}
        onProjectSelect={vi.fn()}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={vi.fn()}
      />
    );

    // Toggle to expanded
    const toggle = screen.getByRole('button', { name: /compact/i });
    await user.click(toggle);

    // All projects should show Recent Commits and Test Results
    const recentCommitsSections = screen.getAllByText('Recent Commits');
    expect(recentCommitsSections).toHaveLength(2); // One for each project

    const testResultsSections = screen.getAllByText('Test Results');
    expect(testResultsSections).toHaveLength(2); // One for each project
  });
});

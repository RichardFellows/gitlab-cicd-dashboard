import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Project, PipelineTrend, DeploymentsByEnv } from '../types';

// Mock chart.js to add Filler
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
}));

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Line: ({ data }: any) => (
    <div data-testid="mock-line-chart">
      <span data-testid="line-dataset-count">{data.datasets.length}</span>
    </div>
  ),
  Bar: ({ data }: any) => (
    <div data-testid="mock-bar-chart">
      <span data-testid="bar-dataset-count">{data.datasets.length}</span>
    </div>
  ),
}));

// Must import after mocks
import ComparisonView from './ComparisonView';
import DashboardDataService from '../services/DashboardDataService';

function makeProject(id: number, name: string): Project {
  return {
    id,
    name,
    web_url: `https://gitlab.com/${name}`,
    metrics: {
      totalPipelines: 10,
      successfulPipelines: 8,
      failedPipelines: 2,
      canceledPipelines: 0,
      runningPipelines: 0,
      successRate: 80,
      avgDuration: 120,
      testMetrics: { total: 0, success: 0, failed: 0, skipped: 0, available: false },
      mainBranchPipeline: { id: 0, status: 'success', available: true, created_at: '', updated_at: '' },
      codeCoverage: { coverage: 75, available: true },
      mergeRequestCounts: { totalOpen: 3, drafts: 1 },
      recentCommits: [],
    },
  };
}

function makeTrend(date: string): PipelineTrend {
  return { date, total: 10, successful: 8, failed: 2, successRate: 80, avgDuration: 120 };
}

describe('ComparisonView', () => {
  const projects = [makeProject(1, 'Alpha'), makeProject(2, 'Beta')];
  const deploymentCache = new Map<number, DeploymentsByEnv>();
  const onBack = vi.fn();
  const onRemoveProject = vi.fn();

  let mockDashboardService: DashboardDataService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboardService = {
      getProjectPipelineTrends: vi.fn().mockResolvedValue([
        makeTrend('2026-01-01'),
        makeTrend('2026-01-02'),
      ]),
    } as unknown as DashboardDataService;
  });

  test('renders comparison header with project names', async () => {
    render(
      <ComparisonView
        projects={projects}
        dashboardService={mockDashboardService}
        deploymentCache={deploymentCache}
        timeframe={7}
        onBack={onBack}
        onRemoveProject={onRemoveProject}
      />
    );

    expect(screen.getByTestId('comparison-header')).toBeInTheDocument();
    // Project names appear in header, charts, table, etc.
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Beta').length).toBeGreaterThan(0);
  });

  test('fetches trend data for each project on mount', async () => {
    render(
      <ComparisonView
        projects={projects}
        dashboardService={mockDashboardService}
        deploymentCache={deploymentCache}
        timeframe={7}
        onBack={onBack}
        onRemoveProject={onRemoveProject}
      />
    );

    await waitFor(() => {
      expect(mockDashboardService.getProjectPipelineTrends).toHaveBeenCalledTimes(2);
    });
  });

  test('renders charts after data loads', async () => {
    render(
      <ComparisonView
        projects={projects}
        dashboardService={mockDashboardService}
        deploymentCache={deploymentCache}
        timeframe={7}
        onBack={onBack}
        onRemoveProject={onRemoveProject}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('comparison-charts')).toBeInTheDocument();
    });
  });

  test('renders comparison table', async () => {
    render(
      <ComparisonView
        projects={projects}
        dashboardService={mockDashboardService}
        deploymentCache={deploymentCache}
        timeframe={7}
        onBack={onBack}
        onRemoveProject={onRemoveProject}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('comparison-table')).toBeInTheDocument();
    });
  });

  test('renders comparison deployments section', async () => {
    render(
      <ComparisonView
        projects={projects}
        dashboardService={mockDashboardService}
        deploymentCache={deploymentCache}
        timeframe={7}
        onBack={onBack}
        onRemoveProject={onRemoveProject}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('comparison-deployments')).toBeInTheDocument();
    });
  });

  test('shows error warning when trend fetch fails', async () => {
    const failService = {
      getProjectPipelineTrends: vi.fn()
        .mockResolvedValueOnce([makeTrend('2026-01-01')])
        .mockRejectedValueOnce(new Error('API error')),
    } as unknown as DashboardDataService;

    render(
      <ComparisonView
        projects={projects}
        dashboardService={failService}
        deploymentCache={deploymentCache}
        timeframe={7}
        onBack={onBack}
        onRemoveProject={onRemoveProject}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load trends for Beta/)).toBeInTheDocument();
    });
  });

  test('calls onBack when back button clicked', async () => {
    render(
      <ComparisonView
        projects={projects}
        dashboardService={mockDashboardService}
        deploymentCache={deploymentCache}
        timeframe={7}
        onBack={onBack}
        onRemoveProject={onRemoveProject}
      />
    );

    const backBtn = screen.getByText('← Back to Dashboard');
    backBtn.click();
    expect(onBack).toHaveBeenCalled();
  });
});

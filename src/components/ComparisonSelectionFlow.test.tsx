import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Project, DashboardMetrics, ViewType } from '../types';

// Mock chart.js and react-chartjs-2
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
  ArcElement: vi.fn(),
  DoughnutController: vi.fn(),
}));

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-line-chart" />,
  Bar: () => <div data-testid="mock-bar-chart" />,
  Doughnut: () => <div data-testid="mock-doughnut" />,
}));

// Mock SummarySection (uses charts internally)
vi.mock('./SummarySection', () => ({
  default: () => <div data-testid="mock-summary-section">Summary</div>,
}));

// Mock HealthBadge and HealthBreakdown to avoid complex rendering
vi.mock('./HealthBadge', () => ({
  default: () => <span data-testid="health-badge">●</span>,
}));

vi.mock('./HealthBreakdown', () => ({
  default: () => <div data-testid="health-breakdown" />,
}));

import Dashboard from './Dashboard';

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
      testMetrics: { total: 10, success: 8, failed: 1, skipped: 1, available: true },
      mainBranchPipeline: { id: 1, status: 'success', available: true, created_at: '', updated_at: '', failedJobs: [] },
      codeCoverage: { coverage: 75, available: true },
      mergeRequestCounts: { totalOpen: 3, drafts: 1 },
      recentCommits: [],
    },
  };
}

const projects = [
  makeProject(1, 'Project Alpha'),
  makeProject(2, 'Project Beta'),
  makeProject(3, 'Project Gamma'),
];

const metrics: DashboardMetrics = {
  totalProjects: projects.length,
  projects,
  aggregateMetrics: {
    totalPipelines: 30,
    successfulPipelines: 24,
    failedPipelines: 6,
    canceledPipelines: 0,
    runningPipelines: 0,
    avgSuccessRate: 80,
    avgDuration: 120,
    testMetrics: { total: 30, success: 24, failed: 3, skipped: 3, available: true },
  },
};

describe('Comparison Selection Flow', () => {
  let selectedForComparison: Set<number>;
  let selectionMode: boolean;
  const onProjectSelect = vi.fn();
  const onStatusFilterChange = vi.fn();
  let onToggleSelectionMode: ReturnType<typeof vi.fn>;
  let onToggleComparisonSelection: ReturnType<typeof vi.fn>;
  let onCompare: ReturnType<typeof vi.fn>;
  let onClearSelection: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    selectedForComparison = new Set();
    selectionMode = false;
    onToggleSelectionMode = vi.fn();
    onToggleComparisonSelection = vi.fn();
    onCompare = vi.fn();
    onClearSelection = vi.fn();
  });

  function renderDashboard(overrides: {
    selectionMode?: boolean;
    selectedForComparison?: Set<number>;
  } = {}) {
    return render(
      <Dashboard
        metrics={metrics}
        viewType={ViewType.TABLE}
        onProjectSelect={onProjectSelect}
        statusFilter="all"
        searchQuery=""
        onStatusFilterChange={onStatusFilterChange}
        selectionMode={overrides.selectionMode ?? selectionMode}
        selectedForComparison={overrides.selectedForComparison ?? selectedForComparison}
        onToggleSelectionMode={onToggleSelectionMode}
        onToggleComparisonSelection={onToggleComparisonSelection}
        onCompare={onCompare}
        onClearSelection={onClearSelection}
      />
    );
  }

  test('shows Compare toggle button', () => {
    renderDashboard();
    expect(screen.getByText('⇔ Compare')).toBeInTheDocument();
  });

  test('clicking Compare toggle calls onToggleSelectionMode', () => {
    renderDashboard();
    fireEvent.click(screen.getByText('⇔ Compare'));
    expect(onToggleSelectionMode).toHaveBeenCalled();
  });

  test('shows checkboxes in selection mode', () => {
    renderDashboard({ selectionMode: true });
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(projects.length);
  });

  test('clicking a checkbox calls onToggleComparisonSelection', () => {
    renderDashboard({ selectionMode: true });
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(onToggleComparisonSelection).toHaveBeenCalledWith(projects[0].id);
  });

  test('shows action bar when projects are selected', () => {
    renderDashboard({
      selectionMode: true,
      selectedForComparison: new Set([1, 2]),
    });
    expect(screen.getByTestId('comparison-action-bar')).toBeInTheDocument();
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  test('Compare Now button is enabled when 2+ selected', () => {
    renderDashboard({
      selectionMode: true,
      selectedForComparison: new Set([1, 2]),
    });
    const compareBtn = screen.getByText('Compare Now');
    expect(compareBtn).not.toBeDisabled();
  });

  test('Compare Now button is disabled when <2 selected', () => {
    renderDashboard({
      selectionMode: true,
      selectedForComparison: new Set([1]),
    });
    const compareBtn = screen.getByText('Compare Now');
    expect(compareBtn).toBeDisabled();
  });

  test('clicking Compare Now calls onCompare', () => {
    renderDashboard({
      selectionMode: true,
      selectedForComparison: new Set([1, 2]),
    });
    fireEvent.click(screen.getByText('Compare Now'));
    expect(onCompare).toHaveBeenCalled();
  });

  test('clicking Clear calls onClearSelection', () => {
    renderDashboard({
      selectionMode: true,
      selectedForComparison: new Set([1, 2]),
    });
    fireEvent.click(screen.getByText('Clear'));
    expect(onClearSelection).toHaveBeenCalled();
  });

  test('does not show action bar when no projects selected', () => {
    renderDashboard({ selectionMode: true });
    expect(screen.queryByTestId('comparison-action-bar')).not.toBeInTheDocument();
  });

  test('does not show checkboxes when not in selection mode', () => {
    renderDashboard({ selectionMode: false });
    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes.length).toBe(0);
  });
});

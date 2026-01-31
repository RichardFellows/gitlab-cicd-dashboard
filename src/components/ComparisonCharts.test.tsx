import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Project, PipelineTrend } from '../types';

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
      <span data-testid="line-labels">{data.labels.join(',')}</span>
    </div>
  ),
  Bar: ({ data }: any) => (
    <div data-testid="mock-bar-chart">
      <span data-testid="bar-dataset-count">{data.datasets.length}</span>
      <span data-testid="bar-labels">{data.labels.join(',')}</span>
    </div>
  ),
}));

// Must import after mocks
import ComparisonCharts from './ComparisonCharts';

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

function makeTrend(date: string, successRate: number, avgDuration: number): PipelineTrend {
  return { date, total: 10, successful: 8, failed: 2, successRate, avgDuration };
}

describe('ComparisonCharts', () => {
  const projects = [makeProject(1, 'Project Alpha'), makeProject(2, 'Project Beta')];
  const colours = ['#6e49cb', '#e67e22'];

  test('renders loading state', () => {
    render(
      <ComparisonCharts
        projects={projects}
        trendData={new Map()}
        colours={colours}
        loading={true}
      />
    );
    expect(screen.getByTestId('comparison-charts-loading')).toBeInTheDocument();
  });

  test('renders charts when data is loaded', () => {
    const trendData = new Map<number, PipelineTrend[]>();
    trendData.set(1, [makeTrend('2026-01-01', 90, 100), makeTrend('2026-01-02', 85, 120)]);
    trendData.set(2, [makeTrend('2026-01-01', 80, 200), makeTrend('2026-01-02', 75, 180)]);

    render(
      <ComparisonCharts
        projects={projects}
        trendData={trendData}
        colours={colours}
        loading={false}
      />
    );
    expect(screen.getByTestId('comparison-charts')).toBeInTheDocument();
    // Should have line charts (success rate + duration) and bar charts (coverage + MR)
    const lineCharts = screen.getAllByTestId('mock-line-chart');
    const barCharts = screen.getAllByTestId('mock-bar-chart');
    expect(lineCharts.length).toBe(2); // Success rate + duration
    expect(barCharts.length).toBe(2); // Coverage + MR backlog
  });

  test('line charts have correct number of datasets (one per project)', () => {
    const trendData = new Map<number, PipelineTrend[]>();
    trendData.set(1, [makeTrend('2026-01-01', 90, 100)]);
    trendData.set(2, [makeTrend('2026-01-01', 80, 200)]);

    render(
      <ComparisonCharts
        projects={projects}
        trendData={trendData}
        colours={colours}
        loading={false}
      />
    );

    // Each line chart should have 2 datasets (one per project)
    const datasetCounts = screen.getAllByTestId('line-dataset-count');
    datasetCounts.forEach(el => {
      expect(el.textContent).toBe('2');
    });
  });

  test('handles empty trend data gracefully', () => {
    render(
      <ComparisonCharts
        projects={projects}
        trendData={new Map()}
        colours={colours}
        loading={false}
      />
    );
    expect(screen.getByTestId('comparison-charts')).toBeInTheDocument();
  });
});

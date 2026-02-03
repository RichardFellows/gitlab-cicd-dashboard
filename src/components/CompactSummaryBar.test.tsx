import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SummarySection from './SummarySection';
import { DashboardMetrics } from '../types';

// Mock Chart.js and react-chartjs-2
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  registerables: [],
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  ArcElement: vi.fn(),
  Filler: vi.fn(),
}));

vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>,
}));

describe('Compact Summary Bar (US-005)', () => {
  let mockMetrics: DashboardMetrics;
  let mockOnFilterChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnFilterChange = vi.fn();
    mockMetrics = {
      totalProjects: 4,
      aggregateMetrics: {
        totalPipelines: 150,
        successfulPipelines: 128,
        failedPipelines: 8,
        canceledPipelines: 2,
        runningPipelines: 1,
        avgSuccessRate: 85.5,
        avgDuration: 300,
        testMetrics: { total: 0, success: 0, failed: 0, skipped: 0, available: false },
      },
      projects: [
        {
          id: 1,
          name: 'Project Success',
          web_url: 'https://gitlab.com/project/1',
          metrics: {
            totalPipelines: 50,
            successfulPipelines: 48,
            failedPipelines: 2,
            canceledPipelines: 0,
            runningPipelines: 0,
            successRate: 95.0,
            avgDuration: 280,
            testMetrics: { total: 0, success: 0, failed: 0, skipped: 0, available: false },
            mainBranchPipeline: {
              id: 101,
              status: 'success' as const,
              created_at: '2024-01-01T10:00:00Z',
              updated_at: '2024-01-01T10:10:00Z',
              available: true,
              failedJobs: [],
            },
            codeCoverage: { coverage: null, available: false },
            mergeRequestCounts: { totalOpen: 0, drafts: 0 },
            recentCommits: [],
          },
        },
        {
          id: 2,
          name: 'Project Warning',
          web_url: 'https://gitlab.com/project/2',
          metrics: {
            totalPipelines: 40,
            successfulPipelines: 28,
            failedPipelines: 4,
            canceledPipelines: 0,
            runningPipelines: 1,
            successRate: 70.0,
            avgDuration: 320,
            testMetrics: { total: 0, success: 0, failed: 0, skipped: 0, available: false },
            mainBranchPipeline: {
              id: 102,
              status: 'running' as const,
              created_at: '2024-01-01T11:00:00Z',
              updated_at: '2024-01-01T11:05:00Z',
              available: true,
              failedJobs: [],
            },
            codeCoverage: { coverage: null, available: false },
            mergeRequestCounts: { totalOpen: 0, drafts: 0 },
            recentCommits: [],
          },
        },
        {
          id: 3,
          name: 'Project Failed',
          web_url: 'https://gitlab.com/project/3',
          metrics: {
            totalPipelines: 30,
            successfulPipelines: 12,
            failedPipelines: 9,
            canceledPipelines: 0,
            runningPipelines: 0,
            successRate: 40.0,
            avgDuration: 340,
            testMetrics: { total: 0, success: 0, failed: 0, skipped: 0, available: false },
            mainBranchPipeline: {
              id: 103,
              status: 'failed' as const,
              created_at: '2024-01-01T12:00:00Z',
              updated_at: '2024-01-01T12:15:00Z',
              available: true,
              failedJobs: [
                {
                  id: 301,
                  name: 'test-job',
                  stage: 'test',
                  status: 'failed' as const,
                  web_url: 'https://gitlab.com/job/301',
                  created_at: '2024-01-01T12:00:00Z',
                  failure_reason: 'script_failure',
                },
              ],
            },
            codeCoverage: { coverage: null, available: false },
            mergeRequestCounts: { totalOpen: 0, drafts: 0 },
            recentCommits: [],
          },
        },
        {
          id: 4,
          name: 'Project Inactive',
          web_url: 'https://gitlab.com/project/4',
          metrics: {
            totalPipelines: 0,
            successfulPipelines: 0,
            failedPipelines: 0,
            canceledPipelines: 0,
            runningPipelines: 0,
            successRate: 0,
            avgDuration: 0,
            testMetrics: { total: 0, success: 0, failed: 0, skipped: 0, available: false },
            mainBranchPipeline: {
              id: 0,
              status: 'pending' as const,
              created_at: '',
              updated_at: '',
              available: false,
              failedJobs: [],
            },
            codeCoverage: { coverage: null, available: false },
            mergeRequestCounts: { totalOpen: 0, drafts: 0 },
            recentCommits: [],
          },
        },
      ],
    };
  });

  it('displays stats in single horizontal row: TOTAL | SUCCESS | WARNING | FAILED | INACTIVE', () => {
    render(
      <SummarySection
        metrics={mockMetrics}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
      />
    );

    // Check that compact layout container exists
    const compactLayout = document.querySelector('.summary-compact-layout');
    expect(compactLayout).toBeInTheDocument();

    // Check that stats row exists and contains all 5 cards
    const statsRow = document.querySelector('.summary-stats-row');
    expect(statsRow).toBeInTheDocument();
    
    // Verify all 5 status cards are present in the row
    const cards = statsRow?.querySelectorAll('.summary-card.compact');
    expect(cards).toHaveLength(5);

    // Verify the cards show correct labels
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows Portfolio Health donut on right side of same row (~80px)', () => {
    render(
      <SummarySection
        metrics={mockMetrics}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
      />
    );

    // Check that health chart container exists
    const healthChart = document.querySelector('.summary-health-chart');
    expect(healthChart).toBeInTheDocument();

    // Check that it contains the compact chart
    const compactChart = document.querySelector('.chart-container.compact');
    expect(compactChart).toBeInTheDocument();

    // Verify the chart is rendered inside the compact container
    const doughnutChart = compactChart?.querySelector('[data-testid="doughnut-chart"]');
    expect(doughnutChart).toBeInTheDocument();
  });

  it('does NOT display center label (12 PROJECTS badge) in compact chart', () => {
    render(
      <SummarySection
        metrics={mockMetrics}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
      />
    );

    // The old center label should not exist
    const centerLabel = document.querySelector('.chart-center-label');
    expect(centerLabel).not.toBeInTheDocument();
  });

  it('displays secondary stats (TOTAL PIPELINES, SUCCESS RATE, AVG DURATION) below in smaller text', () => {
    render(
      <SummarySection
        metrics={mockMetrics}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
      />
    );

    // Check that secondary stats container exists
    const secondaryStats = document.querySelector('.summary-secondary-stats');
    expect(secondaryStats).toBeInTheDocument();

    // Verify all three secondary metrics are present
    expect(screen.getByText('Total Pipelines')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('85.5%')).toBeInTheDocument();
    
    expect(screen.getByText('Avg Duration')).toBeInTheDocument();
    expect(screen.getByText('5m 0s')).toBeInTheDocument();
  });

  it('has compact styling with reduced padding and smaller fonts', () => {
    render(
      <SummarySection
        metrics={mockMetrics}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
      />
    );

    // Verify cards have compact class
    const compactCards = document.querySelectorAll('.summary-card.compact');
    expect(compactCards.length).toBeGreaterThan(0);

    // Verify health chart has compact class
    const compactChart = document.querySelector('.chart-container.compact');
    expect(compactChart).toBeInTheDocument();

    // Verify secondary stats container exists (which has smaller text styles)
    const secondaryStats = document.querySelector('.summary-secondary-stats');
    expect(secondaryStats).toBeInTheDocument();
  });

  it('shows correct counts for each status category', () => {
    render(
      <SummarySection
        metrics={mockMetrics}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
      />
    );

    // Find all metric values in the stats row
    const statsRow = document.querySelector('.summary-stats-row');
    const metricElements = statsRow?.querySelectorAll('.metric');

    expect(metricElements?.[0]?.textContent).toBe('4'); // Total
    expect(metricElements?.[1]?.textContent).toBe('1'); // Success
    expect(metricElements?.[2]?.textContent).toBe('1'); // Warning
    expect(metricElements?.[3]?.textContent).toBe('1'); // Failed
    expect(metricElements?.[4]?.textContent).toBe('1'); // Inactive
  });

  it('maintains clickable filter functionality in compact layout', () => {
    const { container } = render(
      <SummarySection
        metrics={mockMetrics}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
      />
    );

    // Find the Success card button
    const successCard = container.querySelector('.summary-card.success');
    expect(successCard).toBeInTheDocument();
    expect(successCard?.classList.contains('clickable')).toBe(true);
  });

  it('reduces section height compared to legacy layout', () => {
    render(
      <SummarySection
        metrics={mockMetrics}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
      />
    );

    // Verify the summary section exists
    const section = document.querySelector('.summary-section');
    expect(section).toBeInTheDocument();

    // Verify compact layout is used (not legacy layout)
    const compactLayout = document.querySelector('.summary-compact-layout');
    expect(compactLayout).toBeInTheDocument();

    // Verify legacy layout is NOT used
    const legacyLayout = document.querySelector('.summary-layout');
    expect(legacyLayout).not.toBeInTheDocument();
  });
});

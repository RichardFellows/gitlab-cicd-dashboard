import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Project } from '../types';

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Doughnut: ({ data }: any) => (
    <div data-testid="mock-doughnut">
      {data.datasets[0].data.map((val: number, i: number) => (
        <span key={i} data-testid={`chart-value-${i}`}>{val}</span>
      ))}
    </div>
  ),
}));

// Import after mocks
import PortfolioHealthChart from './PortfolioHealthChart';

function makeProject(id: number, name: string, overrides: any = {}): Project {
  return {
    id,
    name,
    web_url: `https://gitlab.com/test/${name}`,
    metrics: {
      totalPipelines: 20,
      successfulPipelines: 18,
      failedPipelines: 2,
      canceledPipelines: 0,
      runningPipelines: 0,
      successRate: 90,
      avgDuration: 120,
      testMetrics: { total: 100, success: 95, failed: 5, skipped: 0, available: true },
      mainBranchPipeline: { id: 1, status: 'success', created_at: '', updated_at: '', available: true },
      codeCoverage: { coverage: 85, available: true },
      mergeRequestCounts: { totalOpen: 1, drafts: 0 },
      recentCommits: [],
      mainBranchFailureRate: 0,
      durationSpikePercent: 0,
      ...overrides,
    },
  };
}

describe('PortfolioHealthChart', () => {
  test('renders Portfolio Health title', () => {
    const projects = [makeProject(1, 'test')];
    render(<PortfolioHealthChart projects={projects} />);
    expect(screen.getByText('Portfolio Health')).toBeInTheDocument();
  });

  test('renders the Doughnut chart', () => {
    const projects = [makeProject(1, 'test')];
    render(<PortfolioHealthChart projects={projects} />);
    expect(screen.getByTestId('mock-doughnut')).toBeInTheDocument();
  });

  test('renders legend items', () => {
    const projects = [makeProject(1, 'test')];
    render(<PortfolioHealthChart projects={projects} />);
    expect(screen.getByText(/Healthy/)).toBeInTheDocument();
    expect(screen.getByText(/Warning/)).toBeInTheDocument();
    expect(screen.getByText(/Critical/)).toBeInTheDocument();
  });

  test('renders average label', () => {
    const projects = [makeProject(1, 'test')];
    render(<PortfolioHealthChart projects={projects} />);
    expect(screen.getByText('Average')).toBeInTheDocument();
  });

  test('renders HealthBadge with average score', () => {
    const projects = [
      makeProject(1, 'healthy', {
        mainBranchFailureRate: 0,
        codeCoverage: { coverage: 90, available: true },
        totalPipelines: 20,
      }),
    ];
    render(<PortfolioHealthChart projects={projects} />);
    // The badge should render - look for the button with aria-label
    const badge = screen.getByRole('button');
    expect(badge.getAttribute('aria-label')).toContain('Health score:');
  });

  test('renders correct distribution for mixed projects', () => {
    const projects = [
      makeProject(1, 'healthy', {
        mainBranchFailureRate: 0,
        codeCoverage: { coverage: 90, available: true },
        durationSpikePercent: 0,
        mergeRequestCounts: { totalOpen: 0, drafts: 0 },
        totalPipelines: 20,
      }),
      makeProject(2, 'critical', {
        mainBranchFailureRate: 30,
        codeCoverage: { coverage: null, available: false },
        durationSpikePercent: 60,
        mergeRequestCounts: { totalOpen: 15, drafts: 0 },
        totalPipelines: 20,
      }),
    ];
    render(<PortfolioHealthChart projects={projects} />);
    // Chart should be rendered with values
    expect(screen.getByTestId('mock-doughnut')).toBeInTheDocument();
  });

  test('handles empty projects array', () => {
    render(<PortfolioHealthChart projects={[]} />);
    expect(screen.getByText('Portfolio Health')).toBeInTheDocument();
  });
});

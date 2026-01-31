import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportButton from './ExportButton';
import { DashboardMetrics, DashboardConfig, ChartRefMap, DeploymentsByEnv } from '../types';

// Mock the export utilities
vi.mock('../utils/exportCsv', () => ({
  generateProjectsCsv: vi.fn(() => 'csv-content'),
  generateEnvironmentCsv: vi.fn(() => 'env-csv-content'),
  downloadCsv: vi.fn(),
}));

vi.mock('../utils/exportPdf', () => ({
  generateDashboardPdf: vi.fn(() => Promise.resolve()),
}));

vi.mock('../utils/captureChartImages', () => ({
  captureChartImages: vi.fn(() => ({})),
}));

// Import mocked modules to check calls
import { downloadCsv, generateProjectsCsv } from '../utils/exportCsv';

function mockMetrics(): DashboardMetrics {
  return {
    totalProjects: 2,
    projects: [
      {
        id: 1, name: 'P1', web_url: 'http://test',
        metrics: {
          totalPipelines: 10, successfulPipelines: 9, failedPipelines: 1,
          canceledPipelines: 0, runningPipelines: 0, successRate: 90, avgDuration: 100,
          testMetrics: { total: 10, success: 10, failed: 0, skipped: 0, available: true },
          mainBranchPipeline: { id: 1, status: 'success', created_at: '2026-01-01', updated_at: '2026-01-01' },
          codeCoverage: { coverage: 80, available: true },
          mergeRequestCounts: { totalOpen: 1, drafts: 0 },
          recentCommits: [],
        },
      },
    ],
    aggregateMetrics: {
      totalPipelines: 10, successfulPipelines: 9, failedPipelines: 1,
      canceledPipelines: 0, runningPipelines: 0, avgSuccessRate: 90, avgDuration: 100,
      testMetrics: { total: 10, success: 10, failed: 0, skipped: 0, available: true },
    },
  };
}

function mockConfig(): DashboardConfig {
  return {
    version: 1, gitlabUrl: 'https://gitlab.com', token: 'token', timeframe: 30,
    groups: [], projects: [],
  };
}

const defaultProps = {
  metrics: mockMetrics(),
  projects: mockMetrics().projects,
  deploymentCache: new Map<number, DeploymentsByEnv>(),
  config: mockConfig(),
  chartRefs: {} as ChartRefMap,
};

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the export button', () => {
    render(<ExportButton {...defaultProps} />);
    expect(screen.getByText(/Export/)).toBeInTheDocument();
  });

  it('is disabled when metrics is null', () => {
    render(<ExportButton {...defaultProps} metrics={null} />);
    const btn = screen.getByRole('button', { name: /Export/ });
    expect(btn).toBeDisabled();
  });

  it('opens dropdown on click', () => {
    render(<ExportButton {...defaultProps} />);
    fireEvent.click(screen.getByText(/Export/));
    expect(screen.getByText(/CSV — Project Metrics/)).toBeInTheDocument();
    expect(screen.getByText(/CSV — Deployments/)).toBeInTheDocument();
    expect(screen.getByText(/PDF Report/)).toBeInTheDocument();
  });

  it('triggers CSV download for project metrics', () => {
    render(<ExportButton {...defaultProps} />);
    fireEvent.click(screen.getByText(/Export/));
    fireEvent.click(screen.getByText(/CSV — Project Metrics/));
    expect(generateProjectsCsv).toHaveBeenCalled();
    expect(downloadCsv).toHaveBeenCalled();
  });

  it('disables deployment CSV when no env data', () => {
    render(<ExportButton {...defaultProps} />);
    fireEvent.click(screen.getByText(/Export/));
    const deployBtn = screen.getByText(/CSV — Deployments/);
    expect(deployBtn).toBeDisabled();
  });

  it('opens PDF dialog when clicking PDF option', () => {
    render(<ExportButton {...defaultProps} />);
    fireEvent.click(screen.getByText(/Export/));
    fireEvent.click(screen.getByText(/PDF Report/));
    expect(screen.getByText(/PDF Report Options/)).toBeInTheDocument();
  });

  it('closes dropdown on outside click', () => {
    render(<ExportButton {...defaultProps} />);
    fireEvent.click(screen.getByText(/Export/));
    expect(screen.getByText(/CSV — Project Metrics/)).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText(/CSV — Project Metrics/)).not.toBeInTheDocument();
  });
});

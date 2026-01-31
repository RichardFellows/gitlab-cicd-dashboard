import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardMetrics, PdfExportOptions, DashboardConfig, DeploymentsByEnv } from '../types';

// Mock jspdf and jspdf-autotable
const mockSave = vi.fn();
const mockText = vi.fn();
const mockAddPage = vi.fn();
const mockAddImage = vi.fn();
const mockLine = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetFont = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetLineWidth = vi.fn();
const mockSetPage = vi.fn();
const mockGetNumberOfPages = vi.fn(() => 1);
const mockAutoTable = vi.fn();

const mockDoc = {
  save: mockSave,
  text: mockText,
  addPage: mockAddPage,
  addImage: mockAddImage,
  line: mockLine,
  setFontSize: mockSetFontSize,
  setFont: mockSetFont,
  setTextColor: mockSetTextColor,
  setDrawColor: mockSetDrawColor,
  setLineWidth: mockSetLineWidth,
  setPage: mockSetPage,
  getNumberOfPages: mockGetNumberOfPages,
  autoTable: mockAutoTable,
  lastAutoTable: { finalY: 100 },
  internal: {
    pageSize: {
      getHeight: () => 297, // A4 height in mm
    },
  },
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => mockDoc),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

const { generateDashboardPdf } = await import('./exportPdf');

function mockMetrics(): DashboardMetrics {
  return {
    totalProjects: 3,
    projects: [
      {
        id: 1,
        name: 'Project A',
        web_url: 'https://gitlab.com/a',
        metrics: {
          totalPipelines: 20,
          successfulPipelines: 18,
          failedPipelines: 2,
          canceledPipelines: 0,
          runningPipelines: 0,
          successRate: 90.0,
          avgDuration: 120,
          testMetrics: { total: 50, success: 48, failed: 2, skipped: 0, available: true },
          mainBranchPipeline: { id: 1, status: 'success', created_at: '2026-01-01', updated_at: '2026-01-01' },
          codeCoverage: { coverage: 85.0, available: true },
          mergeRequestCounts: { totalOpen: 2, drafts: 0 },
          recentCommits: [],
        },
      },
    ],
    aggregateMetrics: {
      totalPipelines: 60,
      successfulPipelines: 54,
      failedPipelines: 6,
      canceledPipelines: 0,
      runningPipelines: 0,
      avgSuccessRate: 90.0,
      avgDuration: 120,
      testMetrics: { total: 150, success: 144, failed: 6, skipped: 0, available: true },
    },
  };
}

function mockConfig(): DashboardConfig {
  return {
    version: 1,
    gitlabUrl: 'https://gitlab.com',
    token: 'test-token',
    timeframe: 30,
    groups: [],
    projects: [],
  };
}

function allOptions(): PdfExportOptions {
  return {
    includeSummary: true,
    includeProjectTable: true,
    includeTrendCharts: true,
    includeEnvironmentMatrix: true,
    includeDetailedBreakdown: false,
  };
}

describe('generateDashboardPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNumberOfPages.mockReturnValue(1);
  });

  it('generates and saves a PDF file', async () => {
    await generateDashboardPdf(mockMetrics(), allOptions(), mockConfig(), {});
    expect(mockSave).toHaveBeenCalledTimes(1);
    const filename = mockSave.mock.calls[0][0];
    expect(filename).toMatch(/^gitlab-dashboard-report-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('adds header with title', async () => {
    await generateDashboardPdf(mockMetrics(), allOptions(), mockConfig(), {});
    // Should call text with the title
    expect(mockText).toHaveBeenCalledWith(
      'GitLab CI/CD Dashboard Report',
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('adds summary section when includeSummary is true', async () => {
    await generateDashboardPdf(mockMetrics(), { ...allOptions(), includeSummary: true }, mockConfig(), {});
    // Should include "Summary" text
    const textCalls = mockText.mock.calls.map(c => c[0]);
    expect(textCalls).toContain('Summary');
  });

  it('skips summary section when includeSummary is false', async () => {
    await generateDashboardPdf(
      mockMetrics(),
      { ...allOptions(), includeSummary: false, includeProjectTable: false, includeTrendCharts: false, includeEnvironmentMatrix: false },
      mockConfig(),
      {}
    );
    const textCalls = mockText.mock.calls.map(c => c[0]);
    expect(textCalls).not.toContain('Summary');
  });

  it('calls autoTable when includeProjectTable is true', async () => {
    await generateDashboardPdf(mockMetrics(), { ...allOptions(), includeProjectTable: true }, mockConfig(), {});
    expect(mockAutoTable).toHaveBeenCalled();
  });

  it('skips project table when includeProjectTable is false', async () => {
    await generateDashboardPdf(
      mockMetrics(),
      { ...allOptions(), includeProjectTable: false, includeEnvironmentMatrix: false },
      mockConfig(),
      {}
    );
    // autoTable may still be called for env matrix, so check no "Project Metrics" heading
    const textCalls = mockText.mock.calls.map(c => c[0]);
    expect(textCalls).not.toContain('Project Metrics');
  });

  it('adds chart images when provided', async () => {
    const chartImages = {
      successRate: 'data:image/png;base64,iVBOR...',
      duration: 'data:image/png;base64,iVBOR...',
    };
    await generateDashboardPdf(mockMetrics(), allOptions(), mockConfig(), chartImages);
    expect(mockAddImage).toHaveBeenCalledTimes(2);
  });

  it('skips charts when includeTrendCharts is false', async () => {
    const chartImages = {
      successRate: 'data:image/png;base64,iVBOR...',
    };
    await generateDashboardPdf(
      mockMetrics(),
      { ...allOptions(), includeTrendCharts: false },
      mockConfig(),
      chartImages
    );
    expect(mockAddImage).not.toHaveBeenCalled();
  });

  it('adds environment matrix when deployment data is available', async () => {
    const deploymentCache = new Map<number, DeploymentsByEnv>();
    deploymentCache.set(1, {
      projectId: 1,
      loading: false,
      deployments: {
        dev: {
          jobId: 1, jobName: 'deploy', environment: 'dev',
          version: '1.0.0', status: 'success', timestamp: '2026-01-01',
          pipelineId: 1, pipelineRef: 'main', jobUrl: 'http://test',
        },
      },
    });

    await generateDashboardPdf(
      mockMetrics(),
      { ...allOptions(), includeEnvironmentMatrix: true },
      mockConfig(),
      {},
      deploymentCache
    );

    const textCalls = mockText.mock.calls.map(c => c[0]);
    expect(textCalls).toContain('Environment Matrix');
  });

  it('adds footer with page numbers', async () => {
    mockGetNumberOfPages.mockReturnValue(2);
    await generateDashboardPdf(mockMetrics(), allOptions(), mockConfig(), {});
    // setPage should be called for each page
    expect(mockSetPage).toHaveBeenCalledWith(1);
    expect(mockSetPage).toHaveBeenCalledWith(2);
    // Should have "Generated by" text
    const textCalls = mockText.mock.calls.map(c => c[0]);
    expect(textCalls).toContain('Generated by GitLab CI/CD Dashboard');
  });
});

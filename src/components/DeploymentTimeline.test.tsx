import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DeploymentTimeline from './DeploymentTimeline';
import DashboardDataService from '../services/DashboardDataService';
import GitLabApiService from '../services/GitLabApiService';
import { Project, DeploymentHistoryEntry, EnvironmentName, DeploymentStatus } from '../types';
import '@testing-library/jest-dom';

// Mock services
vi.mock('../services/DashboardDataService');
vi.mock('../services/GitLabApiService');

// Mock CSS imports
vi.mock('../styles/DeploymentTimeline.css', () => ({}));

function makeEntry(overrides: Partial<DeploymentHistoryEntry> = {}): DeploymentHistoryEntry {
  return {
    jobId: Math.floor(Math.random() * 100000),
    jobName: 'deploy-to-dev',
    environment: 'dev' as EnvironmentName,
    version: '1.0.0',
    status: 'success' as DeploymentStatus,
    timestamp: '2026-01-28T14:30:00Z',
    pipelineId: 100,
    pipelineRef: 'main',
    jobUrl: 'https://gitlab.com/job/1',
    pipelineUrl: 'https://gitlab.com/pipeline/100',
    projectId: 1,
    projectName: 'test-project',
    isRollback: false,
    ...overrides,
  };
}

describe('DeploymentTimeline', () => {
  let mockDashboardService: DashboardDataService;

  const mockProjects: Project[] = [
    {
      id: 1,
      name: 'alpha-service',
      web_url: 'https://gitlab.com/alpha',
      metrics: {} as Project['metrics'],
    },
    {
      id: 2,
      name: 'beta-service',
      web_url: 'https://gitlab.com/beta',
      metrics: {} as Project['metrics'],
    },
  ];

  const mockHistory: DeploymentHistoryEntry[] = [
    makeEntry({
      jobId: 1,
      projectId: 1,
      projectName: 'alpha-service',
      environment: 'dev',
      version: '2.0.0',
      status: 'success',
      timestamp: '2026-01-28T14:00:00Z',
    }),
    makeEntry({
      jobId: 2,
      projectId: 1,
      projectName: 'alpha-service',
      environment: 'uat',
      version: '1.9.0',
      status: 'failed',
      timestamp: '2026-01-28T10:00:00Z',
    }),
    makeEntry({
      jobId: 3,
      projectId: 2,
      projectName: 'beta-service',
      environment: 'prod',
      version: '1.5.0',
      status: 'success',
      isRollback: true,
      rolledBackFrom: '1.6.0',
      timestamp: '2026-01-27T16:00:00Z',
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    const mockGitLabService = new GitLabApiService();
    mockDashboardService = new DashboardDataService(mockGitLabService);

    // Default: return history for project 1, empty for project 2
    vi.mocked(mockDashboardService.getProjectDeploymentHistory).mockImplementation(
      async (projectId: number) => {
        if (projectId === 1) return [mockHistory[0], mockHistory[1]];
        if (projectId === 2) return [mockHistory[2]];
        return [];
      }
    );

    // detectRollbacks is a pass-through in tests (data already has flags)
    vi.mocked(mockDashboardService.detectRollbacks).mockImplementation(
      (history) => history
    );
  });

  it('shows loading state initially', () => {
    // Make the service never resolve
    vi.mocked(mockDashboardService.getProjectDeploymentHistory).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <DeploymentTimeline
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    expect(screen.getByText(/Loading deployment history/i)).toBeInTheDocument();
  });

  it('renders deployment entries after loading', async () => {
    render(
      <DeploymentTimeline
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/3 total deployments/)).toBeInTheDocument();
    });

    // Should show project names in timeline entries (also in dropdown, so use getAllByText)
    const alphaElements = screen.getAllByText('alpha-service');
    expect(alphaElements.length).toBeGreaterThanOrEqual(1);
    const betaElements = screen.getAllByText('beta-service');
    expect(betaElements.length).toBeGreaterThanOrEqual(1);
  });

  it('groups entries by date', async () => {
    render(
      <DeploymentTimeline
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/3 total deployments/)).toBeInTheDocument();
    });

    // Two dates should be present (28 Jan and 27 Jan)
    const dayHeaders = document.querySelectorAll('.timeline-day');
    expect(dayHeaders.length).toBeGreaterThanOrEqual(2);
  });

  it('shows rollback styling for rollback entries', async () => {
    render(
      <DeploymentTimeline
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/3 total deployments/)).toBeInTheDocument();
    });

    // Should show rollback annotation
    expect(screen.getByText(/Rolled back from v1\.6\.0/)).toBeInTheDocument();

    // Should show rollback icon
    expect(screen.getByText('⏪')).toBeInTheDocument();
  });

  it('shows empty state when no deployments found', async () => {
    vi.mocked(mockDashboardService.getProjectDeploymentHistory).mockResolvedValue([]);

    render(
      <DeploymentTimeline
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No deployments found/)).toBeInTheDocument();
    });
  });

  it('filters by status checkbox', async () => {
    render(
      <DeploymentTimeline
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/3 total deployments/)).toBeInTheDocument();
    });

    // Check the "failed" checkbox
    const failedCheckbox = screen.getByRole('checkbox', { name: /failed/i });
    fireEvent.click(failedCheckbox);

    // Should show filtered count
    await waitFor(() => {
      expect(screen.getByText(/1 of 3 deployments/)).toBeInTheDocument();
    });
  });

  it('clear filters resets all', async () => {
    render(
      <DeploymentTimeline
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/3 total deployments/)).toBeInTheDocument();
    });

    // Apply a filter
    const failedCheckbox = screen.getByRole('checkbox', { name: /failed/i });
    fireEvent.click(failedCheckbox);

    await waitFor(() => {
      expect(screen.getByText(/1 of 3 deployments/)).toBeInTheDocument();
    });

    // Clear filters
    const clearBtn = screen.getByText('Clear Filters');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText(/3 of 3 deployments/)).toBeInTheDocument();
    });
  });

  it('fetches history for all projects', async () => {
    render(
      <DeploymentTimeline
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(mockDashboardService.getProjectDeploymentHistory).toHaveBeenCalledTimes(2);
    });

    expect(mockDashboardService.getProjectDeploymentHistory).toHaveBeenCalledWith(1, 'alpha-service');
    expect(mockDashboardService.getProjectDeploymentHistory).toHaveBeenCalledWith(2, 'beta-service');
  });

  it('calls detectRollbacks after fetching', async () => {
    render(
      <DeploymentTimeline
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(mockDashboardService.detectRollbacks).toHaveBeenCalledTimes(1);
    });
  });
});

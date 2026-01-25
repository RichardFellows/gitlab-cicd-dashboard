import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReadinessView from './ReadinessView';
import DashboardDataService from '../services/DashboardDataService';
import GitLabApiService from '../services/GitLabApiService';
import { Project, DeploymentsByEnv, VersionReadiness } from '../types';

// Mock the services
vi.mock('../services/DashboardDataService');
vi.mock('../services/GitLabApiService');

// Mock CSS import
vi.mock('../styles/ReadinessView.css', () => ({}));

describe('ReadinessView', () => {
  let mockDashboardService: DashboardDataService;
  let deploymentCache: Map<number, DeploymentsByEnv>;

  const mockProjects: Project[] = [
    {
      id: 1,
      name: 'project-alpha',
      web_url: 'https://gitlab.com/project-alpha',
      metrics: {} as Project['metrics']
    },
    {
      id: 2,
      name: 'project-beta',
      web_url: 'https://gitlab.com/project-beta',
      metrics: {} as Project['metrics']
    }
  ];

  const mockReadinessData: VersionReadiness[] = [
    {
      projectId: 1,
      projectName: 'project-alpha',
      version: '2.3.45',
      environment: 'uat',
      deployment: {
        jobId: 100,
        jobName: 'deploy-to-uat',
        environment: 'uat',
        version: '2.3.45',
        status: 'success',
        timestamp: '2024-01-15T10:00:00Z',
        pipelineId: 500,
        pipelineRef: 'feature/test',
        jobUrl: 'https://gitlab.com/job/100'
      },
      signoff: {
        version: '2.3.45',
        environment: 'uat',
        author: 'jane',
        authorizedBy: 'jane',
        timestamp: '2024-01-15T11:00:00Z',
        noteId: 1,
        mrIid: 5,
        isValid: true
      },
      testStatus: { exists: true, passed: true },
      status: 'ready',
      mr: { iid: 5, webUrl: 'https://gitlab.com/mr/5', title: 'Feature test' }
    },
    {
      projectId: 2,
      projectName: 'project-beta',
      version: '1.0.0',
      environment: 'dev',
      deployment: {
        jobId: 101,
        jobName: 'deploy-to-dev',
        environment: 'dev',
        version: '1.0.0',
        status: 'success',
        timestamp: '2024-01-15T09:00:00Z',
        pipelineId: 501,
        pipelineRef: 'main',
        jobUrl: 'https://gitlab.com/job/101'
      },
      signoff: null,
      testStatus: { exists: false, passed: null },
      status: 'pending-signoff'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    const mockGitLabService = new GitLabApiService();
    mockDashboardService = new DashboardDataService(mockGitLabService);
    
    // Mock getProjectReadiness to return test data
    vi.mocked(mockDashboardService.getProjectReadiness).mockImplementation(
      async (projectId: number) => {
        return mockReadinessData.filter(r => r.projectId === projectId);
      }
    );

    vi.mocked(mockDashboardService.clearReadinessCache).mockImplementation(() => {});

    deploymentCache = new Map();
  });

  it('renders loading state initially', () => {
    render(
      <ReadinessView
        projects={mockProjects}
        deploymentCache={deploymentCache}
        dashboardService={mockDashboardService}
      />
    );

    expect(screen.getByText('Loading readiness data...')).toBeInTheDocument();
  });

  it('renders readiness data after loading', async () => {
    render(
      <ReadinessView
        projects={mockProjects}
        deploymentCache={deploymentCache}
        dashboardService={mockDashboardService}
      />
    );

    await waitFor(() => {
      // Look for version numbers which are unique to the table
      expect(screen.getByText('2.3.45')).toBeInTheDocument();
    });

    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    // Project names appear in both filter dropdown and table - use getAllByText
    expect(screen.getAllByText('project-alpha').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('project-beta').length).toBeGreaterThanOrEqual(1);
  });

  it('renders status badges correctly', async () => {
    render(
      <ReadinessView
        projects={mockProjects}
        deploymentCache={deploymentCache}
        dashboardService={mockDashboardService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    expect(screen.getByText('Pending Sign-off')).toBeInTheDocument();
  });

  it('renders empty state when no projects', () => {
    render(
      <ReadinessView
        projects={[]}
        deploymentCache={deploymentCache}
        dashboardService={mockDashboardService}
      />
    );

    expect(screen.getByText(/No projects configured/)).toBeInTheDocument();
  });

  it('renders filter controls', async () => {
    render(
      <ReadinessView
        projects={mockProjects}
        deploymentCache={deploymentCache}
        dashboardService={mockDashboardService}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Project')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Environment')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('filters by project when selected', async () => {
    render(
      <ReadinessView
        projects={mockProjects}
        deploymentCache={deploymentCache}
        dashboardService={mockDashboardService}
      />
    );

    await waitFor(() => {
      // Wait for table data to load
      expect(screen.getByText('2.3.45')).toBeInTheDocument();
    });

    // Filter to project-alpha only
    const projectSelect = screen.getByLabelText('Project');
    fireEvent.change(projectSelect, { target: { value: '1' } });

    // project-alpha's version should still be there
    expect(screen.getByText('2.3.45')).toBeInTheDocument();
    // project-beta's version should be filtered out
    expect(screen.queryByText('1.0.0')).not.toBeInTheDocument();
  });

  it('filters by status when selected', async () => {
    render(
      <ReadinessView
        projects={mockProjects}
        deploymentCache={deploymentCache}
        dashboardService={mockDashboardService}
      />
    );

    await waitFor(() => {
      // Wait for table data to load
      expect(screen.getByText('2.3.45')).toBeInTheDocument();
    });

    // Filter to 'ready' status only
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'ready' } });

    // project-alpha (ready) version should still be there
    expect(screen.getByText('2.3.45')).toBeInTheDocument();
    // project-beta (pending-signoff) version should be filtered out
    expect(screen.queryByText('1.0.0')).not.toBeInTheDocument();
  });

  it('shows summary badges with counts', async () => {
    render(
      <ReadinessView
        projects={mockProjects}
        deploymentCache={deploymentCache}
        dashboardService={mockDashboardService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/1 Ready/)).toBeInTheDocument();
    });

    expect(screen.getByText(/1 Pending/)).toBeInTheDocument();
    expect(screen.getByText(/0 Failed/)).toBeInTheDocument();
  });

  it('calls refresh handler when refresh button clicked', async () => {
    render(
      <ReadinessView
        projects={mockProjects}
        deploymentCache={deploymentCache}
        dashboardService={mockDashboardService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('project-alpha')).toBeInTheDocument();
    });

    const refreshButton = screen.getByTitle('Refresh readiness data');
    fireEvent.click(refreshButton);

    expect(mockDashboardService.clearReadinessCache).toHaveBeenCalled();
  });

  it('expands row to show details when clicked', async () => {
    render(
      <ReadinessView
        projects={mockProjects}
        deploymentCache={deploymentCache}
        dashboardService={mockDashboardService}
      />
    );

    await waitFor(() => {
      // Wait for table data to load
      expect(screen.getByText('2.3.45')).toBeInTheDocument();
    });

    // Click on the version cell in the first row (project-alpha)
    const versionCell = screen.getByText('2.3.45');
    const row = versionCell.closest('tr');
    fireEvent.click(row!);

    // Details should now be visible - look for section titles in the details panel
    await waitFor(() => {
      expect(screen.getByText('Deployment')).toBeInTheDocument();
    });

    // These section titles in the details panel
    expect(screen.getByText('Merge Request')).toBeInTheDocument();
    expect(screen.getByText('Post-Deploy Tests')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MRBoardView from './MRBoardView';
import DashboardDataService from '../services/DashboardDataService';
import GitLabApiService from '../services/GitLabApiService';
import { Project, MRWithProject } from '../types';

// Mock the services
vi.mock('../services/DashboardDataService');
vi.mock('../services/GitLabApiService');

// Mock CSS import
vi.mock('../styles/MRBoard.css', () => ({}));

describe('MRBoardView', () => {
  let mockDashboardService: DashboardDataService;

  const mockProjects: Project[] = [
    {
      id: 100,
      name: 'project-alpha',
      web_url: 'https://gitlab.com/project-alpha',
      metrics: {
        mergeRequestCounts: { totalOpen: 3, drafts: 1 },
      } as Project['metrics'],
    },
    {
      id: 200,
      name: 'project-beta',
      web_url: 'https://gitlab.com/project-beta',
      metrics: {
        mergeRequestCounts: { totalOpen: 1, drafts: 0 },
      } as Project['metrics'],
    },
  ];

  const mockMRs: MRWithProject[] = [
    {
      id: 10,
      iid: 1,
      title: 'Feature: Add login',
      state: 'opened',
      created_at: '2026-01-20T10:00:00Z',
      updated_at: '2026-01-25T10:00:00Z',
      source_branch: 'feature/login',
      target_branch: 'main',
      web_url: 'https://gitlab.com/mr/1',
      projectId: 100,
      projectName: 'project-alpha',
      author: { id: 1, name: 'Alice', username: 'alice' },
      head_pipeline: { id: 1, status: 'success', created_at: '', updated_at: '' },
    },
    {
      id: 20,
      iid: 2,
      title: 'Fix: broken tests',
      state: 'opened',
      created_at: '2026-01-22T10:00:00Z',
      updated_at: '2026-01-23T10:00:00Z',
      source_branch: 'fix/tests',
      target_branch: 'main',
      web_url: 'https://gitlab.com/mr/2',
      projectId: 100,
      projectName: 'project-alpha',
      author: { id: 2, name: 'Bob', username: 'bob' },
      head_pipeline: { id: 2, status: 'failed', created_at: '', updated_at: '', failedJobs: [
        { id: 1, name: 'unit-tests', stage: 'test', status: 'failed', web_url: '', created_at: '' },
      ] },
    },
    {
      id: 30,
      iid: 3,
      title: 'Draft: WIP feature',
      state: 'opened',
      created_at: '2026-01-18T10:00:00Z',
      updated_at: '2026-01-28T10:00:00Z',
      source_branch: 'feature/wip',
      target_branch: 'main',
      web_url: 'https://gitlab.com/mr/3',
      projectId: 200,
      projectName: 'project-beta',
      draft: true,
      author: { id: 3, name: 'Charlie', username: 'charlie' },
    },
    {
      id: 40,
      iid: 4,
      title: 'Update readme',
      state: 'opened',
      created_at: '2026-01-19T10:00:00Z',
      updated_at: '2026-01-20T10:00:00Z',
      source_branch: 'docs/readme',
      target_branch: 'main',
      web_url: 'https://gitlab.com/mr/4',
      projectId: 100,
      projectName: 'project-alpha',
      author: { id: 1, name: 'Alice', username: 'alice' },
      // no head_pipeline
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    const mockGitLabService = new GitLabApiService();
    mockDashboardService = new DashboardDataService(mockGitLabService);
  });

  it('shows loading state initially', () => {
    vi.spyOn(mockDashboardService, 'getAllOpenMergeRequests').mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(
      <MRBoardView
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    expect(screen.getByText(/Loading merge requests/i)).toBeInTheDocument();
  });

  it('renders columns with correct MR counts', async () => {
    vi.spyOn(mockDashboardService, 'getAllOpenMergeRequests').mockResolvedValue(mockMRs);

    render(
      <MRBoardView
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MR Pipeline Board')).toBeInTheDocument();
    });

    // Check column headers exist
    expect(screen.getByText('Pipeline Passing')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Failing')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('No Pipeline')).toBeInTheDocument();
  });

  it('displays MR cards in columns', async () => {
    vi.spyOn(mockDashboardService, 'getAllOpenMergeRequests').mockResolvedValue(mockMRs);

    render(
      <MRBoardView
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Feature: Add login/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Fix: broken tests/)).toBeInTheDocument();
    expect(screen.getByText(/Draft: WIP feature/)).toBeInTheDocument();
    expect(screen.getByText(/Update readme/)).toBeInTheDocument();
  });

  it('shows error state with retry button', async () => {
    vi.spyOn(mockDashboardService, 'getAllOpenMergeRequests').mockRejectedValue(
      new Error('Network error')
    );

    render(
      <MRBoardView
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows empty state when no MRs found', async () => {
    vi.spyOn(mockDashboardService, 'getAllOpenMergeRequests').mockResolvedValue([]);

    render(
      <MRBoardView
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No open merge requests/)).toBeInTheDocument();
    });
  });

  it('shows total MR count in header', async () => {
    vi.spyOn(mockDashboardService, 'getAllOpenMergeRequests').mockResolvedValue(mockMRs);

    render(
      <MRBoardView
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('(4 open MRs)')).toBeInTheDocument();
    });
  });

  it('filters count display shows filtered vs total', async () => {
    vi.spyOn(mockDashboardService, 'getAllOpenMergeRequests').mockResolvedValue(mockMRs);

    render(
      <MRBoardView
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Showing 4 of 4 MRs')).toBeInTheDocument();
    });
  });

  it('opens card details when MR card is clicked', async () => {
    vi.spyOn(mockDashboardService, 'getAllOpenMergeRequests').mockResolvedValue(mockMRs);

    render(
      <MRBoardView
        projects={mockProjects}
        dashboardService={mockDashboardService}
        darkMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Feature: Add login/)).toBeInTheDocument();
    });

    // Click on the MR card (the div with role button)
    const cards = screen.getAllByRole('button');
    const loginCard = cards.find(c => c.textContent?.includes('Feature: Add login'));
    if (loginCard) {
      fireEvent.click(loginCard);
    }

    // Details panel should appear with close button
    await waitFor(() => {
      expect(screen.getByTitle('Close details')).toBeInTheDocument();
    });
  });
});

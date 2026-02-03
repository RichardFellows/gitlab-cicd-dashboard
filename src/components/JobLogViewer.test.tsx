import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import JobLogViewer from './JobLogViewer';
import GitLabApiService from '../services/GitLabApiService';

// Mock GitLabApiService
vi.mock('../services/GitLabApiService', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getJobTrace: vi.fn(),
      privateToken: 'test-token',
      baseUrl: 'https://gitlab.com/api/v4',
      useProxy: false,
      proxyUrl: '/proxy',
      defaultBranch: 'main',
    })),
  };
});

describe('JobLogViewer', () => {
  let mockService: GitLabApiService;

  beforeEach(() => {
    mockService = new GitLabApiService();
    vi.clearAllMocks();
    // Clear log cache between tests by forcing fresh module
    // The cache is module-level so we need to reset it carefully
  });

  it('renders loading state while fetching', () => {
    // Make getJobTrace return a pending promise
    (mockService.getJobTrace as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}) // never resolves
    );

    render(
      <JobLogViewer
        projectId={1}
        jobId={999}
        jobWebUrl="https://gitlab.com/job/999"
        gitLabService={mockService}
      />
    );

    expect(screen.getByText('Loading log...')).toBeInTheDocument();
  });

  it('renders error state when log is unavailable', async () => {
    (mockService.getJobTrace as ReturnType<typeof vi.fn>).mockResolvedValue('');

    render(
      <JobLogViewer
        projectId={1}
        jobId={998}
        jobWebUrl="https://gitlab.com/job/998"
        gitLabService={mockService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Log unavailable')).toBeInTheDocument();
    });

    // Should have retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
    // Should have GitLab link
    expect(screen.getByText('View in GitLab ↗')).toBeInTheDocument();
  });

  it('renders highlighted log lines when fetch succeeds', async () => {
    const logText = 'Step 1: setup\nERROR: build failed\nStep 3: cleanup';
    (mockService.getJobTrace as ReturnType<typeof vi.fn>).mockResolvedValue(logText);

    render(
      <JobLogViewer
        projectId={1}
        jobId={997}
        jobWebUrl="https://gitlab.com/job/997"
        gitLabService={mockService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Step 1: setup')).toBeInTheDocument();
    });

    expect(screen.getByText('ERROR: build failed')).toBeInTheDocument();
    expect(screen.getByText('Step 3: cleanup')).toBeInTheDocument();

    // Check line numbers
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders "View Full Log in GitLab" footer link', async () => {
    (mockService.getJobTrace as ReturnType<typeof vi.fn>).mockResolvedValue('some log text');

    render(
      <JobLogViewer
        projectId={1}
        jobId={996}
        jobWebUrl="https://gitlab.com/job/996"
        gitLabService={mockService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('View Full Log in GitLab ↗')).toBeInTheDocument();
    });

    const link = screen.getByText('View Full Log in GitLab ↗');
    expect(link.closest('a')).toHaveAttribute('href', 'https://gitlab.com/job/996');
  });

  it('calls onCategoryDetected when log is loaded', async () => {
    const logText = 'npm ERR! code ERESOLVE';
    (mockService.getJobTrace as ReturnType<typeof vi.fn>).mockResolvedValue(logText);
    const onCategory = vi.fn();

    render(
      <JobLogViewer
        projectId={1}
        jobId={995}
        jobWebUrl="https://gitlab.com/job/995"
        gitLabService={mockService}
        onCategoryDetected={onCategory}
      />
    );

    await waitFor(() => {
      expect(onCategory).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'dependency' })
      );
    });
  });

  it('renders search input', async () => {
    (mockService.getJobTrace as ReturnType<typeof vi.fn>).mockResolvedValue('line1\nline2\nline3');

    render(
      <JobLogViewer
        projectId={1}
        jobId={994}
        jobWebUrl="https://gitlab.com/job/994"
        gitLabService={mockService}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search log...')).toBeInTheDocument();
    });
  });

  it('filters log lines when searching', async () => {
    const logText = 'alpha line\nbeta line\ngamma line';
    (mockService.getJobTrace as ReturnType<typeof vi.fn>).mockResolvedValue(logText);

    render(
      <JobLogViewer
        projectId={1}
        jobId={993}
        jobWebUrl="https://gitlab.com/job/993"
        gitLabService={mockService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('alpha line')).toBeInTheDocument();
    });

    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search log...');
    fireEvent.change(searchInput, { target: { value: 'beta' } });

    // Only beta line should be visible
    expect(screen.getByText('beta line')).toBeInTheDocument();
    expect(screen.queryByText('alpha line')).not.toBeInTheDocument();
    expect(screen.queryByText('gamma line')).not.toBeInTheDocument();
  });

  it('renders copy button', async () => {
    (mockService.getJobTrace as ReturnType<typeof vi.fn>).mockResolvedValue('log content');

    render(
      <JobLogViewer
        projectId={1}
        jobId={992}
        jobWebUrl="https://gitlab.com/job/992"
        gitLabService={mockService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('📋 Copy')).toBeInTheDocument();
    });
  });

  it('retries fetching on retry button click', async () => {
    (mockService.getJobTrace as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce('') // first: empty = error
      .mockResolvedValueOnce('retry log content'); // second: success

    render(
      <JobLogViewer
        projectId={1}
        jobId={991}
        jobWebUrl="https://gitlab.com/job/991"
        gitLabService={mockService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Log unavailable')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('retry log content')).toBeInTheDocument();
    });
  });

  it('applies dark mode class', async () => {
    (mockService.getJobTrace as ReturnType<typeof vi.fn>).mockResolvedValue('log');

    const { container } = render(
      <JobLogViewer
        projectId={1}
        jobId={990}
        jobWebUrl="https://gitlab.com/job/990"
        gitLabService={mockService}
        darkMode={true}
      />
    );

    await waitFor(() => {
      const viewer = container.querySelector('.job-log-viewer');
      expect(viewer?.classList.contains('dark')).toBe(true);
    });
  });
});

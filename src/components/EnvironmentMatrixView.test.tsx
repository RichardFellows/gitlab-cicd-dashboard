import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EnvironmentMatrixView from './EnvironmentMatrixView';
import DeploymentCell from './DeploymentCell';
import DeploymentDetails from './DeploymentDetails';
import { Project, DeploymentsByEnv, Deployment } from '../types';
import '@testing-library/jest-dom';

// Mock project data
const mockProjects: Project[] = [
  {
    id: 1,
    name: 'api-service',
    web_url: 'https://gitlab.com/project/api-service',
    metrics: {} as Project['metrics']
  },
  {
    id: 2,
    name: 'frontend-app',
    web_url: 'https://gitlab.com/project/frontend-app',
    metrics: {} as Project['metrics']
  }
];

// Mock deployment data
const mockDeployment: Deployment = {
  jobId: 123,
  jobName: 'deploy-to-dev',
  environment: 'dev',
  version: '2.3.45',
  status: 'success',
  timestamp: '2024-01-15T10:05:00Z',
  pipelineId: 100,
  pipelineIid: 50,
  pipelineRef: 'feature/JIRA-123-add-feature',
  jobUrl: 'https://gitlab.com/job/123',
  pipelineUrl: 'https://gitlab.com/pipeline/100',
  jiraKey: 'JIRA-123'
};

const mockDeploymentsByEnv: DeploymentsByEnv = {
  projectId: 1,
  deployments: {
    dev: mockDeployment,
    uat: {
      ...mockDeployment,
      environment: 'uat',
      version: '2.3.42',
      jobId: 122
    }
  },
  loading: false
};

describe('DeploymentCell', () => {
  it('renders loading state with spinner', () => {
    render(
      <table>
        <tbody>
          <tr>
            <DeploymentCell
              deployment={null}
              loading={true}
              isExpanded={false}
              onClick={() => {}}
            />
          </tr>
        </tbody>
      </table>
    );

    expect(screen.getByLabelText('Loading deployment info')).toBeInTheDocument();
  });

  it('renders empty state with placeholder', () => {
    render(
      <table>
        <tbody>
          <tr>
            <DeploymentCell
              deployment={null}
              loading={false}
              isExpanded={false}
              onClick={() => {}}
            />
          </tr>
        </tbody>
      </table>
    );

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders success deployment with version', () => {
    render(
      <table>
        <tbody>
          <tr>
            <DeploymentCell
              deployment={mockDeployment}
              loading={false}
              isExpanded={false}
              onClick={() => {}}
            />
          </tr>
        </tbody>
      </table>
    );

    expect(screen.getByText('2.3.45')).toBeInTheDocument();
  });

  it('renders failed deployment with correct styling', () => {
    const failedDeployment = { ...mockDeployment, status: 'failed' as const };
    
    render(
      <table>
        <tbody>
          <tr>
            <DeploymentCell
              deployment={failedDeployment}
              loading={false}
              isExpanded={false}
              onClick={() => {}}
            />
          </tr>
        </tbody>
      </table>
    );

    const cell = screen.getByRole('button');
    expect(cell).toHaveClass('deployment-cell--failed');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    
    render(
      <table>
        <tbody>
          <tr>
            <DeploymentCell
              deployment={mockDeployment}
              loading={false}
              isExpanded={false}
              onClick={handleClick}
            />
          </tr>
        </tbody>
      </table>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows expanded state styling', () => {
    render(
      <table>
        <tbody>
          <tr>
            <DeploymentCell
              deployment={mockDeployment}
              loading={false}
              isExpanded={true}
              onClick={() => {}}
            />
          </tr>
        </tbody>
      </table>
    );

    const cell = screen.getByRole('button');
    expect(cell).toHaveClass('deployment-cell--expanded');
  });
});

describe('DeploymentDetails', () => {
  it('renders deployment version', () => {
    render(<DeploymentDetails deployment={mockDeployment} />);

    expect(screen.getByText('2.3.45')).toBeInTheDocument();
  });

  it('renders environment name', () => {
    render(<DeploymentDetails deployment={mockDeployment} />);

    expect(screen.getByText('Deployment to DEV')).toBeInTheDocument();
  });

  it('renders success status', () => {
    render(<DeploymentDetails deployment={mockDeployment} />);

    expect(screen.getByText('✓ Success')).toBeInTheDocument();
  });

  it('renders failed status', () => {
    const failedDeployment = { ...mockDeployment, status: 'failed' as const };
    render(<DeploymentDetails deployment={failedDeployment} />);

    expect(screen.getByText('✗ Failed')).toBeInTheDocument();
  });

  it('renders branch name', () => {
    render(<DeploymentDetails deployment={mockDeployment} />);

    expect(screen.getByText('feature/JIRA-123-add-feature')).toBeInTheDocument();
  });

  it('renders JIRA key as plain text when no base URL', () => {
    render(<DeploymentDetails deployment={mockDeployment} />);

    expect(screen.getByText('JIRA-123')).toBeInTheDocument();
    // Should not be a link
    expect(screen.queryByRole('link', { name: 'JIRA-123' })).not.toBeInTheDocument();
  });

  it('renders JIRA key as link when base URL provided', () => {
    render(
      <DeploymentDetails
        deployment={mockDeployment}
        jiraBaseUrl="https://jira.example.com/browse"
      />
    );

    const jiraLink = screen.getByRole('link', { name: 'JIRA-123' });
    expect(jiraLink).toHaveAttribute('href', 'https://jira.example.com/browse/JIRA-123');
  });

  it('renders job link', () => {
    render(<DeploymentDetails deployment={mockDeployment} />);

    const jobLink = screen.getByRole('link', { name: 'View Job' });
    expect(jobLink).toHaveAttribute('href', 'https://gitlab.com/job/123');
  });

  it('renders pipeline link', () => {
    render(<DeploymentDetails deployment={mockDeployment} />);

    const pipelineLink = screen.getByRole('link', { name: 'View Pipeline' });
    expect(pipelineLink).toHaveAttribute('href', 'https://gitlab.com/pipeline/100');
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<DeploymentDetails deployment={mockDeployment} onClose={handleClose} />);

    fireEvent.click(screen.getByLabelText('Close details'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('EnvironmentMatrixView', () => {
  const mockFetchDeployments = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no projects', () => {
    render(
      <EnvironmentMatrixView
        projects={[]}
        deploymentCache={new Map()}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    expect(screen.getByText(/No projects configured/)).toBeInTheDocument();
  });

  it('renders environment column headers', () => {
    render(
      <EnvironmentMatrixView
        projects={mockProjects}
        deploymentCache={new Map()}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    expect(screen.getByText('DEV')).toBeInTheDocument();
    expect(screen.getByText('SIT')).toBeInTheDocument();
    expect(screen.getByText('UAT')).toBeInTheDocument();
    expect(screen.getByText('PROD')).toBeInTheDocument();
  });

  it('renders project names', () => {
    render(
      <EnvironmentMatrixView
        projects={mockProjects}
        deploymentCache={new Map()}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    expect(screen.getByText('api-service')).toBeInTheDocument();
    expect(screen.getByText('frontend-app')).toBeInTheDocument();
  });

  it('fetches deployments for projects on mount', () => {
    render(
      <EnvironmentMatrixView
        projects={mockProjects}
        deploymentCache={new Map()}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    // Should fetch for both projects
    expect(mockFetchDeployments).toHaveBeenCalledWith(1);
    expect(mockFetchDeployments).toHaveBeenCalledWith(2);
  });

  it('does not re-fetch if deployment already cached', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, mockDeploymentsByEnv);

    render(
      <EnvironmentMatrixView
        projects={mockProjects}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    // Should only fetch for project 2
    expect(mockFetchDeployments).not.toHaveBeenCalledWith(1);
    expect(mockFetchDeployments).toHaveBeenCalledWith(2);
  });

  it('displays deployment versions from cache', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, mockDeploymentsByEnv);

    render(
      <EnvironmentMatrixView
        projects={mockProjects}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    expect(screen.getByText('2.3.45')).toBeInTheDocument();
    expect(screen.getByText('2.3.42')).toBeInTheDocument();
  });

  it('expands details when cell clicked', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, mockDeploymentsByEnv);

    render(
      <EnvironmentMatrixView
        projects={mockProjects}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    // Click on the dev cell (first version displayed)
    fireEvent.click(screen.getByText('2.3.45').closest('td')!);

    // Details should appear
    expect(screen.getByText('Deployment to DEV')).toBeInTheDocument();
    expect(screen.getByText('feature/JIRA-123-add-feature')).toBeInTheDocument();
  });

  it('shows error indicator when deployment fetch fails', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, {
      projectId: 1,
      deployments: {},
      loading: false,
      error: 'API error'
    });

    render(
      <EnvironmentMatrixView
        projects={mockProjects}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    // Error indicator should be visible
    expect(screen.getByTitle('API error')).toBeInTheDocument();
  });
});

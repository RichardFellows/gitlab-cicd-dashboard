import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EnvironmentMatrixView from './EnvironmentMatrixView';
import { Project, DeploymentsByEnv, Deployment } from '../types';
import '@testing-library/jest-dom';

const makeDeployment = (env: string, version: string): Deployment => ({
  jobId: 1,
  jobName: `deploy-${env}`,
  environment: env as any,
  version,
  status: 'success',
  timestamp: '2024-01-15T10:00:00Z',
  pipelineId: 100,
  pipelineRef: 'main',
  jobUrl: 'https://gitlab.com/job/1'
});

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
  },
  {
    id: 3,
    name: 'worker-service',
    web_url: 'https://gitlab.com/project/worker-service',
    metrics: {} as Project['metrics']
  }
];

describe('EnvironmentMatrixView - Version Drift Indicator', () => {
  const mockFetchDeployments = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows drift indicator when DEV version > PROD version', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.14.6'),
        prod: makeDeployment('prod', '1.10.8')
      },
      loading: false
    });

    render(
      <EnvironmentMatrixView
        projects={[mockProjects[0]]}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    // Should show drift badge next to project name
    const driftBadge = screen.getByTitle(/DEV 2.14.6 is ahead of PROD 1.10.8/);
    expect(driftBadge).toBeInTheDocument();
    expect(driftBadge).toHaveClass('environment-matrix__drift-badge');
  });

  it('shows tooltip with drift message on hover', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.8'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    });

    render(
      <EnvironmentMatrixView
        projects={[mockProjects[0]]}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    // Tooltip should show versions ahead
    const driftBadge = screen.getByTitle('DEV 2.3.8 is 3 versions ahead of PROD 2.3.5');
    expect(driftBadge).toBeInTheDocument();
  });

  it('shows summary count when projects have drift', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    
    // Project 1: has drift
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.8'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    });

    // Project 2: has drift
    cache.set(2, {
      projectId: 2,
      deployments: {
        dev: makeDeployment('dev', '5.0.0'),
        prod: makeDeployment('prod', '4.9.9')
      },
      loading: false
    });

    // Project 3: no drift
    cache.set(3, {
      projectId: 3,
      deployments: {
        dev: makeDeployment('dev', '1.0.0'),
        prod: makeDeployment('prod', '1.0.0')
      },
      loading: false
    });

    render(
      <EnvironmentMatrixView
        projects={mockProjects}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    // Should show summary count
    expect(screen.getByText('2 projects have unpromoted changes')).toBeInTheDocument();
  });

  it('shows singular form in summary when only 1 project has drift', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.8'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    });

    cache.set(2, {
      projectId: 2,
      deployments: {
        dev: makeDeployment('dev', '1.0.0'),
        prod: makeDeployment('prod', '1.0.0')
      },
      loading: false
    });

    render(
      <EnvironmentMatrixView
        projects={mockProjects.slice(0, 2)}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    expect(screen.getByText('1 project has unpromoted changes')).toBeInTheDocument();
  });

  it('does not show indicator when versions match', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.5'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    });

    render(
      <EnvironmentMatrixView
        projects={[mockProjects[0]]}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    // Should not show drift badge
    expect(screen.queryByTitle(/is ahead of/)).not.toBeInTheDocument();
    // Should not show summary
    expect(screen.queryByText(/unpromoted changes/)).not.toBeInTheDocument();
  });

  it('does not show indicator when PROD > DEV (rollback scenario)', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.5'),
        prod: makeDeployment('prod', '2.3.8')
      },
      loading: false
    });

    render(
      <EnvironmentMatrixView
        projects={[mockProjects[0]]}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    // Should not show drift badge
    expect(screen.queryByTitle(/is ahead of/)).not.toBeInTheDocument();
  });

  it('does not show indicator when DEV version is missing', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, {
      projectId: 1,
      deployments: {
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    });

    render(
      <EnvironmentMatrixView
        projects={[mockProjects[0]]}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    expect(screen.queryByTitle(/is ahead of/)).not.toBeInTheDocument();
  });

  it('does not show indicator when PROD version is missing', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.5')
      },
      loading: false
    });

    render(
      <EnvironmentMatrixView
        projects={[mockProjects[0]]}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    expect(screen.queryByTitle(/is ahead of/)).not.toBeInTheDocument();
  });

  it('highlights row when drift exists', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.8'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    });

    const { container } = render(
      <EnvironmentMatrixView
        projects={[mockProjects[0]]}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    // Find the row containing the project
    const row = container.querySelector('.environment-matrix__row--drift');
    expect(row).toBeInTheDocument();
  });

  it('does not highlight row when no drift', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.5'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    });

    const { container } = render(
      <EnvironmentMatrixView
        projects={[mockProjects[0]]}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    const row = container.querySelector('.environment-matrix__row--drift');
    expect(row).not.toBeInTheDocument();
  });

  it('handles multiple projects with mixed drift states', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    
    // Project 1: drift
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.8'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    });

    // Project 2: no drift
    cache.set(2, {
      projectId: 2,
      deployments: {
        dev: makeDeployment('dev', '1.0.0'),
        prod: makeDeployment('prod', '1.0.0')
      },
      loading: false
    });

    // Project 3: drift
    cache.set(3, {
      projectId: 3,
      deployments: {
        dev: makeDeployment('dev', '#200'),
        prod: makeDeployment('prod', '#150')
      },
      loading: false
    });

    const { container } = render(
      <EnvironmentMatrixView
        projects={mockProjects}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    // Should have 2 rows with drift
    const driftRows = container.querySelectorAll('.environment-matrix__row--drift');
    expect(driftRows.length).toBe(2);

    // Should show summary for 2 projects
    expect(screen.getByText('2 projects have unpromoted changes')).toBeInTheDocument();
  });

  it('hides summary when no projects have drift', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.5'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    });

    cache.set(2, {
      projectId: 2,
      deployments: {
        dev: makeDeployment('dev', '1.0.0'),
        prod: makeDeployment('prod', '1.0.0')
      },
      loading: false
    });

    render(
      <EnvironmentMatrixView
        projects={mockProjects.slice(0, 2)}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    expect(screen.queryByText(/unpromoted changes/)).not.toBeInTheDocument();
  });

  it('handles pipeline IID versions', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '#123'),
        prod: makeDeployment('prod', '#100')
      },
      loading: false
    });

    render(
      <EnvironmentMatrixView
        projects={[mockProjects[0]]}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    const driftBadge = screen.getByTitle(/DEV #123 is ahead of PROD #100/);
    expect(driftBadge).toBeInTheDocument();
  });

  it('handles v-prefixed versions', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', 'v2.3.8'),
        prod: makeDeployment('prod', 'v2.3.5')
      },
      loading: false
    });

    render(
      <EnvironmentMatrixView
        projects={[mockProjects[0]]}
        deploymentCache={cache}
        fetchProjectDeployments={mockFetchDeployments}
      />
    );

    const driftBadge = screen.getByTitle('DEV v2.3.8 is 3 versions ahead of PROD v2.3.5');
    expect(driftBadge).toBeInTheDocument();
  });
});

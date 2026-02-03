import { describe, it, expect } from 'vitest';
import { calculateVersionDrift, countProjectsWithDrift } from './versionDrift';
import { DeploymentsByEnv, Deployment } from '../types';

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

describe('calculateVersionDrift', () => {
  it('detects drift when DEV version > PROD version', () => {
    const deploymentData: DeploymentsByEnv = {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.14.6'),
        prod: makeDeployment('prod', '1.10.8')
      },
      loading: false
    };

    const drift = calculateVersionDrift(deploymentData);

    expect(drift.hasDrift).toBe(true);
    expect(drift.devVersion).toBe('2.14.6');
    expect(drift.prodVersion).toBe('1.10.8');
    expect(drift.message).toContain('DEV 2.14.6 is ahead of PROD 1.10.8');
  });

  it('calculates versions ahead for same major/minor', () => {
    const deploymentData: DeploymentsByEnv = {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.8'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    };

    const drift = calculateVersionDrift(deploymentData);

    expect(drift.hasDrift).toBe(true);
    expect(drift.versionsAhead).toBe(3);
    expect(drift.message).toBe('DEV 2.3.8 is 3 versions ahead of PROD 2.3.5');
  });

  it('shows no drift when versions match', () => {
    const deploymentData: DeploymentsByEnv = {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.5'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    };

    const drift = calculateVersionDrift(deploymentData);

    expect(drift.hasDrift).toBe(false);
    expect(drift.devVersion).toBe('2.3.5');
    expect(drift.prodVersion).toBe('2.3.5');
    expect(drift.message).toBeUndefined();
  });

  it('shows no drift when PROD > DEV (rollback scenario)', () => {
    const deploymentData: DeploymentsByEnv = {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.5'),
        prod: makeDeployment('prod', '2.3.8')
      },
      loading: false
    };

    const drift = calculateVersionDrift(deploymentData);

    expect(drift.hasDrift).toBe(false);
    expect(drift.devVersion).toBe('2.3.5');
    expect(drift.prodVersion).toBe('2.3.8');
  });

  it('shows no drift when DEV version is missing', () => {
    const deploymentData: DeploymentsByEnv = {
      projectId: 1,
      deployments: {
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    };

    const drift = calculateVersionDrift(deploymentData);

    expect(drift.hasDrift).toBe(false);
    expect(drift.devVersion).toBe(null);
    expect(drift.prodVersion).toBe('2.3.5');
  });

  it('shows no drift when PROD version is missing', () => {
    const deploymentData: DeploymentsByEnv = {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.5')
      },
      loading: false
    };

    const drift = calculateVersionDrift(deploymentData);

    expect(drift.hasDrift).toBe(false);
    expect(drift.devVersion).toBe('2.3.5');
    expect(drift.prodVersion).toBe(null);
  });

  it('shows no drift when both versions are missing', () => {
    const deploymentData: DeploymentsByEnv = {
      projectId: 1,
      deployments: {},
      loading: false
    };

    const drift = calculateVersionDrift(deploymentData);

    expect(drift.hasDrift).toBe(false);
    expect(drift.devVersion).toBe(null);
    expect(drift.prodVersion).toBe(null);
  });

  it('shows no drift when deployment data is loading', () => {
    const deploymentData: DeploymentsByEnv = {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.8'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: true
    };

    const drift = calculateVersionDrift(deploymentData);

    expect(drift.hasDrift).toBe(false);
  });

  it('shows no drift when deployment data is undefined', () => {
    const drift = calculateVersionDrift(undefined);

    expect(drift.hasDrift).toBe(false);
    expect(drift.devVersion).toBe(null);
    expect(drift.prodVersion).toBe(null);
  });

  it('handles pipeline IID versions', () => {
    const deploymentData: DeploymentsByEnv = {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '#123'),
        prod: makeDeployment('prod', '#100')
      },
      loading: false
    };

    const drift = calculateVersionDrift(deploymentData);

    expect(drift.hasDrift).toBe(true);
    expect(drift.message).toContain('DEV #123 is ahead of PROD #100');
  });

  it('handles v-prefixed versions', () => {
    const deploymentData: DeploymentsByEnv = {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', 'v2.3.8'),
        prod: makeDeployment('prod', 'v2.3.5')
      },
      loading: false
    };

    const drift = calculateVersionDrift(deploymentData);

    expect(drift.hasDrift).toBe(true);
    expect(drift.versionsAhead).toBe(3);
  });

  it('handles different major versions', () => {
    const deploymentData: DeploymentsByEnv = {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '3.0.0'),
        prod: makeDeployment('prod', '2.9.9')
      },
      loading: false
    };

    const drift = calculateVersionDrift(deploymentData);

    expect(drift.hasDrift).toBe(true);
    // versionsAhead undefined when major/minor differ
    expect(drift.versionsAhead).toBeUndefined();
    expect(drift.message).toBe('DEV 3.0.0 is ahead of PROD 2.9.9');
  });

  it('handles single version difference', () => {
    const deploymentData: DeploymentsByEnv = {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.6'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    };

    const drift = calculateVersionDrift(deploymentData);

    expect(drift.hasDrift).toBe(true);
    expect(drift.versionsAhead).toBe(1);
    // Single version uses simpler message
    expect(drift.message).toBe('DEV 2.3.6 is ahead of PROD 2.3.5');
  });
});

describe('countProjectsWithDrift', () => {
  it('counts projects with drift correctly', () => {
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

    // Project 2: no drift (versions match)
    cache.set(2, {
      projectId: 2,
      deployments: {
        dev: makeDeployment('dev', '1.0.0'),
        prod: makeDeployment('prod', '1.0.0')
      },
      loading: false
    });

    // Project 3: has drift
    cache.set(3, {
      projectId: 3,
      deployments: {
        dev: makeDeployment('dev', '5.0.0'),
        prod: makeDeployment('prod', '4.9.9')
      },
      loading: false
    });

    // Project 4: no drift (rollback scenario)
    cache.set(4, {
      projectId: 4,
      deployments: {
        dev: makeDeployment('dev', '2.0.0'),
        prod: makeDeployment('prod', '2.1.0')
      },
      loading: false
    });

    const count = countProjectsWithDrift(cache);
    expect(count).toBe(2);
  });

  it('returns 0 when no projects have drift', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    
    cache.set(1, {
      projectId: 1,
      deployments: {
        dev: makeDeployment('dev', '2.3.5'),
        prod: makeDeployment('prod', '2.3.5')
      },
      loading: false
    });

    const count = countProjectsWithDrift(cache);
    expect(count).toBe(0);
  });

  it('returns 0 for empty cache', () => {
    const cache = new Map<number, DeploymentsByEnv>();
    const count = countProjectsWithDrift(cache);
    expect(count).toBe(0);
  });

  it('ignores projects with missing versions', () => {
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

    // Project 2: missing PROD version
    cache.set(2, {
      projectId: 2,
      deployments: {
        dev: makeDeployment('dev', '1.0.0')
      },
      loading: false
    });

    const count = countProjectsWithDrift(cache);
    expect(count).toBe(1);
  });
});

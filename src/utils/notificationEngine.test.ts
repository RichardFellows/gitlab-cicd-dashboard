import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  checkPipelineFailure,
  checkCoverageDrop,
  checkDurationSpike,
  checkDeploymentFailure,
  shouldSuppress,
  recordFired,
  clearSuppression,
  resetSuppressions,
  evaluateRules,
  sendBrowserNotification,
} from './notificationEngine';
import { Project, DashboardMetrics, NotificationRule, DeploymentsByEnv, NotificationEntry } from '../types';

// Helper: create a minimal project for testing
function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: 'Test Project',
    web_url: 'https://gitlab.com/test',
    metrics: {
      totalPipelines: 10,
      successfulPipelines: 8,
      failedPipelines: 2,
      canceledPipelines: 0,
      runningPipelines: 0,
      successRate: 80,
      avgDuration: 120,
      testMetrics: { total: 50, success: 48, failed: 2, skipped: 0, available: true },
      mainBranchPipeline: { id: 100, status: 'success', created_at: '', updated_at: '' },
      codeCoverage: { coverage: 85, available: true },
      mergeRequestCounts: { totalOpen: 3, drafts: 1 },
      recentCommits: [],
      durationSpikePercent: 0,
    },
    ...overrides,
  };
}

function createDashboardMetrics(projects: Project[]): DashboardMetrics {
  return {
    totalProjects: projects.length,
    projects,
    aggregateMetrics: {
      totalPipelines: 0,
      successfulPipelines: 0,
      failedPipelines: 0,
      canceledPipelines: 0,
      runningPipelines: 0,
      avgSuccessRate: 0,
      avgDuration: 0,
      testMetrics: { total: 0, success: 0, failed: 0, skipped: 0, available: false },
    },
  };
}

describe('notificationEngine', () => {
  beforeEach(() => {
    resetSuppressions();
    vi.restoreAllMocks();
  });

  describe('checkPipelineFailure', () => {
    test('returns true when pipeline transitions to failed', () => {
      const current = createProject({
        metrics: { ...createProject().metrics, mainBranchPipeline: { id: 1, status: 'failed', created_at: '', updated_at: '' } },
      });
      const prev = createProject({
        metrics: { ...createProject().metrics, mainBranchPipeline: { id: 1, status: 'success', created_at: '', updated_at: '' } },
      });
      expect(checkPipelineFailure(current, prev)).toBe(true);
    });

    test('returns false when pipeline was already failed', () => {
      const current = createProject({
        metrics: { ...createProject().metrics, mainBranchPipeline: { id: 1, status: 'failed', created_at: '', updated_at: '' } },
      });
      const prev = createProject({
        metrics: { ...createProject().metrics, mainBranchPipeline: { id: 1, status: 'failed', created_at: '', updated_at: '' } },
      });
      expect(checkPipelineFailure(current, prev)).toBe(false);
    });

    test('returns true when pipeline fails with no previous data', () => {
      const current = createProject({
        metrics: { ...createProject().metrics, mainBranchPipeline: { id: 1, status: 'failed', created_at: '', updated_at: '' } },
      });
      expect(checkPipelineFailure(current, undefined)).toBe(true);
    });

    test('returns false when pipeline is successful', () => {
      const current = createProject();
      const prev = createProject();
      expect(checkPipelineFailure(current, prev)).toBe(false);
    });
  });

  describe('checkCoverageDrop', () => {
    test('returns true when coverage drops below threshold', () => {
      const current = createProject({
        metrics: { ...createProject().metrics, codeCoverage: { coverage: 70, available: true } },
      });
      const prev = createProject({
        metrics: { ...createProject().metrics, codeCoverage: { coverage: 85, available: true } },
      });
      expect(checkCoverageDrop(current, 80, prev)).toBe(true);
    });

    test('returns false when coverage was already below threshold', () => {
      const current = createProject({
        metrics: { ...createProject().metrics, codeCoverage: { coverage: 70, available: true } },
      });
      const prev = createProject({
        metrics: { ...createProject().metrics, codeCoverage: { coverage: 75, available: true } },
      });
      expect(checkCoverageDrop(current, 80, prev)).toBe(false);
    });

    test('returns false when coverage is null', () => {
      const current = createProject({
        metrics: { ...createProject().metrics, codeCoverage: { coverage: null, available: false } },
      });
      expect(checkCoverageDrop(current, 80, undefined)).toBe(false);
    });

    test('returns true when coverage drops with no previous data', () => {
      const current = createProject({
        metrics: { ...createProject().metrics, codeCoverage: { coverage: 70, available: true } },
      });
      expect(checkCoverageDrop(current, 80, undefined)).toBe(true);
    });

    test('returns false when coverage is above threshold', () => {
      const current = createProject({
        metrics: { ...createProject().metrics, codeCoverage: { coverage: 90, available: true } },
      });
      expect(checkCoverageDrop(current, 80, undefined)).toBe(false);
    });
  });

  describe('checkDurationSpike', () => {
    test('returns true when spike exceeds threshold', () => {
      const current = createProject({
        metrics: { ...createProject().metrics, durationSpikePercent: 60 },
      });
      expect(checkDurationSpike(current, 50)).toBe(true);
    });

    test('returns false when spike is below threshold', () => {
      const current = createProject({
        metrics: { ...createProject().metrics, durationSpikePercent: 30 },
      });
      expect(checkDurationSpike(current, 50)).toBe(false);
    });

    test('returns false when no spike data', () => {
      const current = createProject();
      expect(checkDurationSpike(current, 50)).toBe(false);
    });

    test('returns true when spike equals threshold', () => {
      const current = createProject({
        metrics: { ...createProject().metrics, durationSpikePercent: 50 },
      });
      expect(checkDurationSpike(current, 50)).toBe(true);
    });
  });

  describe('checkDeploymentFailure', () => {
    test('returns true when deployment to environment failed', () => {
      const cache = new Map<number, DeploymentsByEnv>();
      cache.set(1, {
        projectId: 1,
        deployments: {
          prod: {
            jobId: 1,
            jobName: 'deploy-prod',
            environment: 'prod',
            version: '1.0.0',
            status: 'failed',
            timestamp: '2026-01-01T00:00:00Z',
            pipelineId: 100,
            pipelineRef: 'main',
            jobUrl: 'https://gitlab.com/job/1',
          },
        },
        loading: false,
      });
      expect(checkDeploymentFailure(1, 'prod', cache)).toBe(true);
    });

    test('returns false when deployment succeeded', () => {
      const cache = new Map<number, DeploymentsByEnv>();
      cache.set(1, {
        projectId: 1,
        deployments: {
          prod: {
            jobId: 1,
            jobName: 'deploy-prod',
            environment: 'prod',
            version: '1.0.0',
            status: 'success',
            timestamp: '2026-01-01T00:00:00Z',
            pipelineId: 100,
            pipelineRef: 'main',
            jobUrl: 'https://gitlab.com/job/1',
          },
        },
        loading: false,
      });
      expect(checkDeploymentFailure(1, 'prod', cache)).toBe(false);
    });

    test('returns false when no deployment data', () => {
      const cache = new Map<number, DeploymentsByEnv>();
      expect(checkDeploymentFailure(1, 'prod', cache)).toBe(false);
    });

    test('returns false when environment not in cache', () => {
      const cache = new Map<number, DeploymentsByEnv>();
      cache.set(1, { projectId: 1, deployments: {}, loading: false });
      expect(checkDeploymentFailure(1, 'prod', cache)).toBe(false);
    });
  });

  describe('duplicate suppression', () => {
    test('shouldSuppress returns false for new notification', () => {
      expect(shouldSuppress('rule1', 1)).toBe(false);
    });

    test('shouldSuppress returns true after recording a fire', () => {
      recordFired('rule1', 1);
      expect(shouldSuppress('rule1', 1)).toBe(true);
    });

    test('shouldSuppress returns false for different rule', () => {
      recordFired('rule1', 1);
      expect(shouldSuppress('rule2', 1)).toBe(false);
    });

    test('shouldSuppress returns false for different project', () => {
      recordFired('rule1', 1);
      expect(shouldSuppress('rule1', 2)).toBe(false);
    });

    test('clearSuppression allows re-firing', () => {
      recordFired('rule1', 1);
      expect(shouldSuppress('rule1', 1)).toBe(true);
      clearSuppression('rule1', 1);
      expect(shouldSuppress('rule1', 1)).toBe(false);
    });

    test('suppression expires after window', () => {
      vi.useFakeTimers();
      recordFired('rule1', 1);
      expect(shouldSuppress('rule1', 1)).toBe(true);

      // Advance 31 minutes
      vi.advanceTimersByTime(31 * 60 * 1000);
      expect(shouldSuppress('rule1', 1)).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('evaluateRules', () => {
    test('fires pipeline failure notification on transition', () => {
      const rules: NotificationRule[] = [{
        id: 'r1',
        type: 'pipeline-failure',
        name: 'Pipeline Failure',
        enabled: true,
        scope: 'all',
        createdAt: '2026-01-01T00:00:00Z',
      }];

      const failedProject = createProject({
        id: 1,
        name: 'MyApp',
        metrics: { ...createProject().metrics, mainBranchPipeline: { id: 1, status: 'failed', created_at: '', updated_at: '' } },
      });
      const prevProject = createProject({ id: 1, name: 'MyApp' });

      const current = createDashboardMetrics([failedProject]);
      const previous = createDashboardMetrics([prevProject]);

      const fired = evaluateRules(rules, current, previous, new Map());
      expect(fired).toHaveLength(1);
      expect(fired[0].ruleType).toBe('pipeline-failure');
      expect(fired[0].projectName).toBe('MyApp');
    });

    test('does not fire for disabled rules', () => {
      const rules: NotificationRule[] = [{
        id: 'r1',
        type: 'pipeline-failure',
        name: 'Pipeline Failure',
        enabled: false,
        scope: 'all',
        createdAt: '2026-01-01T00:00:00Z',
      }];

      const failedProject = createProject({
        metrics: { ...createProject().metrics, mainBranchPipeline: { id: 1, status: 'failed', created_at: '', updated_at: '' } },
      });

      const current = createDashboardMetrics([failedProject]);
      const fired = evaluateRules(rules, current, null, new Map());
      expect(fired).toHaveLength(0);
    });

    test('respects project scope', () => {
      const rules: NotificationRule[] = [{
        id: 'r1',
        type: 'pipeline-failure',
        name: 'Pipeline Failure for project 99',
        enabled: true,
        scope: [99],
        createdAt: '2026-01-01T00:00:00Z',
      }];

      const failedProject = createProject({
        id: 1,
        metrics: { ...createProject().metrics, mainBranchPipeline: { id: 1, status: 'failed', created_at: '', updated_at: '' } },
      });

      const current = createDashboardMetrics([failedProject]);
      const fired = evaluateRules(rules, current, null, new Map());
      expect(fired).toHaveLength(0);
    });

    test('fires coverage drop notification', () => {
      const rules: NotificationRule[] = [{
        id: 'r2',
        type: 'coverage-drop',
        name: 'Coverage Drop',
        enabled: true,
        scope: 'all',
        threshold: 80,
        createdAt: '2026-01-01T00:00:00Z',
      }];

      const lowCoverageProject = createProject({
        metrics: { ...createProject().metrics, codeCoverage: { coverage: 70, available: true } },
      });
      const prevProject = createProject({
        metrics: { ...createProject().metrics, codeCoverage: { coverage: 85, available: true } },
      });

      const current = createDashboardMetrics([lowCoverageProject]);
      const previous = createDashboardMetrics([prevProject]);

      const fired = evaluateRules(rules, current, previous, new Map());
      expect(fired).toHaveLength(1);
      expect(fired[0].ruleType).toBe('coverage-drop');
      expect(fired[0].value).toBe(70);
    });

    test('fires duration spike notification', () => {
      const rules: NotificationRule[] = [{
        id: 'r3',
        type: 'duration-spike',
        name: 'Duration Spike',
        enabled: true,
        scope: 'all',
        threshold: 50,
        createdAt: '2026-01-01T00:00:00Z',
      }];

      const spikedProject = createProject({
        metrics: { ...createProject().metrics, durationSpikePercent: 75 },
      });

      const current = createDashboardMetrics([spikedProject]);
      const fired = evaluateRules(rules, current, null, new Map());
      expect(fired).toHaveLength(1);
      expect(fired[0].ruleType).toBe('duration-spike');
    });

    test('duplicate suppression prevents re-firing within window', () => {
      const rules: NotificationRule[] = [{
        id: 'r1',
        type: 'pipeline-failure',
        name: 'Pipeline Failure',
        enabled: true,
        scope: 'all',
        createdAt: '2026-01-01T00:00:00Z',
      }];

      const failedProject = createProject({
        metrics: { ...createProject().metrics, mainBranchPipeline: { id: 1, status: 'failed', created_at: '', updated_at: '' } },
      });

      const current = createDashboardMetrics([failedProject]);

      // First evaluation fires
      const fired1 = evaluateRules(rules, current, null, new Map());
      expect(fired1).toHaveLength(1);

      // Second evaluation within window — suppressed
      const fired2 = evaluateRules(rules, current, null, new Map());
      expect(fired2).toHaveLength(0);
    });

    test('handles empty rules array', () => {
      const current = createDashboardMetrics([createProject()]);
      const fired = evaluateRules([], current, null, new Map());
      expect(fired).toHaveLength(0);
    });

    test('handles empty projects array', () => {
      const rules: NotificationRule[] = [{
        id: 'r1',
        type: 'pipeline-failure',
        name: 'Pipeline Failure',
        enabled: true,
        scope: 'all',
        createdAt: '2026-01-01T00:00:00Z',
      }];

      const current = createDashboardMetrics([]);
      const fired = evaluateRules(rules, current, null, new Map());
      expect(fired).toHaveLength(0);
    });
  });

  describe('sendBrowserNotification', () => {
    test('creates Notification when permission granted', () => {
      const mockNotification = vi.fn();
      mockNotification.prototype.close = vi.fn();
      vi.stubGlobal('Notification', mockNotification);
      Object.defineProperty(Notification, 'permission', { value: 'granted', configurable: true });

      const entry: NotificationEntry = {
        id: 'n1',
        ruleId: 'r1',
        ruleName: 'Pipeline Failure',
        ruleType: 'pipeline-failure',
        projectId: 1,
        projectName: 'MyApp',
        message: 'Main branch pipeline failed',
        value: 0,
        timestamp: new Date().toISOString(),
        read: false,
      };

      sendBrowserNotification(entry, false);

      expect(mockNotification).toHaveBeenCalledWith('Pipeline Failure', {
        body: 'MyApp: Main branch pipeline failed',
        icon: '/favicon.ico',
        tag: 'r1_1',
        silent: false,
      });

      vi.unstubAllGlobals();
    });

    test('does not create Notification when permission not granted', () => {
      const mockNotification = vi.fn();
      vi.stubGlobal('Notification', mockNotification);
      Object.defineProperty(Notification, 'permission', { value: 'denied', configurable: true });

      const entry: NotificationEntry = {
        id: 'n1',
        ruleId: 'r1',
        ruleName: 'Test',
        ruleType: 'pipeline-failure',
        projectId: 1,
        projectName: 'MyApp',
        message: 'Failed',
        value: 0,
        timestamp: new Date().toISOString(),
        read: false,
      };

      sendBrowserNotification(entry, false);
      expect(mockNotification).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    test('passes silent true when muted', () => {
      const mockNotification = vi.fn();
      mockNotification.prototype.close = vi.fn();
      vi.stubGlobal('Notification', mockNotification);
      Object.defineProperty(Notification, 'permission', { value: 'granted', configurable: true });

      const entry: NotificationEntry = {
        id: 'n1',
        ruleId: 'r1',
        ruleName: 'Test',
        ruleType: 'pipeline-failure',
        projectId: 1,
        projectName: 'MyApp',
        message: 'Failed',
        value: 0,
        timestamp: new Date().toISOString(),
        read: false,
      };

      sendBrowserNotification(entry, true);
      expect(mockNotification).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ silent: true }));

      vi.unstubAllGlobals();
    });
  });
});

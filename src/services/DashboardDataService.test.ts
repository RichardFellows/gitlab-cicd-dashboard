import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardDataService from './DashboardDataService';
import GitLabApiService from './GitLabApiService';
import { MainBranchTrend, ProjectMetrics, Job } from '../types';

// Mock GitLabApiService
vi.mock('./GitLabApiService');

// Mock fetch for tests that need it
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DashboardDataService', () => {
  let service: DashboardDataService;
  let mockGitLabService: GitLabApiService;

  beforeEach(() => {
    mockGitLabService = new GitLabApiService();
    service = new DashboardDataService(mockGitLabService);
  });

  describe('getCoverageStatus', () => {
    it('returns "none" for null coverage', () => {
      expect(service.getCoverageStatus(null)).toBe('none');
    });

    it('returns "above" for coverage >= 80%', () => {
      expect(service.getCoverageStatus(80)).toBe('above');
      expect(service.getCoverageStatus(85)).toBe('above');
      expect(service.getCoverageStatus(100)).toBe('above');
    });

    it('returns "below" for coverage < 80%', () => {
      expect(service.getCoverageStatus(79.9)).toBe('below');
      expect(service.getCoverageStatus(50)).toBe('below');
      expect(service.getCoverageStatus(0)).toBe('below');
    });
  });

  describe('getMainBranchFailureRate', () => {
    it('returns 0 for empty pipelines', () => {
      const metrics = {
        totalPipelines: 0,
        failedPipelines: 0,
      } as ProjectMetrics;
      expect(service.getMainBranchFailureRate(metrics)).toBe(0);
    });

    it('calculates failure rate correctly', () => {
      const metrics = {
        totalPipelines: 100,
        failedPipelines: 15,
      } as ProjectMetrics;
      expect(service.getMainBranchFailureRate(metrics)).toBe(15);
    });

    it('handles all failed pipelines', () => {
      const metrics = {
        totalPipelines: 10,
        failedPipelines: 10,
      } as ProjectMetrics;
      expect(service.getMainBranchFailureRate(metrics)).toBe(100);
    });
  });

  describe('calculateDurationSpikePercent', () => {
    it('returns 0 for zero baseline', () => {
      expect(service.calculateDurationSpikePercent(100, 0)).toBe(0);
    });

    it('returns 0 for zero recent duration', () => {
      expect(service.calculateDurationSpikePercent(0, 100)).toBe(0);
    });

    it('returns 0 for no spike (recent <= baseline)', () => {
      expect(service.calculateDurationSpikePercent(90, 100)).toBe(0);
      expect(service.calculateDurationSpikePercent(100, 100)).toBe(0);
    });

    it('calculates spike percentage correctly', () => {
      // 50% increase
      expect(service.calculateDurationSpikePercent(150, 100)).toBe(50);
      // 100% increase
      expect(service.calculateDurationSpikePercent(200, 100)).toBe(100);
      // 25% increase
      expect(service.calculateDurationSpikePercent(125, 100)).toBe(25);
    });
  });

  describe('getBaselineDuration', () => {
    it('returns 0 for insufficient data', () => {
      const trends: MainBranchTrend[] = [
        { date: '2024-01-01', total: 10, failed: 1, failureRate: 10, avgDuration: 100 },
        { date: '2024-01-02', total: 10, failed: 1, failureRate: 10, avgDuration: 110 },
      ];
      expect(service.getBaselineDuration(trends)).toBe(0);
    });

    it('calculates baseline from first half of data', () => {
      const trends: MainBranchTrend[] = [
        { date: '2024-01-01', total: 10, failed: 1, failureRate: 10, avgDuration: 100 },
        { date: '2024-01-02', total: 10, failed: 1, failureRate: 10, avgDuration: 120 },
        { date: '2024-01-03', total: 10, failed: 1, failureRate: 10, avgDuration: 200 },
        { date: '2024-01-04', total: 10, failed: 1, failureRate: 10, avgDuration: 220 },
      ];
      // First half: [100, 120] => average = 110
      expect(service.getBaselineDuration(trends)).toBe(110);
    });

    it('ignores zero durations', () => {
      const trends: MainBranchTrend[] = [
        { date: '2024-01-01', total: 10, failed: 1, failureRate: 10, avgDuration: 0 },
        { date: '2024-01-02', total: 10, failed: 1, failureRate: 10, avgDuration: 100 },
        { date: '2024-01-03', total: 10, failed: 1, failureRate: 10, avgDuration: 200 },
        { date: '2024-01-04', total: 10, failed: 1, failureRate: 10, avgDuration: 200 },
      ];
      // First half with valid durations: [100] => average = 100
      expect(service.getBaselineDuration(trends)).toBe(100);
    });
  });

  describe('getRecentDuration', () => {
    it('returns 0 for insufficient data', () => {
      const trends: MainBranchTrend[] = [
        { date: '2024-01-01', total: 10, failed: 1, failureRate: 10, avgDuration: 100 },
      ];
      expect(service.getRecentDuration(trends)).toBe(0);
    });

    it('calculates recent duration from second half of data', () => {
      const trends: MainBranchTrend[] = [
        { date: '2024-01-01', total: 10, failed: 1, failureRate: 10, avgDuration: 100 },
        { date: '2024-01-02', total: 10, failed: 1, failureRate: 10, avgDuration: 120 },
        { date: '2024-01-03', total: 10, failed: 1, failureRate: 10, avgDuration: 200 },
        { date: '2024-01-04', total: 10, failed: 1, failureRate: 10, avgDuration: 220 },
      ];
      // Second half: [200, 220] => average = 210
      expect(service.getRecentDuration(trends)).toBe(210);
    });
  });

  // ============================================
  // Environment Overview Tests (Priority 2)
  // ============================================

  describe('parseDeployJobName', () => {
    it('extracts dev environment from job name', () => {
      expect(service.parseDeployJobName('deploy-to-dev')).toBe('dev');
      expect(service.parseDeployJobName('deploy_dev')).toBe('dev');
      expect(service.parseDeployJobName('deploy dev')).toBe('dev');
      expect(service.parseDeployJobName('deploy-api-dev')).toBe('dev');
    });

    it('extracts sit environment from job name', () => {
      expect(service.parseDeployJobName('deploy-to-sit')).toBe('sit');
      expect(service.parseDeployJobName('deploy_sit')).toBe('sit');
    });

    it('extracts uat environment from job name', () => {
      expect(service.parseDeployJobName('deploy-to-uat')).toBe('uat');
      expect(service.parseDeployJobName('deploy_uat')).toBe('uat');
      expect(service.parseDeployJobName('deploy-UAT')).toBe('uat');
    });

    it('extracts prod environment from job name', () => {
      expect(service.parseDeployJobName('deploy-to-prod')).toBe('prod');
      expect(service.parseDeployJobName('deploy_prod')).toBe('prod');
      expect(service.parseDeployJobName('deploy-PROD')).toBe('prod');
      expect(service.parseDeployJobName('deploy-production-prod')).toBe('prod');
    });

    it('returns null for non-deploy jobs', () => {
      expect(service.parseDeployJobName('build')).toBeNull();
      expect(service.parseDeployJobName('test')).toBeNull();
      expect(service.parseDeployJobName('lint')).toBeNull();
    });

    it('returns null for deploy jobs without environment', () => {
      expect(service.parseDeployJobName('deploy')).toBeNull();
      expect(service.parseDeployJobName('deploy-to-staging')).toBeNull();
    });

    it('is case-insensitive', () => {
      expect(service.parseDeployJobName('DEPLOY-TO-DEV')).toBe('dev');
      expect(service.parseDeployJobName('Deploy-To-Uat')).toBe('uat');
    });
  });

  describe('extractJiraKey', () => {
    it('extracts JIRA key from feature branch', () => {
      expect(service.extractJiraKey('feature/JIRA-123-description')).toBe('JIRA-123');
      expect(service.extractJiraKey('feature/PROJ-456-add-feature')).toBe('PROJ-456');
    });

    it('extracts JIRA key from bugfix branch', () => {
      expect(service.extractJiraKey('bugfix/ABC-789-fix-issue')).toBe('ABC-789');
    });

    it('extracts JIRA key at start of branch', () => {
      expect(service.extractJiraKey('JIRA-123/fix-bug')).toBe('JIRA-123');
      expect(service.extractJiraKey('JIRA-123-fix-bug')).toBe('JIRA-123');
    });

    it('extracts first JIRA key if multiple present', () => {
      expect(service.extractJiraKey('feature/JIRA-123-relates-to-JIRA-456')).toBe('JIRA-123');
    });

    it('returns null for branches without JIRA key', () => {
      expect(service.extractJiraKey('main')).toBeNull();
      expect(service.extractJiraKey('develop')).toBeNull();
      expect(service.extractJiraKey('feature/add-new-feature')).toBeNull();
      expect(service.extractJiraKey('hotfix/urgent-fix')).toBeNull();
    });

    it('returns null for lowercase project keys', () => {
      // JIRA keys must have uppercase project prefix
      expect(service.extractJiraKey('feature/jira-123-description')).toBeNull();
    });
  });

  describe('getProjectDeployments', () => {
    it('returns empty deployments when no deploy jobs found', async () => {
      // Mock getProjectJobs to return non-deploy jobs
      vi.mocked(mockGitLabService.getProjectJobs).mockResolvedValueOnce([
        {
          id: 1,
          name: 'build',
          stage: 'build',
          status: 'success',
          web_url: 'https://gitlab.com/job/1',
          created_at: '2024-01-15T10:00:00Z',
        } as Job,
      ]);

      const result = await service.getProjectDeployments(123);

      expect(result.projectId).toBe(123);
      expect(result.loading).toBe(false);
      expect(Object.keys(result.deployments)).toHaveLength(0);
    });

    it('extracts deployments for multiple environments', async () => {
      // Mock getProjectJobs to return deploy jobs
      vi.mocked(mockGitLabService.getProjectJobs).mockResolvedValueOnce([
        {
          id: 1,
          name: 'deploy-to-dev',
          stage: 'deploy',
          status: 'success',
          web_url: 'https://gitlab.com/job/1',
          created_at: '2024-01-15T10:00:00Z',
          finished_at: '2024-01-15T10:05:00Z',
          pipeline: {
            id: 100,
            iid: 50,
            ref: 'feature/JIRA-123-add-feature',
            web_url: 'https://gitlab.com/pipeline/100',
          },
        },
        {
          id: 2,
          name: 'deploy-to-uat',
          stage: 'deploy',
          status: 'success',
          web_url: 'https://gitlab.com/job/2',
          created_at: '2024-01-14T10:00:00Z',
          finished_at: '2024-01-14T10:05:00Z',
          pipeline: {
            id: 99,
            iid: 49,
            ref: 'main',
            web_url: 'https://gitlab.com/pipeline/99',
          },
        },
        {
          id: 3,
          name: 'deploy-to-prod',
          stage: 'deploy',
          status: 'failed',
          web_url: 'https://gitlab.com/job/3',
          created_at: '2024-01-13T10:00:00Z',
          finished_at: '2024-01-13T10:05:00Z',
          pipeline: {
            id: 98,
            iid: 48,
            ref: 'main',
            web_url: 'https://gitlab.com/pipeline/98',
          },
        },
      ] as (Job & { pipeline: { id: number; iid: number; ref: string; web_url: string } })[]);

      // Mock getJobArtifact to return version for some jobs
      vi.mocked(mockGitLabService.getJobArtifact)
        .mockResolvedValueOnce({ version: '2.3.45' }) // dev
        .mockResolvedValueOnce(null) // uat - no artifact
        .mockResolvedValueOnce({ version: '2.3.40' }); // prod

      const result = await service.getProjectDeployments(123);

      expect(result.projectId).toBe(123);
      expect(result.loading).toBe(false);
      expect(Object.keys(result.deployments)).toHaveLength(3);

      // Check dev deployment
      expect(result.deployments.dev?.environment).toBe('dev');
      expect(result.deployments.dev?.version).toBe('2.3.45');
      expect(result.deployments.dev?.status).toBe('success');
      expect(result.deployments.dev?.jiraKey).toBe('JIRA-123');

      // Check uat deployment (fallback to pipeline IID)
      expect(result.deployments.uat?.environment).toBe('uat');
      expect(result.deployments.uat?.version).toBe('#49');
      expect(result.deployments.uat?.jiraKey).toBeNull();

      // Check prod deployment (failed status)
      expect(result.deployments.prod?.environment).toBe('prod');
      expect(result.deployments.prod?.version).toBe('2.3.40');
      expect(result.deployments.prod?.status).toBe('failed');
    });

    it('keeps only the latest job per environment', async () => {
      // Mock with multiple jobs for the same environment
      vi.mocked(mockGitLabService.getProjectJobs).mockResolvedValueOnce([
        {
          id: 1,
          name: 'deploy-to-dev',
          stage: 'deploy',
          status: 'success',
          web_url: 'https://gitlab.com/job/1',
          created_at: '2024-01-15T10:00:00Z',
          finished_at: '2024-01-15T10:05:00Z',
          pipeline: { id: 100, iid: 50, ref: 'main', web_url: '' },
        },
        {
          id: 2,
          name: 'deploy-to-dev',
          stage: 'deploy',
          status: 'failed',
          web_url: 'https://gitlab.com/job/2',
          created_at: '2024-01-14T10:00:00Z',
          finished_at: '2024-01-14T10:05:00Z',
          pipeline: { id: 99, iid: 49, ref: 'main', web_url: '' },
        },
      ] as (Job & { pipeline: { id: number; iid: number; ref: string; web_url: string } })[]);

      vi.mocked(mockGitLabService.getJobArtifact).mockResolvedValueOnce({ version: '2.0.0' });

      const result = await service.getProjectDeployments(123);

      // Should only have one dev deployment (the first/latest one)
      expect(Object.keys(result.deployments)).toHaveLength(1);
      expect(result.deployments.dev?.jobId).toBe(1);
      expect(result.deployments.dev?.status).toBe('success');
    });

    it('handles API errors gracefully', async () => {
      vi.mocked(mockGitLabService.getProjectJobs).mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.getProjectDeployments(123);

      expect(result.projectId).toBe(123);
      expect(result.loading).toBe(false);
      expect(result.error).toBe('API error');
      expect(Object.keys(result.deployments)).toHaveLength(0);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardDataService from './DashboardDataService';
import GitLabApiService from './GitLabApiService';
import { MainBranchTrend, ProjectMetrics, Job, Project, MergeRequest } from '../types';

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

  // ============================================
  // Promotion Readiness Tests (Priority 3)
  // ============================================

  describe('parseSignoffComment', () => {
    it('parses valid sign-off with v prefix', () => {
      const result = service.parseSignoffComment('SIGNOFF: v2.3.45 UAT');
      expect(result).toEqual({ version: '2.3.45', environment: 'uat' });
    });

    it('parses valid sign-off without v prefix', () => {
      const result = service.parseSignoffComment('SIGNOFF: 1.0.0 DEV');
      expect(result).toEqual({ version: '1.0.0', environment: 'dev' });
    });

    it('parses sign-off with extra whitespace', () => {
      const result = service.parseSignoffComment('SIGNOFF:   v3.0.0   PROD  ');
      expect(result).toEqual({ version: '3.0.0', environment: 'prod' });
    });

    it('is case-insensitive for keyword and environment', () => {
      const result1 = service.parseSignoffComment('signoff: v1.0.0 prod');
      expect(result1).toEqual({ version: '1.0.0', environment: 'prod' });

      const result2 = service.parseSignoffComment('Signoff: v1.0.0 SIT');
      expect(result2).toEqual({ version: '1.0.0', environment: 'sit' });
    });

    it('returns null for invalid formats', () => {
      expect(service.parseSignoffComment('APPROVED: v1.0.0 UAT')).toBeNull();
      expect(service.parseSignoffComment('SIGNOFF v1.0.0 UAT')).toBeNull();
      expect(service.parseSignoffComment('SIGNOFF: 1.0.0')).toBeNull();
      expect(service.parseSignoffComment('SIGNOFF: UAT')).toBeNull();
      expect(service.parseSignoffComment('Some random comment')).toBeNull();
    });

    it('returns null for invalid environments', () => {
      expect(service.parseSignoffComment('SIGNOFF: v1.0.0 STAGING')).toBeNull();
      expect(service.parseSignoffComment('SIGNOFF: v1.0.0 PRODUCTION')).toBeNull();
    });

    it('parses sign-off in multiline comment (line must start with SIGNOFF)', () => {
      const comment = `Some context here.
SIGNOFF: v2.0.0 UAT
Thanks!`;
      const result = service.parseSignoffComment(comment);
      expect(result).toEqual({ version: '2.0.0', environment: 'uat' });
    });

    it('returns null when sign-off has leading whitespace', () => {
      const comment = `
        Some context here.
        SIGNOFF: v2.0.0 UAT
        Thanks!
      `;
      const result = service.parseSignoffComment(comment);
      expect(result).toBeNull();
    });
  });

  describe('parseCodeowners', () => {
    it('extracts usernames from simple CODEOWNERS', () => {
      const content = '* @jane @bob';
      const result = service.parseCodeowners(content);
      expect(result).toContain('jane');
      expect(result).toContain('bob');
      expect(result).toHaveLength(2);
    });

    it('extracts usernames from multi-line CODEOWNERS', () => {
      const content = `
* @jane @bob
/src/ @alice
/docs/ @charlie
      `;
      const result = service.parseCodeowners(content);
      expect(result).toContain('jane');
      expect(result).toContain('bob');
      expect(result).toContain('alice');
      expect(result).toContain('charlie');
      expect(result).toHaveLength(4);
    });

    it('handles CODEOWNERS with comments', () => {
      const content = `
# This is a comment
* @admin

# Docs team
/docs/ @doc-writer
      `;
      const result = service.parseCodeowners(content);
      expect(result).toContain('admin');
      expect(result).toContain('doc-writer');
    });

    it('deduplicates usernames', () => {
      const content = `
* @jane @bob
/src/ @jane
      `;
      const result = service.parseCodeowners(content);
      expect(result).toHaveLength(2);
      expect(result.filter(u => u === 'jane')).toHaveLength(1);
    });

    it('handles usernames with hyphens', () => {
      const content = '* @user-name @another-user-123';
      const result = service.parseCodeowners(content);
      expect(result).toContain('user-name');
      expect(result).toContain('another-user-123');
    });

    it('returns empty array for empty content', () => {
      expect(service.parseCodeowners('')).toEqual([]);
    });
  });

  describe('getCodeowners', () => {
    it('fetches and parses CODEOWNERS file', async () => {
      vi.mocked(mockGitLabService.getRepositoryFile).mockResolvedValueOnce({
        content: '* @jane @bob\n/src/ @alice'
      });

      const result = await service.getCodeowners(123);

      expect(mockGitLabService.getRepositoryFile).toHaveBeenCalledWith(123, 'CODEOWNERS', 'HEAD');
      expect(result).toContain('jane');
      expect(result).toContain('bob');
      expect(result).toContain('alice');
    });

    it('returns empty array when file not found', async () => {
      vi.mocked(mockGitLabService.getRepositoryFile).mockResolvedValueOnce(null);

      const result = await service.getCodeowners(123);

      expect(result).toEqual([]);
    });

    it('caches CODEOWNERS results', async () => {
      vi.mocked(mockGitLabService.getRepositoryFile).mockResolvedValueOnce({
        content: '* @jane'
      });

      // First call
      await service.getCodeowners(123);
      // Second call (should use cache)
      const result = await service.getCodeowners(123);

      expect(mockGitLabService.getRepositoryFile).toHaveBeenCalledTimes(1);
      expect(result).toContain('jane');
    });
  });

  describe('getMRSignoffs', () => {
    it('extracts sign-offs from MR notes', async () => {
      vi.mocked(mockGitLabService.getMergeRequestNotes).mockResolvedValueOnce([
        {
          id: 1,
          body: 'SIGNOFF: v2.3.45 UAT',
          author: { id: 10, username: 'jane', name: 'Jane Doe' },
          created_at: '2024-01-15T10:00:00Z',
          system: false
        },
        {
          id: 2,
          body: 'Looks good!',
          author: { id: 11, username: 'bob', name: 'Bob Smith' },
          created_at: '2024-01-15T11:00:00Z',
          system: false
        }
      ]);

      const result = await service.getMRSignoffs(123, 5, ['jane', 'bob']);

      expect(result).toHaveLength(1);
      expect(result[0].version).toBe('2.3.45');
      expect(result[0].environment).toBe('uat');
      expect(result[0].author).toBe('jane');
      expect(result[0].isValid).toBe(true);
    });

    it('marks sign-off as invalid if author not in CODEOWNERS', async () => {
      vi.mocked(mockGitLabService.getMergeRequestNotes).mockResolvedValueOnce([
        {
          id: 1,
          body: 'SIGNOFF: v1.0.0 DEV',
          author: { id: 10, username: 'unauthorized-user', name: 'Random User' },
          created_at: '2024-01-15T10:00:00Z',
          system: false
        }
      ]);

      const result = await service.getMRSignoffs(123, 5, ['jane', 'bob']);

      expect(result).toHaveLength(1);
      expect(result[0].isValid).toBe(false);
      expect(result[0].authorizedBy).toBe('');
    });

    it('allows any user if CODEOWNERS is empty', async () => {
      vi.mocked(mockGitLabService.getMergeRequestNotes).mockResolvedValueOnce([
        {
          id: 1,
          body: 'SIGNOFF: v1.0.0 PROD',
          author: { id: 10, username: 'anyone', name: 'Anyone' },
          created_at: '2024-01-15T10:00:00Z',
          system: false
        }
      ]);

      const result = await service.getMRSignoffs(123, 5, []);

      expect(result).toHaveLength(1);
      expect(result[0].isValid).toBe(true);
    });
  });

  describe('getPostDeployTestStatus', () => {
    it('returns exists=false when no post-deploy jobs', async () => {
      vi.mocked(mockGitLabService.getPipelineJobs).mockResolvedValueOnce([
        { id: 1, name: 'build', stage: 'build', status: 'success', web_url: '', created_at: '' },
        { id: 2, name: 'deploy', stage: 'deploy', status: 'success', web_url: '', created_at: '' }
      ]);

      const result = await service.getPostDeployTestStatus(123, 456);

      expect(result.exists).toBe(false);
      expect(result.passed).toBeNull();
    });

    it('returns passed=true when all post-deploy jobs succeed', async () => {
      vi.mocked(mockGitLabService.getPipelineJobs).mockResolvedValueOnce([
        { id: 1, name: 'test-e2e', stage: 'post-deploy', status: 'success', web_url: 'http://job/1', created_at: '' },
        { id: 2, name: 'smoke-test', stage: 'post-deploy', status: 'success', web_url: 'http://job/2', created_at: '' }
      ]);

      const result = await service.getPostDeployTestStatus(123, 456);

      expect(result.exists).toBe(true);
      expect(result.passed).toBe(true);
      expect(result.jobId).toBe(1);
    });

    it('returns passed=false when any post-deploy job fails', async () => {
      vi.mocked(mockGitLabService.getPipelineJobs).mockResolvedValueOnce([
        { id: 1, name: 'test-e2e', stage: 'post-deploy', status: 'success', web_url: 'http://job/1', created_at: '' },
        { id: 2, name: 'smoke-test', stage: 'post-deploy', status: 'failed', web_url: 'http://job/2', created_at: '' }
      ]);

      const result = await service.getPostDeployTestStatus(123, 456);

      expect(result.exists).toBe(true);
      expect(result.passed).toBe(false);
      // Links to first completed job for details
      expect(result.jobId).toBeDefined();
      expect(result.jobUrl).toBeDefined();
    });

    it('handles post_deploy stage name (underscore)', async () => {
      vi.mocked(mockGitLabService.getPipelineJobs).mockResolvedValueOnce([
        { id: 1, name: 'e2e-test', stage: 'post_deploy', status: 'success', web_url: 'http://job/1', created_at: '' }
      ]);

      const result = await service.getPostDeployTestStatus(123, 456);

      expect(result.exists).toBe(true);
      expect(result.passed).toBe(true);
    });
  });

  describe('calculateReadinessStatus', () => {
    const mockDeployment = {
      jobId: 1,
      jobName: 'deploy-to-uat',
      environment: 'uat' as const,
      version: '2.3.45',
      status: 'success' as const,
      timestamp: '2024-01-15T10:00:00Z',
      pipelineId: 100,
      pipelineRef: 'feature/test',
      jobUrl: 'http://job/1'
    };

    const mockSignoff = {
      version: '2.3.45',
      environment: 'uat' as const,
      author: 'jane',
      authorizedBy: 'jane',
      timestamp: '2024-01-15T11:00:00Z',
      noteId: 1,
      mrIid: 5,
      isValid: true
    };

    it('returns not-deployed when no deployment', () => {
      const result = service.calculateReadinessStatus(null, null, { exists: false, passed: null });
      expect(result).toBe('not-deployed');
    });

    it('returns tests-failed when post-deploy tests fail', () => {
      const result = service.calculateReadinessStatus(
        mockDeployment,
        mockSignoff,
        { exists: true, passed: false }
      );
      expect(result).toBe('tests-failed');
    });

    it('returns pending-signoff when no sign-off', () => {
      const result = service.calculateReadinessStatus(
        mockDeployment,
        null,
        { exists: true, passed: true }
      );
      expect(result).toBe('pending-signoff');
    });

    it('returns pending-signoff when sign-off is invalid', () => {
      const invalidSignoff = { ...mockSignoff, isValid: false };
      const result = service.calculateReadinessStatus(
        mockDeployment,
        invalidSignoff,
        { exists: true, passed: true }
      );
      expect(result).toBe('pending-signoff');
    });

    it('returns ready when deployed, tests passed, and signed off', () => {
      const result = service.calculateReadinessStatus(
        mockDeployment,
        mockSignoff,
        { exists: true, passed: true }
      );
      expect(result).toBe('ready');
    });

    it('returns ready when deployed, no tests, and signed off', () => {
      const result = service.calculateReadinessStatus(
        mockDeployment,
        mockSignoff,
        { exists: false, passed: null }
      );
      expect(result).toBe('ready');
    });
  });

  describe('getAllOpenMergeRequests', () => {
    const makeProject = (id: number, name: string, totalOpen: number): Project => ({
      id,
      name,
      web_url: `https://gitlab.com/${name}`,
      path_with_namespace: `group/${name}`,
      metrics: {
        mergeRequestCounts: { totalOpen, drafts: 0 },
      } as Project['metrics'],
    });

    const makeMR = (iid: number, title: string): MergeRequest => ({
      id: iid * 10,
      iid,
      title,
      state: 'opened',
      created_at: '2026-01-20T10:00:00Z',
      updated_at: '2026-01-25T10:00:00Z',
      source_branch: 'feature/test',
      target_branch: 'main',
      web_url: `https://gitlab.com/mr/${iid}`,
      author: { id: 1, name: 'Alice', username: 'alice' },
    });

    it('fetches and annotates MRs from multiple projects', async () => {
      const projects = [
        makeProject(100, 'alpha', 2),
        makeProject(200, 'beta', 1),
      ];

      vi.spyOn(mockGitLabService, 'getProjectMergeRequests')
        .mockResolvedValueOnce([makeMR(1, 'MR 1'), makeMR(2, 'MR 2')])
        .mockResolvedValueOnce([makeMR(3, 'MR 3')]);

      const result = await service.getAllOpenMergeRequests(projects);

      expect(result).toHaveLength(3);
      expect(result[0].projectId).toBe(100);
      expect(result[0].projectName).toBe('alpha');
      expect(result[0].projectPath).toBe('group/alpha');
      expect(result[2].projectId).toBe(200);
      expect(result[2].projectName).toBe('beta');
    });

    it('skips projects with no open MRs', async () => {
      const projects = [
        makeProject(100, 'alpha', 2),
        makeProject(200, 'beta', 0), // No open MRs
      ];

      vi.spyOn(mockGitLabService, 'getProjectMergeRequests')
        .mockResolvedValueOnce([makeMR(1, 'MR 1')]);

      const result = await service.getAllOpenMergeRequests(projects);

      expect(result).toHaveLength(1);
      expect(mockGitLabService.getProjectMergeRequests).toHaveBeenCalledTimes(1);
    });

    it('handles individual project failures gracefully', async () => {
      const projects = [
        makeProject(100, 'alpha', 1),
        makeProject(200, 'beta', 1),
      ];

      vi.spyOn(mockGitLabService, 'getProjectMergeRequests')
        .mockResolvedValueOnce([makeMR(1, 'MR 1')])
        .mockRejectedValueOnce(new Error('API error'));

      const result = await service.getAllOpenMergeRequests(projects);

      expect(result).toHaveLength(1);
      expect(result[0].projectName).toBe('alpha');
    });

    it('returns empty array when no projects have open MRs', async () => {
      const projects = [
        makeProject(100, 'alpha', 0),
        makeProject(200, 'beta', 0),
      ];

      const result = await service.getAllOpenMergeRequests(projects);

      expect(result).toHaveLength(0);
      expect(mockGitLabService.getProjectMergeRequests).not.toHaveBeenCalled();
    });

    it('handles empty projects array', async () => {
      const result = await service.getAllOpenMergeRequests([]);
      expect(result).toHaveLength(0);
    });
  });

  // ============================================
  // Deployment Timeline Tests (Priority 8)
  // ============================================

  describe('getProjectDeploymentHistory', () => {
    it('returns all deploy jobs (not just latest per env)', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      vi.mocked(mockGitLabService.getProjectJobs).mockResolvedValueOnce([
        {
          id: 10,
          name: 'deploy-to-dev',
          stage: 'deploy',
          status: 'success',
          web_url: 'https://gitlab.com/job/10',
          created_at: now.toISOString(),
          finished_at: now.toISOString(),
          pipeline: { id: 200, iid: 60, ref: 'main', web_url: 'https://gitlab.com/pipeline/200' },
        },
        {
          id: 11,
          name: 'deploy-to-dev',
          stage: 'deploy',
          status: 'success',
          web_url: 'https://gitlab.com/job/11',
          created_at: yesterday.toISOString(),
          finished_at: yesterday.toISOString(),
          pipeline: { id: 199, iid: 59, ref: 'main', web_url: 'https://gitlab.com/pipeline/199' },
        },
        {
          id: 12,
          name: 'deploy-to-uat',
          stage: 'deploy',
          status: 'failed',
          web_url: 'https://gitlab.com/job/12',
          created_at: now.toISOString(),
          finished_at: now.toISOString(),
          pipeline: { id: 200, iid: 60, ref: 'feature/TEST-1', web_url: '' },
        },
        {
          id: 13,
          name: 'build',
          stage: 'build',
          status: 'success',
          web_url: 'https://gitlab.com/job/13',
          created_at: now.toISOString(),
        },
      ] as (Job & { pipeline: { id: number; iid: number; ref: string; web_url: string } })[]);

      vi.mocked(mockGitLabService.getJobArtifact)
        .mockResolvedValueOnce({ version: '2.0.1' })
        .mockResolvedValueOnce({ version: '2.0.0' })
        .mockResolvedValueOnce(null);

      const result = await service.getProjectDeploymentHistory(123, 'test-project');

      // Should return 3 deploy jobs (not the build job), all including both dev deploys
      expect(result).toHaveLength(3);
      expect(result[0].projectId).toBe(123);
      expect(result[0].projectName).toBe('test-project');
      expect(result.every(e => e.environment === 'dev' || e.environment === 'uat')).toBe(true);
    });

    it('filters out jobs older than 30 days', async () => {
      const now = new Date();
      const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

      vi.mocked(mockGitLabService.getProjectJobs).mockResolvedValueOnce([
        {
          id: 20,
          name: 'deploy-to-dev',
          stage: 'deploy',
          status: 'success',
          web_url: 'https://gitlab.com/job/20',
          created_at: now.toISOString(),
          finished_at: now.toISOString(),
          pipeline: { id: 300, iid: 70, ref: 'main', web_url: '' },
        },
        {
          id: 21,
          name: 'deploy-to-dev',
          stage: 'deploy',
          status: 'success',
          web_url: 'https://gitlab.com/job/21',
          created_at: thirtyOneDaysAgo.toISOString(),
          finished_at: thirtyOneDaysAgo.toISOString(),
          pipeline: { id: 200, iid: 50, ref: 'main', web_url: '' },
        },
      ] as (Job & { pipeline: { id: number; iid: number; ref: string; web_url: string } })[]);

      vi.mocked(mockGitLabService.getJobArtifact).mockResolvedValue({ version: '1.0.0' });

      const result = await service.getProjectDeploymentHistory(123, 'test-project');

      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe(20);
    });

    it('falls back to pipeline IID when artifact unavailable', async () => {
      const now = new Date();

      vi.mocked(mockGitLabService.getProjectJobs).mockResolvedValueOnce([
        {
          id: 30,
          name: 'deploy-to-prod',
          stage: 'deploy',
          status: 'success',
          web_url: 'https://gitlab.com/job/30',
          created_at: now.toISOString(),
          finished_at: now.toISOString(),
          pipeline: { id: 400, iid: 80, ref: 'main', web_url: '' },
        },
      ] as (Job & { pipeline: { id: number; iid: number; ref: string; web_url: string } })[]);

      vi.mocked(mockGitLabService.getJobArtifact).mockResolvedValueOnce(null);

      const result = await service.getProjectDeploymentHistory(123, 'test-project');

      expect(result).toHaveLength(1);
      expect(result[0].version).toBe('#80');
    });

    it('returns empty array on API error', async () => {
      vi.mocked(mockGitLabService.getProjectJobs).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getProjectDeploymentHistory(123, 'test-project');

      expect(result).toHaveLength(0);
    });
  });

  describe('detectRollbacks', () => {
    it('marks rollback when version decreases for same project+env', () => {
      const history = [
        makeHistoryEntry(1, 'proj-a', 'dev', '2.0.0', '2026-01-15T10:00:00Z'),
        makeHistoryEntry(1, 'proj-a', 'dev', '1.9.0', '2026-01-15T11:00:00Z'),
      ];

      service.detectRollbacks(history);

      expect(history[0].isRollback).toBe(false);
      // Entry at 11:00 has version 1.9.0 which is less than 2.0.0 at 10:00
      expect(history[1].isRollback).toBe(true);
      expect(history[1].rolledBackFrom).toBe('2.0.0');
    });

    it('does not mark rollback when versions increase', () => {
      const history = [
        makeHistoryEntry(1, 'proj-a', 'dev', '1.0.0', '2026-01-15T10:00:00Z'),
        makeHistoryEntry(1, 'proj-a', 'dev', '1.1.0', '2026-01-15T11:00:00Z'),
        makeHistoryEntry(1, 'proj-a', 'dev', '1.2.0', '2026-01-15T12:00:00Z'),
      ];

      service.detectRollbacks(history);

      expect(history.every(e => !e.isRollback)).toBe(true);
    });

    it('does not mark rollback when same version redeployed', () => {
      const history = [
        makeHistoryEntry(1, 'proj-a', 'dev', '1.0.0', '2026-01-15T10:00:00Z'),
        makeHistoryEntry(1, 'proj-a', 'dev', '1.0.0', '2026-01-15T11:00:00Z'),
      ];

      service.detectRollbacks(history);

      expect(history.every(e => !e.isRollback)).toBe(true);
    });

    it('tracks rollbacks per environment independently', () => {
      const history = [
        makeHistoryEntry(1, 'proj-a', 'dev', '2.0.0', '2026-01-15T10:00:00Z'),
        makeHistoryEntry(1, 'proj-a', 'dev', '1.0.0', '2026-01-15T11:00:00Z'), // rollback
        makeHistoryEntry(1, 'proj-a', 'uat', '1.0.0', '2026-01-15T10:00:00Z'),
        makeHistoryEntry(1, 'proj-a', 'uat', '2.0.0', '2026-01-15T11:00:00Z'), // not rollback
      ];

      service.detectRollbacks(history);

      expect(history[1].isRollback).toBe(true); // dev rollback
      expect(history[3].isRollback).toBe(false); // uat upgrade
    });

    it('tracks rollbacks per project independently', () => {
      const history = [
        makeHistoryEntry(1, 'proj-a', 'dev', '2.0.0', '2026-01-15T10:00:00Z'),
        makeHistoryEntry(1, 'proj-a', 'dev', '1.0.0', '2026-01-15T11:00:00Z'), // rollback
        makeHistoryEntry(2, 'proj-b', 'dev', '1.0.0', '2026-01-15T10:00:00Z'),
        makeHistoryEntry(2, 'proj-b', 'dev', '2.0.0', '2026-01-15T11:00:00Z'), // not rollback
      ];

      service.detectRollbacks(history);

      expect(history[1].isRollback).toBe(true);
      expect(history[3].isRollback).toBe(false);
    });

    it('skips null versions gracefully', () => {
      const history = [
        makeHistoryEntry(1, 'proj-a', 'dev', '2.0.0', '2026-01-15T10:00:00Z'),
        makeHistoryEntry(1, 'proj-a', 'dev', null, '2026-01-15T11:00:00Z'),
        makeHistoryEntry(1, 'proj-a', 'dev', '1.0.0', '2026-01-15T12:00:00Z'),
      ];

      service.detectRollbacks(history);

      // null version entries should not be marked as rollback
      expect(history[1].isRollback).toBe(false);
      // After null, can't compare so shouldn't mark as rollback either
      expect(history[2].isRollback).toBe(false);
    });
  });
});

// Helper to create DeploymentHistoryEntry for tests
function makeHistoryEntry(
  projectId: number,
  projectName: string,
  env: 'dev' | 'sit' | 'uat' | 'prod',
  version: string | null,
  timestamp: string
) {
  return {
    jobId: Math.floor(Math.random() * 10000),
    jobName: `deploy-to-${env}`,
    environment: env as import('../types').EnvironmentName,
    version,
    status: 'success' as import('../types').DeploymentStatus,
    timestamp,
    pipelineId: 100,
    pipelineRef: 'main',
    jobUrl: 'https://gitlab.com/job/1',
    projectId,
    projectName,
    isRollback: false,
    rolledBackFrom: undefined,
  };
}

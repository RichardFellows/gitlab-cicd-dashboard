import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GitLabApiService from './GitLabApiService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GitLabApiService', () => {
  let service: GitLabApiService;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Mock window.location for shouldUseProxy check
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true,
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });

    service = new GitLabApiService('https://gitlab.com/api/v4', 'test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProjectJobs', () => {
    it('fetches jobs for a project successfully', async () => {
      const mockJobs = [
        {
          id: 1,
          name: 'deploy-to-dev',
          stage: 'deploy',
          status: 'success',
          web_url: 'https://gitlab.com/job/1',
          created_at: '2024-01-15T10:00:00Z',
          finished_at: '2024-01-15T10:05:00Z',
        },
        {
          id: 2,
          name: 'deploy-to-prod',
          stage: 'deploy',
          status: 'failed',
          web_url: 'https://gitlab.com/job/2',
          created_at: '2024-01-15T11:00:00Z',
          finished_at: '2024-01-15T11:05:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobs,
      });

      const result = await service.getProjectJobs(123);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/123/jobs'),
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );
      expect(result).toEqual(mockJobs);
    });

    it('applies scope filter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await service.getProjectJobs(123, { scope: ['success', 'failed'] });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/scope\[\]=success.*scope\[\]=failed|scope\[\]=failed.*scope\[\]=success/),
        expect.any(Object)
      );
    });

    it('applies per_page parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await service.getProjectJobs(123, { per_page: 50 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('per_page=50'),
        expect.any(Object)
      );
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.getProjectJobs(123)).rejects.toThrow(
        'Error fetching jobs: Internal Server Error (500)'
      );
    });

    it('throws error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getProjectJobs(123)).rejects.toThrow('Network error');
    });
  });

  describe('getJobArtifact', () => {
    it('fetches and parses JSON artifact successfully', async () => {
      const mockArtifact = {
        version: '2.3.45',
        buildTime: '2024-01-15T10:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockArtifact,
      });

      const result = await service.getJobArtifact(123, 456, 'deploy-info.json');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/123/jobs/456/artifacts/deploy-info.json'),
        expect.any(Object)
      );
      expect(result).toEqual(mockArtifact);
    });

    it('returns null for 404 (artifact not found)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await service.getJobArtifact(123, 456, 'deploy-info.json');

      expect(result).toBeNull();
    });

    it('returns null on other API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const result = await service.getJobArtifact(123, 456, 'deploy-info.json');

      expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getJobArtifact(123, 456, 'deploy-info.json');

      expect(result).toBeNull();
    });

    it('supports typed return values', async () => {
      interface DeployInfo {
        version: string;
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ version: '1.0.0' }),
      });

      const result = await service.getJobArtifact<DeployInfo>(123, 456, 'deploy-info.json');

      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.0.0');
    });
  });

  describe('getMergeRequestByBranch', () => {
    it('returns merge request when found', async () => {
      const mockMR = {
        id: 100,
        iid: 5,
        title: 'Feature branch MR',
        state: 'merged',
        source_branch: 'feature/test',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/mr/5',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T12:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockMR],
      });

      const result = await service.getMergeRequestByBranch(123, 'feature/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/123/merge_requests'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('source_branch=feature%2Ftest'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('state=merged'),
        expect.any(Object)
      );
      expect(result).toEqual(mockMR);
    });

    it('returns null when no MR found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await service.getMergeRequestByBranch(123, 'feature/nonexistent');

      expect(result).toBeNull();
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.getMergeRequestByBranch(123, 'feature/test')).rejects.toThrow(
        'Error fetching merge request by branch: Internal Server Error (500)'
      );
    });
  });

  describe('getMergeRequestNotes', () => {
    it('fetches notes and filters out system notes', async () => {
      const mockNotes = [
        {
          id: 1,
          body: 'SIGNOFF: v2.3.45 UAT',
          author: { id: 10, username: 'jane', name: 'Jane Doe' },
          created_at: '2024-01-15T10:00:00Z',
          system: false,
        },
        {
          id: 2,
          body: 'mentioned in commit abc123',
          author: { id: 0, username: 'system', name: 'System' },
          created_at: '2024-01-15T09:00:00Z',
          system: true,
        },
        {
          id: 3,
          body: 'Looks good!',
          author: { id: 11, username: 'bob', name: 'Bob Smith' },
          created_at: '2024-01-15T11:00:00Z',
          system: false,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotes,
      });

      const result = await service.getMergeRequestNotes(123, 5);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/123/merge_requests/5/notes'),
        expect.any(Object)
      );
      // Should only return non-system notes
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    it('paginates through multiple pages', async () => {
      // First page - full page
      const page1Notes = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        body: `Comment ${i + 1}`,
        author: { id: 10, username: 'user', name: 'User' },
        created_at: '2024-01-15T10:00:00Z',
        system: false,
      }));

      // Second page - partial page (end of results)
      const page2Notes = Array.from({ length: 25 }, (_, i) => ({
        id: i + 101,
        body: `Comment ${i + 101}`,
        author: { id: 10, username: 'user', name: 'User' },
        created_at: '2024-01-15T10:00:00Z',
        system: false,
      }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page1Notes,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page2Notes,
        });

      const result = await service.getMergeRequestNotes(123, 5);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(125);
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(service.getMergeRequestNotes(123, 5)).rejects.toThrow(
        'Error fetching MR notes: Forbidden (403)'
      );
    });
  });

  describe('getRepositoryFile', () => {
    it('fetches and decodes base64 file content', async () => {
      const content = '* @jane @bob\n/src/ @alice';
      const base64Content = btoa(content);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: base64Content,
          encoding: 'base64',
        }),
      });

      const result = await service.getRepositoryFile(123, 'CODEOWNERS', 'HEAD');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/123/repository/files/CODEOWNERS'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ref=HEAD'),
        expect.any(Object)
      );
      expect(result).toEqual({ content });
    });

    it('handles URL-encoded file paths', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: btoa('file content'),
          encoding: 'base64',
        }),
      });

      await service.getRepositoryFile(123, 'path/to/file.txt', 'main');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/123/repository/files/path%2Fto%2Ffile.txt'),
        expect.any(Object)
      );
    });

    it('returns null when file not found (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await service.getRepositoryFile(123, 'CODEOWNERS', 'HEAD');

      expect(result).toBeNull();
    });

    it('returns null on other errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await service.getRepositoryFile(123, 'CODEOWNERS', 'HEAD');

      expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getRepositoryFile(123, 'CODEOWNERS', 'HEAD');

      expect(result).toBeNull();
    });
  });
});

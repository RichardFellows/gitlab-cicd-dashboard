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
});

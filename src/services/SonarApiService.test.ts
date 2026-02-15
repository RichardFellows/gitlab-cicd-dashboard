import { describe, it, expect, beforeEach, vi } from 'vitest';
import SonarApiService from './SonarApiService';
import type { SonarConfig } from '../types/sonar';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

describe('SonarApiService', () => {
  const config: SonarConfig = {
    baseUrl: 'https://sonarcloud.io',
    token: 'test-token',
    organization: 'my-org',
  };
  let service: SonarApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SonarApiService(config);
  });

  describe('constructor', () => {
    it('strips trailing slashes from baseUrl', () => {
      const svc = new SonarApiService({ ...config, baseUrl: 'https://sonar.io///' });
      mockFetch.mockResolvedValueOnce(jsonResponse({ valid: true }));
      svc.testConnection();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://sonar.io/api/'),
        expect.any(Object)
      );
    });
  });

  describe('authentication', () => {
    it('sends Basic auth header with token', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ valid: true }));
      await service.testConnection();
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe(`Basic ${btoa('test-token:')}`);
    });

    it('includes organization in query params', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ valid: true }));
      await service.testConnection();
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('organization=my-org');
    });

    it('omits organization when not configured', async () => {
      const svc = new SonarApiService({ baseUrl: 'https://sonar.local', token: 't' });
      mockFetch.mockResolvedValueOnce(jsonResponse({ valid: true }));
      await svc.testConnection();
      const [url] = mockFetch.mock.calls[0];
      expect(url).not.toContain('organization');
    });
  });

  describe('testConnection', () => {
    it('returns true on success', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ valid: true }));
      expect(await service.testConnection()).toBe(true);
    });

    it('returns false on auth failure', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, 401));
      expect(await service.testConnection()).toBe(false);
    });
  });

  describe('getProjectMetrics', () => {
    const metricsResponse = {
      component: {
        measures: [
          { metric: 'coverage', value: '87.5' },
          { metric: 'bugs', value: '3' },
          { metric: 'vulnerabilities', value: '1' },
          { metric: 'code_smells', value: '42' },
          { metric: 'duplicated_lines_density', value: '2.1' },
          { metric: 'ncloc', value: '15000' },
          { metric: 'reliability_rating', value: '2' },
          { metric: 'security_rating', value: '1' },
          { metric: 'sqale_rating', value: '1' },
          { metric: 'sqale_index', value: '120' },
          { metric: 'security_hotspots', value: '0' },
        ],
      },
    };

    it('parses all metrics correctly', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(metricsResponse));
      const result = await service.getProjectMetrics('my-project');

      expect(result.projectKey).toBe('my-project');
      expect(result.coverage).toBe(87.5);
      expect(result.bugs).toBe(3);
      expect(result.vulnerabilities).toBe(1);
      expect(result.codeSmells).toBe(42);
      expect(result.duplicatedLinesDensity).toBe(2.1);
      expect(result.linesOfCode).toBe(15000);
      expect(result.reliabilityRating).toBe(2);
      expect(result.securityRating).toBe(1);
      expect(result.maintainabilityRating).toBe(1);
      expect(result.technicalDebt).toBe(120);
      expect(result.securityHotspots).toBe(0);
    });

    it('handles missing coverage gracefully', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        component: { measures: [] },
      }));
      const result = await service.getProjectMetrics('my-project');
      expect(result.coverage).toBeNull();
      expect(result.bugs).toBe(0);
    });

    it('requests correct URL with metric keys', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(metricsResponse));
      await service.getProjectMetrics('my-project', ['coverage', 'bugs']);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('component=my-project');
      expect(url).toContain('metricKeys=coverage%2Cbugs');
    });
  });

  describe('getQualityGateStatus', () => {
    it('parses quality gate result', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        projectStatus: {
          status: 'ERROR',
          conditions: [
            {
              status: 'ERROR',
              metricKey: 'new_coverage',
              comparator: 'LT',
              errorThreshold: '80',
              actualValue: '65.2',
            },
          ],
          ignoredConditions: false,
        },
      }));

      const result = await service.getQualityGateStatus('my-project');
      expect(result.status).toBe('ERROR');
      expect(result.conditions).toHaveLength(1);
      expect(result.conditions[0].metricKey).toBe('new_coverage');
      expect(result.ignoredConditions).toBe(false);
    });
  });

  describe('getIssueSeverityCounts', () => {
    it('aggregates severity facets', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        total: 46,
        issues: [],
        facets: [{
          property: 'severities',
          values: [
            { val: 'BLOCKER', count: 1 },
            { val: 'CRITICAL', count: 5 },
            { val: 'MAJOR', count: 20 },
            { val: 'MINOR', count: 15 },
            { val: 'INFO', count: 5 },
          ],
        }],
      }));

      const counts = await service.getIssueSeverityCounts('my-project');
      expect(counts.total).toBe(46);
      expect(counts.blocker).toBe(1);
      expect(counts.critical).toBe(5);
      expect(counts.major).toBe(20);
      expect(counts.minor).toBe(15);
      expect(counts.info).toBe(5);
    });
  });

  describe('getMetricHistory', () => {
    it('fetches and returns metric history', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        measures: [{
          metric: 'coverage',
          history: [
            { date: '2026-01-01', value: '80.0' },
            { date: '2026-02-01', value: '85.5' },
          ],
        }],
      }));

      const result = await service.getMetricHistory('my-project', ['coverage'], '2026-01-01');
      expect(result).toHaveLength(1);
      expect(result[0].metric).toBe('coverage');
      expect(result[0].history).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('throws on API errors with context', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ errors: [{ msg: 'Not found' }] }, 404));
      await expect(service.getProjectMetrics('bad-key'))
        .rejects.toThrow('Sonar API error: 404');
    });
  });
});

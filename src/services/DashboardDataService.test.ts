import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardDataService from './DashboardDataService';
import GitLabApiService from './GitLabApiService';
import { MainBranchTrend, ProjectMetrics } from '../types';

// Mock GitLabApiService
vi.mock('./GitLabApiService');

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
});

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CardView from './CardView';
import { Project } from '../types';

// Mock react-chartjs-2 (imported by PortfolioHealthChart via HealthBreakdown dependency chain)
vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="mock-doughnut" />,
}));

const mockProject: Project = {
  id: 1,
  name: 'Test Health Project',
  web_url: 'https://gitlab.com/test/project',
  metrics: {
    totalPipelines: 20,
    successfulPipelines: 18,
    failedPipelines: 2,
    canceledPipelines: 0,
    runningPipelines: 0,
    successRate: 90,
    avgDuration: 120,
    testMetrics: { total: 50, success: 48, failed: 2, skipped: 0, available: true },
    mainBranchPipeline: { id: 1, status: 'success', created_at: '2024-01-01', updated_at: '2024-01-01', available: true },
    codeCoverage: { coverage: 85, available: true },
    mergeRequestCounts: { totalOpen: 1, drafts: 0 },
    recentCommits: [{ id: 'abc', short_id: 'abc', title: 'test commit', created_at: '2024-01-01' }],
    mainBranchFailureRate: 10,
    durationSpikePercent: 0,
  },
};

describe('CardView with Health Score', () => {
  test('renders health badge in project cards', () => {
    render(<CardView projects={[mockProject]} onProjectSelect={vi.fn()} />);
    // Should find the health badge button
    const badges = screen.getAllByRole('button');
    const healthBadge = badges.find(b => b.getAttribute('aria-label')?.includes('Health score'));
    expect(healthBadge).toBeDefined();
  });

  test('health badge shows a numeric score', () => {
    render(<CardView projects={[mockProject]} onProjectSelect={vi.fn()} />);
    const badges = screen.getAllByRole('button');
    const healthBadge = badges.find(b => b.getAttribute('aria-label')?.includes('Health score'));
    expect(healthBadge).toBeDefined();
    // Score should be a number
    const scoreText = healthBadge!.textContent;
    expect(Number(scoreText)).toBeGreaterThanOrEqual(0);
    expect(Number(scoreText)).toBeLessThanOrEqual(100);
  });

  test('clicking health badge toggles breakdown', () => {
    render(<CardView projects={[mockProject]} onProjectSelect={vi.fn()} />);
    const badges = screen.getAllByRole('button');
    const healthBadge = badges.find(b => b.getAttribute('aria-label')?.includes('Health score'));
    
    // Breakdown should not be visible initially
    expect(screen.queryByText('Failure Rate')).toBeNull();
    
    // Click to show breakdown
    fireEvent.click(healthBadge!);
    expect(screen.getByText('Failure Rate')).toBeInTheDocument();
    expect(screen.getByText('Code Coverage')).toBeInTheDocument();
    
    // Click again to hide
    fireEvent.click(healthBadge!);
    expect(screen.queryByText('Failure Rate')).toBeNull();
  });
});

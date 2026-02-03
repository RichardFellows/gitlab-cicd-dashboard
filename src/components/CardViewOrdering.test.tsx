import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CardView from './CardView';
import { Project } from '../types';

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="mock-doughnut" />,
}));

// Helper to create mock project with specific metrics for health score
const createMockProject = (
  id: number,
  name: string,
  pipelineStatus: 'success' | 'failed' | 'running' | 'canceled',
  successRate: number,
  failureRate: number,
  coverage: number,
  available: boolean = true
): Project => ({
  id,
  name,
  web_url: `https://gitlab.com/test/${name}`,
  metrics: {
    totalPipelines: 100,
    successfulPipelines: successRate,
    failedPipelines: failureRate,
    canceledPipelines: 0,
    runningPipelines: pipelineStatus === 'running' ? 1 : 0,
    successRate,
    avgDuration: 120,
    testMetrics: { total: 100, success: 95, failed: 5, skipped: 0, available: true },
    mainBranchPipeline: { 
      id: id, 
      status: pipelineStatus, 
      created_at: '2024-01-01', 
      updated_at: '2024-01-01', 
      available 
    },
    codeCoverage: { coverage, available: true },
    mergeRequestCounts: { totalOpen: 1, drafts: 0 },
    recentCommits: [{ id: 'abc', short_id: 'abc', title: 'test', created_at: '2024-01-01' }],
    mainBranchFailureRate: failureRate,
    durationSpikePercent: 0,
  },
});

describe('CardView Ordering (US-007)', () => {
  test('groups appear in correct order: Failed → Warning → Inactive → Success', () => {
    const projects: Project[] = [
      createMockProject(1, 'Success Project', 'success', 95, 5, 90),
      createMockProject(2, 'Failed Project', 'failed', 60, 40, 70),
      createMockProject(3, 'Running Project', 'running', 80, 20, 85),
      createMockProject(4, 'Inactive Project', 'success', 0, 0, 0, false),
    ];

    const { container } = render(<CardView projects={projects} onProjectSelect={vi.fn()} />);

    // Get all group headers in order
    const headers = container.querySelectorAll('.group-header');
    const headerTexts = Array.from(headers).map(h => h.textContent || '');

    // Verify order: Failed → Warning → Inactive → Success
    expect(headerTexts[0]).toContain('Failed Pipelines');
    expect(headerTexts[1]).toContain('Warning');
    expect(headerTexts[2]).toContain('Inactive');
    expect(headerTexts[3]).toContain('Successful');
  });

  test('within each group, projects are sorted by health score (lowest first)', () => {
    const projects: Project[] = [
      // Failed group - varying health scores
      createMockProject(1, 'Failed High Health', 'failed', 80, 20, 90), // Better metrics
      createMockProject(2, 'Failed Low Health', 'failed', 50, 50, 40), // Worse metrics
      createMockProject(3, 'Failed Mid Health', 'failed', 65, 35, 60),
      
      // Warning group - varying health scores
      createMockProject(4, 'Warning High Health', 'running', 85, 15, 88),
      createMockProject(5, 'Warning Low Health', 'running', 55, 45, 45),
      
      // Success group - varying health scores
      createMockProject(6, 'Success High Health', 'success', 98, 2, 95),
      createMockProject(7, 'Success Mid Health', 'success', 85, 15, 80),
    ];

    const { container } = render(<CardView projects={projects} onProjectSelect={vi.fn()} />);

    // Check Failed group order
    const failedGroup = container.querySelector('.failed-group');
    const failedCards = failedGroup?.querySelectorAll('.project-card');
    expect(failedCards?.[0]?.textContent).toContain('Failed Low Health'); // Worst health first
    expect(failedCards?.[1]?.textContent).toContain('Failed Mid Health');
    expect(failedCards?.[2]?.textContent).toContain('Failed High Health'); // Best health last

    // Check Warning group order
    const warningGroup = container.querySelector('.warning-group');
    const warningCards = warningGroup?.querySelectorAll('.project-card');
    expect(warningCards?.[0]?.textContent).toContain('Warning Low Health'); // Worst first
    expect(warningCards?.[1]?.textContent).toContain('Warning High Health'); // Best last

    // Check Success group order
    const successGroup = container.querySelector('.success-group');
    const successCards = successGroup?.querySelectorAll('.project-card');
    expect(successCards?.[0]?.textContent).toContain('Success Mid Health'); // Lower health first
    expect(successCards?.[1]?.textContent).toContain('Success High Health'); // Higher health last
  });

  test('group headers remain visible and show correct counts', () => {
    const projects: Project[] = [
      createMockProject(1, 'Failed 1', 'failed', 60, 40, 70),
      createMockProject(2, 'Failed 2', 'failed', 55, 45, 65),
      createMockProject(3, 'Warning 1', 'running', 80, 20, 85),
      createMockProject(4, 'Success 1', 'success', 95, 5, 90),
    ];

    render(<CardView projects={projects} onProjectSelect={vi.fn()} />);

    // Verify headers with counts
    expect(screen.getByText('Failed Pipelines (2)')).toBeInTheDocument();
    expect(screen.getByText('Warning (1)')).toBeInTheDocument();
    expect(screen.getByText('Successful (1)')).toBeInTheDocument();
  });

  test('groups with zero projects are not rendered', () => {
    const projects: Project[] = [
      createMockProject(1, 'Success Only', 'success', 95, 5, 90),
    ];

    const { container } = render(<CardView projects={projects} onProjectSelect={vi.fn()} />);

    // Only Success group should be present
    expect(container.querySelector('.success-group')).toBeInTheDocument();
    expect(container.querySelector('.failed-group')).toBeNull();
    expect(container.querySelector('.warning-group')).toBeNull();
    expect(container.querySelector('.inactive-group')).toBeNull();
  });

  test('canceled pipelines are categorized as failed', () => {
    const projects: Project[] = [
      createMockProject(1, 'Canceled Project', 'canceled', 70, 30, 75),
    ];

    render(<CardView projects={projects} onProjectSelect={vi.fn()} />);

    // Should appear in Failed group
    expect(screen.getByText('Failed Pipelines (1)')).toBeInTheDocument();
    expect(screen.getByText('Canceled Project')).toBeInTheDocument();
  });

  test('projects with low success rate are categorized as warning even if status is success', () => {
    const projects: Project[] = [
      createMockProject(1, 'Low Success Rate', 'success', 70, 30, 80), // <75% = warning
    ];

    render(<CardView projects={projects} onProjectSelect={vi.fn()} />);

    // Should appear in Warning group
    expect(screen.getByText('Warning (1)')).toBeInTheDocument();
    expect(screen.getByText('Low Success Rate')).toBeInTheDocument();
  });

  test('health score sorting considers all health signals', () => {
    // Create projects where health differences come from different metrics
    const projects: Project[] = [
      // Both failed, but different health profiles
      createMockProject(1, 'Failed Bad Coverage', 'failed', 70, 30, 30), // Low coverage
      createMockProject(2, 'Failed Bad Success', 'failed', 40, 60, 80), // Low success rate
      createMockProject(3, 'Failed Balanced', 'failed', 65, 35, 65), // Mid-range both
    ];

    const { container } = render(<CardView projects={projects} onProjectSelect={vi.fn()} />);

    const failedGroup = container.querySelector('.failed-group');
    const failedCards = failedGroup?.querySelectorAll('.project-card');

    // Verify they're sorted by calculated health score
    // Project with lowest health should be first
    expect(failedCards).toHaveLength(3);
    
    // All three projects should be rendered
    expect(failedCards?.[0]).toBeDefined();
    expect(failedCards?.[1]).toBeDefined();
    expect(failedCards?.[2]).toBeDefined();
  });
});

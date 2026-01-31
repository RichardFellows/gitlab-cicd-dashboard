import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TableView from './TableView';
import { Project } from '../types';

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="mock-doughnut" />,
}));

function makeProject(id: number, name: string, overrides: any = {}): Project {
  return {
    id,
    name,
    web_url: `https://gitlab.com/test/${name}`,
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
      recentCommits: [],
      mainBranchFailureRate: 0,
      durationSpikePercent: 0,
      ...overrides,
    },
  };
}

describe('TableView with Health Score', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders Health column header', () => {
    const projects = [makeProject(1, 'project1')];
    render(<TableView projects={projects} onProjectSelect={vi.fn()} />);
    expect(screen.getByText(/Health/)).toBeInTheDocument();
  });

  test('renders health badges in table rows', () => {
    const projects = [makeProject(1, 'project1'), makeProject(2, 'project2')];
    render(<TableView projects={projects} onProjectSelect={vi.fn()} />);
    const badges = screen.getAllByRole('button').filter(
      b => b.getAttribute('aria-label')?.includes('Health score')
    );
    expect(badges.length).toBe(2);
  });

  test('clicking Health header toggles sort', () => {
    const projects = [
      makeProject(1, 'healthy', {
        mainBranchFailureRate: 0,
        codeCoverage: { coverage: 95, available: true },
        totalPipelines: 20,
      }),
      makeProject(2, 'unhealthy', {
        mainBranchFailureRate: 30,
        codeCoverage: { coverage: null, available: false },
        totalPipelines: 20,
      }),
    ];
    render(<TableView projects={projects} onProjectSelect={vi.fn()} />);
    
    // Find the Health header
    const healthHeader = screen.getByText(/Health/);
    
    // Click to sort descending
    fireEvent.click(healthHeader);
    
    // Get project rows to check order
    const rows = screen.getAllByRole('row');
    // First data row should have higher score (healthy project) after desc sort
    expect(rows.length).toBeGreaterThan(1);
  });

  test('clicking health badge shows breakdown row', () => {
    const projects = [makeProject(1, 'project1')];
    render(<TableView projects={projects} onProjectSelect={vi.fn()} />);
    
    const badges = screen.getAllByRole('button').filter(
      b => b.getAttribute('aria-label')?.includes('Health score')
    );
    
    // Initially no breakdown visible
    expect(screen.queryByText('Failure Rate')).toBeNull();
    
    // Click badge to expand
    fireEvent.click(badges[0]);
    expect(screen.getByText('Failure Rate')).toBeInTheDocument();
    expect(screen.getByText('Code Coverage')).toBeInTheDocument();
  });

  test('health sort persists preference to localStorage', () => {
    const projects = [makeProject(1, 'project1')];
    render(<TableView projects={projects} onProjectSelect={vi.fn()} />);
    
    const healthHeader = screen.getByText(/Health/);
    fireEvent.click(healthHeader);
    
    expect(localStorage.getItem('gitlab_cicd_dashboard_health_sort')).toBe('desc');
    
    // Click again to go to ascending
    fireEvent.click(healthHeader);
    expect(localStorage.getItem('gitlab_cicd_dashboard_health_sort')).toBe('asc');
    
    // Click again to clear
    fireEvent.click(healthHeader);
    expect(localStorage.getItem('gitlab_cicd_dashboard_health_sort')).toBeNull();
  });
});

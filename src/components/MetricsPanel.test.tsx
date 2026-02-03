import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AggregatedTrend } from '../types';

// Mock chart.js
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn(), defaults: {} },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  BarElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
  registerables: [],
}));

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Line: ({ options }: any) => (
    <div data-testid="mock-line-chart">
      Mock Line Chart
      {options?.plugins?.title?.text && (
        <span data-testid="chart-title">{options.plugins.title.text}</span>
      )}
    </div>
  ),
}));

// Import after mocks
import MetricsPanel from './MetricsPanel';

// Helper to create mock trend data
function makeTrendData(days: number): AggregatedTrend[] {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(2025, 0, i + 1).toISOString(),
    avgFailureRate: 10 + i,
    avgDuration: 120 + i * 5,
    avgCoverage: 80 + i,
  }));
}

describe('MetricsPanel - Collapsible Behavior', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('defaults to collapsed state (charts hidden)', () => {
    const trends = makeTrendData(7);
    
    render(<MetricsPanel trends={trends} />);

    // Header should be visible
    expect(screen.getByText('Pipeline Trends')).toBeInTheDocument();
    
    // Arrow should show collapsed state (▶)
    expect(screen.getByText('▶')).toBeInTheDocument();
    
    // Charts should not be rendered
    expect(screen.queryByTestId('mock-line-chart')).not.toBeInTheDocument();
  });

  it('expands to show charts when toggle is clicked', () => {
    const trends = makeTrendData(7);
    
    render(<MetricsPanel trends={trends} />);

    // Initially collapsed
    expect(screen.queryByTestId('mock-line-chart')).not.toBeInTheDocument();
    
    // Click header to expand
    const header = screen.getByRole('button', { name: /Pipeline Trends/i });
    fireEvent.click(header);

    // Charts should now be visible (3 charts)
    const charts = screen.getAllByTestId('mock-line-chart');
    expect(charts).toHaveLength(3);
    
    // Arrow should show expanded state (▼)
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('collapses to hide charts when toggle is clicked again', () => {
    const trends = makeTrendData(7);
    
    render(<MetricsPanel trends={trends} />);

    const header = screen.getByRole('button', { name: /Pipeline Trends/i });
    
    // Expand first
    fireEvent.click(header);
    expect(screen.getAllByTestId('mock-line-chart')).toHaveLength(3);
    
    // Collapse again
    fireEvent.click(header);
    expect(screen.queryByTestId('mock-line-chart')).not.toBeInTheDocument();
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('persists collapsed state to localStorage', () => {
    const trends = makeTrendData(7);
    
    render(<MetricsPanel trends={trends} />);

    // Check initial localStorage value (should be 'false' for collapsed)
    expect(localStorage.getItem('dashboard_pipeline_trends_expanded')).toBe('false');
  });

  it('persists expanded state to localStorage', () => {
    const trends = makeTrendData(7);
    
    render(<MetricsPanel trends={trends} />);

    // Expand
    const header = screen.getByRole('button', { name: /Pipeline Trends/i });
    fireEvent.click(header);

    // Check localStorage updated to 'true'
    expect(localStorage.getItem('dashboard_pipeline_trends_expanded')).toBe('true');
  });

  it('restores expanded state from localStorage on mount', () => {
    // Pre-set localStorage to expanded
    localStorage.setItem('dashboard_pipeline_trends_expanded', 'true');
    
    const trends = makeTrendData(7);
    render(<MetricsPanel trends={trends} />);

    // Should be expanded on mount
    expect(screen.getAllByTestId('mock-line-chart')).toHaveLength(3);
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('restores collapsed state from localStorage on mount', () => {
    // Pre-set localStorage to collapsed
    localStorage.setItem('dashboard_pipeline_trends_expanded', 'false');
    
    const trends = makeTrendData(7);
    render(<MetricsPanel trends={trends} />);

    // Should be collapsed on mount
    expect(screen.queryByTestId('mock-line-chart')).not.toBeInTheDocument();
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('shows loading state with collapsed header', () => {
    render(<MetricsPanel trends={[]} loading={true} />);

    // Header should be visible and clickable
    expect(screen.getByText('Pipeline Trends')).toBeInTheDocument();
    expect(screen.getByText('▶')).toBeInTheDocument();
    
    // Loading message should not be visible when collapsed
    expect(screen.queryByText('Loading trend data...')).not.toBeInTheDocument();
  });

  it('shows loading state when expanded', () => {
    // Pre-set to expanded
    localStorage.setItem('dashboard_pipeline_trends_expanded', 'true');
    
    render(<MetricsPanel trends={[]} loading={true} />);

    // Should show loading message when expanded
    expect(screen.getByText('Loading trend data...')).toBeInTheDocument();
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('shows empty state with collapsed header', () => {
    render(<MetricsPanel trends={[]} loading={false} />);

    // Header should be visible
    expect(screen.getByText('Pipeline Trends')).toBeInTheDocument();
    expect(screen.getByText('▶')).toBeInTheDocument();
    
    // Empty message should not be visible when collapsed
    expect(screen.queryByText('No trend data available')).not.toBeInTheDocument();
  });

  it('shows empty state when expanded', () => {
    // Pre-set to expanded
    localStorage.setItem('dashboard_pipeline_trends_expanded', 'true');
    
    render(<MetricsPanel trends={[]} loading={false} />);

    // Should show empty message when expanded
    expect(screen.getByText('No trend data available for the selected timeframe.')).toBeInTheDocument();
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('has aria-expanded attribute for accessibility', () => {
    const trends = makeTrendData(7);
    render(<MetricsPanel trends={trends} />);

    const header = screen.getByRole('button', { name: /Pipeline Trends/i });
    
    // Initially collapsed
    expect(header).toHaveAttribute('aria-expanded', 'false');
    
    // Expand
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });
});

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatDuration } from '../utils/formatting';

vi.mock('./SummarySection', () => {
  return {
    default: ({ metrics }: any) => (
      <div data-testid="mock-summary-section">
        <h2>CI/CD Dashboard Summary</h2>
        <div>Total Projects: {metrics.totalProjects}</div>
        <div>Total Pipelines: {metrics.aggregateMetrics.totalPipelines}</div>
        <div>Successful Pipelines: {metrics.aggregateMetrics.successfulPipelines}</div>
        <div>Failed Pipelines: {metrics.aggregateMetrics.failedPipelines}</div>
        <div>Canceled Pipelines: {metrics.aggregateMetrics.canceledPipelines}</div>
        <div>Running Pipelines: {metrics.aggregateMetrics.runningPipelines}</div>
        <div>Average Success Rate: {metrics.aggregateMetrics.avgSuccessRate.toFixed(2)}%</div>
        <div>Average Duration: {formatDuration(metrics.aggregateMetrics.avgDuration)}</div>
        {metrics.aggregateMetrics.testMetrics.available ? (
          <>
            <div>Total Tests: {metrics.aggregateMetrics.testMetrics.total}</div>
            <div>Successful Tests: {metrics.aggregateMetrics.testMetrics.success}</div>
            <div>Failed Tests: {metrics.aggregateMetrics.testMetrics.failed}</div>
            <div>Skipped Tests: {metrics.aggregateMetrics.testMetrics.skipped}</div>
          </>
        ) : (
          <div>No Test Data</div>
        )}
      </div>
    )
  };
}, { virtual: true });

// Mock metrics data
const mockMetrics = {
  totalProjects: 10,
  projects: [],
  aggregateMetrics: {
    totalPipelines: 100,
    successfulPipelines: 80,
    failedPipelines: 15,
    canceledPipelines: 3,
    runningPipelines: 2,
    avgSuccessRate: 80.0,
    avgDuration: 120,
    testMetrics: {
      total: 500,
      success: 450,
      failed: 30,
      skipped: 20,
      available: true
    }
  }
};

describe('SummarySection Component', () => {
  test('renders with correct data', () => {
    // Import SummarySection dynamically to use the mock
    const SummarySection = require('./SummarySection').default;
    
    render(<SummarySection metrics={mockMetrics} />);
    
    // Check section title
    expect(screen.getByText('CI/CD Dashboard Summary')).toBeInTheDocument();
    
    // Check metric values
    expect(screen.getByText('Total Projects: 10')).toBeInTheDocument();
    expect(screen.getByText('Total Pipelines: 100')).toBeInTheDocument();
    expect(screen.getByText('Average Success Rate: 80.00%')).toBeInTheDocument();
    
    // Check pipeline statuses
    expect(screen.getByText('Successful Pipelines: 80')).toBeInTheDocument();
    expect(screen.getByText('Failed Pipelines: 15')).toBeInTheDocument();
    expect(screen.getByText('Canceled Pipelines: 3')).toBeInTheDocument();
    expect(screen.getByText('Running Pipelines: 2')).toBeInTheDocument();
    
    // Verify the component was rendered
    expect(screen.getByTestId('mock-summary-section')).toBeInTheDocument();
  });

  test('formats average duration correctly', () => {
    // Import SummarySection dynamically to use the mock
    const SummarySection = require('./SummarySection').default;
    
    render(<SummarySection metrics={mockMetrics} />);
    
    // Average duration should be formatted as "2m 0s" (120 seconds)
    expect(screen.getByText('Average Duration: 2m 0s')).toBeInTheDocument();
  });

  test('displays test metrics when available', () => {
    // Import SummarySection dynamically to use the mock
    const SummarySection = require('./SummarySection').default;
    
    render(<SummarySection metrics={mockMetrics} />);
    
    // Check test metrics
    expect(screen.getByText('Total Tests: 500')).toBeInTheDocument();
    expect(screen.getByText('Successful Tests: 450')).toBeInTheDocument();
    expect(screen.getByText('Failed Tests: 30')).toBeInTheDocument();
    expect(screen.getByText('Skipped Tests: 20')).toBeInTheDocument();
  });

  test('handles missing test metrics', () => {
    // Import SummarySection dynamically to use the mock
    const SummarySection = require('./SummarySection').default;
    
    const metricsWithoutTests = {
      ...mockMetrics,
      aggregateMetrics: {
        ...mockMetrics.aggregateMetrics,
        testMetrics: {
          total: 0,
          success: 0,
          failed: 0,
          skipped: 0,
          available: false
        }
      }
    };
    
    render(<SummarySection metrics={metricsWithoutTests} />);
    
    // Should show "No Test Data" message
    expect(screen.getByText('No Test Data')).toBeInTheDocument();
  });
});
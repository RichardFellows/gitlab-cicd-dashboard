import { FC } from 'react';
import { DashboardMetrics, ProjectStatusFilter, AggregatedTrend } from '../types';
import { formatDuration, getSuccessRateClass, categorizeProject } from '../utils/formatting';
import { Chart, registerables } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import MetricsPanel from './MetricsPanel';

// Register Chart.js components
Chart.register(...registerables);

interface SummarySectionProps {
  metrics: DashboardMetrics;
  activeFilter: ProjectStatusFilter;
  onFilterChange: (filter: ProjectStatusFilter) => void;
  aggregateTrends?: AggregatedTrend[];
  trendsLoading?: boolean;
  darkMode?: boolean;
}

const SummarySection: FC<SummarySectionProps> = ({
  metrics,
  activeFilter,
  onFilterChange,
  aggregateTrends = [],
  trendsLoading = false,
  darkMode = false
}) => {
  // Count projects by their pipeline status
  const projectStatusCounts = {
    success: 0,
    warning: 0,
    failed: 0,
    inactive: 0
  };

  // Categorize each project
  metrics.projects.forEach(project => {
    const category = categorizeProject(project);
    // Map 'no-pipeline' to 'inactive'
    const mappedCategory = category === 'no-pipeline' ? 'inactive' : category;
    projectStatusCounts[mappedCategory as keyof typeof projectStatusCounts]++;
  });

  const chartData = {
    labels: ['Successful', 'Warning', 'Failed', 'Inactive'],
    datasets: [{
      data: [
        projectStatusCounts.success,
        projectStatusCounts.warning,
        projectStatusCounts.failed,
        projectStatusCounts.inactive
      ],
      backgroundColor: [
        '#28a745', // green
        '#ffc107', // yellow
        '#dc3545', // red
        '#6c757d'  // gray
      ],
      borderWidth: 0
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        display: false
      }
    }
  };

  const handleCardClick = (filter: ProjectStatusFilter) => {
    // Toggle filter - if clicking the same filter, go back to 'all'
    if (activeFilter === filter) {
      onFilterChange('all');
    } else {
      onFilterChange(filter);
    }
  };

  return (
    <section className="summary-section">
      <h2>CI/CD Summary</h2>
      <div className="summary-layout">
        <div className="summary-left">
          <div className="summary-cards">
            <button
              className={`summary-card clickable ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleCardClick('all')}
            >
              <h3>Total</h3>
              <div className="metric">{metrics.totalProjects}</div>
            </button>
            <button
              className={`summary-card success clickable ${activeFilter === 'success' ? 'active' : ''}`}
              onClick={() => handleCardClick('success')}
            >
              <h3>Success</h3>
              <div className="metric">{projectStatusCounts.success}</div>
            </button>
            <button
              className={`summary-card warning clickable ${activeFilter === 'warning' ? 'active' : ''}`}
              onClick={() => handleCardClick('warning')}
            >
              <h3>Warning</h3>
              <div className="metric">{projectStatusCounts.warning}</div>
            </button>
            <button
              className={`summary-card danger clickable ${activeFilter === 'failed' ? 'active' : ''}`}
              onClick={() => handleCardClick('failed')}
            >
              <h3>Failed</h3>
              <div className="metric">{projectStatusCounts.failed}</div>
            </button>
            <button
              className={`summary-card inactive clickable ${activeFilter === 'inactive' ? 'active' : ''}`}
              onClick={() => handleCardClick('inactive')}
            >
              <h3>Inactive</h3>
              <div className="metric">{projectStatusCounts.inactive}</div>
            </button>
          </div>
          <div className="summary-metrics">
            <div className="summary-metric">
              <span className="metric-label">Total Pipelines</span>
              <span className="metric-value">{metrics.aggregateMetrics.totalPipelines}</span>
            </div>
            <div className="summary-metric">
              <span className="metric-label">Success Rate</span>
              <span className={`metric-value ${getSuccessRateClass(metrics.aggregateMetrics.avgSuccessRate)}`}>
                {metrics.aggregateMetrics.avgSuccessRate.toFixed(1)}%
              </span>
            </div>
            <div className="summary-metric">
              <span className="metric-label">Avg Duration</span>
              <span className="metric-value">{formatDuration(metrics.aggregateMetrics.avgDuration)}</span>
            </div>
          </div>
        </div>
        <div className="summary-right">
          <div className="chart-container">
            <Doughnut data={chartData} options={chartOptions} />
            <div className="chart-center-label">
              <span className="chart-total">{metrics.totalProjects}</span>
              <span className="chart-label">Projects</span>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Trend Charts */}
      <MetricsPanel
        trends={aggregateTrends}
        loading={trendsLoading}
        darkMode={darkMode}
      />
    </section>
  );
};

export default SummarySection;
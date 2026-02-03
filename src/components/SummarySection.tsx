import { FC, useState } from 'react';
import { DashboardMetrics, ProjectStatusFilter, AggregatedTrend } from '../types';
import { formatDuration, getSuccessRateClass, categorizeProject } from '../utils/formatting';
import { Chart, registerables } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import MetricsPanel from './MetricsPanel';
import PortfolioHealthChart from './PortfolioHealthChart';
import FailureSummaryPanel from './FailureSummaryPanel';

// Register Chart.js components
Chart.register(...registerables);

interface SummarySectionProps {
  metrics: DashboardMetrics;
  activeFilter: ProjectStatusFilter;
  onFilterChange: (filter: ProjectStatusFilter) => void;
  aggregateTrends?: AggregatedTrend[];
  trendsLoading?: boolean;
  darkMode?: boolean;
  onProjectSelect?: (projectId: number) => void;
  onChartCanvasReady?: (name: string, canvas: HTMLCanvasElement | null) => void;
}

const SummarySection: FC<SummarySectionProps> = ({
  metrics,
  activeFilter,
  onFilterChange,
  aggregateTrends = [],
  trendsLoading = false,
  darkMode = false,
  onProjectSelect,
  onChartCanvasReady,
}) => {
  const [failuresCollapsed, setFailuresCollapsed] = useState(false);
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
      <div className="summary-compact-layout">
        <div className="summary-stats-row">
          <button
            className={`summary-card compact clickable ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleCardClick('all')}
          >
            <h3>Total</h3>
            <div className="metric">{metrics.totalProjects}</div>
          </button>
          <button
            className={`summary-card compact success clickable ${activeFilter === 'success' ? 'active' : ''}`}
            onClick={() => handleCardClick('success')}
          >
            <h3>Success</h3>
            <div className="metric">{projectStatusCounts.success}</div>
          </button>
          <button
            className={`summary-card compact warning clickable ${activeFilter === 'warning' ? 'active' : ''}`}
            onClick={() => handleCardClick('warning')}
          >
            <h3>Warning</h3>
            <div className="metric">{projectStatusCounts.warning}</div>
          </button>
          <button
            className={`summary-card compact danger clickable ${activeFilter === 'failed' ? 'active' : ''}`}
            onClick={() => handleCardClick('failed')}
          >
            <h3>Failed</h3>
            <div className="metric">{projectStatusCounts.failed}</div>
          </button>
          <button
            className={`summary-card compact inactive clickable ${activeFilter === 'inactive' ? 'active' : ''}`}
            onClick={() => handleCardClick('inactive')}
          >
            <h3>Inactive</h3>
            <div className="metric">{projectStatusCounts.inactive}</div>
          </button>
        </div>
        <div className="summary-health-chart">
          <div className="chart-container compact">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
      <div className="summary-secondary-stats">
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

      {/* Portfolio Health */}
      <PortfolioHealthChart projects={metrics.projects} darkMode={darkMode} />

      {/* Failure Summary */}
      {projectStatusCounts.failed > 0 && onProjectSelect && (
        <div className="failure-summary-section" style={{ marginTop: '16px' }}>
          <button
            onClick={() => setFailuresCollapsed(!failuresCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit',
              fontWeight: 600,
              fontSize: '16px',
              color: darkMode ? '#c9d1d9' : '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{failuresCollapsed ? '▶' : '▼'}</span>
            Failures ({projectStatusCounts.failed})
          </button>
          {!failuresCollapsed && (
            <FailureSummaryPanel
              projects={metrics.projects}
              onProjectSelect={onProjectSelect}
              darkMode={darkMode}
            />
          )}
        </div>
      )}

      {/* Aggregate Trend Charts */}
      <MetricsPanel
        trends={aggregateTrends}
        loading={trendsLoading}
        darkMode={darkMode}
        onChartCanvasReady={onChartCanvasReady}
      />
    </section>
  );
};

export default SummarySection;
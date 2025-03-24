import { FC } from 'react';
import { DashboardMetrics } from '../types';
import { formatDuration, getSuccessRateClass, categorizeProject } from '../utils/formatting';
import { Chart, registerables } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
Chart.register(...registerables);

interface SummarySectionProps {
  metrics: DashboardMetrics;
}

const SummarySection: FC<SummarySectionProps> = ({ metrics }) => {
  // Count projects by their pipeline status
  const projectStatusCounts = {
    success: 0,
    warning: 0,
    failed: 0,
    'no-pipeline': 0
  };
  
  // Categorize each project
  metrics.projects.forEach(project => {
    const category = categorizeProject(project);
    projectStatusCounts[category as keyof typeof projectStatusCounts]++;
  });

  const chartData = {
    labels: ['Successful', 'Warning', 'Failed', 'No Pipeline'],
    datasets: [{
      data: [
        projectStatusCounts.success,
        projectStatusCounts.warning,
        projectStatusCounts.failed,
        projectStatusCounts['no-pipeline']
      ],
      backgroundColor: [
        '#28a745', // green
        '#ffc107', // yellow
        '#dc3545', // red
        '#6c757d'  // gray
      ]
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const
      }
    }
  };

  return (
    <section className="summary-section">
      <h2>CI/CD Summary</h2>
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Projects</h3>
          <div className="metric">{metrics.totalProjects}</div>
        </div>
        <div className="summary-card success">
          <h3>Successful</h3>
          <div className="metric">{projectStatusCounts.success}</div>
        </div>
        <div className="summary-card warning">
          <h3>Warning</h3>
          <div className="metric">{projectStatusCounts.warning}</div>
        </div>
        <div className="summary-card danger">
          <h3>Failed</h3>
          <div className="metric">{projectStatusCounts.failed}</div>
        </div>
        <div className="summary-card no-pipeline">
          <h3>No Pipeline</h3>
          <div className="metric">{projectStatusCounts['no-pipeline']}</div>
        </div>
      </div>
      <div className="summary-metrics">
        <div className="summary-metric-row">
          <div className="summary-metric">
            <span className="metric-label">Total Pipelines:</span>
            <span className="metric-value">{metrics.aggregateMetrics.totalPipelines}</span>
          </div>
          <div className="summary-metric">
            <span className="metric-label">Success Rate:</span>
            <span className={`metric-value ${getSuccessRateClass(metrics.aggregateMetrics.avgSuccessRate)}`}>
              {metrics.aggregateMetrics.avgSuccessRate.toFixed(2)}%
            </span>
          </div>
          <div className="summary-metric">
            <span className="metric-label">Avg Duration:</span>
            <span className="metric-value">{formatDuration(metrics.aggregateMetrics.avgDuration)}</span>
          </div>
        </div>
      </div>
      <div className="chart-container" style={{ height: 300 }}>
        <Pie data={chartData} options={chartOptions} />
      </div>
    </section>
  );
};

export default SummarySection;
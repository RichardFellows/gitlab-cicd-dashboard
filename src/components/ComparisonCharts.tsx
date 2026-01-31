import { FC, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Project, PipelineTrend } from '../types';
import TrendChart, { TrendDataset } from './TrendChart';
import { getUnionDateLabels, alignTrendData, formatDateLabels } from '../utils/comparisonUtils';

// Register Chart.js bar components
ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

interface ComparisonChartsProps {
  projects: Project[];
  trendData: Map<number, PipelineTrend[]>;
  colours: string[];
  darkMode?: boolean;
  loading: boolean;
}

const ComparisonCharts: FC<ComparisonChartsProps> = ({
  projects,
  trendData,
  colours,
  darkMode = false,
  loading,
}) => {
  // Compute aligned date labels
  const unionLabels = useMemo(() => getUnionDateLabels(trendData), [trendData]);
  const displayLabels = useMemo(() => formatDateLabels(unionLabels), [unionLabels]);

  // Build success rate datasets
  const successRateDatasets: TrendDataset[] = useMemo(() => {
    return projects.map((project, i) => {
      const trends = trendData.get(project.id) || [];
      return {
        label: project.name,
        data: alignTrendData(trends, unionLabels, t => t.successRate),
        borderColor: colours[i],
        backgroundColor: `${colours[i]}33`,
        fill: false,
        tension: 0.3,
      };
    });
  }, [projects, trendData, unionLabels, colours]);

  // Build duration datasets
  const durationDatasets: TrendDataset[] = useMemo(() => {
    return projects.map((project, i) => {
      const trends = trendData.get(project.id) || [];
      return {
        label: project.name,
        data: alignTrendData(trends, unionLabels, t => t.avgDuration),
        borderColor: colours[i],
        backgroundColor: `${colours[i]}33`,
        fill: false,
        tension: 0.3,
      };
    });
  }, [projects, trendData, unionLabels, colours]);

  // Build coverage bar chart data
  const coverageData = useMemo(() => {
    const labels = projects.map(p => p.name);
    const data = projects.map(p => {
      const cov = p.metrics.codeCoverage;
      return cov.available && cov.coverage !== null ? cov.coverage : 0;
    });
    return {
      labels,
      datasets: [
        {
          label: 'Coverage %',
          data,
          backgroundColor: colours.slice(0, projects.length),
          borderColor: colours.slice(0, projects.length),
          borderWidth: 1,
        },
      ],
    };
  }, [projects, colours]);

  // Build MR backlog grouped bar chart data
  const mrData = useMemo(() => {
    const labels = projects.map(p => p.name);
    const openData = projects.map(p => p.metrics.mergeRequestCounts.totalOpen);
    const draftData = projects.map(p => p.metrics.mergeRequestCounts.drafts);
    return {
      labels,
      datasets: [
        {
          label: 'Open MRs',
          data: openData,
          backgroundColor: colours.slice(0, projects.length).map(c => `${c}cc`),
          borderColor: colours.slice(0, projects.length),
          borderWidth: 1,
        },
        {
          label: 'Draft MRs',
          data: draftData,
          backgroundColor: colours.slice(0, projects.length).map(c => `${c}66`),
          borderColor: colours.slice(0, projects.length),
          borderWidth: 1,
        },
      ],
    };
  }, [projects, colours]);

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: darkMode ? '#e0e0e0' : '#333',
            font: { size: 11 },
          },
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
        },
      },
      scales: {
        x: {
          ticks: { color: darkMode ? '#aaa' : '#666' },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: darkMode ? '#aaa' : '#666' },
          grid: { color: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
        },
      },
    }),
    [darkMode]
  );

  if (loading) {
    return (
      <div className="comparison-charts" data-testid="comparison-charts-loading">
        <div className="comparison-charts__loading">
          <div className="comparison-charts__spinner" />
          <p>Loading trend data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="comparison-charts" data-testid="comparison-charts">
      <div className="comparison-charts__grid">
        {/* Success Rate Trend */}
        <div className="comparison-charts__panel">
          <TrendChart
            title="Success Rate Trend"
            labels={displayLabels}
            datasets={successRateDatasets}
            height={250}
            yAxisLabel="Rate (%)"
            yAxisMax={100}
            showLegend
          />
        </div>

        {/* Duration Trend */}
        <div className="comparison-charts__panel">
          <TrendChart
            title="Duration Trend"
            labels={displayLabels}
            datasets={durationDatasets}
            height={250}
            yAxisLabel="Duration (s)"
            showLegend
          />
        </div>

        {/* Coverage Comparison */}
        <div className="comparison-charts__panel">
          <h4 className="comparison-charts__title">Coverage Comparison</h4>
          <div className="chart-wrapper" style={{ height: 250 }}>
            <Bar data={coverageData} options={barOptions} />
          </div>
        </div>

        {/* MR Backlog Comparison */}
        <div className="comparison-charts__panel">
          <h4 className="comparison-charts__title">MR Backlog</h4>
          <div className="chart-wrapper" style={{ height: 250 }}>
            <Bar data={mrData} options={barOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonCharts;

import { FC, useMemo } from 'react';
import TrendChart, { TrendDataset } from './TrendChart';
import { AggregatedTrend } from '../types';
import { METRICS_THRESHOLDS, CHART_COLORS } from '../utils/constants';
import '../styles/MetricsPanel.css';

interface MetricsPanelProps {
  trends: AggregatedTrend[];
  loading?: boolean;
  darkMode?: boolean;
  onChartCanvasReady?: (name: string, canvas: HTMLCanvasElement | null) => void;
}

const MetricsPanel: FC<MetricsPanelProps> = ({ trends, loading = false, darkMode = false, onChartCanvasReady }) => {
  // Format date labels (show only day/month for brevity)
  const labels = useMemo(() => {
    return trends.map(t => {
      const date = new Date(t.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
  }, [trends]);

  // Failure rate data
  const failureRateDataset: TrendDataset = useMemo(() => ({
    label: 'Failure Rate',
    data: trends.map(t => t.avgFailureRate),
    borderColor: darkMode ? '#f44336' : CHART_COLORS.failureRate,
    fill: true
  }), [trends, darkMode]);

  // Duration data
  const durationDataset: TrendDataset = useMemo(() => ({
    label: 'Avg Duration',
    data: trends.map(t => t.avgDuration),
    borderColor: darkMode ? '#ff9800' : CHART_COLORS.duration,
    fill: true
  }), [trends, darkMode]);

  // Coverage data
  const coverageDataset: TrendDataset = useMemo(() => ({
    label: 'Coverage',
    data: trends.map(t => t.avgCoverage),
    borderColor: darkMode ? '#00bcd4' : CHART_COLORS.coverage,
    fill: true
  }), [trends, darkMode]);

  if (loading) {
    return (
      <div className="metrics-panel">
        <h3 className="metrics-panel-title">Pipeline Trends</h3>
        <div className="metrics-panel-loading">
          Loading trend data...
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="metrics-panel">
        <h3 className="metrics-panel-title">Pipeline Trends</h3>
        <div className="metrics-panel-empty">
          No trend data available for the selected timeframe.
        </div>
      </div>
    );
  }

  return (
    <div className="metrics-panel">
      <h3 className="metrics-panel-title">Pipeline Trends</h3>
      <div className="metrics-panel-grid">
        <TrendChart
          title="Failure Rate"
          labels={labels}
          datasets={[failureRateDataset]}
          height={150}
          compact
          yAxisLabel="%"
          yAxisMax={100}
          thresholdLine={{
            value: METRICS_THRESHOLDS.FAILURE_RATE_WARNING,
            label: `${METRICS_THRESHOLDS.FAILURE_RATE_WARNING}% Warning`,
            color: CHART_COLORS.warning
          }}
          onCanvasReady={onChartCanvasReady ? (c) => onChartCanvasReady('successRate', c) : undefined}
        />
        <TrendChart
          title="Build Duration"
          labels={labels}
          datasets={[durationDataset]}
          height={150}
          compact
          yAxisLabel="seconds"
          onCanvasReady={onChartCanvasReady ? (c) => onChartCanvasReady('duration', c) : undefined}
        />
        <TrendChart
          title="Code Coverage"
          labels={labels}
          datasets={[coverageDataset]}
          height={150}
          compact
          yAxisLabel="%"
          yAxisMax={100}
          thresholdLine={{
            value: METRICS_THRESHOLDS.COVERAGE_TARGET,
            label: `${METRICS_THRESHOLDS.COVERAGE_TARGET}% Target`,
            color: CHART_COLORS.success
          }}
          onCanvasReady={onChartCanvasReady ? (c) => onChartCanvasReady('coverage', c) : undefined}
        />
      </div>
    </div>
  );
};

export default MetricsPanel;

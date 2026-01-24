import { FC, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData
} from 'chart.js';
import '../styles/TrendChart.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface TrendDataset {
  label: string;
  data: (number | null)[];
  borderColor: string;
  backgroundColor?: string;
  fill?: boolean;
  tension?: number;
}

export interface ThresholdLine {
  value: number;
  label: string;
  color: string;
}

interface TrendChartProps {
  title: string;
  labels: string[];
  datasets: TrendDataset[];
  height?: number;
  thresholdLine?: ThresholdLine;
  yAxisLabel?: string;
  yAxisMax?: number;
  showLegend?: boolean;
  compact?: boolean;
}

const TrendChart: FC<TrendChartProps> = ({
  title,
  labels,
  datasets,
  height = 200,
  thresholdLine,
  yAxisLabel,
  yAxisMax,
  showLegend = false,
  compact = false
}) => {
  const chartData: ChartData<'line'> = useMemo(() => {
    const chartDatasets = datasets.map(ds => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.borderColor,
      backgroundColor: ds.backgroundColor || `${ds.borderColor}33`,
      fill: ds.fill ?? true,
      tension: ds.tension ?? 0.3,
      pointRadius: compact ? 2 : 3,
      pointHoverRadius: compact ? 4 : 5,
      borderWidth: compact ? 1.5 : 2
    }));

    // Add threshold line as a dataset if provided
    if (thresholdLine && labels.length > 0) {
      chartDatasets.push({
        label: thresholdLine.label,
        data: Array(labels.length).fill(thresholdLine.value),
        borderColor: thresholdLine.color,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 2,
        // @ts-expect-error borderDash is valid but not in the type
        borderDash: [6, 4]
      });
    }

    return {
      labels,
      datasets: chartDatasets
    };
  }, [labels, datasets, compact, thresholdLine]);

  const options: ChartOptions<'line'> = useMemo(() => {
    const baseOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend || !!thresholdLine,
          position: 'top' as const,
          labels: {
            boxWidth: 12,
            padding: 8,
            font: {
              size: 11
            },
            filter: (legendItem) => {
              // Hide threshold line from legend if not showing legend
              if (!showLegend && legendItem.text === thresholdLine?.label) {
                return false;
              }
              return true;
            }
          }
        },
        title: {
          display: !compact,
          text: title,
          font: {
            size: compact ? 12 : 14,
            weight: 'bold'
          },
          padding: {
            bottom: compact ? 8 : 12
          }
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          filter: (tooltipItem) => {
            // Hide threshold line from tooltip
            if (tooltipItem.dataset.label === thresholdLine?.label) {
              return false;
            }
            return true;
          },
          callbacks: {
            label: (context) => {
              const value = context.parsed.y;
              if (value === null) return `${context.dataset.label}: N/A`;

              // Format based on type
              if (context.dataset.label?.toLowerCase().includes('rate') ||
                  context.dataset.label?.toLowerCase().includes('coverage')) {
                return `${context.dataset.label}: ${value.toFixed(1)}%`;
              } else if (context.dataset.label?.toLowerCase().includes('duration')) {
                return `${context.dataset.label}: ${formatDurationShort(value)}`;
              }
              return `${context.dataset.label}: ${value.toFixed(1)}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false
          },
          ticks: {
            maxRotation: compact ? 0 : 45,
            minRotation: 0,
            maxTicksLimit: compact ? 5 : 10,
            font: {
              size: compact ? 9 : 11
            }
          }
        },
        y: {
          display: true,
          min: 0,
          max: yAxisMax,
          title: {
            display: !compact && !!yAxisLabel,
            text: yAxisLabel || ''
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: {
              size: compact ? 9 : 11
            },
            callback: (value) => {
              if (yAxisLabel?.includes('%')) {
                return `${value}%`;
              }
              return value;
            }
          }
        }
      },
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false
      }
    };

    return baseOptions;
  }, [title, thresholdLine, yAxisLabel, yAxisMax, showLegend, compact]);

  // If no data, show placeholder
  if (labels.length === 0 || datasets.every(ds => ds.data.length === 0)) {
    return (
      <div className={`trend-chart ${compact ? 'compact' : ''}`}>
        {!compact && <h4 className="chart-title">{title}</h4>}
        <div className="no-data-placeholder" style={{ height }}>
          No trend data available
        </div>
      </div>
    );
  }

  return (
    <div className={`trend-chart ${compact ? 'compact' : ''}`}>
      {compact && <h4 className="chart-title">{title}</h4>}
      <div className="chart-wrapper" style={{ height }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

// Helper function to format duration in short form
function formatDurationShort(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export default TrendChart;

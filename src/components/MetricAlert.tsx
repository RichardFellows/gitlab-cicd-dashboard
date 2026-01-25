import { FC } from 'react';
import { METRICS_THRESHOLDS } from '../utils/constants';
import '../styles/MetricAlert.css';

export type AlertType = 'high-failure-rate' | 'low-coverage' | 'duration-spike';

interface MetricAlertProps {
  type: AlertType;
  value: number;
  /** For duration-spike, this is the percentage increase */
  percentageIncrease?: number;
  compact?: boolean;
}

const formatDurationShort = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

const getAlertConfig = (type: AlertType, value: number, percentageIncrease?: number) => {
  switch (type) {
    case 'high-failure-rate':
      if (value >= METRICS_THRESHOLDS.FAILURE_RATE_DANGER) {
        return {
          icon: '!',
          label: 'High Failure Rate',
          tooltip: `Failure rate is ${value.toFixed(1)}% (threshold: ${METRICS_THRESHOLDS.FAILURE_RATE_DANGER}%)`,
          severity: 'danger'
        };
      } else if (value >= METRICS_THRESHOLDS.FAILURE_RATE_WARNING) {
        return {
          icon: '!',
          label: 'Elevated Failure Rate',
          tooltip: `Failure rate is ${value.toFixed(1)}% (warning: ${METRICS_THRESHOLDS.FAILURE_RATE_WARNING}%)`,
          severity: 'warning'
        };
      }
      return null;

    case 'low-coverage':
      if (value < METRICS_THRESHOLDS.COVERAGE_TARGET) {
        return {
          icon: '%',
          label: 'Low Coverage',
          tooltip: `Coverage is ${value.toFixed(1)}% (target: ${METRICS_THRESHOLDS.COVERAGE_TARGET}%)`,
          severity: 'warning'
        };
      }
      return null;

    case 'duration-spike':
      if (percentageIncrease !== undefined && percentageIncrease >= METRICS_THRESHOLDS.DURATION_SPIKE_PERCENT) {
        return {
          icon: '⏱',
          label: 'Duration Spike',
          tooltip: `Build time ${formatDurationShort(value)} is ${percentageIncrease.toFixed(0)}% above baseline (threshold: ${METRICS_THRESHOLDS.DURATION_SPIKE_PERCENT}%)`,
          severity: 'warning'
        };
      }
      return null;

    default:
      return null;
  }
};

const MetricAlert: FC<MetricAlertProps> = ({ type, value, percentageIncrease, compact = false }) => {
  const config = getAlertConfig(type, value, percentageIncrease);

  if (!config) {
    return null;
  }

  return (
    <span
      className={`metric-alert ${config.severity} ${compact ? 'compact' : ''}`}
      title={config.tooltip}
    >
      <span className="alert-icon">{config.icon}</span>
      {!compact && <span className="alert-label">{config.label}</span>}
    </span>
  );
};

export default MetricAlert;

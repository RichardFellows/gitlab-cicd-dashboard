import { FC } from 'react';
import { METRICS_THRESHOLDS } from '../utils/constants';
import '../styles/MetricAlert.css';

export type AlertType = 'high-failure-rate' | 'low-coverage';

interface MetricAlertProps {
  type: AlertType;
  value: number;
  compact?: boolean;
}

const getAlertConfig = (type: AlertType, value: number) => {
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

    default:
      return null;
  }
};

const MetricAlert: FC<MetricAlertProps> = ({ type, value, compact = false }) => {
  const config = getAlertConfig(type, value);

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

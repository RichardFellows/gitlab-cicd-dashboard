import { FC } from 'react';
import { Deployment } from '../types';
import '../styles/EnvironmentMatrix.css';

interface DeploymentCellProps {
  deployment: Deployment | null;
  loading: boolean;
  onClick: () => void;
  isExpanded: boolean;
}

/**
 * Individual cell showing deployment status for one project+environment.
 * Displays version number and status indicator (success/failed).
 */
const DeploymentCell: FC<DeploymentCellProps> = ({
  deployment,
  loading,
  onClick,
  isExpanded
}) => {
  // Loading state
  if (loading) {
    return (
      <td className="deployment-cell deployment-cell--loading" onClick={onClick}>
        <div className="deployment-cell__spinner" aria-label="Loading deployment info">
          <span className="spinner"></span>
        </div>
      </td>
    );
  }

  // Empty state (no deployment for this environment)
  if (!deployment) {
    return (
      <td className="deployment-cell deployment-cell--empty" onClick={onClick}>
        <span className="deployment-cell__placeholder">-</span>
      </td>
    );
  }

  // Determine status class
  const statusClass = getStatusClass(deployment.status);
  const cellClass = `deployment-cell deployment-cell--${statusClass}${isExpanded ? ' deployment-cell--expanded' : ''}`;

  return (
    <td className={cellClass} onClick={onClick} role="button" tabIndex={0}>
      <div className="deployment-cell__content">
        <span className={`deployment-cell__indicator deployment-cell__indicator--${statusClass}`} />
        <span className="deployment-cell__version">
          {deployment.version || '#' + deployment.pipelineIid || '?'}
        </span>
      </div>
    </td>
  );
};

/**
 * Map deployment status to CSS class modifier
 */
function getStatusClass(status: string): string {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'failed';
    case 'running':
      return 'running';
    case 'pending':
      return 'pending';
    case 'canceled':
      return 'canceled';
    default:
      return 'unknown';
  }
}

export default DeploymentCell;

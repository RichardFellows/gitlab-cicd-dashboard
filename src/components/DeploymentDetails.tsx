import { FC } from 'react';
import { Deployment } from '../types';
import { formatDate } from '../utils/formatting';
import '../styles/EnvironmentMatrix.css';

interface DeploymentDetailsProps {
  deployment: Deployment;
  jiraBaseUrl?: string;
  onClose?: () => void;
}

/**
 * Expanded detail panel showing full deployment information.
 * Displays version, timestamp, status, links to GitLab job and JIRA.
 */
const DeploymentDetails: FC<DeploymentDetailsProps> = ({
  deployment,
  jiraBaseUrl,
  onClose
}) => {
  const statusClass = getStatusClass(deployment.status);

  return (
    <div className="deployment-details">
      <div className="deployment-details__header">
        <h4 className="deployment-details__title">
          Deployment to {deployment.environment.toUpperCase()}
        </h4>
        {onClose && (
          <button 
            className="deployment-details__close" 
            onClick={onClose}
            aria-label="Close details"
          >
            ×
          </button>
        )}
      </div>

      <div className="deployment-details__content">
        {/* Version */}
        <div className="deployment-details__row">
          <span className="deployment-details__label">Version:</span>
          <span className="deployment-details__version">
            {deployment.version || `Pipeline #${deployment.pipelineIid}` || 'Unknown'}
          </span>
        </div>

        {/* Status */}
        <div className="deployment-details__row">
          <span className="deployment-details__label">Status:</span>
          <span className={`deployment-details__status deployment-details__status--${statusClass}`}>
            {formatStatus(deployment.status)}
          </span>
        </div>

        {/* Timestamp */}
        <div className="deployment-details__row">
          <span className="deployment-details__label">Deployed:</span>
          <span className="deployment-details__timestamp">
            {formatDate(deployment.timestamp)}
            <span className="deployment-details__timestamp-relative">
              {' '}({getRelativeTime(deployment.timestamp)})
            </span>
          </span>
        </div>

        {/* Branch */}
        {deployment.pipelineRef && (
          <div className="deployment-details__row">
            <span className="deployment-details__label">Branch:</span>
            <span className="deployment-details__branch">
              {deployment.pipelineRef}
            </span>
          </div>
        )}

        {/* JIRA Link */}
        {deployment.jiraKey && (
          <div className="deployment-details__row">
            <span className="deployment-details__label">JIRA:</span>
            {jiraBaseUrl ? (
              <a
                href={`${jiraBaseUrl}/${deployment.jiraKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="deployment-details__link"
              >
                {deployment.jiraKey}
              </a>
            ) : (
              <span className="deployment-details__jira-key">{deployment.jiraKey}</span>
            )}
          </div>
        )}
      </div>

      {/* Links */}
      <div className="deployment-details__links">
        <a
          href={deployment.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="deployment-details__link deployment-details__link--button"
        >
          View Job
        </a>
        {deployment.pipelineUrl && (
          <a
            href={deployment.pipelineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="deployment-details__link deployment-details__link--button"
          >
            View Pipeline
          </a>
        )}
      </div>
    </div>
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

/**
 * Format status for display
 */
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    success: '✓ Success',
    failed: '✗ Failed',
    running: '⟳ Running',
    pending: '○ Pending',
    canceled: '⊘ Canceled'
  };
  return statusMap[status] || status;
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
function getRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  return formatDate(timestamp);
}

export default DeploymentDetails;

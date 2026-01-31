import { FC, useCallback } from 'react';
import { DeploymentHistoryEntry } from '../types';

interface TimelineEntryProps {
  entry: DeploymentHistoryEntry;
  jiraBaseUrl?: string;
  darkMode?: boolean;
  onExpand: () => void;
  isExpanded: boolean;
}

/**
 * A single entry in the deployment timeline.
 * Shows timestamp, status dot, project, version, env badge, branch.
 * Rollback entries get distinct styling.
 */
const TimelineEntry: FC<TimelineEntryProps> = ({
  entry,
  jiraBaseUrl,
  onExpand,
  isExpanded,
}) => {
  const handleClick = useCallback(() => {
    onExpand();
  }, [onExpand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onExpand();
    }
  }, [onExpand]);

  // Format timestamp as HH:mm
  const time = entry.timestamp
    ? new Date(entry.timestamp).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

  // Relative time
  const relativeTime = entry.timestamp
    ? getRelativeTime(new Date(entry.timestamp))
    : '';

  // Status class for the dot
  const statusClass = entry.isRollback
    ? 'rollback'
    : entry.status === 'success'
      ? 'success'
      : entry.status === 'failed'
        ? 'failed'
        : 'other';

  return (
    <div
      className={`timeline-entry ${entry.isRollback ? 'timeline-entry--rollback' : ''} ${isExpanded ? 'timeline-entry--expanded' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
    >
      {/* Left: time and status dot */}
      <div className="timeline-entry__time">
        <span className="timeline-entry__clock">{time}</span>
        <span className={`timeline-entry__dot timeline-entry__dot--${statusClass}`} />
      </div>

      {/* Main content */}
      <div className="timeline-entry__content">
        <div className="timeline-entry__main">
          <span className="timeline-entry__project">{entry.projectName}</span>
          <span className="timeline-entry__version">
            {entry.isRollback && <span className="timeline-entry__rollback-icon">⏪</span>}
            {entry.version || 'Unknown'}
          </span>
          <span className={`timeline-entry__env-badge timeline-entry__env-badge--${entry.environment}`}>
            {entry.environment.toUpperCase()}
          </span>
          {entry.pipelineRef && (
            <span className="timeline-entry__branch">{entry.pipelineRef}</span>
          )}
        </div>

        {/* Rollback annotation */}
        {entry.isRollback && entry.rolledBackFrom && (
          <div className="timeline-entry__rollback-note">
            Rolled back from v{entry.rolledBackFrom}
          </div>
        )}

        {/* Right side: JIRA key + status */}
        <div className="timeline-entry__meta">
          {entry.jiraKey && jiraBaseUrl && (
            <a
              href={`${jiraBaseUrl}/${entry.jiraKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="timeline-entry__jira"
              onClick={(e) => e.stopPropagation()}
            >
              {entry.jiraKey}
            </a>
          )}
          <span className={`timeline-entry__status timeline-entry__status--${statusClass}`}>
            {entry.isRollback ? 'rollback' : entry.status}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="timeline-entry__details">
          <div className="timeline-entry__detail-grid">
            <div className="timeline-entry__detail-row">
              <span className="timeline-entry__detail-label">Version</span>
              <span className="timeline-entry__detail-value">{entry.version || 'Unknown'}</span>
            </div>
            <div className="timeline-entry__detail-row">
              <span className="timeline-entry__detail-label">Status</span>
              <span className={`timeline-entry__detail-value timeline-entry__status--${statusClass}`}>
                {entry.isRollback ? 'Rollback' : entry.status}
              </span>
            </div>
            <div className="timeline-entry__detail-row">
              <span className="timeline-entry__detail-label">Branch</span>
              <span className="timeline-entry__detail-value timeline-entry__detail-mono">
                {entry.pipelineRef || '—'}
              </span>
            </div>
            <div className="timeline-entry__detail-row">
              <span className="timeline-entry__detail-label">Time</span>
              <span className="timeline-entry__detail-value">
                {entry.timestamp
                  ? new Date(entry.timestamp).toLocaleString('en-GB')
                  : '—'}
                {relativeTime && (
                  <span className="timeline-entry__relative-time"> ({relativeTime})</span>
                )}
              </span>
            </div>
            {entry.commitSha && (
              <div className="timeline-entry__detail-row">
                <span className="timeline-entry__detail-label">Commit</span>
                <span className="timeline-entry__detail-value timeline-entry__detail-mono">
                  {entry.commitSha.slice(0, 8)}
                </span>
              </div>
            )}
          </div>
          <div className="timeline-entry__detail-links">
            {entry.pipelineUrl && (
              <a
                href={entry.pipelineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="timeline-entry__detail-link"
                onClick={(e) => e.stopPropagation()}
              >
                Pipeline #{entry.pipelineId}
              </a>
            )}
            {entry.jobUrl && (
              <a
                href={entry.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="timeline-entry__detail-link"
                onClick={(e) => e.stopPropagation()}
              >
                Job #{entry.jobId}
              </a>
            )}
            {entry.jiraKey && jiraBaseUrl && (
              <a
                href={`${jiraBaseUrl}/${entry.jiraKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="timeline-entry__detail-link"
                onClick={(e) => e.stopPropagation()}
              >
                {entry.jiraKey}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Get relative time string (e.g., "2h ago", "3d ago")
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return '';
}

export default TimelineEntry;

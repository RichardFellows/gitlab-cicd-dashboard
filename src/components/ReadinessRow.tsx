import { FC } from 'react';
import { VersionReadiness, ReadinessStatus } from '../types';

interface ReadinessRowProps {
  readiness: VersionReadiness;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Get status badge configuration
 */
const getStatusConfig = (status: ReadinessStatus): { icon: string; label: string; className: string } => {
  switch (status) {
    case 'ready':
      return { icon: '✓', label: 'Ready', className: 'readiness-status--ready' };
    case 'pending-signoff':
      return { icon: '⏳', label: 'Pending Sign-off', className: 'readiness-status--pending' };
    case 'tests-failed':
      return { icon: '✗', label: 'Tests Failed', className: 'readiness-status--failed' };
    case 'not-deployed':
      return { icon: '○', label: 'Not Deployed', className: 'readiness-status--not-deployed' };
  }
};

/**
 * Format relative time from timestamp
 */
const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) {
    return date.toLocaleDateString();
  } else if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes > 0 ? `${diffMinutes}m ago` : 'just now';
  }
};

/**
 * A single row in the readiness table showing version status for an environment.
 */
const ReadinessRow: FC<ReadinessRowProps> = ({
  readiness,
  isExpanded,
  onToggle
}) => {
  const statusConfig = getStatusConfig(readiness.status);

  return (
    <tr 
      className={`readiness-row ${isExpanded ? 'readiness-row--expanded' : ''}`}
      onClick={onToggle}
    >
      <td className="readiness-row__project">
        <span className="readiness-row__project-name">{readiness.projectName}</span>
      </td>

      <td className="readiness-row__version">
        <code>{readiness.version}</code>
      </td>

      <td className="readiness-row__environment">
        <span className={`environment-badge environment-badge--${readiness.environment}`}>
          {readiness.environment.toUpperCase()}
        </span>
      </td>

      <td className="readiness-row__status">
        <span className={`readiness-status ${statusConfig.className}`}>
          <span className="readiness-status__icon">{statusConfig.icon}</span>
          <span className="readiness-status__label">{statusConfig.label}</span>
        </span>
      </td>

      <td className="readiness-row__signoff">
        {readiness.signoff ? (
          <span className="readiness-row__signoff-info">
            <span className="readiness-row__signoff-author">@{readiness.signoff.author}</span>
            <span className="readiness-row__signoff-time">
              {formatRelativeTime(readiness.signoff.timestamp)}
            </span>
          </span>
        ) : (
          <span className="readiness-row__signoff-pending">—</span>
        )}
      </td>

      <td className="readiness-row__tests">
        {readiness.testStatus.exists ? (
          readiness.testStatus.passed ? (
            <span className="test-badge test-badge--passed">✓ Passed</span>
          ) : (
            <span className="test-badge test-badge--failed">✗ Failed</span>
          )
        ) : (
          <span className="test-badge test-badge--none">No tests</span>
        )}
      </td>

      <td className="readiness-row__expand">
        <button 
          className="readiness-row__expand-btn"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </td>
    </tr>
  );
};

export default ReadinessRow;

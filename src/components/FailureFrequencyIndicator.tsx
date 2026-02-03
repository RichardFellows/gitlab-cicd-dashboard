import { FC } from 'react';

interface FailureFrequencyIndicatorProps {
  failedCount: number;
  totalCount: number;
  compact?: boolean;
}

/**
 * Get severity colour based on failure ratio.
 * Green (≤1/10), Yellow (2-4/10), Red (≥5/10)
 */
function getFrequencyColour(failedCount: number, totalCount: number): string {
  if (totalCount === 0) return '#6c757d'; // grey
  const ratio = failedCount / totalCount;
  if (ratio >= 0.5) return '#dc3545';  // red
  if (ratio >= 0.2) return '#ffc107';  // yellow
  return '#28a745';                     // green
}

const FailureFrequencyIndicator: FC<FailureFrequencyIndicatorProps> = ({
  failedCount,
  totalCount,
  compact = false,
}) => {
  if (totalCount === 0) {
    return (
      <span
        className="failure-frequency-indicator"
        title="No history available"
        style={{ color: '#6c757d', fontSize: '11px' }}
      >
        —
      </span>
    );
  }

  const colour = getFrequencyColour(failedCount, totalCount);
  const tooltipText = `This job has failed ${failedCount} of the last ${totalCount} runs`;

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: compact ? '10px' : '11px',
    fontWeight: 500,
    color: colour,
    cursor: 'default',
  };

  return (
    <span
      className="failure-frequency-indicator"
      style={style}
      title={tooltipText}
      data-failed={failedCount}
      data-total={totalCount}
    >
      {compact ? (
        <span>{failedCount}/{totalCount}</span>
      ) : (
        <span>Failed {failedCount} of {totalCount} runs</span>
      )}
    </span>
  );
};

export default FailureFrequencyIndicator;

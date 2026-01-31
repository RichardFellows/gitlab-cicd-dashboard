import { FC } from 'react';
import { HealthBand, HealthSignalResult } from '../utils/healthScore';
import '../styles/HealthBadge.css';

interface HealthBadgeProps {
  score: number;
  band: HealthBand;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
  breakdown?: HealthSignalResult[];
  onClick?: () => void;
}

const HealthBadge: FC<HealthBadgeProps> = ({
  score,
  band,
  size = 'md',
  onClick,
}) => {
  return (
    <button
      className={`health-badge health-badge--${band} health-badge--${size}`}
      onClick={onClick}
      aria-label={`Health score: ${score} (${band})`}
      title={`Health: ${score}/100 (${band})`}
      type="button"
    >
      {score}
    </button>
  );
};

export default HealthBadge;

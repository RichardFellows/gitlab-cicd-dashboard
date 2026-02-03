import { FC } from 'react';
import { HealthSignalResult, getHealthBand } from '../utils/healthScore';
import '../styles/HealthBreakdown.css';

interface HealthBreakdownProps {
  signals: HealthSignalResult[];
  darkMode?: boolean;
}

const HealthBreakdown: FC<HealthBreakdownProps> = ({ signals }) => {
  return (
    <div className="health-breakdown">
      <div className="health-breakdown__header">
        <span className="health-breakdown__col-name">Signal</span>
        <span className="health-breakdown__col-weight">Weight</span>
        <span className="health-breakdown__col-value">Value</span>
        <span className="health-breakdown__col-score">Score</span>
      </div>
      {signals.map((signal) => {
        const band = getHealthBand(signal.score);
        return (
          <div
            key={signal.name}
            className={`health-breakdown__row ${signal.score < 50 ? 'health-breakdown__row--low' : ''}`}
          >
            <span className="health-breakdown__name">{signal.name}</span>
            <span className="health-breakdown__weight">
              {Math.round(signal.weight * 100)}%
            </span>
            <span className="health-breakdown__value">
              {signal.rawValue !== null
                ? `${typeof signal.rawValue === 'number' && signal.unit === '%' ? signal.rawValue.toFixed(1) : signal.rawValue} ${signal.unit}`
                : 'N/A'}
            </span>
            <div className="health-breakdown__score-cell">
              <div className="health-breakdown__bar-bg">
                <div
                  className={`health-breakdown__bar health-breakdown__bar--${band}`}
                  style={{ width: `${signal.score}%` }}
                />
              </div>
              <span className="health-breakdown__score-value">{signal.score}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HealthBreakdown;

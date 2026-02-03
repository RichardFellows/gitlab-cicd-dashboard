import { useState, useEffect } from 'react';
import { AUTO_REFRESH_OPTIONS } from '../utils/constants';
import { getDataAge, formatRelativeTime, formatAbsoluteTime } from '../utils/dataAge';
import '../styles/RefreshStatusBar.css';

export interface RefreshStatusBarProps {
  lastUpdated: Date | null;
  loading: boolean;
  autoRefreshInterval: number;
  nextRefreshIn: number | null;
  onIntervalChange: (interval: number) => void;
  onManualRefresh: () => void;
  isOffline?: boolean;
  isRateLimited?: boolean;
  darkMode?: boolean;
}

const RefreshStatusBar: React.FC<RefreshStatusBarProps> = ({
  lastUpdated,
  loading,
  autoRefreshInterval,
  nextRefreshIn,
  onIntervalChange,
  onManualRefresh,
  isOffline = false,
  isRateLimited = false,
}) => {
  // Re-render every 60s to update relative time display
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Compute data age info
  const dataAge = lastUpdated ? getDataAge(lastUpdated) : null;
  const relativeTime = lastUpdated ? formatRelativeTime(lastUpdated) : null;
  const absoluteTime = lastUpdated ? formatAbsoluteTime(lastUpdated) : null;

  const statusClass = dataAge ? `data-age-${dataAge.status}` : '';

  return (
    <div className="refresh-status-bar">
      {/* Left: data age */}
      <div className="refresh-status-left">
        {lastUpdated ? (
          <>
            <button
              className="icon-btn refresh-btn manual-refresh-btn"
              onClick={onManualRefresh}
              disabled={loading}
              title="Refresh now"
              aria-label="Refresh now"
            >
              &#8635;
            </button>
            <span
              className={`data-age-text ${statusClass}`}
              title={`Last updated at ${absoluteTime}`}
            >
              {relativeTime}
            </span>
          </>
        ) : (
          <span className="data-age-text data-age-none">No data loaded</span>
        )}
      </div>

      {/* Centre: loading / status indicator */}
      <div className="refresh-status-center">
        {loading && (
          <span className="refresh-loading-indicator">
            <span className="refresh-pulse-dot" />
            Refreshing…
          </span>
        )}
        {!loading && isOffline && (
          <span className="refresh-offline-indicator">⚡ Offline</span>
        )}
        {!loading && !isOffline && isRateLimited && (
          <span className="refresh-rate-limited-indicator">⏳ Rate limited</span>
        )}
      </div>

      {/* Right: interval selector + countdown */}
      <div className="refresh-status-right">
        {autoRefreshInterval > 0 && nextRefreshIn !== null && !loading && (
          <span className="refresh-countdown">
            Next: {nextRefreshIn}s
          </span>
        )}
        <select
          className="refresh-interval-select"
          value={autoRefreshInterval}
          onChange={(e) => onIntervalChange(Number(e.target.value))}
          aria-label="Auto-refresh interval"
        >
          {AUTO_REFRESH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default RefreshStatusBar;

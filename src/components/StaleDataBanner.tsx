import { getDataAge, formatRelativeTime } from '../utils/dataAge';
import '../styles/StaleDataBanner.css';

export interface StaleDataBannerProps {
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  onRefreshNow: () => void;
  onEnableAutoRefresh: () => void;
  onDismiss: () => void;
}

const StaleDataBanner: React.FC<StaleDataBannerProps> = ({
  lastUpdated,
  autoRefreshEnabled,
  onRefreshNow,
  onEnableAutoRefresh,
  onDismiss,
}) => {
  // Only show when data is stale AND auto-refresh is off
  if (!lastUpdated) return null;
  if (autoRefreshEnabled) return null;

  const age = getDataAge(lastUpdated);
  if (age.status !== 'stale') return null;

  const relativeTime = formatRelativeTime(lastUpdated);

  return (
    <div className="stale-data-banner" role="alert">
      <span className="stale-data-message">
        ⚠️ Data is {relativeTime} old. Refresh now or enable auto-refresh.
      </span>
      <div className="stale-data-actions">
        <button
          className="stale-data-btn stale-data-refresh-btn"
          onClick={onRefreshNow}
        >
          Refresh Now
        </button>
        <button
          className="stale-data-btn stale-data-auto-btn"
          onClick={onEnableAutoRefresh}
        >
          Enable Auto-Refresh
        </button>
        <button
          className="stale-data-dismiss-btn"
          onClick={onDismiss}
          aria-label="Dismiss stale data warning"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default StaleDataBanner;

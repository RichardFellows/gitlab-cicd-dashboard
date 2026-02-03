import { FC, useState, useEffect, useRef, useCallback } from 'react';
import { NotificationEntry, NotificationRuleType } from '../types';
import '../styles/NotificationBell.css';

interface NotificationBellProps {
  history: NotificationEntry[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onClickEntry: (entry: NotificationEntry) => void;
  darkMode?: boolean;
}

/** Icon for each rule type */
function ruleTypeIcon(type: NotificationRuleType): string {
  switch (type) {
    case 'pipeline-failure':  return '🔴';
    case 'coverage-drop':     return '📉';
    case 'duration-spike':    return '⏱️';
    case 'deployment-failure': return '🚀';
    default:                  return '🔔';
  }
}

/** Format a timestamp as relative time (e.g., "2m ago", "1h ago") */
function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

const NotificationBell: FC<NotificationBellProps> = ({
  history,
  unreadCount,
  onMarkAllRead,
  onClickEntry,
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, handleClickOutside]);

  const handleBellClick = () => {
    setOpen(prev => !prev);
  };

  const handleEntryClick = (entry: NotificationEntry) => {
    onClickEntry(entry);
    setOpen(false);
  };

  const handleMarkAllRead = () => {
    onMarkAllRead();
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={handleBellClick}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge" data-testid="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown" role="menu">
          <div className="notification-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button
                className="notification-mark-all-btn"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {history.length === 0 ? (
              <div className="notification-empty">
                <span className="notification-empty-icon">🔔</span>
                <span>No notifications</span>
              </div>
            ) : (
              history.map(entry => (
                <div
                  key={entry.id}
                  className={`notification-item ${!entry.read ? 'unread' : ''}`}
                  onClick={() => handleEntryClick(entry)}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEntryClick(entry); }}
                >
                  <span className="notification-icon">
                    {ruleTypeIcon(entry.ruleType)}
                  </span>
                  <div className="notification-content">
                    <p className="notification-content-message">
                      <span className="notification-content-project">{entry.projectName}</span>
                      {' — '}
                      {entry.message}
                    </p>
                    <div className="notification-content-time">
                      {formatTimeAgo(entry.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

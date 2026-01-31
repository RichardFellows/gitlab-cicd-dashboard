import { FC, useState, useCallback, useEffect } from 'react';
import { NotificationRule, Project } from '../types';
import NotificationRuleForm from './NotificationRuleForm';
import '../styles/NotificationSettings.css';

interface NotificationSettingsProps {
  enabled: boolean;
  muted: boolean;
  rules: NotificationRule[];
  projects: Project[];
  onToggleEnabled: () => void;
  onToggleMuted: () => void;
  onAddRule: (rule: Omit<NotificationRule, 'id'>) => void;
  onUpdateRule: (id: string, updates: Partial<NotificationRule>) => void;
  onDeleteRule: (id: string) => void;
}

const MAX_RULES = 20;

const NotificationSettings: FC<NotificationSettingsProps> = ({
  enabled,
  muted,
  rules,
  projects,
  onToggleEnabled,
  onToggleMuted,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Feature detection
  const notificationsSupported = typeof Notification !== 'undefined';

  // Sync permission state
  useEffect(() => {
    if (notificationsSupported) {
      setPermissionState(Notification.permission);
    }
  }, [notificationsSupported, enabled]);

  const handleToggleEnabled = useCallback(async () => {
    if (!enabled && permissionState === 'default') {
      // Request permission first
      try {
        const result = await Notification.requestPermission();
        setPermissionState(result);
        if (result === 'granted') {
          onToggleEnabled();
        }
        // If denied, don't enable
      } catch {
        // Safari fallback (callback-based)
        Notification.requestPermission((result) => {
          setPermissionState(result);
          if (result === 'granted') {
            onToggleEnabled();
          }
        });
      }
    } else if (!enabled && permissionState === 'denied') {
      // Can't enable when denied — just show message
      return;
    } else {
      onToggleEnabled();
    }
  }, [enabled, permissionState, onToggleEnabled]);

  const handleSaveRule = useCallback((rule: Omit<NotificationRule, 'id'>) => {
    if (editingRule) {
      onUpdateRule(editingRule.id, rule);
      setEditingRule(null);
    } else {
      onAddRule(rule);
    }
    setShowForm(false);
  }, [editingRule, onAddRule, onUpdateRule]);

  const handleEditRule = useCallback((rule: NotificationRule) => {
    setEditingRule(rule);
    setShowForm(true);
  }, []);

  const handleDeleteRule = useCallback((id: string) => {
    if (window.confirm('Delete this notification rule?')) {
      onDeleteRule(id);
    }
  }, [onDeleteRule]);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingRule(null);
  }, []);

  if (!notificationsSupported) {
    return (
      <div className="notification-settings">
        <div className="notification-settings-title">🔔 Notifications</div>
        <p className="notification-not-supported">
          Browser notifications are not supported in this environment.
        </p>
      </div>
    );
  }

  const permissionLabel =
    permissionState === 'granted' ? '✅ Permission granted'
    : permissionState === 'denied' ? '❌ Permission denied'
    : '⚠️ Permission not requested';

  const permissionClass =
    permissionState === 'granted' ? 'notification-permission-granted'
    : permissionState === 'denied' ? 'notification-permission-denied'
    : 'notification-permission-default';

  return (
    <div className="notification-settings">
      <div className="notification-settings-title">🔔 Notifications</div>

      <div className="notification-toggle-row">
        <span className="notification-toggle-label">Enable notifications</span>
        <button
          type="button"
          className={`notification-toggle-switch ${enabled ? 'active' : ''}`}
          onClick={handleToggleEnabled}
          aria-label="Toggle notifications"
          title={permissionState === 'denied' ? 'Permission denied — enable in browser settings' : undefined}
        />
      </div>

      <div className={`notification-permission-status ${permissionClass}`}>
        {permissionLabel}
        {permissionState === 'denied' && (
          <span> — Enable notifications in your browser settings to use this feature.</span>
        )}
      </div>

      {enabled && (
        <>
          <div className="notification-toggle-row">
            <span className="notification-toggle-label">Mute sounds</span>
            <button
              type="button"
              className={`notification-toggle-switch ${muted ? 'active' : ''}`}
              onClick={onToggleMuted}
              aria-label="Toggle notification sound"
            />
          </div>

          <div className="notification-rule-list">
            <div className="notification-rule-count">
              {rules.length} / {MAX_RULES} rules
            </div>

            {rules.map(rule => (
              <div key={rule.id} className="notification-rule-item">
                <button
                  type="button"
                  className={`notification-toggle-switch ${rule.enabled ? 'active' : ''}`}
                  onClick={() => onUpdateRule(rule.id, { enabled: !rule.enabled })}
                  aria-label={`Toggle rule: ${rule.name}`}
                  style={{ width: 32, height: 18, minWidth: 32 }}
                />
                <div className="notification-rule-item-info">
                  <div className="notification-rule-item-name" title={rule.name}>{rule.name}</div>
                  <div className="notification-rule-item-type">
                    {rule.type}
                    {rule.threshold ? ` · ${rule.threshold}%` : ''}
                    {rule.environment ? ` · ${rule.environment.toUpperCase()}` : ''}
                  </div>
                </div>
                <div className="notification-rule-item-actions">
                  <button type="button" onClick={() => handleEditRule(rule)} title="Edit rule">Edit</button>
                  <button type="button" className="danger" onClick={() => handleDeleteRule(rule.id)} title="Delete rule">Delete</button>
                </div>
              </div>
            ))}

            {showForm ? (
              <NotificationRuleForm
                rule={editingRule ?? undefined}
                projects={projects}
                onSave={handleSaveRule}
                onCancel={handleCancelForm}
              />
            ) : (
              <button
                type="button"
                className="notification-add-btn"
                onClick={() => { setEditingRule(null); setShowForm(true); }}
                disabled={rules.length >= MAX_RULES}
              >
                + Add Rule
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationSettings;

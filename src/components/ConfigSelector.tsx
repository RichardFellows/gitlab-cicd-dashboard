import { FC } from 'react';
import { SavedConfigEntry, DashboardConfig } from '../types';
import '../styles/ConfigSelector.css';

interface ConfigSelectorProps {
  savedConfigs: SavedConfigEntry[];
  activeConfigId: string | null;
  currentConfig: DashboardConfig;
  hasUnsavedChanges: boolean;
  onSelectConfig: (id: string) => void;
  onSaveConfig: () => void;
  onUpdateConfig: () => void;
  onManageConfigs: () => void;
  disabled?: boolean;
}

const ConfigSelector: FC<ConfigSelectorProps> = ({
  savedConfigs,
  activeConfigId,
  hasUnsavedChanges,
  onSelectConfig,
  onSaveConfig,
  onUpdateConfig,
  onManageConfigs,
  disabled,
}) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      onSelectConfig(value);
    }
  };

  return (
    <div className="config-selector">
      <div className="config-selector-row">
        <label className="config-selector-label">Configuration</label>
        <div className="config-selector-controls">
          <div className="config-selector-dropdown-wrapper">
            <select
              className="config-selector-dropdown"
              value={activeConfigId || ''}
              onChange={handleSelectChange}
              disabled={disabled}
            >
              <option value="">
                {savedConfigs.length === 0
                  ? 'No saved configurations'
                  : '— Select configuration —'}
              </option>
              {savedConfigs.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            {hasUnsavedChanges && activeConfigId && (
              <span className="config-unsaved-indicator" title="Unsaved changes">●</span>
            )}
          </div>
          {activeConfigId ? (
            <button
              type="button"
              className="config-action-btn config-save-btn"
              onClick={onUpdateConfig}
              disabled={disabled}
              title="Update current configuration"
            >
              💾 Save
            </button>
          ) : (
            <button
              type="button"
              className="config-action-btn config-save-btn"
              onClick={onSaveConfig}
              disabled={disabled}
              title="Save as new configuration"
            >
              💾 Save As
            </button>
          )}
          <button
            type="button"
            className="config-action-btn config-manage-btn"
            onClick={onManageConfigs}
            disabled={disabled}
            title="Manage configurations"
          >
            ⚙️ Manage
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigSelector;

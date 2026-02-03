import { FC } from 'react';
import SourceManager from './SourceManager';
import ConfigSelector from './ConfigSelector';
import { GroupSource, ProjectSource, SavedConfigEntry, DashboardConfig } from '../types';

interface ControlPanelProps {
  gitlabUrl: string;
  token: string;
  groups: GroupSource[];
  projects: ProjectSource[];
  timeframe: number;
  onGitlabUrlChange: (url: string) => void;
  onTokenChange: (token: string) => void;
  onAddGroup: (id: string) => void;
  onRemoveGroup: (id: string) => void;
  onAddProject: (id: string) => void;
  onRemoveProject: (id: string) => void;
  onTimeframeChange: (timeframe: number) => void;
  onLoad: () => void;
  loading: boolean;
  loadingGroups: Set<string>;
  loadingProjects: Set<string>;
  canLoad: boolean;
  // Saved config props
  savedConfigs: SavedConfigEntry[];
  activeConfigId: string | null;
  currentConfig: DashboardConfig;
  hasUnsavedChanges: boolean;
  onSelectConfig: (id: string) => void;
  onSaveConfig: () => void;
  onUpdateConfig: () => void;
  onManageConfigs: () => void;
}

const ControlPanel: FC<ControlPanelProps> = ({
  gitlabUrl,
  token,
  groups,
  projects,
  timeframe,
  onGitlabUrlChange,
  onTokenChange,
  onAddGroup,
  onRemoveGroup,
  onAddProject,
  onRemoveProject,
  onTimeframeChange,
  onLoad,
  loading,
  loadingGroups,
  loadingProjects,
  canLoad,
  savedConfigs,
  activeConfigId,
  currentConfig,
  hasUnsavedChanges,
  onSelectConfig,
  onSaveConfig,
  onUpdateConfig,
  onManageConfigs,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canLoad) {
      return;
    }

    onLoad();
  };

  return (
    <form className="controls control-panel-multi" onSubmit={handleSubmit}>
      <ConfigSelector
        savedConfigs={savedConfigs}
        activeConfigId={activeConfigId}
        currentConfig={currentConfig}
        hasUnsavedChanges={hasUnsavedChanges}
        onSelectConfig={onSelectConfig}
        onSaveConfig={onSaveConfig}
        onUpdateConfig={onUpdateConfig}
        onManageConfigs={onManageConfigs}
        disabled={loading}
      />
      <div className="control-row">
        <div className="control-group">
          <label htmlFor="gitlab-url">GitLab Instance URL</label>
          <input
            type="text"
            id="gitlab-url"
            placeholder="https://gitlab.com"
            value={gitlabUrl}
            onChange={(e) => onGitlabUrlChange(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="control-group">
          <label htmlFor="gitlab-token">GitLab Private Token</label>
          <input
            type="password"
            id="gitlab-token"
            placeholder="Enter your GitLab token"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="control-group">
          <label htmlFor="timeframe">Timeframe</label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={(e) => onTimeframeChange(parseInt(e.target.value, 10))}
            disabled={loading}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 180 days</option>
          </select>
        </div>
      </div>

      <div className="control-sources">
        <SourceManager
          groups={groups}
          projects={projects}
          onAddGroup={onAddGroup}
          onRemoveGroup={onRemoveGroup}
          onAddProject={onAddProject}
          onRemoveProject={onRemoveProject}
          loadingGroups={loadingGroups}
          loadingProjects={loadingProjects}
          disabled={loading}
        />
      </div>

      <div className="control-actions">
        <button type="submit" disabled={loading || !canLoad}>
          {loading ? 'Loading...' : 'Load Dashboard'}
        </button>
        {!canLoad && !loading && (
          <span className="control-hint">
            Add at least one group or project and provide a token
          </span>
        )}
      </div>
    </form>
  );
};

export default ControlPanel;

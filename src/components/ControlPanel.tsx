import { FC } from 'react';

interface ControlPanelProps {
  gitlabUrl: string;
  token: string;
  groupId: string;
  timeframe: number;
  onGitlabUrlChange: (url: string) => void;
  onTokenChange: (token: string) => void;
  onGroupIdChange: (groupId: string) => void;
  onTimeframeChange: (timeframe: number) => void;
  onLoad: (gitlabUrl: string, token: string, groupId: string, timeframe: number) => void;
  loading: boolean;
}

const ControlPanel: FC<ControlPanelProps> = ({
  gitlabUrl,
  token,
  groupId,
  timeframe,
  onGitlabUrlChange,
  onTokenChange,
  onGroupIdChange,
  onTimeframeChange,
  onLoad,
  loading
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoad(gitlabUrl, token, groupId, timeframe);
  };

  return (
    <form className="controls" onSubmit={handleSubmit}>
      <div className="control-group">
        <label htmlFor="gitlab-url">GitLab Instance URL</label>
        <input
          type="text"
          id="gitlab-url"
          placeholder="https://gitlab.com/api/v4"
          value={gitlabUrl}
          onChange={(e) => onGitlabUrlChange(e.target.value)}
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
        />
      </div>
      <div className="control-group">
        <label htmlFor="group-id">GitLab Group ID</label>
        <input 
          type="text" 
          id="group-id" 
          placeholder="Enter group ID" 
          value={groupId}
          onChange={(e) => onGroupIdChange(e.target.value)}
        />
      </div>
      <div className="control-group">
        <label htmlFor="timeframe">Timeframe</label>
        <select 
          id="timeframe" 
          value={timeframe}
          onChange={(e) => onTimeframeChange(parseInt(e.target.value, 10))}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 180 days</option>
        </select>
      </div>
      <div className="control-group">
        <label>&nbsp;</label>
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Load Dashboard'}
        </button>
      </div>
    </form>
  );
};

export default ControlPanel;
import { MRWithProject } from '../types';
import { getRelativeTime } from '../utils/mrBoardUtils';
import '../styles/MRBoard.css';

interface MRCardDetailsProps {
  mr: MRWithProject;
  onClose: () => void;
  darkMode?: boolean;
}

const MRCardDetails = ({ mr, onClose }: MRCardDetailsProps) => {
  const pipelineJobs = mr.head_pipeline?.jobs || [];
  const failedJobs = mr.head_pipeline?.failedJobs || [];

  return (
    <div className="mr-card-details">
      <div className="mr-card-details__header">
        <h3 className="mr-card-details__title">
          <a href={mr.web_url} target="_blank" rel="noopener noreferrer">
            !{mr.iid} {mr.title}
          </a>
        </h3>
        <button
          className="mr-card-details__close"
          onClick={onClose}
          title="Close details"
        >
          ✕
        </button>
      </div>

      <div className="mr-card-details__info">
        <span>📦 {mr.projectName}</span>
        <span>👤 {mr.author?.name || 'Unknown'} (@{mr.author?.username || 'unknown'})</span>
        <span>🕐 Opened {getRelativeTime(mr.created_at)}</span>
        <span>🔄 Updated {getRelativeTime(mr.updated_at)}</span>
        <span>🌿 <code>{mr.source_branch}</code> → <code>{mr.target_branch}</code></span>
        {mr.draft && <span>📝 Draft</span>}
      </div>

      {mr.description && (
        <div className="mr-card-details__description">
          {mr.description.substring(0, 300)}
          {mr.description.length > 300 ? '...' : ''}
        </div>
      )}

      {/* Recent Commits */}
      {mr.recent_commits && mr.recent_commits.length > 0 && (
        <div className="mr-card-details__section">
          <h4>Recent Commits ({mr.recent_commits.length})</h4>
          <ul className="mr-card-details__commits">
            {mr.recent_commits.map(commit => (
              <li key={commit.id}>
                <span className="mr-card-details__commit-sha">
                  {commit.short_id}
                </span>
                <span className="mr-card-details__commit-msg">
                  {commit.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pipeline Details */}
      {mr.head_pipeline && (
        <div className="mr-card-details__section">
          <h4>Pipeline #{mr.head_pipeline.id} — {mr.head_pipeline.status}</h4>
          {pipelineJobs.length > 0 && (
            <ul className="mr-card-details__pipeline-jobs">
              {pipelineJobs.map(job => (
                <li key={job.id}>
                  <span className={`mr-card-details__job-status mr-card-details__job-status--${job.status}`} />
                  <a href={job.web_url} target="_blank" rel="noopener noreferrer">
                    {job.stage}: {job.name}
                  </a>
                  {job.status === 'failed' && job.failure_reason && (
                    <span className="mr-card-details__job-failure">
                      — {job.failure_reason}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {pipelineJobs.length === 0 && failedJobs.length > 0 && (
            <ul className="mr-card-details__pipeline-jobs">
              {failedJobs.map(job => (
                <li key={job.id}>
                  <span className="mr-card-details__job-status mr-card-details__job-status--failed" />
                  <a href={job.web_url} target="_blank" rel="noopener noreferrer">
                    {job.stage}: {job.name}
                  </a>
                  {job.failure_reason && (
                    <span className="mr-card-details__job-failure">
                      — {job.failure_reason}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Links */}
      <div className="mr-card-details__section">
        <h4>Links</h4>
        <div className="mr-card-details__links">
          <a href={mr.web_url} target="_blank" rel="noopener noreferrer">
            🔗 View MR in GitLab
          </a>
          {mr.head_pipeline?.web_url && (
            <a href={mr.head_pipeline.web_url} target="_blank" rel="noopener noreferrer">
              🔗 View Pipeline
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default MRCardDetails;

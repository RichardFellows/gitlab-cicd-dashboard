import { MRWithProject, MRPipelineGroup } from '../types';
import { getRelativeTime } from '../utils/mrBoardUtils';
import '../styles/MRBoard.css';

interface MRCardProps {
  mr: MRWithProject;
  onSelect: () => void;
  darkMode?: boolean;
}

/**
 * Get the pipeline group for a card's left border color
 */
function getMRStatusClass(mr: MRWithProject): MRPipelineGroup {
  if (mr.draft || mr.title.toLowerCase().startsWith('draft:')) {
    return 'draft';
  }
  if (!mr.head_pipeline) {
    return 'no-pipeline';
  }
  switch (mr.head_pipeline.status) {
    case 'success': return 'passing';
    case 'failed': return 'failing';
    case 'running':
    case 'pending':
    case 'created': return 'running';
    default: return 'no-pipeline';
  }
}

const MRCard = ({ mr, onSelect }: MRCardProps) => {
  const statusClass = getMRStatusClass(mr);
  const authorInitial = mr.author?.name?.charAt(0)?.toUpperCase() || '?';
  const failedJobs = mr.head_pipeline?.failedJobs || [];
  const lastCommit = mr.recent_commits?.[0];

  return (
    <div
      className={`mr-card mr-card--${statusClass}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
    >
      <div className="mr-card__project">{mr.projectName}</div>
      <div className="mr-card__title">
        <a
          href={mr.web_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={mr.title}
        >
          !{mr.iid} {mr.title}
        </a>
      </div>
      <div className="mr-card__meta">
        <span className="mr-card__author">
          <span className="mr-card__avatar">{authorInitial}</span>
          {mr.author?.username || 'Unknown'}
        </span>
        <span className="mr-card__age">{getRelativeTime(mr.created_at)}</span>
      </div>
      <div className="mr-card__branches">
        <code>{mr.source_branch}</code> → <code>{mr.target_branch}</code>
      </div>
      {failedJobs.length > 0 && (
        <div className="mr-card__failed-jobs">
          ❌ {failedJobs.map(j => j.name).join(', ')}
        </div>
      )}
      {lastCommit && (
        <div className="mr-card__commit" title={lastCommit.title}>
          💬 {lastCommit.title}
        </div>
      )}
    </div>
  );
};

export default MRCard;

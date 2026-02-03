import { FC } from 'react';
import { Project } from '../types';
import '../styles/FailureSummaryPanel.css';

interface FailureSummaryPanelProps {
  projects: Project[];
  onProjectSelect: (projectId: number) => void;
  darkMode?: boolean;
}

const FailureSummaryPanel: FC<FailureSummaryPanelProps> = ({
  projects,
  onProjectSelect,
  darkMode = false,
}) => {
  // Filter to projects with failed main branch pipeline
  const failedProjects = projects
    .filter(p =>
      p.metrics.mainBranchPipeline.available &&
      p.metrics.mainBranchPipeline.status === 'failed'
    )
    .sort((a, b) => {
      // Sort by number of failed jobs descending
      const aFailed = a.metrics.mainBranchPipeline.failedJobs?.length ?? 0;
      const bFailed = b.metrics.mainBranchPipeline.failedJobs?.length ?? 0;
      return bFailed - aFailed;
    });

  if (failedProjects.length === 0) {
    return (
      <div className={`failure-summary-panel ${darkMode ? 'dark' : ''}`}>
        <div className="failure-summary-empty">
          No failures 🎉
        </div>
      </div>
    );
  }

  return (
    <div className={`failure-summary-panel ${darkMode ? 'dark' : ''}`}>
      <div className="failure-summary-list">
        {failedProjects.map(project => {
          const failedJobs = project.metrics.mainBranchPipeline.failedJobs ?? [];

          return (
            <button
              key={project.id}
              className="failure-summary-item"
              onClick={() => onProjectSelect(project.id)}
              type="button"
            >
              <div className="failure-summary-project-name">
                {project.name}
              </div>
              <div className="failure-summary-jobs">
                <span className="failure-count">{failedJobs.length} failed job{failedJobs.length !== 1 ? 's' : ''}</span>
                <span className="failure-job-names">
                  {failedJobs.map(j => j.name).join(', ')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FailureSummaryPanel;

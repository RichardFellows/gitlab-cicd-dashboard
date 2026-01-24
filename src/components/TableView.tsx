import { FC, useState } from 'react';
import { Project, MergeRequest } from '../types';
import {
  categorizeProject,
  formatPipelineStatus,
  getSuccessRateClass,
  formatDuration,
  formatDate,
  escapeHtml,
  getPipelineStatusClass
} from '../utils/formatting';
import MetricAlert from './MetricAlert';
import { shouldShowFailureRateAlert, shouldShowCoverageAlert } from '../utils/constants';
import '../styles/TableView.css';

interface TableViewProps {
  projects: Project[];
  onProjectSelect: (projectId: number) => void;
}

const TableView: FC<TableViewProps> = ({ projects, onProjectSelect }) => {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [mergeRequestsData] = useState<Record<number, MergeRequest[]>>({});
  const [loadingMRs] = useState<Record<number, boolean>>({});

  // Toggle row expansion
  const toggleRow = (projectId: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Handle click on project name
  const handleProjectClick = (projectId: number) => {
    onProjectSelect(projectId);
  };

  return (
    <div className="table-view-container">
      <table className="projects-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Pipeline Status</th>
            <th>Success Rate</th>
            <th>Avg Duration</th>
            <th>Open MRs</th>
            <th>Coverage</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => {
            const category = categorizeProject(project);
            const isExpanded = expandedRows[project.id] || false;

            // Calculate failure rate for alerts
            const failureRate = project.metrics.totalPipelines > 0
              ? (project.metrics.failedPipelines / project.metrics.totalPipelines) * 100
              : 0;

            const showFailureAlert = shouldShowFailureRateAlert(failureRate);
            const showCoverageAlert = shouldShowCoverageAlert(
              project.metrics.codeCoverage.coverage,
              project.metrics.codeCoverage.available
            );

            return (
              <>
                <tr 
                  key={`row-${project.id}`}
                  className={`project-row ${category} ${isExpanded ? 'expanded' : ''}`}
                  data-project-id={project.id}
                >
                  <td>
                    <span className={`status-indicator ${category}`}></span>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleProjectClick(project.id);
                      }}
                      className="project-name-link"
                    >
                      {project.name}
                    </a>
                    {(showFailureAlert || showCoverageAlert) && (
                      <span className="metric-alerts table-alerts">
                        {showFailureAlert && (
                          <MetricAlert type="high-failure-rate" value={failureRate} compact />
                        )}
                        {showCoverageAlert && project.metrics.codeCoverage.coverage !== null && (
                          <MetricAlert type="low-coverage" value={project.metrics.codeCoverage.coverage} compact />
                        )}
                      </span>
                    )}
                  </td>
                  <td>
                    {formatPipelineStatus(
                      project.metrics.mainBranchPipeline.status,
                      project.metrics.mainBranchPipeline.available
                    )}
                  </td>
                  <td className={getSuccessRateClass(project.metrics.successRate)}>
                    {project.metrics.successRate.toFixed(2)}%
                  </td>
                  <td>{formatDuration(project.metrics.avgDuration)}</td>
                  <td>
                    {project.metrics.mergeRequestCounts.totalOpen > 0
                      ? `${project.metrics.mergeRequestCounts.totalOpen} ${
                          project.metrics.mergeRequestCounts.drafts > 0
                            ? `(${project.metrics.mergeRequestCounts.drafts} draft${
                                project.metrics.mergeRequestCounts.drafts !== 1 ? 's' : ''
                              })`
                            : ''
                        }`
                      : '0'}
                  </td>
                  <td>
                    {project.metrics.codeCoverage.available
                      ? `${project.metrics.codeCoverage.coverage?.toFixed(2)}%`
                      : 'N/A'}
                  </td>
                  <td>
                    <button 
                      className="expand-btn" 
                      aria-label="Toggle details"
                      aria-expanded={isExpanded}
                      title={isExpanded ? "Hide details" : "Show details"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRow(project.id);
                      }}
                    >
                      {isExpanded ? '↑' : '↓'}
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr 
                    key={`details-${project.id}`}
                    className="project-details"
                  >
                    <td colSpan={7}>
                      <div className="details-content">
                        <div className="metrics-bar">
                          <div className="metric">
                            <div className="metric-label">Total Pipelines</div>
                            <div className="metric-value">{project.metrics.totalPipelines || 0}</div>
                          </div>
                        </div>
                        
                        {project.metrics.mergeRequestCounts.totalOpen > 0 && (
                          <div className="mr-section">
                            <h3>Open Merge Requests</h3>
                            <div className="mr-table-container">
                              {loadingMRs[project.id] ? (
                                <div className="loading-indicator">Loading merge requests...</div>
                              ) : (
                                mergeRequestsData[project.id] ? (
                                  <MergeRequestsTable mergeRequests={mergeRequestsData[project.id]} />
                                ) : (
                                  <div className="no-data">No open merge requests</div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        
                        {project.metrics.mainBranchPipeline.available &&
                         (project.metrics.mainBranchPipeline.status === 'failed' ||
                          project.metrics.mainBranchPipeline.status === 'canceled') &&
                         project.metrics.mainBranchPipeline.failedJobs &&
                         project.metrics.mainBranchPipeline.failedJobs.length > 0 && (
                          <div className="failed-jobs-section">
                            <h3>Failed Jobs ({project.metrics.mainBranchPipeline.failedJobs.length})</h3>
                            <div className="failed-jobs-list">
                              {project.metrics.mainBranchPipeline.failedJobs.map(job => (
                                <div key={job.id} className="job-item failed">
                                  <div className="job-header">
                                    <span className="job-name">{job.name}</span>
                                    <span className="job-stage">{job.stage}</span>
                                  </div>
                                  <div className="job-details">
                                    <div className="job-reason">{job.failure_reason || 'Unknown failure'}</div>
                                    <div className="job-actions">
                                      <a href={job.web_url} target="_blank" className="job-link" rel="noreferrer">View Job</a>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {project.metrics.recentCommits && project.metrics.recentCommits.length > 0 && (
                          <div className="commits-section">
                            <h3>Recent Commits</h3>
                            <div className="commits-list">
                              {project.metrics.recentCommits.slice(0, 3).map(commit => (
                                <div key={commit.id} className="commit-item">
                                  <div className="commit-header">
                                    <span className="commit-id">{commit.short_id}</span>
                                    <span className="commit-date">{formatDate(commit.created_at)}</span>
                                  </div>
                                  <div className="commit-message">{escapeHtml(commit.title)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

interface MergeRequestsTableProps {
  mergeRequests: MergeRequest[];
}

const MergeRequestsTable: FC<MergeRequestsTableProps> = ({ mergeRequests }) => {
  if (!mergeRequests || mergeRequests.length === 0) {
    return <div className="no-data">No open merge requests</div>;
  }

  return (
    <table className="mr-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Source Branch</th>
          <th>Pipeline Status</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {mergeRequests.map(mr => {
          const pipelineStatus = mr.head_pipeline
            ? <><span className={`status-indicator ${getPipelineStatusClass(mr.head_pipeline.status)}`}></span> {formatPipelineStatus(mr.head_pipeline.status, true)}</>
            : 'No pipeline';

          return (
            <tr key={mr.id}>
              <td>
                <a href={mr.web_url} target="_blank" rel="noopener noreferrer">
                  {escapeHtml(mr.title)}
                </a>
              </td>
              <td>{mr.source_branch}</td>
              <td>{pipelineStatus}</td>
              <td>{formatDate(mr.updated_at)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default TableView;
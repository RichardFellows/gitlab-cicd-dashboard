import { FC, useState, useCallback, useMemo } from 'react';
import { Project, MergeRequest, STORAGE_KEYS } from '../types';
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
import HealthBadge from './HealthBadge';
import HealthBreakdown from './HealthBreakdown';
import { shouldShowFailureRateAlert, shouldShowCoverageAlert } from '../utils/constants';
import { calculateHealthScore, HealthScore } from '../utils/healthScore';
import GitLabApiService from '../services/GitLabApiService';
import { logger } from '../utils/logger';
import '../styles/TableView.css';

interface TableViewProps {
  projects: Project[];
  onProjectSelect: (projectId: number) => void;
  gitLabService?: GitLabApiService;
  selectionMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelection?: (projectId: number) => void;
}

const TableView: FC<TableViewProps> = ({ projects, onProjectSelect, gitLabService, selectionMode = false, selectedIds, onToggleSelection }) => {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [healthExpanded, setHealthExpanded] = useState<Record<number, boolean>>({});
  const [mergeRequestsData, setMergeRequestsData] = useState<Record<number, MergeRequest[]>>({});
  const [loadingMRs, setLoadingMRs] = useState<Record<number, boolean>>({});

  // Health sort: 'asc' | 'desc' | null
  const [healthSort, setHealthSort] = useState<'asc' | 'desc' | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HEALTH_SORT_ORDER);
    return saved === 'asc' || saved === 'desc' ? saved : null;
  });

  // Compute health scores for all projects
  const healthScores = useMemo(() => {
    const map: Record<number, HealthScore> = {};
    for (const p of projects) {
      map[p.id] = calculateHealthScore(p.metrics);
    }
    return map;
  }, [projects]);

  // Sort projects by health if health sort is active
  const sortedProjects = useMemo(() => {
    if (!healthSort) return projects;
    const sorted = [...projects].sort((a, b) => {
      const scoreA = healthScores[a.id]?.total ?? 0;
      const scoreB = healthScores[b.id]?.total ?? 0;
      return healthSort === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
    return sorted;
  }, [projects, healthSort, healthScores]);

  const toggleHealthSort = () => {
    const next = healthSort === null ? 'desc' : healthSort === 'desc' ? 'asc' : null;
    setHealthSort(next);
    if (next) {
      localStorage.setItem(STORAGE_KEYS.HEALTH_SORT_ORDER, next);
    } else {
      localStorage.removeItem(STORAGE_KEYS.HEALTH_SORT_ORDER);
    }
  };

  // Load merge requests for a project
  const loadMergeRequests = useCallback(async (projectId: number) => {
    if (!gitLabService || loadingMRs[projectId] || mergeRequestsData[projectId]) {
      return;
    }

    // Ensure the API service has the token
    if (!gitLabService.privateToken) {
      const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (savedToken) {
        gitLabService.setPrivateToken(savedToken);
      }
    }

    setLoadingMRs(prev => ({ ...prev, [projectId]: true }));

    try {
      const mrs = await gitLabService.getProjectMergeRequests(projectId);
      setMergeRequestsData(prev => ({ ...prev, [projectId]: mrs }));
    } catch (error) {
      logger.error(`Failed to load MRs for project ${projectId}:`, error);
      setMergeRequestsData(prev => ({ ...prev, [projectId]: [] }));
    } finally {
      setLoadingMRs(prev => ({ ...prev, [projectId]: false }));
    }
  }, [gitLabService, loadingMRs, mergeRequestsData]);

  // Toggle row expansion
  const toggleRow = (projectId: number, hasMRs: boolean) => {
    const isCurrentlyExpanded = expandedRows[projectId] || false;

    setExpandedRows(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));

    // Load MRs when expanding if the project has open MRs
    if (!isCurrentlyExpanded && hasMRs && gitLabService) {
      loadMergeRequests(projectId);
    }
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
            {selectionMode && <th style={{ width: 40 }}></th>}
            <th>Project</th>
            <th
              className={`sortable-header ${healthSort ? 'sorted' : ''}`}
              onClick={toggleHealthSort}
              title="Sort by health score"
              style={{ cursor: 'pointer' }}
            >
              Health {healthSort === 'asc' ? '↑' : healthSort === 'desc' ? '↓' : ''}
            </th>
            <th>Pipeline Status</th>
            <th>Success Rate</th>
            <th>Avg Duration</th>
            <th>Open MRs</th>
            <th>Coverage</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedProjects.map(project => {
            const category = categorizeProject(project);
            const isExpanded = expandedRows[project.id] || false;
            const health = healthScores[project.id];

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
                  className={`project-row ${category} ${isExpanded ? 'expanded' : ''}${selectionMode && selectedIds?.has(project.id) ? ' comparison-selected' : ''}`}
                  data-project-id={project.id}
                >
                  {selectionMode && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(project.id) ?? false}
                        onChange={() => onToggleSelection?.(project.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${project.name} for comparison`}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary-color, #6e49cb)' }}
                      />
                    </td>
                  )}
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
                  <td className="health-cell">
                    {health && (
                      <HealthBadge
                        score={health.total}
                        band={health.band}
                        size="sm"
                        onClick={() => setHealthExpanded(prev => ({ ...prev, [project.id]: !prev[project.id] }))}
                      />
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
                        toggleRow(project.id, project.metrics.mergeRequestCounts.totalOpen > 0);
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
                    <td colSpan={selectionMode ? 9 : 8}>
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
                {healthExpanded[project.id] && health && (
                  <tr
                    key={`health-${project.id}`}
                    className="project-details health-breakdown-row"
                  >
                    <td colSpan={selectionMode ? 9 : 8}>
                      <HealthBreakdown signals={health.signals} />
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
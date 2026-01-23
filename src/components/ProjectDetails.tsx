import { FC, useState, useEffect } from 'react';
import { Project, MergeRequest, STORAGE_KEYS } from '../types';
import GitLabApiService from '../services/GitLabApiService';
import {
  formatPipelineStatus,
  getPipelineStatusClass,
  formatDuration,
  formatCoverage,
  formatDate,
  getSuccessRateClass,
  escapeHtml
} from '../utils/formatting';

interface ProjectDetailsProps {
  project?: Project;
  onBack: () => void;
  gitLabService: GitLabApiService;
}

const ProjectDetails: FC<ProjectDetailsProps> = ({ project, onBack, gitLabService }) => {
  const [mergeRequests, setMergeRequests] = useState<MergeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      loadMergeRequests(project.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const loadMergeRequests = async (projectId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure the API service has the token set correctly
      if (!gitLabService.privateToken) {
        // Try to get the token from localStorage using the correct storage key
        const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (savedToken) {
          gitLabService.setPrivateToken(savedToken);
          console.log('Restored API token from localStorage');
        } else {
          throw new Error('GitLab API token not found. Please return to the dashboard and enter your token.');
        }
      }
      
      const mrs = await gitLabService.getProjectMergeRequests(projectId);
      setMergeRequests(mrs);
      
      if (mrs.length === 0) {
        console.log(`No merge requests found for project ${projectId}`);
      } else {
        console.log(`Successfully loaded ${mrs.length} merge requests for project ${projectId}`);
      }
    } catch (error) {
      console.error(`Failed to load merge requests for project ${projectId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load merge requests: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="project-detail-view">
        <div className="detail-header">
          <div className="back-button-container">
            <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} className="back-button">
              ← Back to Dashboard
            </a>
          </div>
          <div className="error-message">Project not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="project-detail-view">
      <div className="detail-header">
        <div className="back-button-container">
          <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} className="back-button">
            ← Back to Dashboard
          </a>
        </div>
        <div className="project-title">
          <h2>{project.name}</h2>
          <a href={project.web_url} target="_blank" rel="noopener noreferrer" className="gitlab-link" title="Open in GitLab">
            <i className="gitlab-icon">↗️</i>
          </a>
        </div>
      </div>
      
      <div className="detail-content">
        <div className="detail-section pipeline-status">
          <h3>Pipeline Status</h3>
          <div className="detail-card">
            <div className="metric-item">
              <span className="metric-label">Main Branch:</span>
              <span className={`metric-value ${project.metrics.mainBranchPipeline.available ? getPipelineStatusClass(project.metrics.mainBranchPipeline.status) : ''}`}>
                {formatPipelineStatus(project.metrics.mainBranchPipeline.status, project.metrics.mainBranchPipeline.available)}
                {project.metrics.mainBranchPipeline.available && project.metrics.mainBranchPipeline.web_url && (
                  <a href={project.metrics.mainBranchPipeline.web_url} target="_blank" title="View pipeline" rel="noreferrer">
                    <i className="icon">🔍</i>
                  </a>
                )}
              </span>
            </div>
            
            {project.metrics.mainBranchPipeline.failedJobs && project.metrics.mainBranchPipeline.failedJobs.length > 0 && (
              <div className="failed-jobs">
                <details open>
                  <summary className="failed-jobs-summary">Failed Jobs ({project.metrics.mainBranchPipeline.failedJobs.length})</summary>
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
                </details>
              </div>
            )}
            
            <div className="metric-item">
              <span className="metric-label">Success Rate:</span>
              <span className={`metric-value ${getSuccessRateClass(project.metrics.successRate)}`}>
                {project.metrics.successRate.toFixed(2)}%
              </span>
            </div>
            
            <div className="metric-item">
              <span className="metric-label">Avg Duration:</span>
              <span className="metric-value">{formatDuration(project.metrics.avgDuration)}</span>
            </div>
            
            <div className="metric-item">
              <span className="metric-label">Code Coverage:</span>
              <span className="metric-value">
                {formatCoverage(project.metrics.codeCoverage.coverage, project.metrics.codeCoverage.available)}
              </span>
            </div>
            
            <div className="metric-item">
              <span className="metric-label">Open MRs:</span>
              <span className="metric-value">
                {project.metrics.mergeRequestCounts.totalOpen}
                {project.metrics.mergeRequestCounts.drafts > 0 && (
                  <span className="mr-details">
                    ({project.metrics.mergeRequestCounts.drafts} draft
                    {project.metrics.mergeRequestCounts.drafts !== 1 ? 's' : ''})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
        
        <div className="detail-section merge-requests">
          <h3>Active Merge Requests</h3>
          <div className="merge-requests-container">
            {loading ? (
              <div className="loading-indicator">Loading merge requests...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : mergeRequests.length > 0 ? (
              <div className="merge-requests-list">
                {mergeRequests.map(mr => (
                  <div key={mr.id} className="mr-card">
                    <div className="mr-header">
                      <div className="mr-title">
                        <a href={mr.web_url} target="_blank" rel="noopener noreferrer">{escapeHtml(mr.title)}</a>
                      </div>
                      <div className="mr-meta">
                        <span className="mr-branch">Source: {mr.source_branch}</span>
                        <span className="mr-author">{mr.author?.name || 'Unknown'}</span>
                        <span className="mr-date">{formatDate(mr.created_at)}</span>
                      </div>
                    </div>
                    
                    {mr.head_pipeline ? (
                      <div className="mr-pipeline">
                        <div className={`pipeline-status ${getPipelineStatusClass(mr.head_pipeline.status)}`}>
                          <span className="status-label">Pipeline:</span>
                          <span className={`status-value ${getPipelineStatusClass(mr.head_pipeline.status)}`}>
                            {formatPipelineStatus(mr.head_pipeline.status, true)}
                          </span>
                          <a href={mr.head_pipeline.web_url} target="_blank" className="pipeline-link" rel="noreferrer">
                            View Pipeline
                          </a>
                          {mr.head_pipeline.duration && (
                            <span className="pipeline-duration">
                              Duration: {formatDuration(mr.head_pipeline.duration)}
                            </span>
                          )}
                        </div>
                        
                        {mr.head_pipeline.failedJobs && mr.head_pipeline.failedJobs.length > 0 && (
                          <div className="failed-jobs">
                            <details>
                              <summary className="failed-jobs-header">
                                Failed Jobs ({mr.head_pipeline.failedJobs.length})
                              </summary>
                              <div className="failed-jobs-list">
                                {mr.head_pipeline.failedJobs.map(job => (
                                  <div key={job.id} className="job-item failed">
                                    <div className="job-header">
                                      <span className="job-name">{job.name}</span>
                                      <span className="job-stage">{job.stage}</span>
                                    </div>
                                    <div className="job-details">
                                      <div className="job-reason">{job.failure_reason || 'Unknown failure'}</div>
                                      <div className="job-actions">
                                        <a href={job.web_url} target="_blank" className="job-link" rel="noreferrer">
                                          View Job
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="no-pipeline">No pipeline information available</div>
                    )}
                    
                    {mr.recent_commits && mr.recent_commits.length > 0 && (
                      <div className="mr-commits">
                        <div className="commits-header">Recent Commits ({mr.recent_commits.length})</div>
                        <div className="commits-list">
                          {mr.recent_commits.map(commit => (
                            <div key={commit.id} className="commit-item">
                              <div className="commit-header">
                                <span className="commit-id">{commit.short_id || commit.id.substring(0, 8)}</span>
                                <span className="commit-date">{formatDate(commit.created_at)}</span>
                              </div>
                              <div className="commit-message">{escapeHtml(commit.title || commit.message || '')}</div>
                              <div className="commit-author">{commit.author_name || commit.committer_name || 'Unknown'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">No active merge requests</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
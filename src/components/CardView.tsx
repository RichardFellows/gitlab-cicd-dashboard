import { FC } from 'react';
import { Project } from '../types';
import {
  categorizeProject,
  formatPipelineStatus,
  getSuccessRateClass,
  getPipelineStatusClass,
  formatDuration,
  formatCoverage,
  formatDate,
  escapeHtml
} from '../utils/formatting';
import '../styles/CardView.css';

interface CardViewProps {
  projects: Project[];
  onProjectSelect: (projectId: number) => void;
}

const CardView: FC<CardViewProps> = ({ projects, onProjectSelect }) => {
  // Group projects by status
  const groupedProjects: Record<string, Project[]> = {
    failed: [],
    warning: [],
    inactive: [],
    success: []
  };

  // Categorize and group each project
  projects.forEach(project => {
    const category = categorizeProject(project);
    // Map 'no-pipeline' to 'inactive'
    const mappedCategory = category === 'no-pipeline' ? 'inactive' : category;
    groupedProjects[mappedCategory].push(project);
  });

  return (
    <div className="card-view-container">
      {/* Failed Projects Group */}
      {groupedProjects.failed.length > 0 && (
        <div className="project-group failed-group">
          <h3 className="group-header">Failed Pipelines ({groupedProjects.failed.length})</h3>
          <div className="project-cards">
            {groupedProjects.failed.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onProjectSelect={onProjectSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Warning Projects Group */}
      {groupedProjects.warning.length > 0 && (
        <div className="project-group warning-group">
          <h3 className="group-header">Warning ({groupedProjects.warning.length})</h3>
          <div className="project-cards">
            {groupedProjects.warning.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onProjectSelect={onProjectSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Projects Group */}
      {groupedProjects.inactive.length > 0 && (
        <div className="project-group inactive-group">
          <h3 className="group-header">Inactive ({groupedProjects.inactive.length})</h3>
          <div className="project-cards">
            {groupedProjects.inactive.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onProjectSelect={onProjectSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Successful Projects Group */}
      {groupedProjects.success.length > 0 && (
        <div className="project-group success-group">
          <h3 className="group-header">Successful ({groupedProjects.success.length})</h3>
          <div className="project-cards">
            {groupedProjects.success.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onProjectSelect={onProjectSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface ProjectCardProps {
  project: Project;
  onProjectSelect: (projectId: number) => void;
}

const ProjectCard: FC<ProjectCardProps> = ({ project, onProjectSelect }) => {
  const category = categorizeProject(project);
  
  // Determine which commits to show
  const getCommitsToShow = () => {
    if (!project.metrics.recentCommits || project.metrics.recentCommits.length === 0) {
      return [];
    }
    
    // Get commits from the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentCommits = project.metrics.recentCommits.filter(
      commit => new Date(commit.created_at) > oneWeekAgo
    );
    
    // Determine how many commits to display based on criteria
    if (recentCommits.length >= 3) {
      // At least 3 in the last week, show top 3
      return project.metrics.recentCommits.slice(0, 3);
    } else if (project.metrics.recentCommits.length >= 2) {
      // Less than 3 in the last week, show top 2
      return project.metrics.recentCommits.slice(0, 2);
    } else {
      // Just show 1 if there is only 1 or none in the last week
      return project.metrics.recentCommits.slice(0, 1);
    }
  };

  const commitsToShow = getCommitsToShow();

  return (
    <div className={`project-card ${category}`}>
      <div className="project-header">
        <h3>
          <a 
            href="#" 
            className="project-name-link" 
            data-project-id={project.id}
            onClick={(e) => {
              e.preventDefault();
              onProjectSelect(project.id);
            }}
          >
            {project.name}
          </a>
        </h3>
        <a 
          href={project.web_url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="gitlab-link" 
          title="Open in GitLab"
        >
          <i className="gitlab-icon">↗️</i>
        </a>
      </div>
      <div className="project-metrics">
        <div className="metric-section">
          <h4>Pipeline Status</h4>
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
              <details>
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
        
        <div className="metric-section">
          <h4>Recent Commits</h4>
          <div className="recent-commits">
            {commitsToShow.length > 0 ? (
              commitsToShow.map(commit => (
                <div key={commit.id} className="commit-item">
                  <div className="commit-header">
                    <span className="commit-id">{commit.short_id}</span>
                    <span className="commit-date">{formatDate(commit.created_at)}</span>
                  </div>
                  <div className="commit-message">{escapeHtml(commit.title)}</div>
                </div>
              ))
            ) : (
              <div className="no-data">No recent commits found</div>
            )}
          </div>
        </div>
        
        <div className="metric-section">
          <h4>Test Results</h4>
          <div className="metric-item">
            <span className="metric-label">Tests:</span>
            {project.metrics.testMetrics.available ? (
              <>
                <span className="metric-value">{project.metrics.testMetrics.total}</span>
                <span className="test-details">
                  ({project.metrics.testMetrics.success} passed,
                  {project.metrics.testMetrics.failed} failed)
                </span>
              </>
            ) : (
              <span className="metric-value">No Test Data Available</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardView;
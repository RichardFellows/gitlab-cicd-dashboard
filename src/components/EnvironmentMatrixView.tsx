import { FC, useState, useEffect, useCallback } from 'react';
import { Project, ENVIRONMENT_ORDER, DeploymentsByEnv, EnvironmentName } from '../types';
import DeploymentCell from './DeploymentCell';
import DeploymentDetails from './DeploymentDetails';
import '../styles/EnvironmentMatrix.css';

interface EnvironmentMatrixViewProps {
  projects: Project[];
  deploymentCache: Map<number, DeploymentsByEnv>;
  fetchProjectDeployments: (projectId: number) => Promise<void>;
  jiraBaseUrl?: string;
}

/**
 * Environment matrix view showing projects as rows and environments as columns.
 * Displays deployment version + status for each project/environment combination.
 */
const EnvironmentMatrixView: FC<EnvironmentMatrixViewProps> = ({
  projects,
  deploymentCache,
  fetchProjectDeployments,
  jiraBaseUrl
}) => {
  // Track which cell is expanded (projectId-environment key)
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  // Fetch deployments for visible projects on mount
  useEffect(() => {
    // Fetch for all projects (could optimize with IntersectionObserver for large lists)
    projects.forEach(project => {
      if (!deploymentCache.has(project.id)) {
        fetchProjectDeployments(project.id);
      }
    });
  }, [projects, deploymentCache, fetchProjectDeployments]);

  // Handle cell click - toggle expansion
  const handleCellClick = useCallback((projectId: number, env: EnvironmentName) => {
    const key = `${projectId}-${env}`;
    setExpandedCell(prev => prev === key ? null : key);
  }, []);

  // Close details panel
  const handleCloseDetails = useCallback(() => {
    setExpandedCell(null);
  }, []);

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="environment-matrix environment-matrix--empty">
        <p>No projects configured. Add groups or projects in the settings above.</p>
      </div>
    );
  }

  return (
    <div className="environment-matrix">
      <table className="environment-matrix__table">
        <thead>
          <tr>
            <th className="environment-matrix__header environment-matrix__header--project">
              Project
            </th>
            {ENVIRONMENT_ORDER.map(env => (
              <th key={env} className="environment-matrix__header">
                {env.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map(project => {
            const deploymentData = deploymentCache.get(project.id);
            const isLoading = deploymentData?.loading ?? true;
            const hasError = !!deploymentData?.error;

            return (
              <ProjectRow
                key={project.id}
                project={project}
                deploymentData={deploymentData}
                isLoading={isLoading}
                hasError={hasError}
                expandedCell={expandedCell}
                jiraBaseUrl={jiraBaseUrl}
                onCellClick={handleCellClick}
                onCloseDetails={handleCloseDetails}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

interface ProjectRowProps {
  project: Project;
  deploymentData?: DeploymentsByEnv;
  isLoading: boolean;
  hasError: boolean;
  expandedCell: string | null;
  jiraBaseUrl?: string;
  onCellClick: (projectId: number, env: EnvironmentName) => void;
  onCloseDetails: () => void;
}

/**
 * Single row in the environment matrix representing one project.
 */
const ProjectRow: FC<ProjectRowProps> = ({
  project,
  deploymentData,
  isLoading,
  hasError,
  expandedCell,
  jiraBaseUrl,
  onCellClick,
  onCloseDetails
}) => {
  // Find which environment is expanded for this project
  const expandedEnv = expandedCell?.startsWith(`${project.id}-`)
    ? expandedCell.split('-')[1] as EnvironmentName
    : null;

  // Get the expanded deployment
  const expandedDeployment = expandedEnv && deploymentData?.deployments[expandedEnv];

  return (
    <>
      <tr className="environment-matrix__row">
        <td className="environment-matrix__cell environment-matrix__cell--project">
          <a
            href={project.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="environment-matrix__project-link"
          >
            {project.name}
          </a>
          {hasError && (
            <span className="environment-matrix__error-indicator" title={deploymentData?.error}>
              ⚠
            </span>
          )}
        </td>
        {ENVIRONMENT_ORDER.map(env => {
          const deployment = deploymentData?.deployments[env] || null;
          const isExpanded = expandedCell === `${project.id}-${env}`;

          return (
            <DeploymentCell
              key={env}
              deployment={deployment}
              loading={isLoading}
              isExpanded={isExpanded}
              onClick={() => onCellClick(project.id, env)}
            />
          );
        })}
      </tr>
      
      {/* Expanded details row */}
      {expandedDeployment && (
        <tr className="environment-matrix__details-row">
          <td colSpan={ENVIRONMENT_ORDER.length + 1}>
            <DeploymentDetails
              deployment={expandedDeployment}
              jiraBaseUrl={jiraBaseUrl}
              onClose={onCloseDetails}
            />
          </td>
        </tr>
      )}
    </>
  );
};

export default EnvironmentMatrixView;

import { FC, useMemo } from 'react';
import { Project, DeploymentsByEnv, ENVIRONMENT_ORDER, EnvironmentName } from '../types';

interface ComparisonDeploymentsProps {
  projects: Project[];
  deploymentCache: Map<number, DeploymentsByEnv>;
  colours: string[];
  darkMode?: boolean;
}

const ComparisonDeployments: FC<ComparisonDeploymentsProps> = ({
  projects,
  deploymentCache,
  colours,
  darkMode = false,
}) => {
  // Collect all environments that have at least one deployment
  const environments = useMemo(() => {
    const envSet = new Set<EnvironmentName>();
    for (const project of projects) {
      const depData = deploymentCache.get(project.id);
      if (depData) {
        for (const env of ENVIRONMENT_ORDER) {
          if (depData.deployments[env]) {
            envSet.add(env);
          }
        }
      }
    }
    // Return in standard order
    return ENVIRONMENT_ORDER.filter(e => envSet.has(e));
  }, [projects, deploymentCache]);

  const hasAnyDeployments = environments.length > 0;

  return (
    <div className="comparison-deployments" data-testid="comparison-deployments">
      <h3 className="comparison-deployments__title">Deployment Comparison</h3>
      {!hasAnyDeployments ? (
        <p className="comparison-deployments__empty">No deployment data available for selected projects.</p>
      ) : (
        <div className="comparison-deployments__wrapper">
          <table className={`comparison-deployments__table ${darkMode ? 'dark' : ''}`}>
            <thead>
              <tr>
                <th>Environment</th>
                {projects.map((p, i) => (
                  <th key={p.id}>
                    <span
                      className="comparison-deployments__swatch"
                      style={{ backgroundColor: colours[i] }}
                    />
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {environments.map(env => (
                <tr key={env}>
                  <td className="comparison-deployments__env">{env.toUpperCase()}</td>
                  {projects.map(p => {
                    const depData = deploymentCache.get(p.id);
                    const deployment = depData?.deployments[env];
                    const isLoading = depData?.loading ?? false;

                    if (isLoading) {
                      return (
                        <td key={p.id} className="comparison-deployments__cell comparison-deployments__cell--loading">
                          <span className="spinner-sm" />
                        </td>
                      );
                    }

                    if (!deployment) {
                      return (
                        <td key={p.id} className="comparison-deployments__cell comparison-deployments__cell--empty">
                          —
                        </td>
                      );
                    }

                    const statusClass = `comparison-deployments__status--${deployment.status}`;
                    const timestamp = deployment.timestamp
                      ? new Date(deployment.timestamp).toLocaleDateString()
                      : '';

                    return (
                      <td key={p.id} className={`comparison-deployments__cell ${statusClass}`}>
                        <div className="comparison-deployments__version">
                          {deployment.version || `#${deployment.pipelineIid || '?'}`}
                        </div>
                        <div className="comparison-deployments__timestamp">{timestamp}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ComparisonDeployments;

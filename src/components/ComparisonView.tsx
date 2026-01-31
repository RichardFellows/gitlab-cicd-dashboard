import { FC, useEffect, useState, useCallback, useMemo } from 'react';
import { Project, PipelineTrend, DeploymentsByEnv } from '../types';
import { COMPARISON_COLOURS, COMPARISON_COLOURS_DARK } from '../utils/constants';
import DashboardDataService from '../services/DashboardDataService';
import ComparisonHeader from './ComparisonHeader';
import ComparisonCharts from './ComparisonCharts';
import ComparisonTable from './ComparisonTable';
import ComparisonDeployments from './ComparisonDeployments';
import '../styles/ComparisonView.css';

interface ComparisonViewProps {
  projects: Project[];
  dashboardService: DashboardDataService;
  deploymentCache: Map<number, DeploymentsByEnv>;
  timeframe: number;
  darkMode?: boolean;
  onBack: () => void;
  onRemoveProject: (projectId: number) => void;
}

const ComparisonView: FC<ComparisonViewProps> = ({
  projects,
  dashboardService,
  deploymentCache,
  timeframe,
  darkMode = false,
  onBack,
  onRemoveProject,
}) => {
  const [trendData, setTrendData] = useState<Map<number, PipelineTrend[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Map<number, string>>(new Map());

  const colours = useMemo(
    () => (darkMode ? COMPARISON_COLOURS_DARK : COMPARISON_COLOURS).slice(0, projects.length),
    [darkMode, projects.length]
  );

  const fetchTrendData = useCallback(async () => {
    setLoading(true);
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000).toISOString();

    const results = await Promise.allSettled(
      projects.map(async (project) => {
        const trends = await dashboardService.getProjectPipelineTrends(project.id, {
          startDate,
          endDate,
        });
        return { projectId: project.id, trends };
      })
    );

    const newTrendData = new Map<number, PipelineTrend[]>();
    const newErrors = new Map<number, string>();

    results.forEach((result, i) => {
      const projectId = projects[i].id;
      if (result.status === 'fulfilled') {
        newTrendData.set(projectId, result.value.trends);
      } else {
        newErrors.set(projectId, result.reason?.message || 'Failed to load trends');
        newTrendData.set(projectId, []);
      }
    });

    setTrendData(newTrendData);
    setErrors(newErrors);
    setLoading(false);
  }, [projects, dashboardService, timeframe]);

  useEffect(() => {
    if (projects.length >= 2) {
      fetchTrendData();
    }
  }, [fetchTrendData, projects.length]);

  const handleRemoveProject = useCallback(
    (projectId: number) => {
      // If removing would leave fewer than 2, go back to dashboard
      if (projects.length <= 2) {
        onBack();
      } else {
        onRemoveProject(projectId);
      }
    },
    [projects.length, onBack, onRemoveProject]
  );

  if (projects.length < 2) {
    return (
      <div className={`comparison-view ${darkMode ? 'dark-mode' : ''}`}>
        <ComparisonHeader
          projects={projects}
          colours={colours}
          onBack={onBack}
          onRemoveProject={handleRemoveProject}
        />
        <div className="comparison-view__error">
          <p>At least 2 projects are required for comparison.</p>
          <button onClick={onBack}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`comparison-view ${darkMode ? 'dark-mode' : ''}`} data-testid="comparison-view">
      <ComparisonHeader
        projects={projects}
        colours={colours}
        onBack={onBack}
        onRemoveProject={handleRemoveProject}
      />

      {errors.size > 0 && (
        <div className="comparison-view__warnings">
          {Array.from(errors.entries()).map(([pid, msg]) => {
            const p = projects.find(pr => pr.id === pid);
            return (
              <div key={pid} className="comparison-view__warning">
                ⚠ Failed to load trends for {p?.name || `project ${pid}`}: {msg}
              </div>
            );
          })}
        </div>
      )}

      <ComparisonCharts
        projects={projects}
        trendData={trendData}
        colours={colours}
        darkMode={darkMode}
        loading={loading}
      />

      <ComparisonTable
        projects={projects}
        colours={colours}
        darkMode={darkMode}
      />

      <ComparisonDeployments
        projects={projects}
        deploymentCache={deploymentCache}
        colours={colours}
        darkMode={darkMode}
      />
    </div>
  );
};

export default ComparisonView;

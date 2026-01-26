import { FC } from 'react';
import { Project, EnvironmentName, ReadinessStatus, ENVIRONMENT_ORDER } from '../types';

interface ReadinessFilters {
  project: number | null;
  environment: EnvironmentName | null;
  status: ReadinessStatus | 'all';
}

interface ReadinessFilterProps {
  projects: Project[];
  filters: ReadinessFilters;
  onChange: (filters: ReadinessFilters) => void;
}

/**
 * Filter controls for the readiness view.
 * Allows filtering by project, environment, and readiness status.
 */
const ReadinessFilter: FC<ReadinessFilterProps> = ({
  projects,
  filters,
  onChange
}) => {
  const statusOptions: { value: ReadinessStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'ready', label: '✓ Ready' },
    { value: 'pending-signoff', label: '⏳ Pending Sign-off' },
    { value: 'tests-failed', label: '✗ Tests Failed' },
    { value: 'not-deployed', label: '○ Not Deployed' }
  ];

  return (
    <div className="readiness-filter">
      <div className="readiness-filter__group">
        <label className="readiness-filter__label" htmlFor="project-filter">
          Project
        </label>
        <select
          id="project-filter"
          className="readiness-filter__select"
          value={filters.project ?? ''}
          onChange={(e) => onChange({
            ...filters,
            project: e.target.value ? Number(e.target.value) : null
          })}
        >
          <option value="">All Projects</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="readiness-filter__group">
        <label className="readiness-filter__label" htmlFor="environment-filter">
          Environment
        </label>
        <select
          id="environment-filter"
          className="readiness-filter__select"
          value={filters.environment ?? ''}
          onChange={(e) => onChange({
            ...filters,
            environment: e.target.value ? e.target.value as EnvironmentName : null
          })}
        >
          <option value="">All Environments</option>
          {ENVIRONMENT_ORDER.map(env => (
            <option key={env} value={env}>
              {env.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="readiness-filter__group">
        <label className="readiness-filter__label" htmlFor="status-filter">
          Status
        </label>
        <select
          id="status-filter"
          className="readiness-filter__select"
          value={filters.status}
          onChange={(e) => onChange({
            ...filters,
            status: e.target.value as ReadinessStatus | 'all'
          })}
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ReadinessFilter;
export type { ReadinessFilters };

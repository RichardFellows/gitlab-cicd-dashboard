import { FC, useCallback } from 'react';
import { Project, TimelineFilters as TimelineFiltersType, ENVIRONMENT_ORDER, EnvironmentName } from '../types';
import { createDefaultFilters } from '../utils/timelineUtils';

interface TimelineFiltersProps {
  projects: Project[];
  filters: TimelineFiltersType;
  onFilterChange: (filters: TimelineFiltersType) => void;
  totalCount: number;
  filteredCount: number;
  darkMode?: boolean;
}

/**
 * Filter bar for the deployment timeline.
 * Supports project, environment, status, and date range filtering.
 */
const TimelineFilters: FC<TimelineFiltersProps> = ({
  projects,
  filters,
  onFilterChange,
  totalCount,
  filteredCount,
}) => {
  // Check if any filters are active
  const activeFilterCount =
    (filters.projectIds.length > 0 ? 1 : 0) +
    (filters.environments.length > 0 ? 1 : 0) +
    (filters.statuses.length > 0 ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0);

  const handleProjectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, opt => Number(opt.value));
    onFilterChange({ ...filters, projectIds: selected });
  }, [filters, onFilterChange]);

  const handleEnvChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, opt => opt.value as EnvironmentName);
    onFilterChange({ ...filters, environments: selected });
  }, [filters, onFilterChange]);

  const handleStatusToggle = useCallback((status: 'success' | 'failed' | 'rollback') => {
    const current = filters.statuses;
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFilterChange({ ...filters, statuses: updated });
  }, [filters, onFilterChange]);

  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, dateFrom: e.target.value || null });
  }, [filters, onFilterChange]);

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, dateTo: e.target.value || null });
  }, [filters, onFilterChange]);

  const handleClear = useCallback(() => {
    onFilterChange(createDefaultFilters());
  }, [onFilterChange]);

  return (
    <div className="timeline-filters">
      {/* Project filter */}
      <div className="timeline-filters__group">
        <label className="timeline-filters__label" htmlFor="timeline-project-filter">
          Project
        </label>
        <select
          id="timeline-project-filter"
          className="timeline-filters__select"
          multiple
          size={1}
          value={filters.projectIds.map(String)}
          onChange={handleProjectChange}
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Environment filter */}
      <div className="timeline-filters__group">
        <label className="timeline-filters__label" htmlFor="timeline-env-filter">
          Env
        </label>
        <select
          id="timeline-env-filter"
          className="timeline-filters__select"
          multiple
          size={1}
          value={filters.environments}
          onChange={handleEnvChange}
        >
          {ENVIRONMENT_ORDER.map(env => (
            <option key={env} value={env}>
              {env.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Status filter */}
      <div className="timeline-filters__group">
        <span className="timeline-filters__label">Status</span>
        <div className="timeline-filters__checkbox-group">
          {(['success', 'failed', 'rollback'] as const).map(status => (
            <label key={status} className="timeline-filters__checkbox-label">
              <input
                type="checkbox"
                checked={filters.statuses.includes(status)}
                onChange={() => handleStatusToggle(status)}
              />
              {status}
            </label>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div className="timeline-filters__group">
        <label className="timeline-filters__label" htmlFor="timeline-date-from">
          From
        </label>
        <input
          id="timeline-date-from"
          type="date"
          className="timeline-filters__date-input"
          value={filters.dateFrom || ''}
          onChange={handleDateFromChange}
        />
      </div>

      <div className="timeline-filters__group">
        <label className="timeline-filters__label" htmlFor="timeline-date-to">
          To
        </label>
        <input
          id="timeline-date-to"
          type="date"
          className="timeline-filters__date-input"
          value={filters.dateTo || ''}
          onChange={handleDateToChange}
        />
      </div>

      {/* Count and clear */}
      <span className="timeline-filters__count">
        {filteredCount} of {totalCount} deployments
        {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active)`}
      </span>

      {activeFilterCount > 0 && (
        <button
          className="timeline-filters__clear"
          onClick={handleClear}
          type="button"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
};

export default TimelineFilters;

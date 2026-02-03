import { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { Project, DeploymentHistoryEntry, TimelineFilters as TimelineFiltersType, STORAGE_KEYS } from '../types';
import DashboardDataService from '../services/DashboardDataService';
import TimelineFilters from './TimelineFilters';
import TimelineDay from './TimelineDay';
import { groupByDate, getDateLabel, filterTimeline, createDefaultFilters } from '../utils/timelineUtils';
import '../styles/DeploymentTimeline.css';

interface DeploymentTimelineProps {
  projects: Project[];
  dashboardService: DashboardDataService;
  darkMode?: boolean;
  jiraBaseUrl?: string;
}

/** Number of entries to show initially / per "Load more" batch */
const PAGE_SIZE = 50;

/**
 * Main container for the deployment timeline.
 * Fetches history for all projects, detects rollbacks, applies filters, groups by date.
 */
const DeploymentTimeline: FC<DeploymentTimelineProps> = ({
  projects,
  dashboardService,
  darkMode,
  jiraBaseUrl,
}) => {
  const [history, setHistory] = useState<DeploymentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Load/save filters from localStorage
  const [filters, setFilters] = useState<TimelineFiltersType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TIMELINE_FILTERS);
      if (saved) {
        return JSON.parse(saved) as TimelineFiltersType;
      }
    } catch {
      // ignore parse errors
    }
    return createDefaultFilters();
  });

  // Save filters to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TIMELINE_FILTERS, JSON.stringify(filters));
    } catch {
      // ignore storage errors
    }
  }, [filters]);

  // Fetch deployment history on mount
  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const allEntries: DeploymentHistoryEntry[] = [];
        const errors: string[] = [];

        // Fetch in batches of 5 projects at a time to limit concurrency
        const batchSize = 5;
        for (let i = 0; i < projects.length; i += batchSize) {
          if (cancelled) return;

          const batch = projects.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map(project =>
              dashboardService.getProjectDeploymentHistory(project.id, project.name)
            )
          );

          for (let j = 0; j < results.length; j++) {
            const result = results[j];
            if (result.status === 'fulfilled') {
              allEntries.push(...result.value);
            } else {
              errors.push(batch[j].name);
            }
          }
        }

        if (cancelled) return;

        // Detect rollbacks
        dashboardService.detectRollbacks(allEntries);

        // Sort by timestamp descending (newest first)
        allEntries.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setHistory(allEntries);

        if (errors.length > 0) {
          setError(`Could not load history for: ${errors.join(', ')}`);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load deployment history');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [projects, dashboardService]);

  // Apply filters
  const filteredEntries = useMemo(
    () => filterTimeline(history, filters),
    [history, filters]
  );

  // Paginate
  const visibleEntries = useMemo(
    () => filteredEntries.slice(0, visibleCount),
    [filteredEntries, visibleCount]
  );

  // Group by date
  const dateGroups = useMemo(
    () => groupByDate(visibleEntries),
    [visibleEntries]
  );

  const handleFilterChange = useCallback((newFilters: TimelineFiltersType) => {
    setFilters(newFilters);
    setVisibleCount(PAGE_SIZE); // Reset pagination on filter change
  }, []);

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  }, []);

  const hasMore = visibleCount < filteredEntries.length;

  if (loading) {
    return (
      <div className="deployment-timeline">
        <div className="deployment-timeline__loading">
          Loading deployment history…
        </div>
      </div>
    );
  }

  return (
    <div className="deployment-timeline">
      <div className="deployment-timeline__header">
        <h3 className="deployment-timeline__title">Deployment Timeline</h3>
        <span className="deployment-timeline__count">
          {history.length} total deployments
        </span>
      </div>

      {/* Filters */}
      <TimelineFilters
        projects={projects}
        filters={filters}
        onFilterChange={handleFilterChange}
        totalCount={history.length}
        filteredCount={filteredEntries.length}
        darkMode={darkMode}
      />

      {/* Error banner */}
      {error && (
        <div className="deployment-timeline__error">
          ⚠ {error}
        </div>
      )}

      {/* Empty state */}
      {filteredEntries.length === 0 && !loading && (
        <div className="deployment-timeline__empty">
          <div className="deployment-timeline__empty-icon">📋</div>
          <p className="deployment-timeline__empty-text">
            {history.length === 0
              ? 'No deployments found. Check that projects have deploy jobs configured.'
              : 'No deployments match the current filters.'}
          </p>
        </div>
      )}

      {/* Date groups */}
      {Array.from(dateGroups.entries()).map(([date, entries]) => (
        <TimelineDay
          key={date}
          date={date}
          label={getDateLabel(date)}
          entries={entries}
          jiraBaseUrl={jiraBaseUrl}
          darkMode={darkMode}
        />
      ))}

      {/* Load more */}
      {hasMore && (
        <button
          className="deployment-timeline__load-more"
          onClick={handleLoadMore}
          type="button"
        >
          Load more ({filteredEntries.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
};

export default DeploymentTimeline;

import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { Project, VersionReadiness, DeploymentsByEnv, ReadinessStatus } from '../types';
import DashboardDataService from '../services/DashboardDataService';
import ReadinessFilter, { ReadinessFilters } from './ReadinessFilter';
import ReadinessRow from './ReadinessRow';
import ReadinessDetails from './ReadinessDetails';
import { logger } from '../utils/logger';
import '../styles/ReadinessView.css';

interface ReadinessViewProps {
  projects: Project[];
  deploymentCache: Map<number, DeploymentsByEnv>;
  dashboardService: DashboardDataService;
  jiraBaseUrl?: string;
}

/**
 * Main container for the promotion readiness view.
 * Shows which versions are ready for promotion to the next environment.
 */
const ReadinessView: FC<ReadinessViewProps> = ({
  projects,
  deploymentCache,
  dashboardService,
  jiraBaseUrl
}) => {
  // Filter state
  const [filters, setFilters] = useState<ReadinessFilters>({
    project: null,
    environment: null,
    status: 'all'
  });

  // Readiness data state
  const [readinessData, setReadinessData] = useState<VersionReadiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded row tracking
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Fetch readiness data for all projects
  const fetchReadinessData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allReadiness: VersionReadiness[] = [];

      for (const project of projects) {
        const cachedDeployments = deploymentCache.get(project.id);
        const projectReadiness = await dashboardService.getProjectReadiness(
          project.id,
          project.name,
          cachedDeployments
        );
        allReadiness.push(...projectReadiness);
      }

      setReadinessData(allReadiness);
    } catch (err) {
      logger.error('Failed to fetch readiness data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load readiness data');
    } finally {
      setLoading(false);
    }
  }, [projects, deploymentCache, dashboardService]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    if (projects.length > 0) {
      fetchReadinessData();
    } else {
      setLoading(false);
    }
  }, [projects, fetchReadinessData]);

  // Filter readiness data
  const filteredData = useMemo(() => {
    return readinessData.filter(item => {
      // Project filter
      if (filters.project && item.projectId !== filters.project) {
        return false;
      }

      // Environment filter
      if (filters.environment && item.environment !== filters.environment) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && item.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [readinessData, filters]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: ReadinessFilters) => {
    setFilters(newFilters);
    setExpandedKey(null); // Collapse any expanded row when filters change
  }, []);

  // Handle row toggle
  const handleRowToggle = useCallback((key: string) => {
    setExpandedKey(prev => prev === key ? null : key);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    dashboardService.clearReadinessCache();
    fetchReadinessData();
  }, [dashboardService, fetchReadinessData]);

  // Generate unique key for a readiness item
  const getItemKey = (item: VersionReadiness): string => {
    return `${item.projectId}-${item.environment}-${item.version}`;
  };

  // Group by status for summary
  const statusSummary = useMemo(() => {
    const summary: Record<ReadinessStatus, number> = {
      'ready': 0,
      'pending-signoff': 0,
      'tests-failed': 0,
      'not-deployed': 0
    };

    filteredData.forEach(item => {
      summary[item.status]++;
    });

    return summary;
  }, [filteredData]);

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="readiness-view readiness-view--empty">
        <p>No projects configured. Add groups or projects in the settings above.</p>
      </div>
    );
  }

  return (
    <div className="readiness-view">
      <div className="readiness-view__header">
        <h2 className="readiness-view__title">Promotion Readiness</h2>
        <button 
          className="readiness-view__refresh-btn"
          onClick={handleRefresh}
          disabled={loading}
          title="Refresh readiness data"
        >
          {loading ? '↻ Loading...' : '↻ Refresh'}
        </button>
      </div>

      <ReadinessFilter
        projects={projects}
        filters={filters}
        onChange={handleFilterChange}
      />

      {/* Status summary badges */}
      <div className="readiness-view__summary">
        <span className="readiness-summary-badge readiness-summary-badge--ready">
          ✓ {statusSummary.ready} Ready
        </span>
        <span className="readiness-summary-badge readiness-summary-badge--pending">
          ⏳ {statusSummary['pending-signoff']} Pending
        </span>
        <span className="readiness-summary-badge readiness-summary-badge--failed">
          ✗ {statusSummary['tests-failed']} Failed
        </span>
        <span className="readiness-summary-badge readiness-summary-badge--not-deployed">
          ○ {statusSummary['not-deployed']} Not Deployed
        </span>
      </div>

      {error && (
        <div className="readiness-view__error">
          <p>Error: {error}</p>
          <button onClick={handleRefresh}>Retry</button>
        </div>
      )}

      {loading && readinessData.length === 0 && (
        <div className="readiness-view__loading">
          <p>Loading readiness data...</p>
        </div>
      )}

      {!loading && filteredData.length === 0 && (
        <div className="readiness-view__no-results">
          <p>No versions match the current filters.</p>
        </div>
      )}

      {filteredData.length > 0 && (
        <table className="readiness-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Version</th>
              <th>Environment</th>
              <th>Status</th>
              <th>Sign-off</th>
              <th>Tests</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(item => {
              const key = getItemKey(item);
              const isExpanded = expandedKey === key;

              return (
                <ReadinessRowWithDetails
                  key={key}
                  readiness={item}
                  isExpanded={isExpanded}
                  onToggle={() => handleRowToggle(key)}
                  jiraBaseUrl={jiraBaseUrl}
                />
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

/**
 * Wrapper component that renders ReadinessRow and its expandable details.
 */
interface ReadinessRowWithDetailsProps {
  readiness: VersionReadiness;
  isExpanded: boolean;
  onToggle: () => void;
  jiraBaseUrl?: string;
}

const ReadinessRowWithDetails: FC<ReadinessRowWithDetailsProps> = ({
  readiness,
  isExpanded,
  onToggle,
  jiraBaseUrl
}) => {
  return (
    <>
      <ReadinessRow
        readiness={readiness}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />
      {isExpanded && (
        <tr className="readiness-details-row">
          <td colSpan={7}>
            <ReadinessDetails
              readiness={readiness}
              jiraBaseUrl={jiraBaseUrl}
            />
          </td>
        </tr>
      )}
    </>
  );
};

export default ReadinessView;

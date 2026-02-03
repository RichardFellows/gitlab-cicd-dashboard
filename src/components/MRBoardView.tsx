import { useState, useEffect, useMemo, useCallback } from 'react';
import { Project, MRWithProject, MRBoardFilters as MRBoardFiltersType, MRSortOption, MRPipelineGroup, STORAGE_KEYS } from '../types';
import DashboardDataService from '../services/DashboardDataService';
import MRBoardFilters from './MRBoardFilters';
import MRBoardColumn from './MRBoardColumn';
import MRCardDetails from './MRCardDetails';
import { groupMRsByPipelineStatus, filterMRs, sortMRs, getColumnConfig } from '../utils/mrBoardUtils';
import '../styles/MRBoard.css';

interface MRBoardViewProps {
  projects: Project[];
  dashboardService: DashboardDataService;
  darkMode?: boolean;
}

const COLUMN_ORDER: MRPipelineGroup[] = ['passing', 'failing', 'running', 'draft', 'no-pipeline'];

const DEFAULT_FILTERS: MRBoardFiltersType = {
  projectIds: [],
  authorSearch: '',
  myMRsOnly: false,
  myUsername: '',
};

/**
 * Load filters from localStorage
 */
function loadSavedFilters(): MRBoardFiltersType {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.MR_BOARD_FILTERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_FILTERS, ...parsed };
    }
  } catch {
    // ignore
  }
  // Also load username separately
  const username = localStorage.getItem(STORAGE_KEYS.MY_USERNAME) || '';
  return { ...DEFAULT_FILTERS, myUsername: username };
}

/**
 * Load sort from localStorage
 */
function loadSavedSort(): MRSortOption {
  const saved = localStorage.getItem(STORAGE_KEYS.MR_BOARD_SORT);
  if (saved && ['newest', 'oldest', 'last-activity', 'project-name'].includes(saved)) {
    return saved as MRSortOption;
  }
  return 'newest';
}

const MRBoardView = ({ projects, dashboardService, darkMode }: MRBoardViewProps) => {
  const [allMRs, setAllMRs] = useState<MRWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MRBoardFiltersType>(loadSavedFilters);
  const [sortBy, setSortBy] = useState<MRSortOption>(loadSavedSort);
  const [selectedMR, setSelectedMR] = useState<MRWithProject | null>(null);

  // Fetch MRs on mount
  const fetchMRs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mrs = await dashboardService.getAllOpenMergeRequests(projects);
      setAllMRs(mrs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch merge requests');
    } finally {
      setLoading(false);
    }
  }, [projects, dashboardService]);

  useEffect(() => {
    fetchMRs();
  }, [fetchMRs]);

  // Persist filters
  const handleFilterChange = useCallback((newFilters: MRBoardFiltersType) => {
    setFilters(newFilters);
    try {
      localStorage.setItem(STORAGE_KEYS.MR_BOARD_FILTERS, JSON.stringify(newFilters));
    } catch {
      // ignore
    }
  }, []);

  // Persist sort
  const handleSortChange = useCallback((newSort: MRSortOption) => {
    setSortBy(newSort);
    localStorage.setItem(STORAGE_KEYS.MR_BOARD_SORT, newSort);
  }, []);

  // Apply filters and sort
  const filteredMRs = useMemo(() => {
    const filtered = filterMRs(allMRs, filters);
    return sortMRs(filtered, sortBy);
  }, [allMRs, filters, sortBy]);

  // Group MRs by pipeline status
  const groupedMRs = useMemo(() => {
    return groupMRsByPipelineStatus(filteredMRs);
  }, [filteredMRs]);

  // Handle MR selection
  const handleMRSelect = useCallback((mr: MRWithProject) => {
    setSelectedMR(prev => (prev?.id === mr.id && prev?.projectId === mr.projectId) ? null : mr);
  }, []);

  if (loading) {
    return (
      <div className="mr-board">
        <div className="mr-board__loading">
          ⏳ Loading merge requests for {projects.length} projects...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mr-board">
        <div className="mr-board__error">
          <p>Failed to load merge requests: {error}</p>
          <button onClick={fetchMRs}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mr-board">
      <div className="mr-board__header">
        <h2>
          MR Pipeline Board
          <span className="mr-board__count">({allMRs.length} open MRs)</span>
        </h2>
      </div>

      <MRBoardFilters
        projects={projects}
        filters={filters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        totalCount={allMRs.length}
        filteredCount={filteredMRs.length}
      />

      {selectedMR && (
        <MRCardDetails
          mr={selectedMR}
          onClose={() => setSelectedMR(null)}
          darkMode={darkMode}
        />
      )}

      {allMRs.length === 0 ? (
        <div className="mr-board__empty">
          No open merge requests found across configured projects.
        </div>
      ) : (
        <div className="mr-board__columns">
          {COLUMN_ORDER.map(group => {
            const config = getColumnConfig(group);
            return (
              <MRBoardColumn
                key={group}
                title={config.title}
                icon={config.icon}
                colorClass={config.colorClass}
                count={groupedMRs[group].length}
                mergeRequests={groupedMRs[group]}
                onMRSelect={handleMRSelect}
                darkMode={darkMode}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MRBoardView;

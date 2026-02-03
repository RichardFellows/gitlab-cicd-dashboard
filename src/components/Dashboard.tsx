import { FC, useMemo, useState, useEffect } from 'react';
import SummarySection from './SummarySection';
import TableView from './TableView';
import CardView from './CardView';
import { DashboardMetrics, Project, ProjectStatusFilter, ViewType, AggregatedTrend } from '../types';
import { categorizeProject } from '../utils/formatting';
import GitLabApiService from '../services/GitLabApiService';
import '../styles/ComparisonView.css';

interface DashboardProps {
  metrics: DashboardMetrics;
  viewType: ViewType;
  onProjectSelect: (projectId: number) => void;
  statusFilter: ProjectStatusFilter;
  searchQuery: string;
  onStatusFilterChange: (filter: ProjectStatusFilter) => void;
  aggregateTrends?: AggregatedTrend[];
  trendsLoading?: boolean;
  darkMode?: boolean;
  gitLabService?: GitLabApiService;
  selectionMode?: boolean;
  selectedForComparison?: Set<number>;
  onToggleSelectionMode?: () => void;
  onToggleComparisonSelection?: (projectId: number) => void;
  onCompare?: () => void;
  onClearSelection?: () => void;
  keyboardSelectedIndex?: number;
  onChartCanvasReady?: (name: string, canvas: HTMLCanvasElement | null) => void;
}

const Dashboard: FC<DashboardProps> = ({
  metrics,
  viewType,
  onProjectSelect,
  statusFilter,
  searchQuery,
  onStatusFilterChange,
  aggregateTrends = [],
  trendsLoading = false,
  darkMode = false,
  gitLabService,
  selectionMode = false,
  selectedForComparison,
  onToggleSelectionMode,
  onToggleComparisonSelection,
  onCompare,
  onClearSelection,
  keyboardSelectedIndex = -1,
  onChartCanvasReady,
}) => {
  // Compact mode state (default: true/compact, persisted in localStorage)
  const [compactMode, setCompactMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('dashboard_card_compact_mode');
    const defaultValue = stored === null ? true : stored === 'true';
    // Persist default if not already in localStorage
    if (stored === null) {
      localStorage.setItem('dashboard_card_compact_mode', 'true');
    }
    return defaultValue;
  });

  // Persist compact mode changes
  useEffect(() => {
    localStorage.setItem('dashboard_card_compact_mode', compactMode.toString());
  }, [compactMode]);

  const toggleCompactMode = () => {
    setCompactMode(prev => !prev);
  };

  // Filter projects based on status and search query
  const filteredProjects = useMemo(() => {
    return metrics.projects.filter((project: Project) => {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!project.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        const category = categorizeProject(project);
        // Map 'no-pipeline' to 'inactive' for filter matching
        const mappedCategory = category === 'no-pipeline' ? 'inactive' : category;
        if (mappedCategory !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [metrics.projects, statusFilter, searchQuery]);

  return (
    <div className="dashboard">
      <SummarySection
        metrics={metrics}
        activeFilter={statusFilter}
        onFilterChange={onStatusFilterChange}
        aggregateTrends={aggregateTrends}
        trendsLoading={trendsLoading}
        darkMode={darkMode}
        onProjectSelect={onProjectSelect}
        onChartCanvasReady={onChartCanvasReady}
      />

      <section className="projects-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>
            Project Metrics
            {(statusFilter !== 'all' || searchQuery) && (
              <span className="filter-count">
                ({filteredProjects.length} of {metrics.projects.length})
              </span>
            )}
          </h2>
          {viewType === ViewType.CARDS && (
            <button
              className={`compact-mode-toggle${compactMode ? ' active' : ''}`}
              onClick={toggleCompactMode}
              title={compactMode ? 'Switch to expanded view' : 'Switch to compact view'}
            >
              {compactMode ? '📋 Compact' : '📄 Expanded'}
            </button>
          )}
          {onToggleSelectionMode && (
            <button
              className={`comparison-select-toggle${selectionMode ? ' active' : ''}`}
              onClick={onToggleSelectionMode}
              title={selectionMode ? 'Exit selection mode' : 'Select projects to compare'}
            >
              {selectionMode ? 'Cancel Compare' : '⇔ Compare'}
            </button>
          )}
          {selectionMode && selectedForComparison && selectedForComparison.size >= 4 && (
            <span className="comparison-max-warning">Max 4 selected</span>
          )}
        </div>

        {viewType === ViewType.TABLE ? (
          <TableView
            projects={filteredProjects}
            onProjectSelect={onProjectSelect}
            gitLabService={gitLabService}
            selectionMode={selectionMode}
            selectedIds={selectedForComparison}
            onToggleSelection={onToggleComparisonSelection}
            keyboardSelectedIndex={keyboardSelectedIndex}
          />
        ) : (
          <CardView
            projects={filteredProjects}
            onProjectSelect={onProjectSelect}
            selectionMode={selectionMode}
            selectedIds={selectedForComparison}
            onToggleSelection={onToggleComparisonSelection}
            keyboardSelectedIndex={keyboardSelectedIndex}
            compactMode={compactMode}
          />
        )}
      </section>

      {/* Floating comparison action bar */}
      {selectionMode && selectedForComparison && selectedForComparison.size > 0 && (
        <div className="comparison-action-bar" data-testid="comparison-action-bar">
          <span className="comparison-action-bar__count">
            {selectedForComparison.size} selected
          </span>
          <button
            className="comparison-action-bar__compare-btn"
            disabled={selectedForComparison.size < 2}
            onClick={onCompare}
          >
            Compare Now
          </button>
          <button
            className="comparison-action-bar__clear-btn"
            onClick={onClearSelection}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
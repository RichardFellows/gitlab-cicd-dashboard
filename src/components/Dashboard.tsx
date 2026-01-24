import { FC, useMemo } from 'react';
import SummarySection from './SummarySection';
import TableView from './TableView';
import CardView from './CardView';
import { DashboardMetrics, Project, ProjectStatusFilter, ViewType } from '../types';
import { categorizeProject } from '../utils/formatting';

interface DashboardProps {
  metrics: DashboardMetrics;
  viewType: ViewType;
  onProjectSelect: (projectId: number) => void;
  statusFilter: ProjectStatusFilter;
  searchQuery: string;
  onStatusFilterChange: (filter: ProjectStatusFilter) => void;
}

const Dashboard: FC<DashboardProps> = ({
  metrics,
  viewType,
  onProjectSelect,
  statusFilter,
  searchQuery,
  onStatusFilterChange
}) => {
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
      />

      <section className="projects-section">
        <h2>
          Project Metrics
          {(statusFilter !== 'all' || searchQuery) && (
            <span className="filter-count">
              ({filteredProjects.length} of {metrics.projects.length})
            </span>
          )}
        </h2>

        {viewType === ViewType.TABLE ? (
          <TableView
            projects={filteredProjects}
            onProjectSelect={onProjectSelect}
          />
        ) : (
          <CardView
            projects={filteredProjects}
            onProjectSelect={onProjectSelect}
          />
        )}
      </section>
    </div>
  );
};

export default Dashboard;
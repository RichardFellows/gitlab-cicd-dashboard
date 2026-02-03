import { useState } from 'react';
import { Project, MRBoardFilters as MRBoardFiltersType, MRSortOption, STORAGE_KEYS } from '../types';
import '../styles/MRBoard.css';

interface MRBoardFiltersProps {
  projects: Project[];
  filters: MRBoardFiltersType;
  onFilterChange: (filters: MRBoardFiltersType) => void;
  sortBy: MRSortOption;
  onSortChange: (sort: MRSortOption) => void;
  totalCount: number;
  filteredCount: number;
}

const MRBoardFilters = ({
  projects,
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
  totalCount,
  filteredCount,
}: MRBoardFiltersProps) => {
  const [showUsernameInput, setShowUsernameInput] = useState(false);

  const handleProjectFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions).map(opt => Number(opt.value));
    onFilterChange({ ...filters, projectIds: selected });
  };

  const handleAuthorSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, authorSearch: e.target.value });
  };

  const handleMyMRsToggle = () => {
    if (!filters.myUsername && !filters.myMRsOnly) {
      // Need to set username first
      setShowUsernameInput(true);
      return;
    }
    onFilterChange({ ...filters, myMRsOnly: !filters.myMRsOnly });
  };

  const handleUsernameSet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = (formData.get('username') as string)?.trim();
    if (username) {
      localStorage.setItem(STORAGE_KEYS.MY_USERNAME, username);
      onFilterChange({ ...filters, myUsername: username, myMRsOnly: true });
      setShowUsernameInput(false);
    }
  };

  return (
    <div className="mr-board-filters">
      <div className="mr-board-filters__group">
        <span className="mr-board-filters__label">Project</span>
        <select
          className="mr-board-filters__select"
          multiple
          size={1}
          value={filters.projectIds.map(String)}
          onChange={handleProjectFilter}
          title="Filter by project (hold Ctrl for multi-select)"
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="mr-board-filters__group">
        <span className="mr-board-filters__label">Author</span>
        <input
          className="mr-board-filters__input"
          type="text"
          placeholder="Search author..."
          value={filters.authorSearch}
          onChange={handleAuthorSearch}
        />
      </div>

      <div className="mr-board-filters__group">
        <span className="mr-board-filters__label">My MRs</span>
        {showUsernameInput ? (
          <form onSubmit={handleUsernameSet} style={{ display: 'flex', gap: '0.25rem' }}>
            <input
              className="mr-board-filters__input"
              type="text"
              name="username"
              placeholder="GitLab username"
              autoFocus
              style={{ minWidth: '120px' }}
            />
            <button type="submit" style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}>Set</button>
          </form>
        ) : (
          <label className="mr-board-filters__toggle">
            <input
              type="checkbox"
              checked={filters.myMRsOnly}
              onChange={handleMyMRsToggle}
            />
            {filters.myUsername
              ? `My MRs (${filters.myUsername})`
              : 'My MRs Only'}
          </label>
        )}
      </div>

      <div className="mr-board-filters__group">
        <span className="mr-board-filters__label">Sort</span>
        <select
          className="mr-board-filters__select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as MRSortOption)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="last-activity">Last Activity</option>
          <option value="project-name">Project Name</option>
        </select>
      </div>

      <span className="mr-board-filters__count">
        Showing {filteredCount} of {totalCount} MRs
      </span>
    </div>
  );
};

export default MRBoardFilters;

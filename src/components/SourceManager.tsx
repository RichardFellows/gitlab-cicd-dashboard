import { FC, useState, useCallback } from 'react';
import SourceChip from './SourceChip';
import { GroupSource, ProjectSource } from '../types';
import '../styles/SourceManager.css';

interface SourceManagerProps {
  groups: GroupSource[];
  projects: ProjectSource[];
  onAddGroup: (id: string) => void;
  onRemoveGroup: (id: string) => void;
  onAddProject: (id: string) => void;
  onRemoveProject: (id: string) => void;
  loadingGroups: Set<string>;
  loadingProjects: Set<string>;
  disabled?: boolean;
}

const SourceManager: FC<SourceManagerProps> = ({
  groups,
  projects,
  onAddGroup,
  onRemoveGroup,
  onAddProject,
  onRemoveProject,
  loadingGroups,
  loadingProjects,
  disabled
}) => {
  const [groupInput, setGroupInput] = useState('');
  const [projectInput, setProjectInput] = useState('');

  const handleAddGroup = useCallback(() => {
    const id = groupInput.trim();
    if (id && !groups.some(g => g.id === id)) {
      onAddGroup(id);
      setGroupInput('');
    }
  }, [groupInput, groups, onAddGroup]);

  const handleAddProject = useCallback(() => {
    const id = projectInput.trim();
    if (id && !projects.some(p => p.id === id)) {
      onAddProject(id);
      setProjectInput('');
    }
  }, [projectInput, projects, onAddProject]);

  const handleGroupKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddGroup();
    }
  };

  const handleProjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddProject();
    }
  };

  return (
    <div className="source-manager">
      <div className="source-section">
        <label className="source-label">Groups</label>
        <div className="source-input-row">
          <input
            type="text"
            className="source-input"
            placeholder="Enter group ID"
            value={groupInput}
            onChange={(e) => setGroupInput(e.target.value)}
            onKeyDown={handleGroupKeyDown}
            disabled={disabled}
          />
          <button
            type="button"
            className="source-add-btn"
            onClick={handleAddGroup}
            disabled={disabled || !groupInput.trim()}
          >
            + Add
          </button>
        </div>
        <div className="source-chips">
          {groups.length === 0 ? (
            <span className="source-empty">No groups added</span>
          ) : (
            groups.map((group) => (
              <SourceChip
                key={group.id}
                id={group.id}
                name={group.name}
                type="group"
                loading={loadingGroups.has(group.id)}
                error={group.name === undefined && !loadingGroups.has(group.id)}
                onRemove={onRemoveGroup}
                disabled={disabled}
              />
            ))
          )}
        </div>
      </div>

      <div className="source-section">
        <label className="source-label">Individual Projects</label>
        <div className="source-input-row">
          <input
            type="text"
            className="source-input"
            placeholder="Enter project ID"
            value={projectInput}
            onChange={(e) => setProjectInput(e.target.value)}
            onKeyDown={handleProjectKeyDown}
            disabled={disabled}
          />
          <button
            type="button"
            className="source-add-btn"
            onClick={handleAddProject}
            disabled={disabled || !projectInput.trim()}
          >
            + Add
          </button>
        </div>
        <div className="source-chips">
          {projects.length === 0 ? (
            <span className="source-empty">No projects added</span>
          ) : (
            projects.map((project) => (
              <SourceChip
                key={project.id}
                id={project.id}
                name={project.name}
                path={project.path}
                type="project"
                loading={loadingProjects.has(project.id)}
                error={project.name === undefined && !loadingProjects.has(project.id)}
                onRemove={onRemoveProject}
                disabled={disabled}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SourceManager;

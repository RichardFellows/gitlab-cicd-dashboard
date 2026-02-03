import { FC } from 'react';
import { Project } from '../types';

interface ComparisonHeaderProps {
  projects: Project[];
  colours: string[];
  onBack: () => void;
  onRemoveProject: (projectId: number) => void;
}

const ComparisonHeader: FC<ComparisonHeaderProps> = ({
  projects,
  colours,
  onBack,
  onRemoveProject,
}) => {
  return (
    <div className="comparison-header" data-testid="comparison-header">
      <button
        className="comparison-header__back"
        onClick={onBack}
        title="Back to Dashboard"
      >
        ← Back to Dashboard
      </button>

      <h2 className="comparison-header__title">Project Comparison</h2>

      <div className="comparison-header__projects">
        {projects.map((project, i) => (
          <div key={project.id} className="comparison-header__project-tag">
            <span
              className="comparison-header__swatch"
              style={{ backgroundColor: colours[i] }}
            />
            <span className="comparison-header__project-name">{project.name}</span>
            {projects.length > 2 && (
              <button
                className="comparison-header__remove"
                onClick={() => onRemoveProject(project.id)}
                title={`Remove ${project.name} from comparison`}
                aria-label={`Remove ${project.name}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComparisonHeader;

import { FC } from 'react';

interface SourceChipProps {
  id: string;
  name?: string;
  type: 'group' | 'project';
  path?: string;
  loading?: boolean;
  error?: boolean;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const SourceChip: FC<SourceChipProps> = ({
  id,
  name,
  type,
  path,
  loading,
  error,
  onRemove,
  disabled
}) => {
  const displayName = name || id;
  const hasName = !!name;

  return (
    <div className={`source-chip ${type} ${error ? 'error' : ''} ${loading ? 'loading' : ''}`}>
      <span className="chip-content">
        {loading ? (
          <span className="chip-loading">Loading...</span>
        ) : error ? (
          <span className="chip-error" title="Not found">
            {id} (not found)
          </span>
        ) : (
          <>
            <span className="chip-name" title={path || displayName}>
              {displayName}
            </span>
            {hasName && (
              <span className="chip-id">({id})</span>
            )}
          </>
        )}
      </span>
      <button
        className="chip-remove"
        onClick={() => onRemove(id)}
        disabled={disabled}
        title={`Remove ${type}`}
        aria-label={`Remove ${displayName}`}
      >
        &times;
      </button>
    </div>
  );
};

export default SourceChip;

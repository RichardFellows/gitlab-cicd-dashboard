import { FC, useState, useEffect, useRef } from 'react';
import '../styles/ConfigManager.css';

interface SaveConfigDialogProps {
  existingNames: string[];
  defaultName?: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

const SaveConfigDialog: FC<SaveConfigDialogProps> = ({
  existingNames,
  defaultName = '',
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a configuration name.');
      return;
    }

    if (existingNames.includes(trimmed)) {
      const confirmed = window.confirm(
        `A configuration named "${trimmed}" already exists. Overwrite it?`
      );
      if (!confirmed) return;
    }

    onSave(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="config-modal-overlay" onClick={onCancel}>
      <div className="config-modal config-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="config-modal-header">
          <h3>Save Configuration</h3>
          <button className="config-modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="config-modal-body">
          <div className="config-form-group">
            <label htmlFor="config-name-input">Configuration Name</label>
            <input
              ref={inputRef}
              id="config-name-input"
              type="text"
              className="config-name-input"
              placeholder="e.g., My Team, Prod Monitoring"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              maxLength={50}
            />
            {error && <span className="config-form-error">{error}</span>}
          </div>
        </div>
        <div className="config-modal-footer">
          <button className="config-btn config-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="config-btn config-btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveConfigDialog;

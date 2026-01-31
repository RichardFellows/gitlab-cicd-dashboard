import { FC, useState, useRef } from 'react';
import { SavedConfigEntry } from '../types';
import '../styles/ConfigManager.css';

interface ConfigManagerProps {
  savedConfigs: SavedConfigEntry[];
  activeConfigId: string | null;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string, includeToken: boolean) => void;
  onImport: (file: File) => void;
  onClose: () => void;
}

const ConfigManager: FC<ConfigManagerProps> = ({
  savedConfigs,
  activeConfigId,
  onRename,
  onDelete,
  onExport,
  onImport,
  onClose,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartRename = (entry: SavedConfigEntry) => {
    setRenamingId(entry.id);
    setRenameValue(entry.name);
  };

  const handleConfirmRename = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      onRename(id, trimmed);
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleConfirmRename(id);
    } else if (e.key === 'Escape') {
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const handleDelete = (entry: SavedConfigEntry) => {
    const confirmed = window.confirm(
      `Delete configuration "${entry.name}"? This cannot be undone.`
    );
    if (confirmed) {
      onDelete(entry.id);
    }
  };

  const handleExport = (entry: SavedConfigEntry) => {
    // Default to no token for security
    const includeToken = window.confirm(
      'Include GitLab token in export?\n\n' +
      '⚠️ Only include the token if you trust the recipient.\n\n' +
      'Click OK to include token, Cancel to exclude it.'
    );
    onExport(entry.id, includeToken);
  };

  const handleImportClick = () => {
    setImportError('');
    setImportSuccess('');
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportSuccess('');

    if (!file.name.endsWith('.json')) {
      setImportError('Please select a JSON file.');
      return;
    }

    onImport(file);
    setImportSuccess(`Imported "${file.name}" successfully.`);

    // Reset file input so the same file can be imported again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="config-modal-overlay" onClick={onClose}>
      <div className="config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="config-modal-header">
          <h3>Manage Configurations</h3>
          <button className="config-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="config-modal-body">
          {savedConfigs.length === 0 ? (
            <div className="config-list-empty">
              No saved configurations yet. Save your current setup to get started.
            </div>
          ) : (
            <ul className="config-list">
              {savedConfigs.map((entry) => (
                <li key={entry.id} className="config-list-item">
                  <div className="config-list-info">
                    {renamingId === entry.id ? (
                      <input
                        type="text"
                        className="config-rename-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => handleRenameKeyDown(e, entry.id)}
                        onBlur={() => handleConfirmRename(entry.id)}
                        autoFocus
                        maxLength={50}
                      />
                    ) : (
                      <div className="config-list-name">
                        {entry.name}
                        {entry.id === activeConfigId && (
                          <span className="config-active-badge">Active</span>
                        )}
                      </div>
                    )}
                    <div className="config-list-meta">
                      Created {formatDate(entry.createdAt)}
                      {' · '}
                      {entry.config.groups.length} group{entry.config.groups.length !== 1 ? 's' : ''}
                      {', '}
                      {entry.config.projects.length} project{entry.config.projects.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="config-list-actions">
                    {renamingId !== entry.id && (
                      <button
                        className="config-btn config-btn-sm config-btn-secondary"
                        onClick={() => handleStartRename(entry)}
                        title="Rename"
                      >
                        Rename
                      </button>
                    )}
                    <button
                      className="config-btn config-btn-sm config-btn-secondary"
                      onClick={() => handleExport(entry)}
                      title="Export"
                    >
                      Export
                    </button>
                    <button
                      className="config-btn config-btn-sm config-btn-danger"
                      onClick={() => handleDelete(entry)}
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="config-import-section">
            <h4>Import Configuration</h4>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="config-import-input"
              onChange={handleFileChange}
            />
            <button
              className="config-btn config-btn-secondary"
              onClick={handleImportClick}
            >
              📂 Choose File to Import
            </button>
            {importError && <div className="config-import-error">{importError}</div>}
            {importSuccess && <div className="config-import-success">{importSuccess}</div>}
          </div>
        </div>
        <div className="config-modal-footer">
          <button className="config-btn config-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigManager;

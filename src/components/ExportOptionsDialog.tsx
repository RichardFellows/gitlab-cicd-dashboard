import { FC, useState, useEffect } from 'react';
import { PdfExportOptions, STORAGE_KEYS } from '../types';
import '../styles/ExportOptionsDialog.css';

interface ExportOptionsDialogProps {
  onExport: (options: PdfExportOptions) => void;
  onCancel: () => void;
  hasEnvironmentData: boolean;
  loading?: boolean;
  darkMode?: boolean;
}

const DEFAULT_OPTIONS: PdfExportOptions = {
  includeSummary: true,
  includeProjectTable: true,
  includeTrendCharts: true,
  includeEnvironmentMatrix: false,
  includeDetailedBreakdown: false,
};

function loadSavedOptions(): PdfExportOptions {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPORT_OPTIONS);
    if (saved) {
      return { ...DEFAULT_OPTIONS, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_OPTIONS };
}

function saveOptions(options: PdfExportOptions): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPORT_OPTIONS, JSON.stringify(options));
  } catch {
    // Ignore write errors
  }
}

const ExportOptionsDialog: FC<ExportOptionsDialogProps> = ({
  onExport,
  onCancel,
  hasEnvironmentData,
  loading = false,
  darkMode = false,
}) => {
  const [options, setOptions] = useState<PdfExportOptions>(loadSavedOptions);

  // Save options to localStorage when they change
  useEffect(() => {
    saveOptions(options);
  }, [options]);

  const toggleOption = (key: keyof PdfExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    onExport(options);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, loading]);

  return (
    <div className="export-dialog__overlay" onClick={loading ? undefined : onCancel}>
      <div
        className={`export-dialog ${darkMode ? 'export-dialog--dark' : ''}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="PDF Export Options"
      >
        <h3 className="export-dialog__title">PDF Report Options</h3>
        <p className="export-dialog__subtitle">Choose which sections to include in your report:</p>

        <div className="export-dialog__options">
          <label className="export-dialog__checkbox">
            <input
              type="checkbox"
              checked={options.includeSummary}
              onChange={() => toggleOption('includeSummary')}
              disabled={loading}
            />
            <span className="export-dialog__label">
              <strong>Summary</strong>
              <small>Key metrics overview — projects, pipelines, success rate</small>
            </span>
          </label>

          <label className="export-dialog__checkbox">
            <input
              type="checkbox"
              checked={options.includeProjectTable}
              onChange={() => toggleOption('includeProjectTable')}
              disabled={loading}
            />
            <span className="export-dialog__label">
              <strong>Project Table</strong>
              <small>All projects with pipeline metrics, coverage, and status</small>
            </span>
          </label>

          <label className="export-dialog__checkbox">
            <input
              type="checkbox"
              checked={options.includeTrendCharts}
              onChange={() => toggleOption('includeTrendCharts')}
              disabled={loading}
            />
            <span className="export-dialog__label">
              <strong>Trend Charts</strong>
              <small>Failure rate, duration, and coverage trend graphs</small>
            </span>
          </label>

          <label className="export-dialog__checkbox">
            <input
              type="checkbox"
              checked={options.includeEnvironmentMatrix}
              onChange={() => toggleOption('includeEnvironmentMatrix')}
              disabled={!hasEnvironmentData || loading}
            />
            <span className="export-dialog__label">
              <strong>Environment Matrix</strong>
              <small>
                {hasEnvironmentData
                  ? 'Deployment versions and status per environment'
                  : 'No deployment data available'}
              </small>
            </span>
          </label>

          <label className="export-dialog__checkbox">
            <input
              type="checkbox"
              checked={options.includeDetailedBreakdown}
              onChange={() => toggleOption('includeDetailedBreakdown')}
              disabled={loading}
            />
            <span className="export-dialog__label">
              <strong>Detailed Breakdown</strong>
              <small>Extended per-project analysis with pipeline details</small>
            </span>
          </label>
        </div>

        <div className="export-dialog__actions">
          <button
            className="export-dialog__btn export-dialog__btn--cancel"
            onClick={onCancel}
            disabled={loading}
            type="button"
          >
            Cancel
          </button>
          <button
            className="export-dialog__btn export-dialog__btn--export"
            onClick={handleExport}
            disabled={loading}
            type="button"
          >
            {loading ? (
              <>
                <span className="export-dialog__spinner" />
                Generating…
              </>
            ) : (
              'Generate PDF'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportOptionsDialog;

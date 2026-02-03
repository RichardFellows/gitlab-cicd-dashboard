import { FC, useState, useRef, useEffect, useCallback } from 'react';
import { DashboardMetrics, Project, DeploymentsByEnv, DashboardConfig, ChartRefMap, PdfExportOptions } from '../types';
import { generateProjectsCsv, generateEnvironmentCsv, downloadCsv } from '../utils/exportCsv';
import { generateDashboardPdf } from '../utils/exportPdf';
import { captureChartImages } from '../utils/captureChartImages';
import ExportOptionsDialog from './ExportOptionsDialog';
import '../styles/ExportButton.css';

interface ExportButtonProps {
  metrics: DashboardMetrics | null;
  projects: Project[];
  deploymentCache: Map<number, DeploymentsByEnv>;
  config: DashboardConfig;
  chartRefs: ChartRefMap;
  darkMode?: boolean;
  disabled?: boolean;
}

const ExportButton: FC<ExportButtonProps> = ({
  metrics,
  projects,
  deploymentCache,
  config,
  chartRefs,
  darkMode = false,
  disabled = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDisabled = disabled || !metrics;
  const hasEnvData = deploymentCache.size > 0;

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const formatDate = () => new Date().toISOString().split('T')[0];

  const handleCsvProjects = useCallback(() => {
    if (!metrics) return;
    const csv = generateProjectsCsv(projects);
    downloadCsv(csv, `gitlab-dashboard-${formatDate()}.csv`);
    setDropdownOpen(false);
  }, [metrics, projects]);

  const handleCsvEnvironments = useCallback(() => {
    if (!metrics) return;
    const csv = generateEnvironmentCsv(deploymentCache, projects);
    downloadCsv(csv, `gitlab-deployments-${formatDate()}.csv`);
    setDropdownOpen(false);
  }, [metrics, deploymentCache, projects]);

  const handlePdfClick = useCallback(() => {
    setDropdownOpen(false);
    setShowPdfDialog(true);
  }, []);

  const handlePdfExport = useCallback(async (options: PdfExportOptions) => {
    if (!metrics) return;
    setPdfLoading(true);
    try {
      const chartImages = captureChartImages(chartRefs);
      await generateDashboardPdf(metrics, options, config, chartImages, deploymentCache);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setPdfLoading(false);
      setShowPdfDialog(false);
    }
  }, [metrics, config, chartRefs, deploymentCache]);

  const handleDialogCancel = useCallback(() => {
    setShowPdfDialog(false);
  }, []);

  return (
    <div className={`export-button ${darkMode ? 'export-button--dark' : ''}`} ref={containerRef}>
      <button
        className="export-button__trigger"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        disabled={isDisabled}
        title={isDisabled ? 'Load dashboard data first' : 'Export dashboard data'}
        type="button"
      >
        📥 Export ▾
      </button>

      {dropdownOpen && (
        <div className="export-button__dropdown">
          <button
            className="export-button__option"
            onClick={handleCsvProjects}
            type="button"
          >
            📊 CSV — Project Metrics
          </button>
          <button
            className="export-button__option"
            onClick={handleCsvEnvironments}
            disabled={!hasEnvData}
            title={!hasEnvData ? 'No deployment data available' : undefined}
            type="button"
          >
            📊 CSV — Deployments
          </button>
          <div className="export-button__divider" />
          <button
            className="export-button__option"
            onClick={handlePdfClick}
            type="button"
          >
            📄 PDF Report…
          </button>
        </div>
      )}

      {showPdfDialog && (
        <ExportOptionsDialog
          onExport={handlePdfExport}
          onCancel={handleDialogCancel}
          hasEnvironmentData={hasEnvData}
          loading={pdfLoading}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default ExportButton;

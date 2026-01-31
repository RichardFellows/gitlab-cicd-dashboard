import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportOptionsDialog from './ExportOptionsDialog';

describe('ExportOptionsDialog', () => {
  const onExport = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders all checkboxes with correct defaults', () => {
    render(
      <ExportOptionsDialog
        onExport={onExport}
        onCancel={onCancel}
        hasEnvironmentData={true}
      />
    );

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Project Table')).toBeInTheDocument();
    expect(screen.getByText('Trend Charts')).toBeInTheDocument();
    expect(screen.getByText('Environment Matrix')).toBeInTheDocument();
    expect(screen.getByText('Detailed Breakdown')).toBeInTheDocument();

    // Check defaults
    const checkboxes = screen.getAllByRole('checkbox');
    // Summary, ProjectTable, TrendCharts should be checked
    expect(checkboxes[0]).toBeChecked(); // Summary
    expect(checkboxes[1]).toBeChecked(); // Project Table
    expect(checkboxes[2]).toBeChecked(); // Trend Charts
    expect(checkboxes[3]).not.toBeChecked(); // Env Matrix
    expect(checkboxes[4]).not.toBeChecked(); // Detailed
  });

  it('toggles checkbox on click', () => {
    render(
      <ExportOptionsDialog
        onExport={onExport}
        onCancel={onCancel}
        hasEnvironmentData={true}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // uncheck Summary
    expect(checkboxes[0]).not.toBeChecked();

    fireEvent.click(checkboxes[3]); // check Env Matrix
    expect(checkboxes[3]).toBeChecked();
  });

  it('passes options to onExport when Generate PDF clicked', () => {
    render(
      <ExportOptionsDialog
        onExport={onExport}
        onCancel={onCancel}
        hasEnvironmentData={true}
      />
    );

    fireEvent.click(screen.getByText('Generate PDF'));
    expect(onExport).toHaveBeenCalledWith({
      includeSummary: true,
      includeProjectTable: true,
      includeTrendCharts: true,
      includeEnvironmentMatrix: false,
      includeDetailedBreakdown: false,
    });
  });

  it('calls onCancel when Cancel clicked', () => {
    render(
      <ExportOptionsDialog
        onExport={onExport}
        onCancel={onCancel}
        hasEnvironmentData={true}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables env matrix checkbox when no environment data', () => {
    render(
      <ExportOptionsDialog
        onExport={onExport}
        onCancel={onCancel}
        hasEnvironmentData={false}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[3]).toBeDisabled();
  });

  it('shows loading state when loading prop is true', () => {
    render(
      <ExportOptionsDialog
        onExport={onExport}
        onCancel={onCancel}
        hasEnvironmentData={true}
        loading={true}
      />
    );

    expect(screen.getByText(/Generating/)).toBeInTheDocument();
    const generateBtn = screen.getByText(/Generating/);
    expect(generateBtn.closest('button')).toBeDisabled();
  });

  it('closes on Escape key', () => {
    render(
      <ExportOptionsDialog
        onExport={onExport}
        onCancel={onCancel}
        hasEnvironmentData={true}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('saves options to localStorage', () => {
    render(
      <ExportOptionsDialog
        onExport={onExport}
        onCancel={onCancel}
        hasEnvironmentData={true}
      />
    );

    // Toggle a checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // uncheck Summary

    const saved = localStorage.getItem('gitlab_cicd_dashboard_export_options');
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.includeSummary).toBe(false);
  });
});

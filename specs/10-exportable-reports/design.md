# Design: Exportable Reports (CSV/PDF)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ExportButton (header area)                                    │   │
│  │  → ExportOptionsDialog (modal)                                │   │
│  │     → CSV export or PDF export                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│              │                                                      │
│              ▼                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ src/utils/exportCsv.ts                                        │   │
│  │  - generateProjectsCsv(projects, config)                      │   │
│  │  - generateEnvironmentCsv(deployments, projects)              │   │
│  │  - downloadCsv(content, filename)                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ src/utils/exportPdf.ts                                        │   │
│  │  - generateDashboardPdf(metrics, options)                     │   │
│  │  - addSummaryPage(doc, metrics)                               │   │
│  │  - addProjectTable(doc, projects)                             │   │
│  │  - addChartImages(doc, chartRefs)                             │   │
│  │  - addEnvironmentMatrix(doc, deployments)                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### CSV Export
1. **User clicks "Export CSV"** → `generateProjectsCsv()` called with filtered projects
2. **CSV built** → Iterate projects, extract metrics, format as comma-separated rows
3. **Download triggered** → Create `Blob`, generate URL, trigger download

### PDF Export
1. **User clicks "Export PDF"** → `ExportOptionsDialog` opens
2. **User selects options** → Include summary, table, charts, environment matrix
3. **User clicks "Generate"** → `generateDashboardPdf()` called
4. **PDF built** → 
   - jsPDF document created
   - Summary metrics added as text
   - Project table added using `jspdf-autotable` plugin
   - Charts rendered via `chart.toBase64Image()` and added as images
   - Environment matrix rendered as table
5. **Download triggered** → `doc.save(filename)`

## Component Structure

### New Components

#### `src/components/ExportButton.tsx`

Export button with dropdown for export type.

```typescript
interface ExportButtonProps {
  metrics: DashboardMetrics | null;
  projects: Project[];
  deploymentCache: Map<number, DeploymentsByEnv>;
  aggregateTrends: AggregatedTrend[];
  config: DashboardConfig;
  chartRefs: ChartRefMap;              // Refs to Chart.js instances for image export
  darkMode?: boolean;
  disabled?: boolean;
}
```

**Displays:**
- Button: "Export ▾" with dropdown on click
- Dropdown options:
  - "📊 Export CSV (Project Metrics)" → direct CSV download
  - "📊 Export CSV (Deployments)" → direct CSV download (if env data available)
  - "📄 Export PDF Report" → opens ExportOptionsDialog
- Disabled when no data loaded

#### `src/components/ExportOptionsDialog.tsx`

Modal for configuring PDF export options.

```typescript
interface ExportOptionsDialogProps {
  onExport: (options: PdfExportOptions) => void;
  onCancel: () => void;
  hasEnvironmentData: boolean;
  darkMode?: boolean;
}

interface PdfExportOptions {
  includeSummary: boolean;
  includeProjectTable: boolean;
  includeTrendCharts: boolean;
  includeEnvironmentMatrix: boolean;
  includeDetailedBreakdown: boolean;
}
```

**Displays:**
- Checkboxes for each section (with defaults)
- Preview of what will be included
- "Generate PDF" and "Cancel" buttons
- Loading indicator during PDF generation

### Modified Components

#### `src/App.tsx`
- Add `ExportButton` in the header area (near view type selector)
- Maintain refs to Chart.js instances for image export
- Pass all required data to ExportButton

#### `src/components/SummarySection.tsx` / `src/components/MetricsPanel.tsx`
- Expose Chart.js instance refs via `forwardRef` or callback refs
- Needed for `chart.toBase64Image()` in PDF export

## Type Definitions

### New types

```typescript
// Chart reference map for PDF export
export type ChartRefMap = {
  successRate?: Chart;
  duration?: Chart;
  coverage?: Chart;
  distribution?: Chart;
};
```

### New `STORAGE_KEYS` entry

```typescript
EXPORT_OPTIONS: 'gitlab_cicd_dashboard_export_options'
```

## New Utility: `src/utils/exportCsv.ts`

```typescript
/**
 * Generate CSV content for project metrics
 */
export function generateProjectsCsv(
  projects: Project[],
  config: DashboardConfig
): string {
  const headers = [
    'Project Name',
    'Project Path',
    'Pipeline Count',
    'Success Rate (%)',
    'Failed Pipelines',
    'Avg Duration (s)',
    'Coverage (%)',
    'Open MRs',
    'Draft MRs',
    'Main Branch Status',
  ];

  const rows = projects.map(project => [
    escapeCsv(project.name),
    escapeCsv(project.path_with_namespace || ''),
    project.metrics.totalPipelines,
    project.metrics.successRate.toFixed(2),
    project.metrics.failedPipelines,
    project.metrics.avgDuration.toFixed(0),
    project.metrics.codeCoverage.coverage?.toFixed(2) ?? 'N/A',
    project.metrics.mergeRequestCounts.totalOpen,
    project.metrics.mergeRequestCounts.drafts,
    project.metrics.mainBranchPipeline.status,
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Generate CSV content for environment deployments
 */
export function generateEnvironmentCsv(
  deploymentCache: Map<number, DeploymentsByEnv>,
  projects: Project[]
): string {
  const headers = [
    'Project Name',
    'Dev Version', 'Dev Status',
    'SIT Version', 'SIT Status',
    'UAT Version', 'UAT Status',
    'Prod Version', 'Prod Status',
  ];

  const rows = projects.map(project => {
    const deployments = deploymentCache.get(project.id);
    return [
      escapeCsv(project.name),
      ...['dev', 'sit', 'uat', 'prod'].flatMap(env => {
        const dep = deployments?.deployments[env as EnvironmentName];
        return [dep?.version || '-', dep?.status || '-'];
      }),
    ];
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Escape a CSV field value
 */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Trigger browser download of CSV content
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

## New Utility: `src/utils/exportPdf.ts`

```typescript
// Lazy-loaded to avoid bundle size impact
let jsPDF: typeof import('jspdf').jsPDF;
let autoTable: typeof import('jspdf-autotable').default;

async function loadPdfLibs() {
  const [jspdfModule, autotableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  jsPDF = jspdfModule.jsPDF;
  autoTable = autotableModule.default;
}

/**
 * Generate a complete dashboard PDF report
 */
export async function generateDashboardPdf(
  metrics: DashboardMetrics,
  options: PdfExportOptions,
  config: DashboardConfig,
  chartImages: ChartImageMap,
  deploymentCache?: Map<number, DeploymentsByEnv>
): Promise<void> {
  await loadPdfLibs();

  const doc = new jsPDF('p', 'mm', 'a4');

  // Header
  addHeader(doc, config);

  // Summary section
  if (options.includeSummary) {
    addSummarySection(doc, metrics);
  }

  // Project table
  if (options.includeProjectTable) {
    addProjectTable(doc, metrics.projects);
  }

  // Trend charts
  if (options.includeTrendCharts && Object.keys(chartImages).length > 0) {
    addChartImages(doc, chartImages);
  }

  // Environment matrix
  if (options.includeEnvironmentMatrix && deploymentCache) {
    addEnvironmentMatrix(doc, deploymentCache, metrics.projects);
  }

  // Footer with generation info
  addFooter(doc);

  doc.save(`gitlab-dashboard-report-${formatDate(new Date())}.pdf`);
}
```

### PDF Sections

#### Header
- Title: "GitLab CI/CD Dashboard Report"
- Subtitle: GitLab URL, timeframe, generation date/time
- Horizontal rule

#### Summary Section
- Total Projects, Success Rate, Avg Duration, Pipeline Counts
- Formatted as a clean summary box

#### Project Table
- Uses `jspdf-autotable` for professional table rendering
- Columns: Project Name, Pipelines, Success Rate, Duration, Coverage, MRs, Status
- Colour-coded status column
- Auto page break for long tables

#### Chart Images
- Each chart rendered as base64 image via `chart.toBase64Image()`
- Sized to fit page width with appropriate margins
- One chart per half-page (2 charts per page)

#### Environment Matrix
- Table with project rows and environment columns
- Version numbers in cells
- Status indicated by text (success/failed)

#### Footer
- "Generated by GitLab CI/CD Dashboard"
- Timestamp
- Page numbers

## API Integration Points

No API calls. Export uses data already loaded in the dashboard:
- `DashboardMetrics.projects` — project metrics
- `DeploymentsByEnv` — deployment data (from cache)
- `AggregatedTrend[]` — trend data for charts
- `Chart.toBase64Image()` — chart images from Chart.js instances

## UI/UX Design Notes

### Export Button Placement
- In the dashboard header, right side, near view type selector
- Dropdown appears below button
- Disabled state when no data loaded (greyed out with tooltip)

### Export Options Dialog
- Clean modal with checkboxes
- Each option has a small description of what it includes
- "Generate PDF" button shows loading spinner during generation
- Estimated file size shown (rough estimate based on content)

### Download UX
- CSV: immediate download, no dialog needed
- PDF: options dialog → loading indicator → download
- Success toast: "Report downloaded" after each export
- Error handling: "Failed to generate report" with retry

### File Naming
- CSV: `gitlab-dashboard-2026-01-30.csv`
- CSV (environment): `gitlab-deployments-2026-01-30.csv`
- PDF: `gitlab-dashboard-report-2026-01-30.pdf`

## Dark Mode Considerations

- Export button and dropdown styled for dark mode
- Options dialog uses dark modal theme
- **PDF is always light mode** — regardless of current UI theme (for printing)
- Charts exported from dark mode should use light colours for PDF
  - Consider temporarily switching chart colours before `toBase64Image()` and switching back
  - Or maintain a separate "print" colour scheme

## Error Handling

- `jspdf` or `html2canvas` import failure: show error "PDF generation library failed to load. Try again."
- Chart image capture failure: skip chart section, note "Charts unavailable" in PDF
- Empty data: disable export, show "Load dashboard data first"
- Large dataset (100+ projects): PDF may take a few seconds — show progress indicator
- CSV encoding: ensure UTF-8 BOM for Excel compatibility with special characters
- Browser pop-up blocker: if download is blocked, show instructions to allow downloads

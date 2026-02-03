# Tasks: Exportable Reports (CSV/PDF)

## Task Breakdown

Tasks ordered POC-first: prove CSV generation works, then tackle PDF.

---

### Setup

- [ ] **T0.1** Add `EXPORT_OPTIONS` to `STORAGE_KEYS` in `src/types/index.ts` — **S**
  - Value: `'gitlab_cicd_dashboard_export_options'`
  - **Test:** Build passes

- [ ] **T0.2** Add `PdfExportOptions` type to `src/types/index.ts` — **S**
  - Fields: `includeSummary`, `includeProjectTable`, `includeTrendCharts`, `includeEnvironmentMatrix`, `includeDetailedBreakdown` (all boolean)
  - **Test:** Build passes

- [ ] **T0.3** Add PDF libraries as dependencies — **S**
  - `npm install jspdf jspdf-autotable`
  - `npm install --save-dev @types/jspdf`
  - Note: these will be lazy-loaded to avoid bundle size impact
  - **Test:** `npm run build` passes, no import errors

---

### Core Implementation

- [ ] **T1.1** Create `src/utils/exportCsv.ts` — **M**
  - `generateProjectsCsv(projects: Project[], config: DashboardConfig): string`
    - Headers: Project Name, Path, Pipelines, Success Rate, Failed, Avg Duration, Coverage, Open MRs, Drafts, Main Branch Status
    - One row per project with formatted values
    - UTF-8 BOM prefix for Excel compatibility (`\uFEFF`)
  - `generateEnvironmentCsv(deploymentCache, projects): string`
    - Headers: Project Name, then Version+Status columns per environment (dev/sit/uat/prod)
  - `escapeCsv(value): string` — handle commas, quotes, newlines
  - `downloadCsv(content, filename): void` — Blob + URL.createObjectURL + link.click()
  - **Test:** Unit tests for CSV content (correct headers, escaped values, empty data)

- [ ] **T1.2** Create `src/utils/exportPdf.ts` — **XL**
  - Lazy-load `jspdf` and `jspdf-autotable` via dynamic `import()`
  - `generateDashboardPdf(metrics, options, config, chartImages, deploymentCache): Promise<void>`
  - Sub-functions:
    - `addHeader(doc, config)` — title, URL, timeframe, generation date
    - `addSummarySection(doc, metrics)` — key metrics as formatted text
    - `addProjectTable(doc, projects)` — `autoTable` with project data
    - `addChartImages(doc, chartImages)` — add base64 images, sized for A4
    - `addEnvironmentMatrix(doc, deploymentCache, projects)` — deployment table
    - `addFooter(doc)` — generation timestamp, page numbers
  - A4 format, portrait orientation
  - Auto page breaks for long content
  - Consistent formatting: font sizes, margins, colours
  - **Test:** Integration test — verify PDF generates without error, correct number of pages

- [ ] **T1.3** Create chart image capture utility — **M**
  - `captureChartImages(chartRefs: ChartRefMap): Record<string, string>`
  - For each chart ref, call `chart.toBase64Image()`
  - Handle missing charts gracefully (return empty map entry)
  - Consider: temporarily apply light-mode colours for PDF readability
  - **Test:** Mock Chart.js instance, verify `toBase64Image` called

---

### UI Components

- [ ] **T2.1** Create `src/components/ExportButton.tsx` — **M**
  - Props: `metrics`, `projects`, `deploymentCache`, `aggregateTrends`, `config`, `chartRefs`, `darkMode`, `disabled`
  - Button: "📥 Export ▾" with click-to-toggle dropdown
  - Dropdown options:
    - "📊 CSV — Project Metrics" → immediate CSV download
    - "📊 CSV — Deployments" → immediate CSV download (disabled if no env data)
    - "📄 PDF Report..." → opens ExportOptionsDialog
  - Disabled when `metrics` is null
  - Close dropdown on outside click
  - Add CSS in `src/styles/ExportButton.css`
  - **Test:** Button renders, dropdown opens, options fire correct callbacks

- [ ] **T2.2** Create `src/components/ExportOptionsDialog.tsx` — **M**
  - Props: `onExport`, `onCancel`, `hasEnvironmentData`, `darkMode`
  - Modal with checkboxes for each PDF section
  - Defaults: summary=on, projectTable=on, trendCharts=on, envMatrix=off, detailed=off
  - "Generate PDF" button with loading spinner during generation
  - "Cancel" button
  - Load/save options from/to localStorage (`STORAGE_KEYS.EXPORT_OPTIONS`)
  - Disable envMatrix checkbox when `hasEnvironmentData` is false
  - Add CSS in `src/styles/ExportOptionsDialog.css`
  - **Test:** Checkboxes toggle, options passed to onExport, loading state works

- [ ] **T2.3** Expose Chart.js refs from chart components — **M**
  - In `src/components/MetricsPanel.tsx` (or wherever charts are rendered):
    - Add `ref` forwarding to Chart.js `<Line>` and `<Doughnut>` components
    - Expose refs via callback prop or `forwardRef`
  - In `src/components/SummarySection.tsx`:
    - Forward Doughnut chart ref
  - Collect all chart refs in `App.tsx` as `ChartRefMap` state
  - **Test:** Chart refs populated after render

- [ ] **T2.4** Integrate `ExportButton` into `src/App.tsx` — **M**
  - Add `ExportButton` in the header area (near view type selector)
  - Pass: `metrics`, filtered projects, `deploymentCache`, `aggregateTrends`, `config`, `chartRefs`, `darkMode`
  - Handle PDF export: open dialog, generate PDF with options, show loading
  - Handle CSV export: generate and download immediately
  - **Test:** Build passes, export button visible when data loaded

- [ ] **T2.5** Add environment-specific CSV export to `src/components/EnvironmentMatrixView.tsx` — **S**
  - Add "Export Deployments CSV" button in the environment view header
  - Call `generateEnvironmentCsv()` and `downloadCsv()` on click
  - **Test:** Button visible, CSV downloads

---

### Tests

- [ ] **T3.1** Unit tests for `src/utils/exportCsv.ts` — **M**
  - CSV generation with mock projects (correct format, correct number of rows)
  - CSV escaping: values with commas, quotes, newlines
  - Empty projects array
  - Environment CSV with full and partial deployment data
  - File: `src/utils/exportCsv.test.ts`

- [ ] **T3.2** Unit tests for `src/utils/exportPdf.ts` — **L**
  - Mock `jspdf` and `jspdf-autotable`
  - Verify correct methods called (addPage, text, autoTable, addImage, save)
  - Verify conditional sections (options respected)
  - Verify page break logic
  - Verify filename format
  - File: `src/utils/exportPdf.test.ts`

- [ ] **T3.3** Component tests for ExportButton — **S**
  - Renders disabled when no metrics
  - Dropdown opens on click
  - CSV options trigger download
  - PDF option opens dialog
  - File: `src/components/ExportButton.test.tsx`

- [ ] **T3.4** Component tests for ExportOptionsDialog — **S**
  - Checkboxes default state
  - Options passed correctly to onExport
  - Cancel closes dialog
  - File: `src/components/ExportOptionsDialog.test.tsx`

---

### Polish

- [ ] **T4.1** Dark mode styling — **S**
  - Export button and dropdown for dark mode
  - Options dialog dark mode
  - PDF is always light mode (print-friendly)

- [ ] **T4.2** PDF visual polish — **L**
  - Professional header with logo placeholder
  - Consistent font sizing: title (16pt), section headers (12pt), body (10pt)
  - Table row striping for readability
  - Chart images with captions
  - Page numbers (centred footer)
  - Color-coded status column in project table (green/yellow/red)

- [ ] **T4.3** Loading and feedback UX — **S**
  - PDF generation loading indicator (spinner + "Generating report...")
  - Success toast after download: "Report downloaded successfully"
  - Error toast on failure: "Failed to generate report. Please try again."
  - CSV download confirmation: brief toast "CSV downloaded"

- [ ] **T4.4** Lazy loading optimisation — **M**
  - `jspdf` and `jspdf-autotable` loaded via dynamic `import()` only when user clicks "Export PDF"
  - Show "Loading PDF library..." during first load
  - Cache loaded modules for subsequent exports
  - Verify bundle splitting works in Vite build
  - **Test:** `npm run build` shows separate chunk for jspdf

- [ ] **T4.5** Update E2E tests — **M**
  - Click Export button, verify dropdown appears
  - Select CSV export, verify file download
  - Open PDF options, select sections, generate
  - Verify no errors during generation
  - Extend `e2e/dashboard.spec.ts`

---

## Completion Criteria

All tasks complete when:
```bash
npm run lint && npm run build && npm test && npx playwright test --project=chromium
```
Passes with 0 failures.

## Dependencies

- **T0.x** (Setup) → no dependencies
- **T1.x** (Core) → depends on T0.x, T0.3 (npm install)
- **T2.x** (UI) → depends on T1.x
- **T3.x** (Tests) → in parallel with T2.x
- **T4.x** (Polish) → depends on T2.x
- Chart image capture depends on Chart.js refs being accessible (requires ref forwarding in chart components)
- Environment CSV depends on Priority 2 (Environment Overview) deployment cache data

## Notes

- `jspdf` + `jspdf-autotable` add ~400KB to the bundle — lazy loading is essential
- Chart.js `toBase64Image()` captures the chart exactly as rendered — including dark mode colours. For print-friendly PDFs, consider applying light colours before capture.
- CSV uses UTF-8 BOM (`\uFEFF` prefix) for proper Excel encoding of special characters
- PDF generation can take 1-3 seconds for large dashboards — loading indicator is important
- File naming uses date only (not time) to avoid filesystem issues with colons
- `URL.createObjectURL` + `link.click()` pattern works across all modern browsers
- `jspdf-autotable` is the standard plugin for table rendering in jsPDF — handles pagination, styling, and auto-fitting

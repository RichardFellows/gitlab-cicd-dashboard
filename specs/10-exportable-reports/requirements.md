# Requirements: Exportable Reports (CSV/PDF)

## Business Context

From FEATURE_IDEAS.md: "Export metrics to CSV/PDF" is listed under Future Enhancements. From INTERVIEW_NOTES.md: The dashboard is used by managers who need to share metrics with stakeholders in weekly team reviews, management updates, and audit reports. These stakeholders typically won't visit the dashboard directly — they need the data delivered to them in familiar formats (Excel, PDF).

Exportable reports eliminate the need for screenshots and manual data transcription, providing professional-quality reports generated directly from the dashboard.

---

## User Stories

### 10.1 CSV Export

**As an** engineering manager  
**I want to** export all project metrics as a CSV file  
**So that** I can analyse the data in Excel and create custom reports

**Acceptance Criteria:**
- [ ] "Export CSV" button accessible from the dashboard header or controls area
- [ ] CSV includes one row per project with columns:
  - Project Name, Project Path, Pipeline Count, Success Rate, Failed Pipelines, Avg Duration, Coverage, Open MRs, Draft MRs, Main Branch Status, Health Score (if Feature 1)
- [ ] Column headers as first row
- [ ] Numbers formatted appropriately (2 decimal places for percentages, integer for counts)
- [ ] Duration in seconds (raw) for Excel compatibility
- [ ] File downloaded with name: `gitlab-dashboard-{date}.csv`
- [ ] Exported data respects current filters (only filtered/visible projects exported)

---

### 10.2 PDF Report Generation

**As a** team lead  
**I want to** generate a PDF report of the current dashboard state  
**So that** I can share it in emails and presentations without screenshots

**Acceptance Criteria:**
- [ ] "Export PDF" button accessible from the dashboard header
- [ ] PDF includes:
  - Header: report title, generation timestamp, configuration info (GitLab URL, timeframe)
  - Summary metrics: total projects, success rate, avg duration, pipeline counts
  - Project table: all visible projects with key metrics
  - Trend charts: rendered as images (success rate, duration, coverage trends)
  - Environment matrix: deployment status table (if data available)
- [ ] Professional formatting: consistent fonts, colours, page breaks
- [ ] File downloaded with name: `gitlab-dashboard-report-{date}.pdf`
- [ ] Generated entirely client-side (no server required)

---

### 10.3 Selective Export

**As a** user  
**I want to** choose what to include in my export  
**So that** I can create focused reports for different audiences

**Acceptance Criteria:**
- [ ] Export options dialog before download:
  - Include summary section (checkbox, default: on)
  - Include project table (checkbox, default: on)
  - Include trend charts (checkbox, default: on)
  - Include environment matrix (checkbox, default: off)
  - Include detailed project breakdown (checkbox, default: off)
- [ ] Options apply to PDF only (CSV is always a flat table)
- [ ] Options are session-sticky (remembered for next export)

---

### 10.4 Environment Matrix Export

**As an** engineering manager  
**I want to** export the deployment environment matrix  
**So that** I can include deployment status in audit and compliance reports

**Acceptance Criteria:**
- [ ] CSV option specifically for the environment matrix
- [ ] Columns: Project Name, Dev Version, Dev Status, SIT Version, SIT Status, UAT Version, UAT Status, Prod Version, Prod Status
- [ ] Available when Environment view has data
- [ ] Separate export button within the Environment view

---

## Technical Notes

- CSV generation: Build string with comma-separated values, download via `Blob` + `URL.createObjectURL`
- PDF generation: Use `html2canvas` + `jspdf` for client-side PDF creation
  - `html2canvas` captures DOM elements as canvas images
  - `jspdf` creates PDF document from canvas images and text
  - Both are client-side, no server needed
- Chart rendering for PDF: Chart.js charts can be exported via `chart.toBase64Image()` — no need for `html2canvas` on charts
- Neither library is currently in `package.json` — need to add `jspdf` and `html2canvas` as dependencies
- Consider bundle size: `jspdf` is ~300KB minified, `html2canvas` is ~100KB — lazy-load these libraries
- Alternative to `html2canvas`: render PDF using `jspdf` text/table APIs directly (more control, less dependency)
- File download: `const link = document.createElement('a'); link.href = url; link.download = filename; link.click()`

## Out of Scope

- Server-side report generation
- Scheduled/automated report generation
- Email delivery of reports
- Custom report templates
- Excel (.xlsx) format (CSV suffices for Excel users)
- Chart interactivity in PDF (static images only)

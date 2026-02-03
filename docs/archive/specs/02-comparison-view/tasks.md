# Tasks: Comparison View (Side-by-Side)

## Task Breakdown

Tasks ordered POC-first: prove multi-dataset charts work, then build selection UX.

---

### Setup

- [ ] **T0.1** Add `COMPARISON_COLOURS` and `COMPARISON_COLOURS_DARK` to `src/types/index.ts` or `src/utils/constants.ts` — **S**
  - 4-colour palettes for comparison charts
  - **Test:** Build passes

- [ ] **T0.2** Add `selectedForComparison` and `comparisonMode` state to `src/App.tsx` — **S**
  - `const [selectedForComparison, setSelectedForComparison] = useState<Set<number>>(new Set())`
  - `const [comparisonMode, setComparisonMode] = useState(false)`
  - Handler functions: `toggleComparisonSelection(projectId)`, `enterComparisonMode()`, `exitComparisonMode()`
  - **Test:** Build passes

---

### Core Implementation

- [ ] **T1.1** Create `src/components/ComparisonCharts.tsx` — **L**
  - Accept `projects`, `trendData`, `colours`, `darkMode`, `loading` props
  - Render 4 chart panels:
    - Success Rate Trend: `Line` chart via existing `TrendChart` component with multi-dataset
    - Duration Trend: `Line` chart via `TrendChart`
    - Coverage Comparison: `Bar` chart (Chart.js `react-chartjs-2`)
    - MR Backlog: Grouped `Bar` chart (open vs draft per project)
  - Align date labels across projects (union of all dates, fill gaps with null)
  - Handle loading state with placeholder/skeleton
  - **Test:** Component renders charts with mock data, handles empty data gracefully

- [ ] **T1.2** Create `src/components/ComparisonTable.tsx` — **M**
  - Accept `projects`, `colours` props
  - Render table with metric rows and project columns
  - Metrics: Success Rate, Avg Duration, Coverage, Total Pipelines, Failed, Open MRs, Draft MRs
  - Highlight best/worst value per row with subtle background colour
  - **Test:** Component renders table, best/worst highlighting works

- [ ] **T1.3** Create `src/components/ComparisonDeployments.tsx` — **M**
  - Accept `projects`, `deploymentCache`, `colours` props
  - Render environment rows × project columns
  - Each cell shows version + status indicator (reuse `DeploymentCell` pattern)
  - Handle missing deployment data gracefully
  - **Test:** Component renders matrix, handles missing data

- [ ] **T1.4** Create `src/components/ComparisonHeader.tsx` — **S**
  - Accept `projects`, `colours`, `onBack`, `onRemoveProject` props
  - Render project names with colour swatches
  - "Back to Dashboard" button
  - Optional: remove project from comparison (×) button per project
  - **Test:** Component renders header, back button fires callback

---

### UI Components

- [ ] **T2.1** Create `src/components/ComparisonView.tsx` — **L**
  - Accept full prop set per design doc
  - On mount, fetch trend data for each selected project using `dashboardService.getProjectPipelineTrends()`
  - Manage loading state per project
  - Assign colours from `COMPARISON_COLOURS` based on selection order
  - Compose: `ComparisonHeader` + `ComparisonCharts` + `ComparisonTable` + `ComparisonDeployments`
  - Add CSS in `src/styles/ComparisonView.css`
  - **Test:** Component fetches data on mount, renders sub-components, handles errors

- [ ] **T2.2** Add selection checkboxes to `src/components/CardView.tsx` — **M**
  - Add `selectionMode`, `selectedIds`, `onToggleSelection` props
  - Render checkbox overlay on each card (top-left corner) when `selectionMode` is true
  - Selected cards get highlighted border with comparison colour
  - **Test:** Checkboxes appear in selection mode, toggle fires callback

- [ ] **T2.3** Add selection checkboxes to `src/components/TableView.tsx` — **M**
  - Add `selectionMode`, `selectedIds`, `onToggleSelection` props
  - Add checkbox as first column when `selectionMode` is true
  - Selected rows get subtle background tint
  - **Test:** Checkboxes appear, selection state reflected in row styling

- [ ] **T2.4** Add comparison action bar to `src/components/Dashboard.tsx` — **M**
  - Accept `selectedForComparison`, `selectionMode`, `onToggleSelectionMode`, `onCompare` props
  - Render "Select for Compare" toggle button in section header
  - When selection mode active and ≥2 selected, show floating action bar:
    "N selected | Compare Now | Clear"
  - Disable further selection when 4 already selected
  - **Test:** Action bar appears/disappears correctly, buttons fire callbacks

- [ ] **T2.5** Wire `ComparisonView` into `src/App.tsx` — **M**
  - When `comparisonMode` is true, render `ComparisonView` instead of `Dashboard`
  - Pass selected projects (filter `metrics.projects` by `selectedForComparison`)
  - Pass `dashboardService`, `deploymentCache`, `timeframe`, `darkMode`
  - Handle back navigation: reset `comparisonMode` to false
  - **Test:** Comparison mode toggles correctly, ComparisonView renders with correct projects

---

### Tests

- [ ] **T3.1** Unit tests for date alignment utility — **S**
  - Function to compute union of date labels and fill gaps
  - `src/utils/comparisonUtils.ts` + `src/utils/comparisonUtils.test.ts`

- [ ] **T3.2** Component tests for ComparisonCharts — **M**
  - Mock trend data for 2-4 projects
  - Verify correct number of datasets in each chart
  - Verify date label alignment
  - File: `src/components/ComparisonCharts.test.tsx`

- [ ] **T3.3** Component tests for ComparisonView — **M**
  - Mock `DashboardDataService` to return trend data
  - Verify fetches triggered for each project
  - Verify loading/error/success states
  - File: `src/components/ComparisonView.test.tsx`

- [ ] **T3.4** Integration test for selection flow — **M**
  - Render Dashboard in selection mode
  - Select 2 projects
  - Click "Compare Now"
  - Verify ComparisonView renders
  - Verify "Back" returns to Dashboard

---

### Polish

- [ ] **T4.1** Dark mode styling for comparison components — **S**
  - All charts use `COMPARISON_COLOURS_DARK` when dark mode active
  - Table, header, action bar styled for dark background
  - Ensure sufficient contrast

- [ ] **T4.2** Responsive layout for comparison — **M**
  - Charts grid: 2×2 on wide screens, single column on narrow
  - Table scrolls horizontally if needed
  - Deployment matrix adapts to project count

- [ ] **T4.3** Selection persistence across view switches — **S**
  - When user switches from Card to Table view, selection preserved
  - When returning from comparison to dashboard, selection cleared or preserved (clear on "Back")

- [ ] **T4.4** Update E2E tests — **M**
  - Select 2 projects, enter comparison mode
  - Verify charts render
  - Navigate back, verify dashboard state
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
- **T1.x** (Core) → depends on T0.x
- **T2.x** (UI) → depends on T1.x
- **T3.x** (Tests) → in parallel with T2.x
- **T4.x** (Polish) → depends on T2.x
- Feature 1 (Health Score) is optional — if available, include health score in ComparisonTable

## Notes

- Reuse existing `TrendChart` component — it already supports `TrendDataset[]` with multiple datasets
- `getProjectPipelineTrends()` is already implemented in `DashboardDataService` — no new service methods needed
- Maximum 4 projects keeps charts readable and limits API calls (4 × trend fetch)
- Deployment comparison uses cached data from `deploymentCache` where available

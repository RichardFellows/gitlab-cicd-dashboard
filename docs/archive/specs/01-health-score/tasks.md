# Tasks: Pipeline Health Score & Project Grading

## Task Breakdown

Tasks ordered POC-first: prove the scoring algorithm works, then build the UI.

---

### Setup

- [ ] **T0.1** Create `src/utils/healthScore.ts` with type definitions — **S**
  - Define `HEALTH_WEIGHTS`, `HEALTH_BANDS`, `HealthBand`, `HealthSignalResult`, `HealthScore`, `PortfolioHealth`
  - Export all types and constants
  - **Test:** File compiles, types importable

- [ ] **T0.2** Add `HEALTH_SORT_ORDER` to `STORAGE_KEYS` in `src/types/index.ts` — **S**
  - Value: `'gitlab_cicd_dashboard_health_sort'`
  - **Test:** Build passes

---

### Core Implementation

- [ ] **T1.1** Implement individual signal scoring functions in `src/utils/healthScore.ts` — **M**
  - `scoreFailureRate(failureRate: number): number`
  - `scoreCoverage(coverage: number | null): number`
  - `scoreDurationStability(spikePercent: number): number`
  - `scoreMRBacklog(totalOpen: number): number`
  - `scoreRecentActivity(totalPipelines: number): number`
  - Reference thresholds from `src/utils/constants.ts` (`METRICS_THRESHOLDS`)
  - **Test:** Unit tests for each function with boundary values (0, mid, max, null)

- [ ] **T1.2** Implement `calculateHealthScore(metrics: ProjectMetrics): HealthScore` — **M**
  - Compose all signals with weights
  - Return total score, band, and signal breakdown
  - Handle edge cases: no pipeline data, null coverage, zero duration
  - **Test:** Unit tests with mock `ProjectMetrics` objects covering healthy/warning/critical projects

- [ ] **T1.3** Implement `getHealthBand(score: number): HealthBand` — **S**
  - ≥80 = 'healthy', ≥50 = 'warning', <50 = 'critical'
  - **Test:** Boundary tests at 80, 79, 50, 49, 0, 100

- [ ] **T1.4** Implement `calculatePortfolioHealth(projects: Project[]): PortfolioHealth` — **M**
  - Calculate weighted average (by activity) across all projects
  - Calculate distribution counts per health band
  - Exclude zero-activity projects from average but include in distribution as 'critical'
  - **Test:** Unit tests with mixed project arrays

---

### UI Components

- [ ] **T2.1** Create `src/components/HealthBadge.tsx` — **M**
  - Props: `score`, `size`, `showBreakdown`, `breakdown`, `onClick`
  - Render circular badge with score number and colour background
  - Support sm/md/lg sizes
  - Style using `CHART_COLORS` / `CHART_COLORS_DARK` based on inherited dark mode context
  - Add CSS in `src/styles/HealthBadge.css`
  - **Test:** Component renders correct colour for each band, shows correct score text

- [ ] **T2.2** Create `src/components/HealthBreakdown.tsx` — **M**
  - Props: `signals: HealthSignalResult[]`, `darkMode`
  - Render list of signals with name, weight, raw value, score bar
  - Highlight signals scoring below 50 in red
  - Show raw value with unit (e.g., "65%", "7 MRs")
  - Add CSS in `src/styles/HealthBreakdown.css`
  - **Test:** Component renders all signals, low-scoring signals highlighted

- [ ] **T2.3** Create `src/components/PortfolioHealthChart.tsx` — **M**
  - Props: `projects: Project[]`, `darkMode`
  - Render Chart.js `Doughnut` chart with health band distribution
  - Centre label shows average portfolio score
  - Match existing `SummarySection` Doughnut pattern
  - **Test:** Component renders chart with correct distribution data

- [ ] **T2.4** Integrate `HealthBadge` into `src/components/CardView.tsx` — **M**
  - Import `calculateHealthScore` from `src/utils/healthScore.ts`
  - Compute health score per project using `useMemo`
  - Render `HealthBadge` in card header (top-right area)
  - Wire click to toggle `HealthBreakdown` below card metrics
  - **Test:** Card renders with health badge, click toggles breakdown

- [ ] **T2.5** Integrate `HealthBadge` into `src/components/TableView.tsx` — **L**
  - Add "Health" column to table header
  - Compute health score per project
  - Render `HealthBadge` (sm size) in new column
  - Add sort functionality: click column header to sort by health score
  - Persist sort preference in `localStorage` using `STORAGE_KEYS.HEALTH_SORT_ORDER`
  - Wire click on badge to show inline `HealthBreakdown` row
  - **Test:** Table shows health column, sorting works, breakdown expands

- [ ] **T2.6** Integrate `PortfolioHealthChart` into `src/components/SummarySection.tsx` — **M**
  - Add portfolio health summary below existing summary cards
  - Show average score as `HealthBadge` (lg size)
  - Render `PortfolioHealthChart` alongside existing Doughnut chart
  - **Test:** Summary section shows portfolio health data

---

### Tests

- [ ] **T3.1** Unit tests for `src/utils/healthScore.ts` — **L**
  - All individual scoring functions with edge cases
  - `calculateHealthScore` with various `ProjectMetrics` combinations
  - `calculatePortfolioHealth` with mixed project arrays
  - Verify weights sum to 1.0
  - Verify all scores bounded 0-100
  - File: `src/utils/healthScore.test.ts`

- [ ] **T3.2** Component tests for `HealthBadge`, `HealthBreakdown`, `PortfolioHealthChart` — **M**
  - Render with mock data
  - Verify correct CSS classes for health bands
  - Verify accessibility (aria-label on badge)
  - File: `src/components/HealthBadge.test.tsx`, etc.

- [ ] **T3.3** Integration tests for CardView and TableView with health scores — **M**
  - Verify health badge appears in card/table
  - Verify sort by health in table
  - Verify breakdown toggle
  - Extend existing `CardView.test.tsx` and `TableView.test.tsx`

---

### Polish

- [ ] **T4.1** Dark mode styling for all health score components — **S**
  - Verify badge colours use `CHART_COLORS_DARK` in dark mode
  - Ensure breakdown panel has appropriate dark background
  - Test contrast ratios for accessibility

- [ ] **T4.2** Responsive layout adjustments — **S**
  - Badge size reduces gracefully on narrow viewports
  - Breakdown panel doesn't overflow on mobile-width (even though desktop-only, test reasonable widths)

- [ ] **T4.3** Animation and polish — **S**
  - Subtle fade-in for badge when score loads
  - Smooth expand/collapse for breakdown panel
  - Hover effect on badge (slight scale-up)

- [ ] **T4.4** Update E2E tests — **M**
  - Verify health badges visible in Card and Table views
  - Verify sorting by health score works
  - Verify portfolio health in summary section
  - Extend existing `e2e/dashboard.spec.ts`

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
- **T2.x** (UI) → depends on T1.x (scoring functions)
- **T3.x** (Tests) → can proceed in parallel with T2.x
- **T4.x** (Polish) → depends on T2.x

## Notes

- Health score is a pure client-side computation — no API changes needed
- All input data already exists in `ProjectMetrics` from existing refresh cycle
- Scoring weights are constants — can be made user-configurable in a future iteration
- If `mainBranchFailureRate` or `durationSpikePercent` are undefined on `ProjectMetrics`, fall back to computing from `failedPipelines/totalPipelines` and 0% respectively

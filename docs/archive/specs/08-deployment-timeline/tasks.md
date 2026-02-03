# Tasks: Deployment Timeline / Activity Feed

## Task Breakdown

Tasks ordered POC-first: prove deployment history fetching and rollback detection work, then build the timeline UI.

**Prerequisite:** Priority 2 (Environment Overview) should be complete, as this reuses the deploy job parsing logic.

---

### Setup

- [ ] **T0.1** Add timeline types to `src/types/index.ts` — **S**
  - `DeploymentHistoryEntry` (extends `Deployment` with `projectId`, `projectName`, `isRollback`, `rolledBackFrom`)
  - `TimelineFilters` interface
  - **Test:** Build passes

- [ ] **T0.2** Add `TIMELINE_FILTERS` to `STORAGE_KEYS` in `src/types/index.ts` — **S**
  - Value: `'gitlab_cicd_dashboard_timeline_filters'`
  - **Test:** Build passes

---

### Core Implementation

- [ ] **T1.1** Create `src/utils/versionCompare.ts` — **M**
  - `compareVersions(a: string | null, b: string | null): number`
    - Parse semver components: `"2.3.45"` → `[2, 3, 45]`
    - Compare component by component
    - Handle pipeline IID fallback: `"#123"` → compare as integers
    - Handle null: null is always "less than" any version
  - `parseVersion(version: string): number[]` — extract numeric components
  - **Test:** Unit tests with semver pairs, IID pairs, null handling, edge cases

- [ ] **T1.2** Add `getProjectDeploymentHistory()` to `src/services/DashboardDataService.ts` — **L**
  - Accept `projectId: number`, `projectName: string`
  - Fetch jobs via `gitLabService.getProjectJobs(projectId, { scope: ['success', 'failed'], per_page: 100 })`
  - Filter to deploy jobs using existing `parseDeployJobName()` / `DEPLOY_JOB_REGEX`
  - Build `DeploymentHistoryEntry[]` for ALL deploy jobs (not just latest per env)
  - Resolve versions from artifacts in batches (limit concurrency to 5)
  - Fallback to pipeline IID when artifact unavailable
  - Filter to last 30 days by job timestamp
  - **Test:** Unit test with mocked jobs API — verify all deploy jobs returned, version resolution

- [ ] **T1.3** Implement `detectRollbacks()` in `src/services/DashboardDataService.ts` — **M**
  - Accept `history: DeploymentHistoryEntry[]`
  - Group by `projectId` + `environment`
  - Within each group, sort by timestamp ascending
  - Compare consecutive versions using `compareVersions()`
  - If version(n) < version(n-1), set `isRollback = true`, `rolledBackFrom = version(n-1)`
  - Return mutated array with rollback flags set
  - **Test:** Unit tests with rollback scenarios, non-rollback scenarios, mixed versions

- [ ] **T1.4** Create `src/utils/timelineUtils.ts` — **M**
  - `groupByDate(entries: DeploymentHistoryEntry[]): Map<string, DeploymentHistoryEntry[]>`
    - Group by ISO date string, sorted newest first
  - `getDateLabel(dateStr: string): string`
    - "Today", "Yesterday", or formatted date (e.g., "28 Jan 2026")
  - `filterTimeline(entries, filters: TimelineFilters): DeploymentHistoryEntry[]`
    - Apply project, environment, status, date range filters
  - **Test:** Unit tests for grouping, labelling, filtering

---

### UI Components

- [ ] **T2.1** Create `src/components/TimelineEntry.tsx` — **M**
  - Props: `entry: DeploymentHistoryEntry`, `jiraBaseUrl`, `darkMode`, `onExpand`, `isExpanded`
  - Left: timestamp (HH:mm), coloured status dot (green/red/grey)
  - Main: project name (bold), version, environment badge (coloured pill from `ENVIRONMENT_ORDER`), branch name
  - Right: JIRA key link (if `jiraKey` and `jiraBaseUrl`), status text
  - Rollback styling: ⏪ icon, "Rolled back from vX.Y.Z" annotation, amber/grey background
  - Expanded: pipeline link, job link, commit SHA, MR link, full branch name
  - Add CSS in `src/styles/TimelineEntry.css`
  - **Test:** Renders all fields, rollback styling, expanded state

- [ ] **T2.2** Create `src/components/TimelineDay.tsx` — **S**
  - Props: `date`, `label`, `entries`, `jiraBaseUrl`, `darkMode`
  - Date separator header with centred label
  - Render list of `TimelineEntry` components
  - Connecting vertical line between entries
  - **Test:** Renders date header and entries

- [ ] **T2.3** Create `src/components/TimelineFilters.tsx` — **M**
  - Props: `projects`, `filters`, `onFilterChange`, `totalCount`, `filteredCount`
  - Project multi-select dropdown
  - Environment multi-select: `ENVIRONMENT_ORDER` values (dev/sit/uat/prod)
  - Status checkboxes: success, failed, rollback
  - Date range: HTML5 date inputs (from / to)
  - "Clear Filters" button, active filter count
  - "X deployments found" counter
  - **Test:** Filter changes fire callbacks, clear resets all

- [ ] **T2.4** Create `src/components/DeploymentTimeline.tsx` — **L**
  - Props: `projects`, `dashboardService`, `gitLabService`, `darkMode`, `jiraBaseUrl`
  - On mount: fetch deployment history for all projects, merge, detect rollbacks
  - Manage loading, error, filter state
  - Apply filters → group by date → render `TimelineDay` components
  - Load/save filters from/to localStorage (`STORAGE_KEYS.TIMELINE_FILTERS`)
  - Scrollable container with lazy loading for older entries
  - Empty state: "No deployments found" with suggestions
  - Add CSS in `src/styles/DeploymentTimeline.css`
  - **Test:** Fetches data on mount, groups by date, filters work

- [ ] **T2.5** Integrate timeline into `src/components/EnvironmentMatrixView.tsx` — **M**
  - Add tab toggle: "Matrix | Timeline"
  - When "Timeline" tab active, render `DeploymentTimeline` component
  - Pass through: `projects`, `dashboardService`, `gitLabService`, `darkMode`, `jiraBaseUrl`
  - Tab state managed locally (not persisted)
  - **Test:** Tab toggle works, timeline renders in timeline tab

- [ ] **T2.6** Wire into `src/App.tsx` — **S**
  - Pass `dashboardService` to `EnvironmentMatrixView` (if not already)
  - No new state needed in App — timeline manages its own data
  - **Test:** Build passes, timeline accessible from Environment view

---

### Tests

- [ ] **T3.1** Unit tests for `src/utils/versionCompare.ts` — **M**
  - Semver comparisons: 2.3.45 vs 2.3.40, 1.0.0 vs 2.0.0, 1.2.3 vs 1.2.3
  - IID comparisons: #123 vs #120
  - Null handling
  - Mixed formats
  - File: `src/utils/versionCompare.test.ts`

- [ ] **T3.2** Unit tests for `getProjectDeploymentHistory()` and `detectRollbacks()` — **L**
  - History with multiple envs and versions
  - Rollback detection with version decrease
  - No rollback when versions increase
  - Edge cases: same version redeployed, null versions
  - File: extend `src/services/DashboardDataService.test.ts`

- [ ] **T3.3** Unit tests for `src/utils/timelineUtils.ts` — **S**
  - Date grouping
  - Date labelling (today/yesterday/other)
  - Filter combinations
  - File: `src/utils/timelineUtils.test.ts`

- [ ] **T3.4** Component tests for DeploymentTimeline — **M**
  - Mock data service
  - Verify date groups render
  - Verify filters
  - Verify rollback entries styled differently
  - File: `src/components/DeploymentTimeline.test.tsx`

---

### Polish

- [ ] **T4.1** Dark mode styling — **S**
  - Timeline connecting line colour
  - Entry backgrounds, status dots
  - Date separator styling
  - Rollback highlight colour
  - Filter bar dark mode

- [ ] **T4.2** Timeline visual refinements — **M**
  - Connecting vertical line between entries (thin, muted)
  - Smooth expand/collapse animation for entry details
  - Environment badges match colours from `EnvironmentMatrixView`
  - Status dots match `CHART_COLORS` / `CHART_COLORS_DARK`

- [ ] **T4.3** Performance — **M**
  - Lazy load version info from artifacts (resolve visible entries first)
  - Virtual scrolling for long timelines (>200 entries)
  - Limit artifact resolution to 50 concurrent requests
  - Show "Load more" button instead of infinite scroll

- [ ] **T4.4** Update E2E tests — **M**
  - Switch to Environment view, select Timeline tab
  - Verify timeline entries render
  - Apply filter, verify entries update
  - Expand entry, verify details
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
- Depends on Priority 2 (Environment Overview) for: `parseDeployJobName()`, `extractJiraKey()`, `DEPLOY_JOB_REGEX`, `Deployment` types
- Reuses `getProjectJobs()` and `getJobArtifact()` from `GitLabApiService`

## Notes

- Key difference from `getProjectDeployments()`: returns ALL deploy jobs, not just latest per env
- Version resolution (artifact fetch) is the most API-intensive part — batch and limit concurrency
- Rollback detection is best-effort: relies on version comparison which may not work for non-semver formats
- With 60 projects × ~10 deploy jobs each = ~600 timeline entries — performance should be fine
- Consider caching: store timeline data alongside deployment cache, invalidate on dashboard refresh
- JIRA key linking reuses existing `extractJiraKey()` and config `jiraBaseUrl` pattern

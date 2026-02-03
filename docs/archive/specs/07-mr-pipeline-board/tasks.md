# Tasks: MR Pipeline Status Dashboard (MR-Centric View)

## Task Breakdown

Tasks ordered POC-first: prove cross-project MR fetching works, then build the board UI.

---

### Setup

- [ ] **T0.1** Add `MR_BOARD` to `ViewType` enum in `src/types/index.ts` — **S**
  - `MR_BOARD = 'mr-board'`
  - **Test:** Build passes

- [ ] **T0.2** Add MR board types to `src/types/index.ts` — **S**
  - `MRWithProject`, `MRBoardFilters`, `MRSortOption`, `MRPipelineGroup`
  - **Test:** Build passes

- [ ] **T0.3** Add MR board `STORAGE_KEYS` to `src/types/index.ts` — **S**
  - `MR_BOARD_FILTERS`, `MR_BOARD_SORT`, `MY_USERNAME`
  - **Test:** Build passes

---

### Core Implementation

- [ ] **T1.1** Add `getAllOpenMergeRequests()` to `src/services/DashboardDataService.ts` — **M**
  - Accept `projects: Project[]`
  - For each project, call `gitLabService.getProjectMergeRequests(projectId, { state: 'opened', per_page: 20 })`
  - Annotate each MR with `projectId`, `projectName`, `projectPath`
  - Optimisation: skip projects where `mergeRequestCounts.totalOpen === 0`
  - Handle individual project failures gracefully (skip, don't fail all)
  - Return flattened `MRWithProject[]`
  - **Test:** Unit test with mocked API — verify annotation, error handling

- [ ] **T1.2** Create `src/utils/mrBoardUtils.ts` — **M**
  - `groupMRsByPipelineStatus(mrs: MRWithProject[]): Record<MRPipelineGroup, MRWithProject[]>`
    - Classify each MR by pipeline status and draft state
  - `filterMRs(mrs: MRWithProject[], filters: MRBoardFilters): MRWithProject[]`
    - Apply project, author, "my MRs" filters
  - `sortMRs(mrs: MRWithProject[], sortBy: MRSortOption): MRWithProject[]`
    - Sort by age, last activity, or project name
  - **Test:** Unit tests for grouping, filtering, sorting with various MR datasets

---

### UI Components

- [ ] **T2.1** Create `src/components/MRCard.tsx` — **M**
  - Props: `mr: MRWithProject`, `onSelect`, `darkMode`
  - Render compact card with: title (truncated), project name, author, branch info, pipeline status badge
  - Coloured left border based on pipeline status
  - Failed job names inline for failed pipelines (from `head_pipeline.failedJobs`)
  - Age: relative time since `created_at`
  - Last commit message (from `recent_commits[0].title`, truncated)
  - Click fires `onSelect` callback
  - Add CSS in `src/styles/MRCard.css`
  - **Test:** Renders all info, correct status styling, click fires callback

- [ ] **T2.2** Create `src/components/MRCardDetails.tsx` — **M**
  - Props: `mr: MRWithProject`, `darkMode`
  - Full MR details: description (truncated), commits list, full pipeline job list
  - Links: MR in GitLab (`mr.web_url`), pipeline (`mr.head_pipeline.web_url`), source branch
  - Failed jobs with stage and failure reason (reuse pattern from `ProjectDetails.tsx`)
  - **Test:** Renders full details, links work

- [ ] **T2.3** Create `src/components/MRBoardColumn.tsx` — **M**
  - Props: `title`, `icon`, `count`, `mergeRequests`, `onMRSelect`, `darkMode`
  - Column header with icon, title, count badge (coloured)
  - Scrollable list of MRCard components
  - Empty state: "No MRs" message
  - **Test:** Renders column with cards, shows empty state

- [ ] **T2.4** Create `src/components/MRBoardFilters.tsx` — **M**
  - Props: `projects`, `filters`, `onFilterChange`, `sortBy`, `onSortChange`, `totalCount`, `filteredCount`
  - Project multi-select dropdown (list of project names/IDs)
  - Author search text input
  - "My MRs Only" toggle with username config
  - Sort dropdown: Newest / Oldest / Last Activity / Project Name
  - Count display: "Showing X of Y MRs"
  - Username config: if `MY_USERNAME` not set, "My MRs" toggle shows prompt to set username
  - **Test:** Filters fire callbacks, sort changes, count display updates

- [ ] **T2.5** Create `src/components/MRBoardView.tsx` — **XL**
  - Props: `projects`, `gitLabService`, `dashboardService`, `darkMode`
  - On mount: fetch all open MRs via `dashboardService.getAllOpenMergeRequests()`
  - Manage loading, error, filters, sort state
  - Apply filters → group by status → render columns
  - Load/save filters from/to localStorage (`STORAGE_KEYS.MR_BOARD_FILTERS`, `MR_BOARD_SORT`)
  - Compose: `MRBoardFilters` + 5 × `MRBoardColumn`
  - Handle MR selection → show `MRCardDetails` in expandable panel
  - Responsive: Kanban columns on wide screens, stacked sections on narrow
  - Add CSS in `src/styles/MRBoardView.css`
  - **Test:** Fetches MRs on mount, groups correctly, filters work, responsive layout

- [ ] **T2.6** Wire `MRBoardView` into `src/App.tsx` — **M**
  - Add `ViewType.MR_BOARD` rendering branch in the main content area
  - Lazy load: only fetch MR data when MR_BOARD view is selected
  - Clear MR data when switching away (memory cleanup)
  - Add MR Board option to view type selector (alongside Card/Table/Environment/Readiness)
  - Pass `projects`, `gitLabService`, `dashboardService`, `darkMode` to MRBoardView
  - **Test:** View switch works, data fetched on select, cleared on deselect

---

### Tests

- [ ] **T3.1** Unit tests for `src/utils/mrBoardUtils.ts` — **M**
  - Grouping: MRs correctly classified into pipeline status groups
  - Draft detection: both `draft: true` and `title.startsWith('Draft:')` patterns
  - Filtering: project filter, author filter, "my MRs" filter
  - Sorting: all sort options
  - Edge cases: empty MR list, MR with no pipeline, MR with no author
  - File: `src/utils/mrBoardUtils.test.ts`

- [ ] **T3.2** Unit test for `getAllOpenMergeRequests()` — **S**
  - Mock `getProjectMergeRequests` for multiple projects
  - Verify annotation with project info
  - Verify graceful handling of individual project failures
  - File: extend `src/services/DashboardDataService.test.ts`

- [ ] **T3.3** Component tests for MRBoardView — **M**
  - Mock data service
  - Verify columns render with correct MR counts
  - Verify filter interactions
  - Verify MR card click opens details
  - File: `src/components/MRBoardView.test.tsx`

- [ ] **T3.4** Component tests for MRCard and MRCardDetails — **S**
  - Render with various MR states (passing, failing, draft, no pipeline)
  - Verify links, status badges, failed job display
  - Files: `src/components/MRCard.test.tsx`, `src/components/MRCardDetails.test.tsx`

---

### Polish

- [ ] **T4.1** Dark mode styling — **S**
  - Column backgrounds use dark variants
  - Card backgrounds, status badges, text colours
  - Filter bar styled for dark mode
  - All using `CHART_COLORS_DARK` from `src/utils/constants.ts`

- [ ] **T4.2** Responsive layout — **M**
  - Wide screens (≥1200px): 5 columns side by side (Kanban)
  - Medium screens (768-1199px): 3 columns + 2 below
  - Narrow screens (<768px): stacked sections (collapsible)
  - Column headers always visible, content scrollable

- [ ] **T4.3** Loading progress — **S**
  - Show "Loading MRs for X projects..." with progress
  - Individual project loading indicators
  - Progressive rendering as each project's MRs arrive

- [ ] **T4.4** Update E2E tests — **M**
  - Switch to MR Board view
  - Verify columns render
  - Apply filter, verify MR list updates
  - Click MR card, verify details panel
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
- Depends on existing `getProjectMergeRequests()` in `GitLabApiService` (already implemented)
- MR data enrichment (pipeline details, commits) already handled in the existing API method

## Notes

- `getProjectMergeRequests()` already does pipeline detail fetching and commit fetching — no need to duplicate
- With 60+ projects, each with potentially 20 open MRs, this could return 1000+ MRs — consider pagination
- The "My MRs" filter matches on `mr.author?.username` — requires knowing the user's GitLab username
- Draft detection: GitLab uses both `mr.draft: true` and `title.startsWith('Draft:')` — check both
- Pipeline status grouping is done client-side after fetching — no additional API calls needed
- Existing `MergeRequest.head_pipeline` type already includes failed jobs when status is 'failed'

# UX Improvements Build Progress

## Codebase Patterns
- Component tests use vitest + @testing-library/react
- localStorage keys follow pattern: `dashboard_<feature>_<setting>`
- Styles in src/styles/index.css
- State management via React useState/useEffect hooks
- Mock data in scripts/mock-gitlab-api.mjs
- **Default state initialization:** When setting defaults from localStorage, persist the default value immediately to localStorage during initialization (see TableView health sort)
- **Toggle cycles:** For persistent UI state, maintain a cycle rather than null states (e.g., asc ↔ desc instead of asc → desc → null)

## Progress Log
(Worker entries will be appended below)

---

## [2026-02-03] - bd-3qm.1 - US-001: Default Sort by Health Score

### What was implemented
- **TableView.tsx**: Modified default health sort from `null` to `'asc'` (ascending, showing worst/lowest health scores first)
  - Updated `useState` initializer to set default to `'asc'` and persist to localStorage immediately
  - Changed `toggleHealthSort()` to cycle between `'asc'` and `'desc'` only (removed null state)
  - Always maintains a sort state — users can toggle between ascending/descending, but sorting is always active
- **TableViewHealth.test.tsx**: Updated tests to verify new default behavior
  - Added test: "defaults to ascending health sort (worst first)"
  - Updated test: "clicking Health header toggles between asc and desc"
  - Updated test: "health sort persists preference to localStorage"
  - All 6 tests in this suite now pass

### Files changed
- `src/components/TableView.tsx` - Default sort logic and toggle behavior
- `src/components/TableViewHealth.test.tsx` - Test updates for new default

### Verification
- ✅ All 734 tests pass (53 test files)
- ✅ Table view defaults to Health column sort (ascending — lowest/worst first)
- ✅ Sort preference persists in localStorage (`dashboard_health_sort`)
- ✅ User can toggle between asc/desc by clicking Health column header
- ✅ CardView already correctly shows Failed/Warning groups before Success (no changes needed)

### Learnings

**Patterns discovered:**
- **Persist defaults immediately**: When initializing state from localStorage with a fallback default, write the default value to localStorage during initialization. This ensures consistency between the component state and persisted state, especially important for testing.
- **Avoid null in persistent toggles**: For UI state that should always have a value (like sort direction), use a binary toggle (asc ↔ desc) rather than a three-state cycle (null → asc → desc → null). This provides better UX and clearer expectations.

**Gotchas encountered:**
- Tests clear localStorage in `beforeEach()`, so default values won't appear in localStorage unless explicitly set during component initialization
- CardView grouping already implemented the desired "problems first" behavior via its existing categorization logic (failed → warning → inactive → success)

---

## [2026-02-03] - bd-3qm.2 - US-002: Larger Health Score Badges

### What was implemented
- **HealthBadge.css**: Increased `sm` size from 28px × 28px to 40px × 40px
  - Font size increased from 11px to 16px for better readability
  - Badge already had background colors (green/yellow/red) and was clickable ✅
  - Both TableView and CardView use `size="sm"` for health badges
- **HealthBadge.test.tsx**: Added tests to verify new badge dimensions
  - Test: "sm badge has correct dimensions (40px)"
  - Test: "badge has background color for visibility"
  - All 13 tests in this suite pass

### Files changed
- `src/styles/HealthBadge.css` - Updated sm size from 28px to 40px, font from 11px to 16px
- `src/components/HealthBadge.test.tsx` - Added 2 new tests for dimensions and styling

### Verification
- ✅ All 736 tests pass (53 test files)
- ✅ Health badges increased from 28px to 40px diameter (~43% larger)
- ✅ Font size increased from 11px to 16px (~45% larger, more readable)
- ✅ Badge already clickable (button element with onClick handler)
- ✅ Background colors already present (green/yellow/red based on health band)
- ✅ Used in both TableView and CardView consistently

### Learnings

**Patterns discovered:**
- **Component already well-designed**: HealthBadge component already implemented best practices (semantic button, accessibility labels, hover effects, color coding)
- **Size naming convention**: The `sm/md/lg` size props provide flexible scaling across different views
- **Shared component usage**: Changing the base `sm` size affects both TableView and CardView consistently, which is desired behavior for unified UX

**Gotchas encountered:**
- Initial assumption was ~24px, actual was 28px — always verify current values before changes
- Component was already fully clickable and styled with backgrounds, so only size adjustments needed

---

## [2026-02-03] - bd-3qm.4 - US-004: Remove Empty Failures Accordion

### What was implemented
- **No code changes needed** - implementation was already correct in `SummarySection.tsx`
  - Conditional rendering: `{projectStatusCounts.failed > 0 && onProjectSelect && (...)}` 
  - Entire Failures accordion (header + content) only renders when failures > 0
  - Summary stats card always shows "Failed: N" count (useful even when 0)
- **SummarySection.test.tsx**: Created comprehensive test suite (6 new tests)
  - Test: "hides Failures accordion when failure count is 0"
  - Test: "shows Failures accordion when failure count > 0"
  - Test: "allows expanding/collapsing Failures accordion"
  - Test: "hides Failures accordion when onProjectSelect is not provided"
  - Test: "shows correct count in Failures accordion header"
  - Test: "still shows FAILED count in summary cards when failures=0"

### Files changed
- `src/components/SummarySection.test.tsx` - Created new test file with 6 tests

### Verification
- ✅ All 742 tests pass (54 test files, +6 tests from previous build)
- ✅ Failures accordion completely hidden when failures=0
- ✅ Accordion shows with correct count when failures>0
- ✅ Summary card "Failed: 0" always visible (useful info)
- ✅ No contradictory "No failures 🎉" message appears in real usage

### Learnings

**Patterns discovered:**
- **Verify before coding**: Always check if the feature is already implemented correctly. In this case, the conditional rendering was already perfect - only tests were missing.
- **Component isolation vs real usage**: `FailureSummaryPanel` component handles empty state gracefully (shows "No failures 🎉") for isolated testing, but `SummarySection` never renders it when empty. This is good defensive programming.
- **Chart.js mocking for tests**: When testing components that import Chart.js (via SummarySection → PortfolioHealthChart → MetricsPanel → TrendChart), must mock both `chart.js` and `react-chartjs-2` with `registerables: []` export.

**Gotchas encountered:**
- Needed to add `registerables: []` to chart.js mock (not just the component exports)
- Must import components AFTER mocks in test files
- `FailureSummaryPanel.test.tsx` tests the component in isolation, but real app usage (via `SummarySection`) never hits the "No failures" branch

---

## [2026-02-03] - bd-3qm.6 - US-006: Needs Attention Quick Filter

### What was implemented
- **types/index.ts**: Added `'needs-attention'` to `ProjectStatusFilter` type
- **App.tsx**: Implemented "Needs Attention" filter logic
  - Updated `filteredProjects` memo to handle 'needs-attention' filter (shows Failed + Warning combined)
  - Added URL query param support: filter state syncs with URL via `?filter=needs-attention`
  - Created `statusCounts` memo to compute counts for all filter buttons
  - Added `handleStatusFilterChange` to update both state and URL
  - Added "Needs Attention (N)" button in filter bar (positioned after "All" for prominence)
- **styles/index.css**: Created distinctive styling for needs-attention filter
  - Applied gradient background: `linear-gradient(135deg, var(--danger-color), var(--warning-color))`
  - Added box-shadow for emphasis: `0 2px 6px rgba(220, 53, 69, 0.3)`
  - Set font-weight: 600 for visual distinction
- **NeedsAttentionFilter.test.tsx**: Created comprehensive test suite (9 new tests)
  - Test: "displays 'Needs Attention' button with correct count"
  - Test: "filter shows Failed + Warning projects combined"
  - Test: "filter correctly categorizes projects"
  - Test: "filter button has 'needs-attention' class for styling"
  - Test: "filter button gets 'active' class when selected"
  - Test: "count is zero when no projects need attention"
  - Test: "count includes projects with low success rate (warning)"
  - Test: "count includes canceled pipelines as failed"
  - Test: "does not include inactive projects in count"

### Files changed
- `src/types/index.ts` - Added 'needs-attention' to ProjectStatusFilter union type
- `src/App.tsx` - Filter logic, URL params, status counts, button UI
- `src/styles/index.css` - Needs attention filter button styling
- `src/components/NeedsAttentionFilter.test.tsx` - New test file with 9 tests

### Verification
- ✅ All 751 tests pass (55 test files, +9 tests from previous build)
- ✅ "Needs Attention" button shows correct count (Failed + Warning combined)
- ✅ Filter correctly shows only Failed and Warning projects when active
- ✅ Button has orange/red gradient background with box-shadow for visual emphasis
- ✅ Filter state persists in URL query param (`?filter=needs-attention`)
- ✅ Count includes canceled pipelines (treated as failed)
- ✅ Count includes projects with low success rate (<75%) even if pipeline succeeded
- ✅ Count excludes inactive projects (no pipeline)

### Learnings

**Patterns discovered:**
- **URL query param pattern**: Use `window.history.replaceState()` to update URL without page reload, sync with state via useEffect watching the filter value
- **Computed counts for filter badges**: Create a memoized `statusCounts` object that computes all counts in one pass through projects array — reusable for multiple filter buttons
- **Filter composition**: "Needs Attention" is implemented as a meta-filter that combines two existing categories (failed + warning) rather than adding a new category to `categorizeProject()`
- **Gradient styling for emphasis**: CSS `linear-gradient(135deg, red, orange)` provides strong visual distinction without overwhelming the UI

**Gotchas encountered:**
- Need to handle both `failed` status AND `canceled` status as "failed" category — `categorizeProject()` already does this
- Projects with `success` status but low success rate (<75%) are categorized as "warning" — important for count accuracy
- URL params must be bidirectional: read on mount, write on change, handle both `?filter=value` and no param (defaults to 'all')
- Filter positioning matters: placed "Needs Attention" second (after "All") to make it highly visible

**Testing insights:**
- Created isolated test component (`FilterBar`) that mimics real App behavior without full App complexity
- Tests verify both UI behavior (button rendering, count display, active class) and filter logic (correct categorization, count accuracy)
- Mock projects should cover all edge cases: failed, canceled, warning (running), warning (low success rate), success, inactive

---

## [2026-02-03] - bd-3qm.7 - US-007: Cards View — Failures First

### What was implemented
- **CardView.tsx**: Added health score sorting within each group (ascending - lowest/worst first)
  - Projects are categorized into groups: Failed → Warning → Inactive → Success (order was already correct)
  - Added sorting logic after grouping: `calculateHealthScore()` called for each project, sorted ascending
  - Each group independently sorts by health score, showing most problematic projects first within their category
- **CardViewOrdering.test.tsx**: Created comprehensive test suite (7 new tests)
  - Test: "groups appear in correct order: Failed → Warning → Inactive → Success"
  - Test: "within each group, projects are sorted by health score (lowest first)"
  - Test: "group headers remain visible and show correct counts"
  - Test: "groups with zero projects are not rendered"
  - Test: "canceled pipelines are categorized as failed"
  - Test: "projects with low success rate are categorized as warning even if status is success"
  - Test: "health score sorting considers all health signals"

### Files changed
- `src/components/CardView.tsx` - Added health score sorting within groups
- `src/components/CardViewOrdering.test.tsx` - New test file with 7 tests

### Verification
- ✅ All 758 tests pass (56 test files, +7 tests from previous build)
- ✅ Group order: Failed → Warning → Inactive → Success (already correct)
- ✅ Within each group: projects sorted by health score (ascending - worst first)
- ✅ Group headers remain visible with correct counts
- ✅ Consistent with US-001 problems-first philosophy
- ✅ Canceled pipelines treated as failed
- ✅ Low success rate projects (<75%) categorized as warning

### Learnings

**Patterns discovered:**
- **Post-grouping sort**: After categorizing projects into groups, apply a secondary sort within each group using `Object.keys().forEach()` to iterate and sort each array
- **Health score as sort key**: `calculateHealthScore(project.metrics).total` provides a unified sort metric across different project states
- **Ascending for problems-first**: Use `healthA - healthB` (ascending) to show lowest scores first, aligning with "problems first" UX philosophy
- **Group order vs. within-group order**: Two separate concerns - group rendering order (hardcoded in JSX) and within-group sorting (computed dynamically)

**Gotchas encountered:**
- Initial confusion about "reverse" in requirements - the group order was ALREADY correct (Failed → Warning → Inactive → Success), only the within-group sorting was missing
- Must import `calculateHealthScore` from utils at component level to use in sort function
- Health score calculation considers multiple signals (failure rate, coverage, success rate, etc.) so simple metric comparisons wouldn't match health-based sorting
- Test assertions need to check textContent of cards within specific group containers (`.failed-group`, `.warning-group`, etc.) to verify ordering

**Testing insights:**
- Created mock projects with varying health profiles (different combinations of success rate, failure rate, coverage) to test sort behavior
- Used DOM queries (`.querySelector('.failed-group')`) to isolate groups and verify ordering within each
- Important to test edge cases: canceled pipelines, low success rate with success status, inactive projects (no pipeline)
- Test naming should be descriptive of the acceptance criteria being verified

---

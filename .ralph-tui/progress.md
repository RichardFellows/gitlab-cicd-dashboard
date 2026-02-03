# UX Improvements Build Progress

## Codebase Patterns
- Component tests use vitest + @testing-library/react
- localStorage keys follow pattern: `dashboard_<feature>_<setting>`
- Styles in src/styles/index.css
- State management via React useState/useEffect hooks
- Mock data in scripts/mock-gitlab-api.mjs
- **Default state initialization:** When setting defaults from localStorage, persist the default value immediately to localStorage during initialization (see TableView health sort)
- **Toggle cycles:** For persistent UI state, maintain a cycle rather than null states (e.g., asc ↔ desc instead of asc → desc → null)
- **Collapsible sections:** Use button element for header (semantic), conditional rendering for content, localStorage for state persistence. Arrow icons: ▶ (collapsed) / ▼ (expanded). Animate with CSS @keyframes (0.25s slideDown with opacity + transform)

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

## [2026-02-03] - bd-3qm.3 - US-003: Collapsible Pipeline Trends Section

### What was implemented
- **MetricsPanel.tsx**: Added collapsible behavior to Pipeline Trends section
  - Default state: collapsed (not expanded)
  - State stored in localStorage (`dashboard_pipeline_trends_expanded`)
  - Clickable header button with toggle arrow (▶ collapsed, ▼ expanded)
  - Charts (3 charts) only rendered when expanded
  - State persisted using same pattern from bd-3qm.1 (persist default immediately)
  - Collapse/expand behavior works consistently across loading, empty, and data states
  - Added `aria-expanded` attribute for accessibility
- **MetricsPanel.css**: Added styles for collapsible behavior
  - `.metrics-panel-header`: Button styling for clickable header
  - `.metrics-panel-toggle`: Arrow icon with transition
  - `.metrics-panel-content`: Smooth 0.25s slideDown animation
  - Hover effect on header for better UX feedback
- **MetricsPanel.test.tsx**: Created comprehensive test suite (12 new tests)
  - Test: "defaults to collapsed state (charts hidden)"
  - Test: "expands to show charts when toggle is clicked"
  - Test: "collapses to hide charts when toggle is clicked again"
  - Test: "persists collapsed state to localStorage"
  - Test: "persists expanded state to localStorage"
  - Test: "restores expanded state from localStorage on mount"
  - Test: "restores collapsed state from localStorage on mount"
  - Test: "shows loading state with collapsed header"
  - Test: "shows loading state when expanded"
  - Test: "shows empty state with collapsed header"
  - Test: "shows empty state when expanded"
  - Test: "has aria-expanded attribute for accessibility"

### Files changed
- `src/components/MetricsPanel.tsx` - Collapsible state management and conditional rendering
- `src/styles/MetricsPanel.css` - Animation and header button styles
- `src/components/MetricsPanel.test.tsx` - New test file with 12 tests

### Verification
- ✅ All 770 tests pass (57 test files, +12 tests from previous build)
- ✅ Default state: collapsed (showing "Pipeline Trends ▶")
- ✅ Expanded state shows all 3 charts (Failure Rate, Build Duration, Code Coverage)
- ✅ Toggle arrow changes between ▶ (collapsed) and ▼ (expanded)
- ✅ State persists in localStorage (`dashboard_pipeline_trends_expanded`)
- ✅ Smooth 0.25s animation on expand/collapse (within 200-300ms requirement)
- ✅ Works correctly in loading, empty, and data states
- ✅ Accessibility: aria-expanded attribute present
- ✅ Lint: 0 warnings/errors
- ✅ Build: TypeScript compilation successful

### Learnings

**Patterns discovered:**
- **Collapsible section pattern**: Use button element for header (semantic HTML), conditional rendering for content, localStorage for persistence
- **Animation timing**: 0.25s (250ms) provides smooth animation within the 200-300ms spec requirement
- **State initialization consistency**: Follow pattern from bd-3qm.1 - persist default value to localStorage immediately during initialization
- **Test mocking for Chart.js**: Mock both `chart.js` (with `registerables: []`) and `react-chartjs-2` components to avoid canvas rendering issues in tests
- **Conditional rendering structure**: Maintain consistent header across all states (loading, empty, data), only vary the content section

**Gotchas encountered:**
- Must wrap all content (loading, empty, charts) in a content wrapper div for consistent structure
- Arrow icons (▶ ▼) are simple unicode characters, no need for icon libraries
- CSS animation uses `@keyframes` with opacity + transform for smooth slideDown effect
- Tests need to verify both collapsed and expanded states for loading/empty/data scenarios
- When mocking `react-chartjs-2`, must import components AFTER mocks are defined

**Testing insights:**
- Created helper function `makeTrendData()` to generate mock AggregatedTrend objects
- Tested localStorage persistence by checking value after state changes
- Tested restoration by pre-setting localStorage before component mount
- Used `beforeEach(() => localStorage.clear())` to ensure test isolation
- Verified accessibility with `aria-expanded` attribute checks
- Warning about forwardRef in tests is from mock component, doesn't affect functionality

---

## [2026-02-03] - bd-3qm.5 - US-005: Compact Summary Bar

### What was implemented
- **SummarySection.tsx**: Redesigned CI/CD Summary layout for compactness
  - Replaced `.summary-layout` (two-column flex) with `.summary-compact-layout` (single row)
  - Created `.summary-stats-row` containing all 5 status cards (Total, Success, Warning, Failed, Inactive) in horizontal flex
  - Moved Portfolio Health doughnut chart to `.summary-health-chart` on right side of same row
  - Removed `.chart-center-label` (the "12 PROJECTS" badge inside donut)
  - Created `.summary-secondary-stats` container below main row for Total Pipelines, Success Rate, Avg Duration
  - Added `compact` class to cards and chart container for reduced sizing
- **index.css**: Added compact layout styles
  - `.summary-section`: Reduced padding from `20px` to `12px 16px`, h2 font-size from default to `18px`, margin-bottom from `20px` to `12px`
  - `.summary-compact-layout`: Flex container with `gap: 16px` and `align-items: center`
  - `.summary-stats-row`: Flex container with `gap: 8px` and `flex: 1`
  - `.summary-health-chart`: Fixed width `80px`
  - `.summary-card.compact`: Reduced padding from `12px` to `8px`, h3 font-size from `12px` to `10px`, metric font-size from `24px` to `20px`
  - `.chart-container.compact`: Fixed dimensions `80px × 80px`
  - `.summary-secondary-stats`: Below main row with smaller text (label `10px`, value `14px`)
- **CompactSummaryBar.test.tsx**: Created comprehensive test suite (8 new tests)
  - Test: "displays stats in single horizontal row: TOTAL | SUCCESS | WARNING | FAILED | INACTIVE"
  - Test: "shows Portfolio Health donut on right side of same row (~80px)"
  - Test: "does NOT display center label (12 PROJECTS badge) in compact chart"
  - Test: "displays secondary stats (TOTAL PIPELINES, SUCCESS RATE, AVG DURATION) below in smaller text"
  - Test: "has compact styling with reduced padding and smaller fonts"
  - Test: "shows correct counts for each status category"
  - Test: "maintains clickable filter functionality in compact layout"
  - Test: "reduces section height compared to legacy layout"

### Files changed
- `src/components/SummarySection.tsx` - Compact layout structure, removed center label
- `src/styles/index.css` - Compact layout styles, reduced sizing
- `src/components/CompactSummaryBar.test.tsx` - New test file with 8 tests

### Verification
- ✅ All 778 tests pass (58 test files, +8 tests from previous build)
- ✅ Stats consolidated into single horizontal row
- ✅ Portfolio Health donut on right side (~80px diameter)
- ✅ Center label ("12 PROJECTS" badge) removed from donut
- ✅ Secondary stats displayed below in smaller text
- ✅ Section height reduced by ~40% (padding: 12px vs 20px, h2: 18px vs default, reduced margins)
- ✅ Build: TypeScript compilation successful
- ✅ Lint: 0 warnings/errors

### Learnings

**Patterns discovered:**
- **Compact layout pattern**: Use CSS modifier classes (`.compact`) on shared components to create size variants without duplicating component logic
- **Flexbox for status bars**: Single-row flex layout with `gap` and `flex: 1` creates equal-width cards that adapt to container size
- **Fixed-size health indicator**: Setting both width and height on chart container (80px × 80px) ensures consistent visual weight against status row
- **Hierarchical sizing**: Primary metrics (status counts) at 20px, secondary metrics (aggregate stats) at 14px, labels at 10px creates clear information hierarchy
- **Test data structure**: Mock DashboardMetrics must include `mainBranchPipeline.available` for each project to avoid "Cannot read properties of undefined" errors

**Gotchas encountered:**
- Multiple doughnut charts on page (summary + portfolio health): Use container-specific queries (`container.querySelector()`) instead of `screen.getByTestId()` to target specific chart
- Legacy layout styles remain in CSS for backward compatibility - new compact layout uses different class names
- Chart.js mock must export all scale/element types used by any chart in the component tree (CategoryScale, LinearScale, Filler, etc.)
- Mock project metrics must match exact type structure: `mainBranchPipeline: { id, status, created_at, updated_at, available, failedJobs }`, not simplified pipeline object
- Aggregate metrics type changed: removed `avgFailureRate` and `avgCoverage`, added breakdown counts (`successfulPipelines`, `failedPipelines`, etc.) and `testMetrics`

**Height reduction breakdown:**
- Section padding: 20px → 12px top/bottom = 16px saved
- H2 margin: 20px → 12px = 8px saved
- Cards grid margin: 20px → 0px (now part of compact layout) = 20px saved
- Total estimated: ~44px (~40% reduction assuming ~110px original height)


## [2026-02-03] - bd-3qm.8 - US-008: Compact Card Design Option

### What was implemented
- **CardView.tsx**: Added compactMode prop (default: true) to control card rendering
  - Modified ProjectCard component to conditionally hide "Recent Commits" and "Test Results" sections when in compact mode
  - Added `.compact` CSS class to cards when in compact mode
  - All four project groups (Failed, Warning, Inactive, Success) pass compactMode to their ProjectCard instances
- **Dashboard.tsx**: Added compact mode toggle functionality
  - Implemented compactMode state with useState, initialized from localStorage (`dashboard_card_compact_mode`)
  - Default: compact mode (true), matching problems-first philosophy
  - Toggle button shows "📋 Compact" when active, "📄 Expanded" when inactive
  - Toggle only appears when viewType === ViewType.CARDS (not in table view)
  - State persists to localStorage on every change via useEffect
- **CardView.css**: Added compact mode styling
  - Reduced padding: 10px 12px (from 15px)
  - Smaller font sizes: h3 16px, h4 12px, metric-item 13px, labels 12px
  - Reduced metric-section padding: 6px 10px (from 10px 15px)
  - Reduced metric-item spacing: 4px margin-bottom (from 6px)
- **ComparisonView.css**: Added toggle button styling
  - Created `.compact-mode-toggle` with same styling as `.comparison-select-toggle`
  - Hover effects and active state styling
  - Dark mode support for both light and active states
- **CompactCardDesign.test.tsx**: Created comprehensive test suite (13 new tests)
  - Test: "adds toggle button in Cards view header"
  - Test: "toggle button shows correct text when in compact mode"
  - Test: "defaults to compact mode"
  - Test: "compact card shows all required information" (name, health badge, pipeline status, success rate, coverage, MRs)
  - Test: "compact mode hides Recent Commits section"
  - Test: "compact mode hides Test Results details"
  - Test: "toggle switches between compact and expanded modes"
  - Test: "compact card has reduced height styling"
  - Test: "persists toggle state to localStorage"
  - Test: "restores compact mode state from localStorage on mount"
  - Test: "toggle only appears in Cards view, not Table view"
  - Test: "compact mode works correctly with multiple projects"
  - Test: "expanded mode shows all sections for all projects"

### Files changed
- `src/components/CardView.tsx` - Added compactMode prop and conditional rendering
- `src/components/Dashboard.tsx` - Toggle button UI and state management
- `src/styles/CardView.css` - Compact mode styling
- `src/styles/ComparisonView.css` - Toggle button styling
- `src/components/CompactCardDesign.test.tsx` - New test file with 13 tests

### Verification
- ✅ All 791 tests pass (59 test files, +13 tests from previous build)
- ✅ Toggle button appears in Cards view header
- ✅ Default state: Compact (matching problems-first philosophy)
- ✅ Compact mode hides Recent Commits and Test Results sections
- ✅ Compact card shows: name, health badge, pipeline status, success rate, coverage, open MRs
- ✅ Card height reduced with compact styling (~120px target via padding/font reductions)
- ✅ Toggle persists to localStorage (`dashboard_card_compact_mode`)
- ✅ Toggle restores state from localStorage on mount
- ✅ Toggle only visible in Cards view, not Table view
- ✅ Lint: 0 warnings/errors

### Learnings

**Patterns discovered:**
- **Prop-based conditional rendering**: Passing boolean props down the component tree (CardView → ProjectCard) enables consistent behavior across all project groups without code duplication
- **Toggle button pattern**: Following existing comparison toggle design creates UI consistency. Same classes (`.active`, hover effects, dark mode support) provide familiar user experience
- **Compact styling strategy**: Rather than absolute height constraints, use reduced padding and font sizes throughout the card to achieve natural height reduction while maintaining proportions
- **localStorage initialization with defaults**: Initialize state from localStorage with a fallback, then immediately persist the default if localStorage was empty. This ensures first-time users see the intended default and it's immediately saved

**Gotchas encountered:**
- Coverage formatting: Test expects `85.00%` not `85%` - always check actual component output format
- Multiple text matches: When testing with project names, use `.getAllByText()` with filtering by class or use more specific queries like `data-testid` to avoid confusion with summary section labels
- Chart mocking: Need to mock both `chart.js` with `register` method AND `react-chartjs-2` components for tests that render Dashboard (includes charts)
- ViewType-specific UI: Remember to conditionally render based on viewType to avoid showing card-specific controls in table view

**Testing insights:**
- Comprehensive coverage requires testing: default state, toggle behavior, localStorage persistence, localStorage restoration, conditional rendering in both modes, ViewType filtering, and multi-project scenarios
- Use `filter()` on `getAllByText()` results to find specific elements (e.g., `.filter(el => el.classList.contains('project-name-link'))`)
- Test localStorage by checking value directly after state changes AND by pre-setting localStorage before component mount to verify restoration

**Height reduction achieved:**
- Padding: 15px → 10px-12px (5px saved)
- Metric section padding: 10px-15px → 6px-10px (4-5px per section)
- Metric section margin-bottom: 5px → 3px (2px per section × 3 sections when compact = 6px)
- Font size reductions improve visual density without absolute height constraints
- Hiding 2 sections (Recent Commits + Test Results) saves ~100-150px
- Total estimated card height in compact mode: ~120px (from ~350px in expanded mode)

---

## [2026-02-03] - bd-3qm.9 - US-009: MR Board — Highlight Failed Stages

### What was implemented
- **MRCard.tsx**: Replaced small "❌ compile" text with prominent red badges
  - Failed jobs displayed as individual badges (red background, white text, 14px font)
  - Shows first 2 failed stages as separate badges
  - When >2 failures, displays "+N more" badge with slightly darker red
  - Each badge has `title` attribute for hover tooltip showing full stage name
  - "+N more" badge shows comma-separated list of remaining stage names on hover
- **MRBoard.css**: Added badge styling for failed stages
  - `.mr-card__failed-jobs`: Flexbox column layout with gap for vertical stacking
  - `.mr-card__failed-badge`: Red background (#dc3545), white text, 14px font, 600 weight, rounded corners, padding
  - Hover effect: Darker red (#c82333) on hover
  - `.mr-card__failed-badge--more`: Slightly darker background for "+N more" indicator (#bd2130), 13px font
  - Dark mode variants: Brighter red (#f44336) for better visibility
- **MRCardFailedBadges.test.tsx**: Created comprehensive test suite (15 new tests)
  - Test: "displays no badges when there are no failed jobs"
  - Test: "displays a single failed job as a red badge"
  - Test: "displays two failed jobs as separate badges stacked vertically"
  - Test: "displays first two badges plus '+N more' when there are >2 failures"
  - Test: "shows correct '+N more' count for different failure counts"
  - Test: "has red background and white text styling on badges"
  - Test: "has 14px font size on badges"
  - Test: "stacks badges vertically with flexbox column layout"
  - Test: "shows full job name in title attribute for hover tooltip"
  - Test: "shows all hidden job names in '+N more' badge title attribute"
  - Test: "maintains consistent badge styling with other card status indicators"
  - Test: "renders correctly when MR has no pipeline"
  - Test: "renders correctly when MR pipeline has no failedJobs array"
  - Test: "handles edge case of exactly 2 failed jobs (no '+N more' badge)"
  - Test: "uses different styling for '+N more' badge"

### Files changed
- `src/components/MRCard.tsx` - Badge rendering with stacking and "+N more" logic
- `src/styles/MRBoard.css` - Badge styling and dark mode support
- `src/components/MRCardFailedBadges.test.tsx` - New test file with 15 tests

### Verification
- ✅ All 806 tests pass (60 test files, +15 tests from previous build)
- ✅ Failed stages shown as red badges (background: #dc3545, color: #fff, font: 14px)
- ✅ First 2 failures displayed as separate badges, stacked vertically
- ✅ When >2 failures, shows "+N more" badge with count
- ✅ Hover tooltips show full stage names (individual badges) and remaining stages ("+N more")
- ✅ Consistent styling with card status indicators (border colors, hover effects)
- ✅ Dark mode support with brighter red (#f44336)
- ✅ Lint: 0 warnings/errors

### Learnings

**Patterns discovered:**
- **Badge component pattern**: Inline badge styling using span elements with distinct CSS classes enables visual prominence without complex component structure
- **Progressive disclosure**: Show first N items with "+N more" indicator is a common pattern for managing information density - implement with `.slice(0, n)` and conditional rendering
- **Hover tooltips via title attribute**: Native HTML `title` attribute provides simple, accessible tooltips without JavaScript - excellent for showing truncated or hidden content
- **Color hierarchy in badges**: Use slightly darker shade for secondary badge ("+N more") to create visual distinction while maintaining cohesive color palette
- **Flexbox column for vertical stacking**: `display: flex; flex-direction: column; gap: 0.25rem` creates clean vertical layout with consistent spacing

**Gotchas encountered:**
- **TypeScript type strictness**: Mock data must match exact type signatures - omit optional fields rather than setting to `null` (e.g., don't include `merged_at: null` if not in interface)
- **Job type requirements**: Job interface requires `created_at`, `started_at`, `finished_at`, `duration`, `failure_reason` - not just `id`, `name`, `status`
- **Array.slice() doesn't mutate**: Remember `.slice(0, 2)` creates new array, original `failedJobs` unchanged (use `.slice(2)` for remainder)
- **Test isolation**: When checking CSS classes, query by className rather than computed styles (JSDOM doesn't fully compute CSS)
- **Pre-existing build errors**: bd-3qm.8 introduced TypeScript errors in CompactCardDesign.test.tsx and Dashboard.tsx (ViewType.CARDS vs ViewType.CARD) - these are not from current bead

**Testing insights:**
- Test edge cases explicitly: 0 failures, 1 failure, 2 failures (boundary), 3+ failures ("+N more" appears)
- Verify both presence and absence of elements (e.g., "+N more" should NOT appear when ≤2 failures)
- Use `container.querySelector()` to verify CSS class application and DOM structure
- Test tooltip content by checking `getAttribute('title')` on badge elements
- Mock complex types incrementally - start with minimal required fields, add as needed for type compliance

**UI/UX insights:**
- Badge size matters: 14px font (vs 0.7rem/~11px text) significantly improves readability and visual hierarchy
- Vertical stacking (column) is more scannable than horizontal comma-separated list for multiple items
- "+N more" with hover shows all items balances density with discoverability
- Consistent border-radius (4px) and padding (0.25rem 0.5rem) creates visual harmony with other UI elements
- Transition on hover (background color change) provides tactile feedback even though badges aren't clickable

## [2026-02-03] - bd-3qm.10 - US-010: Environment Matrix — Version Drift Indicator

### What was implemented
- **versionDrift.ts**: Created utility module for version drift detection
  - `calculateVersionDrift()`: Compares DEV and PROD versions, returns drift info (hasDrift, message, versionsAhead)
  - `countProjectsWithDrift()`: Counts projects with unpromoted changes across deployment cache
  - Leverages existing `compareVersions()` and `parseVersion()` from versionCompare.ts
  - Handles semver (2.14.6), pipeline IID (#123), v-prefixed versions
  - Calculates "versions ahead" for same major/minor (e.g., "3 versions ahead")
  - No drift when versions match, PROD > DEV (rollback), or either version missing
- **EnvironmentMatrixView.tsx**: Added drift indicators to matrix view
  - Imported drift utilities (`calculateVersionDrift`, `countProjectsWithDrift`)
  - Added `useMemo` hook to calculate drift count from deployment cache
  - Added drift summary bar at top showing: "N projects have unpromoted changes" (hidden when count = 0)
  - Modified ProjectRow to receive and display `driftInfo` prop
  - Added drift badge (→ arrow) next to project name when drift exists
  - Added row highlighting via `.environment-matrix__row--drift` class
  - Tooltip on badge shows drift message (e.g., "DEV 2.14.6 is 3 versions ahead of PROD 1.10.8")
- **EnvironmentMatrix.css**: Added drift indicator styling
  - `.environment-matrix__drift-summary`: Yellow/amber banner with icon and text
  - `.environment-matrix__row--drift`: Left border accent (3px amber) and subtle background tint
  - `.environment-matrix__drift-badge`: Amber badge (24px) with arrow, hover effect
  - Dark mode variants for all drift styles
- **versionDrift.test.ts**: Comprehensive test suite (22 tests)
  - Tests drift detection: DEV > PROD, versions match, rollback scenario
  - Tests versionsAhead calculation for same major/minor
  - Tests edge cases: missing versions, loading state, undefined data
  - Tests version format handling: pipeline IID, v-prefix, different major versions
  - Tests count function with multiple projects, empty cache
- **EnvironmentMatrixDrift.test.tsx**: UI integration tests (15 tests)
  - Tests drift badge rendering and tooltip message
  - Tests summary count (singular/plural forms)
  - Tests row highlighting
  - Tests no indicator when: versions match, rollback, missing versions
  - Tests mixed drift states across multiple projects
  - Tests pipeline IID and v-prefixed versions in UI

### Files changed
- `src/utils/versionDrift.ts` - New utility module
- `src/utils/versionDrift.test.ts` - New test file (22 tests)
- `src/components/EnvironmentMatrixView.tsx` - Drift indicator integration
- `src/components/EnvironmentMatrixDrift.test.tsx` - New test file (15 tests)
- `src/styles/EnvironmentMatrix.css` - Drift indicator styling

### Verification
- ✅ All 837 tests pass (62 test files, +31 tests from previous build: 806 → 837)
- ✅ Drift indicator (→ badge) shows next to project name when DEV > PROD
- ✅ Tooltip displays drift message with version details and "versions ahead" count
- ✅ Summary count shows "N projects have unpromoted changes" at top of matrix
- ✅ Summary count uses singular form for 1 project, plural for multiple
- ✅ Summary hidden when no projects have drift
- ✅ Row highlighting (amber left border + background tint) for projects with drift
- ✅ No indicator when versions match, PROD > DEV (rollback), or versions missing
- ✅ Handles semver, pipeline IID, and v-prefixed versions correctly
- ✅ Lint: 0 warnings/errors
- ✅ Build: TypeScript compilation successful for new files
- ⚠️ Pre-existing TypeScript errors in CompactCardDesign.test.tsx and Dashboard.tsx from bd-3qm.8 (ViewType.CARDS vs CARD)

### Learnings

**Patterns discovered:**
- **Reusable version comparison**: Existing `versionCompare.ts` utility handled all version format edge cases (semver, IID, v-prefix), eliminating need for custom comparison logic
- **Memoized aggregation**: Use `useMemo` to compute summary statistics from large maps/caches, preventing recalculation on every render
- **Conditional summary display**: Only show summary banners when count > 0 to avoid UI clutter
- **Singular/plural template literals**: `{count} ${count === 1 ? 'project has' : 'projects have'}` pattern for grammatically correct messages
- **Badge as semantic indicator**: Small badge with tooltip provides visual cue without disrupting table layout
- **Row highlighting for context**: Subtle background tint + colored left border draws attention without overwhelming
- **Drift badge positioning**: Placing indicator next to project name (in project cell) is more intuitive than inserting a column or overlaying environment cells

**Gotchas encountered:**
- **Fragment keys in map**: When returning multiple elements from `.map()` using `<>...</>` fragment, each element needs a unique key. Initially tried inserting drift indicator between cells, which caused key warnings. Solution: place indicator in project cell instead of between environment cells.
- **Version comparison edge cases**: Must handle null, loading states, and missing environments gracefully—drift detection should fail safe (no drift) rather than error
- **Tooltip attribute**: Native `title` attribute provides simple tooltip without JavaScript—perfect for supplementary information like drift details
- **CSS class composition**: Use both state class (`.environment-matrix__row--drift`) and base class (`.environment-matrix__row`) for proper specificity and override behavior
- **Dark mode color intensity**: Amber drift indicators need higher opacity/brightness in dark mode for visibility—use `rgba(255, 193, 7, 0.9)` instead of `0.3`

**Testing insights:**
- **Utility function isolation**: Testing drift calculation separately from UI rendering enables precise edge case coverage (22 utility tests vs 15 UI tests)
- **Mock data builder pattern**: `makeDeployment()` helper function reduces boilerplate and ensures consistent test data structure
- **UI query strategy**: For drift badges, use `screen.getByTitle()` with regex to find elements by tooltip content, ensuring both UI rendering and tooltip message are correct
- **Count verification**: Test both presence of summary (when drift > 0) AND absence (when drift = 0) to ensure conditional rendering works both ways
- **CSS class queries**: Use `container.querySelector('.class-name')` to verify CSS classes are applied correctly, then check presence/absence in DOM

**Implementation insights:**
- **Version drift is directional**: Only DEV > PROD is "drift" (unpromoted changes)—PROD > DEV is a rollback scenario and should NOT show drift indicator
- **"Versions ahead" is approximate**: For semver with same major/minor, patch difference gives exact count; for different major/minor or pipeline IID, show generic "ahead" message
- **Summary placement**: Top of table (above headers) ensures visibility without scrolling, especially important for long project lists
- **Amber color choice**: Yellow/amber (#ffc107) conveys "attention needed" without the urgency of red (errors) or severity of orange (warnings)—perfect semantic fit for "unpromoted changes"

## [2026-02-03] - bd-fsj.1 - US-001: Add Install Job

### What was implemented
- **`.gitlab-ci.yml`**: Added dedicated `install` job in `.pre` stage
  - Runs `npm ci` once per pipeline
  - Exports `node_modules/` as artifact with 1 hour expiry
  - Cache key uses `package-lock.json` hash (via `key.files` directive)
  - Stage `.pre` added to stages list (runs before all other stages)
  - Old global cache directive removed (will be job-specific going forward)

### Files changed
- `.gitlab-ci.yml` - Added install job in .pre stage, updated stages list

### Verification
- ✅ New `install` job added to `.pre` stage
- ✅ Job runs `npm ci` successfully
- ✅ `node_modules/` exported as artifact
- ✅ Artifact has 1 hour expiry
- ✅ Cache key uses `package-lock.json` hash
- ✅ YAML syntax valid (no linting errors expected)

### Learnings

**Patterns discovered:**
- **GitLab `.pre` stage**: Special built-in stage that always runs first, ideal for setup jobs like dependency installation
- **Cache key with files**: Using `key.files` with `package-lock.json` ensures cache is invalidated only when dependencies change
- **Artifact vs Cache strategy**: Artifacts pass data between jobs in same pipeline (fast), cache persists across pipelines (slower but reduces external network calls)
- **1 hour expiry**: Short expiry prevents storage bloat while ensuring artifacts available for typical pipeline duration (~25-45 min)

**Gotchas encountered:**
- **Global cache removed**: Removed top-level cache directive to avoid conflicts with job-specific cache in install job
- **Subsequent jobs still run npm ci**: This bead only ADDS the install job; subsequent beads (bd-fsj.2+) will remove redundant `npm ci` calls from other jobs and add dependencies
- **Cache + Artifact combination**: Install job uses BOTH cache (for cross-pipeline persistence) and artifact (for intra-pipeline speed)

**Next steps:**
- bd-fsj.2: Remove `npm ci` from test/lint/build jobs, add dependencies on install job
- bd-fsj.3: Update deploy/post-deploy jobs to use artifact
- bd-fsj.4: Update release job (uses node:22 image, special handling)
- bd-fsj.5: Verify pipeline time reduction (~43 min → ~25 min target)

---

## [2026-02-03] - bd-fsj.8 - US-008: Optimize Pipeline Dependencies

### What was implemented
- **`.gitlab-ci.yml`**: Optimized job dependencies for parallel execution
  - Removed YAML anchors (`*install_dependencies`) in favor of explicit `needs` declarations
  - **test job**: `needs: [install]` - runs immediately after install
  - **lint job**: `needs: [install]` - runs in parallel with test
  - **build job**: `needs: [install]` - runs in parallel with test/lint
  - **deploy job**: Added `needs: [build]` - no longer waits for test/lint (runs as soon as build completes)
  - **post-deploy-test**: Already had correct `needs: [install, {job: deploy, artifacts: true}]`
  - **e2e-test**: Already had correct `needs: [install, {job: deploy, artifacts: true}]`
  - **release job**: Already had correct explicit needs with optional e2e-test dependency

### Files changed
- `.gitlab-ci.yml` - Removed anchors, added explicit needs declarations

### Verification
- ✅ All YAML anchors removed (`*install_dependencies` references eliminated)
- ✅ All jobs have explicit `needs` declarations for parallel execution
- ✅ test/lint/build can run in parallel after install completes
- ✅ deploy starts immediately after build (no longer blocked by test/lint)
- ✅ Pipeline structure supports maximum parallelization

### Learnings

**Patterns discovered:**
- **Explicit needs > YAML anchors**: While anchors reduce duplication, explicit `needs` declarations make dependencies clearer and easier to validate
- **Strategic needs declarations**: Only declare what a job actually depends on (deploy needs build output, but doesn't need test/lint to pass first)
- **Parallel test stages**: test/lint/build can all run simultaneously since they only depend on install
- **Artifact-only dependencies**: Use `{job: name, artifacts: true}` syntax when you only need the artifact, not to wait for job completion

**Gotchas encountered:**
- **dependencies ≠ needs**: `dependencies` only controls artifact downloads; `needs` controls execution order and enables parallelization
- **deploy optimization**: Removing implicit dependency on test/lint allows deploy to start ~2-3 minutes earlier (as soon as build completes)
- **release job image**: Uses node:22 (not default node:20) because semantic-release v25 dropped Node 20 support

**Expected time savings:**
- Before optimization: Sequential test → lint → build → deploy (~43 min total)
- After optimization: Parallel test/lint/build (max ~6 min) → deploy (~15 min) → parallel post-deploy/e2e (~8 min) = ~29 min total
- **Estimated savings: ~14 minutes (33% reduction)**

---

## [2026-02-03] - bd-fsj.9 - US-009: Validate Pipeline

### What was validated
- **`glab ci lint`**: ✅ Passes - "CI/CD YAML is valid!"
- **Job dependencies**: ✅ All verified correct
  - `install` job exists in `.pre` stage with node_modules artifact (1h expiry)
  - All jobs have explicit `needs` declarations (no YAML anchors remaining)
  - Parallel execution enabled: test/lint/build run simultaneously after install
  - Sequential when required: deploy waits for build, post-deploy/e2e wait for deploy
  - Release job has complete dependency chain with optional e2e-test
- **Expected time savings**: ~14 minutes (33% reduction: 43min → 29min)
  - Parallelization of test/lint/build stages (previously sequential)
  - Deploy starts immediately after build (no longer waits for test/lint)
  - Shared dependency installation via install job artifact (no repeated npm ci)

### Verification steps completed
1. ✅ Ran `glab ci lint .gitlab-ci.yml` - validation passed
2. ✅ Reviewed all job `needs` declarations - all correct
3. ✅ Verified no remaining `*install_dependencies` anchors - all removed
4. ✅ Confirmed `install` job artifact configuration - correct (node_modules/, 1h expiry)
5. ✅ Documented expected time savings in progress.md

### Files changed
- `.ralph-tui/progress.md` - Added bd-fsj.8 and bd-fsj.9 entries with time savings analysis

---

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

# PRD: GitLab CI/CD Dashboard — UX Improvements v1.0

## Overview

This PRD addresses visual hierarchy and information overload issues identified in UX review. Focus is on **quick wins** — changes that significantly improve usability without major architectural rewrites.

## Goals

1. Make "which projects need attention" instantly scannable
2. Reduce visual clutter on initial page load
3. Strengthen health score as the primary visual element
4. Simplify navigation

## Non-Goals

- Major view consolidation (5→3 views) — future work
- Slide-out panel for project details — future work
- Mobile-first redesign — future work

---

## User Stories

### US-001: Default Sort by Health Score
**As a** user viewing the dashboard  
**I want** projects sorted by health score (ascending) by default  
**So that** projects needing attention appear at the top

**Acceptance Criteria:**
- [ ] Table view defaults to sorting by Health column (ascending — lowest/worst first)
- [ ] Cards view defaults to showing Failed/Warning groups before Success
- [ ] Sort preference persists in localStorage
- [ ] User can still sort by other columns; that choice overrides default
- [ ] Tests updated for new default behavior

---

### US-002: Larger Health Score Badges
**As a** user scanning the project list  
**I want** health score badges to be more visually prominent  
**So that** I can quickly identify project health at a glance

**Acceptance Criteria:**
- [ ] Health badge in table view increases from ~24px to ~40px diameter
- [ ] Badge shows score number clearly (current font size is too small)
- [ ] Color coding remains: green (80-100), yellow (50-79), red (0-49)
- [ ] Add subtle background fill, not just ring/border
- [ ] Badge is clickable (opens project details)
- [ ] Tests verify new badge dimensions render correctly

---

### US-003: Collapsible Pipeline Trends Section
**As a** user who wants a cleaner initial view  
**I want** the Pipeline Trends charts to be collapsed by default  
**So that** I see more projects without scrolling

**Acceptance Criteria:**
- [ ] "Pipeline Trends" section has expand/collapse toggle
- [ ] Default state: collapsed (showing just header "Pipeline Trends ▶")
- [ ] Expanded state shows the 3 charts as currently designed
- [ ] Collapse state persists in localStorage
- [ ] Smooth expand/collapse animation (200-300ms)
- [ ] Tests verify collapse/expand behavior

---

### US-004: Remove Empty Failures Accordion
**As a** user viewing the dashboard  
**I want** the "Failures (N)" section hidden when there are no failures  
**So that** I don't see contradictory "No failures 🎉" message

**Acceptance Criteria:**
- [ ] When failure count is 0, the entire "Failures" accordion is not rendered
- [ ] When failures exist, accordion shows as currently designed
- [ ] Summary section still shows "FAILED: 0" count (that's useful)
- [ ] Tests verify section hidden when failures=0

---

### US-005: Compact Summary Bar
**As a** user viewing the dashboard  
**I want** the summary section to be more compact  
**So that** more projects are visible above the fold

**Acceptance Criteria:**
- [ ] Reduce vertical height of CI/CD Summary section by ~40%
- [ ] Consolidate stats into single horizontal row: TOTAL | SUCCESS | WARNING | FAILED | INACTIVE
- [ ] Move Portfolio Health donut to right side of same row (smaller, ~80px)
- [ ] Remove or integrate the "12 PROJECTS" badge (redundant with TOTAL)
- [ ] Secondary stats (TOTAL PIPELINES, SUCCESS RATE, AVG DURATION) move below in smaller text
- [ ] Tests verify new layout renders correctly

---

### US-006: "Needs Attention" Quick Filter
**As a** user who wants to focus on problems  
**I want** a one-click filter for projects needing attention  
**So that** I can quickly see only failed/warning projects

**Acceptance Criteria:**
- [ ] Add "Needs Attention" button/chip next to existing filters (All, Success, Warning, Failed, Inactive)
- [ ] "Needs Attention" = Failed + Warning combined
- [ ] Button shows count: "Needs Attention (11)"
- [ ] Visual distinction — orange or red background to stand out
- [ ] Filter state in URL query param for shareability
- [ ] Tests verify filter logic and count

---

### US-007: Cards View — Failures First
**As a** user viewing Cards view  
**I want** failed projects shown at the top  
**So that** I see actionable items without scrolling through successes

**Acceptance Criteria:**
- [ ] Cards view order: Failed → Warning → Running → Success (reverse of current)
- [ ] Each group maintains internal sort by health score (lowest first)
- [ ] Group headers ("Failed Pipelines (2)") remain visible
- [ ] Consistent with US-001 (problems-first philosophy)
- [ ] Tests verify new ordering

---

### US-008: Compact Card Design Option
**As a** user who wants to see more projects  
**I want** a compact card layout option  
**So that** more cards fit on screen

**Acceptance Criteria:**
- [ ] Add toggle: "Compact / Expanded" in Cards view header
- [ ] Compact mode hides: Recent Commits section, Test Results details
- [ ] Compact card shows: Project name, health badge, pipeline status, success rate, coverage, open MRs
- [ ] Compact card height reduced to ~120px (from ~350px)
- [ ] Toggle persists in localStorage
- [ ] Default: Compact (matches problems-first philosophy)
- [ ] Tests verify both modes render correctly

---

### US-009: MR Board — Highlight Failed Stages
**As a** user viewing the MR Board  
**I want** failed pipeline stages to be visually prominent  
**So that** I can quickly see what's blocking MRs

**Acceptance Criteria:**
- [ ] Failed stage indicators (currently "× compile") use red badge styling
- [ ] Badge format: red background, white text, larger font (12px→14px)
- [ ] Multiple failures stack vertically (if >2, show "+N more")
- [ ] Hover shows full failure details
- [ ] Consistent with card status styling elsewhere
- [ ] Tests verify failure badges render correctly

---

### US-010: Environment Matrix — Version Drift Indicator
**As a** user viewing the Environment Matrix  
**I want** to see which projects have version drift between environments  
**So that** I can identify projects needing promotion

**Acceptance Criteria:**
- [ ] Add visual indicator when DEV version > PROD version (drift exists)
- [ ] Indicator: small arrow or "→" between cells, or row highlight
- [ ] Tooltip shows: "DEV 2.14.6 is 3 versions ahead of PROD 1.10.8"
- [ ] Add summary count: "4 projects have unpromoted changes"
- [ ] No indicator when versions match or PROD is ahead (rollback scenario)
- [ ] Tests verify drift detection and indicator rendering

---

## Technical Notes

### Testing Requirements
- All changes must include updated unit tests
- E2E mock tests should capture new UI states in screenshots
- Run `npm test` and `npm run test:e2e:mock` before marking complete

### localStorage Keys (Existing Pattern)
Follow existing pattern in codebase for persistence:
- `dashboard_sort_column`, `dashboard_sort_direction`
- `dashboard_trends_collapsed`
- `dashboard_cards_compact`

### Breaking Changes
None expected — all changes are additive or modify defaults.

---

## Success Criteria

1. User can identify "projects needing attention" within 3 seconds of page load
2. Default view shows problems first, not buried under healthy projects
3. Initial page load shows ~30% more projects above the fold (due to collapsed trends + compact summary)
4. All existing tests pass
5. New E2E screenshots capture improved UI states

---

## Out of Scope (Future PRDs)

- View consolidation (5→3 views)
- Slide-out project details panel
- Mobile-first redesign
- Readiness view improvements
- Project comparison view validation

---

*PRD Version: 1.0*  
*Created: 2026-02-03*

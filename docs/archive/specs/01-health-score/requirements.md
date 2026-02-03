# Requirements: Pipeline Health Score & Project Grading

## Business Context

From INTERVIEW_NOTES.md: The organization has 60+ repositories and managers need to quickly identify which projects need attention. Currently, users must mentally combine multiple metrics (failure rate, coverage, duration spikes, MR backlog) to assess project health. There is no single at-a-glance indicator.

A composite Health Score eliminates this cognitive overhead and enables instant triage — managers can scan all projects and immediately spot the ones needing intervention.

---

## User Stories

### 1.1 Project Health Score

**As a** team lead  
**I want to** see a single health score (0-100) for each project  
**So that** I can instantly identify which projects need attention without analysing multiple metrics

**Acceptance Criteria:**
- [ ] Each project displays a numeric health score from 0 to 100
- [ ] Score is computed from weighted signals: main branch failure rate (30%), code coverage (25%), duration stability (15%), open MR backlog (15%), recent activity (15%)
- [ ] Score displayed as a coloured badge: 🟢 ≥80 / 🟡 50-79 / 🔴 <50
- [ ] Score visible on both Card and Table views
- [ ] Score updates when dashboard data refreshes
- [ ] Hovering/clicking the badge shows a breakdown of component scores

---

### 1.2 Health Score Breakdown

**As a** developer  
**I want to** understand why a project has a particular health score  
**So that** I can take targeted action to improve it

**Acceptance Criteria:**
- [ ] Expandable breakdown showing each signal's individual score (0-100) and weight
- [ ] Each signal shows current value alongside its score (e.g., "Coverage: 65% → 81/100")
- [ ] Signals that are dragging the score down are visually highlighted
- [ ] Breakdown accessible from the health badge (tooltip or expandable panel)

---

### 1.3 Portfolio Health Summary

**As an** engineering manager  
**I want to** see an aggregate health score across all my projects  
**So that** I can report overall team health in management reviews

**Acceptance Criteria:**
- [ ] Portfolio Health score displayed in the `SummarySection` component
- [ ] Calculated as weighted average of all project health scores (weighted by activity)
- [ ] Distribution chart showing how many projects fall in each health band (green/yellow/red)
- [ ] Optional: trend of portfolio health over time (if historical data available)

---

### 1.4 Sort and Filter by Health

**As a** user  
**I want to** sort projects by health score  
**So that** I can focus on the worst-performing projects first

**Acceptance Criteria:**
- [ ] Health score is a sortable column in TableView
- [ ] Projects can be sorted ascending (worst first) or descending (best first)
- [ ] Status filter supports filtering by health band (healthy/warning/critical)

---

## Technical Notes

- Entirely client-side computation — no new API calls required
- All input signals already available in existing `ProjectMetrics` interface:
  - `mainBranchFailureRate` (from `failedPipelines / totalPipelines`)
  - `codeCoverage.coverage`
  - `durationSpikePercent` / `baselineDuration`
  - `mergeRequestCounts.totalOpen`
  - `totalPipelines` (for recent activity proxy)
- Thresholds should use existing constants from `src/utils/constants.ts` where applicable
- Health score weights should be configurable via constants for future tuning
- Existing `MetricAlert` component pattern can be extended for health badge

## Out of Scope

- Server-side health score computation or storage
- Health score history/trending over time (defer to future data persistence feature)
- Custom per-project weight configuration
- Health score notifications or alerts (covered by Feature 4: Notification Rules)
- Comparison of health scores across teams (no multi-team view yet)

# Requirements: Comparison View (Side-by-Side)

## Business Context

From INTERVIEW_NOTES.md: With 60+ repositories, teams frequently need to compare metrics across similar projects — for instance, investigating why Project A's pipeline is 3x slower than Project B, or benchmarking coverage improvements across a set of microservices. Currently, users must open separate project detail panels and mentally switch between them.

A dedicated Comparison View enables direct side-by-side analysis, supporting benchmarking, root cause investigation, and cross-project standardisation efforts.

---

## User Stories

### 2.1 Select Projects for Comparison

**As a** developer  
**I want to** select 2-4 projects from the dashboard  
**So that** I can compare their metrics side-by-side

**Acceptance Criteria:**
- [ ] Checkbox selection on each project row (Card View) and row (Table View)
- [ ] "Compare Selected" button appears when 2+ projects are selected
- [ ] Maximum of 4 projects can be selected for comparison
- [ ] Selecting more than 4 shows a warning and disables further selection
- [ ] Selection state is preserved when switching between Card/Table views
- [ ] "Clear Selection" button to deselect all

---

### 2.2 Side-by-Side Metrics Comparison

**As a** team lead  
**I want to** see key metrics for selected projects laid out side-by-side  
**So that** I can quickly identify differences and outliers

**Acceptance Criteria:**
- [ ] Success rate trend charts overlaid (Chart.js multi-dataset line chart)
- [ ] Duration trend overlay chart
- [ ] Coverage comparison bar chart
- [ ] Pipeline count comparison
- [ ] MR backlog comparison
- [ ] Health score comparison (if Feature 1 is implemented)
- [ ] Each project uses a distinct colour for all its data series

---

### 2.3 Environment Deployment Comparison

**As an** engineering manager  
**I want to** compare deployment status across environments for selected projects  
**So that** I can see which projects are ahead or behind in their deployment pipeline

**Acceptance Criteria:**
- [ ] Side-by-side environment matrix showing deployed version per environment per project
- [ ] Visual indicator when one project has a newer version in lower envs but not promoted
- [ ] Deployment timestamps shown for comparison

---

### 2.4 MR Backlog Comparison

**As a** team lead  
**I want to** compare open MR counts and draft MR counts  
**So that** I can identify teams with review bottlenecks

**Acceptance Criteria:**
- [ ] Grouped bar chart showing total open MRs and draft MRs per project
- [ ] Colour coding: one colour for open, another for drafts
- [ ] Numbers displayed on bars for readability

---

## Technical Notes

- Comparison View is a new view mode alongside Card/Table/Environment/Readiness
- Trend data requires calling `DashboardDataService.getProjectPipelineTrends()` for each selected project
- Coverage and deployment data already available in `ProjectMetrics` and `DeploymentsByEnv`
- Chart.js multi-dataset charts: use `Line` chart with multiple datasets (each project = one dataset)
- Each project should have a distinct colour from a predefined palette
- Selection state managed in `App.tsx` as `Set<number>` of project IDs
- Consider using existing `TrendChart` component with multi-dataset support (it already supports `TrendDataset[]`)

## Out of Scope

- More than 4 projects in a single comparison (performance and readability limit)
- Exporting comparison results (covered by Feature 10: Exportable Reports)
- Saving comparison presets for quick re-access
- Comparing projects across different GitLab instances

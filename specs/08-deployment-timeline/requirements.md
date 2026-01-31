# Requirements: Deployment Timeline / Activity Feed

## Business Context

From INTERVIEW_NOTES.md: The existing Environment Matrix view (Priority 2) shows the current state — latest deployment per environment per project. But there's no history. Questions like "When did v2.3.44 go to UAT?" or "What changed while I was away?" require digging through GitLab directly.

A Deployment Timeline provides a chronological activity feed of all deployments across all projects, supporting post-incident review, change audit, and situational awareness for teams returning from weekends or holidays.

---

## User Stories

### 8.1 View Deployment Timeline

**As a** developer  
**I want to** see a chronological timeline of all deployments across all projects  
**So that** I can understand what has been deployed recently and in what order

**Acceptance Criteria:**
- [ ] Vertical timeline showing all deployments, newest first
- [ ] Each entry shows: project name, version, environment, status, timestamp, branch
- [ ] Timeline supports scrolling with lazy loading for older entries
- [ ] Date separators between days (e.g., "— Today —", "— Yesterday —", "— 28 Jan 2026 —")
- [ ] Visual indicators: green = success, red = failed, grey = rollback
- [ ] Total deployment count in the header

---

### 8.2 Filter Deployment Timeline

**As a** team lead  
**I want to** filter the timeline by project, environment, status, and date range  
**So that** I can focus on the deployments relevant to my investigation

**Acceptance Criteria:**
- [ ] Filter by project (multi-select dropdown)
- [ ] Filter by environment (dev/sit/uat/prod — multi-select)
- [ ] Filter by status (success/failed/rollback)
- [ ] Filter by date range (from/to date pickers)
- [ ] Filters applied immediately, results update in real-time
- [ ] Active filter count shown, "Clear Filters" button

---

### 8.3 Rollback Detection

**As an** engineering manager  
**I want to** see when a rollback occurred (older version deployed to an environment)  
**So that** I can identify incidents and investigate production issues

**Acceptance Criteria:**
- [ ] Detect when a deployment's version is lower than the previously deployed version for the same project+environment
- [ ] Mark rollback deployments with a distinct visual indicator (⏪ icon, grey/amber background)
- [ ] Rollback entry shows: "Rolled back from v2.3.45 to v2.3.40"
- [ ] Filter includes "rollback" as a status option

---

### 8.4 Deployment Detail

**As a** developer  
**I want to** click on a timeline entry to see full deployment details  
**So that** I can investigate the deployment without leaving the dashboard

**Acceptance Criteria:**
- [ ] Click/expand to show: full version, pipeline link, job link, branch, commit SHA, JIRA key
- [ ] Link to the merge request that triggered the deployment (if available)
- [ ] Link to the environment in GitLab
- [ ] Show time since deployment (relative)

---

## Technical Notes

- Deployment data source: same as Environment Matrix — `DashboardDataService.getProjectDeployments()` using `getProjectJobs()` from `GitLabApiService`
- Currently `getProjectDeployments()` only returns the latest deployment per environment per project — for timeline, we need **all recent deploy jobs**, not just the latest per env
- New method needed: `getProjectDeploymentHistory()` returning multiple deployments per environment
- `getProjectJobs()` with `per_page: 100` already returns recent jobs — filter to deploy jobs and return all (not just latest per env)
- Rollback detection: compare version numbers chronologically; if version(n) < version(n-1) for same project+env, it's a rollback
- Version comparison: handle semantic versioning (e.g., "2.3.45" vs "2.3.40") and fallback IIDs ("#123")
- Timeline is a new view or panel — consider as a sub-view within the Environment view or a separate view type

## Out of Scope

- Historical deployment data beyond what the GitLab Jobs API returns (typically last 100 jobs per project)
- Deployment duration analytics (time between environments)
- Deployment approval/gate tracking
- Real-time streaming of new deployments
- Cross-instance deployment tracking

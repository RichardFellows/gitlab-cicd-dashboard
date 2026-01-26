# Requirements: Environment Overview (Priority 2)

## Business Context

Teams need visibility into what version is deployed to each environment across all projects. Currently, this information is scattered across individual GitLab pipelines with no unified view. This feature replaces the functionality previously provided by Nolio's deployment dashboard.

Key questions this view answers:
- "What version is in prod for project X?"
- "Is this version deployed everywhere yet?"
- "Why is UAT behind DEV?"

---

## User Stories

### 2.1 Deployment Matrix View

**As a** team lead  
**I want to** see a matrix of all projects and their deployed versions per environment  
**So that** I can quickly assess deployment status across the estate

**Acceptance Criteria:**
- [ ] Grid showing projects as rows, environments as columns
- [ ] Display version number in each cell
- [ ] Column order: dev → uat → prod (configurable in future)
- [ ] Handle projects with no deploy jobs (show "No deployments")
- [ ] Handle environments with no deployments yet (show "-" or empty)

**Example visualization:**
```
| Project          | Dev    | UAT    | Prod   |
|------------------|--------|--------|--------|
| api-service      | 2.3.45 | 2.3.42 | 2.3.40 |
| frontend-app     | 1.8.12 | 1.8.10 | 1.8.10 |
| auth-service     | 1.0.5  | 1.0.4  | -      |
```

---

### 2.2 Deployment Details (Expanded Cell)

**As a** developer  
**I want to** click on a deployment cell to see more details  
**So that** I can investigate deployments without leaving the dashboard

**Acceptance Criteria:**
- [ ] Click cell → expand inline with details panel
- [ ] Show: version, timestamp, status (success/fail), branch name
- [ ] Link to GitLab deploy job
- [ ] Link to source branch/MR
- [ ] Extract and display JIRA issue key from branch name (e.g., `feature/JIRA-123-description`)
- [ ] JIRA key links to JIRA when base URL is configured, otherwise plain text

---

### 2.3 Failed Deployment Indicator

**As a** team lead  
**I want to** see when the latest deployment to an environment failed  
**So that** I can quickly identify problems

**Acceptance Criteria:**
- [ ] Failed deployments shown with red indicator
- [ ] Success shown with green indicator (or neutral)
- [ ] Failed status clearly visible in both collapsed and expanded views

---

### 2.4 Version from Deploy Artifact

**As a** the system  
**I need to** fetch the actual release version from deploy jobs  
**So that** users see meaningful version numbers, not just pipeline IDs

**Acceptance Criteria:**
- [ ] Fetch `deploy-info.json` artifact from deploy jobs
- [ ] Parse version from artifact JSON
- [ ] Fall back to pipeline IID if artifact not available
- [ ] Handle missing artifacts gracefully

**Prerequisite:** Shared pipeline modification to write `deploy-info.json`:
```yaml
deploy-job:
  after_script:
    - echo '{"version":"'$RELEASE_VERSION'"}' > deploy-info.json
  artifacts:
    paths:
      - deploy-info.json
    expire_in: 90 days
```

---

### 2.5 On-Demand Loading

**As a** user with 60+ projects  
**I want** the view to load efficiently  
**So that** I don't wait forever or hit rate limits

**Acceptance Criteria:**
- [ ] Initial view shows projects with basic info (from existing data)
- [ ] Deploy job details fetched on-demand when project row is visible or expanded
- [ ] Loading indicator while fetching deploy data
- [ ] Cache fetched deploy data for session

---

## Technical Notes

### Data Source
- Deploy jobs identified by job name regex: `/deploy.*(dev|sit|uat|prod)/i`
- Jobs API: `GET /projects/:id/jobs` filtered to deploy stage
- Artifacts API: `GET /projects/:id/jobs/:job_id/artifacts/deploy-info.json`

### Environment Detection
Standard environments: `dev`, `sit`, `uat`, `prod`
Extract from job name using regex, case-insensitive

### JIRA Integration
- JIRA base URL: configurable in settings (optional)
- Branch naming convention: `feature/JIRA-123-description`
- Regex to extract: `/([A-Z]+-\d+)/`

### View Integration
- New view type in existing dashboard (alongside Table/Card views)
- Same authentication model (user's GitLab token)
- Same project filtering (groups/projects sources)

---

## Out of Scope (v1)

- Deployment history (only show latest per environment)
- GitLab Environments API integration (using job parsing instead)
- Real-time updates / websockets
- Environment column reordering
- Custom environment names beyond dev/sit/uat/prod

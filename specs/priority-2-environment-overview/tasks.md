# Tasks: Environment Overview (Priority 2)

## Task Breakdown

Tasks ordered POC-first: prove the data flow works, then build the UI.

---

### Phase 0: Prerequisite — Pipeline Modification

> ⚠️ **External dependency**: This requires changes to the shared GitLab pipeline component, outside this repo.

- [ ] **T0.1** Add `deploy-info.json` artifact to deploy jobs in shared pipeline
  ```yaml
  after_script:
    - echo '{"version":"'$RELEASE_VERSION'"}' > deploy-info.json
  artifacts:
    paths:
      - deploy-info.json
    expire_in: 90 days
  ```

**Verification:** Run a deploy pipeline and confirm artifact is downloadable via GitLab UI.

**Note:** Dashboard can proceed without this — will fall back to pipeline IID. Mark as done once shared pipeline is updated OR decide to proceed with fallback only.

---

### Phase 1: API Layer

- [ ] **T1.1** Add `getProjectJobs()` method to GitLabApiService
  - Endpoint: `GET /projects/:id/jobs`
  - Support pagination and scope filtering
  - Add `Job` type if not complete (check `finished_at`, `pipeline` fields)

- [ ] **T1.2** Add `getJobArtifact()` method to GitLabApiService
  - Endpoint: `GET /projects/:id/jobs/:job_id/artifacts/:artifact_path`
  - Return parsed JSON or null on 404
  - Handle errors gracefully

- [ ] **T1.3** Add unit tests for new GitLabApiService methods
  - Mock API responses
  - Test error handling (404, 500)

**Verification:** `npm run lint && npm run build && npm test`

---

### Phase 2: Data Service Layer

- [ ] **T2.1** Add deployment types to `src/types/index.ts`
  - `EnvironmentName` type
  - `ENVIRONMENT_ORDER` constant
  - `Deployment` interface
  - `DeploymentsByEnv` interface
  - `DeployInfoArtifact` interface

- [ ] **T2.2** Add `DEPLOY_JOB_REGEX` constant to `src/utils/constants.ts`
  - Pattern: `/deploy.*?(dev|sit|uat|prod)/i`

- [ ] **T2.3** Add `parseDeployJobName()` to DashboardDataService
  - Extract environment from job name
  - Return null if not a deploy job

- [ ] **T2.4** Add `extractJiraKey()` to DashboardDataService
  - Extract JIRA key from branch name
  - Pattern: `/([A-Z]+-\d+)/`
  - Return null if no match

- [ ] **T2.5** Add `getProjectDeployments()` to DashboardDataService
  - Fetch jobs, filter to deploy jobs
  - Get latest per environment
  - Fetch artifact for version (with fallback)
  - Return `DeploymentsByEnv`

- [ ] **T2.6** Add unit tests for data service methods
  - Various job name formats
  - Various branch name formats
  - Mock job + artifact responses

**Verification:** `npm run lint && npm run build && npm test`

---

### Phase 3: UI Components

- [ ] **T3.1** Add `ENVIRONMENT` to `ViewType` enum

- [ ] **T3.2** Create `DeploymentCell.tsx` component
  - Display version + status indicator
  - Handle loading, empty, success, failed states
  - Click handler for expand

- [ ] **T3.3** Create `DeploymentDetails.tsx` component
  - Display full deployment info
  - Version, timestamp, status badge
  - Links: job, branch, JIRA (if configured)
  - Style for dark mode

- [ ] **T3.4** Create `EnvironmentMatrixView.tsx` component
  - Header row with environment columns
  - Project rows with DeploymentCell per column
  - Manage expanded state
  - On-demand loading when row rendered (IntersectionObserver or similar)

- [ ] **T3.5** Add component tests
  - DeploymentCell renders all states
  - DeploymentDetails shows all fields
  - EnvironmentMatrixView renders grid structure

**Verification:** `npm run lint && npm run build && npm test`

---

### Phase 4: Integration

- [ ] **T4.1** Add view type toggle for Environment view
  - Update ControlPanel or view selector
  - Icon for environment view

- [ ] **T4.2** Wire EnvironmentMatrixView into App.tsx
  - Add deployment cache state
  - Pass fetchProjectDeployments callback
  - Render when ViewType.ENVIRONMENT selected

- [ ] **T4.3** Add `jiraBaseUrl` to DashboardConfig
  - Optional field in config
  - Add input in ControlPanel (collapsible section)
  - Pass through to DeploymentDetails

- [ ] **T4.4** Add CSS styles for environment matrix
  - Grid layout
  - Cell states (success/failed/empty/loading)
  - Expanded details panel
  - Dark mode support

- [ ] **T4.5** Update E2E tests
  - Switch to Environment view
  - Verify grid renders
  - Expand/collapse detail panel

**Verification:** `npm run lint && npm run build && npm test && npx playwright test --project=chromium`

---

### Phase 5: Polish & Edge Cases

- [ ] **T5.1** Handle empty states
  - No projects: "No projects configured"
  - No deploy jobs: "No deployments found"
  - Project with partial environments: Show "-" in missing cells

- [ ] **T5.2** Loading UX
  - Skeleton loader for rows while fetching
  - Graceful degradation if artifact fetch fails

- [ ] **T5.3** Error handling
  - API errors shown inline (not blocking whole view)
  - Retry mechanism for failed fetches

- [ ] **T5.4** Performance
  - Virtualize long project lists if needed
  - Cache invalidation strategy (manual refresh button)

**Verification:** `npm run lint && npm run build && npm test && npx playwright test --project=chromium`

---

## Completion Criteria

All phases complete when:
```bash
npm run lint && npm run build && npm test && npx playwright test --project=chromium
```
Passes with 0 failures.

## Dependencies

- **Phase 0** (pipeline change) is external and can be deferred
- **Phases 1-2** can proceed in parallel
- **Phase 3** depends on Phase 2 (types + service methods)
- **Phase 4** depends on Phase 3 (components)
- **Phase 5** depends on Phase 4 (integration)

# Tasks: Promotion Readiness (Priority 3)

## Task Breakdown

Tasks ordered POC-first: prove sign-off parsing works, then build the view.

**Prerequisite:** Priority 2 (Environment Overview) should be complete or in progress, as this depends on deployment data.

---

### Phase 1: API Layer

- [ ] **T1.1** Add `getMergeRequestByBranch()` to GitLabApiService
  - Endpoint: `GET /projects/:id/merge_requests?source_branch=:branch&state=merged`
  - Return first match or null
  - Handle pagination if needed

- [ ] **T1.2** Add `getMergeRequestNotes()` to GitLabApiService
  - Endpoint: `GET /projects/:id/merge_requests/:iid/notes`
  - Filter to non-system notes
  - Return all notes (paginated fetch)

- [ ] **T1.3** Add `getRepositoryFile()` to GitLabApiService
  - Endpoint: `GET /projects/:id/repository/files/:path?ref=HEAD`
  - Base64 decode content
  - Return null on 404

- [ ] **T1.4** Add unit tests for new API methods
  - Mock responses
  - Test error handling

**Verification:** `npm run lint && npm run build && npm test`

---

### Phase 2: Sign-off Parsing

- [ ] **T2.1** Add sign-off types to `src/types/index.ts`
  - `Signoff`, `ParsedSignoff`, `MRNote`
  - `PostDeployTestStatus`, `ReadinessStatus`, `VersionReadiness`

- [ ] **T2.2** Add `SIGNOFF_REGEX` to `src/utils/constants.ts`
  - Pattern: `/^SIGNOFF:\s*v?([\d.]+)\s+(DEV|SIT|UAT|PROD)\s*$/im`

- [ ] **T2.3** Add `parseSignoffComment()` to DashboardDataService
  - Extract version and environment from comment body
  - Return null if no match

- [ ] **T2.4** Add `parseCodeowners()` to DashboardDataService
  - Extract usernames from CODEOWNERS content
  - Handle various formats (comments, paths, teams)

- [ ] **T2.5** Add `getCodeowners()` to DashboardDataService
  - Fetch CODEOWNERS file via API
  - Parse and cache result
  - Return empty array if file not found

- [ ] **T2.6** Add `getMRSignoffs()` to DashboardDataService
  - Fetch MR notes
  - Parse each for sign-off
  - Validate author against CODEOWNERS
  - Return list of valid sign-offs

- [ ] **T2.7** Add unit tests for parsing methods
  - Various sign-off formats (valid/invalid)
  - Various CODEOWNERS formats
  - Author validation

**Verification:** `npm run lint && npm run build && npm test`

---

### Phase 3: Readiness Calculation

- [ ] **T3.1** Add `getPostDeployTestStatus()` to DashboardDataService
  - Filter pipeline jobs to `post-deploy` stage
  - Check job status (success/failed)
  - Return exists=false if no post-deploy jobs

- [ ] **T3.2** Add `calculateReadinessStatus()` to DashboardDataService
  - Implement readiness logic per design doc
  - Handle all status combinations

- [ ] **T3.3** Add `getProjectReadiness()` to DashboardDataService
  - Orchestrate: deployments → MR → notes → sign-offs → tests
  - Build VersionReadiness objects
  - Handle missing data gracefully

- [ ] **T3.4** Add unit tests for readiness calculation
  - All status combinations
  - Missing MR, missing sign-off, missing tests

**Verification:** `npm run lint && npm run build && npm test`

---

### Phase 4: UI Components

- [ ] **T4.1** Add `READINESS` to `ViewType` enum

- [ ] **T4.2** Create `ReadinessFilter.tsx` component
  - Project dropdown
  - Environment dropdown
  - Status filter (all/ready/pending/failed)

- [ ] **T4.3** Create `ReadinessRow.tsx` component
  - Display version, environment, status badge
  - Show sign-off summary or "Pending"
  - Show test status badge
  - Click to expand

- [ ] **T4.4** Create `ReadinessDetails.tsx` component
  - Full deployment info
  - MR link and sign-off details
  - Test job link
  - What's blocking promotion

- [ ] **T4.5** Create `ReadinessView.tsx` component
  - Filter bar
  - Loading states
  - Empty state ("No versions to review")
  - List of ReadinessRow components

- [ ] **T4.6** Add component tests
  - Filter interactions
  - Status badge rendering
  - Expanded details

**Verification:** `npm run lint && npm run build && npm test`

---

### Phase 5: Integration

- [ ] **T5.1** Add view type toggle for Readiness view
  - Update view selector in ControlPanel/header
  - Icon for readiness view

- [ ] **T5.2** Wire ReadinessView into App.tsx
  - Add readiness cache state
  - Pass dependencies to ReadinessView
  - Render when ViewType.READINESS selected

- [ ] **T5.3** Add CSS styles for readiness components
  - Status badges (colors for ready/pending/failed)
  - Filter bar layout
  - Row and details styling
  - Dark mode support

- [ ] **T5.4** Update E2E tests
  - Switch to Readiness view
  - Filter interactions
  - Expand/collapse details

**Verification:** `npm run lint && npm run build && npm test && npx playwright test --project=chromium`

---

### Phase 6: Polish

- [ ] **T6.1** Handle edge cases
  - Project with no MRs
  - MR with no comments
  - Missing CODEOWNERS file
  - Multiple sign-offs (use latest valid one)

- [ ] **T6.2** Caching and performance
  - Cache CODEOWNERS per project
  - Cache MR lookups
  - On-demand loading for readiness data

- [ ] **T6.3** Error handling
  - API errors shown inline
  - Partial data still displayed
  - Retry mechanism

- [ ] **T6.4** UX improvements
  - Loading skeletons
  - "Copy sign-off command" helper?
  - Link to MR to add sign-off

**Verification:** `npm run lint && npm run build && npm test && npx playwright test --project=chromium`

---

## Completion Criteria

All phases complete when:
```bash
npm run lint && npm run build && npm test && npx playwright test --project=chromium
```
Passes with 0 failures.

## Dependencies

- **Priority 2** provides deployment data (version, environment, branch, pipeline)
- **Phase 1-2** can run in parallel
- **Phase 3** depends on Phase 1-2
- **Phase 4** depends on Phase 3 (types + service methods)
- **Phase 5** depends on Phase 4
- **Phase 6** depends on Phase 5

## Notes

- Sign-off format is strict: `SIGNOFF: v<version> <ENV>`
- Only CODEOWNERS members can provide valid sign-offs
- Post-deploy tests identified by `post-deploy` stage name
- MR found by matching deployment branch to MR source_branch

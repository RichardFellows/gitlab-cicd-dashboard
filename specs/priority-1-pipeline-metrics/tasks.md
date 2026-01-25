# Tasks: Priority 1 Pipeline Metrics Enhancement

## Task Breakdown

Tasks are ordered POC-first: make it work, then refine.

---

### Phase 0: E2E Test Fixes (BLOCKING)

- [ ] **T0.1** Fix `text=Groups` selector ambiguity
- [ ] **T0.2** Fix `input[placeholder*="Group ID"]` case sensitivity
- [ ] **T0.3** Fix default URL expectation mismatch

**Verification:** `npx playwright test e2e/dashboard.spec.ts --project=chromium` passes

---

### Phase 1.1: Main Branch Failure Tracking

- [ ] **T1.1.1** Add branch filter to pipeline fetching in GitLabApiService
- [ ] **T1.1.2** Calculate failure rate in DashboardDataService
- [ ] **T1.1.3** Add failure rate trend data to project metrics
- [ ] **T1.1.4** Display failure rate in TrendChart (reuse existing component)
- [ ] **T1.1.5** Add MetricAlert badge for high failure rate projects
- [ ] **T1.1.6** Add unit tests for failure rate calculation

**Verification:** Lint + Build + Unit tests pass

---

### Phase 1.2: Build Duration Trending

- [ ] **T1.2.1** Track duration per pipeline in data service
- [ ] **T1.2.2** Calculate duration trend (average over time windows)
- [ ] **T1.2.3** Display duration trend chart
- [ ] **T1.2.4** Add visual flag for duration spikes
- [ ] **T1.2.5** Unit tests for duration calculations

---

### Phase 1.3: Code Coverage Display

- [ ] **T1.3.1** Fetch coverage from pipeline API (already partially done?)
- [ ] **T1.3.2** Display coverage in project cards/table
- [ ] **T1.3.3** Add 80% threshold badge
- [ ] **T1.3.4** Handle 0% / missing coverage gracefully
- [ ] **T1.3.5** Optional: coverage trend chart

---

### Phase 1.4: Configurable Time Windows

- [ ] **T1.4.1** Add time window selector to ControlPanel
- [ ] **T1.4.2** Wire selector to state management
- [ ] **T1.4.3** Pass time window to all trend calculations
- [ ] **T1.4.4** Persist selection in localStorage
- [ ] **T1.4.5** Update E2E tests if needed

---

## Completion Criteria

All phases complete when:
```bash
npm run lint && npm run build && npm test && npx playwright test --project=chromium
```
Passes with 0 failures.

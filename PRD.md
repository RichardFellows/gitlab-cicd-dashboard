# PRD.md - Product Requirements Document

## Current Sprint: E2E Fixes + Priority 1 Pipeline Metrics

### Phase 0: Fix E2E Test Failures (BLOCKING)

- [ ] Fix `text=Groups` selector in e2e/dashboard.spec.ts:36 - use more specific selector like `label:has-text("Groups")` since current matches both label and "No groups added" text
- [ ] Fix `input[placeholder*="Group ID"]` in e2e/dashboard.spec.ts:103,164 - actual placeholder is "Enter group ID" (lowercase), use case-insensitive match
- [ ] Fix default URL expectation in e2e/dashboard.spec.ts:192 - test expects `https://gitlab.com` but app defaults to `https://gitlab.com/api/v4`

### Phase 1.1: Main Branch Failure Tracking

- [ ] Add branch filter to GitLabApiService pipeline fetching
- [ ] Calculate failure rate percentage in DashboardDataService
- [ ] Display failure rate trend using existing TrendChart component
- [ ] Add MetricAlert badge for high failure rate projects

### Phase 1.2: Build Duration Trending

- [ ] Track pipeline duration over time in data service
- [ ] Calculate average duration and trend
- [ ] Display duration trend chart
- [ ] Visual flag for duration spikes

### Phase 1.3: Code Coverage Display

- [ ] Fetch coverage from GitLab pipeline API
- [ ] Display coverage in project cards and table
- [ ] Add 80% threshold badge indicator
- [ ] Handle missing/zero coverage gracefully

### Phase 1.4: Configurable Time Windows

- [ ] Add time window selector (7/30/90 days) to ControlPanel
- [ ] Pass time window to all trend calculations
- [ ] Persist selection in localStorage

---

## Verification

Each task must pass:
```bash
npm run lint && npm run build && npm test
```

Phase 0 complete when:
```bash
npx playwright test e2e/dashboard.spec.ts --project=chromium
```
passes with 0 failures.

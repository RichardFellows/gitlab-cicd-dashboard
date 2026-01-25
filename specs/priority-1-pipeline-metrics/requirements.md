# Requirements: Priority 1 Pipeline Metrics Enhancement

## Business Context

From FEATURE_IDEAS.md and INTERVIEW_NOTES.md: The organization has targets for pipeline failures, code coverage, and build times. The dashboard needs trending metrics to track progress against these targets and identify regressions early.

---

## User Stories

### 1.1 Main Branch Failure Tracking

**As a** team lead  
**I want to** see failure rates for main/master branch pipelines over time  
**So that** I can track progress against our organizational failure rate targets

**Acceptance Criteria:**
- [ ] Filter pipeline data by branch (main/master)
- [ ] Calculate failure rate over configurable time window (default: 30 days)
- [ ] Display trend chart showing failure rate over time
- [ ] Visual flag (badge) for projects with high failure rates (>X% threshold)
- [ ] Threshold configurable or using sensible default

---

### 1.2 Build Duration Trending

**As a** developer  
**I want to** see how pipeline duration is trending over time  
**So that** I can identify slowdowns and regressions early

**Acceptance Criteria:**
- [ ] Track average pipeline duration per project over time
- [ ] Display trend chart showing duration changes
- [ ] Visual flag for duration spikes (>X% above baseline)
- [ ] Identify slowest pipelines in the group

---

### 1.3 Code Coverage Display

**As a** engineering manager  
**I want to** see code coverage for all projects including legacy ones  
**So that** I can ensure new code meets the 80% threshold

**Acceptance Criteria:**
- [ ] Pull coverage from GitLab coverage reporting API
- [ ] Display actual coverage percentage for all projects
- [ ] Handle projects with 0% or no coverage gracefully
- [ ] 80% threshold indicator (green/red badge)
- [ ] Optional: coverage trend over time

---

### 1.4 Configurable Time Windows

**As a** user  
**I want to** change the time window for all trending metrics  
**So that** I can analyze different time periods

**Acceptance Criteria:**
- [ ] Dropdown/selector for time window
- [ ] Options: 7 days, 30 days, 90 days
- [ ] All trend calculations respect selected window
- [ ] Persisted in localStorage with other settings

---

## Technical Notes

- GitLab API endpoints: `/pipelines`, `/jobs`, coverage from pipeline response
- Existing `TrendChart.tsx` component can be reused
- Existing `MetricAlert.tsx` for visual flagging
- Thresholds defined in `src/utils/constants.ts`

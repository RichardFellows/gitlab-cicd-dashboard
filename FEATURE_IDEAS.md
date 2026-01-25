# GitLab CI/CD Dashboard - Feature Roadmap

This document outlines the prioritized feature roadmap based on product interviews and organizational needs.

> **Note**: See [INTERVIEW_NOTES.md](./INTERVIEW_NOTES.md) for detailed requirements and context from product discussions.

## Priority Overview

| Priority | Category | Business Driver |
|----------|----------|-----------------|
| **1 (Highest)** | Pipeline Metrics | Organizational targets on failures, coverage, build times |
| **2** | Environment Overview | Replace Nolio dashboard, deployment visibility |
| **3** | Promotion Readiness | Ensure tested versions reach production |
| **4** | Sign-off Display | Governance and audit trail |

---

## Priority 1: Pipeline Metrics Enhancement

**Goal**: Provide trending metrics to track organizational targets and spot regressions.

### 1.1 Main Branch Failure Tracking
- [ ] Filter pipeline status by branch (emphasis on main/master)
- [ ] Failure rate calculation over configurable time window (default: 30 days)
- [ ] Trend chart showing failure rate over time
- [ ] Visual flagging for projects with high failure rates

### 1.2 Build Duration Trending
- [ ] Track pipeline duration over time
- [ ] Trend chart showing duration changes
- [ ] Visual flagging for duration spikes/regressions
- [ ] Ability to identify slowest pipelines

### 1.3 Code Coverage Display
- [ ] Pull coverage from GitLab coverage reporting
- [ ] Display actual coverage for all projects (including legacy with 0%)
- [ ] 80% threshold indicator for new code
- [ ] Coverage trend over time

### 1.4 Configurable Time Windows
- [ ] User-configurable time window for all trending metrics
- [ ] Default: 30 days
- [ ] Options: 7 days, 30 days, 90 days, custom

---

## Priority 2: Environment Overview

**Goal**: Matrix view showing what version is deployed to each environment across all projects.

> **Prerequisite**: GitLab Environments are not currently set up consistently across projects. The shared pipeline component will need to be extended to register deployments with GitLab Environments API before this feature can be fully utilized.

### 2.1 Deployment Matrix View
- [ ] Grid showing projects as rows, environments as columns
- [ ] Display version number in each cell
- [ ] Support variable environments per project (dev/sit/uat/prod)
- [ ] Handle projects with missing environments (e.g., no prod yet)

Example visualization:
```
| Project          | Dev    | SIT    | UAT    | Prod   |
|------------------|--------|--------|--------|--------|
| api-service      | 2.3.45 | 2.3.44 | 2.3.42 | 2.3.40 |
| frontend-app     | 1.8.12 | 1.8.12 | 1.8.10 | 1.8.10 |
| auth-service     | 1.0.5  | 1.0.5  | 1.0.4  | -      |
```

### 2.2 GitLab Environments Integration
- [ ] Fetch deployment data from GitLab Environments API
- [ ] Display deployment timestamp
- [ ] Link to source pipeline
- [ ] Link to commit SHA
- [ ] Link to source branch/MR

### 2.3 Version Tracking
- [ ] Track `$RELEASE_VERSION` from pipelines (built from `CI_PIPELINE_IID`)
- [ ] Version matches Nexus artifact version
- [ ] Show version progression across environments

### 2.4 JIRA Integration (Optional)
- [ ] Configurable JIRA base URL (optional)
- [ ] Extract issue key from branch names (e.g., `feature/JIRA-123-description`)
- [ ] Link to JIRA issue when configured
- [ ] Display issue key as text when JIRA not configured

---

## Priority 3: Promotion Readiness

**Goal**: Visualize whether a version has been tested in lower environments before promotion to production.

### 3.1 Environment Progression Tracking
- [ ] Track which environments a version has passed through
- [ ] Show pipeline status for each environment
- [ ] Indicate if version skipped environments

### 3.2 Promotion Eligibility View
- [ ] Visual indicator: ready for promotion vs. not ready
- [ ] List versions pending promotion per project
- [ ] Show what's blocking promotion (failed pipeline, missing environment)

### 3.3 Version History
- [ ] Timeline view of version deployments
- [ ] Track promotions between environments
- [ ] Handle rollbacks (deployment of previous version)

---

## Priority 4: Sign-off Status Display

**Goal**: Display approval status captured externally in JIRA and MRs.

### 4.1 Sign-off Status Indicator
- [ ] Simple status display per version/environment
- [ ] Manual toggle to mark as signed-off
- [ ] Record who marked sign-off and when

### 4.2 Sign-off Types
- [ ] Technical sign-off (from Technical Product Owner)
- [ ] Business sign-off (from key users)
- [ ] Different badge/indicator for each type

### 4.3 Future: JIRA Sign-off Integration
- [ ] Pull sign-off status from JIRA tickets
- [ ] Link to JIRA for evidence/details
- [ ] Auto-update status from JIRA webhooks

---

## Future Enhancements

These items are valuable but lower priority than the core features above.

### Data & Performance
- [ ] Historical data storage/caching for faster loads
- [ ] Data retention beyond GitLab API limits
- [ ] Background data refresh

### SonarQube Integration
- [ ] Direct SonarQube API integration
- [ ] New code coverage vs. overall coverage
- [ ] Quality gate status display

### Pipeline Insights
- [ ] Pipeline Stability Index (success rate, MTBF, infrastructure vs. code failures)
- [ ] Pipeline flakiness detection (intermittent test failures)
- [ ] Job-level drill-down for bottleneck identification

### Team Features
- [ ] PR/MR review time tracking
- [ ] Build fix time metrics (time to fix failed pipelines)
- [ ] Per-team/per-project filtering

### Reporting
- [ ] Export metrics to CSV/PDF
- [ ] Scheduled report generation
- [ ] Custom dashboard views

---

## Technical Notes

### Authentication
- Users provide their own GitLab personal access token
- Token determines data access permissions
- No centralized authentication required

### Multi-tenancy
- Teams configure their own GitLab groups
- Open access across teams
- No data segregation

### Deployment Target
- Internal deployment to OpenShift
- Also usable with public GitLab instances (gitlab.com)
- Desktop browsers only

### Data Sources
- GitLab API: pipelines, MRs, coverage, jobs
- GitLab Environments API: deployment tracking
- JIRA: issue links (optional, configurable)

---

## Archive: Original Feature Ideas

The following ideas from the original brainstorming have been incorporated or deferred:

| Original Idea | Status |
|--------------|--------|
| Migration Status Indicator | Deferred - migration complete |
| Before/After Comparison | Deferred - not current priority |
| Pipeline Stability Index | Incorporated in Future Enhancements |
| Pipeline Flakiness Detection | Incorporated in Future Enhancements |
| Duration Trend Analysis | **Priority 1.2** |
| Branch Coverage | Deferred |
| Coverage Trend Charts | **Priority 1.3** |
| Coverage Goals | **Priority 1.3** (80% threshold) |
| Coverage Gap Analysis | Deferred - SonarQube handles this |
| New Code Coverage | Future - requires SonarQube integration |
| Team Leaderboards | Deferred |
| PR Review Time | Incorporated in Future Enhancements |
| Build Fix Time | Incorporated in Future Enhancements |
| Custom Alert Thresholds | Deferred - visual flagging sufficient |
| Job-Level Insights | Incorporated in Future Enhancements |
| Infrastructure Cost Analysis | Deferred |
| Technical Debt Dashboard | Deferred |
| Weekly/Monthly Reports | Incorporated in Future Enhancements |

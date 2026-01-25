# Product Interview Notes - GitLab CI/CD Dashboard

**Date**: 2026-01-24
**Interviewee**: Richard (Technical Product Owner)
**Interviewer**: Claude

## Background & Context

### Migration Context
- Organization migrated from TeamCity/Bitbucket/Nolio to GitLab
- 60+ repositories migrated in a short timeframe
- Difficult to see the state of each project as a whole in GitLab's native UI
- Need to replace Nolio dashboard functionality for deployment visibility

### Current Deployment Landscape
- **Hybrid deployment targets**:
  - OpenShift clusters (Helm deployments) - non-prod and prod on separate clusters
  - Legacy Windows servers (PowerShell deployments)
- **Shared pipeline architecture**:
  - Shared pipeline components for building projects
  - Artifacts stored in Nexus (nuget/maven/npm/docker)
  - Separate deployment components for different targets
- **Version numbering**: Auto-generated using `$RELEASE_VERSION` built from `CI_PIPELINE_IID` and other inputs; same as Nexus artifact version

### Organizational Structure
- 60+ repos in one group owned by a single "application" team
- Other teams have their own groups with similar setups
- All teams should be able to use the same dashboard
- Open access across teams (no data segregation needed)

## Feature Priorities

Ranked by importance:

| Priority | Feature | Description |
|----------|---------|-------------|
| **D (Highest)** | Pipeline Metrics | Failure rates, build duration, code coverage |
| **A** | Environment Overview | What version is deployed where, across all projects |
| **B** | Promotion Readiness | Has a version passed through lower environments |
| **C (Lowest)** | Sign-off Status Display | Show approval status from JIRA/MRs |

## Detailed Requirements

### Priority D: Pipeline Metrics

#### Failure Tracking
- **Emphasis on main branch failures** (organizational target)
- Failure rate trending over time
- Default time window: 30 days
- Time window should be configurable

#### Build Duration
- Trending over time to spot regressions
- Goal is to reduce build times
- Visual flagging for spikes (no alerting needed)

#### Code Coverage
- Pull from GitLab's coverage reporting (SonarQube integration is future enhancement)
- 80% threshold for new code
- Legacy projects may have lower/no coverage - show actual values
- Show all projects with their real coverage, don't hide or exclude low-coverage projects

### Priority A: Environment Overview

#### Environment Structure
- **Windows path**: dev → uat → prod/dr
- **OpenShift path**: dev → sit → uat → prod
- Environment names are fairly standard but can vary per project
- New projects may not have all environments (e.g., no prod yet)

#### Desired Visualization
Matrix view showing version per environment:

| Project | Dev | SIT | UAT | Prod |
|---------|-----|-----|-----|------|
| api-service | 2.3.45 | 2.3.44 | 2.3.42 | 2.3.40 |
| frontend-app | 1.8.12 | 1.8.12 | 1.8.10 | 1.8.10 |

#### Data Source
- Use GitLab Environments API as the store
- Shared pipeline component can be extended to register deployments with GitLab Environments
- No separate database needed initially

#### Deployment Data to Capture
- Project ID/name
- Version number
- Environment name
- Timestamp
- Pipeline ID (for linking back)
- Status (success/failed)
- Source branch/MR that triggered the deployment
- Commit SHA
- JIRA issue key (extracted from branch name)

#### Branch Naming Convention
Feature branches must contain JIRA issue key:
- Format: `feature/JIRA-123-fancy-new-screen`
- Dashboard should extract and link to JIRA issue

### Priority B: Promotion Readiness

#### Requirements for Promotion
- Pipeline must complete successfully in lower environments
- Manual sign-off required where automated tests don't exist
- Automated integration and smoke tests are sparse but an upcoming priority

#### Rollbacks
- Handled as deployment of a different (previous) version
- No separate rollback tracking mechanism needed

### Priority C: Sign-off Status Display

#### Sign-off Process
- Captured externally in JIRA and MR comments/descriptions
- Developers capture manual test evidence
- Dashboard displays status only (doesn't capture sign-offs)

#### Sign-off Types
- **Technical sign-off**: From Technical Product Owner
- **Business sign-off**: From key users for business logic changes

#### Implementation Approach
- Simple manual toggle in dashboard acceptable (synced from verified JIRA/MRs)
- Full JIRA integration is a future enhancement

## Technical Constraints & Decisions

### Authentication
- Users supply their own GitLab personal access token
- No centralized auth - avoids project/repo permission complexity
- Each user's token determines what they can see

### Multi-tenancy
- Teams configure their own groups
- Open access - all teams can see all data
- No data segregation required

### Data Storage
- Start simple: fetch on-demand from GitLab API
- Storage/caching for historical data is a future enhancement
- GitLab Environments API serves as deployment store

### Deployment Target
- Internal use, eventually deployed to OpenShift
- Should be reusable for public GitLab instances as well
- Desktop browsers only (no mobile requirement)

### Timeline
- "When it's ready" - no fixed milestones

## Integration Points

### GitLab
- GitLab API for pipeline metrics, MR data, coverage
- GitLab Environments API for deployment tracking
- User-provided personal access tokens

### JIRA
- Extract issue key from branch names (e.g., `feature/JIRA-123-description`)
- Link to JIRA issues in dashboard
- Future: Pull sign-off status from JIRA

### Nexus
- Version numbers match Nexus artifact versions
- No direct integration needed initially (version comes from pipeline)

### SonarQube
- Currently used for coverage gates in pipelines
- Coverage values also reported to GitLab
- Direct SonarQube integration is a future enhancement

## Configuration

### JIRA Integration
- JIRA base URL should be **configurable and optional**
- When configured, dashboard extracts issue keys from branch names and creates links
- When not configured, issue keys are displayed as text only (no links)

## Resolved Questions

1. **Data retention**: Ideally hold all details indefinitely, but this is a future enhancement. Current status (on-demand from GitLab API) is sufficient for initial MVP.

2. **GitLab Environments setup**: Not currently set up in any consistent way. This will need to be standardized as part of the shared pipeline component work before the Environment Overview feature can be fully utilized.

## Out of Scope (for now)

- Alerting/notifications (visual flagging is sufficient)
- Mobile support
- Sign-off capture (display only)
- Direct SonarQube integration
- Historical data storage/caching
- Cross-team management views

## Next Steps

1. Update FEATURE_IDEAS.md with revised prioritized roadmap
2. Design environment overview matrix component
3. Define API contract for deployment registration
4. Plan shared pipeline component extensions

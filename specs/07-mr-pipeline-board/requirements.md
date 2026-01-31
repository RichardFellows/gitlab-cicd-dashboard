# Requirements: MR Pipeline Status Dashboard (MR-Centric View)

## Business Context

From INTERVIEW_NOTES.md: The existing dashboard views are project-centric. But developers and reviewers care about "what's the state of my MRs?" across multiple projects. With 60+ repositories, checking each project's merge requests individually is impractical. The `getProjectMergeRequests()` API is already implemented in `GitLabApiService` but only used in project detail drilldowns.

An MR-centric view gives developers a unified board to track all their open merge requests, their pipeline statuses, and review readiness — without switching between 60 GitLab project pages.

---

## User Stories

### 7.1 View All Open MRs Across Projects

**As a** developer  
**I want to** see all open merge requests across my configured projects in one view  
**So that** I can track the status of work-in-progress across the team

**Acceptance Criteria:**
- [ ] New "MR Board" view type accessible from the view type selector
- [ ] Shows all open MRs across all configured projects
- [ ] Each MR entry shows: title, project name, author, source branch, target branch, pipeline status, age
- [ ] MR count displayed in the view header
- [ ] Loading state while MRs are being fetched

---

### 7.2 MR Pipeline Status Grouping

**As a** team lead  
**I want to** see MRs grouped by their pipeline status  
**So that** I can quickly identify which MRs need attention

**Acceptance Criteria:**
- [ ] MRs grouped into columns/sections:
  - ✅ **Pipeline Passing**: MRs with successful head pipeline
  - ❌ **Pipeline Failing**: MRs with failed head pipeline
  - ⏳ **Pipeline Running**: MRs with running/pending pipeline
  - 📝 **Draft**: Draft MRs (regardless of pipeline status)
  - ❓ **No Pipeline**: MRs without an associated pipeline
- [ ] Each group shows count
- [ ] Groups displayed as columns (Kanban-style) or as collapsible sections

---

### 7.3 Filter and Sort MRs

**As a** developer  
**I want to** filter MRs by project, author, and status  
**So that** I can focus on the MRs relevant to me

**Acceptance Criteria:**
- [ ] Filter by project (multi-select dropdown)
- [ ] Filter by author (text search or dropdown)
- [ ] "My MRs Only" toggle — filters to MRs authored by a configured username
- [ ] Sort by: age (newest/oldest first), last activity, project name
- [ ] Filters and sort persisted in localStorage

---

### 7.4 MR Quick Actions

**As a** developer  
**I want to** quickly navigate to the MR or its pipeline from the board  
**So that** I can take action without searching through GitLab

**Acceptance Criteria:**
- [ ] Each MR entry has: link to MR in GitLab, link to head pipeline
- [ ] For failed pipelines: show failed job names inline (without clicking)
- [ ] Show most recent commit message for context
- [ ] Expandable detail panel showing full MR info (commits, pipeline details)

---

## Technical Notes

- New view type: `ViewType.MR_BOARD` added to the `ViewType` enum in `src/types/index.ts`
- Uses existing `GitLabApiService.getProjectMergeRequests()` — already fetches MRs with pipeline details
- MR data already includes `head_pipeline`, `author`, `source_branch`, `draft` status
- Fetches MRs for all projects in parallel — same pattern as `getMultiSourceMetrics`
- "My MRs" filter requires a configurable username — add to `DashboardConfig` or ControlPanel
- The `MergeRequest` type in `src/types/index.ts` already has all needed fields
- Consider pagination: if total MRs exceed 100, show "load more" or paginate

## Out of Scope

- Creating, approving, or merging MRs from the dashboard
- MR review assignments or reviewer tracking
- Code diff preview within the dashboard
- MR age metrics or time-to-merge analytics
- Cross-instance MR aggregation

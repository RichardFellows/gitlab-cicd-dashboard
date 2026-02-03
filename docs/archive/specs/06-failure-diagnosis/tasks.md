# Tasks: Pipeline Failure Diagnosis Panel

## Task Breakdown

Tasks ordered POC-first: prove log fetching and pattern matching work, then build the UI.

---

### Setup

- [ ] **T0.1** Add failure diagnosis types to `src/types/index.ts` — **S**
  - `FailureCategoryType`, `FailureCategory`, `FailureFrequency`, `HighlightedLine`
  - **Test:** Build passes

---

### Core Implementation

- [ ] **T1.1** Add `getJobTrace()` to `src/services/GitLabApiService.ts` — **M**
  - Endpoint: `GET /projects/:id/jobs/:job_id/trace`
  - Response type: `text/plain` — use `response.text()`
  - Add `Range: bytes=-102400` header to limit to last ~100KB
  - Handle 404 (job not found), 403 (no access) gracefully
  - Return empty string on error
  - **Test:** Unit test with mocked fetch — verify text response handling, error cases

- [ ] **T1.2** Create `src/utils/failureDiagnosis.ts` — **L**
  - Define `FAILURE_PATTERNS` constant: array of `{ category, patterns: RegExp[], confidence }`
  - Implement `categoriseFailure(logText: string): FailureCategory`
    - Scan log against patterns, return first match with highest confidence
    - Return 'unknown' if no match
  - Implement `highlightLog(logText: string, maxLines?: number): HighlightedLine[]`
    - Classify each line as error/warning/info/normal based on keywords
    - ERROR lines: `/error|fatal|fail|exception/i`
    - WARNING lines: `/warn|deprecat/i`
    - INFO lines: `/info|debug|notice/i`
    - Apply `maxLines` limit (default 100, from end of log)
  - Implement `extractLastLines(log: string, n: number): string`
  - **Test:** Unit tests for each pattern category, highlight classification, line extraction

- [ ] **T1.3** Implement `calculateFailureFrequency()` in `src/utils/failureDiagnosis.ts` — **M**
  - Accept `jobs: Job[]` (from `getProjectJobs`) and `targetJobName: string`
  - Filter jobs to matching name, count total and failed
  - Calculate `isFlaky`: failed count is > 0 but < 80% of total (inconsistent failures)
  - **Test:** Unit tests with various job arrays (all pass, all fail, flaky, no data)

---

### UI Components

- [ ] **T2.1** Create `src/components/JobLogViewer.tsx` — **L**
  - Props: `projectId`, `jobId`, `gitLabService`, `maxLines`, `darkMode`
  - On expand/mount: fetch log via `getJobTrace()`
  - Parse with `highlightLog()` for line-by-line highlighting
  - Render in monospaced, scrollable container (max-height 300px)
  - Line numbers in left margin
  - Error lines: red background, warning: yellow, normal: default
  - "View Full Log in GitLab" link at bottom
  - Loading spinner while fetching
  - Error state: "Log unavailable" with retry button
  - In-memory cache: store fetched logs to avoid re-fetching on collapse/expand
  - Add CSS in `src/styles/JobLogViewer.css`
  - **Test:** Component fetches log, renders highlighted lines, handles loading/error

- [ ] **T2.2** Create `src/components/FailureCategoryBadge.tsx` — **S**
  - Props: `category: FailureCategory`, `compact`
  - Render pill badge with icon and label
  - Colours: dependency=orange, infrastructure=red, test=blue, timeout=purple, unknown=grey
  - Tooltip with category description and matched pattern
  - **Test:** Renders correct icon/colour for each category type

- [ ] **T2.3** Create `src/components/FailureFrequencyIndicator.tsx` — **S**
  - Props: `failedCount`, `totalCount`, `compact`
  - Render "Failed X of last Y runs" or compact "X/Y"
  - Colour: green (≤1/10), yellow (2-4/10), red (≥5/10)
  - Tooltip with full text
  - **Test:** Renders correct text and colour for various frequencies

- [ ] **T2.4** Enhance `src/components/ProjectDetails.tsx` — **L**
  - For each failed job in `mainBranchPipeline.failedJobs`:
    - Add `FailureCategoryBadge` (category computed when log is fetched, or precomputed from failure_reason)
    - Add `FailureFrequencyIndicator` (fetched from job history on mount)
    - Add expandable "View Log" toggle → renders `JobLogViewer`
  - On mount: fetch recent jobs via `gitLabService.getProjectJobs(projectId, { per_page: 50 })` for frequency calculation
  - Compute frequency for each failed job name using `calculateFailureFrequency()`
  - Accept `gitLabService` prop (already available)
  - **Test:** Enhanced failed job display with badges and log viewer

- [ ] **T2.5** Create `src/components/FailureSummaryPanel.tsx` — **M**
  - Props: `projects: Project[]`, `onProjectSelect`, `darkMode`
  - Filter to projects with failed main branch pipeline (`mainBranchPipeline.status === 'failed'`)
  - For each: show project name, number of failed jobs, job names
  - Sort by number of failed jobs (descending)
  - Each row clickable → `onProjectSelect(projectId)`
  - "No failures 🎉" empty state
  - Add CSS in `src/styles/FailureSummaryPanel.css`
  - **Test:** Renders failed projects, hides when no failures, click fires callback

- [ ] **T2.6** Integrate `FailureSummaryPanel` into `src/components/SummarySection.tsx` — **S**
  - Add below existing MetricsPanel
  - Only render when there are projects with failed pipelines
  - Collapsible with "Failures (N)" header
  - **Test:** Panel appears when failures exist, hidden when none

---

### Tests

- [ ] **T3.1** Unit tests for `src/utils/failureDiagnosis.ts` — **L**
  - All pattern categories with sample log lines
  - Edge cases: empty log, very long log, no patterns matched
  - Highlight classification for mixed logs
  - Frequency calculation edge cases
  - File: `src/utils/failureDiagnosis.test.ts`

- [ ] **T3.2** Component tests for JobLogViewer — **M**
  - Mock `GitLabApiService.getJobTrace` response
  - Verify highlighted lines render correctly
  - Verify loading/error states
  - Verify caching (second expand doesn't re-fetch)
  - File: `src/components/JobLogViewer.test.tsx`

- [ ] **T3.3** Component tests for enhanced ProjectDetails — **M**
  - Mock failed jobs with categories and frequencies
  - Verify badges and indicators render
  - Verify log viewer toggle
  - Extend existing tests or new file

- [ ] **T3.4** Component tests for FailureSummaryPanel — **S**
  - Projects with/without failures
  - Sort order
  - Click navigation
  - File: `src/components/FailureSummaryPanel.test.tsx`

---

### Polish

- [ ] **T4.1** Dark mode styling — **S**
  - JobLogViewer already uses dark background — adjust highlight colours for dark context
  - Failure badges use brighter variants in dark mode
  - Summary panel adapted for dark background

- [ ] **T4.2** Log viewer enhancements — **M**
  - "Show more lines" button to load additional context (increase from 100 to 500)
  - Copy log to clipboard button
  - Search within log (simple Ctrl+F style, or highlight matching text)

- [ ] **T4.3** Performance — **S**
  - Log cache: `Map<number, string>` in component state — avoids re-fetching on collapse/expand
  - Frequency data: compute once on mount, memoize
  - Limit concurrent log fetches (max 2 at once)

- [ ] **T4.4** Update E2E tests — **M**
  - Navigate to project detail with failed pipeline
  - Expand log viewer
  - Verify category badge visible
  - Verify frequency indicator
  - Extend `e2e/dashboard.spec.ts`

---

## Completion Criteria

All tasks complete when:
```bash
npm run lint && npm run build && npm test && npx playwright test --project=chromium
```
Passes with 0 failures.

## Dependencies

- **T0.x** (Setup) → no dependencies
- **T1.x** (Core) → depends on T0.x
- **T2.x** (UI) → depends on T1.x
- **T3.x** (Tests) → in parallel with T2.x
- **T4.x** (Polish) → depends on T2.x
- Requires `getProjectJobs()` from `GitLabApiService` (already exists)
- `ProjectDetails.tsx` already shows failed jobs — this enhances rather than replaces

## Notes

- Job trace API returns plain text, not JSON — handle accordingly
- Large logs (10MB+) are a real concern — use Range header to limit fetch size
- Pattern detection is regex-based and intentionally simple — covers ~80% of common failures
- Failure frequency uses the existing `getProjectJobs()` method — no new API endpoints
- Category detection can also work on `job.failure_reason` for basic classification without fetching the full log
- The `FAILURE_PATTERNS` array is ordered by priority — first match wins

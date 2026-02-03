# Requirements: Pipeline Failure Diagnosis Panel

## Business Context

From INTERVIEW_NOTES.md: When a pipeline fails, the current dashboard shows the failure status and links to GitLab. But users leave the dashboard to investigate, breaking their workflow. The existing `ProjectDetails` component (`src/components/ProjectDetails.tsx`) already shows failed jobs with names, stages, and failure reasons, but doesn't provide the job logs or any categorisation of the failure.

A failure diagnosis panel pulls job logs directly into the dashboard and applies pattern-based categorisation, reducing context-switching and enabling faster triage without leaving the tool.

---

## User Stories

### 6.1 View Failed Job Logs

**As a** developer  
**I want to** see the last N lines of a failed job's log directly in the dashboard  
**So that** I can quickly understand why the job failed without opening GitLab

**Acceptance Criteria:**
- [ ] For each failed job in a pipeline, a "View Log" button is available
- [ ] Clicking "View Log" fetches and displays the last 100 lines of the job trace
- [ ] Log displayed in a monospaced, scrollable, code-style container
- [ ] Syntax highlighting for common patterns (ERROR, WARNING, FATAL)
- [ ] Full log available via "View Full Log in GitLab" link (existing `job.web_url`)
- [ ] Loading state shown while log is being fetched

---

### 6.2 Failure Pattern Detection

**As a** team lead  
**I want to** see an automatic categorisation of the failure type  
**So that** I can immediately know if it's a dependency issue, test failure, or infrastructure problem

**Acceptance Criteria:**
- [ ] Automatic pattern matching against job log content
- [ ] Categories:
  - 🔧 **Dependency Issue**: `npm ERR!`, `ENOENT`, `Cannot find module`, `EACCES`
  - 🏗️ **Infrastructure**: `FATAL:`, `Connection refused`, `Timeout`, `ECONNRESET`, `OOMKilled`
  - 🧪 **Test Failure**: `AssertionError`, `Expected ... to equal`, `FAIL`, `✗`, `× `
  - ⏱️ **Timeout**: `Job exceeded timeout`, `script exceeded`, `execution expired`
  - ❓ **Unknown**: no pattern matched
- [ ] Category displayed as a badge on each failed job
- [ ] Category is best-effort — shown as "suggested" not definitive

---

### 6.3 Failure Frequency Analysis

**As a** developer  
**I want to** know how often a specific job fails  
**So that** I can identify flaky jobs vs. one-off failures

**Acceptance Criteria:**
- [ ] For each failed job, show "Failed X of last Y runs" statistic
- [ ] Data derived from recent pipeline history for the same project
- [ ] Visual indicator: single failure (info), multiple (warning), persistent (danger)
- [ ] Helps distinguish flaky tests from genuine regressions

---

### 6.4 Failure Summary Dashboard

**As an** engineering manager  
**I want to** see a summary of all current failures across projects  
**So that** I can prioritise which failures to address first

**Acceptance Criteria:**
- [ ] Failure summary section showing all projects with failed main branch pipelines
- [ ] Each entry shows: project name, failed job names, failure categories, failure frequency
- [ ] Sorted by severity (persistent failures first, then frequent, then single)
- [ ] Quick link to project detail for each entry

---

## Technical Notes

- New GitLab API call: `GET /projects/:id/jobs/:job_id/trace` — returns plain text job log
- Job trace API returns the full log; client-side truncation to last N lines
- Pattern detection is regex-based, applied client-side to the log text
- Failure frequency requires checking historical job data — can reuse `getProjectJobs()` from `GitLabApiService`
- The existing `ProjectDetails.tsx` component (`src/components/ProjectDetails.tsx`) already renders failed jobs — extend it rather than replace
- Job log can be large (megabytes) — implement streaming or size-limited fetch
- Consider caching fetched logs in memory to avoid re-fetching on expand/collapse

## Out of Scope

- AI-based failure diagnosis or root cause analysis
- Auto-retry of failed jobs from the dashboard
- Log search across multiple jobs
- Persistent log storage (logs are fetched on-demand from GitLab)
- Custom pattern definitions (hardcoded patterns only in v1)

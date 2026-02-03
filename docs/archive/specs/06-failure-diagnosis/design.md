# Design: Pipeline Failure Diagnosis Panel

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ProjectDetails.tsx                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Existing: Failed Jobs List                                    │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │ FailedJobCard (enhanced)                              │    │   │
│  │  │  - Job name, stage, failure reason                    │    │   │
│  │  │  - FailureCategoryBadge (NEW)                         │    │   │
│  │  │  - FailureFrequency indicator (NEW)                   │    │   │
│  │  │  - JobLogViewer (NEW, expandable)                     │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ FailureSummaryPanel (NEW — in Dashboard or SummarySection)   │   │
│  │  - All projects with failed main branch pipelines            │   │
│  │  - Categorised, sorted by severity                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     src/utils/failureDiagnosis.ts                    │
│                                                                      │
│  - categoriseFailure(logText: string): FailureCategory              │
│  - highlightLog(logText: string): HighlightedLine[]                 │
│  - calculateFailureFrequency(jobs: Job[], targetJobName): FreqResult│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GitLabApiService.ts                             │
│                                                                      │
│  NEW METHOD:                                                         │
│  - getJobTrace(projectId, jobId): Promise<string>                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User opens ProjectDetails** → failed jobs already visible (existing behaviour)
2. **User clicks "View Log"** → `GitLabApiService.getJobTrace(projectId, jobId)` fetched
3. **Log returned** → Last 100 lines extracted, stored in component state cache
4. **Pattern detection** → `categoriseFailure(logText)` runs against the log text
5. **Display** → `JobLogViewer` renders highlighted log, `FailureCategoryBadge` shows category
6. **Failure frequency** → On ProjectDetails mount, fetch job history → `calculateFailureFrequency()` per failed job
7. **Summary panel** → Aggregates failure data across all projects in current `DashboardMetrics`

## Component Structure

### New Components

#### `src/components/JobLogViewer.tsx`

Scrollable, syntax-highlighted job log viewer.

```typescript
interface JobLogViewerProps {
  projectId: number;
  jobId: number;
  gitLabService: GitLabApiService;
  maxLines?: number;          // Default 100
  darkMode?: boolean;
}
```

**State:**
- `log: string | null` — fetched log text
- `loading: boolean`
- `error: string | null`

**Behaviour:**
- Fetch log on mount or when expanded
- Extract last N lines from full log
- Apply line-by-line highlighting
- Scrollable container with monospaced font
- "View Full Log in GitLab" link at bottom

#### `src/components/FailureCategoryBadge.tsx`

Badge showing the detected failure category.

```typescript
interface FailureCategoryBadgeProps {
  category: FailureCategory;
  compact?: boolean;
}
```

**Display:**
- Icon + label for each category
- Tooltip with explanation
- Colour-coded: red for infrastructure, orange for dependency, blue for test, grey for unknown

#### `src/components/FailureFrequencyIndicator.tsx`

Shows how often a job fails.

```typescript
interface FailureFrequencyIndicatorProps {
  failedCount: number;
  totalCount: number;
  compact?: boolean;
}
```

**Display:**
- "Failed X of last Y runs" text
- Colour: green (1/10), yellow (3/10), red (≥5/10)
- Compact mode: just "X/Y" with colour

#### `src/components/FailureSummaryPanel.tsx`

Cross-project failure summary for the dashboard overview.

```typescript
interface FailureSummaryPanelProps {
  projects: Project[];
  onProjectSelect: (projectId: number) => void;
  darkMode?: boolean;
}
```

**Display:**
- List of projects with failed main branch pipelines
- For each: project name, failed job names, categories (if logs fetched), frequency
- Sorted by: number of failed jobs (descending), then persistence (frequent failures first)
- Click to navigate to project detail

### Modified Components

#### `src/components/ProjectDetails.tsx`
- Enhance existing failed jobs section
- Wrap each failed job in an enhanced card with:
  - Existing: job name, stage, failure reason, link
  - New: `FailureCategoryBadge` (shown after log is fetched or proactively)
  - New: `FailureFrequencyIndicator`
  - New: Expandable `JobLogViewer`
- Add failure frequency computation on mount

#### `src/components/SummarySection.tsx` or `src/components/Dashboard.tsx`
- Optionally add `FailureSummaryPanel` below existing summary when there are failures
- Show/hide based on whether any projects have failed main branch pipelines

## Type Definitions

### New types in `src/types/index.ts`

```typescript
export type FailureCategoryType =
  | 'dependency'       // npm/package/module errors
  | 'infrastructure'   // connection, memory, system errors
  | 'test-failure'     // assertion and test framework errors
  | 'timeout'          // execution time exceeded
  | 'unknown';         // no pattern matched

export interface FailureCategory {
  type: FailureCategoryType;
  icon: string;            // Emoji
  label: string;           // Human-readable label
  matchedPattern: string;  // The pattern that matched (for debugging)
  confidence: 'high' | 'medium' | 'low';
}

export interface FailureFrequency {
  jobName: string;
  failedCount: number;
  totalCount: number;
  isFlaky: boolean;        // true if fails inconsistently
}

export interface HighlightedLine {
  text: string;
  level: 'error' | 'warning' | 'info' | 'normal';
  lineNumber: number;
}
```

## New Utility: `src/utils/failureDiagnosis.ts`

### Pattern Definitions

```typescript
export const FAILURE_PATTERNS: Array<{
  category: FailureCategoryType;
  patterns: RegExp[];
  confidence: 'high' | 'medium' | 'low';
}> = [
  {
    category: 'dependency',
    patterns: [
      /npm ERR!/i,
      /ENOENT/,
      /Cannot find module/i,
      /EACCES/,
      /Module not found/i,
      /Could not resolve dependency/i,
      /ERESOLVE/,
      /No matching version/i,
      /nuget.*not found/i,
      /package.*restore.*failed/i,
    ],
    confidence: 'high',
  },
  {
    category: 'infrastructure',
    patterns: [
      /FATAL:/,
      /Connection refused/i,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /OOMKilled/i,
      /out of memory/i,
      /disk space/i,
      /No space left on device/i,
      /cannot allocate memory/i,
      /service unavailable/i,
    ],
    confidence: 'high',
  },
  {
    category: 'test-failure',
    patterns: [
      /AssertionError/,
      /Expected .* to equal/i,
      /FAIL\s/,
      /✗|×\s/,
      /\d+ failing/,
      /Test.*failed/i,
      /assert\..*Error/,
      /expect\(.*\)\./,
    ],
    confidence: 'high',
  },
  {
    category: 'timeout',
    patterns: [
      /Job exceeded timeout/i,
      /script exceeded/i,
      /execution expired/i,
      /timed? ?out/i,
      /deadline exceeded/i,
    ],
    confidence: 'high',
  },
];
```

### Functions

```typescript
/**
 * Categorise a failure based on log content
 * Scans log text against known patterns, returns first match
 */
export function categoriseFailure(logText: string): FailureCategory

/**
 * Highlight log lines with severity levels
 * Applies line-by-line classification for syntax highlighting
 */
export function highlightLog(logText: string, maxLines?: number): HighlightedLine[]

/**
 * Calculate how often a specific job fails
 * @param jobs - Recent jobs for the project
 * @param targetJobName - The job name to check
 */
export function calculateFailureFrequency(
  jobs: Job[],
  targetJobName: string
): FailureFrequency

/**
 * Extract the last N lines from a log string
 */
export function extractLastLines(log: string, n: number): string
```

## API Integration Points

### New: `GitLabApiService.getJobTrace()`

```typescript
/**
 * Get the trace (log) of a specific job
 * Endpoint: GET /projects/:id/jobs/:job_id/trace
 * Returns plain text log content
 */
async getJobTrace(
  projectId: string | number,
  jobId: string | number,
  maxBytes?: number       // Optional: limit response size
): Promise<string>
```

**Implementation notes:**
- Response is `text/plain`, not JSON — use `response.text()` instead of `response.json()`
- Logs can be very large (10MB+). Use `Range` header to fetch only last portion:
  ```
  Range: bytes=-100000  // Last ~100KB
  ```
- If Range not supported by GitLab, truncate client-side after full fetch
- Cache fetched logs in a `Map<number, string>` (jobId → log) to avoid re-fetching

### Existing: `GitLabApiService.getProjectJobs()`

Already implemented. Used to fetch recent jobs for frequency analysis.

## UI/UX Design Notes

### Job Log Viewer
- Monospaced font (same as code blocks)
- Dark background (even in light mode — terminal style)
- Line numbers on the left margin
- Error lines highlighted in red background
- Warning lines highlighted in yellow background
- Scrollable container, max-height ~300px
- "Show more lines" button to load additional context

### Failure Category Badge
- Small pill badge next to job name
- 🔧 Dependency (orange)
- 🏗️ Infrastructure (red)
- 🧪 Test Failure (blue)
- ⏱️ Timeout (purple)
- ❓ Unknown (grey)

### Failure Frequency
- Compact "3/10" format with colour ring
- Tooltip: "This job has failed 3 of the last 10 runs"

## Dark Mode Considerations

- Job log viewer already uses dark background — minimal dark mode changes needed
- Adjust line highlight colours for visibility on dark backgrounds
- Category badge colours use slightly brighter variants in dark mode
- Frequency indicator adapts to dark mode
- Summary panel uses dark background, light text

## Error Handling

- Job trace API failure (404, 403): Show "Log unavailable" message with link to GitLab
- Large log (>1MB): Truncate to last 100KB, show "Showing last portion of log"
- Pattern detection: never throws — returns 'unknown' category on any error
- Frequency calculation with no historical data: show "No history available"
- Network timeout on log fetch: show retry button

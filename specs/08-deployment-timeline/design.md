# Design: Deployment Timeline / Activity Feed

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ViewType.ENVIRONMENT selected (timeline as sub-view)         │   │
│  │ OR ViewType.TIMELINE (separate view)                          │   │
│  │ State: deploymentHistory: DeploymentHistoryEntry[]            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│              │                                                      │
│              ▼                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ DeploymentTimeline                                            │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │ TimelineFilters (project, env, status, date range)    │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │ TimelineDay ("Today")                                 │    │   │
│  │  │  ┌──────────────────────────────────────────────────┐│    │   │
│  │  │  │ TimelineEntry (deploy event)                     ││    │   │
│  │  │  │ TimelineEntry (deploy event)                     ││    │   │
│  │  │  └──────────────────────────────────────────────────┘│    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │ TimelineDay ("Yesterday")                             │    │   │
│  │  │  ...                                                   │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DashboardDataService.ts                          │
│                                                                      │
│  NEW METHOD:                                                         │
│  - getProjectDeploymentHistory(projectId): DeploymentHistoryEntry[] │
│  - detectRollbacks(history): DeploymentHistoryEntry[]               │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User opens timeline** → timeline view selected (tab within Environment view or separate view)
2. **Data fetch** → For each project, call `getProjectDeploymentHistory()` — returns all deploy jobs (not just latest per env)
3. **Merge and sort** → All deployments merged into single chronological list (newest first)
4. **Rollback detection** → `detectRollbacks()` compares versions within each project+env sequence
5. **Group by date** → Deployments grouped by calendar day for display
6. **Filter** → User applies filters → `useMemo` re-computes visible entries
7. **Display** → `DeploymentTimeline` renders date groups with `TimelineEntry` cards

## Component Structure

### New Components

#### `src/components/DeploymentTimeline.tsx`

Main container for the deployment timeline.

```typescript
interface DeploymentTimelineProps {
  projects: Project[];
  dashboardService: DashboardDataService;
  gitLabService: GitLabApiService;
  darkMode?: boolean;
  jiraBaseUrl?: string;
}
```

**State:**
- `history: DeploymentHistoryEntry[]` — all deployments merged and sorted
- `loading: boolean`
- `filters: TimelineFilters`

**Responsibilities:**
- Fetch deployment history for all projects on mount
- Merge, sort chronologically, detect rollbacks
- Apply filters
- Group by date
- Render filter bar and date groups

#### `src/components/TimelineFilters.tsx`

Filter bar for the timeline.

```typescript
interface TimelineFiltersProps {
  projects: Project[];
  filters: TimelineFilters;
  onFilterChange: (filters: TimelineFilters) => void;
  totalCount: number;
  filteredCount: number;
}
```

**Fields:**
- Project multi-select dropdown
- Environment multi-select: dev/sit/uat/prod (using `ENVIRONMENT_ORDER` from `src/types/index.ts`)
- Status: checkboxes for success/failed/rollback
- Date range: from/to date pickers (HTML5 `<input type="date">`)
- Result count and "Clear Filters" button

#### `src/components/TimelineEntry.tsx`

Individual deployment entry in the timeline.

```typescript
interface TimelineEntryProps {
  entry: DeploymentHistoryEntry;
  jiraBaseUrl?: string;
  darkMode?: boolean;
  onExpand: () => void;
  isExpanded: boolean;
}
```

**Displays:**
- Left: timestamp (HH:mm) and status indicator (coloured dot)
- Main: project name, version, environment badge, branch name
- Right: JIRA key link (if available), status badge
- Rollback entries: ⏪ icon, "Rolled back from vX.Y.Z" annotation
- Expanded: full details (pipeline link, job link, commit SHA, MR link)

#### `src/components/TimelineDay.tsx`

Date separator and container for a day's entries.

```typescript
interface TimelineDayProps {
  date: string;                          // ISO date string
  label: string;                         // "Today", "Yesterday", or formatted date
  entries: DeploymentHistoryEntry[];
  jiraBaseUrl?: string;
  darkMode?: boolean;
}
```

### Modified Components

#### `src/components/EnvironmentMatrixView.tsx`
- Add tab or toggle to switch between "Matrix" and "Timeline" sub-views
- Timeline accessible from within the environment view

#### `src/App.tsx`
- Pass deployment timeline data to EnvironmentMatrixView (or separate view)
- Manage timeline loading state

## Type Definitions

### New types in `src/types/index.ts`

```typescript
// Extended deployment entry with history context
export interface DeploymentHistoryEntry extends Deployment {
  projectId: number;
  projectName: string;
  isRollback: boolean;
  rolledBackFrom?: string;       // Previous version (if rollback)
}

// Timeline filter state
export interface TimelineFilters {
  projectIds: number[];            // Empty = all
  environments: EnvironmentName[]; // Empty = all
  statuses: ('success' | 'failed' | 'rollback')[];
  dateFrom: string | null;         // ISO date
  dateTo: string | null;           // ISO date
}
```

### New `STORAGE_KEYS` entry

```typescript
TIMELINE_FILTERS: 'gitlab_cicd_dashboard_timeline_filters'
```

## New Service Methods

### `DashboardDataService.getProjectDeploymentHistory()`

```typescript
/**
 * Get all recent deployment jobs for a project (not just latest per env)
 * Returns multiple deployments per environment, sorted by timestamp
 */
async getProjectDeploymentHistory(
  projectId: number,
  projectName: string
): Promise<DeploymentHistoryEntry[]> {
  const jobs = await this.gitLabService.getProjectJobs(projectId, {
    scope: ['success', 'failed'],
    per_page: 100,
  });

  const deployments: DeploymentHistoryEntry[] = [];

  for (const job of jobs) {
    const environment = this.parseDeployJobName(job.name);
    if (!environment) continue;

    const pipelineRef = (job as JobWithPipeline).pipeline?.ref || '';
    const jiraKey = this.extractJiraKey(pipelineRef);

    deployments.push({
      jobId: job.id,
      jobName: job.name,
      environment,
      version: null,  // Resolved below
      status: job.status as DeploymentStatus,
      timestamp: job.finished_at || job.created_at,
      pipelineId: (job as JobWithPipeline).pipeline?.id || 0,
      pipelineIid: (job as JobWithPipeline).pipeline?.iid,
      pipelineRef,
      jobUrl: job.web_url,
      pipelineUrl: (job as JobWithPipeline).pipeline?.web_url,
      jiraKey,
      projectId,
      projectName,
      isRollback: false,       // Set by detectRollbacks()
      rolledBackFrom: undefined,
    });
  }

  // Resolve versions from artifacts (batch, limit concurrency)
  // ... same pattern as getProjectDeployments() but for all deploy jobs

  return deployments;
}
```

### `DashboardDataService.detectRollbacks()`

```typescript
/**
 * Detect rollbacks in deployment history
 * A rollback is when a deployment's version is lower than the previous
 * deployment for the same project+environment
 */
detectRollbacks(history: DeploymentHistoryEntry[]): DeploymentHistoryEntry[] {
  // Group by project+environment
  // Within each group, sort by timestamp ascending
  // Compare version(n) to version(n-1): if lower, mark as rollback
  // Version comparison: semver-aware parsing
}
```

### Version Comparison Utility

```typescript
// src/utils/versionCompare.ts

/**
 * Compare two version strings
 * Handles: "2.3.45", "2.3.40", "#123", null
 * Returns: -1 (a < b), 0 (equal), 1 (a > b)
 */
export function compareVersions(a: string | null, b: string | null): number
```

## API Integration Points

Uses existing API:
- `GitLabApiService.getProjectJobs(projectId, options)` — already implemented
- `GitLabApiService.getJobArtifact(projectId, jobId, path)` — already implemented for version resolution

The key difference from `getProjectDeployments()` is keeping **all** deploy jobs, not just the latest per environment.

**Performance consideration:** With 60+ projects × 100 jobs each, this could return thousands of entries. Mitigations:
- Filter to deploy jobs only (using `DEPLOY_JOB_REGEX`)
- Limit to last 30 days by checking job timestamps
- Lazy load version info from artifacts (resolve on demand or in batches)

## UI/UX Design Notes

### Timeline Layout
- Vertical timeline with time on the left, content on the right
- Connecting line between entries (thin vertical line)
- Status dots on the connecting line (green/red/grey circles)
- Date separators as horizontal rules with centred date text

### Entry Card
- Compact: one line for project + version + environment, one line for branch + time
- Status badge as coloured left border (matching Environment Matrix colours)
- Rollback entries have distinct styling: dashed border, ⏪ prefix, amber background

### Filter Bar
- Sticky at top of timeline (scrolls with content)
- Compact horizontal layout
- Active filter chips shown below filter bar
- "X deployments found" count

### Sub-View Integration
- Tab within Environment view: "Matrix | Timeline"
- Or separate view in the view type selector
- Design decision at implementation time

## Dark Mode Considerations

- Timeline connecting line uses muted dark-mode colour
- Status dots use `CHART_COLORS_DARK` variants
- Entry cards use dark backgrounds with lighter text
- Date separators use dark-mode-appropriate colours
- Rollback highlight uses darker amber
- Filter bar inputs styled for dark mode

## Error Handling

- Individual project fetch failure: skip, show available data, note "X projects could not be loaded"
- No deploy jobs found: "No deployments found" empty state with suggestion to check pipeline configuration
- Version resolution failure: show pipeline IID fallback (`#123`)
- Rollback detection: if versions can't be compared (non-semver), don't mark as rollback
- Date range with no results: "No deployments in this date range" message

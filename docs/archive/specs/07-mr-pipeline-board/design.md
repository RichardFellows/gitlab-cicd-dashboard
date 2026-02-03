# Design: MR Pipeline Status Dashboard (MR-Centric View)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ViewType.MR_BOARD selected                                    │   │
│  │ State: mrBoardData: MRBoardData | null                       │   │
│  │ State: mrBoardLoading: boolean                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│              │                                                      │
│              ▼                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ MRBoardView                                                   │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │ MRBoardFilters (project, author, "My MRs", sort)     │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐        │   │
│  │  │Passing│ │Failing│ │Running│ │ Draft │ │No Pipe│        │   │
│  │  │       │ │       │ │       │ │       │ │       │        │   │
│  │  │MRCard │ │MRCard │ │MRCard │ │MRCard │ │MRCard │        │   │
│  │  │MRCard │ │MRCard │ │       │ │MRCard │ │       │        │   │
│  │  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DashboardDataService.ts                          │
│                                                                      │
│  NEW METHOD:                                                         │
│  - getAllOpenMergeRequests(projectIds): Promise<MRWithProject[]>     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GitLabApiService.ts                             │
│  (existing — no changes)                                             │
│  - getProjectMergeRequests(projectId, params)                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User switches to MR Board view** → `ViewType.MR_BOARD` set in App.tsx
2. **Data fetch triggers** → `getAllOpenMergeRequests()` called for all configured projects
3. **MRs collected** → Each MR annotated with project info → stored in `mrBoardData`
4. **Grouping** → Client-side grouping into status columns (passing/failing/running/draft/no-pipeline)
5. **Filtering** → User applies filters → `useMemo` re-computes visible MRs
6. **Display** → `MRBoardView` renders columns with `MRCard` entries

## Component Structure

### New Components

#### `src/components/MRBoardView.tsx`

Main container for the MR board view.

```typescript
interface MRBoardViewProps {
  projects: Project[];
  gitLabService: GitLabApiService;
  dashboardService: DashboardDataService;
  darkMode?: boolean;
}
```

**State:**
- `allMRs: MRWithProject[]` — fetched MRs with project info
- `loading: boolean`
- `error: string | null`
- `filters: MRBoardFilters`
- `sortBy: MRSortOption`

**Responsibilities:**
- Fetch MRs on mount
- Apply filters and sort
- Group MRs by pipeline status
- Render filter bar and columns

#### `src/components/MRBoardFilters.tsx`

Filter bar for the MR board.

```typescript
interface MRBoardFiltersProps {
  projects: Project[];
  filters: MRBoardFilters;
  onFilterChange: (filters: MRBoardFilters) => void;
  sortBy: MRSortOption;
  onSortChange: (sort: MRSortOption) => void;
  totalCount: number;
  filteredCount: number;
}
```

**Displays:**
- Project multi-select dropdown
- Author text search input
- "My MRs Only" toggle (with username config)
- Sort dropdown: Age (newest/oldest), Last Activity, Project Name
- Result count: "Showing X of Y MRs"

#### `src/components/MRBoardColumn.tsx`

A single status column in the board.

```typescript
interface MRBoardColumnProps {
  title: string;
  icon: string;
  count: number;
  mergeRequests: MRWithProject[];
  onMRSelect: (mr: MRWithProject) => void;
  darkMode?: boolean;
}
```

**Displays:**
- Column header with icon, title, count badge
- Scrollable list of `MRCard` components
- Empty state: "No MRs with this status"

#### `src/components/MRCard.tsx`

Individual MR entry card.

```typescript
interface MRCardProps {
  mr: MRWithProject;
  onSelect: () => void;
  darkMode?: boolean;
}
```

**Displays:**
- MR title (truncated) with link to GitLab
- Project name (muted, smaller text)
- Author name/username
- Source → target branch
- Pipeline status badge (success/failed/running)
- Age: "opened 3 days ago"
- For failed pipelines: failed job names inline (from `head_pipeline.failedJobs`)
- Last commit message (truncated)
- Click to expand → `MRCardDetails`

#### `src/components/MRCardDetails.tsx`

Expanded detail panel for an MR.

```typescript
interface MRCardDetailsProps {
  mr: MRWithProject;
  darkMode?: boolean;
}
```

**Displays:**
- Full MR description (truncated, with expand)
- Recent commits list (from `mr.recent_commits`)
- Pipeline details: all jobs with status
- Failed jobs with stage and failure reason
- Links: MR in GitLab, pipeline in GitLab, source branch

### Modified Components

#### `src/App.tsx`
- Add `ViewType.MR_BOARD` rendering branch
- Add MR board data state and loading state
- Fetch MR data when view switches to MR_BOARD (lazy loading)
- Clear MR data when switching away (to save memory)

#### `src/types/index.ts` — ViewType enum
- Add `MR_BOARD = 'mr-board'` to `ViewType` enum

## Type Definitions

### New types in `src/types/index.ts`

```typescript
// Add to ViewType enum
export enum ViewType {
  CARD = 'card',
  TABLE = 'table',
  ENVIRONMENT = 'environment',
  READINESS = 'readiness',
  MR_BOARD = 'mr-board',          // NEW
}

// MR with project context (for cross-project display)
export interface MRWithProject extends MergeRequest {
  projectId: number;
  projectName: string;
  projectPath?: string;
}

// MR Board filter state
export interface MRBoardFilters {
  projectIds: number[];           // Empty = all projects
  authorSearch: string;           // Username or name substring
  myMRsOnly: boolean;
  myUsername: string;              // Configured username for "My MRs"
}

// MR sort options
export type MRSortOption =
  | 'newest'
  | 'oldest'
  | 'last-activity'
  | 'project-name';

// MR pipeline status for grouping
export type MRPipelineGroup =
  | 'passing'
  | 'failing'
  | 'running'
  | 'draft'
  | 'no-pipeline';
```

### New `STORAGE_KEYS` entries

```typescript
MR_BOARD_FILTERS: 'gitlab_cicd_dashboard_mr_board_filters',
MR_BOARD_SORT: 'gitlab_cicd_dashboard_mr_board_sort',
MY_USERNAME: 'gitlab_cicd_dashboard_my_username'
```

## New Service Method

### `DashboardDataService.getAllOpenMergeRequests()`

```typescript
/**
 * Fetch all open merge requests across multiple projects
 * @param projects - Array of projects to fetch MRs for
 * @returns Annotated merge requests with project info
 */
async getAllOpenMergeRequests(
  projects: Project[]
): Promise<MRWithProject[]> {
  const mrPromises = projects.map(async (project) => {
    try {
      const mrs = await this.gitLabService.getProjectMergeRequests(project.id, {
        state: 'opened',
        per_page: 20,
      });
      return mrs.map(mr => ({
        ...mr,
        projectId: project.id,
        projectName: project.name,
        projectPath: project.path_with_namespace || project.path,
      }));
    } catch (error) {
      console.error(`Failed to fetch MRs for project ${project.id}:`, error);
      return [];
    }
  });

  const results = await Promise.all(mrPromises);
  return results.flat();
}
```

## Grouping Logic

```typescript
function groupMRsByPipelineStatus(mrs: MRWithProject[]): Record<MRPipelineGroup, MRWithProject[]> {
  const groups: Record<MRPipelineGroup, MRWithProject[]> = {
    passing: [],
    failing: [],
    running: [],
    draft: [],
    'no-pipeline': [],
  };

  for (const mr of mrs) {
    // Draft MRs go to draft group regardless of pipeline
    if (mr.draft || mr.title.toLowerCase().startsWith('draft:')) {
      groups.draft.push(mr);
      continue;
    }

    if (!mr.head_pipeline) {
      groups['no-pipeline'].push(mr);
      continue;
    }

    switch (mr.head_pipeline.status) {
      case 'success':
        groups.passing.push(mr);
        break;
      case 'failed':
        groups.failing.push(mr);
        break;
      case 'running':
      case 'pending':
      case 'created':
        groups.running.push(mr);
        break;
      default:
        groups['no-pipeline'].push(mr);
    }
  }

  return groups;
}
```

## API Integration Points

Uses existing API:
- `GitLabApiService.getProjectMergeRequests(projectId, params)` — already implemented with pipeline details
- The existing implementation already fetches `head_pipeline` with jobs for failed pipelines
- No new API endpoints needed

**Rate limit concern:** With 60+ projects × 1 MR request each = 60+ API calls per load. Plus pipeline detail fetches per MR. Consider:
- Only fetch MRs for projects that have open MRs (check `mergeRequestCounts.totalOpen > 0` first)
- Limit to first 20 MRs per project
- Show loading progress indicator

## UI/UX Design Notes

### Board Layout
- **Kanban-style columns** on wide screens (≥1200px)
- **Stacked sections** on narrower screens
- Each column has a coloured header: Passing=green, Failing=red, Running=blue, Draft=grey, No Pipeline=muted
- Columns have equal width, scroll independently

### MR Card Design
- Compact card (~80px height) with key info visible
- Status badge as coloured left border
- Project name in muted smaller text above title
- Author avatar placeholder (first letter of name in circle) + username
- Branch info: `feature/ABC-123` → `main`
- Failed job names in red text, inline

### "My MRs" Configuration
- Username stored in localStorage via `STORAGE_KEYS.MY_USERNAME`
- First-time: prompt for GitLab username
- Toggle: "Show My MRs Only (username)" — quick filter

### View Type Selector
- Add MR Board icon to existing view type selector row
- Icon: merge request icon (⑂ or custom SVG)

## Dark Mode Considerations

- Column backgrounds: dark grey variants for each status
- Card backgrounds: slightly lighter dark background
- Status badges use `CHART_COLORS_DARK` variants
- Branch text and muted elements readable in dark mode
- Author avatar circles use appropriate contrast

## Error Handling

- Individual project MR fetch failure: silently skip, show available data
- All projects fail: show error state with retry button
- No MRs found across all projects: show "No open merge requests" empty state
- Pipeline status unavailable: group under "No Pipeline"
- Missing author info: show "Unknown Author"
- Rate limiting: show progress indicator and retry after delay

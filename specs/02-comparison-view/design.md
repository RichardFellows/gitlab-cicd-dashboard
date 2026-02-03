# Design: Comparison View (Side-by-Side)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ State: selectedForComparison: Set<number>                     │   │
│  │ State: comparisonMode: boolean                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│              │                               │                      │
│              ▼                               ▼                      │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐   │
│  │ CardView / TableView     │    │ ComparisonView               │   │
│  │  + selection checkboxes  │    │  - ComparisonHeader          │   │
│  │  + "Compare" button      │    │  - ComparisonCharts          │   │
│  └─────────────────────────┘    │  - ComparisonTable           │   │
│                                  │  - ComparisonDeployments     │   │
│                                  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DashboardDataService.ts                          │
│  (existing methods — no changes needed)                              │
│  - getProjectPipelineTrends(projectId, params)                      │
│  - getProjectDeployments(projectId)                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User selects projects** → Checkboxes in Card/Table views update `selectedForComparison` Set in `App.tsx`
2. **User clicks "Compare Selected"** → `comparisonMode` set to true, view switches to `ComparisonView`
3. **ComparisonView mounts** → Fetches trend data for each selected project via `DashboardDataService.getProjectPipelineTrends()`
4. **Trend data returned** → Charts render with multi-dataset configuration
5. **User clicks "Back to Dashboard"** → `comparisonMode` set to false, returns to previous view

## Component Structure

### New Components

#### `src/components/ComparisonView.tsx`

Main container for the comparison view.

```typescript
interface ComparisonViewProps {
  projects: Project[];                  // The 2-4 selected projects
  dashboardService: DashboardDataService;
  gitLabService: GitLabApiService;
  deploymentCache: Map<number, DeploymentsByEnv>;
  timeframe: number;
  darkMode?: boolean;
  jiraBaseUrl?: string;
  onBack: () => void;
}
```

**Responsibilities:**
- Fetch trend data for each project on mount
- Manage loading state per project
- Render comparison sections
- Assign colours from comparison palette

#### `src/components/ComparisonHeader.tsx`

Header bar showing selected projects with colour legend.

```typescript
interface ComparisonHeaderProps {
  projects: Project[];
  colours: string[];
  onBack: () => void;
  onRemoveProject: (projectId: number) => void;
}
```

**Displays:**
- Project names with colour swatches
- Remove (×) button per project
- "Back to Dashboard" button

#### `src/components/ComparisonCharts.tsx`

Multi-dataset chart panels for trend comparisons.

```typescript
interface ComparisonChartsProps {
  projects: Project[];
  trendData: Map<number, PipelineTrend[]>;
  colours: string[];
  darkMode?: boolean;
  loading: boolean;
}
```

**Renders:**
- Success Rate Trend: Chart.js `Line` chart with one dataset per project
- Duration Trend: Chart.js `Line` chart with one dataset per project
- Coverage Comparison: Chart.js `Bar` chart with one bar per project
- MR Backlog Comparison: Chart.js `Bar` chart (grouped) with open/draft per project

#### `src/components/ComparisonTable.tsx`

Tabular side-by-side of key metrics.

```typescript
interface ComparisonTableProps {
  projects: Project[];
  colours: string[];
}
```

**Displays:**
- Rows: Success Rate, Avg Duration, Coverage, Total Pipelines, Failed Pipelines, Open MRs, Draft MRs
- Columns: one per project (with colour header)
- Best/worst values highlighted per row

#### `src/components/ComparisonDeployments.tsx`

Side-by-side environment deployment status.

```typescript
interface ComparisonDeploymentsProps {
  projects: Project[];
  deploymentCache: Map<number, DeploymentsByEnv>;
  colours: string[];
}
```

**Displays:**
- Matrix with environments as rows, projects as columns
- Each cell shows version + status badge
- Highlight version discrepancies

### Modified Components

#### `src/components/CardView.tsx`
- Add checkbox overlay on each card (top-left corner)
- Checkbox visibility toggled by a "Select for Compare" button in the section header
- Selected cards have highlighted border using the assigned comparison colour

#### `src/components/TableView.tsx`
- Add checkbox column as first column
- Selected rows highlighted with subtle background tint
- "Compare Selected (N)" button in table header

#### `src/components/Dashboard.tsx`
- Accept `selectedForComparison`, `onToggleComparisonSelection` props
- Pass selection state to CardView/TableView
- Render floating "Compare Selected" action bar when selection > 1

#### `src/App.tsx`
- Add `selectedForComparison: Set<number>` state
- Add `comparisonMode: boolean` state
- Handle toggle selection, enter/exit comparison mode
- Pass comparison props to Dashboard and ComparisonView

## Type Definitions

### New types in `src/types/index.ts`

```typescript
// Comparison colour palette (up to 4 projects)
export const COMPARISON_COLOURS = ['#6e49cb', '#e67e22', '#27ae60', '#e74c3c'];
export const COMPARISON_COLOURS_DARK = ['#9d7fe8', '#f39c12', '#2ecc71', '#ff6b6b'];
```

No new interfaces needed in types — comparison uses existing `Project`, `PipelineTrend`, `DeploymentsByEnv`.

## API Integration Points

No new API calls. Uses existing:
- `DashboardDataService.getProjectPipelineTrends(projectId, params)` — already implemented
- `DashboardDataService.getProjectDeployments(projectId)` — already implemented
- All project metrics already in `DashboardMetrics.projects`

## UI/UX Design Notes

### Selection Mode
- Checkboxes appear when user clicks a "Compare" toggle button in the view header
- This avoids cluttering the default view with always-visible checkboxes
- When in selection mode, a floating action bar appears at the bottom: "Compare 3 of 4 selected | Compare Now | Clear"

### Comparison Layout
- Top: `ComparisonHeader` with project names + colours + back button
- Middle: Grid of chart panels (2x2 on wide screens, single column on narrow)
- Bottom: `ComparisonTable` metrics table + `ComparisonDeployments` matrix

### Chart Configuration
- Each chart uses `TrendChart` component with multiple `TrendDataset` entries
- Labels (dates) aligned across projects — use union of all dates
- Missing data points rendered as gaps (Chart.js `spanGaps: false`)
- Legend shows project names with colour swatches

### Colour Palette
- 4 distinct colours: Purple, Orange, Green, Red
- Colours chosen for distinguishability (including colour-blind safety)
- Dark mode uses brighter variants from `COMPARISON_COLOURS_DARK`

## Dark Mode Considerations

- All comparison charts use dark-mode colour variants when `darkMode` is true
- Comparison table uses dark background, light text
- Selection highlights use semi-transparent colour overlays
- Chart grid lines use dark-mode-friendly opacity
- Back button and action bar styled for dark mode

## Error Handling

- If trend data fetch fails for a project, show error badge next to project name in header
- Render available data — partial comparison is still useful
- If all fetches fail, show error state with retry button
- Loading state: show skeleton/spinner in chart areas while trend data loads
- If deployment data not cached, fetch on-demand (show loading indicator per project column)

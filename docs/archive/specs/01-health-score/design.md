# Design: Pipeline Health Score & Project Grading

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ SummarySection                                                │   │
│  │  - Portfolio Health badge + distribution chart                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐                                │
│  │  CardView     │  │  TableView   │                                │
│  │  + HealthBadge│  │  + HealthBadge│  (health score per project)   │
│  │  + Breakdown  │  │  + sort col   │                                │
│  └──────────────┘  └──────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     src/utils/healthScore.ts                         │
│                                                                      │
│  - calculateHealthScore(metrics: ProjectMetrics): HealthScore       │
│  - calculatePortfolioHealth(projects: Project[]): PortfolioHealth   │
│  - getHealthBand(score: number): HealthBand                         │
│  - getSignalScore(signal, value): number                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Dashboard loads** → `DashboardDataService.getMultiSourceMetrics()` returns `DashboardMetrics`
2. **Health calculation** → For each `Project`, `calculateHealthScore(project.metrics)` is called
3. **Results cached** → Health scores computed via `useMemo` in components (no separate state)
4. **Display** → `HealthBadge` component renders score + colour
5. **Breakdown** → On hover/click, `HealthBreakdown` component shows signal details
6. **Portfolio** → `calculatePortfolioHealth()` aggregates across all projects for `SummarySection`

## Component Structure

### New Components

#### `src/components/HealthBadge.tsx`

Compact badge displaying the health score with colour coding.

```typescript
interface HealthBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
  breakdown?: HealthSignalResult[];
  onClick?: () => void;
}
```

**Display logic:**
- Score ≥ 80 → Green background (`CHART_COLORS.success`)
- Score 50-79 → Yellow/amber background (`CHART_COLORS.warning`)
- Score < 50 → Red background (`CHART_COLORS.danger`)
- Badge shows numeric score (e.g., "87")
- Optional tooltip/popover with breakdown

#### `src/components/HealthBreakdown.tsx`

Expandable panel showing the component scores.

```typescript
interface HealthBreakdownProps {
  signals: HealthSignalResult[];
  darkMode?: boolean;
}
```

**Displays:**
- List of each signal with: name, weight, raw value, computed score (0-100)
- Bar chart or progress bar for each signal
- Signals below 50 score highlighted in red
- Uses existing `CHART_COLORS` / `CHART_COLORS_DARK` from `src/utils/constants.ts`

#### `src/components/PortfolioHealthChart.tsx`

Distribution chart for the summary section.

```typescript
interface PortfolioHealthChartProps {
  projects: Project[];
  darkMode?: boolean;
}
```

**Displays:**
- Chart.js `Doughnut` chart (matching existing `SummarySection` pattern) showing project distribution across health bands
- Average portfolio score as centre label
- Uses existing Chart.js Doughnut pattern from `SummarySection.tsx`

### Modified Components

#### `src/components/CardView.tsx`
- Add `HealthBadge` to each project card header
- Place next to existing status indicator

#### `src/components/TableView.tsx`
- Add "Health" column with `HealthBadge`
- Make column sortable (ascending/descending)
- Default sort: descending (healthiest first)

#### `src/components/SummarySection.tsx`
- Add Portfolio Health badge below existing summary cards
- Add distribution Doughnut chart in `summary-right` section
- Use `PortfolioHealthChart` component

#### `src/components/Dashboard.tsx`
- Compute health scores via `useMemo` and pass to child views
- No changes to props interface (health computed internally from existing `metrics`)

## Type Definitions

### New file: `src/utils/healthScore.ts`

```typescript
// Health score signal weights (must sum to 1.0)
export const HEALTH_WEIGHTS = {
  FAILURE_RATE: 0.30,
  COVERAGE: 0.25,
  DURATION_STABILITY: 0.15,
  MR_BACKLOG: 0.15,
  RECENT_ACTIVITY: 0.15,
} as const;

// Health band thresholds
export const HEALTH_BANDS = {
  HEALTHY: 80,   // score >= 80
  WARNING: 50,   // score >= 50
  // Below 50 = critical
} as const;

export type HealthBand = 'healthy' | 'warning' | 'critical';

export interface HealthSignalResult {
  name: string;
  weight: number;
  rawValue: number | null;
  score: number;        // 0-100 for this signal
  weighted: number;     // score * weight
  unit: string;         // '%', 'MRs', 'days', etc.
  description: string;  // Human-readable explanation
}

export interface HealthScore {
  total: number;        // 0-100
  band: HealthBand;
  signals: HealthSignalResult[];
}

export interface PortfolioHealth {
  averageScore: number;
  distribution: {
    healthy: number;
    warning: number;
    critical: number;
  };
  projectScores: Array<{ projectId: number; projectName: string; score: number }>;
}
```

### Additions to `src/types/index.ts`

No changes needed — health score is computed, not stored. The `HealthScore` type lives in `src/utils/healthScore.ts` as a utility concern.

### New `STORAGE_KEYS` entry

```typescript
// In src/types/index.ts STORAGE_KEYS
HEALTH_SORT_ORDER: 'gitlab_cicd_dashboard_health_sort'
```

## Score Calculation Logic

### Signal: Main Branch Failure Rate (30%)

```typescript
// Input: mainBranchFailureRate (0-100%)
// 0% failures = 100, ≥25% = 0, linear between
function scoreFailureRate(failureRate: number): number {
  if (failureRate <= 0) return 100;
  if (failureRate >= 25) return 0;
  return Math.round(100 - (failureRate / 25) * 100);
}
```

Uses `METRICS_THRESHOLDS.FAILURE_RATE_DANGER` (25%) as the zero-score boundary.

### Signal: Code Coverage (25%)

```typescript
// Input: coverage (0-100% or null)
// ≥80% = 100, 0% = 0, linear. null = 0
function scoreCoverage(coverage: number | null): number {
  if (coverage === null) return 0;
  if (coverage >= 80) return 100;
  return Math.round((coverage / 80) * 100);
}
```

Uses `METRICS_THRESHOLDS.COVERAGE_TARGET` (80%) as the full-score boundary.

### Signal: Duration Stability (15%)

```typescript
// Input: durationSpikePercent (0-100+%)
// No spike (0%) = 100, ≥50% spike = 0, linear between
function scoreDurationStability(spikePercent: number): number {
  if (spikePercent <= 0) return 100;
  if (spikePercent >= 50) return 0;
  return Math.round(100 - (spikePercent / 50) * 100);
}
```

Uses `METRICS_THRESHOLDS.DURATION_SPIKE_PERCENT` (50%) as the zero-score boundary.

### Signal: Open MR Backlog (15%)

```typescript
// Input: totalOpen MRs
// 0-2 MRs = 100, ≥10 = 0, linear between
function scoreMRBacklog(totalOpen: number): number {
  if (totalOpen <= 2) return 100;
  if (totalOpen >= 10) return 0;
  return Math.round(100 - ((totalOpen - 2) / 8) * 100);
}
```

### Signal: Recent Activity (15%)

```typescript
// Input: totalPipelines in the configured timeframe
// Any pipelines in timeframe = 100, 0 pipelines = 0
// Graduated: ≥10 = 100, 1-9 scales linearly, 0 = 0
function scoreRecentActivity(totalPipelines: number): number {
  if (totalPipelines >= 10) return 100;
  if (totalPipelines <= 0) return 0;
  return Math.round((totalPipelines / 10) * 100);
}
```

### Composite Score

```typescript
function calculateHealthScore(metrics: ProjectMetrics): HealthScore {
  const signals = [
    { name: 'Failure Rate', weight: HEALTH_WEIGHTS.FAILURE_RATE, ... },
    { name: 'Code Coverage', weight: HEALTH_WEIGHTS.COVERAGE, ... },
    { name: 'Duration Stability', weight: HEALTH_WEIGHTS.DURATION_STABILITY, ... },
    { name: 'MR Backlog', weight: HEALTH_WEIGHTS.MR_BACKLOG, ... },
    { name: 'Recent Activity', weight: HEALTH_WEIGHTS.RECENT_ACTIVITY, ... },
  ];
  
  const total = signals.reduce((sum, s) => sum + s.weighted, 0);
  return { total: Math.round(total), band: getHealthBand(total), signals };
}
```

## API Integration Points

No new API calls. All data already available from:
- `ProjectMetrics.failedPipelines` / `totalPipelines` → failure rate
- `ProjectMetrics.codeCoverage.coverage` → coverage
- `ProjectMetrics.durationSpikePercent` → duration stability
- `ProjectMetrics.mergeRequestCounts.totalOpen` → MR backlog
- `ProjectMetrics.totalPipelines` → recent activity

## UI/UX Design Notes

### Badge Placement
- **Card View**: Top-right corner of each project card, next to the project name
- **Table View**: New column between project name and success rate
- **Summary Section**: New row below existing summary cards

### Badge Styling
```css
.health-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-weight: bold;
  font-size: 14px;
  color: white;
  cursor: pointer;
}
.health-badge--healthy { background-color: var(--color-success); }
.health-badge--warning { background-color: var(--color-warning); color: #333; }
.health-badge--critical { background-color: var(--color-danger); }
```

### Breakdown Panel
- Appears as a tooltip/popover on badge click (Card View) or as inline expansion (Table View)
- Each signal rendered as a horizontal bar chart
- Signal bars use green/yellow/red colouring matching their individual score band

## Dark Mode Considerations

- Badge colours use `CHART_COLORS_DARK` variants when dark mode active
- Breakdown panel uses dark background with lighter text
- Distribution chart uses dark-mode-safe colours from `CHART_COLORS_DARK`
- Ensure sufficient contrast for badge text on coloured backgrounds (white text on green/red, dark text on yellow)

## Error Handling

- If any signal data is unavailable (e.g., no coverage data), that signal scores 0 and is marked as "N/A" in the breakdown
- If a project has no pipeline data at all, health score is 0 with all signals marked N/A
- Portfolio health calculation excludes projects with 0 total pipelines (no activity) from the average, but counts them in distribution as "critical"
- No error boundary needed — health score computation is pure math, cannot throw
